import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text } from 'react-native';
import { Button } from '../components/Button';
import { BarcodeValue, ProductSummary } from '../components/ProductSummary';
import { HeaderCopy, Screen } from '../components/Layout';
import { StatusBanner } from '../components/Status';
import { useIntake } from '../context/IntakeContext';
import { ApiError, lookupProduct } from '../data/api';
import { colors, spacing } from '../theme';
import type { RootStackParamList } from '../types';

type State = 'loading' | 'notFound' | 'error';
export function LookupScreen({ navigation, route }: NativeStackScreenProps<RootStackParamList, 'Lookup'>) {
  const { begin, current, patch } = useIntake(); const [state, setState] = useState<State>('loading');
  const attemptDraft = useRef(route.params.draftId && current?.id === route.params.draftId ? current : undefined);
  const [message, setMessage] = useState('');
  const run = useCallback(async () => {
    setState('loading'); setMessage('');
    try {
      if (!attemptDraft.current) attemptDraft.current = await begin(route.params.barcode, route.params.format, route.params.source);
      const response = await lookupProduct(route.params.barcode, route.params.format);
      await patch({ productMode: 'EXISTING', existingProduct: response.product });
      navigation.replace('BatchForm');
    } catch (error) {
      if (error instanceof ApiError && error.status === 404 && error.code === 'PRODUCT_NOT_FOUND') setState('notFound');
      else if (error instanceof ApiError && error.status === 401) {
        await patch({ status: 'DRAFT', errorMessage: 'Sua sessão expirou. Entre novamente para continuar.' });
        navigation.replace('SessionExpired', { returnTo: 'Lookup' });
      }
      else { setState('error'); setMessage(error instanceof Error ? error.message : 'Não foi possível buscar o produto.'); }
    }
  }, [begin, navigation, patch, route.params.barcode, route.params.format, route.params.source]);
  useEffect(() => { void run(); }, [run]);
  if (state === 'loading') return <Screen scroll={false}><ActivityIndicator accessibilityLabel="Buscando produto" size="large" color={colors.brand} /><Text style={styles.loading}>Buscando produto…</Text><BarcodeValue value={route.params.barcode} /></Screen>;
  if (state === 'notFound') return <Screen>
    {current ? <ProductSummary draft={current} found={false} /> : <BarcodeValue value={route.params.barcode} />}
    <HeaderCopy title="Produto não cadastrado" description="Cadastre os dados do produto uma vez. Depois, informe os dados deste lote." />
    <Button label="Cadastrar produto" onPress={async () => { await patch({ productMode: 'CREATE' }); navigation.replace('ProductForm'); }} />
    <Button label="Ler outro código" variant="secondary" onPress={() => navigation.popTo('Home')} />
  </Screen>;
  return <Screen>
    <StatusBanner type="error" title="Não foi possível buscar o produto." description={`${message} Seus dados não foram alterados. Tente novamente.`} />
    <BarcodeValue value={route.params.barcode} />
    <Button label="Tentar novamente" onPress={run} />
    <Button label="Digitar outro código" variant="secondary" onPress={() => navigation.replace('ManualBarcode')} />
  </Screen>;
}

const styles = StyleSheet.create({ loading: { color: colors.text, fontSize: 22, fontWeight: '800', marginTop: spacing.lg, textAlign: 'center' } });
