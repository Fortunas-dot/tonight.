// Mask your face, like a camera filter: the face is found on the phone and the mask is placed on it
// (eyes, tilt and size). Drag or pinch only to fine-tune, or when no face is found.
// The mask is burned into a new image on the phone, so the bare face is never uploaded.
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Dimensions, Image, PanResponder, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import Svg, { Circle, ClipPath, Defs, Ellipse, G, Image as SvgImage, LinearGradient as SvgLinear, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { File, Paths } from 'expo-file-system';
import { C, F } from '../theme';
import { Icon } from '../icons';
import { Screen, T, Toggle, success, tap } from '../ui';
import { MANUAL, VH, VW, findFace } from '../faces';
import { ART_BAND_Y, ART_BRIDGE_X, ART_EYE_Y, earsOf, scalePlacement } from '../faceFit';

// Everything is drawn in the design's 342 by 430 frame (see faces.js).
const OUT_W = 1080;
const OUT_H = Math.round((OUT_W * VH) / VW);

// The masks, drawn around the wearer's eyes: the eye holes sit 72 units apart, centred on (171, 225).
// A real face is about 2.4 eye-gaps wide and the top of the head about 1.7 eye-gaps above the eyes.

// Eye mask with almond eye holes (even-odd fill keeps the holes see-through).
const BODY = 'M72 194C98 196 136 188 171 205C206 188 244 196 270 194C266 234 246 264 212 265C193 266 182 255 171 248C160 255 149 266 130 265C96 264 76 234 72 194Z';
const HOLES = 'M112 227Q135 208 158 227Q135 241 112 227Z M184 227Q207 208 230 227Q207 241 184 227Z';
const EYES = `${BODY} ${HOLES}`;
// The band a headpiece sits on, following the top of the head.
const BAND = 'M86 132Q171 58 256 132';

// Gradients shared by every mask; each Svg that draws a mask includes these in its Defs.
function MaskDefs() {
  return (
    <>
      <SvgLinear id="satin" x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0" stopColor="#3A1828" />
        <Stop offset="0.55" stopColor="#14080F" />
        <Stop offset="1" stopColor="#070306" />
      </SvgLinear>
      <SvgLinear id="trimPink" x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0" stopColor="#FF7FB5" />
        <Stop offset="0.5" stopColor="#F0287A" />
        <Stop offset="1" stopColor="#B01E8E" />
      </SvgLinear>
      <SvgLinear id="velvetViolet" x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0" stopColor="#4B2A7A" />
        <Stop offset="1" stopColor="#170C2A" />
      </SvgLinear>
      <SvgLinear id="gold" x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0" stopColor="#FFE6A3" />
        <Stop offset="0.5" stopColor="#E8B64C" />
        <Stop offset="1" stopColor="#A8761E" />
      </SvgLinear>
      <SvgLinear id="earInner" x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0" stopColor="#FF9CC6" />
        <Stop offset="1" stopColor="#E0246F" />
      </SvgLinear>
      <SvgLinear id="feather" x1="0" y1="1" x2="1" y2="0">
        <Stop offset="0" stopColor="#7B3CFF" />
        <Stop offset="1" stopColor="#E3C8FF" />
      </SvgLinear>
      <ClipPath id="maskLeftHalf">
        <Rect x={-800} y={-800} width={971.6} height={2000} />
      </ClipPath>
      <ClipPath id="maskRightHalf">
        <Rect x={170.4} y={-800} width={1000} height={2000} />
      </ClipPath>
      <RadialGradient id="frost" cx="50%" cy="50%" r="50%">
        <Stop offset="0" stopColor="#2A2430" stopOpacity="0.98" />
        <Stop offset="0.8" stopColor="#2A2430" stopOpacity="0.95" />
        <Stop offset="1" stopColor="#2A2430" stopOpacity="0.75" />
      </RadialGradient>
    </>
  );
}

// Soft shadow under the mask so it sits on the skin instead of floating.
function Shadow({ d }) {
  return <Path d={d} fill="#000000" opacity={0.32} transform="translate(0 5)" fillRule="evenodd" />;
}

function EyeMask({ fill, trim, shine = 0.22 }) {
  return (
    <G>
      <Shadow d={EYES} />
      <Path d={EYES} fillRule="evenodd" fill={fill} stroke={trim} strokeWidth={3} strokeLinejoin="round" />
      {/* inner rim around the eyes */}
      <Path d={HOLES} fill="none" stroke={trim} strokeWidth={1.6} opacity={0.9} />
      {/* satin shine along the top edge */}
      <Path d="M84 202C106 200 142 196 166 208M176 208C200 196 236 200 258 202" fill="none" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" opacity={shine} />
    </G>
  );
}

function Lace({ color }) {
  return (
    <G fill="none" stroke={color} strokeWidth={1.3} opacity={0.75}>
      <Path d="M98 246q14 12 30 12M244 246q-14 12-30 12" />
      <Circle cx={104} cy={252} r={2.4} />
      <Circle cx={116} cy={258} r={2.4} />
      <Circle cx={238} cy={252} r={2.4} />
      <Circle cx={226} cy={258} r={2.4} />
      <Circle cx={171} cy={238} r={2} />
    </G>
  );
}

function Bunny({ part }) {
  return (
    <G>
      {part !== 'face' ? (
        <G transform="translate(0 16)">
          <G opacity={0.98}>
            <Path d="M112 104C96 64 98 6 120 -10C142 6 146 64 136 100Z" fill="#000000" opacity={0.25} transform="translate(2 4)" />
            <Path d="M112 104C96 64 98 6 120 -10C142 6 146 64 136 100Z" fill="url(#satin)" stroke="url(#trimPink)" strokeWidth={2.5} />
            <Path d="M116 94C108 64 110 20 120 6C130 20 132 64 128 92Z" fill="url(#earInner)" />
            <Path d="M206 100C196 64 200 6 222 -10C244 6 246 64 230 104Z" fill="#000000" opacity={0.25} transform="translate(2 4)" />
            <Path d="M206 100C196 64 200 6 222 -10C244 6 246 64 230 104Z" fill="url(#satin)" stroke="url(#trimPink)" strokeWidth={2.5} />
            <Path d="M214 92C210 64 212 20 222 6C232 20 234 64 226 94Z" fill="url(#earInner)" />
          </G>
          <Path d={BAND} fill="none" stroke="#120A10" strokeWidth={9} strokeLinecap="round" />
          <Path d={BAND} fill="none" stroke="url(#trimPink)" strokeWidth={2} strokeLinecap="round" opacity={0.9} />
        </G>
      ) : null}
      {part !== 'ears' ? (
        <G>
          <EyeMask fill="url(#satin)" trim="url(#trimPink)" />
          <Lace color="#FF7FB5" />
          {/* little heart at the temple */}
          <Path d="M258 210c-2.5-6-11-5-10.5 1.8c.5 5 10.5 10.2 10.5 10.2s10-5.2 10.5-10.2c.5-6.8-8-7.8-10.5-1.8z" fill="url(#trimPink)" />
        </G>
      ) : null}
    </G>
  );
}

function Masquerade() {
  return (
    <G>
      {/* feathers rising from the right temple */}
      <Path d="M250 206C262 160 286 118 312 96C304 140 286 180 258 214Z" fill="url(#feather)" opacity={0.95} />
      <Path d="M254 212C276 178 304 154 330 146C314 176 290 200 262 220Z" fill="url(#feather)" opacity={0.8} />
      <Path d="M250 204C252 160 262 120 276 92C282 130 274 172 258 210Z" fill="#C3A2FF" opacity={0.75} />
      <Path d="M258 214L300 120" stroke="#F4EFEA" strokeWidth={1} opacity={0.5} />
      <EyeMask fill="url(#velvetViolet)" trim="url(#gold)" shine={0.28} />
      <Path d="M100 240q16 18 40 20M242 240q-16 18-40 20" fill="none" stroke="url(#gold)" strokeWidth={1.8} opacity={0.9} />
      <Circle cx={171} cy={206} r={5.5} fill="url(#gold)" />
      <Circle cx={92} cy={222} r={3} fill="url(#gold)" />
      <Circle cx={250} cy={222} r={3} fill="url(#gold)" />
    </G>
  );
}

function Kitten({ part }) {
  return (
    <G>
      {part !== 'face' ? (
        <G transform="translate(0 16)">
          <Path d="M100 118L112 36L156 96Z" fill="#000000" opacity={0.25} transform="translate(2 4)" />
          <Path d="M100 118L112 36L156 96Z" fill="url(#satin)" stroke="url(#trimPink)" strokeWidth={2.5} strokeLinejoin="round" />
          <Path d="M112 104L118 60L142 94Z" fill="url(#earInner)" />
          <Path d="M242 118L230 36L186 96Z" fill="#000000" opacity={0.25} transform="translate(2 4)" />
          <Path d="M242 118L230 36L186 96Z" fill="url(#satin)" stroke="url(#trimPink)" strokeWidth={2.5} strokeLinejoin="round" />
          <Path d="M230 104L224 60L200 94Z" fill="url(#earInner)" />
          <Path d={BAND} fill="none" stroke="#120A10" strokeWidth={9} strokeLinecap="round" />
          <Path d={BAND} fill="none" stroke="url(#trimPink)" strokeWidth={2} strokeLinecap="round" opacity={0.9} />
        </G>
      ) : null}
      {part !== 'ears' ? (
        <G>
          <EyeMask fill="url(#satin)" trim="url(#trimPink)" />
          {/* whiskers on the cheeks */}
          <G stroke="#FF9CC6" strokeWidth={1.8} strokeLinecap="round" opacity={0.75}>
            <Path d="M104 270l-34-6M106 280l-34 4M238 270l34-6M236 280l34 4" />
          </G>
        </G>
      ) : null}
    </G>
  );
}

// Covers the whole face with a frosted oval.
function Frost() {
  return (
    <G>
      <Ellipse cx={171} cy={258} rx={92} ry={128} fill="url(#frost)" />
      <Ellipse cx={171} cy={258} rx={92} ry={128} fill="none" stroke="#6FA8FF" strokeWidth={1.5} opacity={0.5} />
    </G>
  );
}

const MASKS = [
  { id: 'none', label: 'None' },
  { id: 'bunny', label: 'Bunny', Comp: Bunny, ears: true },
  { id: 'masq', label: 'Masquerade', Comp: Masquerade },
  { id: 'kitten', label: 'Kitten', Comp: Kitten, ears: true },
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
    <Svg width={46} height={46} viewBox="66 -16 210 290">
      <Defs>
        <MaskDefs />
      </Defs>
      <M />
    </Svg>
  );
}

const dist = (t) => Math.hypot(t[0].pageX - t[1].pageX, t[0].pageY - t[1].pageY);
// Each half of the mask gets its own width (sl, sr), so it follows a turned head. See faceFit.js.
const halfTransform = (p, sx) => `translate(${p.x} ${p.y}) rotate(${p.r || 0}) scale(${sx} ${p.sy}) translate(${-ART_BRIDGE_X} ${-ART_EYE_Y})`;

// Ears and headband sit on top of the head: one even scale, the band's apex put at place.top above the eyes.
const earsTransform = (p) => {
  const e = earsOf(p);
  return `translate(${p.x + e.ex} ${p.y + e.ey}) rotate(${p.r || 0}) scale(${e.es}) translate(${-ART_BRIDGE_X} ${-ART_BAND_Y})`;
};

function Fitted({ place, Comp }) {
  const ears = MASKS.some((m) => m.Comp === Comp && m.ears);
  const part = ears ? 'face' : undefined;
  return (
    <G>
      {ears ? (
        <G transform={earsTransform(place)}>
          <Comp part="ears" />
        </G>
      ) : null}
      <G transform={halfTransform(place, place.sl)}>
        <G clipPath="url(#maskLeftHalf)">
          <Comp part={part} />
        </G>
      </G>
      <G transform={halfTransform(place, place.sr)}>
        <G clipPath="url(#maskRightHalf)">
          <Comp part={part} />
        </G>
      </G>
    </G>
  );
}

// Draws one photo with its mask, full size and off screen, then hands back the burned-in PNG.
function Burner({ uri, place, mask, onDone }) {
  const ref = useRef(null);
  const sent = useRef(false);
  const M = MASKS.find((m) => m.id === mask)?.Comp;
  const shoot = () => {
    if (sent.current || !ref.current) return;
    sent.current = true;
    // The Svg itself is laid out at the output size, so the whole photo fills the PNG.
    ref.current.toDataURL((b64) => onDone(b64));
  };
  useEffect(() => {
    const t = setTimeout(shoot, 1500); // in case the image's load event never arrives
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <View style={styles.offscreen} pointerEvents="none">
      <Svg ref={ref} width={OUT_W} height={OUT_H} viewBox={`0 0 ${VW} ${VH}`}>
        <Defs>
          <MaskDefs />
        </Defs>
        <SvgImage href={{ uri }} x={0} y={0} width={VW} height={VH} preserveAspectRatio="xMidYMid slice" onLoad={() => setTimeout(shoot, 120)} />
        {M ? <Fitted place={place} Comp={M} /> : null}
      </Svg>
    </View>
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
          const zoom = Math.max(0.3, Math.min(3, dist(t) / from.pinch.d));
          set({ ...scalePlacement(from, zoom), pinch: undefined });
        } else if (!from.pinch) {
          set({
            ...from,
            pinch: undefined,
            x: from.x + g.dx * k,
            y: from.y + g.dy * k,
          });
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
          {busy ? (
            <ActivityIndicator color={C.pink} />
          ) : (
            <T c="#FF7FB5" style={{ fontFamily: F.semi }}>
              Done
            </T>
          )}
        </Pressable>
      </View>

      <View style={[styles.stage, { width: pw, height: ph }]} {...pan.panHandlers}>
        <Svg width={pw} height={ph} viewBox={`0 0 ${VW} ${VH}`}>
          <Defs>
            <MaskDefs />
          </Defs>
          <SvgImage href={{ uri: photos[idx] }} x={0} y={0} width={VW} height={VH} preserveAspectRatio="xMidYMid slice" />
          {M && status !== 'finding' && status ? <Fitted place={pos} Comp={M} /> : null}
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
                  <View
                    style={[
                      styles.bubble,
                      {
                        width: 56,
                        height: 56,
                        borderRadius: 28,
                        borderWidth: 0,
                      },
                    ]}
                  >
                    <Thumb id={m.id} />
                  </View>
                </LinearGradient>
              ) : (
                <View style={styles.bubble}>
                  <Thumb id={m.id} />
                </View>
              )}
              <T v="small" c={on ? C.ink : C.muted} numberOfLines={1} adjustsFontSizeToFit style={{ fontFamily: on ? F.semi : F.medium, fontSize: 12 }}>
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
      <View
        style={{
          flexDirection: 'row',
          gap: 8,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
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
  head: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stage: {
    marginTop: 8,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: C.surf2,
    alignSelf: 'center',
  },
  pill: {
    position: 'absolute',
    minHeight: 28,
    paddingHorizontal: 10,
    borderRadius: 14,
    backgroundColor: 'rgba(14,12,16,0.75)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: { width: 7, height: 7, borderRadius: 4 },
  thumbs: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    justifyContent: 'center',
  },
  thumb: {
    width: 40,
    height: 50,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: C.surf2,
  },
  thumbTick: {
    position: 'absolute',
    right: 2,
    bottom: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#3B7BFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 },
  ring: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubble: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: C.surf2,
    borderWidth: 2,
    borderColor: '#2E2830',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  applyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 16,
    padding: 14,
    backgroundColor: C.surf,
    borderRadius: 16,
  },
  offscreen: {
    position: 'absolute',
    left: -(OUT_W + 1000),
    top: 0,
    width: OUT_W,
    height: OUT_H,
  },
});
