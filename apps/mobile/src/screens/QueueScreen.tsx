import NetInfo from '@react-native-community/netinfo';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { Button } from '../components/Button';
import { Card, HeaderCopy, Screen } from '../components/Layout';
import { SyncStatusChip } from '../components/Status';
import { useIntake } from '../context/IntakeContext';
import { reconcileDraft } from '../data/sync';
import { getResumeTarget } from '../lib/draftFlow';
import { formatDate, formatUpdatedAt } from '../lib/format';
import { colors, spacing } from '../theme';
import type { IntakeDraft, RootStackParamList } from '../types';

export function QueueScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'Queue'>) {
  const { drafts, saveDraft, remove, resume } = useIntake(); const [busyId, setBusyId] = useState('');
  const visible = drafts.filter((draft) => draft.status !== 'SENT');
  const retry = async (draft: IntakeDraft) => {
    setBusyId(draft.id);
    try {
      const network = await NetInfo.fetch();
      if (network.isConnected === false) { Alert.alert('Sem conexão', 'Conecte-se para enviar este cadastro.'); return; }
      const result = await reconcileDraft(draft, saveDraft);
      if (result === 'SESSION_EXPIRED') navigation.navigate('SessionExpired', { returnTo: 'Queue' });
    } catch {
      await saveDraft({ ...draft, status: 'PENDING', updatedAt: new Date().toISOString() });
    } finally { setBusyId(''); }
  };
  const continueDraft = (draft: IntakeDraft) => {
    resume(draft);
    const target = getResumeTarget(draft);
    if (target === 'Lookup') navigation.navigate('Lookup', { barcode: draft.barcode, format: draft.barcodeFormat, source: draft.barcodeSource, draftId: draft.id });
    else navigation.navigate(target);
  };
  const actionLabel = (draft: IntakeDraft) => {
    if (draft.status === 'NEEDS_REVIEW') return draft.reviewReason === 'PRODUCT_CONFLICT' ? 'Continuar com produto encontrado' : 'Corrigir cadastro';
    if (draft.status === 'DRAFT') return 'Continuar';
    if (draft.status === 'ERROR') return 'Tentar novamente';
    return 'Enviar agora';
  };
  const confirmDelete = (draft: IntakeDraft) => Alert.alert('Excluir rascunho?', `${draft.existingProduct?.name ?? draft.product?.name ?? 'Produto novo'} · ${draft.barcode}`, [
    { text: 'Cancelar', style: 'cancel' }, { text: 'Excluir', style: 'destructive', onPress: () => void remove(draft.id) },
  ]);
  return <Screen>
    <HeaderCopy title="Rascunhos e pendências" description="Registros salvos neste aparelho." />
    {!visible.length ? <View style={styles.empty}><Text style={styles.emptyTitle}>Tudo sincronizado</Text><Text style={styles.emptyText}>Não há rascunhos ou envios pendentes.</Text><Button label="Registrar produto" onPress={() => navigation.navigate('CameraPermission')} /></View> : visible.map((draft) => <Card key={draft.id}>
      <SyncStatusChip status={draft.status} />
      <Text style={styles.name}>{draft.existingProduct?.name ?? draft.product?.name ?? 'Produto novo'}</Text>
      <Text style={styles.barcode}>{draft.barcode}</Text>
      {draft.batch ? <Text style={styles.details}>{draft.batch.quantity} un. · validade {formatDate(draft.batch.expiryDate)}</Text> : null}
      <Text style={styles.updated}>Atualizado em {formatUpdatedAt(draft.updatedAt)}</Text>
      {draft.errorMessage ? <Text accessibilityRole="alert" style={styles.error}>{draft.errorMessage}</Text> : null}
      <Button loading={busyId === draft.id} label={actionLabel(draft)} onPress={() => draft.status === 'DRAFT' || draft.status === 'NEEDS_REVIEW' ? continueDraft(draft) : void retry(draft)} />
      {draft.status === 'DRAFT' ? <Button label="Excluir rascunho" variant="danger" onPress={() => confirmDelete(draft)} /> : null}
    </Card>)}
  </Screen>;
}

const styles = StyleSheet.create({
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md }, emptyTitle: { color: colors.text, fontSize: 22, fontWeight: '800' }, emptyText: { color: colors.muted, fontSize: 16, textAlign: 'center' },
  name: { color: colors.text, fontSize: 18, fontWeight: '800' }, barcode: { color: colors.text, fontSize: 16, letterSpacing: 1.2, fontVariant: ['tabular-nums'] }, details: { color: colors.muted, fontSize: 15 }, updated: { color: colors.muted, fontSize: 13 }, error: { color: colors.danger, fontSize: 14, fontWeight: '700' },
});
