/**
 * Variación B (Comparar precios): un mismo vino en varias tiendas, con la más
 * barata destacada (MEJOR PRECIO) y un CTA para reservar en la más barata.
 * Incluye una variante compacta para listar otros vinos.
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { cardShadow, colors, fontWeight, radii, spacing } from '../theme/tokens';
import { Icon } from './Icon';
import { Rating, WineThumb } from './primitives';
import type { PriceComparison } from '../types';

export function PriceCompareCard({
  data,
  onReserve,
  onPressWine,
}: {
  data: PriceComparison;
  onReserve?: (storeId: string, price: number) => void;
  onPressWine?: () => void;
}) {
  const cheapest = data.offers.reduce((min, o) => (o.price < min.price ? o : min), data.offers[0]);

  return (
    <View style={styles.card}>
      {/* Encabezado del vino */}
      <Pressable style={styles.header} onPress={onPressWine}>
        <WineThumb size={64} />
        <View style={styles.headerBody}>
          <Text style={styles.title}>
            {data.wine.name}
            {data.wine.vintage ? <Text style={styles.vintage}> {data.wine.vintage}</Text> : null}
          </Text>
          <Text style={styles.winery}>{data.wine.wineryName}</Text>
          <Rating value={data.wine.rating} count={data.wine.reviewCount} />
        </View>
        <Pressable hitSlop={6}>
          <Icon name="heart" size={18} color={colors.wine} />
        </Pressable>
      </Pressable>

      {/* Subtítulo */}
      <View style={styles.subRow}>
        <Icon name="list" size={16} color={colors.inkMuted} />
        <Text style={styles.subText}>
          Mismo vino en <Text style={styles.subStrong}>{data.offers.length} tiendas cercanas</Text>
        </Text>
      </View>

      {/* Ofertas */}
      <View style={styles.offers}>
        {data.offers.map((o) => (
          <View key={o.store.id} style={[styles.offer, o.bestPrice && styles.offerBest]}>
            <View style={styles.offerLeft}>
              <View style={styles.offerNameRow}>
                <Text style={styles.offerName}>{o.store.name}</Text>
                {o.bestPrice && (
                  <View style={styles.bestTag}>
                    <Text style={styles.bestTagText}>MEJOR PRECIO</Text>
                  </View>
                )}
              </View>
              <View style={styles.offerDist}>
                <Icon name="pin" size={11} color={colors.inkMuted} />
                <Text style={styles.offerDistText}>{o.store.distanceKm} km</Text>
              </View>
            </View>
            <Text style={[styles.offerPrice, o.bestPrice && styles.offerPriceBest]}>
              ${o.price.toFixed(2)}
            </Text>
          </View>
        ))}
      </View>

      {/* CTA */}
      <Pressable
        style={styles.cta}
        onPress={() => onReserve?.(cheapest.store.id, cheapest.price)}
      >
        <Text style={styles.ctaText}>
          Reservar en la más barata · ${cheapest.price.toFixed(2)}
        </Text>
      </Pressable>
    </View>
  );
}

export function PriceCompareCompact({
  data,
  onPress,
}: {
  data: PriceComparison;
  onPress?: () => void;
}) {
  const cheapest = data.offers.reduce((min, o) => (o.price < min.price ? o : min), data.offers[0]);
  return (
    <Pressable style={styles.compact} onPress={onPress}>
      <WineThumb size={52} />
      <View style={styles.compactBody}>
        <Text style={styles.title}>{data.wine.name}</Text>
        <Text style={styles.winery}>{data.wine.wineryName} · desde</Text>
      </View>
      <Text style={styles.compactPrice}>${cheapest.price.toFixed(2)}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.creamCard,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.md,
    ...cardShadow,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  headerBody: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 16,
    fontWeight: fontWeight.bold,
    color: colors.ink,
  },
  vintage: {
    fontWeight: fontWeight.medium,
    color: colors.inkMuted,
  },
  winery: {
    fontSize: 13,
    color: colors.inkMuted,
  },
  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: colors.creamBorder,
    paddingTop: spacing.md,
  },
  subText: {
    fontSize: 13,
    color: colors.inkMuted,
  },
  subStrong: {
    fontWeight: fontWeight.bold,
    color: colors.ink,
  },
  offers: {
    gap: spacing.sm,
  },
  offer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.creamSubtle,
  },
  offerBest: {
    backgroundColor: colors.goldSoft,
    borderWidth: 1,
    borderColor: colors.gold,
  },
  offerLeft: {
    gap: 3,
  },
  offerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  offerName: {
    fontSize: 14,
    fontWeight: fontWeight.semibold,
    color: colors.ink,
  },
  bestTag: {
    backgroundColor: colors.wine,
    borderRadius: radii.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  bestTagText: {
    fontSize: 9,
    fontWeight: fontWeight.bold,
    color: colors.white,
    letterSpacing: 0.4,
  },
  offerDist: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  offerDistText: {
    fontSize: 12,
    color: colors.inkMuted,
  },
  offerPrice: {
    fontSize: 17,
    fontWeight: fontWeight.bold,
    color: colors.ink,
  },
  offerPriceBest: {
    color: colors.wine,
  },
  cta: {
    backgroundColor: colors.wine,
    borderRadius: radii.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  ctaText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: fontWeight.bold,
  },
  compact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.creamCard,
    borderRadius: radii.lg,
    padding: spacing.md,
    ...cardShadow,
  },
  compactBody: {
    flex: 1,
    gap: 2,
  },
  compactPrice: {
    fontSize: 18,
    fontWeight: fontWeight.bold,
    color: colors.wine,
  },
});
