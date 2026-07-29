/** Pantalla de registro — diseño premium a juego con el login. */
import React, { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { cardShadow, colors, fontWeight, radii, spacing } from '../theme/tokens';
import { LogoMark } from '../components/Logo';
import { Field } from '../components/Field';
import { useAuth } from '../auth/AuthContext';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Register'>;

const serif = Platform.select({ web: 'Georgia, "Times New Roman", serif', ios: 'Georgia', default: 'serif' });

export function RegisterScreen({ navigation, route }: Props) {
  const { register, loading } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const next = route.params?.next;

  async function onSubmit() {
    setError(null);
    const res = await register(name, email, password);
    if (!res.ok) {
      setError(res.error ?? 'No se pudo crear la cuenta.');
      return;
    }
    if (next) navigation.navigate('Reserve', next);
    else navigation.navigate('Search');
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <View style={styles.logo}>
            <LogoMark size={60} />
          </View>

          <Text style={styles.kicker}>CAVALOCAL</Text>
          <Text style={styles.title}>Crea tu cuenta</Text>
          <View style={styles.divider} />
          <Text style={styles.subtitle}>Súmate a la guía de vinos de Caracas</Text>

          <View style={styles.formFields}>
            <Field label="Nombre" value={name} onChangeText={(t) => { setName(t); setError(null); }} placeholder="Tu nombre" autoCapitalize="words" />
            <Field label="Correo" value={email} onChangeText={(t) => { setEmail(t); setError(null); }} placeholder="tucorreo@ejemplo.com" keyboardType="email-address" />
            <Field label="Contraseña" value={password} onChangeText={(t) => { setPassword(t); setError(null); }} placeholder="Mínimo 4 caracteres" secureTextEntry />
          </View>

          {error && <Text style={styles.error}>{error}</Text>}

          <Pressable style={[styles.cta, loading && styles.ctaDisabled]} onPress={onSubmit} disabled={loading}>
            <Text style={styles.ctaText}>{loading ? 'Creando…' : 'Crear cuenta'}</Text>
          </Pressable>

          <Pressable onPress={() => navigation.navigate('Login', { next })} style={styles.linkWrap}>
            <Text style={styles.link}>
              ¿Ya tienes cuenta? <Text style={styles.linkStrong}>Iniciar sesión</Text>
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.wineDark },
  scroll: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.creamCard,
    borderRadius: radii.xl,
    borderTopWidth: 3,
    borderTopColor: colors.gold,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
    alignItems: 'center',
    ...cardShadow,
    shadowOpacity: 0.3,
    shadowRadius: 24,
  },
  logo: { marginBottom: spacing.md },
  kicker: { fontSize: 12, letterSpacing: 4, fontWeight: fontWeight.bold, color: colors.gold },
  title: { fontFamily: serif, fontSize: 26, fontWeight: fontWeight.bold, color: colors.wine, marginTop: spacing.sm, textAlign: 'center' },
  divider: { width: 44, height: 2, backgroundColor: colors.gold, borderRadius: 2, marginVertical: spacing.md },
  subtitle: { fontSize: 14, color: colors.inkMuted, marginBottom: spacing.xl, textAlign: 'center' },
  formFields: { width: '100%', gap: spacing.md },
  error: { color: '#B23A3A', fontSize: 13, textAlign: 'center', marginTop: spacing.md },
  cta: {
    width: '100%',
    backgroundColor: colors.wine,
    borderRadius: radii.md,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  ctaDisabled: { opacity: 0.6 },
  ctaText: { color: colors.white, fontSize: 16, fontWeight: fontWeight.bold, letterSpacing: 0.3 },
  linkWrap: { marginTop: spacing.lg },
  link: { textAlign: 'center', color: colors.inkMuted, fontSize: 14 },
  linkStrong: { color: colors.wine, fontWeight: fontWeight.bold },
});
