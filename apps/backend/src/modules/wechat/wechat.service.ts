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
   * [生成 URL Link - 官方文档](https://developers.weixin.qq.com/miniprogram/dev/api-backend/open-api/url-link/urllink.generate)
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
}
