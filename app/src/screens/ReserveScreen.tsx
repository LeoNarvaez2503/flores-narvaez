/**
 * Reserva (referida): retiro en tienda (pickup) o delivery con tarifa por km.
 * Muestra la comisión del 7% (a cargo del comercio) y confirma la reserva.
 * Stub de flujo — la pasarela de pago real se integra con el backend.
 */
import React, { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { cardShadow, colors, fontWeight, radii, spacing } from '../theme/tokens';
import { Icon } from '../components/Icon';
import { Cavi } from '../components/Cavi';
import { StatusBarMock } from '../components/StatusBarMock';
import { getCatalogWine, getStore } from '../data/selectors';
import { useData } from '../data/DataContext';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Reserve'>;

const DELIVERY_PER_KM = 0.8;
const COMMISSION_RATE = 0.07;

export function ReserveScreen({ route, navigation }: Props) {
  const { wineId, storeId, price } = route.params;
  const { data } = useData();
  const wine = getCatalogWine(data, wineId);
  const store = getStore(data, storeId);
  const [method, setMethod] = useState<'pickup' | 'delivery'>('pickup');
  const [confirmed, setConfirmed] = useState(false);

  const distanceKm = store?.distanceKm ?? 0;
  const deliveryFee =
    method === 'delivery' ? Math.round(distanceKm * DELIVERY_PER_KM * 100) / 100 : 0;
  const total = Math.round((price + deliveryFee) * 100) / 100;
  const commission = Math.round(price * COMMISSION_RATE * 100) / 100;

  if (confirmed) {
    return (
      <View style={styles.container}>
        {Platform.OS === 'web' && <StatusBarMock />}
        <View style={styles.success}>
          <Cavi size={120} expression="enamorado" />
          <Text style={styles.successTitle}>¡Reserva confirmada!</Text>
          <Text style={styles.successText}>
            Te esperamos en {store?.name}. {method === 'delivery' ? 'Te llega a domicilio.' : 'Retiro en tienda.'}
          </Text>
          <Pressable style={styles.cta} onPress={() => navigation.popToTop()}>
            <Text style={styles.ctaText}>Volver al inicio</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {Platform.OS === 'web' && <StatusBarMock />}
      <View style={styles.header}>
        <Pressable style={styles.iconBtn} onPress={() => navigation.goBack()} hitSlop={8}>
          <Icon name="chevron-left" size={22} color={colors.ink} />
        </Pressable>
        <Text style={styles.headerTitle}>Reservar</Text>
        <View style={styles.iconBtn} />
      </View>

      <View style={styles.content}>
        {/* Resumen */}
        <View style={styles.card}>
          <Text style={styles.wineName}>{wine?.name}</Text>
          <Text style={styles.store}>
            {store?.name} · {distanceKm} km
          </Text>
        </View>

        {/* Método */}
        <Text style={styles.sectionTitle}>¿Cómo lo quieres?</Text>
        <View style={styles.methods}>
          <Pressable
            style={[styles.method, method === 'pickup' && styles.methodActive]}
            onPress={() => setMethod('pickup')}
          >
            <Text style={[styles.methodTitle, method === 'pickup' && styles.methodTitleActive]}>
              Retiro en tienda
            </Text>
            <Text style={[styles.methodSub, method === 'pickup' && styles.methodSubActive]}>
              Sin costo
            </Text>
          </Pressable>
          <Pressable
            style={[styles.method, method === 'delivery' && styles.methodActive]}
            onPress={() => setMethod('delivery')}
          >
            <Text style={[styles.methodTitle, method === 'delivery' && styles.methodTitleActive]}>
              Delivery
            </Text>
            <Text style={[styles.methodSub, method === 'delivery' && styles.methodSubActive]}>
              ${DELIVERY_PER_KM.toFixed(2)}/km
            </Text>
          </Pressable>
        </View>

        {/* Desglose */}
        <View style={styles.card}>
          <Row label="Precio" value={`$${price.toFixed(2)}`} />
          {method === 'delivery' && (
            <Row label={`Envío (${distanceKm} km)`} value={`$${deliveryFee.toFixed(2)}`} />
          )}
          <View style={styles.divider} />
          <Row label="Total" value={`$${total.toFixed(2)}`} strong />
          <Text style={styles.commission}>
            Comisión CavaLocal {Math.round(COMMISSION_RATE * 100)}% (${commission.toFixed(2)}) a cargo del comercio.
          </Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Pressable style={styles.cta} onPress={() => setConfirmed(true)}>
          <Text style={styles.ctaText}>Confirmar reserva · ${total.toFixed(2)}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, strong && styles.rowStrong]}>{label}</Text>
      <Text style={[styles.rowValue, strong && styles.rowStrong]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.cream },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.creamCard,
    borderBottomWidth: 1,
    borderBottomColor: colors.creamBorder,
  },
  iconBtn: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 16, fontWeight: fontWeight.bold, color: colors.ink },
  content: { padding: spacing.lg, gap: spacing.md, width: '100%', maxWidth: 560, alignSelf: 'center' },
  card: {
    backgroundColor: colors.creamCard,
    borderRadius: radii.lg,
    padding: spacing.lg,
    ...cardShadow,
  },
  wineName: { fontSize: 18, fontWeight: fontWeight.bold, color: colors.ink },
  store: { fontSize: 14, color: colors.inkMuted, marginTop: 2 },
  sectionTitle: { fontSize: 15, fontWeight: fontWeight.bold, color: colors.ink },
  methods: { flexDirection: 'row', gap: spacing.md },
  method: {
    flex: 1,
    backgroundColor: colors.creamCard,
    borderRadius: radii.md,
    padding: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.creamBorder,
    ...cardShadow,
  },
  methodActive: { borderColor: colors.wine, backgroundColor: colors.goldSoft },
  methodTitle: { fontSize: 14, fontWeight: fontWeight.bold, color: colors.ink },
  methodTitleActive: { color: colors.wine },
  methodSub: { fontSize: 12, color: colors.inkMuted, marginTop: 2 },
  methodSubActive: { color: colors.wine },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  rowLabel: { fontSize: 14, color: colors.inkMuted },
  rowValue: { fontSize: 14, color: colors.ink, fontWeight: fontWeight.semibold },
  rowStrong: { fontSize: 18, fontWeight: fontWeight.bold, color: colors.wine },
  divider: { height: 1, backgroundColor: colors.creamBorder, marginVertical: spacing.sm },
  commission: { fontSize: 12, color: colors.inkMuted, marginTop: spacing.sm },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: spacing.lg,
    backgroundColor: colors.creamCard,
    borderTopWidth: 1,
    borderTopColor: colors.creamBorder,
    alignItems: 'center',
  },
  cta: { backgroundColor: colors.wine, borderRadius: radii.md, paddingVertical: 15, alignItems: 'center', width: '100%', maxWidth: 560 },
  ctaText: { color: colors.white, fontSize: 16, fontWeight: fontWeight.bold },
  success: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.sm },
  successTitle: { fontSize: 22, fontWeight: fontWeight.bold, color: colors.wine, marginTop: spacing.md },
  successText: { fontSize: 14, color: colors.inkMuted, textAlign: 'center', paddingHorizontal: spacing.lg },
});
