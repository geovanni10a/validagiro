import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { Button, Card, DateField, EmptyState, FormField, HeaderCopy, Screen, SelectField, StatusBadge } from '../components/ui';
import { useInventory } from '../context/InventoryContext';
import type { RootStackParamList } from '../navigation/types';
import { colors } from '../theme';
import { expiryLevel, formatDate, formatMoney, parseMoney, unitLabel } from '../utils';

export function ProductDetailScreen({ navigation, route }: NativeStackScreenProps<RootStackParamList, 'ProductDetail'>) {
  const { inventory, deleteBatch } = useInventory();
  const items = inventory.filter(({ product }) => product.barcode === route.params.barcode);
  const product = items[0]?.product;
  if (!product) return <Screen><EmptyState icon="search-outline" title="Produto não encontrado" description="Este cadastro pode ter sido removido." /></Screen>;

  const remove = (id: string) => Alert.alert('Excluir lote?', 'Esta ação remove o lote do estoque. O produto também será removido se não houver outros lotes.', [
    { text: 'Cancelar', style: 'cancel' },
    { text: 'Excluir', style: 'destructive', onPress: () => void deleteBatch(id) },
  ]);

  return (
    <Screen>
      <HeaderCopy title={product.name} description={`${product.brand || product.categoryName} · ${product.barcode}`} />
      <Card style={styles.productCard}>
        <View style={styles.productIcon}><Ionicons name="cube" size={34} color={colors.brand} /></View>
        <View style={styles.grid}>
          <Info label="Categoria" value={product.categoryName} />
          <Info label="Unidade" value={unitLabel(product.unitOfMeasure)} />
          <Info label="Preço atual" value={formatMoney(product.salePrice)} />
          {product.packageContentValue ? <Info label="Conteúdo" value={`${product.packageContentValue} ${product.packageContentUnit || ''}`.trim()} /> : null}
        </View>
      </Card>
      <Text style={styles.sectionTitle}>{items.length} {items.length === 1 ? 'lote' : 'lotes'}</Text>
      {items.map(({ batch }) => (
        <Card key={batch.id}>
          <View style={styles.between}><StatusBadge level={expiryLevel(batch.expiryDate)} /><Text style={styles.quantity}>{batch.quantity} un.</Text></View>
          <Text style={styles.expiry}>{formatDate(batch.expiryDate)}</Text>
          <View style={styles.grid}>
            <Info label="Localização" value={batch.locationName} />
            <Info label="Número do lote" value={batch.batchNumber || 'Não informado'} />
            <Info label="Entrada" value={formatDate(batch.entryDate)} />
            <Info label="Custo unitário" value={formatMoney(batch.unitCost)} />
          </View>
          {batch.observation ? <View style={styles.observation}><Text style={styles.infoLabel}>Observação</Text><Text style={styles.infoValue}>{batch.observation}</Text></View> : null}
          <View style={styles.actions}><View style={styles.action}><Button label="Editar" icon="pencil-outline" variant="secondary" onPress={() => navigation.navigate('EditBatch', { product, batch })} /></View><View style={styles.action}><Button label="Excluir" icon="trash-outline" variant="text" onPress={() => remove(batch.id)} /></View></View>
        </Card>
      ))}
      <Button label="Registrar novo lote" icon="add-circle-outline" onPress={() => navigation.navigate('BatchForm', { product, isNew: false })} />
    </Screen>
  );
}

export function EditBatchScreen({ navigation, route }: NativeStackScreenProps<RootStackParamList, 'EditBatch'>) {
  const { locations, updateBatch } = useInventory();
  const [expiryDate, setExpiryDate] = useState(route.params.batch.expiryDate);
  const [batchNumber, setBatchNumber] = useState(route.params.batch.batchNumber || '');
  const [quantity, setQuantity] = useState(String(route.params.batch.quantity));
  const [locationId, setLocationId] = useState(route.params.batch.locationId);
  const [entryDate, setEntryDate] = useState(route.params.batch.entryDate);
  const [unitCost, setUnitCost] = useState(route.params.batch.unitCost == null ? '' : String(route.params.batch.unitCost).replace('.', ','));
  const [observation, setObservation] = useState(route.params.batch.observation || '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const locationName = useMemo(() => locations.find((item) => item.id === locationId)?.name ?? '', [locationId, locations]);

  const save = async () => {
    const parsedQuantity = Number(quantity.replace(',', '.'));
    const cost = unitCost ? parseMoney(unitCost) : null;
    if (!expiryDate || !entryDate || !locationId || !Number.isFinite(parsedQuantity) || parsedQuantity <= 0 || (unitCost && cost == null)) {
      setError('Revise os campos obrigatórios e os valores informados.');
      return;
    }
    if (expiryDate < entryDate) { setError('A validade é anterior à data de entrada.'); return; }
    try {
      setSaving(true);
      await updateBatch({ ...route.params.batch, expiryDate, batchNumber: batchNumber.trim() || null, quantity: parsedQuantity, locationId, locationName, entryDate, unitCost: cost, observation: observation.trim() || null });
      navigation.goBack();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível salvar as alterações.');
    } finally { setSaving(false); }
  };

  return (
    <Screen>
      <HeaderCopy title="Editar lote" description={route.params.product.name} />
      {error ? <Card style={styles.errorCard}><Text style={styles.errorText}>{error}</Text></Card> : null}
      <DateField label="Data de validade" required value={expiryDate} onChange={setExpiryDate} />
      <FormField label="Número do lote" value={batchNumber} onChangeText={setBatchNumber} />
      <FormField label="Quantidade" required value={quantity} onChangeText={setQuantity} keyboardType="decimal-pad" />
      <SelectField label="Localização" required value={locationId} onChange={setLocationId} options={locations.map((item) => ({ label: item.name, value: item.id, description: item.code }))} />
      <DateField label="Data de entrada" required value={entryDate} onChange={setEntryDate} maximumDate={new Date()} />
      <FormField label="Custo unitário" value={unitCost} onChangeText={setUnitCost} keyboardType="decimal-pad" />
      <FormField label="Observação" value={observation} onChangeText={setObservation} multiline maxLength={500} />
      <Button label="Salvar alterações" icon="save-outline" loading={saving} onPress={() => void save()} />
    </Screen>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <View style={styles.info}><Text style={styles.infoLabel}>{label}</Text><Text style={styles.infoValue}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  productCard: { alignItems: 'center' },
  productIcon: { width: 72, height: 72, borderRadius: 22, backgroundColor: colors.brandSoft, alignItems: 'center', justifyContent: 'center' },
  grid: { width: '100%', flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  info: { minWidth: '46%', flex: 1, gap: 2 },
  infoLabel: { color: colors.muted, fontSize: 12, fontWeight: '700' },
  infoValue: { color: colors.text, fontSize: 15, lineHeight: 20, fontWeight: '800' },
  sectionTitle: { color: colors.text, fontSize: 19, fontWeight: '900' },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  quantity: { color: colors.brandDark, fontSize: 17, fontWeight: '900' },
  expiry: { color: colors.text, fontSize: 25, fontWeight: '900' },
  observation: { padding: 10, borderRadius: 10, backgroundColor: colors.background, gap: 2 },
  actions: { flexDirection: 'row', gap: 8 },
  action: { flex: 1 },
  errorCard: { backgroundColor: colors.dangerBg },
  errorText: { color: colors.danger, fontWeight: '700' },
});
