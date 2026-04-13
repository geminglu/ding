import { registerAs } from "@nestjs/config";

const getNumber = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export interface ConfigType {
  swagger: boolean;
  port: number;
  databaseUrl: string;
  publicApiBaseUrl: string;
  mobileTrialDays: number;
  mobileAppScheme: string;
  expoPushApiUrl: string;
  iosMonthlyProductId: string;
  iosYearlyProductId: string;
  androidMonthlyProductId: string;
  androidYearlyProductId: string;
  /** 微信小程序 appid */
  wechatAppId: string;
  /** 微信小程序 appsecret */
  wechatAppSecret: string;
  /** 微信小程序模板 id */
  wechatTemplateId: string;
  /** 微信小程序通知页面 */
  wechatNotifyPage: string;
  /** 每分钟每个 key 的请求限制 */
  rateLimitPerKeyPerMinute: number;
  /** 每分钟每个 IP 的请求限制 */
  rateLimitPerIpPerMinute: number;
}

export default registerAs(
  "config",
  (): ConfigType => ({
    swagger: process.env.SWAGGER ? process.env.SWAGGER === "true" : false,
    port: getNumber(process.env.PORT, 3000),
    databaseUrl:
      process.env.DATABASE_URL ?? "mysql://root:123456@127.0.0.1:3306/ding",
    publicApiBaseUrl:
      process.env.PUBLIC_API_BASE_URL ?? "http://127.0.0.1:3000",
    mobileTrialDays: getNumber(process.env.MOBILE_TRIAL_DAYS, 7),
    mobileAppScheme: process.env.MOBILE_APP_SCHEME ?? "ding",
    expoPushApiUrl:
      process.env.EXPO_PUSH_API_URL ?? "https://exp.host/--/api/v2/push/send",
    iosMonthlyProductId:
      process.env.IOS_MONTHLY_PRODUCT_ID ?? "ding_monthly_ios",
    iosYearlyProductId: process.env.IOS_YEARLY_PRODUCT_ID ?? "ding_yearly_ios",
    androidMonthlyProductId:
      process.env.ANDROID_MONTHLY_PRODUCT_ID ?? "ding_monthly_android",
    androidYearlyProductId:
      process.env.ANDROID_YEARLY_PRODUCT_ID ?? "ding_yearly_android",
    wechatAppId: process.env.WECHAT_APP_ID ?? "FAKE_WECHAT_APP_ID",
    wechatAppSecret: process.env.WECHAT_APP_SECRET ?? "FAKE_WECHAT_APP_SECRET",
    wechatTemplateId: process.env.WECHAT_TEMPLATE_ID ?? "FAKE_TEMPLATE_ID",
    wechatNotifyPage: process.env.WECHAT_NOTIFY_PAGE ?? "pages/index/index",
    rateLimitPerKeyPerMinute: getNumber(
      process.env.RATE_LIMIT_PER_KEY_PER_MINUTE,
      5,
    ),
    rateLimitPerIpPerMinute: getNumber(
      process.env.RATE_LIMIT_PER_IP_PER_MINUTE,
      30,
    ),
  }),
);
