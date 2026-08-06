import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import React, { forwardRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { formatDate } from '../lib/format';
import { colors, spacing } from '../theme';

export const DateField = forwardRef<View, { label: string; value: string; onChange(value: string): void; error?: string }>(function DateField({ label, value, onChange, error }, ref) {
  const [open, setOpen] = useState(false);
  const date = value ? new Date(`${value}T12:00:00`) : new Date();
  const choose = (_event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') setOpen(false);
    if (selected) onChange(selected.toISOString().slice(0, 10));
  };
  return <View style={styles.group}>
    <Text style={styles.label}>{label} (obrigatório)</Text>
    <Pressable ref={ref} accessibilityRole="button" accessibilityLabel={`${label}, ${formatDate(value) || 'não informada'}`} accessibilityHint={error} onPress={() => setOpen(true)} style={[styles.field, error && styles.fieldError]}>
      <Text style={[styles.value, !value && styles.placeholder]}>{formatDate(value) || 'Selecionar data'}</Text>
    </Pressable>
    {error ? <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text> : null}
    {open ? <DateTimePicker value={date} mode="date" onChange={choose} display={Platform.OS === 'ios' ? 'inline' : 'default'} /> : null}
  </View>;
});

const styles = StyleSheet.create({
  group: { gap: spacing.xs }, label: { color: colors.text, fontSize: 15, fontWeight: '700' },
  field: { minHeight: 50, justifyContent: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 14, backgroundColor: colors.surface },
  fieldError: { borderColor: colors.danger, borderWidth: 2 }, value: { color: colors.text, fontSize: 16 }, placeholder: { color: '#788596' },
  error: { color: colors.danger, fontSize: 14, fontWeight: '600' },
});
