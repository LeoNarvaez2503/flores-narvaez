/**
 * Logo de la marca CavaLocal: un pin de mapa burdeos con una copa de vino,
 * acento dorado y un diamante dorado bajo la punta. (Distinto de la mascota Cavi.)
 */
import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import Svg, { Ellipse, Path, Rect } from 'react-native-svg';
import { colors, fontWeight } from '../theme/tokens';

const serif = Platform.select({
  web: 'Georgia, "Times New Roman", serif',
  ios: 'Georgia',
  default: 'serif',
});

/** Marca gráfica (pin + copa), sin texto. */
export function LogoMark({ size = 96 }: { size?: number }) {
  const w = size;
  const h = size * 1.32;
  return (
    <Svg width={w} height={h} viewBox="0 0 100 132">
      {/* Cuerpo del pin */}
      <Path
        d="M50 6 C26 6 7 25 7 49 C7 79 50 120 50 120 C50 120 93 79 93 49 C93 25 74 6 50 6 Z"
        fill={colors.wine}
      />
      {/* Acento dorado (borde interno derecho) */}
      <Path
        d="M50 12 C71 12 88 28 88 49 C88 71 64 100 52 114"
        stroke={colors.gold}
        strokeWidth={2.5}
        fill="none"
        strokeLinecap="round"
        opacity={0.9}
      />

      {/* Copa de vino (blanca) */}
      {/* Bowl */}
      <Path d="M35 30 H65 C65 48 57 57 50 58 C43 57 35 48 35 30 Z" fill={colors.white} />
      {/* Vino dentro del bowl */}
      <Path d="M38 41 C44 46 56 46 62 41 C61 50 56 55 50 56 C44 55 39 50 38 41 Z" fill={colors.wine} />
      {/* Tallo */}
      <Rect x={48.5} y={58} width={3} height={18} fill={colors.white} />
      {/* Base */}
      <Ellipse cx={50} cy={77} rx={10} ry={2.6} fill={colors.white} />

      {/* Diamante dorado bajo la punta */}
      <Path d="M50 96 L57 102 L50 108 L43 102 Z" fill={colors.gold} />
      <Path d="M50 99 L54 102 L50 105 L46 102 Z" fill={colors.wine} />
    </Svg>
  );
}

/** Texto de marca "CavaLocal" (serif). */
export function Wordmark({ size = 30, color }: { size?: number; color?: string }) {
  return (
    <Text style={[styles.wordmark, { fontSize: size }, color ? { color } : null]}>
      CavaLocal
    </Text>
  );
}

/** Logo completo: marca gráfica + texto. */
export function Logo({ size = 96 }: { size?: number }) {
  return (
    <View style={styles.wrap}>
      <LogoMark size={size} />
      <Wordmark size={size * 0.34} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 6 },
  wordmark: {
    fontFamily: serif,
    fontWeight: fontWeight.bold,
    color: colors.wine,
    letterSpacing: 0.5,
  },
});
