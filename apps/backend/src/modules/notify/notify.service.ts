import { Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NotifyKeyStatus } from "@prisma/client";
import { PrismaService } from "src/prisma/prisma.service";
import { WechatService } from "../wechat/wechat.service";
import { SendNotifyDto } from "./dto/send-notify.dto";
import { NotifyRateLimitService } from "./notify-rate-limit.service";

@Injectable()
export class NotifyService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly configService: ConfigService,
    private readonly wechatService: WechatService,
    private readonly notifyRateLimitService: NotifyRateLimitService,
  ) {}

  async send(key: string, payload: SendNotifyDto, ip: string) {
    this.notifyRateLimitService.assertCanSend(key, ip);

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
