/**
 * Footer web (estilo 212 Global): franja de newsletter + grilla de 4 columnas
 * + barra inferior. Identidad CavaLocal (burdeos profundo + dorado).
 */
import React, { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, fontWeight, radii, spacing } from '../theme/tokens';
import { Wordmark } from './Logo';
import { useResponsive } from '../theme/responsive';

const COLS: { title: string; links: string[] }[] = [
  { title: 'Explorar', links: ['Vinos', 'Bodegas', 'Ofertas', 'Cerca de ti'] },
  { title: 'CavaLocal', links: ['Sobre nosotros', 'Cómo funciona', 'Para comercios', 'Contacto'] },
  { title: 'Ayuda', links: ['Preguntas frecuentes', 'Términos', 'Privacidad'] },
];

export function SiteFooter() {
  const { isWide } = useResponsive();
  const [email, setEmail] = useState('');

  return (
    <View style={styles.wrap}>
      {/* Newsletter */}
      <View style={[styles.newsletter, !isWide && styles.newsletterCol]}>
        <View style={{ flex: isWide ? 1 : undefined }}>
          <Text style={styles.nlTitle}>SÚMATE AL CLUB CAVALOCAL</Text>
          <Text style={styles.nlSub}>Ofertas, novedades y catas exclusivas en tu correo.</Text>
        </View>
        <View style={styles.nlForm}>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="Tu correo"
            placeholderTextColor={colors.inkFaint}
            style={styles.nlInput}
          />
          <Pressable style={styles.nlBtn}>
            <Text style={styles.nlBtnText}>Suscribirme</Text>
          </Pressable>
        </View>
      </View>

      {/* Columnas */}
      <View style={[styles.grid, !isWide && styles.gridCol]}>
        <View style={styles.brandCol}>
          <Wordmark size={26} color={colors.white} />
          <Text style={styles.brandText}>
            Tu guía de vinos local. Encuentra tu etiqueta ideal al mejor precio, cerca de ti, en Caracas.
          </Text>
        </View>
        {COLS.map((c) => (
          <View key={c.title} style={styles.col}>
            <Text style={styles.colTitle}>{c.title.toUpperCase()}</Text>
            {c.links.map((l) => (
              <Pressable key={l}>
                <Text style={styles.link}>{l}</Text>
              </Pressable>
            ))}
          </View>
        ))}
      </View>

      {/* Barra inferior */}
      <View style={[styles.bottom, !isWide && styles.bottomCol]}>
        <Text style={styles.copy}>© 2026 CavaLocal C.A. · Caracas, Venezuela</Text>
        <Text style={styles.copy}>Bebé con moderación · Solo para mayores de 18 años</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { backgroundColor: colors.wineDark, borderTopWidth: 4, borderTopColor: colors.gold, marginTop: spacing.xxl },
  newsletter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.12)',
  },
  newsletterCol: { flexDirection: 'column', alignItems: 'flex-start' },
  nlTitle: { color: colors.white, fontSize: 16, fontWeight: fontWeight.bold, letterSpacing: 1 },
  nlSub: { color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 4 },
  nlForm: { flexDirection: 'row', borderRadius: radii.md, overflow: 'hidden', maxWidth: 420, width: '100%' },
  nlInput: {
    flex: 1,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: 14,
    color: colors.ink,
    ...Platform.select({ web: { outlineStyle: 'none' as never } }),
  },
  nlBtn: { backgroundColor: colors.gold, paddingHorizontal: spacing.lg, justifyContent: 'center' },
  nlBtnText: { color: colors.wineDark, fontWeight: fontWeight.bold, fontSize: 13 },

  grid: { flexDirection: 'row', gap: spacing.xxl, paddingHorizontal: spacing.xl, paddingVertical: spacing.xxl },
  gridCol: { flexDirection: 'column', gap: spacing.xl },
  brandCol: { flex: 1.6, gap: spacing.sm, minWidth: 220 },
  brandText: { color: 'rgba(255,255,255,0.6)', fontSize: 13, lineHeight: 20, maxWidth: 320 },
  col: { flex: 1, gap: spacing.sm, minWidth: 130 },
  colTitle: { color: colors.white, fontSize: 13, fontWeight: fontWeight.bold, letterSpacing: 1, marginBottom: 4 },
  link: { color: 'rgba(255,255,255,0.6)', fontSize: 13, paddingVertical: 3 },

  bottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.12)',
  },
  bottomCol: { flexDirection: 'column', alignItems: 'flex-start' },
  copy: { color: 'rgba(255,255,255,0.5)', fontSize: 12 },
});
