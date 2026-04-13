import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { DeliveryStatus } from "@prisma/client";
import axios from "axios";
import { PrismaService } from "src/prisma/prisma.service";

interface PushTicket {
  status: "ok" | "error";
  id?: string;
  message?: string;
}

interface SendAppPushInput {
  appUserId: string;
  requestId: string;
  title: string;
  content: string;
  installations: Array<{
    id: string;
    pushToken: string | null;
  }>;
}

@Injectable()
export class PushService {
  constructor(
    private readonly configService: ConfigService,
    private readonly prismaService: PrismaService,
  ) {}

  assertExpoPushToken(pushToken: string) {
    if (!/^(ExpoPushToken|ExponentPushToken)\[.+\]$/.test(pushToken)) {
      throw new BadRequestException("push token 不合法");
    }
  }

  /**
   * 发送通知到指定设备
   * @param input 发送通知输入
   * @returns 发送通知结果
   */
  async sendToInstallations(input: SendAppPushInput) {
    const targets = input.installations.filter((installation) => {
      return Boolean(installation.pushToken);
    });

    console.log("targets", targets, input);

    if (!targets.length) {
      throw new ServiceUnavailableException("当前账号还没有可用的推送设备");
    }

    const messages = targets.map((installation) => {
      const token = installation.pushToken ?? "";
      this.assertExpoPushToken(token);

      return {
        to: token,
        title: input.title,
        body: input.content,
        sound: "default",
        data: {
          requestId: input.requestId,
          path: `/notification/${input.requestId}`,
          title: input.title,
          content: input.content,
        },
      };
    });

    const { data } = await axios.post<{ data?: PushTicket[] | PushTicket }>(
      this.configService.getOrThrow<string>("config.expoPushApiUrl"),
      messages,
      {
        headers: {
          Accept: "application/json",
          "Accept-Encoding": "gzip, deflate",
          "Content-Type": "application/json",
        },
      },
    );

    const tickets = Array.isArray(data.data)
      ? data.data
      : data.data
        ? [data.data]
        : [];

    await this.prismaService.notifyDeliveryLog.createMany({
      data: targets.map((installation, index) => {
        const ticket = tickets[index];
        return {
          appUserId: input.appUserId,
          installationId: installation.id,
          requestId: input.requestId,
          providerMessageId: ticket?.id ?? null,
          status:
            ticket?.status === "ok"
              ? DeliveryStatus.SENT
              : DeliveryStatus.FAILED,
        };
      }),
    });

    return {
      deliveryCount: targets.length,
      tickets: tickets.map((ticket, index) => ({
        installationId: targets[index]?.id ?? "",
        providerMessageId: ticket?.id ?? "",
        status: ticket?.status ?? "error",
        message: ticket?.message ?? "",
      })),
    };
  }
}
