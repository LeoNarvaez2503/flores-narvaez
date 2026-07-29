/**
 * Sección "Los más vendidos": rail horizontal de vinos comerciales (estilo
 * "LOS MÁS VENDIDOS DE LA SEMANA" de 212 Global).
 */
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { cardShadow, colors, fontWeight, radii, spacing } from '../theme/tokens';
import { Rating, WineThumb } from './primitives';
import type { WineSearchResult } from '../types';

function Card({ wine, onPress }: { wine: WineSearchResult; onPress?: () => void }) {
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.thumbWrap}>
        <WineThumb size={92} />
        <View style={styles.tag}>
          <Text style={styles.tagText}>TOP</Text>
        </View>
      </View>
      <Text style={styles.name} numberOfLines={2}>{wine.name}</Text>
      <Text style={styles.winery} numberOfLines={1}>{wine.wineryName}</Text>
      <Rating value={wine.rating} count={wine.reviewCount} />
      <Text style={styles.price}>desde ${wine.bestPrice.toFixed(2)}</Text>
    </Pressable>
  );
}

export function BestSellers({
  wines,
  onSelect,
}: {
  wines: WineSearchResult[];
  onSelect: (wineId: string) => void;
}) {
  if (wines.length === 0) return null;
  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Text style={styles.title}>Los más vendidos</Text>
        <Text style={styles.subtitle}>Las etiquetas que vuelan de los estantes</Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {wines.map((w) => (
          <Card key={w.id} wine={w} onPress={() => onSelect(w.id)} />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.sm },
  header: { gap: 2 },
  title: { fontSize: 18, fontWeight: fontWeight.bold, color: colors.ink },
  subtitle: { fontSize: 13, color: colors.inkMuted },
  row: { gap: spacing.md, paddingVertical: spacing.xs, paddingRight: spacing.lg },
  card: {
    width: 150,
    backgroundColor: colors.creamCard,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: 3,
    ...cardShadow,
  },
  thumbWrap: { alignItems: 'center', marginBottom: spacing.xs },
  tag: {
    position: 'absolute',
    top: 2,
    left: 2,
    backgroundColor: colors.gold,
    borderRadius: radii.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  tagText: { fontSize: 9, fontWeight: fontWeight.bold, color: colors.wineDark, letterSpacing: 0.5 },
  name: { fontSize: 14, fontWeight: fontWeight.bold, color: colors.ink, lineHeight: 17 },
  winery: { fontSize: 12, color: colors.inkMuted },
  price: { fontSize: 16, fontWeight: fontWeight.bold, color: colors.wine, marginTop: 2 },
});
