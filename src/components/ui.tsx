import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';
import { colors, shadow, spacing } from '../theme';
import type { ExpiryLevel } from '../types';
import { expiryMeta, formatDate } from '../utils';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

export function Screen({ children, scroll = true, style }: React.PropsWithChildren<{ scroll?: boolean; style?: StyleProp<ViewStyle> }>) {
  const content = <View style={[styles.screenContent, style]}>{children}</View>;
  return (
    <SafeAreaView style={styles.safe}>
      {scroll ? <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">{content}</ScrollView> : content}
    </SafeAreaView>
  );
}

export function HeaderCopy({ step, title, description }: { step?: string; title: string; description?: string }) {
  return (
    <View style={styles.headerCopy}>
      {step ? <Text style={styles.step}>{step}</Text> : null}
      <Text accessibilityRole="header" style={styles.pageTitle}>{title}</Text>
      {description ? <Text style={styles.pageDescription}>{description}</Text> : null}
    </View>
  );
}

export function Button({ label, onPress, variant = 'primary', icon, disabled, loading, style }: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'text' | 'danger';
  icon?: IconName;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [styles.button, styles[`${variant}Button`], pressed && styles.pressed, (disabled || loading) && styles.disabled, style]}
    >
      {loading ? <ActivityIndicator color={variant === 'primary' || variant === 'danger' ? '#fff' : colors.brand} /> : icon ? <Ionicons name={icon} size={20} color={variant === 'primary' || variant === 'danger' ? '#fff' : colors.brand} /> : null}
      <Text style={[styles.buttonLabel, variant !== 'primary' && variant !== 'danger' && styles.secondaryButtonLabel]}>{label}</Text>
    </Pressable>
  );
}

export function Card({ children, style, onPress }: React.PropsWithChildren<{ style?: StyleProp<ViewStyle>; onPress?: () => void }>) {
  if (onPress) return <Pressable onPress={onPress} style={({ pressed }) => [styles.card, style, pressed && styles.pressed]}>{children}</Pressable>;
  return <View style={[styles.card, style]}>{children}</View>;
}

export function FormField({ label, required, error, helper, ...props }: TextInputProps & { label: string; required?: boolean; error?: string; helper?: string }) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}{required ? <Text style={styles.required}> *</Text> : null}</Text>
      <TextInput
        placeholderTextColor="#8B98A7"
        {...props}
        style={[styles.input, props.multiline && styles.multiline, error && styles.inputError, props.style]}
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : helper ? <Text style={styles.helper}>{helper}</Text> : null}
    </View>
  );
}

export type SelectOption = { label: string; value: string; description?: string };

export function SelectField({ label, value, options, onChange, required, placeholder = 'Selecionar', error }: {
  label: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  required?: boolean;
  placeholder?: string;
  error?: string;
}) {
  const [visible, setVisible] = useState(false);
  const selected = options.find((option) => option.value === value);
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}{required ? <Text style={styles.required}> *</Text> : null}</Text>
      <Pressable style={[styles.input, styles.selectInput, error && styles.inputError]} onPress={() => setVisible(true)}>
        <Text style={selected ? styles.selectValue : styles.placeholder}>{selected?.label ?? placeholder}</Text>
        <Ionicons name="chevron-down" size={20} color={colors.muted} />
      </Pressable>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      <Modal transparent visible={visible} animationType="fade" onRequestClose={() => setVisible(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setVisible(false)}>
          <Pressable style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{label}</Text>
              <Pressable accessibilityLabel="Fechar" onPress={() => setVisible(false)} hitSlop={12}><Ionicons name="close" size={26} color={colors.text} /></Pressable>
            </View>
            {options.map((option) => (
              <Pressable key={option.value} style={[styles.option, option.value === value && styles.optionSelected]} onPress={() => { onChange(option.value); setVisible(false); }}>
                <View style={styles.optionCopy}>
                  <Text style={styles.optionLabel}>{option.label}</Text>
                  {option.description ? <Text style={styles.optionDescription}>{option.description}</Text> : null}
                </View>
                {option.value === value ? <Ionicons name="checkmark-circle" size={23} color={colors.brand} /> : null}
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

export function DateField({ label, value, onChange, required, error, maximumDate }: {
  label: string;
  value: string;
  onChange: (iso: string) => void;
  required?: boolean;
  error?: string;
  maximumDate?: Date;
}) {
  const [visible, setVisible] = useState(false);
  const date = useMemo(() => value ? new Date(`${value}T12:00:00`) : new Date(), [value]);
  const changed = (_event: DateTimePickerEvent, next?: Date) => {
    if (Platform.OS === 'android') setVisible(false);
    if (next) {
      const local = new Date(next.getTime() - next.getTimezoneOffset() * 60_000);
      onChange(local.toISOString().slice(0, 10));
    }
  };
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}{required ? <Text style={styles.required}> *</Text> : null}</Text>
      <Pressable style={[styles.input, styles.selectInput, error && styles.inputError]} onPress={() => setVisible(true)}>
        <Text style={value ? styles.selectValue : styles.placeholder}>{value ? formatDate(value) : 'Selecionar data'}</Text>
        <Ionicons name="calendar-outline" size={20} color={colors.brand} />
      </Pressable>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      {visible ? (
        <View>
          <DateTimePicker value={date} mode="date" display="default" onChange={changed} maximumDate={maximumDate} />
          {Platform.OS === 'ios' ? <Pressable onPress={() => setVisible(false)} style={styles.dateDone}><Text style={styles.dateDoneText}>Concluir</Text></Pressable> : null}
        </View>
      ) : null}
    </View>
  );
}

export function StatusBadge({ level, compact = false }: { level: ExpiryLevel; compact?: boolean }) {
  const meta = expiryMeta[level];
  return (
    <View style={[styles.badge, { backgroundColor: meta.background }]}>
      <View style={[styles.badgeDot, { backgroundColor: meta.color }]} />
      <Text style={[styles.badgeText, { color: meta.color }]}>{meta.label}{compact ? '' : ` · ${meta.short}`}</Text>
    </View>
  );
}

export function EmptyState({ icon, title, description, action }: { icon: IconName; title: string; description: string; action?: React.ReactNode }) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}><Ionicons name={icon} size={34} color={colors.brand} /></View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyText}>{description}</Text>
      {action}
    </View>
  );
}

export function SectionTitle({ children, action }: React.PropsWithChildren<{ action?: React.ReactNode }>) {
  return <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>{children}</Text>{action}</View>;
}

export function SearchField({ value, onChangeText, placeholder = 'Buscar produto' }: { value: string; onChangeText: (value: string) => void; placeholder?: string }) {
  return (
    <View style={styles.search}>
      <Ionicons name="search" size={20} color={colors.muted} />
      <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor="#8B98A7" style={styles.searchInput} />
      {value ? <Pressable onPress={() => onChangeText('')}><Ionicons name="close-circle" size={20} color={colors.muted} /></Pressable> : null}
    </View>
  );
}

export function LoadingView() {
  return <View style={styles.loading}><ActivityIndicator size="large" color={colors.brand} /><Text style={styles.helper}>Carregando dados…</Text></View>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { flexGrow: 1 },
  screenContent: { flex: 1, padding: spacing.lg, gap: spacing.lg, backgroundColor: colors.background },
  headerCopy: { gap: 4, marginBottom: 4 },
  step: { color: colors.brand, fontSize: 14, fontWeight: '800' },
  pageTitle: { color: colors.text, fontSize: 28, lineHeight: 34, fontWeight: '900' },
  pageDescription: { color: colors.muted, fontSize: 16, lineHeight: 23 },
  button: { minHeight: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18, paddingVertical: 12, flexDirection: 'row', gap: 9 },
  primaryButton: { backgroundColor: colors.brand },
  secondaryButton: { backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.brand },
  textButton: { backgroundColor: 'transparent' },
  dangerButton: { backgroundColor: colors.danger },
  buttonLabel: { color: '#fff', fontSize: 16, fontWeight: '800', textAlign: 'center' },
  secondaryButtonLabel: { color: colors.brand },
  pressed: { opacity: 0.72 },
  disabled: { opacity: 0.45 },
  card: { backgroundColor: colors.surface, borderRadius: 18, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, gap: spacing.md, ...shadow },
  fieldWrap: { gap: 6 },
  fieldLabel: { color: colors.text, fontSize: 15, fontWeight: '800' },
  required: { color: colors.danger },
  input: { minHeight: 52, borderRadius: 12, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface, color: colors.text, paddingHorizontal: 14, fontSize: 16 },
  multiline: { minHeight: 112, paddingTop: 14, textAlignVertical: 'top' },
  inputError: { borderColor: colors.danger },
  errorText: { color: colors.danger, fontSize: 13, fontWeight: '600' },
  helper: { color: colors.muted, fontSize: 13, lineHeight: 18 },
  selectInput: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  selectValue: { color: colors.text, fontSize: 16 },
  placeholder: { color: '#8B98A7', fontSize: 16 },
  modalOverlay: { flex: 1, backgroundColor: colors.overlay, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  modalCard: { width: '100%', maxWidth: 520, borderRadius: 20, backgroundColor: colors.surface, padding: spacing.lg, gap: 8 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  modalTitle: { fontSize: 21, fontWeight: '900', color: colors.text },
  option: { minHeight: 56, borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  optionSelected: { backgroundColor: colors.brandSoft },
  optionCopy: { flex: 1, gap: 2 },
  optionLabel: { color: colors.text, fontWeight: '700', fontSize: 16 },
  optionDescription: { color: colors.muted, fontSize: 13 },
  dateDone: { alignSelf: 'flex-end', paddingVertical: 8, paddingHorizontal: 12 },
  dateDoneText: { color: colors.brand, fontSize: 15, fontWeight: '800' },
  badge: { alignSelf: 'flex-start', borderRadius: 999, paddingVertical: 6, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 6 },
  badgeDot: { width: 8, height: 8, borderRadius: 4 },
  badgeText: { fontSize: 12, fontWeight: '900' },
  empty: { flex: 1, minHeight: 320, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.md },
  emptyIcon: { width: 70, height: 70, borderRadius: 35, backgroundColor: colors.brandSoft, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 20, fontWeight: '900', color: colors.text, textAlign: 'center' },
  emptyText: { fontSize: 15, lineHeight: 22, color: colors.muted, textAlign: 'center', maxWidth: 330 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { color: colors.text, fontSize: 19, fontWeight: '900' },
  search: { minHeight: 50, borderRadius: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  searchInput: { flex: 1, color: colors.text, fontSize: 16 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: colors.background },
});
