import { Ionicons } from '@expo/vector-icons';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Button, Card, EmptyState, LoadingView, Screen, SectionTitle, StatusBadge } from '../components/ui';
import { useInventory } from '../context/InventoryContext';
import type { MainTabParamList, RootStackParamList } from '../navigation/types';
import { colors, spacing } from '../theme';
import { daysUntil, expiryLevel, formatDate } from '../utils';

type Props = CompositeScreenProps<BottomTabScreenProps<MainTabParamList, 'Inicio'>, NativeStackScreenProps<RootStackParamList>>;

export function HomeScreen({ navigation }: Props) {
  const { ready, error, inventory, drafts, refresh } = useInventory();
  if (!ready) return <LoadingView />;

  const critical = inventory.filter(({ batch }) => daysUntil(batch.expiryDate) <= 14).length;
  const units = inventory.reduce((sum, item) => sum + item.batch.quantity, 0);
  const next = inventory[0];

  return (
    <Screen>
      <View style={styles.brandRow}>
        <View>
          <Text style={styles.eyebrow}>MINHA LOJA</Text>
          <Text style={styles.brand}>ValidaGiro</Text>
        </View>
        <Pressable accessibilityLabel="Abrir configurações" onPress={() => navigation.navigate('Settings')} style={styles.avatar}>
          <Ionicons name="settings-outline" size={23} color={colors.brandDark} />
        </Pressable>
      </View>

      {error ? (
        <Card style={styles.errorCard}><Text style={styles.errorTitle}>Não foi possível carregar os dados</Text><Text style={styles.muted}>{error}</Text><Button label="Tentar novamente" onPress={refresh} variant="secondary" /></Card>
      ) : null}

      <Card style={styles.scanCard}>
        <View style={styles.scanIcon}><Ionicons name="barcode-outline" size={38} color="#fff" /></View>
        <View style={styles.scanCopy}>
          <Text style={styles.scanTitle}>Registrar produto</Text>
          <Text style={styles.scanText}>Leia o código para cadastrar um novo lote.</Text>
        </View>
        <Button label="Ler código de barras" icon="camera-outline" onPress={() => navigation.navigate('Scanner')} />
        <Button label="Digitar código" icon="keypad-outline" variant="secondary" onPress={() => navigation.navigate('ManualBarcode')} />
      </Card>

      <View style={styles.stats}>
        <Card style={styles.statCard}>
          <Ionicons name="cube-outline" size={23} color={colors.brand} />
          <Text style={styles.statValue}>{units}</Text>
          <Text style={styles.statLabel}>unidades</Text>
        </Card>
        <Card style={[styles.statCard, critical > 0 && styles.criticalStat]}>
          <Ionicons name="warning-outline" size={23} color={critical > 0 ? colors.danger : colors.success} />
          <Text style={styles.statValue}>{critical}</Text>
          <Text style={styles.statLabel}>itens críticos</Text>
        </Card>
        <Card style={styles.statCard}>
          <Ionicons name="layers-outline" size={23} color={colors.purple} />
          <Text style={styles.statValue}>{inventory.length}</Text>
          <Text style={styles.statLabel}>lotes</Text>
        </Card>
      </View>

      {drafts.length ? (
        <Card onPress={() => navigation.navigate('Drafts')} style={styles.draftCard}>
          <View style={styles.row}><Ionicons name="document-text-outline" size={24} color={colors.warning} /><View style={styles.flex}><Text style={styles.cardTitle}>{drafts.length} {drafts.length === 1 ? 'rascunho salvo' : 'rascunhos salvos'}</Text><Text style={styles.muted}>Continue de onde parou.</Text></View><Ionicons name="chevron-forward" size={22} color={colors.muted} /></View>
        </Card>
      ) : null}

      <SectionTitle>Próximo vencimento</SectionTitle>
      {next ? (
        <Card onPress={() => navigation.navigate('ProductDetail', { barcode: next.product.barcode })}>
          <View style={styles.rowBetween}>
            <View style={styles.flex}>
              <Text style={styles.cardTitle}>{next.product.name}</Text>
              <Text style={styles.muted}>{next.product.brand || next.product.categoryName}</Text>
            </View>
            <StatusBadge level={expiryLevel(next.batch.expiryDate)} compact />
          </View>
          <View style={styles.rowBetween}><Text style={styles.location}><Ionicons name="location-outline" size={15} /> {next.batch.locationName}</Text><Text style={styles.expiry}>{formatDate(next.batch.expiryDate)}</Text></View>
        </Card>
      ) : (
        <EmptyState icon="cube-outline" title="Seu estoque começa aqui" description="Registre o primeiro lote para acompanhar validade, localização e quantidade." />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  brandRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  eyebrow: { color: colors.muted, fontSize: 11, fontWeight: '800', letterSpacing: 1.2 },
  brand: { color: colors.brandDark, fontSize: 25, fontWeight: '900' },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#DCE9FF', alignItems: 'center', justifyContent: 'center' },
  scanCard: { borderColor: '#C7DBFF', backgroundColor: '#F9FBFF' },
  scanIcon: { width: 62, height: 62, borderRadius: 18, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center' },
  scanCopy: { gap: 3 },
  scanTitle: { fontSize: 22, fontWeight: '900', color: colors.text },
  scanText: { fontSize: 15, lineHeight: 21, color: colors.muted },
  stats: { flexDirection: 'row', gap: spacing.sm },
  statCard: { flex: 1, padding: 12, gap: 2, minHeight: 112, justifyContent: 'center' },
  criticalStat: { backgroundColor: colors.dangerBg, borderColor: '#F1B7B3' },
  statValue: { fontSize: 23, fontWeight: '900', color: colors.text },
  statLabel: { fontSize: 11, lineHeight: 14, color: colors.muted },
  draftCard: { backgroundColor: colors.warningBg },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  flex: { flex: 1 },
  cardTitle: { color: colors.text, fontSize: 16, fontWeight: '900' },
  muted: { color: colors.muted, fontSize: 14, lineHeight: 20 },
  location: { color: colors.muted, fontSize: 14 },
  expiry: { color: colors.text, fontSize: 14, fontWeight: '800' },
  errorCard: { backgroundColor: colors.dangerBg },
  errorTitle: { color: colors.danger, fontSize: 16, fontWeight: '900' },
});
