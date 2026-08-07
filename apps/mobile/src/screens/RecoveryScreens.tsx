import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { Button } from '../components/Button';
import { FormField } from '../components/FormField';
import { HeaderCopy, Screen } from '../components/Layout';
import { ProductSummary } from '../components/ProductSummary';
import { StatusBanner } from '../components/Status';
import { useIntake } from '../context/IntakeContext';
import { getMeContext, lookupProduct, setAccessToken } from '../data/api';
import { clearStageFieldErrors, getResumeTarget } from '../lib/draftFlow';
import type { RootStackParamList } from '../types';

export function SessionExpiredScreen({ navigation, route }: NativeStackScreenProps<RootStackParamList, 'SessionExpired'>) {
  const { current } = useIntake();
  const [token, setToken] = useState(process.env.EXPO_PUBLIC_ACCESS_TOKEN ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const retry = () => {
    if (route.params.returnTo === 'Queue') { navigation.replace('Queue'); return; }
    if (route.params.returnTo === 'Review') { navigation.popTo('Review'); return; }
    if (current) navigation.replace('Lookup', { barcode: current.barcode, format: current.barcodeFormat, source: current.barcodeSource, draftId: current.id });
    else navigation.popTo('Home');
  };
  const renew = async () => {
    if (!token.trim()) { setError('Cole um token de acesso válido.'); return; }
    setLoading(true); setError(''); setAccessToken(token.trim());
    try { await getMeContext(); retry(); }
    catch { setAccessToken(undefined); setError('Não foi possível renovar a sessão com este token.'); setLoading(false); }
  };
  return <Screen>
    <StatusBanner type="warning" title="Sua sessão expirou" description="O preenchimento foi preservado neste aparelho." />
    <HeaderCopy title="Renovar sessão" description="Neste recorte técnico, cole um token JWT temporário do ambiente de desenvolvimento. O rascunho permanece no aparelho." />
    <FormField label="Token de acesso de desenvolvimento" required value={token} onChangeText={(value) => { setToken(value); setError(''); }} secureTextEntry autoCapitalize="none" autoCorrect={false} error={error} />
    <Button label="Renovar sessão" loading={loading} onPress={() => void renew()} />
    <Button label="Voltar ao início" variant="secondary" onPress={() => navigation.popTo('Home')} />
  </Screen>;
}

export function ProductConflictScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'ProductConflict'>) {
  const { current, patch } = useIntake(); const [loading, setLoading] = useState(false); const [error, setError] = useState('');
  if (!current) return null;
  const continueWithCurrentProduct = async () => {
    setLoading(true); setError('');
    try {
      const response = await lookupProduct(current.barcode, current.barcodeFormat);
      const remainingErrors = clearStageFieldErrors(current.serverFieldErrors, 'product');
      const updated = await patch({ productMode: 'EXISTING', existingProduct: response.product, product: undefined, status: 'DRAFT', errorMessage: undefined, serverFieldErrors: remainingErrors, reviewReason: remainingErrors ? 'FIELD_ERRORS' : undefined });
      const target = getResumeTarget(updated);
      if (target === 'Lookup') navigation.navigate('Lookup', { barcode: updated.barcode, format: updated.barcodeFormat, source: updated.barcodeSource, draftId: updated.id });
      else if (target !== 'ProductConflict') navigation.navigate(target);
    } catch { setError('Não foi possível carregar o produto atual. Tente novamente.'); setLoading(false); }
  };
  return <Screen>
    <ProductSummary draft={current} />
    <HeaderCopy title="Este produto já foi cadastrado" description="Os dados atuais da base serão usados. As informações deste lote foram preservadas." />
    {error ? <StatusBanner type="error" title="Não foi possível continuar" description={error} /> : null}
    <Button label="Continuar com o produto encontrado" loading={loading} onPress={() => void continueWithCurrentProduct()} />
    <Button label="Revisar" variant="secondary" onPress={() => navigation.goBack()} />
  </Screen>;
}
