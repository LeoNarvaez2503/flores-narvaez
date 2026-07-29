/**
 * Detalle de un vino: ficha completa (cepa, origen, D.O., nota de cata,
 * maridaje), disponibilidad por tienda con comparación de precios y reserva.
 */
import React from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { cardShadow, colors, fontWeight, radii, spacing } from '../theme/tokens';
import { Icon } from '../components/Icon';
import { Rating, WineThumb } from '../components/primitives';
import { StatusBarMock } from '../components/StatusBarMock';
import { getCatalogWine, getWineOffers, getWineRating } from '../data/selectors';
import { useData } from '../data/DataContext';
import { useAuth } from '../auth/AuthContext';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'WineDetail'>;

export function WineDetailScreen({ route, navigation }: Props) {
  const { wineId } = route.params;
  const { data } = useData();
  const { user } = useAuth();
  const wine = getCatalogWine(data, wineId);
  const offers = getWineOffers(data, wineId);
  const { rating, reviewCount } = getWineRating(wineId);

  // Reservar requiere cuenta: invitado → registrarse (y continuar a la reserva).
  const goReserve = (storeId: string, price: number) =>
    user
      ? navigation.navigate('Reserve', { wineId, storeId, price })
      : navigation.navigate('Register', { next: { wineId, storeId, price } });

  if (!wine) {
    return (
      <View style={styles.container}>
        <Text style={styles.notFound}>Vino no encontrado.</Text>
      </View>
    );
  }

  const cheapest = offers[0];
  const chips = [wine.type, wine.grape, wine.denomination].filter(Boolean) as string[];

  return (
    <View style={styles.container}>
      {Platform.OS === 'web' && <StatusBarMock />}

      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.iconBtn} onPress={() => navigation.goBack()} hitSlop={8}>
          <Icon name="chevron-left" size={22} color={colors.ink} />
        </Pressable>
        <Text style={styles.headerTitle}>Detalle</Text>
        <Pressable style={styles.iconBtn} hitSlop={8}>
          <Icon name="heart" size={20} color={colors.wine} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={styles.hero}>
          <WineThumb size={120} />
        </View>

        <Text style={styles.name}>
          {wine.name}
          {wine.vintage ? <Text style={styles.vintage}> {wine.vintage}</Text> : null}
        </Text>
        <Text style={styles.winery}>
          {wine.wineryName} · {wine.country}
          {wine.region ? ` · ${wine.region}` : ''}
        </Text>

        <View style={styles.chipsRow}>
          {chips.map((c) => (
            <View key={c} style={styles.chip}>
              <Text style={styles.chipText}>{c}</Text>
            </View>
          ))}
          {wine.premium && (
            <View style={[styles.chip, styles.chipGold]}>
              <Text style={[styles.chipText, styles.chipTextGold]}>Premium</Text>
            </View>
          )}
        </View>

        <View style={{ marginVertical: spacing.xs }}>
          <Rating value={rating} count={reviewCount} />
        </View>

        {wine.tastingNote && (
          <View style={styles.block}>
            <Text style={styles.blockLabel}>Nota de cata</Text>
            <Text style={styles.blockText}>{wine.tastingNote}</Text>
          </View>
        )}
        {wine.pairing && (
          <View style={styles.block}>
            <Text style={styles.blockLabel}>Maridaje</Text>
            <Text style={styles.blockText}>{wine.pairing}</Text>
          </View>
        )}

        {/* Disponibilidad */}
        <Text style={styles.sectionTitle}>
          Disponible en {offers.length} {offers.length === 1 ? 'tienda' : 'tiendas'}
        </Text>
        <View style={{ gap: spacing.sm }}>
          {offers.map((o) => (
            <Pressable
              key={o.store.id}
              style={[styles.offer, o.bestPrice && styles.offerBest]}
              onPress={() => goReserve(o.store.id, o.price)}
            >
              <View>
                <View style={styles.offerNameRow}>
                  <Text style={styles.offerName}>{o.store.name}</Text>
                  {o.bestPrice && (
                    <View style={styles.bestTag}>
                      <Text style={styles.bestTagText}>MEJOR PRECIO</Text>
                    </View>
                  )}
                </View>
                <View style={styles.offerDist}>
                  <Icon name="pin" size={11} color={colors.inkMuted} />
                  <Text style={styles.offerDistText}>
                    {o.store.distanceKm} km · {o.status === 'AGOTADO' ? 'Agotado' : 'Disponible'}
                  </Text>
                </View>
              </View>
              <Text style={[styles.offerPrice, o.bestPrice && styles.offerPriceBest]}>
                ${o.price.toFixed(2)}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      {/* CTA fija */}
      {cheapest && (
        <View style={styles.footer}>
          <Pressable style={styles.cta} onPress={() => goReserve(cheapest.store.id, cheapest.price)}>
            <Text style={styles.ctaText}>
              Reservar en la más barata · ${cheapest.price.toFixed(2)}
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.cream },
  notFound: { padding: spacing.xl, color: colors.inkMuted },
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
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 16, fontWeight: fontWeight.bold, color: colors.ink },
  content: { padding: spacing.lg, paddingBottom: 110, gap: 4, width: '100%', maxWidth: 720, alignSelf: 'center' },
  hero: {
    alignItems: 'center',
    backgroundColor: colors.creamCard,
    borderRadius: radii.lg,
    paddingVertical: spacing.xl,
    marginBottom: spacing.md,
    ...cardShadow,
  },
  name: { fontSize: 24, fontWeight: fontWeight.bold, color: colors.ink },
  vintage: { fontWeight: fontWeight.medium, color: colors.inkMuted },
  winery: { fontSize: 14, color: colors.inkMuted, marginTop: 2 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: spacing.sm },
  chip: {
    borderWidth: 1,
    borderColor: colors.creamBorder,
    backgroundColor: colors.creamSubtle,
    borderRadius: radii.sm,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  chipText: { fontSize: 12, fontWeight: fontWeight.semibold, color: colors.wine },
  chipGold: { backgroundColor: colors.goldSoft, borderColor: colors.gold },
  chipTextGold: { color: colors.gold },
  block: { marginTop: spacing.md },
  blockLabel: {
    fontSize: 12,
    fontWeight: fontWeight.bold,
    color: colors.gold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  blockText: { fontSize: 14, color: colors.ink, lineHeight: 20 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: fontWeight.bold,
    color: colors.ink,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  offer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.creamCard,
    borderRadius: radii.md,
    padding: spacing.md,
    ...cardShadow,
  },
  offerBest: { backgroundColor: colors.goldSoft, borderWidth: 1, borderColor: colors.gold },
  offerNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  offerName: { fontSize: 14, fontWeight: fontWeight.semibold, color: colors.ink },
  bestTag: { backgroundColor: colors.wine, borderRadius: radii.sm, paddingHorizontal: 6, paddingVertical: 2 },
  bestTagText: { fontSize: 9, fontWeight: fontWeight.bold, color: colors.white, letterSpacing: 0.4 },
  offerDist: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 3 },
  offerDistText: { fontSize: 12, color: colors.inkMuted },
  offerPrice: { fontSize: 17, fontWeight: fontWeight.bold, color: colors.ink },
  offerPriceBest: { color: colors.wine },
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
  cta: {
    backgroundColor: colors.wine,
    borderRadius: radii.md,
    paddingVertical: 15,
    alignItems: 'center',
    width: '100%',
    maxWidth: 720,
  },
  ctaText: { color: colors.white, fontSize: 16, fontWeight: fontWeight.bold },
});
