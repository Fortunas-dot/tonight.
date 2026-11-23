// Mask your face, like a camera filter: the face is found on the phone and the mask is placed on it
// (eyes, tilt and size). Drag or pinch only to fine-tune, or when no face is found.
// The mask is burned into a new image on the phone, so the bare face is never uploaded.
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Dimensions, Image, PanResponder, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import Svg, { Circle, Defs, Ellipse, G, Image as SvgImage, Path, RadialGradient, Stop } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { File, Paths } from 'expo-file-system';
import { C, F } from '../theme';
import { Icon } from '../icons';
import { Screen, T, Toggle, success, tap } from '../ui';
import { MANUAL, MASK_EYE_X, MASK_EYE_Y, VH, VW, findFace } from '../faces';

// Everything is drawn in the design's 342 by 430 frame (see faces.js).
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

const dist = (t) => Math.hypot(t[0].pageX - t[1].pageX, t[0].pageY - t[1].pageY);
const transformFor = (p) => `translate(${p.x} ${p.y}) rotate(${p.r || 0}) scale(${p.s}) translate(${-MASK_EYE_X} ${-MASK_EYE_Y})`;

// Draws one photo with its mask, full size and off screen, then hands back the burned-in PNG.
function Burner({ uri, place, mask, onDone }) {
  const ref = useRef(null);
  const sent = useRef(false);
  const M = MASKS.find((m) => m.id === mask)?.Comp;
  const shoot = () => {
    if (sent.current || !ref.current) return;
    sent.current = true;
    ref.current.toDataURL((b64) => onDone(b64), { width: OUT_W, height: OUT_H });
  };
  useEffect(() => {
    const t = setTimeout(shoot, 1500); // in case the image's load event never arrives
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <View style={styles.offscreen} pointerEvents="none">
      <Svg ref={ref} width={VW} height={VH} viewBox={`0 0 ${VW} ${VH}`}>
        <Defs>
          <FrostGradient />
        </Defs>
        <SvgImage href={{ uri }} x={0} y={0} width={VW} height={VH} preserveAspectRatio="xMidYMid slice" onLoad={() => setTimeout(shoot, 120)} />
        {M ? (
          <G transform={transformFor(place)}>
            <M />
          </G>
        ) : null}
      </Svg>
    </View>
  );
}

function FrostGradient() {
  return (
    <RadialGradient id="frost" cx="50%" cy="50%" r="50%">
      <Stop offset="0" stopColor="#2A2430" stopOpacity="0.98" />
      <Stop offset="0.75" stopColor="#2A2430" stopOpacity="0.95" />
      <Stop offset="1" stopColor="#2A2430" stopOpacity="0.7" />
    </RadialGradient>
  );
}

function saveB64(b64) {
  const f = new File(Paths.cache, `masked-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.png`);
  f.create();
  f.write(b64, { encoding: 'base64' });
  return f.uri;
}

/**
 * photos: the original photo uris; start: which one to open on.
 * onDone(results): results is a list of { index, uri, mask } for every photo that got a mask.
 */
export function MaskEditor({ photos, start = 0, onCancel, onDone }) {
  const { width } = useWindowDimensions();
  const pw = width - 48;
  const ph = (pw * VH) / VW;
  const [idx, setIdx] = useState(start);
  const [mask, setMask] = useState('bunny');
  const [places, setPlaces] = useState({}); // index → { x, y, s, r, auto }
  const [found, setFound] = useState({}); // index → 'finding' | 'found' | 'none'
  const [applyAll, setApplyAll] = useState(photos.length > 1);
  const [burning, setBurning] = useState(null); // { queue: [index...], done: [{index, uri}] }
  // The gesture handler reads the open photo and its placement from here.
  const [live] = useState(() => ({ idx: start, places: {} }));
  useEffect(() => {
    // A plain mutable holder, written after render, read only by the gesture callbacks.
    // eslint-disable-next-line react-hooks/immutability
    live.idx = idx;
    live.places = places;
  }, [live, idx, places]);

  // Find the face in every photo, the open one first.
  useEffect(() => {
    let alive = true;
    const order = [start, ...photos.map((_, i) => i).filter((i) => i !== start)];
    (async () => {
      for (const i of order) {
        if (!alive) return;
        setFound((f) => ({ ...f, [i]: 'finding' }));
        const place = await findFace(photos[i]);
        if (!alive) return;
        setFound((f) => ({ ...f, [i]: place ? 'found' : 'none' }));
        setPlaces((p) => (p[i] ? p : { ...p, [i]: place || MANUAL }));
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pos = places[idx] || MANUAL;

  // Fine-tuning: drag to move, pinch to resize.
  const [pan] = useState(() => {
    let from = null;
    const set = (next) => setPlaces((p) => ({ ...p, [live.idx]: next }));
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        from = { ...(live.places[live.idx] || MANUAL), pinch: null };
      },
      onPanResponderMove: (e, g) => {
        const t = e.nativeEvent.touches;
        const k = VW / (Dimensions.get('window').width - 48);
        if (t.length >= 2) {
          if (!from.pinch) from.pinch = { d: dist(t) };
          set({ ...from, pinch: undefined, s: Math.max(0.3, Math.min(3, (from.s * dist(t)) / from.pinch.d)) });
        } else if (!from.pinch) {
          set({ ...from, pinch: undefined, x: from.x + g.dx * k, y: from.y + g.dy * k });
        }
      },
    });
  });

  const M = MASKS.find((m) => m.id === mask)?.Comp;
  const status = found[idx];

  const done = () => {
    if (!M) {
      onDone([]);
      return;
    }
    // This photo always; with "all photos" on, also every other photo where a face was found.
    const queue = [idx, ...(applyAll ? photos.map((_, i) => i).filter((i) => i !== idx && found[i] === 'found') : [])];
    setBurning({ queue, done: [] });
  };

  const onBurned = (b64) => {
    const [index, ...rest] = burning.queue;
    let uri = null;
    try {
      uri = saveB64(b64);
    } catch {
      uri = null;
    }
    const doneList = uri ? [...burning.done, { index, uri, mask }] : burning.done;
    if (rest.length) setBurning({ queue: rest, done: doneList });
    else {
      success();
      setBurning(null);
      onDone(doneList);
    }
  };

  const busy = !!burning;
  const skipped = applyAll ? photos.filter((_, i) => i !== idx && found[i] === 'none').length : 0;

  return (
    <Screen>
      <View style={styles.head}>
        <Pressable accessibilityRole="button" onPress={onCancel} hitSlop={10} disabled={busy}>
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
        <Svg width={pw} height={ph} viewBox={`0 0 ${VW} ${VH}`}>
          <Defs>
            <FrostGradient />
          </Defs>
          <SvgImage href={{ uri: photos[idx] }} x={0} y={0} width={VW} height={VH} preserveAspectRatio="xMidYMid slice" />
          {M && status !== 'finding' && status ? (
            <G transform={transformFor(pos)}>
              <M />
            </G>
          ) : null}
        </Svg>
        <View style={[styles.pill, { left: 12, top: 12 }]} pointerEvents="none">
          {status === 'found' ? <View style={[styles.dot, { backgroundColor: '#6FA8FF' }]} /> : null}
          {status === 'finding' || !status ? <ActivityIndicator size="small" color="#6FA8FF" /> : null}
          <T v="small" c={status === 'none' ? '#FFD27A' : '#6FA8FF'} style={{ fontFamily: F.semi }}>
            {status === 'found' ? 'Face found · mask on' : status === 'none' ? 'No face found · drag it into place' : 'Finding your face…'}
          </T>
        </View>
        {status && status !== 'finding' ? (
          <View style={[styles.pill, { right: 12, bottom: 12 }]} pointerEvents="none">
            <T v="small">{status === 'found' ? 'Drag or pinch to fine-tune' : 'Pinch to resize'}</T>
          </View>
        ) : null}
      </View>

      {photos.length > 1 ? (
        <View style={styles.thumbs}>
          {photos.map((u, i) => (
            <Pressable key={u} accessibilityRole="button" accessibilityLabel={`Photo ${i + 1}`} accessibilityState={{ selected: i === idx }} onPress={() => setIdx(i)} disabled={busy}>
              <View style={[styles.thumb, i === idx && { borderColor: C.pink }]}>
                <Image source={{ uri: u }} style={StyleSheet.absoluteFill} />
                {found[i] === 'found' ? (
                  <View style={styles.thumbTick}>
                    <Icon name="check" size={9} color="#FFFFFF" stroke={3.4} />
                  </View>
                ) : null}
              </View>
            </Pressable>
          ))}
        </View>
      ) : null}

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

      {photos.length > 1 ? (
        <View style={styles.applyCard}>
          <View style={{ flex: 1 }}>
            <T style={{ fontFamily: F.medium }}>Apply to all my photos</T>
            <T v="small" c={C.muted} style={{ marginTop: 2 }}>
              {skipped ? `${skipped} without a clear face will stay as they are` : 'Placed on each face automatically'}
            </T>
          </View>
          <Toggle value={applyAll} onChange={setApplyAll} label="Apply mask to all my photos" />
        </View>
      ) : null}

      <View style={{ flex: 1 }} />
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="lock" size={16} color="#6FA8FF" />
        <T v="small" c={C.safeInk}>
          Added on your phone. Your bare face never leaves it.
        </T>
      </View>

      {burning ? <Burner key={burning.queue[0]} uri={photos[burning.queue[0]]} place={places[burning.queue[0]] || MANUAL} mask={mask} onDone={onBurned} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stage: { marginTop: 8, borderRadius: 24, overflow: 'hidden', backgroundColor: C.surf2, alignSelf: 'center' },
  pill: { position: 'absolute', minHeight: 28, paddingHorizontal: 10, borderRadius: 14, backgroundColor: 'rgba(14,12,16,0.75)', flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  thumbs: { flexDirection: 'row', gap: 8, marginTop: 12, justifyContent: 'center' },
  thumb: { width: 40, height: 50, borderRadius: 10, overflow: 'hidden', borderWidth: 2, borderColor: 'transparent', backgroundColor: C.surf2 },
  thumbTick: { position: 'absolute', right: 2, bottom: 2, width: 14, height: 14, borderRadius: 7, backgroundColor: '#3B7BFF', alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 },
  ring: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
  bubble: { width: 58, height: 58, borderRadius: 29, backgroundColor: C.surf2, borderWidth: 2, borderColor: '#2E2830', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  applyCard: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 16, padding: 14, backgroundColor: C.surf, borderRadius: 16 },
  offscreen: { position: 'absolute', left: -4000, top: 0, width: VW, height: VH },
});
