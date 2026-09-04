import { Ionicons } from '@expo/vector-icons';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Card, EmptyState, HeaderCopy, Screen, StatusBadge } from '../components/ui';
import { useInventory } from '../context/InventoryContext';
import type { MainTabParamList, RootStackParamList } from '../navigation/types';
import { colors } from '../theme';
import type { ExpiryLevel } from '../types';
import { daysUntil, expiryLevel, expiryMeta, formatDate } from '../utils';

type Props = CompositeScreenProps<BottomTabScreenProps<MainTabParamList, 'Alertas'>, NativeStackScreenProps<RootStackParamList>>;
const order: ExpiryLevel[] = ['EXPIRED', 'CRITICAL', 'URGENT', 'ATTENTION', 'LONG'];

export function AlertsScreen({ navigation }: Props) {
  const { inventory } = useInventory();
  const groups = order.map((level) => ({ level, items: inventory.filter(({ batch }) => expiryLevel(batch.expiryDate) === level) }));
  const actionable = inventory.filter(({ batch }) => daysUntil(batch.expiryDate) <= 60);
  return (
    <Screen>
      <HeaderCopy title="Alertas de validade" description={actionable.length ? `${actionable.length} ${actionable.length === 1 ? 'lote exige' : 'lotes exigem'} atenção nos próximos 60 dias.` : 'Tudo certo: nenhum lote vence nos próximos 60 dias.'} />
      <Card style={styles.legend}>
        {order.slice(1).map((level) => { const meta = expiryMeta[level]; return <View key={level} style={styles.legendRow}><View style={[styles.legendIcon, { backgroundColor: meta.background }]}><View style={[styles.dot, { backgroundColor: meta.color }]} /></View><View style={styles.flex}><Text style={[styles.legendTitle, { color: meta.color }]}>{meta.label}</Text><Text style={styles.legendText}>{meta.short}</Text></View><Text style={styles.count}>{groups.find((group) => group.level === level)?.items.length ?? 0}</Text></View>; })}
      </Card>
      {!inventory.length ? <EmptyState icon="notifications-outline" title="Nenhum alerta" description="Os alertas aparecem automaticamente quando você registra lotes." /> : groups.map(({ level, items }) => items.length ? (
        <View key={level} style={styles.group}>
          <View style={styles.groupTitle}><StatusBadge level={level} /><Text style={styles.groupCount}>{items.length}</Text></View>
          {items.map(({ product, batch }) => (
            <Card key={batch.id} onPress={() => navigation.navigate('ProductDetail', { barcode: product.barcode })}>
              <View style={styles.row}><View style={styles.flex}><Text style={styles.name}>{product.name}</Text><Text style={styles.meta}>{batch.locationName} · {batch.quantity} un.</Text></View><Ionicons name="chevron-forward" size={20} color={colors.muted} /></View>
              <View style={styles.row}><Text style={styles.date}>{formatDate(batch.expiryDate)}</Text><Text style={[styles.days, { color: expiryMeta[level].color }]}>{daysUntil(batch.expiryDate) < 0 ? `${Math.abs(daysUntil(batch.expiryDate))} dias vencido` : daysUntil(batch.expiryDate) === 0 ? 'vence hoje' : `${daysUntil(batch.expiryDate)} dias`}</Text></View>
            </Card>
          ))}
        </View>
      ) : null)}
    </Screen>
  );
}

const styles = StyleSheet.create({
  legend: { gap: 10 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  legendIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 11, height: 11, borderRadius: 6 },
  flex: { flex: 1 },
  legendTitle: { fontWeight: '900', fontSize: 14 },
  legendText: { color: colors.muted, fontSize: 12 },
  count: { color: colors.text, fontSize: 18, fontWeight: '900' },
  group: { gap: 10 },
  groupTitle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  groupCount: { color: colors.muted, fontWeight: '800' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  name: { color: colors.text, fontSize: 16, fontWeight: '900' },
  meta: { color: colors.muted, fontSize: 13, marginTop: 2 },
  date: { color: colors.text, fontWeight: '800' },
  days: { fontSize: 13, fontWeight: '900' },
});
