import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { ActionButton } from '@/components/action-button';
import { PanelCard, PanelGrid } from '@/components/panel-card';
import {
  clearHistory,
  deleteHistoryItem,
  getNotificationHistory,
  getRetentionDays,
  setRetentionDays,
  type NotificationHistoryItem,
} from '@/lib/history-store';
import { formatDateTime } from '@/lib/format';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

/**
 * 本地通知历史页。
 *
 * 这个页面直接对应前面文档里的约束：
 * - 通知历史只保存在当前设备
 * - 用户可选保留 7 天或 30 天
 * - 支持清空全部与删除单条
 * - 不提供搜索能力
 */
export default function HistoryScreen() {
  const [items, setItems] = useState<NotificationHistoryItem[]>([]);
  const [retentionDays, setRetentionDaysState] = useState<number>(7);

  /**
   * 从本地 SQLite 读取列表与当前保留策略。
   *
   * 页面每次重新聚焦时都会刷新，保证用户从通知详情页返回后，
   * 仍然能看到最新的本地状态。
   */
  const loadData = useCallback(async () => {
    const [nextItems, nextRetentionDays] = await Promise.all([
      getNotificationHistory(),
      getRetentionDays(),
    ]);
    setItems(nextItems);
    setRetentionDaysState(nextRetentionDays);
  }, []);

  /**
   * 使用 useFocusEffect 而不是普通 useEffect，
   * 是为了在页面每次重新进入前台时都刷新本地历史。
   */
  useFocusEffect(
    useCallback(() => {
      void loadData();
    }, [loadData])
  );

  return (
    <ThemedView style={styles.screen}>
      <PanelGrid>
        <PanelCard>
          <ThemedText type="subtitle">保留周期</ThemedText>
          <View style={styles.retentionRow}>
            <ActionButton
              label="保留 7 天"
              tone={retentionDays === 7 ? 'primary' : 'secondary'}
              onPress={() => {
                void setRetentionDays(7).then(loadData);
              }}
            />
            <ActionButton
              label="保留 30 天"
              tone={retentionDays === 30 ? 'primary' : 'secondary'}
              onPress={() => {
                void setRetentionDays(30).then(loadData);
              }}
            />
          </View>
        </PanelCard>

        <PanelCard>
          <View style={styles.headerRow}>
            <ThemedText type="subtitle">本地通知历史</ThemedText>
            <ActionButton
              label="清空全部"
              tone="danger"
              onPress={() => {
                Alert.alert('确认清空', '清空后当前设备上的历史将无法恢复。', [
                  { text: '取消', style: 'cancel' },
                  {
                    text: '清空',
                    style: 'destructive',
                    onPress: () => {
                      void clearHistory().then(loadData);
                    },
                  },
                ]);
              }}
            />
          </View>

          {items.length ? (
            items.map((item) => (
              <View key={item.id} style={styles.itemCard}>
                <View style={styles.itemHeader}>
                  <ThemedText type="defaultSemiBold">{item.title}</ThemedText>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      void deleteHistoryItem(item.id).then(loadData);
                    }}>
                    <ThemedText type="link">删除</ThemedText>
                  </Pressable>
                </View>
                <ThemedText>{item.content}</ThemedText>
                <ThemedText style={styles.metaText}>
                  收到时间：{formatDateTime(item.receivedAt)}
                </ThemedText>
              </View>
            ))
          ) : (
            <ThemedText>当前设备还没有保存任何通知历史。</ThemedText>
          )}
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
  retentionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  itemCard: {
    gap: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#99999955',
    paddingTop: 12,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  metaText: {
    opacity: 0.75,
  },
});
