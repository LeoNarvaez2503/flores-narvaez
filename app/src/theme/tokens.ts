/**
 * Tokens de diseño de CavaLocal.
 * Paleta del mockup: burdeos + dorado sobre crema (estilo iOS / MercadoLibre).
 * Fuente única de verdad para colores, espaciado, radios y tipografía.
 */

export const colors = {
  // Marca
  wine: '#641E2E', // burdeos primario (pin, botones, chips activos)
  wineDark: '#48121F', // burdeos profundo (sombra del pin, presionado)
  wineSoft: '#7C2A3C', // burdeos claro (hover/acentos)
  gold: '#C2912B', // dorado (acentos, "CONOCE A", badge Últimas)
  goldSoft: '#F4E9CC', // dorado muy claro (fondo "MEJOR PRECIO")

  // Superficies
  cream: '#F3ECDD', // fondo de pantalla
  creamCard: '#FFFFFF', // tarjetas
  creamSubtle: '#F6EFE2', // chips/inputs sin seleccionar
  creamBorder: '#E7DCC6', // bordes suaves
  thumbBg: '#F1E7D6', // fondo miniatura de botella

  // Texto
  ink: '#2A2024', // texto principal (casi negro cálido)
  inkMuted: '#8B7F79', // texto secundario
  inkFaint: '#B4A89F', // texto terciario / placeholders

  // Estado
  green: '#2E8B57', // Disponible
  greenSoft: '#E4F1E9',
  amber: '#C2912B', // Últimas N
  amberSoft: '#F6ECCF',

  // Mascota
  blush: '#EC9CA1', // cachetes de Cavi
  white: '#FFFFFF',

  // Mapa (variación C)
  mapBg: '#E9E3D3',
  mapRoad: '#FBF8F1',
  mapPark: '#D7E2C8',

  // Sombra
  shadow: '#2A2024',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999,
} as const;

export const fontSize = {
  caption: 12,
  small: 13,
  body: 15,
  title: 17,
  heading: 20,
  price: 22,
  display: 28,
} as const;

export const fontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const;

/** Sombra sutil de tarjeta (iOS-like), compatible con web. */
export const cardShadow = {
  shadowColor: colors.shadow,
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.08,
  shadowRadius: 12,
  elevation: 3,
} as const;
