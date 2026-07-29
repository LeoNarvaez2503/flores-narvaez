/**
 * Catálogo reimaginado como e-commerce WEB (estilo 212 Global), responsive:
 * header con navbar + categorías, hero promocional, "más vendidos", banner de
 * registro, barra de orden con vista, sidebar de filtros (escritorio), grilla
 * de tarjetas verticales y footer.
 */
import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { colors, fontWeight, spacing } from '../theme/tokens';
import { useResponsive } from '../theme/responsive';
import { Cavi } from '../components/Cavi';
import { WebHeader } from '../components/WebHeader';
import { PromoCarousel, PromoSlide } from '../components/PromoCarousel';
import { BestSellers } from '../components/BestSellers';
import { DiscountBanner } from '../components/DiscountBanner';
import { SortBar } from '../components/SortBar';
import { FilterSidebar, PriceBucket, priceInBucket } from '../components/FilterSidebar';
import { WineGridCard } from '../components/WineGridCard';
import { PriceCompareCard, PriceCompareCompact } from '../components/PriceCompareCard';
import { MapMock } from '../components/MapMock';
import { SiteFooter } from '../components/SiteFooter';
import {
  getBestsellers,
  getCategories,
  getMapPins,
  getNearbyResults,
  getPriceComparisons,
  getSearchResults,
} from '../data/selectors';
import { useData } from '../data/DataContext';
import { useAuth } from '../auth/AuthContext';
import type { SearchMode, SortKey } from '../types';

const PAGE_MAX = 1200;

function EmptyState({ term }: { term: string }) {
  return (
    <View style={styles.empty}>
      <Cavi size={92} expression="contento" />
      <Text style={styles.emptyTitle}>No encontré {term ? `“${term}”` : 'resultados'}</Text>
      <Text style={styles.emptyText}>Prueba con otra cepa, bodega, país o quita filtros.</Text>
    </View>
  );
}

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function SearchScreen() {
  const navigation = useNavigation<Nav>();
  const { data } = useData();
  const { user } = useAuth();
  const { width, isWide } = useResponsive();

  const [mode, setMode] = useState<SearchMode>('lista');
  const [sort, setSort] = useState<SortKey>('cercania');
  const [term, setTerm] = useState('');
  const [price, setPrice] = useState<PriceBucket>('all');

  const openDetail = (wineId: string) => navigation.navigate('WineDetail', { wineId });
  const goReserve = (wineId: string, storeId: string, p: number) =>
    user
      ? navigation.navigate('Reserve', { wineId, storeId, price: p })
      : navigation.navigate('Register', { next: { wineId, storeId, price: p } });

  function changeMode(m: SearchMode) {
    setMode(m);
    if (m === 'comparar') setSort('precio');
    else if (m === 'lista') setSort('cercania');
  }

  const allResults = useMemo(() => getSearchResults(data, term, sort), [data, term, sort]);
  const results = useMemo(() => allResults.filter((r) => priceInBucket(r.bestPrice, price)), [allResults, price]);
  const comparisons = useMemo(() => getPriceComparisons(data, term), [data, term]);
  const nearby = useMemo(() => getNearbyResults(data, term), [data, term]);
  const pins = useMemo(() => getMapPins(data, term), [data, term]);
  const bestsellers = useMemo(() => getBestsellers(data), [data]);
  const categories = useMemo(() => getCategories(data), [data]);

  // Layout responsive
  const pad = spacing.lg;
  const pageW = Math.min(width, PAGE_MAX);
  const innerW = pageW - pad * 2;
  const showSidebar = isWide && mode === 'lista';
  const gridW = showSidebar ? innerW - 220 - spacing.xl : innerW;
  const cols = Math.max(1, Math.min(4, Math.floor(gridW / 210)));
  const cardW = (gridW - spacing.md * (cols - 1)) / cols;

  const showPromos = mode === 'lista' && term === '' && price === 'all';
  const isEmpty = results.length === 0;
  const count = mode === 'comparar' ? comparisons.length : mode === 'mapa' ? nearby.length : results.length;

  const promoSlides: PromoSlide[] = [
    { id: 'pomar', kicker: 'BODEGA DESTACADA', title: 'Pomar, de Carora a tu copa', subtitle: 'El vino venezolano, en tu zona', cta: 'Ver Pomar', image: require('../../assets/promo/promo-1.webp'), onPress: () => setTerm('Pomar') },
    { id: 'espumantes', kicker: 'PARA CELEBRAR', title: 'Brinda esta semana', subtitle: 'Espumantes con burbuja fina', cta: 'Ver espumantes', image: require('../../assets/promo/promo-2.webp'), onPress: () => setTerm('Espumante') },
    { id: 'malbec', kicker: 'EL CLÁSICO', title: 'Malbec argentino', subtitle: 'El preferido, desde $12,90', cta: 'Ver Malbec', image: require('../../assets/promo/promo-3.webp'), onPress: () => setTerm('Malbec') },
  ];

  return (
    <View style={styles.container}>
      <WebHeader term={term} onTermChange={setTerm} onSelectCategory={(t) => { setTerm(t); setPrice('all'); }} />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={[styles.page, { maxWidth: PAGE_MAX }]}>
          {showPromos && (
            <>
              <PromoCarousel slides={promoSlides} width={innerW} />
              <BestSellers wines={bestsellers} onSelect={openDetail} />
              <DiscountBanner onPress={() => navigation.navigate('Register')} />
            </>
          )}

          <SortBar count={count} sort={sort} onSort={setSort} mode={mode} onMode={changeMode} />

          <View style={styles.bodyRow}>
            {showSidebar && (
              <FilterSidebar
                term={term}
                onTerm={(t) => setTerm(t)}
                price={price}
                onPrice={setPrice}
                byType={categories.byType}
                byWorld={categories.byWorld}
              />
            )}

            <View style={styles.content}>
              {mode === 'lista' && (
                isEmpty ? (
                  <EmptyState term={term} />
                ) : (
                  <View style={styles.grid}>
                    {results.map((w) => (
                      <View key={w.id} style={{ width: cardW }}>
                        <WineGridCard
                          wine={w}
                          onPress={() => openDetail(w.id)}
                          onReserve={() => goReserve(w.id, w.nearestStore.id, w.bestPrice)}
                        />
                      </View>
                    ))}
                  </View>
                )
              )}

              {mode === 'comparar' && (
                <View style={styles.comparar}>
                  {comparisons[0] && (
                    <PriceCompareCard
                      data={comparisons[0]}
                      onPressWine={() => openDetail(comparisons[0].wine.id)}
                      onReserve={(storeId, p) => goReserve(comparisons[0].wine.id, storeId, p)}
                    />
                  )}
                  {comparisons.slice(1).map((c) => (
                    <PriceCompareCompact key={c.wine.id} data={c} onPress={() => openDetail(c.wine.id)} />
                  ))}
                </View>
              )}

              {mode === 'mapa' && (
                <View style={styles.mapBox}>
                  <MapMock pins={pins} nearby={nearby} onSelectWine={openDetail} />
                </View>
              )}
            </View>
          </View>
        </View>

        <SiteFooter />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.cream },
  scroll: { flex: 1 },
  scrollContent: { alignItems: 'center', paddingBottom: 0 },
  page: { width: '100%', paddingHorizontal: spacing.lg, paddingTop: spacing.lg, gap: spacing.lg },
  bodyRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xl },
  content: { flex: 1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  comparar: { gap: spacing.md, maxWidth: 760, width: '100%' },
  mapBox: { height: 560 },
  empty: { alignItems: 'center', paddingVertical: spacing.xxl, gap: spacing.sm, width: '100%' },
  emptyTitle: { fontSize: 17, fontWeight: fontWeight.bold, color: colors.ink, marginTop: spacing.sm },
  emptyText: { fontSize: 14, color: colors.inkMuted },
});
