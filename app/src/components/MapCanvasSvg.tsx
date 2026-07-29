/**
 * Lienzo de mapa en SVG (fallback cuando no hay API key de Google Maps).
 * Dibuja calles, un parque, tu posición y los pines de precio.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Rect } from 'react-native-svg';
import { cardShadow, colors, fontWeight, radii } from '../theme/tokens';
import type { DimensionValue } from 'react-native';
import type { MapPin } from '../types';

export const MAP_HEIGHT = 240;

export function MapCanvasSvg({ pins }: { pins: MapPin[] }) {
  return (
    <View style={styles.map}>
      <Svg width="100%" height={MAP_HEIGHT}>
        <Rect x={0} y={0} width="100%" height={MAP_HEIGHT} fill={colors.mapBg} />
        <Line x1="0" y1="80" x2="100%" y2="80" stroke={colors.mapRoad} strokeWidth={10} />
        <Line x1="0" y1="170" x2="100%" y2="170" stroke={colors.mapRoad} strokeWidth={14} />
        <Line x1="120" y1="0" x2="120" y2={MAP_HEIGHT} stroke={colors.mapRoad} strokeWidth={10} />
        <Line x1="250" y1="0" x2="250" y2={MAP_HEIGHT} stroke={colors.mapRoad} strokeWidth={12} />
        <Rect x={150} y={95} width={80} height={60} rx={10} fill={colors.mapPark} />
        <Circle cx={130} cy={130} r={16} fill={colors.wine} opacity={0.18} />
        <Circle cx={130} cy={130} r={7} fill={colors.wine} />
        <Circle cx={130} cy={130} r={3} fill={colors.white} />
      </Svg>

      {pins.map((pin) => (
        <View
          key={pin.id}
          style={[
            styles.pin,
            { left: `${pin.x * 100}%` as DimensionValue, top: `${pin.y * 100}%` as DimensionValue },
          ]}
        >
          <Text style={[styles.pinText, pin.highlighted && styles.pinTextActive]}>
            ${pin.price.toFixed(2)}
          </Text>
          <View style={[styles.pinTail, pin.highlighted && styles.pinTailActive]} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  map: { height: MAP_HEIGHT, overflow: 'hidden', backgroundColor: colors.mapBg },
  pin: { position: 'absolute', transform: [{ translateX: -28 }, { translateY: -16 }], alignItems: 'center' },
  pinText: {
    backgroundColor: colors.white,
    color: colors.ink,
    fontSize: 12,
    fontWeight: fontWeight.bold,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.creamBorder,
    overflow: 'hidden',
    ...cardShadow,
  },
  pinTextActive: { backgroundColor: colors.wine, color: colors.white, borderColor: colors.wine },
  pinTail: {
    width: 8,
    height: 8,
    backgroundColor: colors.white,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.creamBorder,
    transform: [{ rotate: '45deg' }],
    marginTop: -4,
  },
  pinTailActive: { backgroundColor: colors.wine, borderColor: colors.wine },
});
