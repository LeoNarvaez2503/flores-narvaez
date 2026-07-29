/**
 * Breakpoints responsive. Una sola fuente de verdad para adaptar la UI
 * de móvil a escritorio (la app corre en web vía react-native-web).
 */
import { useWindowDimensions } from 'react-native';

export interface Responsive {
  width: number;
  height: number;
  isWide: boolean; // tablet o más
  isDesktop: boolean;
  contentWidth: number; // ancho máximo del contenido centrado
  columns: number; // columnas para grillas de tarjetas
}

export function useResponsive(): Responsive {
  const { width, height } = useWindowDimensions();
  const isWide = width >= 760;
  const isDesktop = width >= 1040;
  return {
    width,
    height,
    isWide,
    isDesktop,
    contentWidth: Math.min(width, 1040),
    columns: isDesktop ? 3 : isWide ? 2 : 1,
  };
}
