import * as WebBrowser from 'expo-web-browser';
import { Linking, StyleSheet, View } from 'react-native';
import Constants from 'expo-constants';

import { ActionButton } from '@/components/action-button';
import { PanelCard, PanelGrid } from '@/components/panel-card';
import { appConfig } from '@/constants/app-config';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function AboutScreen() {
  return (
    <ThemedView style={styles.screen}>
      <PanelGrid>
        <PanelCard>
          <ThemedText type="subtitle">版本信息</ThemedText>
          <ThemedText>当前版本：{Constants.expoConfig?.version ?? '1.0.0'}</ThemedText>
        </PanelCard>

        <PanelCard>
          <ThemedText type="subtitle">协议与隐私</ThemedText>
          <View style={styles.buttonGrid}>
            <ActionButton
              label="隐私政策"
              tone="secondary"
              onPress={() => {
                void WebBrowser.openBrowserAsync(appConfig.privacyUrl);
              }}
            />
            <ActionButton
              label="用户协议"
              tone="secondary"
              onPress={() => {
                void WebBrowser.openBrowserAsync(appConfig.termsUrl);
              }}
            />
          </View>
        </PanelCard>

        <PanelCard>
          <ThemedText type="subtitle">联系方式与反馈</ThemedText>
          <ThemedText>{appConfig.supportEmail}</ThemedText>
          <View style={styles.buttonGrid}>
            <ActionButton
              label="发送邮件"
              tone="secondary"
              onPress={() => {
                void Linking.openURL(`mailto:${appConfig.supportEmail}`);
              }}
            />
            <ActionButton
              label="反馈入口"
              onPress={() => {
                void WebBrowser.openBrowserAsync(appConfig.feedbackUrl);
              }}
            />
          </View>
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
  buttonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
});
