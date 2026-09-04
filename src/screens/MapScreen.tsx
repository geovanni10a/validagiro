import { Ionicons } from '@expo/vector-icons';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button, Card, EmptyState, HeaderCopy, Screen } from '../components/ui';
import { useInventory } from '../context/InventoryContext';
import type { MainTabParamList, RootStackParamList } from '../navigation/types';
import { colors } from '../theme';
import { expiryLevel, expiryMeta } from '../utils';

type Props = CompositeScreenProps<BottomTabScreenProps<MainTabParamList, 'Mapa'>, NativeStackScreenProps<RootStackParamList>>;

export function MapScreen({ navigation }: Props) {
  const { locations, inventory } = useInventory();
  return (
    <Screen>
      <HeaderCopy title="Mapa do estoque" description="Localize produtos rapidamente e identifique a validade pelas cores." />
      <Button label="Abrir estoque 3D interativo" icon="cube-outline" onPress={() => navigation.navigate('Warehouse3D')} />
      {!inventory.length ? <EmptyState icon="map-outline" title="Mapa ainda vazio" description="Ao registrar lotes, cada local ganha uma visão visual do estoque." /> : locations.map((location) => {
        const items = inventory.filter(({ batch }) => batch.locationId === location.id);
        if (!items.length) return null;
        return (
          <Card key={location.id}>
            <View style={styles.locationHeader}>
              <View style={styles.locationIcon}><Ionicons name={location.code === 'CONG-01' ? 'snow-outline' : location.code === 'GEL-01' ? 'thermometer-outline' : 'business-outline'} size={24} color={colors.brand} /></View>
              <View style={styles.flex}><Text style={styles.locationName}>{location.name}</Text><Text style={styles.path}>{location.path || location.code}</Text></View>
              <Text style={styles.count}>{items.length}</Text>
            </View>
            <View style={styles.shelf}>
              {items.map(({ product, batch }) => {
                const meta = expiryMeta[expiryLevel(batch.expiryDate)];
                return (
                  <View key={batch.id} style={styles.slotWrap}>
                    <View style={styles.slot}>
                      <View style={[styles.colorBar, { backgroundColor: meta.color }]} />
                      <Text style={styles.slotName} numberOfLines={2}>{product.name}</Text>
                      <Text style={styles.slotQty}>{batch.quantity} un.</Text>
                    </View>
                  </View>
                );
              })}
            </View>
            {items.map(({ product, batch }) => (
              <Card key={`row-${batch.id}`} onPress={() => navigation.navigate('ProductDetail', { barcode: product.barcode })} style={styles.productRow}>
                <View style={[styles.productDot, { backgroundColor: expiryMeta[expiryLevel(batch.expiryDate)].color }]} />
                <Text numberOfLines={1} style={styles.productName}>{product.name}</Text>
                <Ionicons name="chevron-forward" size={18} color={colors.muted} />
              </Card>
            ))}
          </Card>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  locationHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  locationIcon: { width: 48, height: 48, borderRadius: 14, backgroundColor: colors.brandSoft, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 },
  locationName: { color: colors.text, fontSize: 18, fontWeight: '900' },
  path: { color: colors.muted, fontSize: 12 },
  count: { color: colors.brandDark, fontWeight: '900', fontSize: 20 },
  shelf: { flexDirection: 'row', flexWrap: 'wrap', backgroundColor: '#E9EDF3', borderRadius: 12, padding: 8, borderBottomWidth: 5, borderBottomColor: '#9DA8B5' },
  slotWrap: { width: '33.333%', padding: 4 },
  slot: { minHeight: 82, backgroundColor: colors.surface, borderRadius: 8, padding: 7, justifyContent: 'space-between', overflow: 'hidden' },
  colorBar: { height: 6, marginHorizontal: -7, marginTop: -7, marginBottom: 5 },
  slotName: { color: colors.text, fontSize: 11, lineHeight: 14, fontWeight: '800' },
  slotQty: { color: colors.muted, fontSize: 10, fontWeight: '700' },
  productRow: { borderRadius: 12, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 8, shadowOpacity: 0, elevation: 0 },
  productDot: { width: 10, height: 10, borderRadius: 5 },
  productName: { flex: 1, color: colors.text, fontSize: 14, fontWeight: '700' },
});
