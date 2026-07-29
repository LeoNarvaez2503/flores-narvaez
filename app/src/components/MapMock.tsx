/**
 * Variación C (Cerca de ti): área de mapa + panel "Más cercanos primero".
 * El mapa usa Google Maps real en web si hay API key, o un lienzo SVG de
 * fallback (ver MapArea / MapArea.web). El panel reutiliza los resultados.
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { cardShadow, colors, fontWeight, radii, spacing } from '../theme/tokens';
import { Icon } from './Icon';
import { StockBadge } from './primitives';
import { MapArea } from './MapArea';
import type { MapPin, WineSearchResult } from '../types';

function NearbyRow({ wine, onPress }: { wine: WineSearchResult; onPress?: () => void }) {
  return (
    <Pressable style={styles.row} onPress={onPress}>
      <View style={styles.rowThumb}>
        <Icon name="pin" size={18} color={colors.wine} />
      </View>
      <View style={styles.rowBody}>
        <Text style={styles.rowTitle}>{wine.name}</Text>
        <View style={styles.rowMeta}>
          <Icon name="pin" size={11} color={colors.inkMuted} />
          <Text style={styles.rowMetaText}>
            {wine.nearestStore.distanceKm} km · {wine.nearestStore.name}
          </Text>
        </View>
        <View style={styles.rowPriceLine}>
          <Text style={styles.rowPrice}>${wine.bestPrice.toFixed(2)}</Text>
          <StockBadge stock={wine.stock} />
        </View>
      </View>
      <Pressable style={styles.navBtn} onPress={onPress}>
        <Icon name="navigate" size={18} color={colors.white} />
      </Pressable>
    </Pressable>
  );
}

export function MapMock({
  pins,
  nearby,
  onSelectWine,
}: {
  pins: MapPin[];
  nearby: WineSearchResult[];
  onSelectWine?: (wineId: string) => void;
}) {
  return (
    <View style={styles.wrap}>
      <MapArea pins={pins} />
      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Más cercanos primero</Text>
        <View style={{ gap: spacing.md }}>
          {nearby.map((w) => (
            <NearbyRow key={w.id} wine={w} onPress={() => onSelectWine?.(w.id)} />
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  panel: {
    flex: 1,
    marginTop: -spacing.lg,
    backgroundColor: colors.cream,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    gap: spacing.md,
  },
  panelTitle: { fontSize: 15, fontWeight: fontWeight.bold, color: colors.ink },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.creamCard,
    borderRadius: radii.lg,
    padding: spacing.md,
    ...cardShadow,
  },
  rowThumb: {
    width: 46,
    height: 46,
    borderRadius: radii.md,
    backgroundColor: colors.thumbBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: { flex: 1, gap: 3 },
  rowTitle: { fontSize: 15, fontWeight: fontWeight.bold, color: colors.ink },
  rowMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  rowMetaText: { fontSize: 12, color: colors.inkMuted },
  rowPriceLine: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  rowPrice: { fontSize: 16, fontWeight: fontWeight.bold, color: colors.wine },
  navBtn: {
    width: 38,
    height: 38,
    borderRadius: radii.pill,
    backgroundColor: colors.wine,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
