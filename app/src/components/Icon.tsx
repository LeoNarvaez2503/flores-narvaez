/**
 * Set mínimo de iconos en SVG (react-native-svg), nítidos en web y móvil.
 * Evita depender de fuentes de iconos. ViewBox 24x24.
 */
import React from 'react';
import Svg, { Circle, Line, Path, Polyline } from 'react-native-svg';
import { colors } from '../theme/tokens';

export type IconName =
  | 'search'
  | 'filter'
  | 'heart'
  | 'heart-filled'
  | 'chevron-down'
  | 'chevron-left'
  | 'star'
  | 'pin'
  | 'navigate'
  | 'list';

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
}

export function Icon({
  name,
  size = 20,
  color = colors.ink,
  strokeWidth = 2,
}: IconProps) {
  const stroke = {
    stroke: color,
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    fill: 'none',
  };

  switch (name) {
    case 'search':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Circle cx={11} cy={11} r={7} {...stroke} />
          <Line x1={16.5} y1={16.5} x2={21} y2={21} {...stroke} />
        </Svg>
      );
    case 'filter':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M3 5h18l-7 8v6l-4-2v-4z" fill={color} />
        </Svg>
      );
    case 'heart':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path
            d="M12 20s-7-4.4-9.3-8.4C1.2 8.7 2.9 5.5 6.2 5.5c1.9 0 3.2 1 3.8 1.9C10.6 6.5 11.9 5.5 13.8 5.5c3.3 0 5 3.2 3.5 6.1C19 15.6 12 20 12 20z"
            {...stroke}
          />
        </Svg>
      );
    case 'heart-filled':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path
            d="M12 20s-7-4.4-9.3-8.4C1.2 8.7 2.9 5.5 6.2 5.5c1.9 0 3.2 1 3.8 1.9C10.6 6.5 11.9 5.5 13.8 5.5c3.3 0 5 3.2 3.5 6.1C19 15.6 12 20 12 20z"
            fill={color}
          />
        </Svg>
      );
    case 'chevron-down':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Polyline points="6 9 12 15 18 9" {...stroke} />
        </Svg>
      );
    case 'chevron-left':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Polyline points="15 6 9 12 15 18" {...stroke} />
        </Svg>
      );
    case 'star':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path
            d="M12 2.5l2.9 6 6.6.6-5 4.4 1.5 6.4L12 16.9 6 19.9l1.5-6.4-5-4.4 6.6-.6z"
            fill={color}
          />
        </Svg>
      );
    case 'pin':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path
            d="M12 2c-3.9 0-7 3.1-7 7 0 5 7 13 7 13s7-8 7-13c0-3.9-3.1-7-7-7z"
            fill={color}
          />
          <Circle cx={12} cy={9} r={2.4} fill={colors.white} />
        </Svg>
      );
    case 'navigate':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M3 11L21 3l-8 18-2.2-7.2z" fill={color} />
        </Svg>
      );
    case 'list':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Line x1={4} y1={7} x2={20} y2={7} {...stroke} />
          <Line x1={4} y1={12} x2={20} y2={12} {...stroke} />
          <Line x1={4} y1={17} x2={20} y2={17} {...stroke} />
        </Svg>
      );
    default:
      return null;
  }
}
