import * as Crypto from 'expo-crypto';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { Button, Card, DateField, FormField, HeaderCopy, Screen, SelectField } from '../components/ui';
import { useInventory } from '../context/InventoryContext';
import type { RootStackParamList } from '../navigation/types';
import { colors, spacing } from '../theme';
import type { BatchInput, Product, ProductInput, UnitOfMeasure } from '../types';
import { formatMoney, parseMoney, todayIso, unitLabel } from '../utils';

type Errors = Record<string, string>;

export function ProductFormScreen({ navigation, route }: NativeStackScreenProps<RootStackParamList, 'ProductForm'>) {
  const { categories } = useInventory();
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [unitOfMeasure, setUnitOfMeasure] = useState<UnitOfMeasure>('UNIT');
  const [packageContentValue, setPackageContentValue] = useState('');
  const [packageContentUnit, setPackageContentUnit] = useState('g');
  const [salePrice, setSalePrice] = useState('');
  const [promotion, setPromotion] = useState('false');
  const [errors, setErrors] = useState<Errors>({});

  const submit = () => {
    const next: Errors = {};
    const price = parseMoney(salePrice);
    const content = packageContentValue ? parseMoney(packageContentValue) : null;
    if (!name.trim()) next.name = 'Informe o nome do produto.';
    if (!categoryId) next.categoryId = 'Selecione uma categoria.';
    if (price == null || price <= 0) next.salePrice = 'Informe um preço maior que zero.';
    if (packageContentValue && (content == null || content <= 0)) next.packageContentValue = 'Informe um conteúdo válido.';
    if (promotion === 'true') next.promotion = 'A opção Sim exige permissão gerencial.';
    setErrors(next);
    if (Object.keys(next).length) return;
    const category = categories.find((item) => item.id === categoryId)!;
    const product: ProductInput = {
      barcode: route.params.barcode,
      name: name.trim(),
      brand: brand.trim() || null,
      categoryId,
      categoryName: category.name,
      unitOfMeasure,
      packageContentValue: content,
      packageContentUnit: content ? packageContentUnit.trim() || null : null,
      salePrice: price,
      automaticPromotionEligible: false,
    };
    navigation.navigate('BatchForm', { product, isNew: true });
  };

  return (
    <Screen>
      <HeaderCopy step="Etapa 1 de 3" title="Novo produto" description="Informe os dados permanentes do produto." />
      <Card style={styles.codeStrip}><Text style={styles.codeLabel}>Código confirmado</Text><Text style={styles.code}>{route.params.barcode}</Text><Button label="Trocar código" variant="text" onPress={() => navigation.replace('ManualBarcode')} /></Card>
      <FormField label="Nome do produto" required placeholder="Leite integral 1 L" value={name} onChangeText={setName} error={errors.name} autoCapitalize="sentences" />
      <FormField label="Marca" placeholder="Opcional" value={brand} onChangeText={setBrand} />
      <SelectField label="Categoria" required value={categoryId} onChange={setCategoryId} options={categories.map((item) => ({ label: item.name, value: item.id }))} error={errors.categoryId} />
      <SelectField label="Unidade de medida" required value={unitOfMeasure} onChange={(value) => setUnitOfMeasure(value as UnitOfMeasure)} options={(['UNIT', 'KG', 'L'] as const).map((value) => ({ label: unitLabel(value), value }))} />
      <View style={styles.inlineFields}>
        <View style={styles.flex}><FormField label="Conteúdo/peso" placeholder="Ex.: 500" value={packageContentValue} onChangeText={setPackageContentValue} keyboardType="decimal-pad" error={errors.packageContentValue} /></View>
        <View style={styles.smallField}><FormField label="Unidade" placeholder="g, ml" value={packageContentUnit} onChangeText={setPackageContentUnit} /></View>
      </View>
      <FormField label="Preço de venda atual" required placeholder="R$ 0,00" value={salePrice} onChangeText={setSalePrice} keyboardType="decimal-pad" helper="Valor em reais, por exemplo 6,49." error={errors.salePrice} />
      <SelectField label="Pode receber promoção automática?" required value={promotion} onChange={setPromotion} options={[{ label: 'Não', value: 'false' }, { label: 'Sim', value: 'true', description: 'Exige permissão gerencial.' }]} error={errors.promotion} />
      <Text style={styles.info}>A foto do produto não está disponível nesta versão.</Text>
      <Button label="Continuar" icon="arrow-forward" onPress={submit} />
    </Screen>
  );
}

export function BatchFormScreen({ navigation, route }: NativeStackScreenProps<RootStackParamList, 'BatchForm'>) {
  const { locations, saveDraft } = useInventory();
  const { product, isNew } = route.params;
  const draftBatch = route.params.draft?.batch;
  const [expiryDate, setExpiryDate] = useState(draftBatch?.expiryDate ?? '');
  const [batchNumber, setBatchNumber] = useState(draftBatch?.batchNumber ?? '');
  const [quantity, setQuantity] = useState(draftBatch?.quantity ? String(draftBatch.quantity) : '');
  const [locationId, setLocationId] = useState(draftBatch?.locationId ?? '');
  const [entryDate, setEntryDate] = useState(draftBatch?.entryDate ?? todayIso());
  const [unitCost, setUnitCost] = useState(draftBatch?.unitCost == null ? '' : String(draftBatch.unitCost).replace('.', ','));
  const [observation, setObservation] = useState(draftBatch?.observation ?? '');
  const [errors, setErrors] = useState<Errors>({});

  const locationName = useMemo(() => locations.find((item) => item.id === locationId)?.name ?? '', [locationId, locations]);
  const buildBatch = (): BatchInput | null => {
    const next: Errors = {};
    const parsedQuantity = Number(quantity.replace(',', '.'));
    const cost = unitCost ? parseMoney(unitCost) : null;
    if (!expiryDate) next.expiryDate = 'Informe a data de validade.';
    if (!quantity) next.quantity = 'Informe a quantidade.';
    else if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) next.quantity = 'Informe uma quantidade maior que zero.';
    if (!locationId) next.locationId = 'Selecione onde o produto está armazenado.';
    if (!entryDate) next.entryDate = 'Informe a data de entrada.';
    if (expiryDate && entryDate && expiryDate < entryDate) next.expiryDate = 'A validade é anterior à data de entrada.';
    if (unitCost && (cost == null || cost < 0)) next.unitCost = 'Informe um custo válido.';
    if (observation.length > 500) next.observation = 'Use no máximo 500 caracteres.';
    setErrors(next);
    if (Object.keys(next).length) return null;
    return {
      expiryDate,
      batchNumber: batchNumber.trim() || null,
      quantity: parsedQuantity,
      locationId,
      locationName,
      entryDate,
      unitCost: cost,
      observation: observation.trim() || null,
    };
  };

  const submit = () => {
    const batch = buildBatch();
    if (batch) navigation.navigate('Review', { product, batch, isNew, draftId: route.params.draft?.id });
  };

  const draft = async () => {
    const now = new Date().toISOString();
    await saveDraft({
      id: route.params.draft?.id ?? Crypto.randomUUID(),
      barcode: product.barcode,
      product,
      batch: { expiryDate, batchNumber, quantity: Number(quantity.replace(',', '.')) || undefined, locationId, locationName, entryDate, unitCost: parseMoney(unitCost), observation },
      updatedAt: now,
    });
    Alert.alert('Rascunho salvo', 'Continue de onde parou quando quiser.');
    navigation.popToTop();
  };

  return (
    <Screen>
      <HeaderCopy step={isNew ? 'Etapa 2 de 3' : 'Etapa 1 de 2'} title="Dados do lote" description="Agora informe os dados deste lote." />
      <Card>
        <Text style={styles.productName}>{product.name}</Text>
        <Text style={styles.productMeta}>{'id' in product ? 'Produto encontrado' : 'Produto novo'} · {product.barcode}</Text>
        {'brand' in product && product.brand ? <Text style={styles.productMeta}>{product.brand}</Text> : null}
      </Card>
      <Text style={styles.sectionTitle}>Identificação e validade</Text>
      <DateField label="Data de validade" required value={expiryDate} onChange={setExpiryDate} error={errors.expiryDate} />
      <FormField label="Número do lote" placeholder="Não informado" value={batchNumber} onChangeText={setBatchNumber} error={errors.batchNumber} />
      <Text style={styles.sectionTitle}>Quantidade e local</Text>
      <FormField label="Quantidade" required placeholder="Ex.: 12" value={quantity} onChangeText={setQuantity} keyboardType="decimal-pad" error={errors.quantity} />
      <SelectField label="Localização" required value={locationId} onChange={setLocationId} options={locations.map((item) => ({ label: item.name, value: item.id, description: item.code }))} error={errors.locationId} />
      <DateField label="Data de entrada" required value={entryDate} onChange={setEntryDate} maximumDate={new Date()} error={errors.entryDate} />
      <Text style={styles.sectionTitle}>Informações adicionais</Text>
      <FormField label="Custo unitário" placeholder="R$ 0,00" value={unitCost} onChangeText={setUnitCost} keyboardType="decimal-pad" error={errors.unitCost} />
      <FormField label="Observação, avaria ou restrição" placeholder="Opcional" value={observation} onChangeText={setObservation} multiline maxLength={520} error={errors.observation} />
      <Button label="Revisar e salvar" icon="checkmark-circle-outline" onPress={submit} />
      <Button label="Salvar como rascunho" icon="document-text-outline" variant="secondary" onPress={() => void draft()} />
    </Screen>
  );
}

export function BatchFields({ batch }: { batch: BatchInput }) {
  return (
    <View style={styles.summaryGrid}>
      <Summary label="Validade" value={batch.expiryDate} />
      <Summary label="Número do lote" value={batch.batchNumber || 'Não informado'} />
      <Summary label="Quantidade" value={`${batch.quantity} un.`} />
      <Summary label="Localização" value={batch.locationName} />
      <Summary label="Entrada" value={batch.entryDate} />
      <Summary label="Custo unitário" value={formatMoney(batch.unitCost)} />
      {batch.observation ? <Summary label="Observação" value={batch.observation} /> : null}
    </View>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return <View style={styles.summary}><Text style={styles.summaryLabel}>{label}</Text><Text style={styles.summaryValue}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  codeStrip: { backgroundColor: colors.brandSoft, borderColor: '#C7DBFF' },
  codeLabel: { color: colors.brandDark, fontWeight: '800' },
  code: { color: colors.text, fontSize: 20, fontWeight: '900', fontVariant: ['tabular-nums'] },
  inlineFields: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  flex: { flex: 1 },
  smallField: { width: 112 },
  info: { color: colors.muted, fontSize: 13, fontStyle: 'italic' },
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: '900', marginTop: 4 },
  productName: { color: colors.text, fontSize: 19, fontWeight: '900' },
  productMeta: { color: colors.muted, fontSize: 14 },
  summaryGrid: { gap: 11 },
  summary: { borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: 9, gap: 2 },
  summaryLabel: { color: colors.muted, fontSize: 12, fontWeight: '700' },
  summaryValue: { color: colors.text, fontSize: 16, lineHeight: 21, fontWeight: '700' },
});
