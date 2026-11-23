// Opening animation. It starts exactly like the iPhone launch screen (the bunny mask, 120 px, centred on the dark
// background), then: a warm glow blooms behind the mask, a ring pulses out, the mask rises and "tonight." writes in
// with the pink dot dropping into place, and the whole thing fades into the app.
import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Image, StyleSheet, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { C, F } from '../theme';
import { T, tap } from '../ui';

const ICON = 120;
const ease = Easing.bezier(0.2, 0.85, 0.25, 1);

export function Intro({ onDone }) {
  const { width } = useWindowDimensions();
  const [v] = useState(() => ({
    glow: new Animated.Value(0),
    ring: new Animated.Value(0),
    lift: new Animated.Value(0),
    word: new Animated.Value(0),
    dot: new Animated.Value(0),
    out: new Animated.Value(1),
  }));

  useEffect(() => {
    let cancelled = false;
    const finish = () => !cancelled && onDone();
    AccessibilityInfo.isReduceMotionEnabled()
      .catch(() => false)
      .then((reduce) => {
        if (cancelled) return;
        if (reduce) {
          // No movement: show the logo briefly, then fade.
          v.glow.setValue(1);
          v.word.setValue(1);
          v.dot.setValue(1);
          v.lift.setValue(1);
          Animated.timing(v.out, { toValue: 0, duration: 350, delay: 500, useNativeDriver: true }).start(finish);
          return;
        }
        Animated.sequence([
          Animated.delay(250),
          Animated.parallel([
            Animated.timing(v.glow, { toValue: 1, duration: 700, easing: ease, useNativeDriver: true }),
            Animated.timing(v.ring, { toValue: 1, duration: 900, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          ]),
          Animated.parallel([
            Animated.timing(v.lift, { toValue: 1, duration: 550, easing: ease, useNativeDriver: true }),
            Animated.timing(v.word, { toValue: 1, duration: 550, delay: 120, easing: ease, useNativeDriver: true }),
          ]),
          Animated.spring(v.dot, { toValue: 1, speed: 14, bounciness: 14, useNativeDriver: true }),
          Animated.delay(450),
          Animated.timing(v.out, { toValue: 0, duration: 420, easing: Easing.in(Easing.quad), useNativeDriver: true }),
        ]).start(finish);
        setTimeout(() => !cancelled && tap(), 250 + 700 + 550 + 120);
      });
    return () => {
      cancelled = true;
    };
  }, [v, onDone]);

  const glowSize = width * 1.1;
  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.wrap, { opacity: v.out }]}>
      {/* the glow that blooms behind the mask */}
      <Animated.View
        style={{
          position: 'absolute',
          width: glowSize,
          height: glowSize,
          borderRadius: glowSize / 2,
          overflow: 'hidden',
          opacity: v.glow.interpolate({ inputRange: [0, 1], outputRange: [0, 0.55] }),
          transform: [{ scale: v.glow.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1] }) }, { rotate: v.lift.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '40deg'] }) }],
        }}
      >
        <LinearGradient colors={['#F0287A', '#7B3CFF', '#3B7BFF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(14,12,16,0.55)', borderRadius: glowSize / 2, transform: [{ scale: 0.72 }] }]} />
      </Animated.View>

      {/* a ring that pulses out once */}
      <Animated.View
        style={{
          position: 'absolute',
          width: ICON * 1.6,
          height: ICON * 1.6,
          borderRadius: ICON * 0.8,
          borderWidth: 2,
          borderColor: C.pink,
          opacity: v.ring.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 0.9, 0] }),
          transform: [{ scale: v.ring.interpolate({ inputRange: [0, 1], outputRange: [0.6, 2.4] }) }],
        }}
      />

      {/* the mask: same size and place as the launch screen, then rises */}
      <Animated.View
        style={{
          transform: [
            { translateY: v.lift.interpolate({ inputRange: [0, 1], outputRange: [0, -46] }) },
            { scale: v.glow.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] }) },
            { scale: v.lift.interpolate({ inputRange: [0, 1], outputRange: [1, 0.82] }) },
          ],
        }}
      >
        <Image source={require('../../assets/splash-icon.png')} style={{ width: ICON, height: ICON }} resizeMode="contain" />
      </Animated.View>

      {/* the word mark */}
      <Animated.View
        style={{
          position: 'absolute',
          top: '50%',
          marginTop: 34,
          flexDirection: 'row',
          alignItems: 'flex-end',
          opacity: v.word,
          transform: [{ translateY: v.word.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }],
        }}
      >
        <T style={{ fontFamily: F.displayX, fontSize: 44, lineHeight: 52, letterSpacing: -1.2 }}>tonight</T>
        <Animated.View
          style={{
            opacity: v.dot,
            transform: [{ translateY: v.dot.interpolate({ inputRange: [0, 1], outputRange: [-60, 0] }) }, { scale: v.dot.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) }],
          }}
        >
          <T c={C.pink} style={{ fontFamily: F.displayX, fontSize: 44, lineHeight: 52 }}>
            .
          </T>
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', zIndex: 100 },
});
