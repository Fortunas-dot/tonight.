import { useEffect, useRef, useState } from 'react';
import { Alert, Animated, Easing, Image, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import Svg, { Circle, Defs, LinearGradient as SvgGrad, Path, Stop } from 'react-native-svg';
import { C, F, FIRE, GRAD } from '../theme';
import { Icon, Verified } from '../icons';
import { BOUNDARIES, INTENTS, TURN_ONS, VOWS } from '../data';
import { Card, Chip, GhostButton, GradientButton, Header, Photo, Rise, Row, Screen, T, Toggle, success, tap, thud } from '../ui';

const STEPS = 6;

/* ---------- Welcome ---------- */

export function Welcome({ next }) {
  return (
    <Screen strong style={{ justifyContent: 'flex-end' }} bottom={30}>
      <View style={{ position: 'absolute', top: 70, left: 24 }}>
        <T style={{ fontFamily: F.displayX, fontSize: 26, letterSpacing: -0.5 }}>
          tonight<T c={C.pink} style={{ fontFamily: F.displayX, fontSize: 26 }}>.</T>
        </T>
      </View>
      <Rise>
        <T v="display" style={{ fontSize: 46, lineHeight: 48 }}>
          Adults.{'\n'}Clear intentions.{'\n'}No games.
        </T>
      </Rise>
      <Rise delay={120} style={{ marginTop: 26, gap: 14 }}>
        {[
          ['shieldCheck', 'Every face is live-verified. No bots.'],
          ['filter', 'You set the boundaries. We match on them.'],
          ['eyeOff', 'Nothing explicit reaches you without your yes.'],
          ['lock', 'Screenshots are blocked. What happens here stays here.'],
        ].map(([icon, text]) => (
          <View key={text} style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
            <Icon name={icon} size={22} color={C.blueL} />
            <T c={C.ink2} style={{ flex: 1 }}>
              {text}
            </T>
          </View>
        ))}
      </Rise>
      <Rise delay={240} style={{ marginTop: 34, gap: 10 }}>
        <GradientButton title="Get started" onPress={next} />
        <T v="small" c={C.faint} style={{ textAlign: 'center', marginTop: 8 }}>
          18+ only. By continuing you agree to the Terms and Privacy Policy at fortunas.nl/tonight.
        </T>
      </Rise>
    </Screen>
  );
}

/* ---------- The Tonight Code ritual ---------- */

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const RING = 2 * Math.PI * 48;

function FlameGlyph({ size = 16 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Defs>
        <SvgGrad id="fire" x1="0.5" y1="1" x2="0.5" y2="0">
          <Stop offset="0" stopColor={FIRE[2]} />
          <Stop offset="0.55" stopColor={FIRE[1]} />
          <Stop offset="1" stopColor={FIRE[0]} />
        </SvgGrad>
      </Defs>
      <Path d="M12 2c1.2 4.5 6 6.2 6 11.2A6 6 0 0 1 6 13.2c0-2.8 1.7-4.5 2.9-5.6.3 2.2 1.5 3.4 2.9 3.4-1.1-3.4 0-6.7.2-9z" fill="url(#fire)" />
    </Svg>
  );
}

function Vow({ vow, lit, isNext, onToggle }) {
  const [pop] = useState(() => new Animated.Value(lit ? 1 : 0));
  useEffect(() => {
    if (lit) {
      pop.setValue(0);
      Animated.spring(pop, { toValue: 1, useNativeDriver: true, speed: 14, bounciness: 14 }).start();
    }
  }, [lit, pop]);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ checked: lit }}
      accessibilityLabel={`Vow ${vow.n}: ${vow.text}`}
      onPress={onToggle}
      style={{ alignItems: 'center', paddingVertical: 6, opacity: lit ? 1 : 0.45 }}
    >
      {lit ? (
        <Animated.View style={{ transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1] }) }] }}>
          <FlameGlyph />
        </Animated.View>
      ) : (
        <T v="small" c={C.muted} style={{ fontFamily: F.bold, letterSpacing: 3, height: 16 }}>
          {vow.n}
        </T>
      )}
      <Animated.Text
        style={{
          fontFamily: F.display,
          fontSize: 17,
          color: lit ? '#FFF3EA' : C.ink,
          textShadowColor: lit ? 'rgba(255,138,61,0.9)' : 'transparent',
          textShadowRadius: lit ? 14 : 0,
          transform: [{ scale: lit ? pop.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.94, 1.08, 1] }) : 1 }],
        }}
      >
        {vow.text}
      </Animated.Text>
      {isNext ? (
        <T v="small" c={C.orange} style={{ marginTop: 2 }}>
          tap to take this vow
        </T>
      ) : null}
    </Pressable>
  );
}

export function Code({ next }) {
  const [lit, setLit] = useState(VOWS.map(() => false));
  const [sealed, setSealed] = useState(false);
  const [hold] = useState(() => new Animated.Value(0));
  const [fire] = useState(() => new Animated.Value(0));
  const anim = useRef(null);
  const count = lit.filter(Boolean).length;
  const all = count === VOWS.length;
  const nextIdx = lit.indexOf(false);

  useEffect(() => {
    Animated.timing(fire, { toValue: count / VOWS.length, duration: 700, useNativeDriver: false }).start();
  }, [count, fire]);

  const toggle = (i) => {
    if (sealed) return;
    const n = [...lit];
    n[i] = !n[i];
    if (n[i]) thud();
    else tap();
    setLit(n);
  };

  const startHold = () => {
    if (!all || sealed) return;
    tap();
    anim.current = Animated.timing(hold, { toValue: 1, duration: 1300, easing: Easing.linear, useNativeDriver: false });
    anim.current.start(({ finished }) => {
      if (finished) {
        success();
        setSealed(true);
        setTimeout(next, 1100);
      }
    });
  };
  const stopHold = () => {
    if (sealed) return;
    anim.current?.stop();
    Animated.timing(hold, { toValue: 0, duration: 250, useNativeDriver: false }).start();
  };

  return (
    <Screen scroll bg={C.bgDeep} pad={28} bottom={18} style={{ alignItems: 'center' }}>
      <Animated.View
        style={[
          styles.emblem,
          {
            shadowOpacity: fire.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.9] }),
            shadowRadius: fire.interpolate({ inputRange: [0, 1], outputRange: [12, 36] }),
          },
        ]}
      >
        <LinearGradient colors={[C.pink, C.orange, C.violet]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.emblemRing}>
          <View style={styles.emblemInner}>
            <Animated.View style={{ position: 'absolute', opacity: fire.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) }}>
              <Icon name="flame" size={38} color={C.violetL} stroke={1.6} />
            </Animated.View>
            <Animated.View style={{ opacity: fire }}>
              <FlameGlyph size={40} />
            </Animated.View>
          </View>
        </LinearGradient>
      </Animated.View>
      <T v="small" c={C.muted} style={{ marginTop: 14, letterSpacing: 4, fontFamily: F.semi }}>
        BEFORE YOU ENTER
      </T>
      <T v="title" style={{ fontSize: 32, textAlign: 'center', marginTop: 4, fontFamily: F.displayX }}>
        The Tonight Code
      </T>
      <T v="meta" c={C.muted} style={{ textAlign: 'center', marginTop: 4 }}>
        {sealed ? 'Sealed. Welcome in.' : all ? 'All seven vows taken. Now seal it.' : `${count} of 7 vows taken. Tap each to take it.`}
      </T>
      <View style={{ width: '100%', marginTop: 10 }}>
        {VOWS.map((v, i) => (
          <View key={v.n}>
            {i > 0 ? (
              <View style={styles.orn}>
                <View style={[styles.ornLine, lit[i] && lit[i - 1] && { backgroundColor: C.orange }]} />
                <View style={[styles.ornDot, lit[i] && lit[i - 1] && { backgroundColor: C.orange }]} />
                <View style={[styles.ornLine, lit[i] && lit[i - 1] && { backgroundColor: C.orange }]} />
              </View>
            ) : null}
            <Vow vow={v} lit={lit[i]} isNext={i === nextIdx} onToggle={() => toggle(i)} />
          </View>
        ))}
      </View>
      <View style={{ height: 18 }} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Press and hold to seal the Tonight Code"
        onPressIn={startHold}
        onPressOut={stopHold}
        style={{ width: 96, height: 96, alignItems: 'center', justifyContent: 'center', opacity: all ? 1 : 0.35 }}
      >
        <Svg width={96} height={96} viewBox="0 0 104 104" style={{ position: 'absolute' }}>
          <Defs>
            <SvgGrad id="seal" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={FIRE[0]} />
              <Stop offset="0.4" stopColor={FIRE[1]} />
              <Stop offset="0.75" stopColor={FIRE[2]} />
              <Stop offset="1" stopColor={C.violet} />
            </SvgGrad>
          </Defs>
          <Circle cx={52} cy={52} r={48} stroke={C.line} strokeWidth={4} fill="none" />
          <AnimatedCircle
            cx={52}
            cy={52}
            r={48}
            stroke="url(#seal)"
            strokeWidth={4}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={RING}
            strokeDashoffset={hold.interpolate({ inputRange: [0, 1], outputRange: [RING, 0] })}
            transform="rotate(-90 52 52)"
          />
        </Svg>
        <View style={[styles.sealInner, sealed && { backgroundColor: '#5A2412' }]}>
          <Icon name="fingerprint" size={32} color={C.ink} stroke={1.5} />
        </View>
      </Pressable>
      <T v="label" c={C.ink2} style={{ marginTop: 8, letterSpacing: 1 }}>
        {sealed ? 'Sealed' : all ? 'Press and hold to seal' : 'Take all 7 vows first'}
      </T>
      <Card tone="safe" style={{ marginTop: 10, flexDirection: 'row', gap: 10, alignItems: 'center', padding: 10 }}>
        <Icon name="shieldCheck" size={20} color={C.blueL} />
        <T v="small" c={C.safeInk} style={{ flex: 1 }}>
          Ward, our watchdog, guards this Code to protect our members. Break a vow and you’re out. Anything unsafe is one strike.
        </T>
      </Card>
    </Screen>
  );
}

/* ---------- Profile steps ---------- */

function Next({ disabled, onPress, title = 'Continue' }) {
  return <GradientButton title={title} disabled={disabled} onPress={onPress} />;
}

export function Basics({ profile, setProfile, next, back }) {
  const [name, setName] = useState(profile.name || '');
  const [age, setAge] = useState(profile.age ? String(profile.age) : '');
  const [gender, setGender] = useState(profile.gender || 'Woman');
  const [show, setShow] = useState(profile.show || ['Men']);
  const ageNum = parseInt(age, 10);
  const valid = name.trim().length > 0 && ageNum >= 18 && ageNum < 100;
  const toggleShow = (s) => setShow(show.includes(s) ? show.filter((x) => x !== s) : [...show, s]);
  return (
    <Screen scroll>
      <Header onBack={back} step={1} total={STEPS} />
      <T v="title" style={{ marginTop: 12 }}>
        Let’s start with you
      </T>
      <T v="meta" c={C.muted} style={{ marginTop: 4 }}>
        Only your first name and age are shown.
      </T>
      <T v="label" c={C.muted} style={styles.lbl}>
        First name or nickname
      </T>
      <TextInput value={name} onChangeText={setName} placeholder="Your name" placeholderTextColor={C.faint} style={styles.input} accessibilityLabel="First name" />
      <T v="label" c={C.muted} style={styles.lbl}>
        Age
      </T>
      <TextInput value={age} onChangeText={(t) => setAge(t.replace(/[^0-9]/g, ''))} keyboardType="number-pad" maxLength={2} placeholder="18+" placeholderTextColor={C.faint} style={styles.input} accessibilityLabel="Age" />
      {age.length === 2 && ageNum < 18 ? (
        <T v="small" c={C.red} style={{ marginTop: 6 }}>
          Tonight is for adults 18 and over.
        </T>
      ) : null}
      <T v="label" c={C.muted} style={styles.lbl}>
        I am
      </T>
      <View style={styles.wrap}>
        {['Woman', 'Man', 'Non-binary', 'A couple'].map((g) => (
          <Chip key={g} label={g} on={gender === g} onPress={() => setGender(g)} />
        ))}
      </View>
      <T v="label" c={C.muted} style={styles.lbl}>
        Show me
      </T>
      <View style={styles.wrap}>
        {['Women', 'Men', 'Non-binary', 'Couples'].map((g) => (
          <Chip key={g} label={g} tone="blue" on={show.includes(g)} onPress={() => toggleShow(g)} />
        ))}
      </View>
      <View style={{ height: 30 }} />
      <Next
        disabled={!valid}
        onPress={() => {
          setProfile({ ...profile, name: name.trim(), age: ageNum, gender, show });
          next();
        }}
      />
    </Screen>
  );
}

export function Photos({ profile, setProfile, next, back }) {
  const [photos, setPhotos] = useState(profile.photos || []);
  const [blur, setBlur] = useState(!!profile.blurFace);
  const add = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [3, 4], quality: 0.8 });
    if (!res.canceled && res.assets?.[0]) setPhotos([...photos, res.assets[0].uri].slice(0, 6));
  };
  const remove = (i) => setPhotos(photos.filter((_, j) => j !== i));
  const slots = Array.from({ length: 6 }, (_, i) => photos[i]);
  return (
    <Screen scroll>
      <Header onBack={back} step={2} total={STEPS} />
      <T v="title" style={{ marginTop: 12 }}>
        Show your best side
      </T>
      <T v="meta" c={C.muted} style={{ marginTop: 4 }}>
        Add at least 2 photos, one with your face. No nudity on public photos.
      </T>
      <View style={styles.grid}>
        {slots.map((uri, i) => (
          <Pressable
            key={i}
            accessibilityRole="button"
            accessibilityLabel={uri ? `Remove photo ${i + 1}` : 'Add photo'}
            onPress={() => (uri ? remove(i) : add())}
            style={[styles.slot, i === 0 && styles.slotMain, !uri && styles.slotEmpty]}
          >
            {uri ? (
              <>
                <Image source={{ uri }} style={StyleSheet.absoluteFill} />
                <View style={styles.slotX}>
                  <Icon name="close" size={12} color={C.ink} stroke={3} />
                </View>
                {i === 0 ? (
                  <View style={styles.mainTag}>
                    <T v="small" c="#FFFFFF" style={{ fontFamily: F.bold, fontSize: 10 }}>
                      MAIN
                    </T>
                  </View>
                ) : null}
              </>
            ) : (
              <Icon name="plus" size={22} color={C.muted} />
            )}
          </Pressable>
        ))}
      </View>
      <Card style={{ marginTop: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <T style={{ fontFamily: F.medium }}>Blur my face until we match</T>
          <T v="small" c={C.muted} style={{ marginTop: 2 }}>
            Great for discretion. Masks are coming in the next update.
          </T>
        </View>
        <Toggle value={blur} onChange={setBlur} label="Blur my face until we match" />
      </Card>
      <View style={{ height: 24 }} />
      <Next
        disabled={photos.length < 2}
        onPress={() => {
          setProfile({ ...profile, photos, blurFace: blur });
          next();
        }}
      />
      <Pressable
        onPress={() => {
          setProfile({ ...profile, photos, blurFace: blur });
          next();
        }}
        style={{ alignItems: 'center', paddingVertical: 14 }}
      >
        <T v="label" c={C.muted}>
          Skip for this test build
        </T>
      </Pressable>
    </Screen>
  );
}

const ANSWERS = ['Yes', 'Maybe', 'No'];
const ANSWER_BG = { Yes: '#2E5E4A', Maybe: '#5A4A22', No: '#4A2328' };

export function Boundaries({ profile, setProfile, next, back }) {
  const [intents, setIntents] = useState(profile.intents || ['Tonight']);
  const [answers, setAnswers] = useState(profile.boundaries || { 'Meet for a drink first': 'Yes', 'Protection, always': 'Yes' });
  const [turnOns, setTurnOns] = useState(profile.turnOns || []);
  const tog = (arr, set, v, max) => set(arr.includes(v) ? arr.filter((x) => x !== v) : max && arr.length >= max ? arr : [...arr, v]);
  return (
    <Screen scroll>
      <Header onBack={back} step={3} total={STEPS} />
      <T v="title" style={{ marginTop: 12 }}>
        What are you after?
      </T>
      <View style={[styles.wrap, { marginTop: 14 }]}>
        {INTENTS.map((i) => (
          <Chip key={i} label={i} on={intents.includes(i)} onPress={() => tog(intents, setIntents, i)} />
        ))}
      </View>
      <T v="h" style={{ marginTop: 26 }}>
        Your boundaries
      </T>
      <T v="small" c={C.muted} style={{ marginTop: 2 }}>
        Your no’s are never shown. They quietly filter out anyone who needs them.
      </T>
      {BOUNDARIES.map((b) => (
        <View key={b} style={styles.bRow}>
          <T style={{ flex: 1, fontSize: 14 }}>{b}</T>
          <View style={styles.yn}>
            {ANSWERS.map((a) => (
              <Pressable
                key={a}
                accessibilityRole="button"
                accessibilityLabel={`${b}: ${a}`}
                accessibilityState={{ selected: answers[b] === a }}
                onPress={() => {
                  tap();
                  setAnswers({ ...answers, [b]: a });
                }}
                style={[styles.ynBtn, answers[b] === a && { backgroundColor: ANSWER_BG[a] }]}
              >
                <T v="small" c={answers[b] === a ? C.ink : C.muted} style={{ fontFamily: F.medium }}>
                  {a}
                </T>
              </Pressable>
            ))}
          </View>
        </View>
      ))}
      <T v="h" style={{ marginTop: 26 }}>
        What turns you on
      </T>
      <T v="small" c={C.muted} style={{ marginTop: 2 }}>
        Pick up to 5. Shared ones light up for matches.
      </T>
      <View style={[styles.wrap, { marginTop: 10 }]}>
        {TURN_ONS.map((t) => (
          <Chip key={t} small label={t} on={turnOns.includes(t)} onPress={() => tog(turnOns, setTurnOns, t, 5)} />
        ))}
      </View>
      <View style={{ height: 28 }} />
      <Next
        onPress={() => {
          setProfile({ ...profile, intents, boundaries: answers, turnOns });
          next();
        }}
      />
    </Screen>
  );
}

export function Verify({ profile, setProfile, next, back }) {
  const [state, setState] = useState(profile.verified ? 'done' : 'idle');
  const [spin] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (state !== 'checking') return undefined;
    const loop = Animated.loop(Animated.timing(spin, { toValue: 1, duration: 1100, easing: Easing.linear, useNativeDriver: true }));
    loop.start();
    const t = setTimeout(() => {
      loop.stop();
      success();
      setState('done');
    }, 2200);
    return () => {
      loop.stop();
      clearTimeout(t);
    };
  }, [state, spin]);

  const start = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Camera needed', 'Allow camera access in Settings to verify that you are a real person.');
      return;
    }
    const res = await ImagePicker.launchCameraAsync({ cameraType: ImagePicker.CameraType.front, quality: 0.5 });
    if (!res.canceled) setState('checking');
  };

  return (
    <Screen>
      <Header onBack={back} step={4} total={STEPS} />
      <T v="title" style={{ marginTop: 12 }}>
        Prove you’re real.{'\n'}Takes 20 seconds.
      </T>
      <T v="meta" c={C.muted} style={{ marginTop: 6 }}>
        Everyone here did this. It’s why there are no bots.
      </T>
      <View style={styles.oval}>
        {state === 'checking' ? (
          <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ rotate: spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] }]}>
            <LinearGradient colors={[C.pink, 'transparent']} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 6, borderRadius: 3 }} />
          </Animated.View>
        ) : null}
        {state === 'done' ? <Verified size={72} /> : <Icon name="camera" size={56} color={C.muted} stroke={1.4} />}
        <T v="meta" c={C.ink2} style={{ position: 'absolute', bottom: 26 }}>
          {state === 'idle' ? 'A quick selfie, face in the frame' : state === 'checking' ? 'Checking it’s really you…' : 'Verified. Welcome.'}
        </T>
      </View>
      <View style={{ gap: 10, marginTop: 22 }}>
        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
          <Icon name="check" size={18} color={C.blueL} />
          <T v="meta" c={C.safeInk}>
            Compared to your photos, then deleted
          </T>
        </View>
        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
          <Icon name="check" size={18} color={C.blueL} />
          <T v="meta" c={C.safeInk}>
            Test build: the check is simulated
          </T>
        </View>
      </View>
      <View style={{ flex: 1 }} />
      {state === 'done' ? (
        <Next
          onPress={() => {
            setProfile({ ...profile, verified: true });
            next();
          }}
        />
      ) : (
        <GradientButton title={state === 'checking' ? 'Checking…' : 'Take my selfie'} disabled={state === 'checking'} onPress={start} />
      )}
    </Screen>
  );
}

export function Discretion({ profile, setProfile, next, back }) {
  const [s, setS] = useState(profile.discretion || { quiet: true, faceId: true, contacts: false, flip: true });
  const set = (k) => (v) => setS({ ...s, [k]: v });
  return (
    <Screen scroll>
      <Header onBack={back} step={5} total={STEPS} />
      <T v="title" style={{ marginTop: 12 }}>
        Keep it between us.
      </T>
      <LinearGradient colors={GRAD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 19, padding: 1.5, marginTop: 18 }}>
        <View style={{ backgroundColor: C.safeBg, borderRadius: 18, padding: 14, flexDirection: 'row', gap: 14, alignItems: 'center' }}>
          <LinearGradient colors={[C.pink, C.blue]} style={{ width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="eyeOff" size={24} color="#FFFFFF" />
          </LinearGradient>
          <View style={{ flex: 1 }}>
            <T style={{ fontFamily: F.semi }}>Screenshots are blocked</T>
            <T v="small" c={C.safeInk} style={{ marginTop: 2 }}>
              Profiles, photos and chats come out blank in screenshots and screen recordings. Always on, for everyone.
            </T>
          </View>
        </View>
      </LinearGradient>
      <View style={{ marginTop: 14 }}>
        <Row title="Quiet notifications" sub="“You have a new update”, no names or previews" right={<Toggle value={s.quiet} onChange={set('quiet')} label="Quiet notifications" />} />
        <Row title="Face ID to open" sub="Locks again after 1 minute away" right={<Toggle value={s.faceId} onChange={set('faceId')} label="Face ID to open" />} />
        <Row title="Hide me from my contacts" sub="Numbers are hashed on your phone" right={<Toggle value={s.contacts} onChange={set('contacts')} label="Hide me from my contacts" />} />
        <Row last title="Flip-to-hide" sub="Turn your phone face-down for a blank screen" right={<Toggle value={s.flip} onChange={set('flip')} label="Flip-to-hide" />} />
      </View>
      <View style={{ height: 24 }} />
      <Next
        onPress={() => {
          setProfile({ ...profile, discretion: s });
          next();
        }}
      />
    </Screen>
  );
}

export function Preview({ profile, next, back }) {
  return (
    <Screen scroll>
      <Header onBack={back} step={STEPS} total={STEPS} />
      <T v="title" style={{ marginTop: 12 }}>
        Looking good{profile.name ? `, ${profile.name}` : ''}
      </T>
      <T v="meta" c={C.muted} style={{ marginTop: 4 }}>
        This is exactly what others will see.
      </T>
      <View style={{ height: 360, borderRadius: 24, overflow: 'hidden', marginTop: 14 }}>
        {profile.photos?.[0] ? <Image source={{ uri: profile.photos[0] }} style={StyleSheet.absoluteFill} /> : <Photo style={StyleSheet.absoluteFill} label="YOUR PHOTO" />}
        <LinearGradient colors={['rgba(14,12,16,0)', 'rgba(14,12,16,0.94)']} style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: 16, paddingTop: 70 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <T style={{ fontFamily: F.display, fontSize: 26 }}>
              {profile.name || 'You'}, {profile.age || '—'}
            </T>
            {profile.verified ? <Verified /> : null}
          </View>
          <View style={[styles.wrap, { marginTop: 10, gap: 6 }]}>
            {(profile.intents || []).concat(profile.turnOns || []).slice(0, 4).map((t) => (
              <View key={t} style={styles.tag}>
                <T v="small">{t}</T>
              </View>
            ))}
          </View>
        </LinearGradient>
      </View>
      <LinearGradient colors={GRAD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 17, padding: 1.5, marginTop: 14 }}>
        <View style={{ backgroundColor: C.safeBg, borderRadius: 16, padding: 12, flexDirection: 'row', gap: 12, alignItems: 'center' }}>
          <Icon name="bulb" size={20} color={C.pinkL} />
          <View style={{ flex: 1 }}>
            <T style={{ fontFamily: F.semi, fontSize: 14 }}>You’re joining a community</T>
            <T v="small" c={C.safeInk}>
              We build what members ask for. Vote and suggest on the Ideas board.
            </T>
          </View>
        </View>
      </LinearGradient>
      <View style={{ height: 22 }} />
      <GradientButton title="Start exploring" onPress={next} />
      <GhostButton title="Edit my answers" onPress={back} border={false} color={C.muted} style={{ marginTop: 4 }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  emblem: { shadowColor: C.orange, shadowOffset: { width: 0, height: 0 }, borderRadius: 40 },
  emblemRing: { width: 78, height: 78, borderRadius: 39, padding: 2 },
  emblemInner: { flex: 1, borderRadius: 37, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  orn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginVertical: 1 },
  ornLine: { width: 28, height: 1, backgroundColor: C.line2 },
  ornDot: { width: 5, height: 5, transform: [{ rotate: '45deg' }], backgroundColor: '#4A4148' },
  sealInner: { width: 76, height: 76, borderRadius: 38, backgroundColor: '#2A1530', alignItems: 'center', justifyContent: 'center' },
  lbl: { marginTop: 20, marginBottom: 8 },
  input: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: C.line2,
    backgroundColor: C.surf3,
    color: C.ink,
    paddingHorizontal: 16,
    fontFamily: F.body,
    fontSize: 16,
  },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 },
  slot: { width: '31.5%', aspectRatio: 0.78, borderRadius: 16, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: C.surf },
  slotMain: { borderWidth: 1.5, borderColor: C.pink },
  slotEmpty: { borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#4A4148', backgroundColor: C.surf3 },
  slotX: { position: 'absolute', top: 6, right: 6, width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(14,12,16,0.75)', alignItems: 'center', justifyContent: 'center' },
  mainTag: { position: 'absolute', left: 6, bottom: 6, backgroundColor: C.pink, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  bRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: C.line },
  yn: { flexDirection: 'row', backgroundColor: C.surf2, borderRadius: 12, padding: 3, gap: 2 },
  ynBtn: { width: 50, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  oval: {
    width: 240,
    height: 300,
    borderRadius: 120,
    alignSelf: 'center',
    marginTop: 24,
    backgroundColor: C.surf2,
    borderWidth: 3,
    borderColor: '#2B252C',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  tag: { height: 28, paddingHorizontal: 10, borderRadius: 14, backgroundColor: 'rgba(244,239,234,0.14)', justifyContent: 'center' },
});
