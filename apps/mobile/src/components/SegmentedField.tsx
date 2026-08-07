import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '../theme';
import { Button } from './Button';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  disabled?: boolean;
  accessibilityHint?: string;
}

interface Props<T extends string> {
  label: string;
  value: T;
  options: Array<SegmentedOption<T>>;
  onChange(value: T): void;
  error?: string;
}

function SegmentedFieldInner<T extends string>(
  { label, value, options, onChange, error }: Props<T>,
  ref: React.ForwardedRef<View>,
) {
  const firstOption = useRef<View | null>(null);
  useImperativeHandle(ref, () => firstOption.current as View);
  return <View accessibilityLabel={label} accessibilityHint={error} style={styles.group}>
    <Text style={styles.label}>{label}</Text>
    <View accessibilityRole="radiogroup" style={[styles.options, error && styles.optionsError]}>
      {options.map((option, index) => <Button
        key={option.value}
        ref={index === 0 ? firstOption : undefined}
        label={option.label}
        accessibilityRole="radio"
        accessibilityState={{ checked: value === option.value, disabled: option.disabled }}
        accessibilityHint={option.accessibilityHint}
        disabled={option.disabled}
        variant={value === option.value ? 'primary' : 'secondary'}
        onPress={() => onChange(option.value)}
        style={styles.option}
      />)}
    </View>
    {error ? <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.error}>{error}</Text> : null}
  </View>;
}

export const SegmentedField = forwardRef(SegmentedFieldInner) as <T extends string>(
  props: Props<T> & { ref?: React.ForwardedRef<View> },
) => React.ReactElement;

const styles = StyleSheet.create({
  group: { gap: spacing.xs },
  label: { color: colors.text, fontSize: 15, fontWeight: '700' },
  options: { flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap', borderRadius: 12 },
  optionsError: { borderWidth: 2, borderColor: colors.danger, padding: spacing.xs },
  option: { flexGrow: 1, minWidth: 72 },
  error: { color: colors.danger, fontSize: 14, fontWeight: '600' },
});
