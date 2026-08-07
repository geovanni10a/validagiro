import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { Keyboard } from 'react-native';
import { ActionBar, HeaderCopy, Screen } from '../components/Layout';
import { FormField } from '../components/FormField';
import { inferBarcodeFormat, isSupportedBarcode, sanitizeBarcode } from '../lib/barcode';
import type { RootStackParamList } from '../types';

export function ManualBarcodeScreen({ navigation, route }: NativeStackScreenProps<RootStackParamList, 'ManualBarcode'>) {
  const [barcode, setBarcode] = useState(''); const [error, setError] = useState('');
  const search = () => {
    Keyboard.dismiss(); const clean = sanitizeBarcode(barcode);
    if (!isSupportedBarcode(clean)) return setError('Confira o código. Use entre 8 e 14 números.');
    navigation.replace('Lookup', { barcode: clean, format: inferBarcodeFormat(clean), source: 'MANUAL' });
  };
  return <Screen footer={<ActionBar primaryLabel="Buscar produto" onPrimary={search} secondaryLabel={route.params?.fromScanner ? 'Voltar para a câmera' : undefined} onSecondary={route.params?.fromScanner ? () => navigation.goBack() : undefined} />}>
    <HeaderCopy title="Digitar código" description="Digite os números abaixo do código de barras." />
    <FormField label="Código de barras" required value={barcode} onChangeText={(value) => { setBarcode(value); setError(''); }} keyboardType="number-pad" autoFocus maxLength={20} error={error} onSubmitEditing={search} />
  </Screen>;
}
