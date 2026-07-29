/**
 * Sidebar de filtros (estilo tienda 212): secciones Tipo, Mundo y Precio.
 * Tipo/Mundo filtran por término (reusa la búsqueda); Precio filtra por rango.
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fontWeight, radii, spacing } from '../theme/tokens';
import type { CategoryCount } from '../types';

export type PriceBucket = 'all' | 'lt15' | 'mid' | 'gt25';

const PRICES: { key: PriceBucket; label: string }[] = [
  { key: 'all', label: 'Todos los precios' },
  { key: 'lt15', label: 'Hasta $15' },
  { key: 'mid', label: '$15 a $25' },
  { key: 'gt25', label: 'Más de $25' },
];

export function priceInBucket(price: number, b: PriceBucket): boolean {
  if (b === 'lt15') return price < 15;
  if (b === 'mid') return price >= 15 && price <= 25;
  if (b === 'gt25') return price > 25;
  return true;
}

interface Props {
  term: string;
  onTerm: (t: string) => void;
  price: PriceBucket;
  onPrice: (p: PriceBucket) => void;
  byType: CategoryCount[];
  byWorld: CategoryCount[];
}

function Row({ label, count, active, onPress }: { label: string; count?: number; active: boolean; onPress: () => void }) {
  return (
    <Pressable style={styles.row} onPress={onPress}>
      <Text style={[styles.rowText, active && styles.rowActive]} numberOfLines={1}>{label}</Text>
      {count !== undefined && <Text style={styles.count}>{count}</Text>}
    </Pressable>
  );
}

export function FilterSidebar({ term, onTerm, price, onPrice, byType, byWorld }: Props) {
  const hasFilters = term !== '' || price !== 'all';
  return (
    <View style={styles.sidebar}>
      <View style={styles.headerRow}>
        <Text style={styles.heading}>Filtros</Text>
        {hasFilters && (
          <Pressable onPress={() => { onTerm(''); onPrice('all'); }}>
            <Text style={styles.clear}>Limpiar</Text>
          </Pressable>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.title}>Tipo</Text>
        {byType.map((c) => (
          <Row key={c.key} label={c.label} count={c.count} active={term === c.key} onPress={() => onTerm(term === c.key ? '' : c.key)} />
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.title}>Origen</Text>
        {byWorld.map((c) => (
          <Row key={c.key} label={c.label} count={c.count} active={term === c.key} onPress={() => onTerm(term === c.key ? '' : c.key)} />
        ))}
      </View>

      <View style={styles.sectionLast}>
        <Text style={styles.title}>Precio</Text>
        {PRICES.map((p) => (
          <Row key={p.key} label={p.label} active={price === p.key} onPress={() => onPrice(p.key)} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: { width: 220 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  heading: { fontSize: 16, fontWeight: fontWeight.bold, color: colors.ink },
  clear: { fontSize: 13, color: colors.wine, fontWeight: fontWeight.semibold },
  section: { marginBottom: spacing.lg, paddingBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.creamBorder },
  sectionLast: { marginBottom: spacing.lg },
  title: { fontSize: 14, fontWeight: fontWeight.bold, color: colors.ink, marginBottom: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 5 },
  rowText: { fontSize: 14, color: colors.inkMuted, flex: 1 },
  rowActive: { color: colors.wine, fontWeight: fontWeight.bold },
  count: { fontSize: 12, color: colors.inkFaint, marginLeft: spacing.sm },
});
