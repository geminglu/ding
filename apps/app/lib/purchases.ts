import { Platform } from 'react-native';

import { appConfig, getProductIdForPlan, isBillingConfigured } from '@/constants/app-config';

/**
 * RevenueCat 模块的轻量类型描述。
 *
 * 这里没有直接依赖完整 SDK 类型，而是只描述当前项目会用到的最小能力，
 * 目的是让订阅逻辑更聚焦在“初始化 / 购买 / 恢复 / 读取用户信息”这几件事上。
 */
type PurchaseModule = {
  LOG_LEVEL: {
    WARN: unknown;
  };
  default: {
    configure: (options: { apiKey: string; appUserID: string }) => Promise<void> | void;
    setLogLevel: (level: unknown) => void;
    logIn: (appUserId: string) => Promise<unknown>;
    getOfferings: () => Promise<{
      current: {
        availablePackages: Array<{
          identifier: string;
          product: { identifier: string };
        }>;
      } | null;
    }>;
    purchasePackage: (pkg: unknown) => Promise<{ customerInfo: RevenueCatCustomerInfo }>;
    restorePurchases: () => Promise<RevenueCatCustomerInfo>;
    getCustomerInfo: () => Promise<RevenueCatCustomerInfo>;
  };
};

export interface RevenueCatCustomerInfo {
  originalAppUserId?: string;
  activeSubscriptions?: string[];
  latestExpirationDate?: string | null;
  entitlements: {
    active: Record<
      string,
      {
        productIdentifier: string;
        latestPurchaseDate?: string | null;
        expirationDate?: string | null;
      }
    >;
  };
}

/**
 * 通过模块级缓存，保证 RevenueCat SDK 在一次应用会话里只初始化一次。
 *
 * 这样可以避免页面切换或 Provider 重渲染时反复初始化原生订阅 SDK。
 */
let purchasesModule: PurchaseModule | null = null;
let configuredAppUserId: string | null = null;
let isConfigured = false;

/**
 * 根据当前平台返回对应的 RevenueCat 公钥。
 */
const getApiKey = () => {
  if (Platform.OS === 'ios') {
    return appConfig.iosRevenueCatApiKey;
  }

  if (Platform.OS === 'android') {
    return appConfig.androidRevenueCatApiKey;
  }

  return '';
};

/**
 * 按需动态加载 RevenueCat。
 *
 * 设计目的：
 * 1. Web 环境直接跳过
 * 2. 未配置订阅环境时直接返回 null
 * 3. 避免在未准备好原生环境时提前触发模块错误
 */
const loadPurchasesModule = async () => {
  if (Platform.OS === 'web' || !isBillingConfigured()) {
    return null;
  }

  if (!purchasesModule) {
    purchasesModule = (await import(
      'react-native-purchases'
    )) as unknown as PurchaseModule;
  }

  return purchasesModule;
};

/**
 * 初始化 RevenueCat，并把当前匿名账号绑定到订阅体系。
 *
 * 这一步对应产品文档中的“无登录匿名账号 + 订阅恢复”模型：
 * App 自己没有登录页，但依然要让订阅 SDK 知道当前匿名用户是谁。
 */
export async function configurePurchases(appUserId: string) {
  const module = await loadPurchasesModule();
  const apiKey = getApiKey();

  if (!module || !apiKey) {
    return false;
  }

  const Purchases = module.default;

  if (!isConfigured) {
    Purchases.setLogLevel(module.LOG_LEVEL.WARN);
    await Purchases.configure({ apiKey, appUserID: appUserId });
    configuredAppUserId = appUserId;
    isConfigured = true;
    return true;
  }

  if (configuredAppUserId !== appUserId) {
    await Purchases.logIn(appUserId);
    configuredAppUserId = appUserId;
  }

  return true;
}

/**
 * 发起购买指定套餐。
 */
export async function purchasePlan(plan: 'MONTHLY' | 'YEARLY') {
  const module = await loadPurchasesModule();

  if (!module) {
    throw new Error('当前环境尚未配置 RevenueCat');
  }

  const Purchases = module.default;
  const offerings = await Purchases.getOfferings();
  const targetProductId = getProductIdForPlan(plan);
  const targetPackage = offerings.current?.availablePackages.find((pkg) => {
    return pkg.product.identifier === targetProductId;
  });

  if (!targetPackage) {
    throw new Error('未找到可购买的订阅套餐，请检查商品 ID 配置');
  }

  const result = await Purchases.purchasePackage(targetPackage);
  return result.customerInfo;
}

/**
 * 从商店恢复当前账号下的历史购买。
 */
export async function restorePurchases() {
  const module = await loadPurchasesModule();

  if (!module) {
    throw new Error('当前环境尚未配置 RevenueCat');
  }

  return module.default.restorePurchases();
}

/**
 * 获取当前 RevenueCat 用户信息。
 *
 * 订阅页里的“查看订单状态 / 同步最新权益”会依赖这里的数据。
 */
export async function getCustomerInfo() {
  const module = await loadPurchasesModule();

  if (!module) {
    throw new Error('当前环境尚未配置 RevenueCat');
  }

  return module.default.getCustomerInfo();
}

/**
 * 把 RevenueCat 返回的 customerInfo 映射成后端 `/billing/sync` 需要的最小载荷。
 *
 * 设计目的：
 * - 前端不直接做复杂权益判断
 * - 把商店侧数据转换为统一格式后交给服务端落库
 */
export function mapCustomerInfoToSyncPayload(customerInfo: RevenueCatCustomerInfo) {
  const entitlementId = appConfig.revenueCatEntitlementId;
  const activeEntitlement = entitlementId
    ? customerInfo.entitlements.active[entitlementId]
    : undefined;
  const activeProductId =
    activeEntitlement?.productIdentifier ??
    customerInfo.activeSubscriptions?.find((productId) => {
      return [
        appConfig.iosMonthlyProductId,
        appConfig.iosYearlyProductId,
        appConfig.androidMonthlyProductId,
        appConfig.androidYearlyProductId,
      ].includes(productId);
    });

  if (!activeProductId) {
    return null;
  }

  const isYearly = [
    appConfig.iosYearlyProductId,
    appConfig.androidYearlyProductId,
  ].includes(activeProductId);

  return {
    providerCustomerId: customerInfo.originalAppUserId,
    productId: activeProductId,
    plan: isYearly ? 'YEARLY' : 'MONTHLY',
    status: 'ACTIVE' as const,
    expiresAt:
      activeEntitlement?.expirationDate ?? customerInfo.latestExpirationDate ?? undefined,
    purchasedAt: activeEntitlement?.latestPurchaseDate ?? undefined,
  };
}
