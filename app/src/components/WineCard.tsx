/**
 * Tarjeta de vino — variación A (Lista clásica).
 * Miniatura + corazón, título/bodega, chip cepa·región, rating, distancia,
 * precio "desde" y badge de stock.
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { cardShadow, colors, fontWeight, radii, spacing } from '../theme/tokens';
import { Icon } from './Icon';
import { Chip, Rating, StockBadge, WineThumb } from './primitives';
import type { WineSearchResult } from '../types';

export function WineCard({ wine, onPress }: { wine: WineSearchResult; onPress?: () => void }) {
  return (
    <Pressable style={styles.card} onPress={onPress}>
      {/* Miniatura con corazón */}
      <View>
        <WineThumb size={80} />
        <Pressable style={styles.heart} hitSlop={6}>
          <Icon
            name={wine.favorite ? 'heart-filled' : 'heart'}
            size={15}
            color={colors.wine}
          />
        </Pressable>
      </View>

      {/* Detalle */}
      <View style={styles.body}>
        <Text style={styles.title}>
          {wine.name}
          {wine.vintage ? <Text style={styles.vintage}> {wine.vintage}</Text> : null}
        </Text>
        <Text style={styles.winery}>{wine.wineryName}</Text>

        <View style={styles.chipRow}>
          <Chip label={`${wine.grape} · ${wine.region}`} />
        </View>

        <Rating value={wine.rating} count={wine.reviewCount} />

        <View style={styles.distanceRow}>
          <Icon name="pin" size={12} color={colors.inkMuted} />
          <Text style={styles.distanceText}>
            {wine.nearestStore.distanceKm} km · {wine.nearestStore.name}
          </Text>
        </View>

        <View style={styles.bottomRow}>
          <View>
            <Text style={styles.from}>desde</Text>
            <Text style={styles.price}>${wine.bestPrice.toFixed(2)}</Text>
            <Text style={styles.stores}>en {wine.storeCount} tiendas →</Text>
          </View>
          <View style={styles.badgeWrap}>
            <StockBadge stock={wine.stock} />
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: colors.creamCard,
    borderRadius: radii.lg,
    padding: spacing.md,
    ...cardShadow,
  },
  heart: {
    position: 'absolute',
    top: 4,
    left: 4,
    width: 24,
    height: 24,
    borderRadius: radii.pill,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...cardShadow,
    shadowOpacity: 0.12,
  },
  body: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: fontWeight.bold,
    color: colors.ink,
  },
  vintage: {
    fontSize: 16,
    fontWeight: fontWeight.medium,
    color: colors.inkMuted,
  },
  winery: {
    fontSize: 13,
    color: colors.inkMuted,
  },
  chipRow: {
    flexDirection: 'row',
    marginVertical: 2,
  },
  distanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  distanceText: {
    fontSize: 12,
    color: colors.inkMuted,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  from: {
    fontSize: 11,
    color: colors.inkMuted,
  },
  price: {
    fontSize: 22,
    fontWeight: fontWeight.bold,
    color: colors.wine,
    lineHeight: 26,
  },
  stores: {
    fontSize: 11,
    color: colors.gold,
    fontWeight: fontWeight.semibold,
  },
  badgeWrap: {
    paddingBottom: 4,
  },
});
