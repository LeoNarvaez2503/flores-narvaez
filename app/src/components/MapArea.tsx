/**
 * Área de mapa (nativo / por defecto): usa el lienzo SVG.
 * En web, Metro resuelve `MapArea.web.tsx` que integra Google Maps real.
 */
import React from 'react';
import { MapCanvasSvg } from './MapCanvasSvg';
import type { MapPin } from '../types';

export function MapArea({ pins }: { pins: MapPin[] }) {
  return <MapCanvasSvg pins={pins} />;
}
