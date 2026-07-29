/**
 * Primitivas presentacionales reutilizables: Chip, Badge, Rating, WineThumb.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import { colors, fontWeight, radii } from '../theme/tokens';
import { Icon } from './Icon';
import type { StockLabel } from '../types';

/** Chip con etiqueta (cepa·región), estilo contorno. */
export function Chip({ label }: { label: string }) {
  return (
    <View style={styles.chip}>
      <Text style={styles.chipText}>{label}</Text>
    </View>
  );
}

/** Badge de stock: verde "Disponible" / ámbar "Últimas N". */
export function StockBadge({ stock }: { stock: StockLabel }) {
  const isAvail = stock.kind === 'disponible';
  const dot = isAvail ? colors.green : colors.amber;
  const text = isAvail ? colors.green : colors.amber;
  return (
    <View style={styles.badge}>
      <View style={[styles.dot, { backgroundColor: dot }]} />
      <Text style={[styles.badgeText, { color: text }]}>{stock.text}</Text>
    </View>
  );
}

/** Rating: estrella dorada + valor + (reseñas). */
export function Rating({
  value,
  count,
}: {
  value: number;
  count: number;
}) {
  return (
    <View style={styles.rating}>
      <Icon name="star" size={14} color={colors.gold} />
      <Text style={styles.ratingValue}>{value.toFixed(1)}</Text>
      <Text style={styles.ratingCount}>({count})</Text>
    </View>
  );
}

/** Miniatura de botella de vino (SVG) sobre fondo crema. */
export function WineThumb({ size = 74 }: { size?: number }) {
  return (
    <View style={[styles.thumb, { width: size, height: size, borderRadius: radii.md }]}>
      <Svg width={size * 0.5} height={size * 0.78} viewBox="0 0 30 48">
        {/* Botella */}
        <Path
          d="M12 1 h6 v9 c0 2 3 4 3 9 v25 c0 2 -1 3 -3 3 h-6 c-2 0 -3 -1 -3 -3 V19 c0 -5 3 -7 3 -9 z"
          fill={colors.wine}
        />
        {/* Etiqueta */}
        <Rect x={9} y={26} width={12} height={11} rx={1.5} fill={colors.creamCard} opacity={0.92} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: colors.creamBorder,
    borderRadius: radii.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: colors.creamSubtle,
  },
  chipText: {
    fontSize: 11,
    fontWeight: fontWeight.semibold,
    color: colors.wine,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: fontWeight.semibold,
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  ratingValue: {
    fontSize: 13,
    fontWeight: fontWeight.bold,
    color: colors.ink,
  },
  ratingCount: {
    fontSize: 12,
    color: colors.inkMuted,
  },
  thumb: {
    backgroundColor: colors.thumbBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
