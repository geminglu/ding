import { StyleSheet, View, type ViewProps } from 'react-native';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ThemedView } from './themed-view';

export function PanelCard({ style, ...props }: ViewProps) {
  const colorScheme = (useColorScheme() ?? 'light') as 'light' | 'dark';
  const palette = Colors[colorScheme];

  return (
    <ThemedView
      style={[
        styles.card,
        {
          backgroundColor: palette.card,
          borderColor: palette.border,
        },
        style,
      ]}
      {...props}
    />
  );
}

export function PanelGrid({ style, ...props }: ViewProps) {
  return <View style={[styles.grid, style]} {...props} />;
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    gap: 10,
  },
  grid: {
    gap: 16,
  },
});
