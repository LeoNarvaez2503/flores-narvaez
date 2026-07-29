/**
 * Landing: incrusta el landing animado real (286 cuadros + videos) a pantalla
 * completa — usa SU PROPIA barra de navegación (no agregamos otra). Un único
 * botón flotante "Entrar a CavaLocal" lleva al catálogo (navegación de invitado).
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, fontWeight, radii, spacing } from '../theme/tokens';
import { LandingFrame } from '../components/LandingFrame';
import { LANDING_URL } from '../config';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Landing'>;

export function LandingScreen({ navigation }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.frame}>
        <LandingFrame url={LANDING_URL} />
      </View>

      {/* Único CTA flotante (slim, abajo) → catálogo de vinos */}
      <View style={styles.ctaWrap} pointerEvents="box-none">
        <Pressable style={styles.cta} onPress={() => navigation.navigate('Search')}>
          <Text style={styles.ctaText}>Entrar a CavaLocal · Ver vinos</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.wineDark },
  frame: { flex: 1, overflow: 'hidden' },
  ctaWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 20,
    alignItems: 'center',
  },
  cta: {
    backgroundColor: colors.wine,
    paddingHorizontal: spacing.xl,
    paddingVertical: 13,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.gold,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  ctaText: { color: colors.white, fontSize: 15, fontWeight: fontWeight.bold },
});
