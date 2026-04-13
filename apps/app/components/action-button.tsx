import {
  Pressable,
  StyleSheet,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ThemedText } from './themed-text';

type ActionButtonProps = Omit<PressableProps, 'style'> & {
  label: string;
  tone?: 'primary' | 'secondary' | 'danger';
  style?: StyleProp<ViewStyle>;
};

export function ActionButton({
  label,
  style,
  tone = 'primary',
  disabled,
  ...props
}: ActionButtonProps) {
  const colorScheme = (useColorScheme() ?? 'light') as 'light' | 'dark';
  const palette = Colors[colorScheme];

  const toneStyle =
    tone === 'secondary'
      ? {
          backgroundColor: palette.card,
          borderColor: palette.border,
          textColor: palette.text,
        }
      : tone === 'danger'
        ? {
            backgroundColor: palette.danger,
            borderColor: palette.danger,
            textColor: '#ffffff',
          }
        : {
            backgroundColor: palette.tint,
            borderColor: palette.tint,
            textColor: '#ffffff',
          };

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: toneStyle.backgroundColor,
          borderColor: toneStyle.borderColor,
          opacity: disabled ? 0.55 : pressed ? 0.85 : 1,
        },
        style,
      ]}
      {...props}>
      <ThemedText style={[styles.label, { color: toneStyle.textColor }]}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  label: {
    fontWeight: '700',
  },
});
