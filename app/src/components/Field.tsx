/** Campo de formulario etiquetado (usado en login/registro). */
import React from 'react';
import { Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, fontWeight, radii, spacing } from '../theme/tokens';

interface Props {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address';
  autoCapitalize?: 'none' | 'words';
}

export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType = 'default',
  autoCapitalize = 'none',
}: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.inkFaint}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        style={styles.input}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  label: { fontSize: 13, fontWeight: fontWeight.semibold, color: colors.ink },
  input: {
    height: 50,
    borderRadius: radii.md,
    backgroundColor: colors.creamSubtle,
    borderWidth: 1,
    borderColor: colors.creamBorder,
    paddingHorizontal: spacing.md,
    fontSize: 15,
    color: colors.ink,
    ...Platform.select({ web: { outlineStyle: 'none' as never } }),
  },
});
