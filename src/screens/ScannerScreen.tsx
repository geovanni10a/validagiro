import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useRef, useState } from 'react';
import { Linking, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { Button } from '../components/ui';
import type { RootStackParamList } from '../navigation/types';
import { colors, spacing } from '../theme';
import { isSupportedBarcode, sanitizeBarcode } from '../utils';

type Props = NativeStackScreenProps<RootStackParamList, 'Scanner'>;

export function ScannerScreen({ navigation }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const [scanError, setScanError] = useState('');
  const locked = useRef(false);

  const onScanned = ({ data }: { data: string }) => {
    if (locked.current) return;
    const barcode = sanitizeBarcode(data);
    if (!isSupportedBarcode(barcode)) {
      setScanError('Não reconhecemos este código. Tente novamente ou digite os números.');
      return;
    }
    locked.current = true;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    navigation.replace('Lookup', { barcode });
  };

  if (!permission) return <View style={styles.permissionPage} />;
  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.permissionPage}>
        <View style={styles.permissionContent}>
          <View style={styles.permissionIcon}><Ionicons name="camera-outline" size={46} color={colors.brand} /></View>
          <Text style={styles.permissionTitle}>{permission.canAskAgain ? 'Permitir acesso à câmera' : 'Câmera bloqueada'}</Text>
          <Text style={styles.permissionText}>{permission.canAskAgain ? 'A câmera é usada somente para ler códigos de barras. Você também pode digitar o código.' : 'Ative a permissão da câmera nos ajustes do aparelho ou digite o código.'}</Text>
          {permission.canAskAgain ? <Button label="Permitir acesso à câmera" onPress={() => void requestPermission()} /> : <Button label="Abrir ajustes" onPress={() => void Linking.openSettings()} />}
          <Button label="Digitar código" variant="secondary" onPress={() => navigation.replace('ManualBarcode', { fromScanner: true })} />
          <Button label="Voltar" variant="text" onPress={() => navigation.goBack()} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.cameraPage}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        enableTorch={torch}
        barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'] }}
        onBarcodeScanned={onScanned}
      />
      <SafeAreaView style={styles.overlay}>
        <View style={styles.cameraTop}>
          <Pressable accessibilityLabel="Fechar" onPress={() => navigation.goBack()} style={styles.roundButton}><Ionicons name="close" size={28} color="#fff" /></Pressable>
          <Text style={styles.cameraTitle}>Ler código</Text>
          <Pressable accessibilityLabel={`Lanterna ${torch ? 'ligada' : 'desligada'}`} onPress={() => setTorch((value) => !value)} style={[styles.roundButton, torch && styles.torchOn]}><Ionicons name={torch ? 'flash' : 'flash-outline'} size={24} color="#fff" /></Pressable>
        </View>
        <View style={styles.finderWrap}>
          <View accessibilityLabel="Moldura de leitura do código de barras" style={styles.finder}>
            <View style={[styles.corner, styles.topLeft]} /><View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} /><View style={[styles.corner, styles.bottomRight]} />
            <View style={styles.scanLine} />
          </View>
          <Text style={styles.cameraHelp}>Aponte para o código de barras</Text>
          <Text style={styles.cameraCaption}>{scanError || 'Mantenha o código dentro da moldura.'}</Text>
        </View>
        <View style={styles.cameraBottom}><Button label="Digitar código" icon="keypad-outline" variant="secondary" onPress={() => navigation.replace('ManualBarcode', { fromScanner: true })} /></View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  permissionPage: { flex: 1, backgroundColor: colors.background },
  permissionContent: { flex: 1, justifyContent: 'center', padding: spacing.xl, gap: spacing.lg },
  permissionIcon: { width: 86, height: 86, borderRadius: 43, backgroundColor: colors.brandSoft, alignItems: 'center', justifyContent: 'center', alignSelf: 'center' },
  permissionTitle: { fontSize: 25, fontWeight: '900', color: colors.text, textAlign: 'center' },
  permissionText: { color: colors.muted, fontSize: 16, lineHeight: 23, textAlign: 'center', marginBottom: 8 },
  cameraPage: { flex: 1, backgroundColor: '#050C18' },
  overlay: { flex: 1, backgroundColor: 'rgba(5,12,24,.38)', justifyContent: 'space-between' },
  cameraTop: { padding: spacing.lg, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cameraTitle: { color: '#fff', fontWeight: '900', fontSize: 20 },
  roundButton: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(5,12,24,.65)', alignItems: 'center', justifyContent: 'center' },
  torchOn: { backgroundColor: colors.warning },
  finderWrap: { alignItems: 'center', gap: 13, paddingHorizontal: spacing.xl },
  finder: { width: '100%', maxWidth: 350, aspectRatio: 1.55, borderRadius: 18, backgroundColor: 'rgba(255,255,255,.05)', overflow: 'hidden' },
  corner: { position: 'absolute', width: 46, height: 46, borderColor: '#fff' },
  topLeft: { top: 0, left: 0, borderTopWidth: 5, borderLeftWidth: 5, borderTopLeftRadius: 18 },
  topRight: { top: 0, right: 0, borderTopWidth: 5, borderRightWidth: 5, borderTopRightRadius: 18 },
  bottomLeft: { bottom: 0, left: 0, borderBottomWidth: 5, borderLeftWidth: 5, borderBottomLeftRadius: 18 },
  bottomRight: { bottom: 0, right: 0, borderBottomWidth: 5, borderRightWidth: 5, borderBottomRightRadius: 18 },
  scanLine: { position: 'absolute', top: '50%', left: 18, right: 18, height: 2, backgroundColor: '#58A6FF', shadowColor: '#58A6FF', shadowOpacity: 1, shadowRadius: 8 },
  cameraHelp: { color: '#fff', fontSize: 19, fontWeight: '900', textAlign: 'center' },
  cameraCaption: { color: '#E6EDF6', fontSize: 14, lineHeight: 20, textAlign: 'center' },
  cameraBottom: { padding: spacing.xl },
});
