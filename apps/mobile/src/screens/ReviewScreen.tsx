import NetInfo from '@react-native-community/netinfo';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as Crypto from 'expo-crypto';
import React, { useRef, useState } from 'react';
import { AccessibilityInfo, Pressable, StyleSheet, Text, View } from 'react-native';
import { ActionBar, Card, HeaderCopy, Screen } from '../components/Layout';
import { Button } from '../components/Button';
import { StatusBanner } from '../components/Status';
import { useIntake } from '../context/IntakeContext';
import { ApiError, getSyncStatus, submitDraft } from '../data/api';
import { formatDate, formatMoney } from '../lib/format';
import { getResumeTarget, isUnresolvedConflict, prepareConflictRecovery } from '../lib/draftFlow';
import { colors, spacing } from '../theme';
import type { RootStackParamList } from '../types';

function Row({ label, value, important }: { label: string; value?: string | null; important?: boolean }) {
  if (!value) return null;
  return <View style={styles.row}><Text style={styles.rowLabel}>{label}</Text><Text style={[styles.rowValue, important && styles.important]}>{value}</Text></View>;
}

export function ReviewScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'Review'>) {
  const { current, patch } = useIntake(); const [sending, setSending] = useState(false); const [error, setError] = useState(''); const submitting = useRef(false);
  if (!current?.batch) return null;
  const unresolvedConflict = isUnresolvedConflict(current);
  const product = current.existingProduct ?? current.product;
  const send = async () => {
    if (submitting.current) return;
    submitting.current = true; setSending(true); setError('');
    const network = await NetInfo.fetch();
    if (network.isConnected === false) {
      await patch({ status: 'PENDING', errorMessage: undefined }); setSending(false); navigation.replace('Result', { offline: true }); return;
    }
    try {
      const syncing = await patch({ status: 'SYNCING' });
      await submitDraft(syncing);
      await patch({ status: 'SENT', errorMessage: undefined, serverFieldErrors: undefined });
      navigation.replace('Result', { offline: false });
    } catch (caught) {
      if (!(caught instanceof ApiError) || caught.status >= 500 || caught.status === 0) {
        try {
          const status = await getSyncStatus(current.clientRequestId);
          if (status.status === 'COMPLETED') { await patch({ status: 'SENT' }); navigation.replace('Result', { offline: false }); return; }
        } catch { /* Sem confirmação: fila local é o estado seguro. */ }
        await patch({ status: 'PENDING' }); navigation.replace('Result', { offline: true }); return;
      }
      setSending(false); submitting.current = false;
      if (caught.status === 401) {
        await patch({ status: 'PENDING', errorMessage: 'Sua sessão expirou. Entre novamente para continuar.' });
        navigation.navigate('SessionExpired', { returnTo: 'Review' }); return;
      }
      if (caught.status === 409 && ['BARCODE_ALREADY_REGISTERED', 'PRODUCT_CONFLICT', 'PRODUCT_ALREADY_EXISTS'].includes(caught.code ?? '')) {
        await patch({ status: 'NEEDS_REVIEW', reviewReason: 'PRODUCT_CONFLICT', errorMessage: caught.message });
        navigation.navigate('ProductConflict'); return;
      }
      if (caught.status === 409) {
        await patch({ status: 'NEEDS_REVIEW', reviewReason: 'CONFLICT', errorMessage: caught.message });
        setError(caught.message); return;
      }
      if (caught.fieldErrors && Object.keys(caught.fieldErrors).length) {
        const updated = await patch({ status: 'NEEDS_REVIEW', reviewReason: 'FIELD_ERRORS', errorMessage: caught.message, serverFieldErrors: caught.fieldErrors });
        void AccessibilityInfo.announceForAccessibility('Revise os campos indicados.');
        const target = getResumeTarget(updated);
        if (target !== 'Lookup' && target !== 'ProductConflict') navigation.navigate(target);
        return;
      }
      const message = caught.message || 'Revise os campos indicados.';
      await patch({ status: 'ERROR', errorMessage: message }); setError(message);
    }
  };
  const packageContent = current.product
    ? (current.product.packageContentValue ? `${current.product.packageContentValue} ${current.product.packageContentUnit}` : undefined)
    : (current.existingProduct?.packageContent ? `${current.existingProduct.packageContent.value} ${current.existingProduct.packageContent.unit}` : undefined);
  const recoverConflict = async () => {
    await patch(prepareConflictRecovery(Crypto.randomUUID()));
    setError('');
  };
  return <Screen footer={<ActionBar primaryLabel="Enviar cadastro" onPrimary={send} loading={sending} disabled={unresolvedConflict} secondaryLabel="Salvar como rascunho" onSecondary={async () => { await patch({ status: unresolvedConflict ? 'NEEDS_REVIEW' : 'DRAFT' }); navigation.popTo('Home'); }} />}>
    <HeaderCopy step={current.productMode === 'EXISTING' ? 'Etapa 2 de 2' : 'Etapa 3 de 3'} title="Revisar cadastro" description="Confira antes de enviar. O lote será associado a este produto." />
    {error ? <StatusBanner type="error" title="Revise os campos indicados." description={error} /> : null}
    {unresolvedConflict ? <Card>
      <StatusBanner type="error" title="Conflito no envio" description={current.errorMessage ?? 'A API recusou esta tentativa e não confirmou o cadastro.'} />
      <Text style={styles.conflictHelp}>Revise o resumo. Para enviar novamente, prepare uma nova tentativa com uma chave segura e independente.</Text>
      <Button label="Preparar nova tentativa" variant="secondary" onPress={() => void recoverConflict()} />
    </Card> : null}
    {sending ? <StatusBanner type="warning" title="Enviando cadastro…" description="Não feche o aplicativo até confirmarmos o envio." /> : null}
    <Card><View style={styles.sectionHeader}><Text accessibilityRole="header" style={styles.sectionTitle}>Produto</Text>{current.productMode === 'CREATE' ? <Pressable onPress={() => navigation.navigate('ProductForm')} accessibilityRole="button" style={styles.edit}><Text style={styles.editText}>Editar</Text></Pressable> : null}</View>
      <Row label="Código" value={current.barcode} /><Row label="Nome" value={product?.name} /><Row label="Marca" value={product?.brand} /><Row label="Categoria" value={product?.categoryName} /><Row label="Conteúdo" value={packageContent} /><Row label="Preço" value={current.product ? formatMoney(current.product.salePrice) : formatMoney(current.existingProduct?.salePrice.amount)} /><Row label="Promoção automática" value={current.product?.automaticPromotionEligible === 'true' || current.existingProduct?.automaticPromotionEligible ? 'Sim' : 'Não'} />
    </Card>
    <Card><View style={styles.sectionHeader}><Text accessibilityRole="header" style={styles.sectionTitle}>Lote</Text><Pressable onPress={() => navigation.navigate('BatchForm')} accessibilityRole="button" style={styles.edit}><Text style={styles.editText}>Editar</Text></Pressable></View>
      <Row label="Validade" value={formatDate(current.batch.expiryDate)} important /><Row label="Número do lote" value={current.batch.batchNumber} /><Row label="Quantidade" value={current.batch.quantity} /><Row label="Localização" value={current.batch.locationName} /><Row label="Entrada" value={formatDate(current.batch.entryDate)} /><Row label="Custo unitário" value={current.batch.unitCost ? formatMoney(current.batch.unitCost) : undefined} /><Row label="Observação" value={current.batch.observation} />
    </Card>
  </Screen>;
}

const styles = StyleSheet.create({
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }, sectionTitle: { color: colors.text, fontSize: 20, fontWeight: '800' }, edit: { minWidth: 48, minHeight: 48, paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center' }, editText: { color: colors.brand, fontSize: 15, fontWeight: '800' },
  row: { gap: 2, paddingVertical: 5 }, rowLabel: { color: colors.muted, fontSize: 13, fontWeight: '600' }, rowValue: { color: colors.text, fontSize: 16, fontWeight: '600' }, important: { fontSize: 24, fontWeight: '900', color: colors.brandDark },
  conflictHelp: { color: colors.text, fontSize: 15, lineHeight: 22 },
});
