import { Alert, Share, StyleSheet, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';

import { ActionButton } from '@/components/action-button';
import { PanelCard, PanelGrid } from '@/components/panel-card';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAppSession } from '@/providers/app-provider';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function WebhooksScreen() {
  const { profile, isSyncing, resetKey, sendTestNotification } = useAppSession();
  const colorScheme = (useColorScheme() ?? 'light') as 'light' | 'dark';
  const palette = Colors[colorScheme];

  const handleResetKey = () => {
    Alert.alert(
      '确认重置 key',
      '重置后旧链接会立即失效，所有已经发出去的 WebHook 地址都需要更新。',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '确认重置',
          style: 'destructive',
          onPress: () => {
            void resetKey();
          },
        },
      ]
    );
  };

  return (
    <ThemedView style={styles.screen}>
      <PanelGrid>
        <PanelCard>
          <ThemedText type="subtitle">当前 WebHook</ThemedText>
          <ThemedText style={styles.monoText}>
            {profile?.webhook.getUrl ?? '--'}
          </ThemedText>
        </PanelCard>

        <PanelCard>
          <ThemedText type="subtitle">GET 示例</ThemedText>
          <ThemedText style={styles.monoText}>
            {profile?.webhook.getUrl ?? '--'}
          </ThemedText>
        </PanelCard>

        <PanelCard>
          <ThemedText type="subtitle">POST 示例</ThemedText>
          <ThemedText style={styles.monoText}>{profile?.webhook.postUrl ?? '--'}</ThemedText>
          <ThemedText style={styles.monoText}>
            {`{\n  "title": "测试标题",\n  "content": "测试内容"\n}`}
          </ThemedText>
        </PanelCard>

        <PanelCard>
          <ThemedText type="subtitle">参数说明</ThemedText>
          {profile?.webhook.params.map((param) => (
            <View key={param.name} style={styles.paramRow}>
              <ThemedText style={styles.paramName}>{param.name}</ThemedText>
              <ThemedText style={{ color: palette.mutedText }}>
                {param.description}，{param.required ? '必填' : '可选'}，最大 {param.maxLength}{' '}
                字符
              </ThemedText>
            </View>
          ))}
        </PanelCard>

        <PanelCard>
          <ThemedText type="subtitle">安全提醒</ThemedText>
          {profile?.webhook.safetyTips.map((tip) => (
            <ThemedText key={tip} style={{ color: palette.mutedText }}>
              {`- ${tip}`}
            </ThemedText>
          ))}
        </PanelCard>

        <View style={styles.buttonGrid}>
          <ActionButton
            disabled={!profile}
            label="复制"
            tone="secondary"
            onPress={() => {
              if (!profile) {
                return;
              }

              void Clipboard.setStringAsync(profile.webhook.getUrl);
            }}
          />
          <ActionButton
            disabled={!profile}
            label="分享"
            onPress={() => {
              if (!profile) {
                return;
              }

              void Share.share({ message: profile.webhook.getUrl });
            }}
          />
          <ActionButton
            disabled={!profile || isSyncing}
            label="测试通知"
            onPress={() => {
              void sendTestNotification();
            }}
          />
          <ActionButton
            disabled={!profile || isSyncing}
            label="重置 key"
            tone="danger"
            onPress={handleResetKey}
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
  monoText: {
    fontFamily: 'monospace',
  },
  paramRow: {
    gap: 4,
  },
  paramName: {
    fontWeight: '700',
  },
  buttonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
});
