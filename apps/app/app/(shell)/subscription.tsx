import { useState } from 'react';
import { Alert, StyleSheet, TextInput, View } from 'react-native';

import { ActionButton } from '@/components/action-button';
import { PanelCard, PanelGrid } from '@/components/panel-card';
import { Colors } from '@/constants/theme';
import { isBillingConfigured } from '@/constants/app-config';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { formatDateTime } from '@/lib/format';
import {
  getCustomerInfo,
  purchasePlan,
  restorePurchases,
} from '@/lib/purchases';
import { useAppSession } from '@/providers/app-provider';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function SubscriptionScreen() {
  const { profile, isSyncing, restoreByCode, syncBilling, refresh } = useAppSession();
  const [restoreCode, setRestoreCode] = useState('');
  const colorScheme = (useColorScheme() ?? 'light') as 'light' | 'dark';
  const palette = Colors[colorScheme];
  const billingReady = isBillingConfigured();

  const ensureBillingConfigured = () => {
    if (billingReady) {
      return true;
    }

    Alert.alert(
      '暂未配置支付环境',
      '请先补充 RevenueCat / App Store / Google Play 的环境参数，再进行购买或恢复购买。'
    );
    return false;
  };

  const handlePurchase = async (plan: 'MONTHLY' | 'YEARLY') => {
    if (!ensureBillingConfigured()) {
      return;
    }

    try {
      const customerInfo = await purchasePlan(plan);
      await syncBilling(customerInfo);
      Alert.alert('购买成功', '订阅已同步到当前设备。');
    } catch (error) {
      Alert.alert('购买失败', error instanceof Error ? error.message : '未知错误');
    }
  };

  const handleRestorePurchases = async () => {
    if (!ensureBillingConfigured()) {
      return;
    }

    try {
      const customerInfo = await restorePurchases();
      await syncBilling(customerInfo);
      Alert.alert('恢复完成', '已尝试恢复当前商店账号下的订阅。');
    } catch (error) {
      Alert.alert('恢复失败', error instanceof Error ? error.message : '未知错误');
    }
  };

  const handleRefreshOrder = async () => {
    try {
      if (billingReady) {
        const customerInfo = await getCustomerInfo();
        await syncBilling(customerInfo);
      } else {
        await refresh();
      }
    } catch (error) {
      Alert.alert('刷新失败', error instanceof Error ? error.message : '未知错误');
    }
  };

  return (
    <ThemedView style={styles.screen}>
      <PanelGrid>
        <PanelCard>
          <ThemedText type="subtitle">当前使用状态</ThemedText>
          <ThemedText style={styles.valueText}>
            {profile?.entitlementStatus === 'ACTIVE'
              ? '已订阅'
              : profile?.entitlementStatus === 'TRIALING'
                ? `试用剩余 ${profile.remainingTrialDays} 天`
                : '已过期'}
          </ThemedText>
          <ThemedText style={{ color: palette.mutedText }}>
            当前套餐：{profile?.currentPlan ?? '--'}
          </ThemedText>
          <ThemedText style={{ color: palette.mutedText }}>
            到期时间：{formatDateTime(profile?.entitlementExpiresAt ?? profile?.trialEndsAt)}
          </ThemedText>
        </PanelCard>

        <PanelCard>
          <ThemedText type="subtitle">购买入口</ThemedText>
          <View style={styles.buttonGrid}>
            <ActionButton
              disabled={isSyncing}
              label="购买月付"
              onPress={() => {
                void handlePurchase('MONTHLY');
              }}
            />
            <ActionButton
              disabled={isSyncing}
              label="购买年付"
              onPress={() => {
                void handlePurchase('YEARLY');
              }}
            />
          </View>
        </PanelCard>

        <PanelCard>
          <ThemedText type="subtitle">恢复购买 / 恢复码</ThemedText>
          <ActionButton
            disabled={isSyncing}
            label="恢复购买"
            tone="secondary"
            onPress={() => {
              void handleRestorePurchases();
            }}
          />
          <ThemedText style={{ color: palette.mutedText }}>
            恢复码可以找回原来的试用状态、notify key 与已同步到服务端的订阅状态。
          </ThemedText>
          <TextInput
            onChangeText={setRestoreCode}
            placeholder="输入恢复码"
            placeholderTextColor={palette.mutedText}
            style={[
              styles.input,
              {
                borderColor: palette.border,
                color: palette.text,
              },
            ]}
            value={restoreCode}
          />
          <ActionButton
            disabled={!restoreCode.trim() || isSyncing}
            label="输入恢复码"
            tone="secondary"
            onPress={() => {
              void restoreByCode(restoreCode.trim());
            }}
          />
          <ThemedText style={styles.codeText}>
            当前恢复码：{profile?.restoreCode ?? '--'}
          </ThemedText>
        </PanelCard>

        <PanelCard>
          <ThemedText type="subtitle">订单状态</ThemedText>
          <ThemedText>商品：{profile?.orderStatus?.productId ?? '--'}</ThemedText>
          <ThemedText>状态：{profile?.orderStatus?.status ?? '--'}</ThemedText>
          <ThemedText>套餐：{profile?.orderStatus?.plan ?? '--'}</ThemedText>
          <ThemedText>
            订单更新时间：{formatDateTime(profile?.orderStatus?.updatedAt)}
          </ThemedText>
          <ActionButton
            label="查看订单状态"
            tone="secondary"
            onPress={() => {
              void handleRefreshOrder();
            }}
          />
        </PanelCard>
      </PanelGrid>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    padding: 20,
  },
  valueText: {
    fontSize: 24,
    fontWeight: '700',
  },
  buttonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  input: {
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  codeText: {
    fontFamily: 'monospace',
  },
});
