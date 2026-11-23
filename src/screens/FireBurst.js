// A short burst of fire around a Tonight Code vow when it's taken: flames rise along the sentence, sparks fly out,
// and a glowing rim flashes around it. Mount with a new key to play it again.
import { useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient as SvgGrad, Path, Stop } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { FIRE } from '../theme';

const FLAMES = 14;
const SPARKS = 12;

function Flame({ size, id }) {
  return (
    <Svg width={size} height={size * 1.3} viewBox="0 0 24 31">
      <Defs>
        <SvgGrad id={id} x1="0.5" y1="1" x2="0.5" y2="0">
          <Stop offset="0" stopColor={FIRE[2]} />
          <Stop offset="0.5" stopColor={FIRE[1]} />
          <Stop offset="1" stopColor={FIRE[0]} stopOpacity="0.9" />
        </SvgGrad>
      </Defs>
      <Path d="M12 1c1.6 6 8.5 8.6 8.5 16.4A8.5 8.5 0 0 1 3.5 17.4c0-4 2.4-6.4 4.1-8 .4 3.1 2.1 4.8 4.1 4.8C10.1 9.4 11.7 4.6 12 1z" fill={`url(#${id})`} />
    </Svg>
  );
}

export function FireBurst({ width, height }) {
  const [t] = useState(() => new Animated.Value(0));
  // Fixed random layout for this burst.
  const [parts] = useState(() => ({
    flames: Array.from({ length: FLAMES }, (_, i) => ({
      x: (i + 0.5) / FLAMES + (Math.random() - 0.5) * 0.05,
      size: 12 + Math.random() * 14,
      rise: 26 + Math.random() * 34,
      delay: Math.random() * 0.25,
      drift: (Math.random() - 0.5) * 14,
    })),
    sparks: Array.from({ length: SPARKS }, () => ({
      angle: Math.random() * Math.PI * 2,
      dist: 40 + Math.random() * 70,
      size: 2 + Math.random() * 3,
      delay: Math.random() * 0.2,
    })),
  }));

  useEffect(() => {
    Animated.timing(t, { toValue: 1, duration: 1100, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
  }, [t]);

  if (!width) return null;
  const cx = width / 2;
  const cy = height / 2;
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { overflow: 'visible' }]}>
      {/* glowing rim */}
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            borderRadius: 18,
            opacity: t.interpolate({ inputRange: [0, 0.12, 0.6, 1], outputRange: [0, 1, 0.5, 0] }),
            transform: [{ scaleX: t.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1.06] }) }, { scaleY: t.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1.15] }) }],
          },
        ]}
      >
        <LinearGradient colors={['rgba(255,210,122,0.0)', 'rgba(255,138,61,0.35)', 'rgba(240,40,122,0.0)']} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={[StyleSheet.absoluteFill, { borderRadius: 18, borderWidth: 1.5, borderColor: 'rgba(255,138,61,0.9)' }]} />
      </Animated.View>

      {/* flames rising along the sentence */}
      {parts.flames.map((f, i) => {
        const p = t.interpolate({ inputRange: [0, f.delay, 1], outputRange: [0, 0, 1], extrapolate: 'clamp' });
        return (
          <Animated.View
            key={`f${i}`}
            style={{
              position: 'absolute',
              left: f.x * width - f.size / 2,
              top: height - f.size * 0.9,
              opacity: p.interpolate({ inputRange: [0, 0.15, 0.6, 1], outputRange: [0, 1, 0.8, 0] }),
              transform: [
                { translateY: p.interpolate({ inputRange: [0, 1], outputRange: [6, -f.rise - height * 0.6] }) },
                { translateX: p.interpolate({ inputRange: [0, 1], outputRange: [0, f.drift] }) },
                { scale: p.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0.3, 1.1, 0.4] }) },
              ],
            }}
          >
            <Flame size={f.size} id={`fl${i}`} />
          </Animated.View>
        );
      })}

      {/* sparks flying out */}
      {parts.sparks.map((s, i) => {
        const p = t.interpolate({ inputRange: [0, s.delay, 1], outputRange: [0, 0, 1], extrapolate: 'clamp' });
        return (
          <Animated.View
            key={`s${i}`}
            style={{
              position: 'absolute',
              left: cx - s.size / 2,
              top: cy - s.size / 2,
              width: s.size,
              height: s.size,
              borderRadius: s.size,
              backgroundColor: i % 3 ? FIRE[0] : FIRE[1],
              opacity: p.interpolate({ inputRange: [0, 0.1, 0.7, 1], outputRange: [0, 1, 0.7, 0] }),
              transform: [
                { translateX: p.interpolate({ inputRange: [0, 1], outputRange: [0, Math.cos(s.angle) * s.dist * 1.6] }) },
                { translateY: p.interpolate({ inputRange: [0, 1], outputRange: [0, Math.sin(s.angle) * s.dist * 0.6 - 18] }) },
              ],
            }}
          />
        );
      })}
    </View>
  );
}
