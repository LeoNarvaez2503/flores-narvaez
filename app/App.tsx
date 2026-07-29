import React from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { RootNavigator } from './src/navigation/RootNavigator';
import { AuthProvider } from './src/auth/AuthContext';
import { DataProvider } from './src/data/DataContext';
import { colors } from './src/theme/tokens';

/**
 * App responsive: ocupa todo el viewport y se adapta al ancho (móvil → escritorio).
 * En dispositivo nativo respeta el área segura (notch); en web llena la pantalla.
 */
export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <DataProvider>
          <SafeAreaView style={styles.root} edges={['top']}>
            <RootNavigator />
          </SafeAreaView>
          <StatusBar style="dark" />
        </DataProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.cream,
  },
});
