import React, { forwardRef } from 'react';
import { StyleSheet, Text, TextInput, type TextInputProps, View } from 'react-native';
import { colors, spacing } from '../theme';

export const FormField = forwardRef<TextInput, TextInputProps & { label: string; required?: boolean; help?: string; error?: string }>(function FormField({
  label, required, help, error, multiline, ...props
}, ref) {
  const errorId = error ? `${label}-error` : undefined;
  return <View style={styles.group}>
    <Text style={styles.label}>{label}{required ? ' (obrigatório)' : ''}</Text>
    <TextInput
      accessibilityLabel={`${label}${required ? ', obrigatório' : ''}`}
      accessibilityHint={error ?? help}
      ref={ref}
      style={[styles.input, multiline && styles.multiline, error && styles.errorInput]}
      placeholderTextColor="#788596"
      multiline={multiline}
      textAlignVertical={multiline ? 'top' : 'center'}
      {...props}
    />
    {help && !error ? <Text style={styles.help}>{help}</Text> : null}
    {error ? <Text nativeID={errorId} accessibilityLiveRegion="polite" style={styles.error}>{error}</Text> : null}
  </View>;
});

const styles = StyleSheet.create({
  group: { gap: spacing.xs }, label: { color: colors.text, fontSize: 15, fontWeight: '700' },
  input: { minHeight: 50, borderWidth: 1, borderColor: colors.border, borderRadius: 10, backgroundColor: colors.surface, color: colors.text, fontSize: 16, paddingHorizontal: 14 },
  multiline: { minHeight: 100, paddingTop: 12 }, errorInput: { borderColor: colors.danger, borderWidth: 2 },
  help: { color: colors.muted, fontSize: 14 }, error: { color: colors.danger, fontSize: 14, fontWeight: '600' },
});
