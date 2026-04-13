import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  AppEntitlementStatus,
  AppNotifyKeyStatus,
  AppOrderStatus,
  AppPlatform,
  AppUser,
  RestoreResult,
  RestoreType,
} from "@prisma/client";
import { randomBytes, randomUUID } from "node:crypto";
import { PrismaService } from "src/prisma/prisma.service";
import { PushService } from "../push/push.service";
import { BootstrapDto } from "./dto/bootstrap.dto";
import { PushTokenDto } from "./dto/push-token.dto";
import { ResetKeyDto } from "./dto/reset-key.dto";
import { RestoreCodeDto } from "./dto/restore-code.dto";
import { TestNotifyDto } from "./dto/test-notify.dto";

@Injectable()
export class MobileService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly configService: ConfigService,
    private readonly pushService: PushService,
  ) {}

  async bootstrap(dto: BootstrapDto) {
    let installation = await this.prismaService.appInstallation.findUnique({
      where: { installationId: dto.installationId },
      include: {
        appUser: {
          include: {
            orders: {
              orderBy: { updatedAt: "desc" },
            },
          },
        },
      },
    });

    if (!installation && dto.restoreCode) {
      const restoredUser = await this.prismaService.appUser.findUnique({
        where: { restoreCode: dto.restoreCode },
      });

      if (restoredUser) {
        installation = await this.prismaService.appInstallation.create({
          data: {
            appUserId: restoredUser.id,
            installationId: dto.installationId,
            platform: dto.platform,
            deviceName: dto.deviceName,
            appVersion: dto.appVersion,
          },
          include: {
            appUser: {
              include: {
                orders: {
                  orderBy: { updatedAt: "desc" },
                },
              },
            },
          },
        });

        await this.logRestoreEvent(
          restoredUser.id,
          dto.installationId,
          dto.platform,
          RestoreType.RESTORE_CODE,
          RestoreResult.SUCCESS,
        );
      }
    }

    if (!installation) {
      const now = new Date();
      const trialDays = this.configService.getOrThrow<number>(
        "config.mobileTrialDays",
      );

      installation = await this.prismaService.appInstallation.create({
        data: {
          installationId: dto.installationId,
          platform: dto.platform,
          deviceName: dto.deviceName,
          appVersion: dto.appVersion,
          appUser: {
            create: {
              notifyKey: await this.generateUniqueNotifyKey(),
              restoreCode: await this.generateUniqueRestoreCode(),
              trialStartedAt: now,
              trialEndsAt: new Date(
                now.getTime() + trialDays * 24 * 60 * 60 * 1000,
              ),
              entitlementStatus: AppEntitlementStatus.TRIALING,
            },
          },
        },
        include: {
          appUser: {
            include: {
              orders: {
                orderBy: { updatedAt: "desc" },
              },
            },
          },
        },
      });
    } else {
      installation = await this.prismaService.appInstallation.update({
        where: { installationId: dto.installationId },
        data: {
          platform: dto.platform,
          deviceName: dto.deviceName,
          appVersion: dto.appVersion,
          lastActiveAt: new Date(),
        },
        include: {
          appUser: {
            include: {
              orders: {
                orderBy: { updatedAt: "desc" },
              },
            },
          },
        },
      });
    }

    const appUser = await this.refreshEntitlementState(installation.appUser.id);
    return this.buildProfile(appUser, installation.installationId);
  }

  async getProfile(installationId: string) {
    const installation = await this.getInstallation(installationId);
    const appUser = await this.refreshEntitlementState(installation.appUserId);
    return this.buildProfile(appUser, installation.installationId);
  }

  async updatePushToken(dto: PushTokenDto) {
    const installation = await this.getInstallation(dto.installationId);
    const pushToken = dto.pushToken?.trim() ?? "";

    if (pushToken) {
      this.pushService.assertExpoPushToken(pushToken);
    }

    await this.prismaService.appInstallation.update({
      where: { id: installation.id },
      data: {
        pushToken: pushToken || null,
        lastActiveAt: new Date(),
      },
    });

    return this.getProfile(dto.installationId);
  }

  async sendTestNotification(dto: TestNotifyDto) {
    const installation = await this.getInstallation(dto.installationId);
    const appUser = await this.refreshEntitlementState(installation.appUserId);

    this.assertCanUse(appUser);

    const activeInstallations =
      await this.prismaService.appInstallation.findMany({
        where: {
          appUserId: appUser.id,
          pushToken: {
            not: null,
          },
        },
        select: {
          id: true,
          pushToken: true,
        },
      });

    console.log("activeInstallations", activeInstallations);

    const requestId = randomUUID();
    const title = dto.title?.trim() || "测试通知";
    const content = dto.content?.trim() || "这是一条来自 Ding 的测试通知。";

    const result = await this.pushService.sendToInstallations({
      appUserId: appUser.id,
      requestId,
      title,
      content,
      installations: activeInstallations,
    });

    console.log(4444444, result);
  }

  async resetKey(dto: ResetKeyDto) {
    const installation = await this.getInstallation(dto.installationId);
    const appUser = await this.refreshEntitlementState(installation.appUserId);

    await this.prismaService.appUser.update({
      where: { id: appUser.id },
      data: {
        notifyKey: await this.generateUniqueNotifyKey(),
        notifyKeyStatus: AppNotifyKeyStatus.ACTIVE,
        notifyKeyRotatedAt: new Date(),
      },
    });

    return this.getProfile(dto.installationId);
  }

  async restoreByCode(dto: RestoreCodeDto) {
    const appUser = await this.prismaService.appUser.findUnique({
      where: { restoreCode: dto.restoreCode },
    });

    if (!appUser) {
      throw new NotFoundException("恢复码无效，请确认后重试");
    }

    await this.prismaService.appInstallation.upsert({
      where: { installationId: dto.installationId },
      update: {
        appUserId: appUser.id,
        lastActiveAt: new Date(),
      },
      create: {
        appUserId: appUser.id,
        installationId: dto.installationId,
        platform: AppPlatform.UNKNOWN,
      },
    });

    await this.logRestoreEvent(
      appUser.id,
      dto.installationId,
      AppPlatform.UNKNOWN,
      RestoreType.RESTORE_CODE,
      RestoreResult.SUCCESS,
    );

    return this.getProfile(dto.installationId);
  }

  async getOrderStatus(installationId: string) {
    const profile = await this.getProfile(installationId);
    return profile.orderStatus;
  }

  private async getInstallation(installationId: string) {
    const installation = await this.prismaService.appInstallation.findUnique({
      where: { installationId },
    });

    if (!installation) {
      throw new NotFoundException("当前设备尚未初始化，请重新打开应用");
    }

    return installation;
  }

  private async refreshEntitlementState(appUserId: string) {
    const user = await this.prismaService.appUser.findUnique({
      where: { id: appUserId },
      include: {
        installations: {
          orderBy: { updatedAt: "desc" },
        },
        orders: {
          orderBy: { updatedAt: "desc" },
        },
      },
    });

    if (!user) {
      throw new NotFoundException("账号不存在");
    }

    const now = Date.now();
    const activeOrder = user.orders.find((order) => {
      if (
        order.status !== AppOrderStatus.ACTIVE &&
        order.status !== AppOrderStatus.RESTORED
      ) {
        return false;
      }

      return !order.expiresAt || order.expiresAt.getTime() > now;
    });

    let nextStatus = user.entitlementStatus;
    let nextExpiresAt = user.entitlementExpiresAt;
    let nextPlan = user.currentPlan;
    let nextPlatform = user.platformSource;

    if (activeOrder) {
      nextStatus = AppEntitlementStatus.ACTIVE;
      nextExpiresAt = activeOrder.expiresAt;
      nextPlan = activeOrder.plan;
      nextPlatform = activeOrder.platform;
    } else if (user.trialEndsAt.getTime() > now) {
      nextStatus = AppEntitlementStatus.TRIALING;
      nextExpiresAt = null;
      nextPlan = null;
    } else {
      nextStatus = AppEntitlementStatus.EXPIRED;
      nextExpiresAt = null;
      nextPlan = null;
      nextPlatform = null;
    }

    if (
      nextStatus !== user.entitlementStatus ||
      nextPlan !== user.currentPlan
    ) {
      return this.prismaService.appUser.update({
        where: { id: user.id },
        data: {
          entitlementStatus: nextStatus,
          entitlementExpiresAt: nextExpiresAt,
          currentPlan: nextPlan,
          platformSource: nextPlatform,
        },
        include: {
          installations: {
            orderBy: { updatedAt: "desc" },
          },
          orders: {
            orderBy: { updatedAt: "desc" },
          },
        },
      });
    }

    return user;
  }

  private assertCanUse(appUser: AppUser) {
    if (appUser.entitlementStatus === AppEntitlementStatus.EXPIRED) {
      throw new ForbiddenException("试用已结束，请先订阅后再继续使用");
    }
  }

  private buildProfile(
    appUser: AppUser & {
      installations?: Array<{
        installationId: string;
        pushToken: string | null;
      }>;
      orders?: Array<{
        productId: string;
        status: AppOrderStatus;
        plan: string;
        expiresAt: Date | null;
        updatedAt: Date;
      }>;
    },
    installationId: string,
  ) {
    const baseUrl = this.configService
      .getOrThrow<string>("config.publicApiBaseUrl")
      .replace(/\/$/, "");
    const getUrl = `${baseUrl}/api/v1/notify/${appUser.notifyKey}?title=${encodeURIComponent(
      "测试标题",
    )}&content=${encodeURIComponent("测试内容")}`;
    const postUrl = `${baseUrl}/api/v1/notify/${appUser.notifyKey}`;
    const remainingTrialDays =
      appUser.entitlementStatus === AppEntitlementStatus.TRIALING
        ? Math.max(
            0,

            Math.ceil(
              (appUser.trialEndsAt.getTime() - Date.now()) /
                (24 * 60 * 60 * 1000),
            ),
          )
        : 0;

    return {
      appUserId: appUser.id,
      installationId,
      notifyKey: appUser.notifyKey,
      restoreCode: appUser.restoreCode,
      entitlementStatus: appUser.entitlementStatus,
      currentPlan: appUser.currentPlan,
      entitlementExpiresAt: appUser.entitlementExpiresAt,
      trialEndsAt: appUser.trialEndsAt,
      remainingTrialDays,
      pushEnabled: Boolean(
        appUser.installations?.some((installation) => installation.pushToken),
      ),
      webhook: {
        getUrl,
        postUrl,
        params: [
          {
            name: "title",
            required: true,
            maxLength: 20,
            description: "通知标题",
          },
          {
            name: "content",
            required: true,
            maxLength: 100,
            description: "通知内容",
          },
        ],
        safetyTips: [
          "key 相当于你的通知凭证，泄露后任何人都可以向你发送通知。",
          "请不要在公开仓库、截图或不可信服务里暴露完整链接。",
          "如果怀疑泄露，请立即在 WebHooks 页面重置 key。",
        ],
      },
      orderStatus: appUser.orders?.[0]
        ? {
            productId: appUser.orders[0].productId,
            status: appUser.orders[0].status,
            plan: appUser.orders[0].plan,
            expiresAt: appUser.orders[0].expiresAt,
            updatedAt: appUser.orders[0].updatedAt,
          }
        : null,
    };
  }

  private async logRestoreEvent(
    appUserId: string,
    installationId: string,
    platform: AppPlatform,
    type: RestoreType,
    result: RestoreResult,
  ) {
    await this.prismaService.restoreEvent.create({
      data: {
        appUserId,
        installationId,
        platform,
        type,
        result,
      },
    });
  }

  private async generateUniqueNotifyKey() {
    while (true) {
      const key = `app_${randomBytes(24).toString("hex")}`;
      const exists = await this.prismaService.appUser.findUnique({
        where: { notifyKey: key },
      });

      if (!exists) {
        return key;
      }
    }
  }

  private async generateUniqueRestoreCode() {
    while (true) {
      const restoreCode = `rc_${randomBytes(8).toString("hex").toUpperCase()}`;
      const exists = await this.prismaService.appUser.findUnique({
        where: { restoreCode },
      });

      if (!exists) {
        return restoreCode;
      }
    }
  }
}
