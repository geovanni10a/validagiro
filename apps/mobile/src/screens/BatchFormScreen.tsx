import { zodResolver } from '@hookform/resolvers/zod';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { AccessibilityInfo, AppState, StyleSheet, Text } from 'react-native';
import { DateField } from '../components/DateField';
import { FormField } from '../components/FormField';
import { ActionBar, HeaderCopy, Screen } from '../components/Layout';
import { ProductSummary } from '../components/ProductSummary';
import { SelectField } from '../components/SelectField';
import { useIntake } from '../context/IntakeContext';
import { useStore } from '../context/StoreContext';
import { getLocations } from '../data/api';
import { useDraftExitGuard } from '../hooks/useDraftExitGuard';
import { clearStageFieldErrors, firstStageFieldError, restoreBatchSnapshot } from '../lib/draftFlow';
import { batchSchema, type BatchInput } from '../lib/validation';
import { colors } from '../theme';
import type { Location, RootStackParamList } from '../types';

export function BatchFormScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'BatchForm'>) {
  const { current, patch } = useIntake(); const { today } = useStore();
  const [locations, setLocations] = useState<Location[]>([]); const [loading, setLoading] = useState(false);
  const initialBatch = useRef(current?.batch ? { ...current.batch } : undefined);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { control, getValues, handleSubmit, setFocus, setValue, watch, formState: { errors, isDirty } } = useForm<BatchInput>({ resolver: zodResolver(batchSchema), defaultValues: current?.batch ?? { expiryDate: '', batchNumber: '', quantity: '', locationId: '', locationName: '', entryDate: today, unitCost: '', observation: '' } });
  const load = async () => { setLoading(true); try { setLocations(await getLocations()); } catch { setLocations([]); } finally { setLoading(false); } };
  useEffect(() => { void load(); }, []);
  useEffect(() => {
    const subscription = watch((values) => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void patch({ batch: values as BatchInput }), 400);
    });
    return () => { subscription.unsubscribe(); if (timer.current) clearTimeout(timer.current); };
  }, [patch, watch]);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') void patch({ batch: getValues(), status: 'DRAFT' });
    });
    return () => subscription.remove();
  }, [getValues, patch]);
  useEffect(() => {
    const field = firstStageFieldError(current?.serverFieldErrors, 'batch') as keyof BatchInput | undefined;
    if (!field) return;
    const timerId = setTimeout(() => setFocus(field), 0);
    void AccessibilityInfo.announceForAccessibility(current?.serverFieldErrors?.[`batch.${String(field)}`] ?? 'Revise o primeiro campo indicado.');
    return () => clearTimeout(timerId);
  }, [current?.serverFieldErrors, setFocus]);
  const guard = useDraftExitGuard({
    navigation, shouldGuard: isDirty,
    save: async () => { await patch({ batch: getValues(), status: 'DRAFT' }); },
    discard: async () => {
      if (timer.current) clearTimeout(timer.current);
      await patch(restoreBatchSnapshot(initialBatch.current));
    },
  });
  if (!current) return null;
  const invalid = () => {
    const first = Object.keys(errors)[0] as keyof BatchInput | undefined;
    if (first) setFocus(first);
    void AccessibilityInfo.announceForAccessibility('Revise os campos indicados.');
  };
  const submit = handleSubmit(async (batch) => {
    const remainingErrors = clearStageFieldErrors(current.serverFieldErrors, 'batch');
    await patch({ batch, status: 'DRAFT', serverFieldErrors: remainingErrors, reviewReason: remainingErrors ? current.reviewReason : undefined });
    navigation.navigate('Review');
  }, invalid);
  const serverError = (field: string) => current.serverFieldErrors?.[`batch.${field}`] ?? current.serverFieldErrors?.[field];
  const saveAndExit = () => guard.leaveAfter(
    async () => { await patch({ batch: getValues(), status: 'DRAFT' }); },
    () => navigation.popTo('Home'),
  );
  return <Screen footer={<ActionBar primaryLabel="Revisar cadastro" onPrimary={submit} secondaryLabel="Salvar e sair" onSecondary={() => void saveAndExit()} />}>
    <HeaderCopy step={current.productMode === 'EXISTING' ? 'Etapa 1 de 2' : 'Etapa 2 de 3'} title="Dados do lote" description="Agora informe os dados deste lote." />
    <ProductSummary draft={current} found={current.productMode === 'EXISTING'} />
    <Text accessibilityRole="header" style={styles.section}>Identificação e validade</Text>
    <Controller control={control} name="expiryDate" render={({ field }) => <DateField ref={field.ref} label="Data de validade" value={field.value} onChange={field.onChange} error={errors.expiryDate?.message ?? serverError('expiryDate')} />} />
    <Controller control={control} name="batchNumber" render={({ field }) => <FormField ref={field.ref} label="Número do lote" placeholder="Não informado" value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} error={errors.batchNumber?.message ?? serverError('batchNumber')} />} />
    <Text accessibilityRole="header" style={styles.section}>Quantidade e local</Text>
    <Controller control={control} name="quantity" render={({ field }) => <FormField ref={field.ref} label="Quantidade" required keyboardType="number-pad" value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} error={errors.quantity?.message ?? serverError('quantity')} />} />
    <Controller control={control} name="locationId" render={({ field }) => <SelectField ref={field.ref} label="Localização" value={field.value} loading={loading} onRetry={load} options={locations.map((location) => ({ id: location.id, name: location.name, description: location.path ?? location.code }))} onChange={(option) => { field.onChange(option.id); setValue('locationName', option.name); }} error={errors.locationId?.message ?? serverError('locationId')} />} />
    <Controller control={control} name="entryDate" render={({ field }) => <DateField ref={field.ref} label="Data de entrada" value={field.value} onChange={field.onChange} error={errors.entryDate?.message ?? serverError('entryDate')} />} />
    <Text accessibilityRole="header" style={styles.section}>Informações adicionais</Text>
    <Controller control={control} name="unitCost" render={({ field }) => <FormField ref={field.ref} label="Custo unitário" placeholder="R$ 0,00" keyboardType="decimal-pad" value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} error={errors.unitCost?.message ?? serverError('unitCost.amount')} />} />
    <Controller control={control} name="observation" render={({ field }) => <FormField ref={field.ref} label="Observação, avaria ou restrição" multiline maxLength={500} value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} error={errors.observation?.message ?? serverError('observation')} />} />
  </Screen>;
}

const styles = StyleSheet.create({ section: { marginTop: 8, color: colors.text, fontSize: 19, fontWeight: '800' } });
