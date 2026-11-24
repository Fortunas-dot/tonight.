// Opening animation. It starts exactly like the iPhone launch screen (the cream bunny mask, 120 px, centred), then
// the mask turns into black satin with pink trim and real eye holes, a soft candle-pink glow warms up behind it,
// the ears perk up, a shine slides over the satin, "tonight." writes in with the pink dot dropping into place,
// and everything fades into the app.
import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Image, StyleSheet } from 'react-native';
import Svg, { Defs, Ellipse, G, LinearGradient as SvgGrad, Path, RadialGradient, Stop, Circle } from 'react-native-svg';
import { C, F } from '../theme';
import { T, tap } from '../ui';

const ICON = 120; // the launch screen's mask size
const MASK = 150; // the satin mask, a little bigger
const ease = Easing.bezier(0.2, 0.85, 0.25, 1);
const AnimatedPath = Animated.createAnimatedComponent(Path);

// Drawn on the launch icon's 512 grid so the shapes line up with it.
const BODY = 'M66 300C80 255 150 230 220 262C236 270 248 276 256 282C264 276 276 270 292 262C362 230 432 255 446 300C440 360 395 400 340 392C310 388 292 370 278 356C268 346 244 346 234 356C220 370 202 388 172 392C117 400 72 360 66 300Z';
const HOLES = 'M128 318Q170 292 212 318Q170 338 128 318Z M300 318Q342 292 384 318Q342 338 300 318Z';

function SatinDefs() {
  return (
    <Defs>
      <SvgGrad id="i-satin" x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0" stopColor="#3A1828" />
        <Stop offset="0.55" stopColor="#160910" />
        <Stop offset="1" stopColor="#070306" />
      </SvgGrad>
      <SvgGrad id="i-trim" x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0" stopColor="#FF8FC0" />
        <Stop offset="0.5" stopColor="#F0287A" />
        <Stop offset="1" stopColor="#B01E8E" />
      </SvgGrad>
      <SvgGrad id="i-inner" x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0" stopColor="#FF9CC6" />
        <Stop offset="1" stopColor="#E0246F" />
      </SvgGrad>
    </Defs>
  );
}

function Ears() {
  return (
    <Svg width={MASK} height={MASK} viewBox="0 0 512 512">
      <SatinDefs />
      <G>
        <Ellipse cx={178} cy={150} rx={50} ry={118} transform="rotate(-12 178 150)" fill="url(#i-satin)" stroke="url(#i-trim)" strokeWidth={8} />
        <Ellipse cx={180} cy={160} rx={20} ry={84} transform="rotate(-12 180 160)" fill="url(#i-inner)" />
        <Ellipse cx={334} cy={150} rx={50} ry={118} transform="rotate(12 334 150)" fill="url(#i-satin)" stroke="url(#i-trim)" strokeWidth={8} />
        <Ellipse cx={332} cy={160} rx={20} ry={84} transform="rotate(12 332 160)" fill="url(#i-inner)" />
      </G>
    </Svg>
  );
}

function Face({ shine }) {
  return (
    <Svg width={MASK} height={MASK} viewBox="0 0 512 512">
      <SatinDefs />
      <Path d={`${BODY} ${HOLES}`} fillRule="evenodd" fill="url(#i-satin)" stroke="url(#i-trim)" strokeWidth={9} strokeLinejoin="round" />
      <Path d={HOLES} fill="none" stroke="url(#i-trim)" strokeWidth={4} opacity={0.9} />
      {/* lace dots under the eyes */}
      <G fill="none" stroke="#FF8FC0" strokeWidth={3} opacity={0.7}>
        <Circle cx={118} cy={350} r={6} />
        <Circle cx={142} cy={364} r={6} />
        <Circle cx={394} cy={350} r={6} />
        <Circle cx={370} cy={364} r={6} />
      </G>
      {/* the shine that slides over the satin */}
      <AnimatedPath d="M96 290C140 262 196 262 230 280M282 280C316 262 372 262 416 290" fill="none" stroke="#FFFFFF" strokeWidth={7} strokeLinecap="round" opacity={shine} />
    </Svg>
  );
}

function Glow() {
  return (
    <Svg width={300} height={300}>
      <Defs>
        <RadialGradient id="i-glow" cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor="#F0287A" stopOpacity="0.55" />
          <Stop offset="0.45" stopColor="#B01E8E" stopOpacity="0.22" />
          <Stop offset="1" stopColor="#7B3CFF" stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Circle cx={150} cy={150} r={150} fill="url(#i-glow)" />
    </Svg>
  );
}

export function Intro({ onDone }) {
  const [v] = useState(() => ({
    turn: new Animated.Value(0), // cream silhouette → satin mask
    glow: new Animated.Value(0),
    ears: new Animated.Value(0),
    shine: new Animated.Value(0),
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
          ['turn', 'glow', 'lift', 'word', 'dot'].forEach((k) => v[k].setValue(1));
          Animated.timing(v.out, { toValue: 0, duration: 350, delay: 600, useNativeDriver: true }).start(finish);
          return;
        }
        Animated.sequence([
          Animated.delay(200),
          Animated.parallel([
            Animated.timing(v.turn, { toValue: 1, duration: 650, easing: ease, useNativeDriver: true }),
            Animated.timing(v.glow, { toValue: 1, duration: 900, easing: ease, useNativeDriver: true }),
          ]),
          Animated.parallel([
            // ears perk up and settle
            Animated.sequence([
              Animated.timing(v.ears, { toValue: 1, duration: 160, easing: Easing.out(Easing.quad), useNativeDriver: true }),
              Animated.spring(v.ears, { toValue: 0, speed: 12, bounciness: 14, useNativeDriver: true }),
            ]),
            // a shine slides over the satin
            Animated.sequence([
              Animated.timing(v.shine, { toValue: 0.55, duration: 280, useNativeDriver: false }),
              Animated.timing(v.shine, { toValue: 0.12, duration: 520, useNativeDriver: false }),
            ]),
          ]),
          Animated.parallel([
            Animated.timing(v.lift, { toValue: 1, duration: 550, easing: ease, useNativeDriver: true }),
            Animated.timing(v.word, { toValue: 1, duration: 550, delay: 120, easing: ease, useNativeDriver: true }),
          ]),
          Animated.spring(v.dot, { toValue: 1, speed: 14, bounciness: 14, useNativeDriver: true }),
          Animated.delay(500),
          Animated.timing(v.out, { toValue: 0, duration: 420, easing: Easing.in(Easing.quad), useNativeDriver: true }),
        ]).start(finish);
        setTimeout(() => !cancelled && tap(), 200 + 650 + 160);
      });
    return () => {
      cancelled = true;
    };
  }, [v, onDone]);

  const lift = v.lift.interpolate({ inputRange: [0, 1], outputRange: [0, -44] });
  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.wrap, { opacity: v.out }]}>
      {/* a soft candle-pink glow, no hard edge */}
      <Animated.View
        style={{
          position: 'absolute',
          opacity: v.glow,
          transform: [{ translateY: lift }, { scale: v.glow.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) }],
        }}
      >
        <Glow />
      </Animated.View>

      <Animated.View style={{ width: MASK, height: MASK, alignItems: 'center', justifyContent: 'center', transform: [{ translateY: lift }, { scale: v.lift.interpolate({ inputRange: [0, 1], outputRange: [1, 0.84] }) }] }}>
        {/* the launch screen's cream silhouette, fading out */}
        <Animated.View style={{ position: 'absolute', opacity: v.turn.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) }}>
          <Image source={require('../../assets/splash-icon.png')} style={{ width: ICON, height: ICON }} resizeMode="contain" />
        </Animated.View>
        {/* the satin mask, fading in */}
        <Animated.View style={{ position: 'absolute', opacity: v.turn, transform: [{ scale: v.turn.interpolate({ inputRange: [0, 1], outputRange: [ICON / MASK, 1] }) }] }}>
          <Animated.View style={{ position: 'absolute', transform: [{ translateY: v.ears.interpolate({ inputRange: [0, 1], outputRange: [0, -9] }) }] }}>
            <Ears />
          </Animated.View>
          <Face shine={v.shine} />
        </Animated.View>
      </Animated.View>

      {/* the word mark */}
      <Animated.View
        style={{
          position: 'absolute',
          top: '50%',
          marginTop: 30,
          flexDirection: 'row',
          alignItems: 'flex-end',
          opacity: v.word,
          transform: [{ translateY: v.word.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
        }}
      >
        <T style={{ fontFamily: F.displayX, fontSize: 44, lineHeight: 52, letterSpacing: -1.2 }}>tonight</T>
        <Animated.View style={{ opacity: v.dot, transform: [{ translateY: v.dot.interpolate({ inputRange: [0, 1], outputRange: [-60, 0] }) }, { scale: v.dot.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) }] }}>
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
