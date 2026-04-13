import * as WebBrowser from "expo-web-browser";
import { Slot, usePathname, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { appConfig } from "@/constants/app-config";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { ThemedText } from "./themed-text";
import { ThemedView } from "./themed-view";

/**
 * 响应式菜单项定义。
 *
 * 对应产品文档里的侧边菜单：
 * Home / WebHooks / 通知历史 / 教程 / 订阅或使用状态 / 关于
 */
type MenuItem = {
  key: string;
  label: string;
  path?: string;
  externalUrl?: string;
};

const menuItems: MenuItem[] = [
  { key: "home", label: "Home", path: "/" },
  { key: "webhooks", label: "WebHooks", path: "/webhooks" },
  { key: "history", label: "通知历史", path: "/history" },
  { key: "tutorial", label: "教程", externalUrl: appConfig.tutorialUrl },
  { key: "subscription", label: "订阅或使用状态", path: "/subscription" },
  { key: "about", label: "关于", path: "/about" },
  { key: "test", label: "测试", path: "/test" },
];

const titleMap: Record<string, string> = {
  "/": "通知面板",
  "/webhooks": "WebHooks",
  "/history": "通知历史",
  "/subscription": "订阅或使用状态",
  "/about": "关于",
  "/test": "测试",
};

/**
 * App 顶层响应式壳层。
 *
 * 设计目的：
 * 1. 手机端使用抽屉式菜单
 * 2. 大屏或 iPad 场景使用左侧常驻菜单
 * 3. 把页面标题、菜单跳转、外链入口统一收口
 */
export function AppShell() {
  const router = useRouter();
  const pathname = usePathname();
  const { width } = useWindowDimensions();
  const colorScheme = (useColorScheme() ?? "light") as "light" | "dark";
  const [menuVisible, setMenuVisible] = useState(false);
  const isLargeScreen = width >= 900;
  const palette = Colors[colorScheme];

  /**
   * 根据当前 pathname 推导顶部标题。
   * 通知详情页单独处理，是因为它的路由是动态参数。
   */
  const title = useMemo(() => {
    if (pathname.startsWith("/notification/")) {
      return "通知详情";
    }

    return titleMap[pathname] ?? "Ding";
  }, [pathname]);

  /**
   * 处理菜单项点击。
   *
   * - 内部页面：走 Expo Router
   * - 教程等外部页面：直接拉起浏览器
   */
  const handleItemPress = async (item: MenuItem) => {
    if (item.externalUrl) {
      setMenuVisible(false);
      await WebBrowser.openBrowserAsync(item.externalUrl);
      return;
    }

    if (item.path) {
      setMenuVisible(false);
      router.push(item.path as never);
    }
  };

  /**
   * 侧边栏本体。
   * 同一份结构会在大屏常驻显示，也会在小屏弹窗里复用。
   */
  const sidebar = (
    <ThemedView
      style={[
        styles.sidebar,
        {
          borderColor: palette.border,
          backgroundColor: palette.card,
        },
      ]}
    >
      <ThemedText type="title" style={styles.logo}>
        Ding
      </ThemedText>
      <ThemedText
        style={[styles.logoDescription, { color: palette.mutedText }]}
      >
        通过 URL 触发你的手机通知
      </ThemedText>

      <View style={styles.menuList}>
        {menuItems.map((item) => {
          const active = item.path ? pathname === item.path : false;

          return (
            <Pressable
              key={item.key}
              accessibilityRole="button"
              onPress={() => {
                void handleItemPress(item);
              }}
              style={[
                styles.menuItem,
                active && {
                  backgroundColor: palette.background,
                  borderColor: palette.tint,
                },
              ]}
            >
              <ThemedText
                style={[
                  styles.menuLabel,
                  { color: active ? palette.tint : palette.text },
                ]}
              >
                {item.label}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>
    </ThemedView>
  );

  return (
    <SafeAreaView style={styles.root} edges={["top", "left", "right"]}>
      <View style={styles.container}>
        {isLargeScreen ? sidebar : null}

        <View style={styles.contentArea}>
          <ThemedView
            style={[
              styles.topBar,
              {
                borderColor: palette.border,
              },
            ]}
          >
            {!isLargeScreen ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => setMenuVisible(true)}
                style={[styles.menuButton, { borderColor: palette.border }]}
              >
                <ThemedText style={styles.menuButtonText}>菜单</ThemedText>
              </Pressable>
            ) : null}

            <View style={styles.topBarText}>
              <ThemedText type="subtitle">{title}</ThemedText>
              <ThemedText style={{ color: palette.mutedText }}>
                响应式支持 iPhone、iPad 和 Android
              </ThemedText>
            </View>
          </ThemedView>

          <View style={styles.slotWrapper}>
            <Slot />
          </View>
        </View>
      </View>

      {!isLargeScreen ? (
        <Modal
          animationType="slide"
          onRequestClose={() => setMenuVisible(false)}
          transparent
          visible={menuVisible}
        >
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setMenuVisible(false)}
          >
            <Pressable style={styles.modalPanel}>{sidebar}</Pressable>
          </Pressable>
        </Modal>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  container: {
    flex: 1,
    flexDirection: "row",
  },
  sidebar: {
    width: 280,
    borderRightWidth: 1,
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  logo: {
    lineHeight: 36,
  },
  logoDescription: {
    marginTop: 8,
    marginBottom: 24,
  },
  menuList: {
    gap: 10,
  },
  menuItem: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "transparent",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  menuLabel: {
    fontWeight: "600",
  },
  contentArea: {
    flex: 1,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderBottomWidth: 1,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  menuButton: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  menuButtonText: {
    fontWeight: "600",
  },
  topBarText: {
    flex: 1,
    gap: 4,
  },
  slotWrapper: {
    flex: 1,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-start",
  },
  modalPanel: {
    width: 300,
    maxWidth: "86%",
    height: "100%",
  },
});
