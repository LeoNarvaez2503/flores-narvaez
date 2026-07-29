/**
 * Cavi — la mascota de CavaLocal.
 * Un pin de mapa cartoon (burdeos) con carita y cachetes rosados.
 * Soporta expresiones: feliz, guiño, enamorado, contento.
 */
import React from 'react';
import Svg, {
  Circle,
  Ellipse,
  G,
  Path,
} from 'react-native-svg';
import { colors } from '../theme/tokens';

export type CaviExpression = 'feliz' | 'guino' | 'enamorado' | 'contento';

interface CaviProps {
  size?: number;
  expression?: CaviExpression;
  withSparkle?: boolean;
}

const PIN = colors.wine;
const FACE = colors.white;

function Eyes({ expression }: { expression: CaviExpression }) {
  const eye = { fill: PIN };
  const stroke = {
    stroke: PIN,
    strokeWidth: 3.5,
    strokeLinecap: 'round' as const,
    fill: 'none',
  };

  switch (expression) {
    case 'contento':
      // Ojos cerrados felices (∪ ∪)
      return (
        <G>
          <Path d="M34 44 Q39 49 44 44" {...stroke} />
          <Path d="M56 44 Q61 49 66 44" {...stroke} />
        </G>
      );
    case 'guino':
      // Ojo izquierdo abierto, derecho guiñando
      return (
        <G>
          <Circle cx={39} cy={45} r={4.5} {...eye} />
          <Path d="M56 46 Q61 50 66 46" {...stroke} />
        </G>
      );
    case 'enamorado':
      // Ojos de corazón
      return (
        <G>
          <Path
            d="M39 41 c-2-3-7-2-7 2 0 3 7 7 7 7 s7-4 7-7 c0-4-5-5-7-2z"
            fill={PIN}
          />
          <Path
            d="M61 41 c-2-3-7-2-7 2 0 3 7 7 7 7 s7-4 7-7 c0-4-5-5-7-2z"
            fill={PIN}
          />
        </G>
      );
    case 'feliz':
    default:
      return (
        <G>
          <Circle cx={39} cy={45} r={4.8} {...eye} />
          <Circle cx={61} cy={45} r={4.8} {...eye} />
          <Circle cx={40.6} cy={43.4} r={1.6} fill={FACE} />
          <Circle cx={62.6} cy={43.4} r={1.6} fill={FACE} />
        </G>
      );
  }
}

export function Cavi({ size = 120, expression = 'feliz', withSparkle = true }: CaviProps) {
  // viewBox 100 x 130 (pin con punta inferior)
  const w = size;
  const h = size * 1.3;
  return (
    <Svg width={w} height={h} viewBox="0 0 100 130">
      {withSparkle && (
        <G>
          <Path d="M86 22 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2z" fill={colors.gold} />
          <Path d="M14 54 l1.5 3.5 3.5 1.5 -3.5 1.5 -1.5 3.5 -1.5 -3.5 -3.5 -1.5 3.5 -1.5z" fill={colors.gold} />
        </G>
      )}

      {/* Cuerpo del pin */}
      <Path
        d="M50 6 C26 6 7 25 7 49 C7 79 50 124 50 124 C50 124 93 79 93 49 C93 25 74 6 50 6 Z"
        fill={PIN}
      />
      {/* Cara */}
      <Circle cx={50} cy={47} r={32} fill={FACE} />

      {/* Cachetes */}
      <Ellipse cx={31} cy={55} rx={6} ry={4} fill={colors.blush} />
      <Ellipse cx={69} cy={55} rx={6} ry={4} fill={colors.blush} />

      {/* Ojos */}
      <Eyes expression={expression} />

      {/* Sonrisa */}
      <Path
        d="M41 58 Q50 68 59 58"
        stroke={PIN}
        strokeWidth={3.5}
        strokeLinecap="round"
        fill="none"
      />
    </Svg>
  );
}
