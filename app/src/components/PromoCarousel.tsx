/**
 * Hero promocional estilo 212 Global: foto de fondo + degradado oscuro abajo,
 * título grande, CTA, flechas de navegación y puntos. Adaptado a CavaLocal.
 */
import React, { useRef, useState } from 'react';
import {
  Image,
  ImageSourcePropType,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, fontWeight, radii, spacing } from '../theme/tokens';

const serif = Platform.select({ web: 'Georgia, "Times New Roman", serif', ios: 'Georgia', default: 'serif' });
const HEIGHT = 230;

export interface PromoSlide {
  id: string;
  kicker: string;
  title: string;
  subtitle: string;
  cta: string;
  image: ImageSourcePropType;
  onPress: () => void;
}

export function PromoCarousel({ slides, width }: { slides: PromoSlide[]; width: number }) {
  const [active, setActive] = useState(0);
  const ref = useRef<ScrollView>(null);

  function onScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const i = Math.round(e.nativeEvent.contentOffset.x / width);
    if (i !== active) setActive(i);
  }

  function goTo(i: number) {
    const idx = (i + slides.length) % slides.length;
    ref.current?.scrollTo({ x: idx * width, animated: true });
    setActive(idx);
  }

  return (
    <View>
      <View style={{ borderRadius: radii.lg, overflow: 'hidden' }}>
        <ScrollView
          ref={ref}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={16}
          snapToInterval={width}
          decelerationRate="fast"
        >
          {slides.map((s) => (
            <Pressable key={s.id} onPress={s.onPress} style={[styles.slide, { width }]}>
              <Image source={s.image} style={StyleSheet.absoluteFill as never} resizeMode="cover" />
              <LinearGradient
                colors={['rgba(20,8,12,0.15)', 'rgba(20,8,12,0.55)', 'rgba(20,8,12,0.92)']}
                style={StyleSheet.absoluteFill as never}
              />
              <View style={styles.content}>
                <Text style={styles.kicker}>{s.kicker}</Text>
                <Text style={styles.title}>{s.title}</Text>
                <Text style={styles.subtitle}>{s.subtitle}</Text>
                <View style={styles.ctaPill}>
                  <Text style={styles.ctaText}>{s.cta}</Text>
                </View>
              </View>
            </Pressable>
          ))}
        </ScrollView>

        {slides.length > 1 && (
          <>
            <Pressable style={[styles.nav, styles.navPrev]} onPress={() => goTo(active - 1)}>
              <Text style={styles.navText}>‹</Text>
            </Pressable>
            <Pressable style={[styles.nav, styles.navNext]} onPress={() => goTo(active + 1)}>
              <Text style={styles.navText}>›</Text>
            </Pressable>
          </>
        )}
      </View>

      <View style={styles.dots}>
        {slides.map((s, i) => (
          <View key={s.id} style={[styles.dot, i === active && styles.dotActive]} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  slide: { height: HEIGHT, justifyContent: 'flex-end' },
  content: { padding: spacing.xl, gap: 4 },
  kicker: { fontSize: 12, letterSpacing: 2.5, fontWeight: fontWeight.bold, color: colors.gold },
  title: {
    fontFamily: serif,
    fontSize: 30,
    fontWeight: fontWeight.bold,
    color: colors.white,
    lineHeight: 34,
    maxWidth: '80%',
  },
  subtitle: { fontSize: 14, color: 'rgba(255,255,255,0.85)', marginBottom: spacing.sm },
  ctaPill: {
    alignSelf: 'flex-start',
    backgroundColor: colors.gold,
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    borderRadius: radii.pill,
    marginTop: 2,
  },
  ctaText: { fontSize: 13, fontWeight: fontWeight.bold, color: colors.wineDark },
  nav: {
    position: 'absolute',
    top: '50%',
    marginTop: -18,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navPrev: { left: 12 },
  navNext: { right: 12 },
  navText: { color: colors.white, fontSize: 22, fontWeight: fontWeight.bold, lineHeight: 24 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: spacing.sm },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.creamBorder },
  dotActive: { backgroundColor: colors.wine, width: 18 },
});
