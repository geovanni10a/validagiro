import React, { forwardRef } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, type PressableProps, type View } from 'react-native';
import { colors } from '../theme';

interface Props extends PressableProps {
  label: string;
  variant?: 'primary' | 'secondary' | 'danger' | 'text';
  loading?: boolean;
}

export const Button = forwardRef<View, Props>(function Button({ label, variant = 'primary', loading, disabled, style, ...props }, ref) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      ref={ref}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base, styles[variant], isDisabled && styles.disabled, pressed && styles.pressed,
        typeof style === 'function' ? style({ pressed }) : style,
      ]}
      {...props}
    >
      {loading ? <ActivityIndicator color={variant === 'primary' ? '#fff' : colors.brand} /> : (
        <Text style={[styles.label, variant !== 'primary' && styles.secondaryLabel, variant === 'danger' && styles.dangerLabel]}>
          {label}
        </Text>
      )}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  base: { minHeight: 52, borderRadius: 12, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18, paddingVertical: 12 },
  primary: { backgroundColor: colors.brand },
  secondary: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.brand },
  danger: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.danger },
  text: { backgroundColor: 'transparent' },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.82 },
  label: { color: '#fff', fontSize: 16, fontWeight: '700', textAlign: 'center' },
  secondaryLabel: { color: colors.brand },
  dangerLabel: { color: colors.danger },
});
