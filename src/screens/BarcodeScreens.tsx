import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Button, Card, FormField, HeaderCopy, Screen } from '../components/ui';
import { useInventory } from '../context/InventoryContext';
import type { RootStackParamList } from '../navigation/types';
import { colors } from '../theme';
import { isSupportedBarcode, sanitizeBarcode } from '../utils';

export function ManualBarcodeScreen({ navigation, route }: NativeStackScreenProps<RootStackParamList, 'ManualBarcode'>) {
  const [barcode, setBarcode] = useState('');
  const [error, setError] = useState('');
  const submit = () => {
    if (!isSupportedBarcode(barcode)) {
      setError('Confira o código. Use entre 8 e 14 números.');
      return;
    }
    navigation.replace('Lookup', { barcode });
  };
  return (
    <Screen>
      <HeaderCopy title="Digitar código" description="Digite os números abaixo do código de barras." />
      <FormField label="Código de barras" required value={barcode} onChangeText={(value) => { setBarcode(sanitizeBarcode(value)); setError(''); }} keyboardType="number-pad" autoFocus maxLength={20} error={error} onSubmitEditing={submit} />
      <Button label="Buscar produto" icon="search" onPress={submit} />
      {route.params?.fromScanner ? <Button label="Voltar para a câmera" variant="secondary" icon="camera-outline" onPress={() => navigation.replace('Scanner')} /> : null}
    </Screen>
  );
}

export function LookupScreen({ navigation, route }: NativeStackScreenProps<RootStackParamList, 'Lookup'>) {
  const { lookupProduct } = useInventory();
  const [error, setError] = useState('');
  const { barcode } = route.params;

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const product = await lookupProduct(barcode);
        if (!active) return;
        if (product) navigation.replace('BatchForm', { product, isNew: false });
        else navigation.replace('ProductForm', { barcode });
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : 'Erro inesperado');
      }
    })();
    return () => { active = false; };
  }, [barcode, lookupProduct, navigation]);

  return (
    <Screen style={styles.center}>
      {error ? (
        <Card>
          <HeaderCopy title="Não foi possível consultar o produto." description={error} />
          <Button label="Tentar novamente" onPress={() => navigation.replace('Lookup', { barcode })} />
          <Button label="Digitar outro código" variant="secondary" onPress={() => navigation.replace('ManualBarcode')} />
        </Card>
      ) : (
        <View style={styles.loading}><ActivityIndicator accessibilityLabel="Buscando produto" size="large" color={colors.brand} /><Text style={styles.loadingText}>Buscando produto…</Text><Text style={styles.code}>{barcode}</Text></View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { justifyContent: 'center' },
  loading: { alignItems: 'center', gap: 12 },
  loadingText: { color: colors.text, fontSize: 18, fontWeight: '800' },
  code: { color: colors.muted, fontVariant: ['tabular-nums'] },
});
