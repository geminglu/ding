import { Platform } from 'react-native';

/**
 * 统一解析 URL 类型环境变量。
 *
 * 设计目的：
 * 1. 让前端页面在开发阶段即使没有真实配置也能拿到兜底值。
 * 2. 把“环境变量缺失”对业务代码的影响收敛到配置层。
 */
const parseUrl = (value: string | undefined, fallback: string) => {
  return value && value.trim() ? value.trim() : fallback;
};

/**
 * 统一解析邮箱类环境变量。
 */
const parseEmail = (value: string | undefined, fallback: string) => {
  return value && value.trim() ? value.trim() : fallback;
};

/**
 * App 端运行时配置。
 *
 * 这些字段直接对应前面文档里提到的：
 * - 教程、隐私政策、用户协议、反馈入口
 * - Apple / Google 订阅商品 ID
 * - RevenueCat 配置
 * - 后端 API 地址
 */
export const appConfig = {
  apiBaseUrl: parseUrl(
    process.env.EXPO_PUBLIC_API_BASE_URL,
    "http://127.0.0.1:3000",
  ),
  tutorialUrl: parseUrl(
    process.env.EXPO_PUBLIC_TUTORIAL_URL,
    "https://example.com/tutorial",
  ),
  privacyUrl: parseUrl(
    process.env.EXPO_PUBLIC_PRIVACY_URL,
    "https://example.com/privacy",
  ),
  termsUrl: parseUrl(
    process.env.EXPO_PUBLIC_TERMS_URL,
    "https://example.com/terms",
  ),
  feedbackUrl: parseUrl(
    process.env.EXPO_PUBLIC_FEEDBACK_URL,
    "https://example.com/feedback",
  ),
  supportEmail: parseEmail(
    process.env.EXPO_PUBLIC_SUPPORT_EMAIL,
    "support@example.com",
  ),
  iosRevenueCatApiKey: process.env.EXPO_PUBLIC_IOS_REVENUECAT_API_KEY ?? "",
  androidRevenueCatApiKey:
    process.env.EXPO_PUBLIC_ANDROID_REVENUECAT_API_KEY ?? "",
  revenueCatEntitlementId:
    process.env.EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID ?? "",
  iosMonthlyProductId:
    process.env.EXPO_PUBLIC_IOS_MONTHLY_PRODUCT_ID ?? "ding_monthly_ios",
  iosYearlyProductId:
    process.env.EXPO_PUBLIC_IOS_YEARLY_PRODUCT_ID ?? "ding_yearly_ios",
  androidMonthlyProductId:
    process.env.EXPO_PUBLIC_ANDROID_MONTHLY_PRODUCT_ID ??
    "ding_monthly_android",
  androidYearlyProductId:
    process.env.EXPO_PUBLIC_ANDROID_YEARLY_PRODUCT_ID ?? "ding_yearly_android",
};

/**
 * 根据当前平台与套餐类型，返回对应的商店商品 ID。
 *
 * 这样订阅页只需要关心“月付 / 年付”，
 * 不需要在页面层反复判断 iOS 和 Android 的商品差异。
 */
export const getProductIdForPlan = (plan: "MONTHLY" | "YEARLY") => {
  if (Platform.OS === "ios") {
    return plan === "MONTHLY"
      ? appConfig.iosMonthlyProductId
      : appConfig.iosYearlyProductId;
  }

  return plan === "MONTHLY"
    ? appConfig.androidMonthlyProductId
    : appConfig.androidYearlyProductId;
};

/**
 * 判断当前平台是否已经具备最基本的订阅联调条件。
 *
 * 当前策略很简单：
 * - iOS 看 iOS RevenueCat key 是否存在
 * - Android 看 Android RevenueCat key 是否存在
 */
export const isBillingConfigured = () => {
  if (Platform.OS === "ios") {
    return Boolean(appConfig.iosRevenueCatApiKey);
  }

  if (Platform.OS === "android") {
    return Boolean(appConfig.androidRevenueCatApiKey);
  }

  return false;
};
