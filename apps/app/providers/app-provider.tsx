import { apiRequest } from "@/lib/api";
import {
  cleanupExpiredHistory,
  saveNotificationHistory,
} from "@/lib/history-store";
import {
  configurePurchases,
  mapCustomerInfoToSyncPayload,
  type RevenueCatCustomerInfo,
} from "@/lib/purchases";
import { bootstrapApi, testNotify } from "@/services/shell";
import { AppProfile } from "@/services/shell/type";
import Constants from "expo-constants";
import * as Device from "expo-device";
import type * as ExpoNotifications from "expo-notifications";
import { router } from "expo-router";
import * as SecureStore from "expo-secure-store";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";
import { Alert, Platform } from "react-native";

const INSTALLATION_ID_KEY = "ding.installation-id";
type NotificationModule = typeof ExpoNotifications;
type NotificationShape = ExpoNotifications.Notification;

let notificationsModulePromise: Promise<NotificationModule | null> | null =
  null;

const isExpoGo = () => {
  return (
    Constants.executionEnvironment === "storeClient" ||
    Constants.appOwnership === "expo"
  );
};

const loadNotificationsModule = async () => {

  if (Platform.OS === "web" || isExpoGo()) {
    return null;
  }

  if (!notificationsModulePromise) {
    notificationsModulePromise =
      import("expo-notifications") as Promise<NotificationModule>;
  }

  return notificationsModulePromise;
};

const useAppHook = () => {
  const [profile, setProfile] = useState<AppProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastHandledNotificationIdRef = useRef<string | null>(null);

  const bootstrap = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const installationId = await getInstallationId();
      await cleanupExpiredHistory();

      const nextProfile = await bootstrapApi({
        installationId,
        platform: getPlatform(),
        deviceName: Device.deviceName ?? "",
        appVersion: Constants.expoConfig?.version ?? "1.0.0",
      });

      setProfile(nextProfile);

      try {
        await registerPushToken(nextProfile.installationId);
      } catch (pushError) {
        console.warn("register push token failed", pushError);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    if (!profile) {
      return;
    }

    void configurePurchases(profile.appUserId).catch((configureError) => {
      console.warn("configure purchases failed", configureError);
    });
  }, [profile?.appUserId]);

  useEffect(() => {
    let receivedSubscription: { remove: () => void } | null = null;
    let responseSubscription: { remove: () => void } | null = null;

    void (async () => {
      const Notifications = await loadNotificationsModule();
      if (!Notifications) {
        return;
      }

      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldPlaySound: true,
          shouldSetBadge: false,
          shouldShowBanner: true,
          shouldShowList: true,
        }),
      });

      receivedSubscription = Notifications.addNotificationReceivedListener(
        (notification) => {
          void persistNotification(notification);
        },
      );

      responseSubscription =
        Notifications.addNotificationResponseReceivedListener((response) => {
          const notification = response.notification;
          const data = notification.request.content.data as Record<
            string,
            unknown
          >;

          void (async () => {
            const requestId = await persistNotification(
              notification,
              Date.now(),
            );

            if (lastHandledNotificationIdRef.current === requestId) {
              return;
            }

            lastHandledNotificationIdRef.current = requestId;
            const path =
              typeof data.path === "string"
                ? data.path
                : `/notification/${requestId}`;
            router.push(path as never);
          })();
        });

      const response = await Notifications.getLastNotificationResponseAsync();
      if (!response) {
        return;
      }

      const data = response.notification.request.content.data as Record<
        string,
        unknown
      >;

      const requestId = await persistNotification(
        response.notification,
        Date.now(),
      );
      if (lastHandledNotificationIdRef.current === requestId) {
        return;
      }

      lastHandledNotificationIdRef.current = requestId;
      const path =
        typeof data.path === "string"
          ? data.path
          : `/notification/${requestId}`;
      router.push(path as never);
    })();

    return () => {
      receivedSubscription?.remove();
      responseSubscription?.remove();
    };
  }, []);

  const refresh = useCallback(async () => {
    try {
      const installationId = await getInstallationId();
      const nextProfile = await apiRequest<AppProfile>(
        "/api/v1/mobile/profile",
        {
          query: {
            installationId,
          },
        },
      );
      setProfile(nextProfile);
    } catch (refreshError) {
      setError(
        refreshError instanceof Error ? refreshError.message : "刷新失败",
      );
    }
  }, []);

  const sendTestNotification = useCallback(async () => {
    if (!profile) {
      return;
    }

    setIsSyncing(true);
    try {
      await testNotify(profile.installationId);
    } finally {
      setIsSyncing(false);
    }
  }, [profile]);

  const resetKey = useCallback(async () => {
    if (!profile) {
      return;
    }

    setIsSyncing(true);
    try {
      const nextProfile = await apiRequest<AppProfile>(
        "/api/v1/mobile/key/reset",
        {
          method: "POST",
          body: {
            installationId: profile.installationId,
          },
        },
      );
      setProfile(nextProfile);
    } finally {
      setIsSyncing(false);
    }
  }, [profile]);

  const restoreByCode = useCallback(async (restoreCode: string) => {
    const installationId = await getInstallationId();
    setIsSyncing(true);

    try {
      const nextProfile = await apiRequest<AppProfile>(
        "/api/v1/mobile/restore-code",
        {
          method: "POST",
          body: {
            installationId,
            restoreCode,
          },
        },
      );
      setProfile(nextProfile);
      Alert.alert("恢复成功", "已恢复到原来的试用或订阅账号。");
    } finally {
      setIsSyncing(false);
    }
  }, []);

  const syncBilling = useCallback(
    async (customerInfo: RevenueCatCustomerInfo) => {
      if (!profile) {
        return;
      }

      const payload = mapCustomerInfoToSyncPayload(customerInfo);
      if (!payload) {
        Alert.alert("暂无有效订阅", "当前商店账号下没有可同步的有效订阅。");
        return;
      }

      await apiRequest("/api/v1/billing/sync", {
        method: "POST",
        body: {
          installationId: profile.installationId,
          platform: Platform.OS === "ios" ? "IOS" : "ANDROID",
          ...payload,
          rawPayload: customerInfo,
        },
      });

      await refresh();
    },
    [profile, refresh],
  );

  const value = useMemo(
    () => ({
      profile,
      isLoading,
      isSyncing,
      error,
      refresh,
      sendTestNotification,
      resetKey,
      restoreByCode,
      syncBilling,
    }),
    [
      error,
      isLoading,
      isSyncing,
      profile,
      refresh,
      resetKey,
      restoreByCode,
      sendTestNotification,
      syncBilling,
    ],
  );

  return value;
};

export type AppContextValue = ReturnType<typeof useAppHook>;

const AppContext = createContext<AppContextValue | null>(null);

const createInstallationId = () => {
  return `install_${Date.now()}_${Math.random().toString(16).slice(2, 10)}`;
};

/**
 * 获取安装 ID
 */
const getInstallationId = async () => {
  const cached = await SecureStore.getItemAsync(INSTALLATION_ID_KEY);
  if (cached) {
    return cached;
  }

  const nextValue = createInstallationId();
  await SecureStore.setItemAsync(INSTALLATION_ID_KEY, nextValue);
  return nextValue;
};

/**
 * 获取平台
 */
const getPlatform = () => {
  if (Platform.OS === "ios") {
    return "IOS";
  }

  if (Platform.OS === "android") {
    return "ANDROID";
  }

  return "UNKNOWN";
};

const persistNotification = async (
  notification: NotificationShape,
  openedAt?: number,
) => {
  const data = notification.request.content.data as Record<string, unknown>;
  const title = notification.request.content.title ?? "新通知";
  const content =
    notification.request.content.body ??
    (typeof data.content === "string" ? data.content : "");
  const requestId =
    typeof data.requestId === "string"
      ? data.requestId
      : `${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;

  await saveNotificationHistory({
    id: requestId,
    title,
    content,
    payload: data,
    receivedAt: Date.now(),
    openedAt: openedAt ?? null,
  });

  return requestId;
};

async function registerPushToken(installationId: string) {
  const Notifications = await loadNotificationsModule();

  if (!Notifications) {
    return;
  }

  if (!Device.isDevice) {
    return;
  }

  const permission = await Notifications.getPermissionsAsync();
  let status = permission.status;

  if (status !== "granted") {
    const requested = await Notifications.requestPermissionsAsync();
    status = requested.status;
  }

  if (status !== "granted") {
    return;
  }

  const projectId = Constants.expoConfig?.extra?.eas?.projectId;

  if (!projectId) {
    return;
  }

  const token = await Notifications.getExpoPushTokenAsync({ projectId });
  await apiRequest<AppProfile>("/api/v1/mobile/push-token", {
    method: "POST",
    body: {
      installationId,
      pushToken: token.data,
    },
  });
}

export function AppProvider({ children }: PropsWithChildren) {
  const value = useAppHook();
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppSession() {
  const context = useContext(AppContext);

  if (!context) {
    throw new Error("useAppSession must be used within AppProvider");
  }

  return context;
}
