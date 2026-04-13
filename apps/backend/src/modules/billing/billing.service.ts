import { Injectable, NotFoundException } from "@nestjs/common";
import { AppEntitlementStatus, AppOrderStatus, Prisma } from "@prisma/client";
import { PrismaService } from "src/prisma/prisma.service";
import { BillingSyncDto } from "./dto/billing-sync.dto";

/**
 * 订阅同步服务。
 *
 * 这个服务对应前面产品文档里的“订阅或使用状态 / 恢复购买 / 订单状态”能力，
 * 负责把客户端或 RevenueCat 传回来的订阅信息落库，并把订单结果折算成账号权益状态。
 */
@Injectable()
export class BillingService {
  constructor(private readonly prismaService: PrismaService) {}

  /**
   * 同步当前安装实例对应账号的订阅结果。
   *
   * 设计目的：
   * 1. 让 iOS / Android 的商店结果最终统一落到后端。
   * 2. 让前端页面展示的“已订阅 / 已过期 / 试用中”始终以服务端为准。
   * 3. 为后续接 RevenueCat webhook 保留统一入口。
   */
  async syncSubscription(dto: BillingSyncDto) {
    const installation = await this.prismaService.appInstallation.findUnique({
      where: { installationId: dto.installationId },
      include: {
        appUser: true,
      },
    });

    if (!installation) {
      throw new NotFoundException("当前设备尚未初始化，无法同步订阅");
    }

    const order = await this.prismaService.subscriptionOrder.upsert({
      where: {
        appUserId_platform_productId: {
          appUserId: installation.appUserId,
          platform: dto.platform,
          productId: dto.productId,
        },
      },
      update: {
        providerCustomerId: dto.providerCustomerId,
        storeTransactionId: dto.storeTransactionId,
        originalTransactionId: dto.originalTransactionId,
        status: dto.status,
        plan: dto.plan,
        purchasedAt: dto.purchasedAt ? new Date(dto.purchasedAt) : null,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        isSandbox: dto.isSandbox ?? false,
        rawPayload: dto.rawPayload as Prisma.InputJsonValue | undefined,
      },
      create: {
        appUserId: installation.appUserId,
        platform: dto.platform,
        productId: dto.productId,
        providerCustomerId: dto.providerCustomerId,
        storeTransactionId: dto.storeTransactionId,
        originalTransactionId: dto.originalTransactionId,
        status: dto.status,
        plan: dto.plan,
        purchasedAt: dto.purchasedAt ? new Date(dto.purchasedAt) : null,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        isSandbox: dto.isSandbox ?? false,
        rawPayload: dto.rawPayload as Prisma.InputJsonValue | undefined,
      },
    });

    const now = Date.now();
    const activeOrder = await this.prismaService.subscriptionOrder.findFirst({
      where: {
        appUserId: installation.appUserId,
        status: {
          in: [AppOrderStatus.ACTIVE, AppOrderStatus.RESTORED],
        },
        OR: [
          { expiresAt: null },
          {
            expiresAt: {
              gt: new Date(now),
            },
          },
        ],
      },
      orderBy: { expiresAt: "desc" },
    });

    await this.prismaService.appUser.update({
      where: { id: installation.appUserId },
      data: activeOrder
        ? {
            entitlementStatus: AppEntitlementStatus.ACTIVE,
            entitlementExpiresAt: activeOrder.expiresAt,
            currentPlan: activeOrder.plan,
            platformSource: activeOrder.platform,
            lastRestoreAt: new Date(),
          }
        : installation.appUser.trialEndsAt.getTime() > now
          ? {
              entitlementStatus: AppEntitlementStatus.TRIALING,
              entitlementExpiresAt: null,
              currentPlan: null,
              platformSource: null,
            }
          : {
              entitlementStatus: AppEntitlementStatus.EXPIRED,
              entitlementExpiresAt: null,
              currentPlan: null,
              platformSource: null,
            },
    });

    return {
      orderId: order.id,
      appUserId: installation.appUserId,
      productId: order.productId,
      platform: order.platform,
      status: order.status,
      plan: order.plan,
      expiresAt: order.expiresAt,
      isSandbox: order.isSandbox,
    };
  }

  /**
   * RevenueCat webhook 占位入口。
   *
   * 当前先只做接收和事件类型透传，后续接入正式订阅联调时，
   * 可以在这里根据 webhook 事件类型继续补“自动同步订单与权益”的逻辑。
   */
  async handleRevenueCatWebhook(payload: Record<string, unknown>) {
    return {
      accepted: true,
      eventType:
        typeof payload.event === "object" &&
        payload.event &&
        "type" in payload.event &&
        typeof payload.event.type === "string"
          ? payload.event.type
          : "unknown",
    };
  }
}
