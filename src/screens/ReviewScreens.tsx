import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button, Card, HeaderCopy, Screen } from '../components/ui';
import { useInventory } from '../context/InventoryContext';
import type { RootStackParamList } from '../navigation/types';
import { colors } from '../theme';
import { formatDate, formatMoney, unitLabel } from '../utils';

export function ReviewScreen({ navigation, route }: NativeStackScreenProps<RootStackParamList, 'Review'>) {
  const { saveIntake, deleteDraft } = useInventory();
  const { product, batch, isNew, draftId } = route.params;
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const save = async () => {
    try {
      setSaving(true);
      setError('');
      await saveIntake(product, batch);
      if (draftId) await deleteDraft(draftId);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.replace('Success', { product, batch });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível salvar o cadastro.');
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen>
      <HeaderCopy step={isNew ? 'Etapa 3 de 3' : 'Etapa 2 de 2'} title="Revisar cadastro" description="Confira os dados antes de salvar." />
      {error ? <Card style={styles.error}><Text style={styles.errorTitle}>Não foi possível salvar</Text><Text style={styles.errorText}>{error}</Text></Card> : null}
      <Card>
        <Section icon="cube-outline" title="Produto" onEdit={() => navigation.goBack()} />
        <Row label="Código" value={product.barcode} />
        <Row label="Nome" value={product.name} />
        <Row label="Marca" value={product.brand || 'Não informada'} />
        <Row label="Categoria" value={product.categoryName} />
        <Row label="Unidade" value={unitLabel(product.unitOfMeasure)} />
        {product.packageContentValue ? <Row label="Conteúdo" value={`${product.packageContentValue} ${product.packageContentUnit || ''}`.trim()} /> : null}
        <Row label="Preço" value={formatMoney(product.salePrice)} important />
      </Card>
      <Card>
        <Section icon="layers-outline" title="Lote" onEdit={() => navigation.goBack()} />
        <Row label="Validade" value={formatDate(batch.expiryDate)} important />
        <Row label="Número do lote" value={batch.batchNumber || 'Não informado'} />
        <Row label="Quantidade" value={`${batch.quantity} unidades`} />
        <Row label="Localização" value={batch.locationName} />
        <Row label="Entrada" value={formatDate(batch.entryDate)} />
        <Row label="Custo unitário" value={formatMoney(batch.unitCost)} />
        {batch.observation ? <Row label="Observação" value={batch.observation} /> : null}
      </Card>
      <Button label={saving ? 'Salvando cadastro…' : 'Salvar cadastro'} icon="checkmark-circle" loading={saving} onPress={() => void save()} />
      <Text style={styles.note}>Aguarde a confirmação antes de iniciar outro cadastro.</Text>
    </Screen>
  );
}

export function SuccessScreen({ navigation, route }: NativeStackScreenProps<RootStackParamList, 'Success'>) {
  const { product, batch } = route.params;
  return (
    <Screen style={styles.successPage}>
      <View style={styles.successIcon}><Ionicons name="checkmark" size={52} color="#fff" /></View>
      <HeaderCopy title="Cadastro salvo" description="O produto e este lote foram registrados com sucesso." />
      <Card style={styles.fullWidth}>
        <Text style={styles.productName}>{product.name}</Text>
        <Text style={styles.summary}>{batch.quantity} unidades · validade {formatDate(batch.expiryDate)}</Text>
        <Text style={styles.summary}><Ionicons name="location-outline" size={15} /> {batch.locationName}</Text>
      </Card>
      <View style={styles.fullWidth}>
        <Button label="Ler próximo item" icon="barcode-outline" onPress={() => navigation.replace('Scanner')} />
        <Button label="Voltar ao início" variant="secondary" icon="home-outline" onPress={() => navigation.popToTop()} style={styles.topGap} />
      </View>
      <Text style={styles.note}>Leia o mesmo código novamente para registrar um novo lote.</Text>
    </Screen>
  );
}

function Section({ icon, title, onEdit }: { icon: React.ComponentProps<typeof Ionicons>['name']; title: string; onEdit: () => void }) {
  return <View style={styles.section}><View style={styles.sectionTitleWrap}><Ionicons name={icon} size={22} color={colors.brand} /><Text style={styles.sectionTitle}>{title}</Text></View><Button label="Editar" variant="text" onPress={onEdit} style={styles.editButton} /></View>;
}

function Row({ label, value, important }: { label: string; value: string; important?: boolean }) {
  return <View style={styles.row}><Text style={styles.rowLabel}>{label}</Text><Text style={[styles.rowValue, important && styles.important]}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  error: { backgroundColor: colors.dangerBg },
  errorTitle: { color: colors.danger, fontWeight: '900', fontSize: 17 },
  errorText: { color: colors.danger, lineHeight: 20 },
  section: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: 8 },
  sectionTitleWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: { color: colors.text, fontSize: 19, fontWeight: '900' },
  editButton: { minHeight: 38, paddingVertical: 4 },
  row: { gap: 2, paddingVertical: 4 },
  rowLabel: { color: colors.muted, fontSize: 12, fontWeight: '700' },
  rowValue: { color: colors.text, fontSize: 16, lineHeight: 21, fontWeight: '700' },
  important: { color: colors.brandDark, fontSize: 22, fontWeight: '900' },
  note: { color: colors.muted, fontSize: 13, lineHeight: 19, textAlign: 'center' },
  successPage: { alignItems: 'center', justifyContent: 'center' },
  successIcon: { width: 94, height: 94, borderRadius: 47, backgroundColor: colors.success, alignItems: 'center', justifyContent: 'center' },
  fullWidth: { width: '100%' },
  productName: { color: colors.text, fontSize: 20, fontWeight: '900' },
  summary: { color: colors.muted, fontSize: 15, lineHeight: 22 },
  topGap: { marginTop: 10 },
});
