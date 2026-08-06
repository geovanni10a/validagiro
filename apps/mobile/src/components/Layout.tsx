import React, { type ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing } from '../theme';
import { Button } from './Button';

export function Screen({ children, scroll = true, footer }: React.PropsWithChildren<{ scroll?: boolean; footer?: ReactNode }>) {
  const content = <View style={styles.content}>{children}</View>;
  return (
    <SafeAreaView style={styles.safe} edges={['bottom', 'left', 'right']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'ios' ? 44 : 0}>
        {scroll ? <ScrollView style={styles.flex} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">{content}</ScrollView> : content}
        {footer ? <View style={styles.fixedFooter}>{footer}</View> : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function HeaderCopy({ title, description, step }: { title: string; description?: string; step?: string }) {
  return <View style={styles.header}>
    {step ? <Text style={styles.step}>{step}</Text> : null}
    <Text accessibilityRole="header" style={styles.title}>{title}</Text>
    {description ? <Text style={styles.description}>{description}</Text> : null}
  </View>;
}

export function ActionBar({
  primaryLabel, onPrimary, secondaryLabel, onSecondary, loading, disabled,
}: { primaryLabel: string; onPrimary(): void; secondaryLabel?: string; onSecondary?(): void; loading?: boolean; disabled?: boolean }) {
  return <View style={styles.actions}>
    <Button label={primaryLabel} onPress={onPrimary} loading={loading} disabled={disabled} />
    {secondaryLabel && onSecondary ? <Button label={secondaryLabel} onPress={onSecondary} variant="text" /> : null}
  </View>;
}

export function Card({ children }: React.PropsWithChildren) { return <View style={styles.card}>{children}</View>; }

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background }, flex: { flex: 1 },
  scroll: { flexGrow: 1, alignItems: 'center' },
  content: { width: '100%', maxWidth: 680, flexGrow: 1, padding: spacing.lg, gap: spacing.lg },
  header: { gap: spacing.sm, marginBottom: spacing.sm },
  step: { color: colors.brand, fontSize: 14, fontWeight: '700' },
  title: { color: colors.text, fontSize: 28, lineHeight: 34, fontWeight: '800' },
  description: { color: colors.muted, fontSize: 16, lineHeight: 24 },
  actions: { width: '100%', maxWidth: 680, alignSelf: 'center', gap: spacing.sm },
  fixedFooter: { flexShrink: 0, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: '#E2E8F0', paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm },
  card: { backgroundColor: colors.surface, borderRadius: 16, padding: spacing.lg, borderWidth: 1, borderColor: '#E2E8F0', gap: spacing.sm },
});
