import NetInfo from '@react-native-community/netinfo';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Button } from '../components/Button';
import { Card, HeaderCopy, Screen } from '../components/Layout';
import { StatusBanner } from '../components/Status';
import { useIntake } from '../context/IntakeContext';
import { useStore } from '../context/StoreContext';
import { colors, spacing } from '../theme';
import type { RootStackParamList } from '../types';

export function HomeScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'Home'>) {
  const { ready, drafts } = useIntake();
  const store = useStore();
  const [online, setOnline] = useState(true);
  useEffect(() => NetInfo.addEventListener((state) => setOnline(state.isConnected !== false)), []);
  const pending = drafts.filter((draft) => draft.status !== 'SENT');
  const queued = pending.filter((draft) => draft.status !== 'DRAFT').length;
  const incomplete = pending.filter((draft) => draft.status === 'DRAFT').length;
  if (!ready) return <Screen scroll={false}><ActivityIndicator accessibilityLabel="Carregando dados do aparelho" size="large" color={colors.brand} /></Screen>;
  return <Screen>
    <View style={styles.brandRow}><View><Text style={styles.brand}>ValidaGiro</Text><Text style={styles.store} numberOfLines={1}>{store.storeName}</Text></View><View accessible accessibilityLabel={`Operador ${store.operatorName}`} style={styles.avatar}><Text style={styles.avatarText}>{store.operatorName.slice(0, 2).toUpperCase()}</Text></View></View>
    {!online ? <StatusBanner type="offline" title="Sem conexão" description="Seus rascunhos continuam salvos neste aparelho." /> : null}
    <HeaderCopy title="Registrar produto" description="Leia o código para cadastrar um novo lote." />
    <Card>
      <View accessibilityElementsHidden style={styles.scanIcon}><Text style={styles.scanIconText}>▥</Text></View>
      <Text style={styles.cardTitle}>Leitura rápida</Text>
      <Text style={styles.cardCopy}>Use a câmera do celular para identificar o produto.</Text>
      <Button label="Ler código de barras" onPress={() => navigation.navigate('CameraPermission')} />
    </Card>
    <Button label="Digitar código" variant="secondary" onPress={() => navigation.navigate('ManualBarcode')} />
    {pending.length ? <Card>
      <Text style={styles.pendingTitle}>{pending.length} {pending.length === 1 ? 'registro pendente' : 'registros pendentes'}</Text>
      <Text style={styles.cardCopy}>{queued} aguardando envio · {incomplete} {incomplete === 1 ? 'rascunho' : 'rascunhos'}</Text>
      <Button label="Ver pendências" variant="text" onPress={() => navigation.navigate('Queue')} />
    </Card> : null}
  </Screen>;
}

const styles = StyleSheet.create({
  brandRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, brand: { color: colors.brandDark, fontSize: 20, fontWeight: '900' }, store: { color: colors.muted, fontSize: 14 }, avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#DCE9FF', alignItems: 'center', justifyContent: 'center' }, avatarText: { color: colors.brandDark, fontWeight: '800' },
  scanIcon: { width: 56, height: 56, borderRadius: 16, backgroundColor: '#E7F0FF', alignItems: 'center', justifyContent: 'center' }, scanIconText: { fontSize: 28, color: colors.brand },
  cardTitle: { fontSize: 19, fontWeight: '800', color: colors.text }, cardCopy: { fontSize: 15, lineHeight: 22, color: colors.muted, marginBottom: spacing.sm }, pendingTitle: { fontSize: 17, fontWeight: '800', color: colors.text },
});
