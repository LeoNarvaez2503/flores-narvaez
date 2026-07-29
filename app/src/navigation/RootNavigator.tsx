/**
 * Stack de navegación. Gating por sesión:
 *  - Sin sesión: Marca → Login → Registro.
 *  - Con sesión: Búsqueda → Detalle → Reserva.
 * Al iniciar/cerrar sesión, el stack cambia solo.
 */
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from './types';
import { colors } from '../theme/tokens';
import { LandingScreen } from '../screens/LandingScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { RegisterScreen } from '../screens/RegisterScreen';
import { SearchScreen } from '../screens/SearchScreen';
import { WineDetailScreen } from '../screens/WineDetailScreen';
import { ReserveScreen } from '../screens/ReserveScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Landing"
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.cream },
          animation: 'slide_from_right',
        }}
      >
        {/* Navegación abierta (invitado): el landing y el catálogo se ven sin login.
            La puerta de registro se aplica al reservar/comprar. */}
        <Stack.Screen name="Landing" component={LandingScreen} />
        <Stack.Screen name="Search" component={SearchScreen} />
        <Stack.Screen name="WineDetail" component={WineDetailScreen} />
        <Stack.Screen name="Reserve" component={ReserveScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
