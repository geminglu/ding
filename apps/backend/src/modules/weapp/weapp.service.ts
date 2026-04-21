import { Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NotifyKeyStatus } from "@prisma/client";
import { randomBytes } from "node:crypto";
import { PrismaService } from "src/prisma/prisma.service";
import { WechatService } from "../wechat/wechat.service";

@Injectable()
export class WeappService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly configService: ConfigService,
    private readonly wechatService: WechatService,
  ) {}

  async registerOrLogin(code: string) {
    const { openid } = await this.wechatService.code2Session(code);

    let user = await this.prismaService.weappUser.findUnique({
      where: { openid },
      include: {
        notifyKeys: {
          where: { status: NotifyKeyStatus.ACTIVE },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    if (!user) {
      const key = await this.generateUniqueKey();

      user = await this.prismaService.weappUser.create({
        data: {
          openid,
          notifyKeys: {
            create: {
              key,
              status: NotifyKeyStatus.ACTIVE,
            },
          },
        },
        include: {
          notifyKeys: {
            where: { status: NotifyKeyStatus.ACTIVE },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      });
    }

    let activeKey = user.notifyKeys[0];

    if (!activeKey) {
      activeKey = await this.prismaService.notifyKey.create({
        data: {
          userId: user.id,
          key: await this.generateUniqueKey(),
          status: NotifyKeyStatus.ACTIVE,
        },
      });
    }

    return this.buildProfile(user.id, user.openid, activeKey.key);
  }

  async rotateKey(code: string) {
    const { openid } = await this.wechatService.code2Session(code);
    const user = await this.prismaService.weappUser.findUnique({
      where: { openid },
      include: {
        notifyKeys: {
          where: { status: NotifyKeyStatus.ACTIVE },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!user) {
      throw new NotFoundException(
        "当前用户尚未注册，请先重新进入首页完成初始化",
      );
    }

    const nextKey = await this.generateUniqueKey();

    await this.prismaService.$transaction(async (tx) => {
      await tx.notifyKey.updateMany({
        where: {
          userId: user.id,
          status: NotifyKeyStatus.ACTIVE,
        },
        data: {
          status: NotifyKeyStatus.ROTATED,
          rotatedAt: new Date(),
        },
      });

      await tx.notifyKey.create({
        data: {
          userId: user.id,
          key: nextKey,
          status: NotifyKeyStatus.ACTIVE,
        },
      });
    });

    return this.buildProfile(user.id, user.openid, nextKey);
  }

  async generateOpenLink(input: {
    path: string;
    query: string;
    envVersion: "release" | "trial" | "develop";
  }) {
    return this.wechatService.generateOpenLink(input);
  }

  async generateSunCode(input: {
    page: string;
    scene: string;
    envVersion: "release" | "trial" | "develop";
    width: number;
    checkPath: boolean;
  }): Promise<{
    contentType: string;
    imageBase64: string;
    dataUrl: string;
  }> {
    return this.wechatService.generateSunCode(input);
  }

  private buildProfile(userId: string, openid: string, key: string) {
    const baseUrl = this.configService
      .getOrThrow<string>("config.publicApiBaseUrl")
      .replace(/\/$/, "");
    const encodedTitle = encodeURIComponent("测试标题");
    const encodedContent = encodeURIComponent("测试内容");

    return {
      userId,
      openidMasked: this.maskOpenid(openid),
      key,
      templateId: this.configService.getOrThrow<string>(
        "config.wechatTemplateId",
      ),
      notifyGetExample: `${baseUrl}/api/v1/notify/${key}?title=${encodedTitle}&content=${encodedContent}`,
      notifyPostExample: `${baseUrl}/api/v1/notify/${key}`,
      notices: [
        "请开启订阅通知，否则将无法收到小程序通知。",
        "最近通知记录仅保存在当前设备本地，清理缓存、卸载小程序或更换设备后可能丢失。",
        "key 相当于你的通知凭证，任何拿到 key 的人都可以向你发送通知。如怀疑泄漏，请立即更换 key。",
      ],
    };
  }

  private maskOpenid(openid: string) {
    if (openid.length <= 8) {
      return `${openid.slice(0, 2)}****${openid.slice(-2)}`;
    }

    return `${openid.slice(0, 4)}****${openid.slice(-4)}`;
  }

  private async generateUniqueKey() {
    while (true) {
      const key = `nk_${randomBytes(24).toString("hex")}`;
      const exists = await this.prismaService.notifyKey.findUnique({
        where: { key },
      });

      if (!exists) {
        return key;
      }
    }
  }
}
