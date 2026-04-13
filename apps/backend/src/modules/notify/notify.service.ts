import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AppEntitlementStatus, NotifyKeyStatus } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { PrismaService } from "src/prisma/prisma.service";
import { PushService } from "../push/push.service";
import { WechatService } from "../wechat/wechat.service";
import { SendNotifyDto } from "./dto/send-notify.dto";
import { NotifyRateLimitService } from "./notify-rate-limit.service";

/**
 * 公共通知入口服务。
 *
 * 这个服务承接产品文档里“通过 URL 调用后手机收到通知”的核心能力，
 * 同时兼容两条链路：
 * 1. 新的 App 匿名用户通知链路
 * 2. 旧的微信小程序通知链路
 */
@Injectable()
export class NotifyService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly configService: ConfigService,
    private readonly wechatService: WechatService,
    private readonly pushService: PushService,
    private readonly notifyRateLimitService: NotifyRateLimitService,
  ) {}

  /**
   * 对外公开的通知发送入口。
   *
   * 这里会先尝试把 key 识别为 App 用户的 notifyKey；
   * 如果不是，再回退到原有的小程序 NotifyKey 逻辑。
   *
   * 这样可以在不破坏旧能力的前提下，把新 App 能力接到同一个公开 URL 上。
   */
  async send(key: string, payload: SendNotifyDto, ip: string) {
    this.notifyRateLimitService.assertCanSend(key, ip);

    const appUser = await this.prismaService.appUser.findUnique({
      where: {
        notifyKey: key,
      },
      include: {
        installations: {
          where: {
            pushToken: {
              not: null,
            },
          },
          select: {
            id: true,
            pushToken: true,
          },
        },
      },
    });

    if (appUser) {
      const now = Date.now();
      const subscriptionActive =
        appUser.entitlementStatus === AppEntitlementStatus.ACTIVE &&
        (!appUser.entitlementExpiresAt ||
          appUser.entitlementExpiresAt.getTime() > now);
      const trialActive =
        appUser.entitlementStatus === AppEntitlementStatus.TRIALING &&
        appUser.trialEndsAt.getTime() > now;

      if (!subscriptionActive && !trialActive) {
        await this.prismaService.appUser.update({
          where: { id: appUser.id },
          data: {
            entitlementStatus: AppEntitlementStatus.EXPIRED,
            entitlementExpiresAt: null,
            currentPlan: null,
            platformSource: null,
          },
        });
        throw new ForbiddenException("当前账号试用已结束或订阅已失效");
      }

      if (!appUser.installations.length) {
        throw new ServiceUnavailableException("当前账号没有可用的推送设备");
      }

      const requestId = randomUUID();
      const result = await this.pushService.sendToInstallations({
        appUserId: appUser.id,
        requestId,
        title: payload.title,
        content: payload.content,
        installations: appUser.installations,
      });

      return {
        sent: true,
        requestId,
        channel: "app",
        ...result,
      };
    }

    const notifyKey = await this.prismaService.notifyKey.findFirst({
      where: {
        key,
        status: NotifyKeyStatus.ACTIVE,
      },
      include: {
        user: true,
      },
    });

    if (!notifyKey) {
      throw new NotFoundException("通知 key 无效或已失效");
    }

    const page = this.buildNotifyPage(payload);
    const result = await this.wechatService.sendSubscribeMessage({
      openid: notifyKey.user.openid,
      title: payload.title,
      content: payload.content,
      page,
    });

    return {
      sent: true,
      messageId: result.messageId,
      page,
    };
  }

  /**
   * 构造微信小程序跳转页面。
   *
   * 这部分只服务于旧的小程序通知链路，与新 App 的远程推送互不影响。
   */
  private buildNotifyPage(payload: SendNotifyDto) {
    const page = this.configService.getOrThrow<string>(
      "config.wechatNotifyPage",
    );
    const query = new URLSearchParams({
      title: payload.title,
      content: payload.content,
      ts: Date.now().toString(),
    });

    return `${page}?${query.toString()}`;
  }
}
