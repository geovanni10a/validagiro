import { zodResolver } from '@hookform/resolvers/zod';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { AccessibilityInfo, AppState, StyleSheet, Text, View } from 'react-native';
import { BarcodeValue } from '../components/ProductSummary';
import { Button } from '../components/Button';
import { FormField } from '../components/FormField';
import { ActionBar, HeaderCopy, Screen } from '../components/Layout';
import { SelectField } from '../components/SelectField';
import { SegmentedField } from '../components/SegmentedField';
import { useIntake } from '../context/IntakeContext';
import { getCategories } from '../data/api';
import { useDraftExitGuard } from '../hooks/useDraftExitGuard';
import { clearStageFieldErrors, firstStageFieldError } from '../lib/draftFlow';
import { productSchema, type ProductInput } from '../lib/validation';
import { useStore } from '../context/StoreContext';
import { colors, spacing } from '../theme';
import type { Category, RootStackParamList } from '../types';

export function ProductFormScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'ProductForm'>) {
  const { current, patch, remove } = useIntake();
  const { canEnablePromotion } = useStore();
  const [categories, setCategories] = useState<Category[]>([]); const [categoriesLoading, setCategoriesLoading] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { control, getValues, handleSubmit, setFocus, setValue, watch, formState: { errors, isDirty } } = useForm<ProductInput>({ resolver: zodResolver(productSchema), defaultValues: current?.product ?? { name: '', brand: '', categoryId: '', categoryName: '', unitOfMeasure: 'UNIT', packageContentValue: '', packageContentUnit: 'g', salePrice: '', automaticPromotionEligible: 'false' } });
  const loadCategories = async () => { setCategoriesLoading(true); try { setCategories(await getCategories()); } catch { setCategories([]); } finally { setCategoriesLoading(false); } };
  useEffect(() => { void loadCategories(); }, []);
  useEffect(() => {
    if (!canEnablePromotion && getValues('automaticPromotionEligible') === 'true') {
      setValue('automaticPromotionEligible', 'false');
    }
  }, [canEnablePromotion, getValues, setValue]);
  useEffect(() => {
    const subscription = watch((values) => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void patch({ product: values as ProductInput }), 400);
    });
    return () => { subscription.unsubscribe(); if (timer.current) clearTimeout(timer.current); };
  }, [patch, watch]);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') void patch({ product: getValues(), status: 'DRAFT' });
    });
    return () => subscription.remove();
  }, [getValues, patch]);
  useEffect(() => {
    const field = firstStageFieldError(current?.serverFieldErrors, 'product') as keyof ProductInput | undefined;
    if (!field) return;
    const timerId = setTimeout(() => setFocus(field), 0);
    void AccessibilityInfo.announceForAccessibility(current?.serverFieldErrors?.[`product.${String(field)}`] ?? 'Revise o primeiro campo indicado.');
    return () => clearTimeout(timerId);
  }, [current?.serverFieldErrors, setFocus]);
  const guard = useDraftExitGuard({
    navigation, shouldGuard: isDirty,
    save: async () => { await patch({ product: getValues(), status: 'DRAFT' }); },
    discard: async () => {
      if (timer.current) clearTimeout(timer.current);
      if (current) await remove(current.id);
    },
  });
  if (!current) return null;
  const invalid = () => {
    const first = Object.keys(errors)[0] as keyof ProductInput | undefined;
    if (first) setFocus(first);
    void AccessibilityInfo.announceForAccessibility('Revise os campos indicados.');
  };
  const submit = handleSubmit(async (product) => {
    const remainingErrors = clearStageFieldErrors(current.serverFieldErrors, 'product');
    await patch({ product, status: 'DRAFT', serverFieldErrors: remainingErrors, reviewReason: remainingErrors ? current.reviewReason : undefined });
    navigation.navigate('BatchForm');
  }, invalid);
  const serverError = (field: string) => current.serverFieldErrors?.[`product.${field}`] ?? current.serverFieldErrors?.[field];
  const saveAndExit = () => guard.leaveAfter(
    async () => { await patch({ product: getValues(), status: 'DRAFT' }); },
    () => navigation.popTo('Home'),
  );
  const changeCode = () => guard.leaveAfter(
    async () => { await remove(current.id); },
    () => navigation.replace('CameraPermission'),
  );
  return <Screen footer={<ActionBar primaryLabel="Continuar" onPrimary={submit} secondaryLabel="Salvar e sair" onSecondary={() => void saveAndExit()} />}>
    <HeaderCopy step="Etapa 1 de 3" title="Novo produto" description="Informe os dados permanentes do produto." />
    <View style={styles.codeStrip}><Text style={styles.codeLabel}>Código confirmado</Text><BarcodeValue value={current.barcode} /><Button label="Trocar código" variant="text" onPress={() => void changeCode()} /></View>
    <Controller control={control} name="name" render={({ field }) => <FormField ref={field.ref} label="Nome do produto" required placeholder="Leite integral 1 L" value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} error={errors.name?.message ?? serverError('name')} />} />
    <Controller control={control} name="brand" render={({ field }) => <FormField ref={field.ref} label="Marca" placeholder="Opcional" value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} error={errors.brand?.message ?? serverError('brand')} />} />
    <Controller control={control} name="categoryId" render={({ field }) => <SelectField ref={field.ref} label="Categoria" value={field.value} options={categories} loading={categoriesLoading} onRetry={loadCategories} onChange={(option) => { field.onChange(option.id); setValue('categoryName', option.name); }} error={errors.categoryId?.message ?? serverError('categoryId')} />} />
    <Controller control={control} name="unitOfMeasure" render={({ field }) => <SegmentedField ref={field.ref} label="Unidade de medida (obrigatório)" value={field.value} options={[{ value: 'UNIT', label: 'Unidade' }, { value: 'KG', label: 'Quilograma' }, { value: 'L', label: 'Litro' }]} onChange={field.onChange} error={errors.unitOfMeasure?.message ?? serverError('unitOfMeasure')} />} />
    <Controller control={control} name="packageContentValue" render={({ field }) => <FormField ref={field.ref} label="Conteúdo/peso" placeholder="Ex.: 500" keyboardType="decimal-pad" value={field.value} onChangeText={field.onChange} error={errors.packageContentValue?.message ?? serverError('packageContent.value')} />} />
    <Controller control={control} name="packageContentUnit" render={({ field }) => <SegmentedField ref={field.ref} label="Unidade do conteúdo" value={field.value} options={[{ value: 'g', label: 'g' }, { value: 'kg', label: 'kg' }, { value: 'ml', label: 'ml' }, { value: 'L', label: 'L' }]} onChange={field.onChange} error={errors.packageContentUnit?.message ?? serverError('packageContent.unit')} />} />
    <Controller control={control} name="salePrice" render={({ field }) => <FormField ref={field.ref} label="Preço de venda atual" required help="Valor em reais, por exemplo 6,49." placeholder="R$ 0,00" keyboardType="decimal-pad" value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} error={errors.salePrice?.message ?? serverError('salePrice.amount')} />} />
    <Controller control={control} name="automaticPromotionEligible" render={({ field }) => <SegmentedField ref={field.ref} label="Pode receber promoção automática? (obrigatório)" value={field.value} options={[{ value: 'false', label: 'Não' }, { value: 'true', label: 'Sim', disabled: !canEnablePromotion, accessibilityHint: !canEnablePromotion ? 'Exige permissão gerencial.' : undefined }]} onChange={field.onChange} error={errors.automaticPromotionEligible?.message ?? serverError('automaticPromotionEligible')} />} />
    {!canEnablePromotion ? <Text style={styles.info}>A opção Sim exige permissão gerencial.</Text> : null}
    <Text style={styles.info}>Foto do produto é opcional e ficará disponível após a definição do contrato de upload.</Text>
  </Screen>;
}

const styles = StyleSheet.create({
  codeStrip: { backgroundColor: '#EAF2FF', borderRadius: 12, padding: spacing.md, gap: spacing.xs }, codeLabel: { color: colors.brandDark, fontWeight: '800' },
  info: { color: colors.muted, fontSize: 14, lineHeight: 20 },
});
