/**
 * Barra de orden y vista (estilo "sort-bar" de 212 Global): cantidad de
 * resultados, opciones de orden y selector de vista (Cuadrícula/Comparar/Mapa).
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fontWeight, radii, spacing } from '../theme/tokens';
import { Icon } from './Icon';
import type { SearchMode, SortKey } from '../types';

const SORTS: { key: SortKey; label: string }[] = [
  { key: 'cercania', label: 'Cercanía' },
  { key: 'precio', label: 'Precio' },
  { key: 'calificacion', label: 'Calificación' },
];

const MODES: { key: SearchMode; label: string }[] = [
  { key: 'lista', label: 'Cuadrícula' },
  { key: 'comparar', label: 'Comparar' },
  { key: 'mapa', label: 'Mapa' },
];

interface Props {
  count: number;
  sort: SortKey;
  onSort: (s: SortKey) => void;
  mode: SearchMode;
  onMode: (m: SearchMode) => void;
}

export function SortBar({ count, sort, onSort, mode, onMode }: Props) {
  return (
    <View style={styles.bar}>
      <Text style={styles.count}>
        <Text style={styles.countNum}>{count}</Text> vinos
      </Text>

      <View style={styles.group}>
        <Text style={styles.groupLabel}>Ordenar:</Text>
        {SORTS.map((s) => {
          const active = s.key === sort;
          return (
            <Pressable key={s.key} style={[styles.opt, active && styles.optActive]} onPress={() => onSort(s.key)}>
              <Text style={[styles.optText, active && styles.optTextActive]}>{s.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.spacer} />

      <View style={styles.modeGroup}>
        {MODES.map((m) => {
          const active = m.key === mode;
          return (
            <Pressable key={m.key} style={[styles.mode, active && styles.modeActive]} onPress={() => onMode(m.key)}>
              {m.key === 'mapa' && <Icon name="pin" size={13} color={active ? colors.white : colors.wine} />}
              <Text style={[styles.modeText, active && styles.modeTextActive]}>{m.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
    backgroundColor: colors.creamCard,
    borderWidth: 1,
    borderColor: colors.creamBorder,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  count: { fontSize: 13, color: colors.inkMuted },
  countNum: { fontWeight: fontWeight.bold, color: colors.ink },
  group: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  groupLabel: { fontSize: 13, color: colors.inkMuted, marginRight: 2 },
  opt: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radii.sm },
  optActive: { backgroundColor: colors.wine },
  optText: { fontSize: 13, fontWeight: fontWeight.semibold, color: colors.ink },
  optTextActive: { color: colors.white },
  spacer: { flex: 1, minWidth: 8 },
  modeGroup: {
    flexDirection: 'row',
    backgroundColor: colors.creamSubtle,
    borderRadius: radii.pill,
    padding: 3,
  },
  mode: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radii.pill,
  },
  modeActive: { backgroundColor: colors.wine },
  modeText: { fontSize: 12, fontWeight: fontWeight.semibold, color: colors.inkMuted },
  modeTextActive: { color: colors.white },
});
