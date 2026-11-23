// Mask your face: pick a mask, drag it over your face, pinch to resize.
// The mask is burned into a new image on the phone, so the bare face is never uploaded.
import { useRef, useState } from 'react';
import { ActivityIndicator, Dimensions, PanResponder, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import Svg, { Defs, Ellipse, G, Image as SvgImage, Path, RadialGradient, Stop, Circle } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { File, Paths } from 'expo-file-system';
import { C, F } from '../theme';
import { Icon } from '../icons';
import { Screen, T, success, tap } from '../ui';

// Everything is drawn in the design's 342 × 430 frame; the face centre sits at (171, 222).
const VW = 342;
const VH = 430;
const OUT_W = 1080;
const OUT_H = Math.round((OUT_W * VH) / VW);

// Eye mask with two eye holes (even-odd fill keeps the holes see-through).
const EYES = 'M96 222C108 198 150 196 171 211C192 196 234 198 246 222C240 252 206 260 188 245C180 238 162 238 154 245C136 260 102 252 96 222Z M122 225a13 6.5 0 1 0 26 0a13 6.5 0 1 0 -26 0Z M194 225a13 6.5 0 1 0 26 0a13 6.5 0 1 0 -26 0Z';

function Bunny() {
  return (
    <G>
      <Ellipse cx={128} cy={96} rx={22} ry={72} transform="rotate(-14 128 96)" fill="#120A10" stroke="#F0287A" strokeWidth={3} />
      <Ellipse cx={128} cy={100} rx={9} ry={52} transform="rotate(-14 128 100)" fill="#F0287A" opacity={0.85} />
      <Ellipse cx={216} cy={98} rx={22} ry={72} transform="rotate(16 216 98)" fill="#120A10" stroke="#F0287A" strokeWidth={3} />
      <Ellipse cx={216} cy={102} rx={9} ry={52} transform="rotate(16 216 102)" fill="#F0287A" opacity={0.85} />
      <Path d="M104 178Q171 126 238 178" fill="none" stroke="#120A10" strokeWidth={11} strokeLinecap="round" />
      <Path d={EYES} fillRule="evenodd" fill="#120A10" stroke="#F0287A" strokeWidth={2.5} strokeLinejoin="round" />
      <G fill="none" stroke="#F0287A" strokeWidth={1.4} opacity={0.7}>
        <Circle cx={112} cy={240} r={3} />
        <Circle cx={124} cy={247} r={3} />
        <Circle cx={218} cy={247} r={3} />
        <Circle cx={230} cy={240} r={3} />
        <Circle cx={171} cy={231} r={2.5} />
      </G>
      <Path d="M244 214c-2-5-9-4-8.5 1.5c.4 4 8.5 8.5 8.5 8.5s8-4.5 8.5-8.5c.5-5.5-6.5-6.5-8.5-1.5z" fill="#F0287A" />
    </G>
  );
}

function Masquerade() {
  return (
    <G>
      <Path d="M244 214C262 180 284 150 302 138C294 170 278 198 250 222Z" fill="#7B3CFF" />
      <Path d="M246 220C272 200 298 190 316 192C298 208 276 222 250 228Z" fill="#A35BFF" />
      <Path d="M248 210C258 176 266 146 270 120C276 152 270 184 254 216Z" fill="#C3A2FF" opacity={0.8} />
      <Path d={EYES} fillRule="evenodd" fill="#2A1A40" stroke="#C3A2FF" strokeWidth={2.5} strokeLinejoin="round" />
      <Path d="M104 226q10 14 30 16M238 226q-10 14-30 16" fill="none" stroke="#FFD27A" strokeWidth={1.6} opacity={0.8} />
      <Circle cx={171} cy={207} r={5} fill="#FFD27A" />
    </G>
  );
}

function Kitten() {
  return (
    <G>
      <Path d="M106 178L116 108L152 150Z" fill="#120A10" stroke="#FF7FB5" strokeWidth={3} strokeLinejoin="round" />
      <Path d="M118 160L122 126L140 148Z" fill="#FF7FB5" opacity={0.8} />
      <Path d="M236 178L226 108L190 150Z" fill="#120A10" stroke="#FF7FB5" strokeWidth={3} strokeLinejoin="round" />
      <Path d="M224 160L220 126L202 148Z" fill="#FF7FB5" opacity={0.8} />
      <Path d={EYES} fillRule="evenodd" fill="#120A10" stroke="#FF7FB5" strokeWidth={2.5} strokeLinejoin="round" />
      <Path d="M112 262l-28-5M112 270l-28 4M230 262l28-5M230 270l28 4" fill="none" stroke="#FF7FB5" strokeWidth={1.8} strokeLinecap="round" opacity={0.7} />
    </G>
  );
}

// Covers the whole face with a frosted oval.
function Frost() {
  return (
    <G>
      <Ellipse cx={171} cy={236} rx={84} ry={106} fill="url(#frost)" />
      <Ellipse cx={171} cy={236} rx={84} ry={106} fill="none" stroke="#6FA8FF" strokeWidth={1.5} opacity={0.5} />
    </G>
  );
}

const MASKS = [
  { id: 'none', label: 'None' },
  { id: 'bunny', label: 'Bunny', Comp: Bunny },
  { id: 'masq', label: 'Masquerade', Comp: Masquerade },
  { id: 'kitten', label: 'Kitten', Comp: Kitten },
  { id: 'frost', label: 'Frost', Comp: Frost },
];

function Thumb({ id }) {
  if (id === 'none')
    return (
      <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth={1.8} strokeLinecap="round">
        <Circle cx={12} cy={12} r={8} />
        <Path d="M6.5 17.5l11-11" />
      </Svg>
    );
  if (id === 'frost')
    return (
      <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="#6FA8FF" strokeWidth={1.8} strokeLinecap="round">
        <Circle cx={12} cy={12} r={8} strokeDasharray="2 3" />
        <Circle cx={12} cy={12} r={3} />
      </Svg>
    );
  const M = MASKS.find((m) => m.id === id).Comp;
  return (
    <Svg width={44} height={44} viewBox="86 80 170 190">
      <M />
    </Svg>
  );
}

// Screen px to frame units, for the stage width (screen minus the 24 px gutters).
const pxToFrame = () => VW / (Dimensions.get('window').width - 48);

const dist = (t) => Math.hypot(t[0].pageX - t[1].pageX, t[0].pageY - t[1].pageY);

export function MaskEditor({ uri, onCancel, onDone }) {
  const { width } = useWindowDimensions();
  const pw = width - 48;
  const ph = (pw * VH) / VW;
  const [mask, setMask] = useState('bunny');
  const [pos, setPos] = useState({ x: 171, y: 222, s: 1 });
  const [busy, setBusy] = useState(false);
  const svg = useRef(null);
  const [pan] = useState(() => {
    // Gesture state lives in this closure: where the mask was when the touch started.
    let start = null;
    let current = { x: 171, y: 222, s: 1 };
    const move = (next) => {
      current = next;
      setPos(next);
    };
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        start = { ...current, pinch: null };
      },
      onPanResponderMove: (e, g) => {
        const t = e.nativeEvent.touches;
        if (t.length >= 2) {
          if (!start.pinch) start.pinch = { d: dist(t), s: current.s };
          move({ ...current, s: Math.max(0.4, Math.min(2.6, (start.pinch.s * dist(t)) / start.pinch.d)) });
        } else if (!start.pinch) {
          move({ ...current, x: start.x + g.dx * pxToFrame(), y: start.y + g.dy * pxToFrame() });
        }
      },
    });
  });

  const M = MASKS.find((m) => m.id === mask)?.Comp;

  const done = () => {
    if (!M) {
      onDone(uri, null);
      return;
    }
    setBusy(true);
    svg.current.toDataURL(
      (b64) => {
        try {
          const f = new File(Paths.cache, `masked-${Date.now()}.png`);
          f.create();
          f.write(b64, { encoding: 'base64' });
          success();
          onDone(f.uri, mask);
        } catch {
          setBusy(false);
        }
      },
      { width: OUT_W, height: OUT_H },
    );
  };

  return (
    <Screen>
      <View style={styles.head}>
        <Pressable accessibilityRole="button" onPress={onCancel} hitSlop={10}>
          <T c={C.muted} style={{ fontFamily: F.medium }}>
            Cancel
          </T>
        </Pressable>
        <T style={{ fontFamily: F.semi }}>Mask your face</T>
        <Pressable accessibilityRole="button" onPress={done} disabled={busy} hitSlop={10}>
          {busy ? <ActivityIndicator color={C.pink} /> : <T c="#FF7FB5" style={{ fontFamily: F.semi }}>Done</T>}
        </Pressable>
      </View>

      <View style={[styles.stage, { width: pw, height: ph }]} {...pan.panHandlers}>
        <Svg ref={svg} width={pw} height={ph} viewBox={`0 0 ${VW} ${VH}`}>
          <Defs>
            <RadialGradient id="frost" cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor="#2A2430" stopOpacity="0.98" />
              <Stop offset="0.75" stopColor="#2A2430" stopOpacity="0.95" />
              <Stop offset="1" stopColor="#2A2430" stopOpacity="0.7" />
            </RadialGradient>
          </Defs>
          <SvgImage href={{ uri }} x={0} y={0} width={VW} height={VH} preserveAspectRatio="xMidYMid slice" />
          {M ? (
            <G transform={`translate(${pos.x} ${pos.y}) scale(${pos.s}) translate(-171 -222)`}>
              <M />
            </G>
          ) : null}
        </Svg>
        <View style={styles.hint} pointerEvents="none">
          <T v="small">Drag onto your face · pinch to resize</T>
        </View>
      </View>

      <View style={styles.row}>
        {MASKS.map((m) => {
          const on = mask === m.id;
          return (
            <Pressable
              key={m.id}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              accessibilityLabel={`${m.label} mask`}
              onPress={() => {
                tap();
                setMask(m.id);
              }}
              style={{ alignItems: 'center', gap: 6, width: 64 }}
            >
              {on ? (
                <LinearGradient colors={[C.pink, C.blue]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.ring}>
                  <View style={[styles.bubble, { width: 56, height: 56, borderRadius: 28, borderWidth: 0 }]}>
                    <Thumb id={m.id} />
                  </View>
                </LinearGradient>
              ) : (
                <View style={styles.bubble}>
                  <Thumb id={m.id} />
                </View>
              )}
              <T v="small" c={on ? C.ink : C.muted} style={{ fontFamily: on ? F.semi : F.medium }}>
                {m.label}
              </T>
            </Pressable>
          );
        })}
      </View>

      <View style={{ flex: 1 }} />
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="lock" size={16} color="#6FA8FF" />
        <T v="small" c={C.safeInk}>
          Added on your phone. Your bare face never leaves it.
        </T>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stage: { marginTop: 8, borderRadius: 24, overflow: 'hidden', backgroundColor: C.surf2, alignSelf: 'center' },
  hint: { position: 'absolute', right: 12, bottom: 12, height: 28, paddingHorizontal: 10, borderRadius: 14, backgroundColor: 'rgba(14,12,16,0.75)', justifyContent: 'center' },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 18 },
  ring: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
  bubble: { width: 58, height: 58, borderRadius: 29, backgroundColor: C.surf2, borderWidth: 2, borderColor: '#2E2830', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
});
