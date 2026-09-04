import { Ionicons } from '@expo/vector-icons';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Card, EmptyState, HeaderCopy, LoadingView, Screen, SearchField, StatusBadge } from '../components/ui';
import { useInventory } from '../context/InventoryContext';
import type { MainTabParamList, RootStackParamList } from '../navigation/types';
import { colors, spacing } from '../theme';
import type { ExpiryLevel } from '../types';
import { expiryLevel, formatDate } from '../utils';

type Props = CompositeScreenProps<BottomTabScreenProps<MainTabParamList, 'Estoque'>, NativeStackScreenProps<RootStackParamList>>;
type Filter = 'ALL' | ExpiryLevel;

export function InventoryScreen({ navigation }: Props) {
  const { ready, inventory } = useInventory();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('ALL');
  const filtered = useMemo(() => inventory.filter(({ product, batch }) => {
    const term = search.trim().toLocaleLowerCase('pt-BR');
    const matchesSearch = !term || `${product.name} ${product.brand || ''} ${product.barcode} ${batch.batchNumber || ''} ${batch.locationName}`.toLocaleLowerCase('pt-BR').includes(term);
    return matchesSearch && (filter === 'ALL' || expiryLevel(batch.expiryDate) === filter);
  }), [filter, inventory, search]);

  if (!ready) return <LoadingView />;
  return (
    <Screen>
      <HeaderCopy title="Estoque" description={`${inventory.length} ${inventory.length === 1 ? 'lote cadastrado' : 'lotes cadastrados'}`} />
      <SearchField value={search} onChangeText={setSearch} placeholder="Produto, código, lote ou local" />
      <View style={styles.filters}>
        {([['ALL', 'Todos'], ['CRITICAL', 'Críticos'], ['URGENT', 'Urgentes'], ['ATTENTION', 'Atenção'], ['LONG', 'Longo prazo']] as [Filter, string][]).map(([value, label]) => (
          <Pressable key={value} style={[styles.filter, filter === value && styles.filterActive]} onPress={() => setFilter(value)}><Text style={[styles.filterText, filter === value && styles.filterTextActive]}>{label}</Text></Pressable>
        ))}
      </View>
      {!filtered.length ? (
        <EmptyState icon="cube-outline" title={inventory.length ? 'Nenhum lote encontrado' : 'Estoque vazio'} description={inventory.length ? 'Tente buscar por outro termo ou remova o filtro.' : 'Registre produtos pela tela inicial para vê-los aqui.'} />
      ) : filtered.map(({ product, batch }) => (
        <Card key={batch.id} onPress={() => navigation.navigate('ProductDetail', { barcode: product.barcode })}>
          <View style={styles.topRow}>
            <View style={styles.productIcon}><Ionicons name="cube-outline" size={25} color={colors.brand} /></View>
            <View style={styles.flex}><Text style={styles.name}>{product.name}</Text><Text style={styles.meta}>{product.brand || product.categoryName} · {product.barcode}</Text></View>
            <Ionicons name="chevron-forward" size={20} color={colors.muted} />
          </View>
          <View style={styles.detailRow}>
            <StatusBadge level={expiryLevel(batch.expiryDate)} compact />
            <Text style={styles.expiry}>{formatDate(batch.expiryDate)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detail}><Ionicons name="location-outline" size={14} /> {batch.locationName}</Text>
            <Text style={styles.quantity}>{batch.quantity} un.</Text>
          </View>
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  filter: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  filterActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  filterText: { color: colors.muted, fontSize: 12, fontWeight: '800' },
  filterTextActive: { color: '#fff' },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  productIcon: { width: 46, height: 46, borderRadius: 13, backgroundColor: colors.brandSoft, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 },
  name: { color: colors.text, fontSize: 17, fontWeight: '900' },
  meta: { color: colors.muted, fontSize: 12, marginTop: 2 },
  detailRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  expiry: { color: colors.text, fontWeight: '800' },
  detail: { color: colors.muted, fontSize: 14 },
  quantity: { color: colors.brandDark, fontSize: 15, fontWeight: '900' },
});
