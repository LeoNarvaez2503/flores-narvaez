/**
 * Banner de campaña (estilo "discount-banner" de 212 Global) que invita a
 * registrarse, atado a la puerta de registro de la app.
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fontWeight, radii, spacing } from '../theme/tokens';
import { Icon } from './Icon';

export function DiscountBanner({ onPress }: { onPress: () => void }) {
  return (
    <Pressable style={styles.banner} onPress={onPress}>
      <View style={styles.left}>
        <Text style={styles.kicker}>SOLO PARA REGISTRADOS</Text>
        <Text style={styles.title}>5% en tu primera reserva</Text>
        <Text style={styles.subtitle}>Crea tu cuenta gratis y empieza a ahorrar</Text>
      </View>
      <View style={styles.cta}>
        <Text style={styles.ctaText}>Registrarme</Text>
        <Icon name="navigate" size={16} color={colors.white} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.wineDark,
    borderRadius: radii.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.gold,
    gap: spacing.md,
  },
  left: { flex: 1, gap: 2 },
  kicker: { fontSize: 11, letterSpacing: 1.5, fontWeight: fontWeight.bold, color: colors.gold },
  title: { fontSize: 18, fontWeight: fontWeight.bold, color: colors.white },
  subtitle: { fontSize: 13, color: '#EADBC4' },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.wine,
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    borderRadius: radii.pill,
  },
  ctaText: { color: colors.white, fontSize: 13, fontWeight: fontWeight.bold },
});
