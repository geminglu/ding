export interface AppProfile {
  appUserId: string;
  installationId: string;
  notifyKey: string;
  restoreCode: string;
  entitlementStatus: "TRIALING" | "ACTIVE" | "EXPIRED" | "GRACE_PERIOD";
  currentPlan: "MONTHLY" | "YEARLY" | null;
  entitlementExpiresAt: string | null;
  trialEndsAt: string;
  remainingTrialDays: number;
  pushEnabled: boolean;
  webhook: {
    getUrl: string;
    postUrl: string;
    params: Array<{
      name: string;
      required: boolean;
      maxLength: number;
      description: string;
    }>;
    safetyTips: string[];
  };
  orderStatus: {
    productId: string;
    status: string;
    plan: string;
    expiresAt: string | null;
    updatedAt: string;
  } | null;
}
