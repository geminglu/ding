import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';

import { PanelCard } from '@/components/panel-card';
import { getHistoryItem, markNotificationOpened, type NotificationHistoryItem } from '@/lib/history-store';
import { formatDateTime } from '@/lib/format';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function NotificationDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const [item, setItem] = useState<NotificationHistoryItem | null>(null);

  useEffect(() => {
    if (!params.id) {
      return;
    }

    void markNotificationOpened(params.id);
    void getHistoryItem(params.id).then(setItem);
  }, [params.id]);

  return (
    <ThemedView style={styles.screen}>
      <PanelCard>
        <ThemedText type="subtitle">{item?.title ?? '通知详情'}</ThemedText>
        <ThemedText>{item?.content ?? '未找到对应的本地通知记录。'}</ThemedText>
        <ThemedText>收到时间：{formatDateTime(item?.receivedAt)}</ThemedText>
      </PanelCard>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    padding: 20,
  },
});
