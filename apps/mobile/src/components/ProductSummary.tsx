import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { colors } from '../theme';
import type { IntakeDraft } from '../types';
import { Card } from './Layout';

export function BarcodeValue({ value }: { value: string }) {
  return <Text accessibilityLabel={`Código ${value.split('').join(' ')}`} selectable style={styles.barcode}>{value}</Text>;
}

export function ProductSummary({ draft, found }: { draft: IntakeDraft; found?: boolean }) {
  const product = draft.existingProduct ?? draft.product;
  return <Card>
    {found !== undefined ? <Text style={styles.badge}>{found ? 'Produto encontrado' : 'Produto novo'}</Text> : null}
    <Text style={styles.name}>{product?.name || 'Produto novo'}</Text>
    {'brand' in (product ?? {}) && product?.brand ? <Text style={styles.detail}>{product.brand}</Text> : null}
    <BarcodeValue value={draft.barcode} />
  </Card>;
}

const styles = StyleSheet.create({
  badge: { color: colors.success, fontSize: 13, fontWeight: '800' },
  name: { color: colors.text, fontSize: 20, fontWeight: '800' }, detail: { color: colors.muted, fontSize: 15 },
  barcode: { color: colors.text, fontSize: 17, letterSpacing: 1.4, fontVariant: ['tabular-nums'], flexShrink: 1 },
});
