import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import * as Linking from 'expo-linking';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../components/Button';
import { HeaderCopy, Screen } from '../components/Layout';
import { cameraTypeToFormat, isSupportedBarcode, sanitizeBarcode } from '../lib/barcode';
import { colors, spacing } from '../theme';
import type { RootStackParamList } from '../types';

export function CameraPermissionScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'CameraPermission'>) {
  const [permission, requestPermission] = useCameraPermissions();
  const proceed = async () => {
    if (permission?.granted) return navigation.replace('Scanner');
    const result = await requestPermission();
    if (result.granted) navigation.replace('Scanner');
  };
  useEffect(() => {
    if (permission?.granted) navigation.replace('Scanner');
  }, [navigation, permission?.granted]);
  if (permission?.granted) return null;
  const blocked = permission && !permission.canAskAgain;
  return <Screen>
    <View style={styles.permissionIcon}><Text style={styles.permissionIconText}>{blocked ? '⊘' : '▣'}</Text></View>
    <HeaderCopy title={blocked ? 'Câmera bloqueada' : 'Permitir acesso à câmera'} description={blocked ? 'Ative a permissão da câmera nos ajustes do aparelho ou digite o código.' : 'A câmera é usada somente para ler códigos de barras. Você também pode digitar o código.'} />
    <View style={styles.bottom}>
      <Button label={blocked ? 'Abrir ajustes' : permission ? 'Tentar novamente' : 'Continuar'} onPress={blocked ? () => Linking.openSettings() : proceed} />
      <Button label="Digitar código" variant="secondary" onPress={() => navigation.replace('ManualBarcode', { fromScanner: true })} />
    </View>
  </Screen>;
}

export function ScannerScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'Scanner'>) {
  const [locked, setLocked] = useState(false);
  const [torch, setTorch] = useState(false);
  const [error, setError] = useState('');
  const lockRef = useRef(false);
  const scanned = useCallback(async ({ data, type }: { data: string; type: string }) => {
    if (lockRef.current) return;
    const barcode = sanitizeBarcode(data);
    if (!isSupportedBarcode(barcode)) {
      lockRef.current = true; setLocked(true); setError('Não reconhecemos este código. Tente novamente ou digite os números.');
      return;
    }
    lockRef.current = true; setLocked(true);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    navigation.replace('Lookup', { barcode, format: cameraTypeToFormat(type, barcode), source: 'CAMERA' });
  }, [navigation]);
  const retry = () => { lockRef.current = false; setLocked(false); setError(''); };
  return <SafeAreaView style={styles.cameraPage} edges={['top', 'bottom', 'left', 'right']}>
    <CameraView style={StyleSheet.absoluteFill} enableTorch={torch} barcodeScannerSettings={{ barcodeTypes: ['ean8', 'ean13', 'upc_a', 'upc_e'] }} onBarcodeScanned={locked ? undefined : scanned} />
    <View style={styles.cameraTop}><Button label="Voltar" variant="text" onPress={() => navigation.goBack()} /><Text accessibilityRole="header" style={styles.cameraTitle}>Ler código</Text><Button accessibilityLabel={`Lanterna ${torch ? 'ligada' : 'desligada'}`} label={torch ? 'Apagar' : 'Luz'} variant="text" onPress={() => setTorch((value) => !value)} /></View>
    <View style={styles.finderWrap}><View accessible accessibilityLabel="Moldura de leitura do código de barras" style={styles.finder} /><Text style={styles.cameraHelp}>Aponte para o código de barras</Text></View>
    <View style={styles.cameraBottom}>
      {error ? <Text accessibilityRole="alert" style={styles.scanError}>{error}</Text> : <Text style={styles.cameraCaption}>Mantenha o código dentro da moldura.</Text>}
      {error ? <Button label="Tentar novamente" onPress={retry} /> : null}
      <Button label="Digitar código" variant="secondary" onPress={() => navigation.navigate('ManualBarcode', { fromScanner: true })} />
    </View>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  permissionIcon: { marginTop: spacing.xxl, alignSelf: 'center', width: 80, height: 80, borderRadius: 24, backgroundColor: '#E7F0FF', alignItems: 'center', justifyContent: 'center' }, permissionIconText: { fontSize: 40, color: colors.brand }, bottom: { marginTop: 'auto', gap: spacing.sm },
  cameraPage: { flex: 1, backgroundColor: '#000' }, cameraTop: { minHeight: 64, paddingHorizontal: spacing.sm, backgroundColor: colors.overlay, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, cameraTitle: { color: '#fff', fontWeight: '800', fontSize: 18 },
  finderWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.lg }, finder: { width: '82%', maxWidth: 420, aspectRatio: 2.15, borderColor: '#fff', borderWidth: 3, borderRadius: 16 }, cameraHelp: { color: '#fff', backgroundColor: colors.overlay, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, fontSize: 16, fontWeight: '700' },
  cameraBottom: { backgroundColor: colors.overlay, padding: spacing.lg, paddingBottom: 28, gap: spacing.sm }, cameraCaption: { color: '#fff', fontSize: 15, textAlign: 'center' }, scanError: { color: '#fff', backgroundColor: colors.danger, borderRadius: 8, padding: 10, fontWeight: '700', textAlign: 'center' },
});
