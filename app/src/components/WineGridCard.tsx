/**
 * Tarjeta de vino VERTICAL para la grilla del catálogo (estilo e-commerce 212:
 * imagen arriba, cuerpo abajo con marca, nombre, precio y CTA).
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { cardShadow, colors, fontWeight, radii, spacing } from '../theme/tokens';
import { Icon } from './Icon';
import { Rating, StockBadge, WineThumb } from './primitives';
import type { WineSearchResult } from '../types';

export function WineGridCard({
  wine,
  onPress,
  onReserve,
}: {
  wine: WineSearchResult;
  onPress?: () => void;
  onReserve?: () => void;
}) {
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.imgWrap}>
        <WineThumb size={112} />
        <Pressable style={styles.heart} hitSlop={6}>
          <Icon name="heart" size={15} color={colors.wine} />
        </Pressable>
        <View style={styles.stockOverlay}>
          <StockBadge stock={wine.stock} />
        </View>
      </View>

      <View style={styles.body}>
        <Text style={styles.winery} numberOfLines={1}>{wine.wineryName.toUpperCase()}</Text>
        <Text style={styles.name} numberOfLines={2}>
          {wine.name}
          {wine.vintage ? ` ${wine.vintage}` : ''}
        </Text>
        <View style={styles.chip}>
          <Text style={styles.chipText} numberOfLines={1}>{wine.grape} · {wine.region}</Text>
        </View>
        <Rating value={wine.rating} count={wine.reviewCount} />

        <View style={styles.priceRow}>
          <Text style={styles.from}>desde </Text>
          <Text style={styles.price}>${wine.bestPrice.toFixed(2)}</Text>
        </View>
        <Text style={styles.stores}>en {wine.storeCount} tiendas</Text>

        <Pressable style={styles.reserve} onPress={onReserve}>
          <Text style={styles.reserveText}>Reservar</Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.creamCard,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.creamBorder,
    overflow: 'hidden',
    ...cardShadow,
  },
  imgWrap: {
    height: 150,
    backgroundColor: colors.thumbBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heart: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: radii.pill,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...cardShadow,
    shadowOpacity: 0.12,
  },
  stockOverlay: { position: 'absolute', bottom: 8, left: 10 },
  body: { padding: spacing.md, gap: 3 },
  winery: { fontSize: 10, letterSpacing: 0.6, fontWeight: fontWeight.bold, color: colors.gold },
  name: { fontSize: 14, fontWeight: fontWeight.bold, color: colors.ink, lineHeight: 18, minHeight: 36 },
  chip: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: colors.creamBorder,
    backgroundColor: colors.creamSubtle,
    borderRadius: radii.sm,
    paddingHorizontal: 7,
    paddingVertical: 2,
    marginVertical: 2,
    maxWidth: '100%',
  },
  chipText: { fontSize: 10, fontWeight: fontWeight.semibold, color: colors.wine },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 4 },
  from: { fontSize: 11, color: colors.inkMuted },
  price: { fontSize: 20, fontWeight: fontWeight.bold, color: colors.wine },
  stores: { fontSize: 11, color: colors.gold, fontWeight: fontWeight.semibold },
  reserve: {
    marginTop: spacing.sm,
    backgroundColor: colors.wine,
    borderRadius: radii.sm,
    paddingVertical: 10,
    alignItems: 'center',
  },
  reserveText: { color: colors.white, fontSize: 13, fontWeight: fontWeight.bold },
});
