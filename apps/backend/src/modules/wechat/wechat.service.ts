import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios from "axios";
import dayjs from "dayjs";

interface Code2SessionResponse {
  openid?: string;
  session_key?: string;
  errcode?: number;
  errmsg?: string;
}

interface AccessTokenResponse {
  access_token?: string;
  expires_in?: number;
  errcode?: number;
  errmsg?: string;
}

interface SubscribeMessageResponse {
  errcode: number;
  errmsg: string;
  msgid?: string;
}

interface GenerateUrlLinkResponse {
  url_link?: string;
  errcode?: number;
  errmsg?: string;
}

interface GenerateSchemeResponse {
  openlink?: string;
  errcode?: number;
  errmsg?: string;
}

interface GenerateSunCodeInput {
  page: string;
  scene: string;
  envVersion: "release" | "trial" | "develop";
  width: number;
  checkPath: boolean;
}

interface GenerateSunCodeResult {
  contentType: string;
  imageBase64: string;
  dataUrl: string;
}

interface WechatErrorResponse {
  errcode?: number;
  errmsg?: string;
}

interface SendSubscribeMessageInput {
  openid: string;
  title: string;
  content: string;
  page: string;
}

interface GenerateOpenLinkInput {
  path: string;
  query: string;
  envVersion: "release" | "trial" | "develop";
}

@Injectable()
export class WechatService {
  private cachedAccessToken: { value: string; expiresAt: number } | null = null;

  constructor(private readonly configService: ConfigService) {}

  async code2Session(code: string) {
    const { data } = await axios.get<Code2SessionResponse>(
      "https://api.weixin.qq.com/sns/jscode2session",
      {
        params: {
          appid: this.configService.getOrThrow<string>("config.wechatAppId"),
          secret: this.configService.getOrThrow<string>(
            "config.wechatAppSecret",
          ),
          js_code: code,
          grant_type: "authorization_code",
        },
      },
    );

    if (data.errcode || !data.openid) {
      throw new BadRequestException(
        data.errmsg
          ? `微信登录失败: ${data.errmsg}`
          : "微信登录失败，请稍后重试",
      );
    }

    return {
      openid: data.openid,
      sessionKey: data.session_key ?? "",
    };
  }

  /**
   * 发送订阅消息
   */
  async sendSubscribeMessage(input: SendSubscribeMessageInput) {
    const accessToken = await this.getAccessToken();
    const templateId = this.configService.getOrThrow<string>(
      "config.wechatTemplateId",
    );

    const { data } = await axios.post<SubscribeMessageResponse>(
      `https://api.weixin.qq.com/cgi-bin/message/subscribe/send?access_token=${accessToken}`,
      {
        touser: input.openid,
        template_id: templateId,
        page: input.page,
        data: {
          thing1: { value: input.title },
          thing3: { value: input.content },
          time2: { value: dayjs().format("YYYY-MM-DD HH:mm:ss") },
        },
      },
    );

    if (data.errcode === 0) {
      return {
        messageId: data.msgid ?? "",
      };
    }

    if (data.errcode === 43101) {
      throw new ForbiddenException("用户未开启订阅通知或已拒绝订阅");
    }

    if (data.errcode === 47003) {
      throw new BadRequestException(
        "微信模板参数不合法，请检查 title 和 content 长度",
      );
    }

    if (data.errcode === 40003) {
      throw new BadRequestException("用户标识无效，无法发送通知");
    }

    if (data.errcode === 40037) {
      throw new ServiceUnavailableException(
        "微信模板 ID 无效，请检查服务端配置",
      );
    }

    throw new ServiceUnavailableException(
      `微信发送失败: ${data.errmsg || "未知错误"} (${data.errcode})`,
    );
  }

  /**
   * 生成微信小程序 URL Link 和 Scheme。
   */
  async generateOpenLink(input: GenerateOpenLinkInput) {
    const accessToken = await this.getAccessToken();
    const [urlLink, scheme] = await Promise.all([
      this.generateUrlLink({
        accessToken,
        path: input.path,
        query: input.query,
        envVersion: input.envVersion,
      }),
      this.generateScheme({
        accessToken,
        path: input.path,
        query: input.query,
        envVersion: input.envVersion,
      }),
    ]);
    return {
      path: input.path,
      query: input.query,
      envVersion: input.envVersion,
      urlLink,
      scheme,
    };
  }

  /**
   * 生成微信小程序太阳码。
   * 该接口用于获取小程序码，适用于需要的码数量极多的业务场景。通过该接口生成的小程序码，永久有效，数量暂无限制。 更多用法详见 [获取小程序码](https://developers.weixin.qq.com/miniprogram/dev/framework/open-ability/qr-code.html)
   * [生成小程序码 - 官方文档](https://developers.weixin.qq.com/miniprogram/dev/server/API/qrcode-link/qr-code/api_getunlimitedqrcode.html)
   */
  async generateSunCode(
    input: GenerateSunCodeInput,
  ): Promise<GenerateSunCodeResult> {
    const accessToken = await this.getAccessToken();
    const response = await axios.post<ArrayBuffer>(
      `https://api.weixin.qq.com/wxa/getwxacodeunlimit?access_token=${accessToken}`,
      {
        page: input.page,
        scene: input.scene,
        env_version: input.envVersion,
        width: input.width,
        check_path: input.checkPath,
      },
      {
        responseType: "arraybuffer",
      },
    );
    const responseHeaders = response.headers as Record<string, unknown>;
    const rawContentType = responseHeaders["content-type"];
    const contentType = this.extractContentType(
      typeof rawContentType === "string" ? rawContentType : undefined,
    );

    if (contentType.includes("application/json")) {
      const errorText = Buffer.from(response.data).toString("utf8");
      const errorData = JSON.parse(errorText) as WechatErrorResponse;
      throw new ServiceUnavailableException(
        errorData.errmsg
          ? `生成微信太阳码失败: ${errorData.errmsg}`
          : "生成微信太阳码失败",
      );
    }

    const imageBase64 = Buffer.from(response.data).toString("base64");
    return {
      contentType,
      imageBase64,
      dataUrl: `data:${contentType};base64,${imageBase64}`,
    };
  }

  private async getAccessToken() {
    const now = Date.now();
    if (this.cachedAccessToken && this.cachedAccessToken.expiresAt > now) {
      return this.cachedAccessToken.value;
    }

    const { data } = await axios.get<AccessTokenResponse>(
      "https://api.weixin.qq.com/cgi-bin/token",
      {
        params: {
          grant_type: "client_credential",
          appid: this.configService.getOrThrow<string>("config.wechatAppId"),
          secret: this.configService.getOrThrow<string>(
            "config.wechatAppSecret",
          ),
        },
      },
    );

    if (data.errcode || !data.access_token || !data.expires_in) {
      throw new ServiceUnavailableException(
        data.errmsg
          ? `获取微信 access_token 失败: ${data.errmsg}`
          : "获取微信 access_token 失败",
      );
    }

    this.cachedAccessToken = {
      value: data.access_token,
      expiresAt: now + (data.expires_in - 120) * 1000,
    };

    return this.cachedAccessToken.value;
  }

  /**
   * 生成微信小程序 URL Link
   * [生成 URL Link - 官方文档](https://developers.weixin.qq.com/miniprogram/dev/framework/open-ability/url-link.html)
   */
  private async generateUrlLink(input: {
    accessToken: string;
    path: string;
    query: string;
    envVersion: "release" | "trial" | "develop";
  }) {
    const { data } = await axios.post<GenerateUrlLinkResponse>(
      `https://api.weixin.qq.com/wxa/generate_urllink?access_token=${input.accessToken}`,
      {
        path: input.path,
        query: input.query,
        env_version: input.envVersion,
      },
    );
    if (data.errcode || !data.url_link) {
      throw new ServiceUnavailableException(
        data.errmsg
          ? `生成微信 URL Link 失败: ${data.errmsg}`
          : "生成微信 URL Link 失败",
      );
    }
    return data.url_link;
  }

  /**
   * 生成微信小程序 Scheme
   * [生成 Scheme - 官方文档](https://developers.weixin.qq.com/miniprogram/dev/framework/open-ability/url-scheme.html)
   */
  private async generateScheme(input: {
    accessToken: string;
    path: string;
    query: string;
    envVersion: "release" | "trial" | "develop";
  }) {
    const { data } = await axios.post<GenerateSchemeResponse>(
      `https://api.weixin.qq.com/wxa/generatescheme?access_token=${input.accessToken}`,
      {
        jump_wxa: {
          path: input.path,
          query: input.query,
          env_version: input.envVersion,
        },
      },
    );
    if (data.errcode || !data.openlink) {
      throw new ServiceUnavailableException(
        data.errmsg
          ? `生成微信 Scheme 失败: ${data.errmsg}`
          : "生成微信 Scheme 失败",
      );
    }
    return data.openlink;
  }

  private extractContentType(contentType?: string): string {
    return contentType?.split(";")[0]?.trim() || "image/jpeg";
  }
}
