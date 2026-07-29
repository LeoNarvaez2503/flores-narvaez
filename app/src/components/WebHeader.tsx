/**
 * Encabezado web (estilo e-commerce 212 Global) adaptado a CavaLocal:
 *  1) barra de anuncio, 2) navbar (logo + buscador + cuenta), 3) barra de categorías.
 * Reemplaza la barra tipo app. Las categorías filtran el catálogo (vía término).
 */
import React from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, fontWeight, radii, spacing } from '../theme/tokens';
import { Icon } from './Icon';
import { LogoMark, Wordmark } from './Logo';
import { useAuth } from '../auth/AuthContext';
import type { RootStackParamList } from '../navigation/types';

const CATEGORIES: { label: string; term: string }[] = [
  { label: 'Todos', term: '' },
  { label: 'Tintos', term: 'Tinto' },
  { label: 'Blancos', term: 'Blanco' },
  { label: 'Espumantes', term: 'Espumante' },
  { label: 'Rosados', term: 'Rosado' },
  { label: 'Nacionales', term: 'Venezuela' },
  { label: 'Argentina', term: 'Argentina' },
  { label: 'España', term: 'España' },
  { label: 'Italia', term: 'Italia' },
];

function initials(name: string): string {
  return name.split(' ').map((p) => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
}

interface Props {
  term: string;
  onTermChange: (t: string) => void;
  onSelectCategory: (term: string) => void;
}

export function WebHeader({ term, onTermChange, onSelectCategory }: Props) {
  const { user, logout } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <View style={styles.wrap}>
      {/* Barra de anuncio */}
      <View style={styles.topbar}>
        <Text style={styles.topbarText}>
          <Text style={styles.topbarGold}>5% en tu primera reserva</Text>
          <Text style={styles.topbarMuted}>  ·  Regístrate gratis y empieza a ahorrar</Text>
        </Text>
        <View style={styles.topRight}>
          <Icon name="pin" size={12} color={colors.gold} />
          <Text style={styles.topbarMuted}>Caracas · Chacao</Text>
        </View>
      </View>

      {/* Navbar */}
      <View style={styles.navbar}>
        <Pressable style={styles.brand} onPress={() => navigation.navigate('Landing')}>
          <LogoMark size={34} />
          <Wordmark size={22} />
        </Pressable>

        <View style={styles.search}>
          <Icon name="search" size={18} color={colors.inkMuted} />
          <TextInput
            value={term}
            onChangeText={onTermChange}
            placeholder="Buscar vino, cepa, bodega, país…"
            placeholderTextColor={colors.inkFaint}
            style={styles.searchInput}
            returnKeyType="search"
          />
        </View>

        <View style={styles.actions}>
          <Pressable style={styles.iconBtn} hitSlop={6}>
            <Icon name="heart" size={20} color={colors.wine} />
          </Pressable>
          {user ? (
            <Pressable style={styles.userPill} onPress={logout}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initials(user.name)}</Text>
              </View>
              <Text style={styles.userName} numberOfLines={1}>{user.name.split(' ')[0]}</Text>
            </Pressable>
          ) : (
            <Pressable style={styles.loginPill} onPress={() => navigation.navigate('Login')}>
              <Text style={styles.loginText}>Iniciar sesión</Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* Barra de categorías */}
      <View style={styles.catBarWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catBar}>
          {CATEGORIES.map((c) => {
            const active = c.term === term;
            return (
              <Pressable key={c.label} style={[styles.cat, active && styles.catActive]} onPress={() => onSelectCategory(c.term)}>
                <Text style={[styles.catText, active && styles.catTextActive]}>{c.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { zIndex: 10 },
  topbar: {
    height: 34,
    backgroundColor: colors.wineDark,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
  },
  topbarText: { fontSize: 12 },
  topbarGold: { color: colors.gold, fontWeight: fontWeight.bold, fontSize: 12 },
  topbarMuted: { color: 'rgba(255,255,255,0.7)', fontSize: 12 },
  topRight: { flexDirection: 'row', alignItems: 'center', gap: 5 },

  navbar: {
    backgroundColor: colors.creamCard,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.creamBorder,
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  search: {
    flex: 1,
    maxWidth: 620,
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.creamSubtle,
    borderWidth: 1,
    borderColor: colors.creamBorder,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: colors.ink,
    ...Platform.select({ web: { outlineStyle: 'none' as never } }),
  },
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    backgroundColor: colors.creamSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginPill: {
    backgroundColor: colors.wine,
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    borderRadius: radii.pill,
  },
  loginText: { color: colors.white, fontSize: 14, fontWeight: fontWeight.bold },
  userPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingRight: spacing.md,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: radii.pill,
    backgroundColor: colors.wine,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: colors.white, fontSize: 14, fontWeight: fontWeight.bold },
  userName: { fontSize: 14, fontWeight: fontWeight.bold, color: colors.ink, maxWidth: 90 },

  catBarWrap: { backgroundColor: colors.wine },
  catBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg },
  cat: { paddingHorizontal: spacing.lg, paddingVertical: 13 },
  catActive: { borderBottomWidth: 3, borderBottomColor: colors.gold },
  catText: { fontSize: 13, fontWeight: fontWeight.semibold, color: 'rgba(255,255,255,0.85)', letterSpacing: 0.3 },
  catTextActive: { color: colors.white, fontWeight: fontWeight.bold },
});
