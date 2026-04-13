import * as Clipboard from "expo-clipboard";
import { Share, StyleSheet, View } from "react-native";

import { ActionButton } from "@/components/action-button";
import { PanelCard, PanelGrid } from "@/components/panel-card";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { formatDateTime } from "@/lib/format";
import { useAppSession } from "@/providers/app-provider";

export default function HomeScreen() {
  const { profile, isLoading, isSyncing, sendTestNotification } =
    useAppSession();
  const colorScheme = (useColorScheme() ?? "light") as "light" | "dark";
  const palette = Colors[colorScheme];

  const handleCopy = async () => {
    if (!profile) {
      return;
    }

    await Clipboard.setStringAsync(profile.webhook.getUrl);
  };

  const handleShare = async () => {
    if (!profile) {
      return;
    }

    await Share.share({
      message: profile.webhook.getUrl,
    });
  };

  return (
    <ThemedView style={styles.screen}>
      <PanelGrid>
        <PanelCard>
          <ThemedText type="title" style={styles.heroTitle}>
            Ding 通知中心
          </ThemedText>
          <ThemedText style={{ color: palette.mutedText }}>
            无需登录，首次打开自动生成唯一 key，并通过 URL 向你的手机发送通知。
          </ThemedText>
        </PanelCard>

        <View style={styles.summaryRow}>
          <PanelCard style={styles.summaryCard}>
            <ThemedText type="subtitle">当前状态</ThemedText>
            <ThemedText style={styles.valueText}>
              {isLoading
                ? "加载中..."
                : profile?.entitlementStatus === "ACTIVE"
                  ? "已订阅"
                  : profile?.entitlementStatus === "TRIALING"
                    ? `试用剩余 ${profile.remainingTrialDays} 天`
                    : "已过期"}
            </ThemedText>
          </PanelCard>

          <PanelCard style={styles.summaryCard}>
            <ThemedText type="subtitle">当前 key</ThemedText>
            <ThemedText style={styles.monoText}>
              {profile?.notifyKey ?? "--"}
            </ThemedText>
          </PanelCard>
        </View>

        <PanelCard>
          <ThemedText type="subtitle">Webhook 链接</ThemedText>
          <ThemedText style={styles.monoText}>
            {profile?.webhook.getUrl ?? "--"}
          </ThemedText>
          <ThemedText style={{ color: palette.mutedText }}>
            到期时间：
            {formatDateTime(
              profile?.entitlementExpiresAt ?? profile?.trialEndsAt,
            )}
          </ThemedText>
        </PanelCard>

        <View style={styles.buttonGrid}>
          <ActionButton
            disabled={!profile || isSyncing}
            label="分享链接"
            onPress={() => {
              void handleShare();
            }}
          />
          <ActionButton
            // disabled={!profile || isSyncing}
            label={isSyncing ? "发送中..." : "测试通知"}
            onPress={() => {
              void sendTestNotification();
            }}
          />
          <ActionButton
            disabled={!profile}
            label="复制"
            onPress={() => {
              void handleCopy();
            }}
            tone="secondary"
          />
        </View>
      </PanelGrid>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    padding: 20,
  },
  heroTitle: {
    lineHeight: 36,
  },
  summaryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
  },
  summaryCard: {
    flex: 1,
    minWidth: 240,
  },
  valueText: {
    fontSize: 24,
    fontWeight: "700",
  },
  monoText: {
    fontFamily: "monospace",
  },
  buttonGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
});
