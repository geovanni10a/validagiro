import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '../theme';
import type { DraftStatus } from '../types';

export function StatusBanner({ type, title, description }: { type: 'offline' | 'error' | 'warning' | 'success'; title: string; description?: string }) {
  const icon = type === 'success' ? '✓' : type === 'offline' ? '☁' : type === 'error' ? '!' : 'i';
  return <View accessibilityRole="alert" style={[styles.banner, styles[type]]}>
    <Text style={styles.icon}>{icon}</Text><View style={styles.copy}><Text style={styles.title}>{title}</Text>{description ? <Text style={styles.description}>{description}</Text> : null}</View>
  </View>;
}

const statusLabels: Record<DraftStatus, string> = {
  DRAFT: 'Rascunho', PENDING: 'Aguardando envio', SYNCING: 'Sincronizando', ERROR: 'Erro de sincronização', SENT: 'Enviado',
  NEEDS_REVIEW: 'Requer correção',
};
export function SyncStatusChip({ status }: { status: DraftStatus }) {
  return <View style={styles.chip}><Text style={styles.chipText}>● {statusLabels[status]}</Text></View>;
}

const styles = StyleSheet.create({
  banner: { flexDirection: 'row', gap: spacing.md, padding: spacing.lg, borderRadius: 12, borderWidth: 1 },
  offline: { backgroundColor: colors.warningBg, borderColor: '#E6A23C' }, warning: { backgroundColor: colors.warningBg, borderColor: '#E6A23C' },
  error: { backgroundColor: colors.dangerBg, borderColor: '#E58A84' }, success: { backgroundColor: colors.successBg, borderColor: '#64B589' },
  icon: { fontSize: 20, fontWeight: '900', color: colors.text }, copy: { flex: 1, gap: 2 },
  title: { color: colors.text, fontSize: 15, fontWeight: '800' }, description: { color: colors.text, fontSize: 14, lineHeight: 20 },
  chip: { alignSelf: 'flex-start', borderRadius: 999, backgroundColor: '#EEF3FA', paddingVertical: 5, paddingHorizontal: 9 },
  chipText: { color: colors.brandDark, fontSize: 13, fontWeight: '700' },
});
