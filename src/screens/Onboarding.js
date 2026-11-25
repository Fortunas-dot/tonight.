import { useEffect, useRef, useState } from 'react';
import { Alert, Animated, Easing, Image, Linking, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import Svg, { Circle, Defs, LinearGradient as SvgGrad, Path, Stop } from 'react-native-svg';
import { C, F, FIRE, GRAD } from '../theme';
import { Icon, Verified } from '../icons';
import { BOUNDARIES, INTENTS, MAX_TURN_ONS, TURN_ON_GROUPS, VOWS } from '../data';
import { MaskEditor } from './MaskEditor';
import { FireBurst } from './FireBurst';
import { Field, ProfileFields, Section } from './ProfileFields';
import * as api from '../backend';
import { versionLabel } from '../version';
import { AppleButton, useAppleAvailable } from '../appleAuth';
import { Card, Chip, GhostButton, GradientButton, Header, Photo, Rise, Row, Screen, T, Toggle, success, tap, thud } from '../ui';

const STEPS = 6;

/* ---------- Welcome ---------- */

export function Welcome({ next, onRestore }) {
  const apple = useAppleAvailable();
  return (
    <Screen strong style={{ justifyContent: 'flex-end' }} bottom={30}>
      {/* Orb top right, as in the design: a thin ring with a gradient disc inside it */}
      <View pointerEvents="none" style={{ position: 'absolute', right: -120, top: 90, width: 340, height: 340, borderRadius: 170, borderWidth: 1, borderColor: '#3A2A2E' }} />
      <LinearGradient
        pointerEvents="none"
        colors={GRAD}
        locations={[0, 0.55, 1]}
        start={{ x: 0.1, y: 0.1 }}
        end={{ x: 0.9, y: 0.9 }}
        style={{ position: 'absolute', right: -60, top: 150, width: 220, height: 220, borderRadius: 110 }}
      />
      <View style={{ position: 'absolute', top: 70, left: 24 }}>
        <T style={{ fontFamily: F.displayX, fontSize: 26, letterSpacing: -0.5 }}>
          tonight
          <T c={C.pink} style={{ fontFamily: F.displayX, fontSize: 26 }}>
            .
          </T>
        </T>
      </View>
      <Rise>
        <T v="display" style={{ fontSize: 46, lineHeight: 48 }}>
          Adults.{'\n'}Clear intentions.{'\n'}No games.
        </T>
        <View style={styles.memberPill}>
          <Icon name="lock" size={13} color={C.pinkL} />
          <T v="small" c={C.ink2} style={{ fontFamily: F.semi, letterSpacing: 0.4 }}>
            MEMBERS ONLY · BY APPLICATION
          </T>
        </View>
      </Rise>
      <Rise delay={120} style={{ marginTop: 26, gap: 14 }}>
        {[
          ['spark', 'Every profile is reviewed by hand. Not everyone gets in.'],
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
        {apple ? (
          <>
            <T v="small" c={C.muted} style={{ textAlign: 'center', marginTop: 6 }}>
              Already have an account?
            </T>
            <AppleButton kind="signIn" onPress={onRestore} />
          </>
        ) : null}
        <T v="small" c={C.faint} style={{ textAlign: 'center', marginTop: 8 }}>
          18+ only. By continuing you agree to the Terms and Privacy Policy at fortunas.nl/tonight.
        </T>
        <T v="small" c={C.faint} style={{ textAlign: 'center', fontSize: 10, opacity: 0.6 }}>
          {versionLabel()}
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

function NextHint() {
  const [a] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(a, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(a, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [a]);
  return (
    <Animated.View
      style={[styles.hint, { opacity: a.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }), transform: [{ scale: a.interpolate({ inputRange: [0, 1], outputRange: [0.97, 1.03] }) }] }]}
    >
      <FlameGlyph size={11} />
      <T v="small" c="#FFB36B" style={{ fontFamily: F.semi, fontSize: 11 }}>
        tap to take this vow
      </T>
    </Animated.View>
  );
}

function VowProgress({ count }) {
  return (
    <View style={styles.progress} accessibilityLabel={`${count} of 7 vows taken`}>
      {VOWS.map((v, i) =>
        i < count ? (
          <LinearGradient key={v.n} colors={[FIRE[0], FIRE[1], FIRE[2]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.progSeg} />
        ) : (
          <View key={v.n} style={[styles.progSeg, { backgroundColor: '#2A242C' }]} />
        ),
      )}
    </View>
  );
}

function Vow({ vow, lit, isNext, onToggle }) {
  const [pop] = useState(() => new Animated.Value(lit ? 1 : 0));
  const [burst, setBurst] = useState(0); // bumps each time the vow is taken, replaying the fire
  const [box, setBox] = useState({ w: 0, h: 0 });
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
      onPress={() => {
        if (!lit) setBurst((b) => b + 1);
        onToggle();
      }}
      onLayout={(e) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
      style={{ alignItems: 'center', paddingVertical: 6, paddingHorizontal: 8, opacity: lit ? 1 : 0.45 }}
    >
      {lit ? (
        <LinearGradient
          pointerEvents="none"
          colors={['rgba(255,138,61,0)', 'rgba(255,138,61,0.16)', 'rgba(240,40,122,0)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[StyleSheet.absoluteFill, { borderRadius: 18 }]}
        />
      ) : null}
      {lit && burst ? <FireBurst key={burst} width={box.w} height={box.h} /> : null}
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
      {isNext ? <NextHint /> : null}
    </Pressable>
  );
}

export function Code({ next }) {
  const [lit, setLit] = useState(VOWS.map(() => false));
  const [sealed, setSealed] = useState(false);
  const [hold] = useState(() => new Animated.Value(0));
  const [fire] = useState(() => new Animated.Value(0));
  const [breath] = useState(() => new Animated.Value(0));
  const [holding, setHolding] = useState(false);
  const anim = useRef(null);
  const count = lit.filter(Boolean).length;
  const all = count === VOWS.length;
  const nextIdx = lit.indexOf(false);

  useEffect(() => {
    Animated.timing(fire, { toValue: count / VOWS.length, duration: 700, useNativeDriver: false }).start();
  }, [count, fire]);

  // The seal "breathes" once all vows are taken, inviting the press.
  useEffect(() => {
    if (!all || sealed) {
      breath.setValue(0);
      return undefined;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breath, { toValue: 1, duration: 1100, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(breath, { toValue: 0, duration: 1100, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [all, sealed, breath]);

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
    setHolding(true);
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
    setHolding(false);
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
      <VowProgress count={count} />
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
        <Animated.View
          pointerEvents="none"
          style={[
            styles.sealGlow,
            {
              opacity: breath.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.7] }),
              transform: [{ scale: breath.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1.18] }) }],
            },
          ]}
        />
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
          {sealed ? <Icon name="check" size={34} color="#FFD27A" stroke={2.6} /> : <Icon name="fingerprint" size={32} color={C.ink} stroke={1.5} />}
        </View>
      </Pressable>
      <T v="label" c={C.ink2} style={{ marginTop: 8, letterSpacing: 1 }}>
        {sealed ? 'Sealed' : holding ? 'Keep holding…' : all ? 'Press and hold to seal' : 'Take all 7 vows first'}
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
  const [bio, setBio] = useState(profile.bio || '');
  const [prompt, setPrompt] = useState(profile.prompt || '');
  const [country, setCountry] = useState(profile.country || '');
  const [city, setCity] = useState(profile.city || '');
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
        Only your first name, age and city are shown.
      </T>
      <Section icon="user" title="The basics">
        <Field label="First name or nickname" icon="user" value={name} onChangeText={setName} placeholder="Your name" autoCapitalize="words" />
        <Field
          label="Age"
          icon="cake"
          value={age}
          onChangeText={(t) => setAge(t.replace(/[^0-9]/g, ''))}
          placeholder="18+"
          keyboardType="number-pad"
          maxLength={2}
          hint={age.length === 2 && ageNum < 18 ? 'Tonight is 18+ only' : null}
        />
      </Section>
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
      <ProfileFields bio={bio} setBio={setBio} prompt={prompt} setPrompt={setPrompt} country={country} setCountry={setCountry} city={city} setCity={setCity} />
      <View style={{ height: 30 }} />
      <Next
        disabled={!valid}
        onPress={() => {
          setProfile({ ...profile, name: name.trim(), age: ageNum, gender, show, bio: bio.trim(), prompt: prompt.trim(), country: country.trim(), city: city.trim() });
          next();
        }}
      />
    </Screen>
  );
}

export function Photos({ profile, setProfile, next, back }) {
  const { width } = useWindowDimensions();
  const [photos, setPhotos] = useState(profile.photos || []);
  const [masked, setMasked] = useState(profile.masked || {});
  const [blur, setBlur] = useState(!!profile.blurFace);
  const [editing, setEditing] = useState(null); // index of the photo in the mask editor
  const add = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [3, 4], quality: 0.8 });
    if (!res.canceled && res.assets?.[0]) setPhotos([...photos, res.assets[0].uri].slice(0, 6));
  };
  const remove = (i) => setPhotos(photos.filter((_, j) => j !== i));
  const save = () => setProfile({ ...profile, photos, blurFace: blur, masked });

  if (editing !== null && photos[editing]) {
    return (
      <MaskEditor
        photos={photos}
        start={editing}
        onCancel={() => setEditing(null)}
        onDone={(results) => {
          if (results.length) {
            const next = [...photos];
            const nextMasked = { ...masked };
            for (const r of results) {
              next[r.index] = r.uri;
              nextMasked[r.uri] = r.mask;
            }
            setPhotos(next);
            setMasked(nextMasked);
          }
          setEditing(null);
        }}
      />
    );
  }

  // Grid: a big main photo (2 by 2) with two beside it, then a row of three.
  const gap = 8;
  const cell = Math.floor((width - 48 - gap * 2) / 3);
  const cellH = Math.round(cell * 1.08);
  const big = { width: cell * 2 + gap, height: cellH * 2 + gap };
  const small = { width: cell, height: cellH };

  const slot = (i, size) => {
    const uri = photos[i];
    if (!uri) {
      const isNext = i === photos.length;
      return (
        <Pressable key={i} accessibilityRole="button" accessibilityLabel="Add photo" onPress={add} style={[styles.slotEmpty, size, isNext && { borderColor: C.pink }]}>
          <Icon name="plus" size={i === 0 ? 30 : 22} color={isNext ? C.pinkL : C.muted} />
          {i === 0 ? (
            <T v="small" c={C.muted} style={{ marginTop: 6 }}>
              Main photo
            </T>
          ) : null}
        </Pressable>
      );
    }
    return (
      <View key={i} style={[styles.slot, size, i === 0 && styles.slotMain]}>
        <Image source={{ uri }} style={StyleSheet.absoluteFill} blurRadius={blur ? 30 : 0} />
        {blur && i === 0 ? (
          <View style={styles.blurNote}>
            <Icon name="lock" size={12} color="#C9D6F2" />
            <T v="small" c="#C9D6F2" style={{ fontSize: 11, fontFamily: F.semi }}>
              How others see it until you match
            </T>
          </View>
        ) : null}
        <Pressable accessibilityRole="button" accessibilityLabel={`Remove photo ${i + 1}`} onPress={() => remove(i)} hitSlop={8} style={styles.slotX}>
          <Icon name="close" size={12} color={C.ink} stroke={3} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={masked[uri] ? `Change mask on photo ${i + 1}` : `Add a mask to photo ${i + 1}`}
          onPress={() => setEditing(i)}
          hitSlop={6}
          style={[styles.maskBtn, masked[uri] && { backgroundColor: C.pink }]}
        >
          <Svg width={18} height={18} viewBox="86 80 170 190">
            <Path d="M96 222C108 198 150 196 171 211C192 196 234 198 246 222C240 252 206 260 188 245C180 238 162 238 154 245C136 260 102 252 96 222Z" fill="#FFFFFF" />
            <Path d="M128 170L118 96L150 150Z M214 170L224 96L192 150Z" fill="#FFFFFF" />
          </Svg>
        </Pressable>
        {i === 0 ? (
          <View style={styles.mainTag}>
            <T v="small" c="#FFFFFF" style={{ fontFamily: F.bold, fontSize: 10 }}>
              MAIN
            </T>
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <Screen scroll>
      <Header onBack={back} step={2} total={STEPS} />
      <T v="title" style={{ marginTop: 12 }}>
        Show your best side
      </T>
      <T v="meta" c={C.muted} style={{ marginTop: 4 }}>
        At least 2 photos, one with your face. No nudity on public photos.
      </T>
      <View style={{ marginTop: 16, gap }}>
        <View style={{ flexDirection: 'row', gap }}>
          {slot(0, big)}
          <View style={{ gap }}>
            {slot(1, small)}
            {slot(2, small)}
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap }}>
          {slot(3, small)}
          {slot(4, small)}
          {slot(5, small)}
        </View>
      </View>

      <LinearGradient colors={GRAD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 19, padding: 1.5, marginTop: 18 }}>
        <View style={styles.maskCard}>
          <View style={{ flex: 1 }}>
            <T style={{ fontFamily: F.semi }}>Hide my face</T>
            <T v="small" c={C.muted} style={{ marginTop: 2 }}>
              A bunny, masquerade or kitten mask, placed on your face automatically.
            </T>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              if (!photos.length) {
                Alert.alert('Add a photo first', 'Pick a photo, then choose a mask for it.');
                return;
              }
              tap();
              setEditing(0);
            }}
          >
            <LinearGradient colors={GRAD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.maskCta}>
              <T v="small" c="#FFFFFF" style={{ fontFamily: F.semi, fontSize: 13 }}>
                Try a mask
              </T>
            </LinearGradient>
          </Pressable>
        </View>
      </LinearGradient>

      <Card style={{ marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <T style={{ fontFamily: F.medium }}>Blur my face until we match</T>
          <T v="small" c={C.muted} style={{ marginTop: 2 }}>
            Your photos show blurred until you both like each other.
          </T>
        </View>
        <Toggle value={blur} onChange={setBlur} label="Blur my face until we match" />
      </Card>
      <View style={{ height: 24 }} />
      <Next
        disabled={photos.length < 2}
        onPress={() => {
          save();
          next();
        }}
      />
      <Pressable
        onPress={() => {
          save();
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

const ANSWERS = [
  { v: 'Yes', icon: 'check', bg: '#1E4D3A', border: '#2BC48A', ink: '#E7FFF3' },
  { v: 'Maybe', icon: null, bg: '#4A3C17', border: '#E8B64C', ink: '#FFF3D1' },
  { v: 'No', icon: 'close', bg: '#4A1F26', border: '#FF6F7F', ink: '#FFE1E4' },
];
const B_ICONS = {
  'Meet for a drink first': 'pin',
  'Host at my place': 'lock',
  'Go to theirs': 'send',
  'Stay the night': 'clock',
  'Couples & threesomes': 'heart',
  'Kink-friendly': 'flame',
  'Protection, always': 'shieldCheck',
};

function Answer({ a, on, onPress, label }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: on }}
      onPress={onPress}
      style={[styles.ans, on && { backgroundColor: a.bg, borderColor: a.border }]}
    >
      {on && a.icon ? <Icon name={a.icon} size={14} color={a.ink} stroke={2.6} /> : null}
      {on && !a.icon ? (
        <T c={a.ink} style={{ fontFamily: F.bold, fontSize: 14 }}>
          ?
        </T>
      ) : null}
      <T c={on ? a.ink : C.muted} style={{ fontFamily: on ? F.semi : F.medium, fontSize: 14 }}>
        {a.v}
      </T>
    </Pressable>
  );
}

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
      <T v="h" style={{ marginTop: 28 }}>
        Your boundaries
      </T>
      <View style={styles.noteSafe}>
        <Icon name="lock" size={16} color={C.blueL} />
        <T v="small" c={C.safeInk} style={{ flex: 1 }}>
          Your no’s are never shown. They quietly filter out anyone who needs them.
        </T>
      </View>
      <View style={{ gap: 10, marginTop: 12 }}>
        {BOUNDARIES.map((b) => (
          <View key={b} style={styles.bCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={styles.bIcon}>
                <Icon name={B_ICONS[b] || 'check'} size={16} color={C.ink2} />
              </View>
              <T style={{ fontFamily: F.medium, fontSize: 15, flex: 1 }}>{b}</T>
            </View>
            <View style={styles.ansRow}>
              {ANSWERS.map((a) => (
                <Answer
                  key={a.v}
                  a={a}
                  on={answers[b] === a.v}
                  label={`${b}: ${a.v}`}
                  onPress={() => {
                    tap();
                    setAnswers({ ...answers, [b]: a.v });
                  }}
                />
              ))}
            </View>
          </View>
        ))}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 28 }}>
        <T v="h">What turns you on</T>
        <T v="small" c={turnOns.length >= MAX_TURN_ONS ? C.pinkL : C.muted}>
          {turnOns.length} of {MAX_TURN_ONS}
        </T>
      </View>
      <T v="small" c={C.muted} style={{ marginTop: 2 }}>
        Shared ones light up for matches.
      </T>
      {TURN_ON_GROUPS.map((g) => (
        <View key={g.title} style={{ marginTop: 14 }}>
          <T v="label" c={C.faint} style={{ marginBottom: 8 }}>
            {g.title}
          </T>
          <View style={styles.wrap}>
            {g.items.map((t) => (
              <Chip key={t} small label={t} on={turnOns.includes(t)} onPress={() => tog(turnOns, setTurnOns, t, MAX_TURN_ONS)} />
            ))}
          </View>
        </View>
      ))}
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

const VERIFY_REASONS = {
  no_face: 'We couldn’t see a face. Try again in good light, face in the frame.',
  several_faces: 'More than one face in the shot. Make sure it’s just you.',
  eyes_closed: 'Your eyes look closed. Try again, eyes open.',
  sunglasses: 'Take off your sunglasses and try again.',
  blurry: 'The selfie came out blurry. Hold still and try again.',
  no_match: 'That didn’t match your photos. Make sure one photo shows your face clearly.',
  no_photos: 'Add your photos first, then take the selfie.',
  no_selfie: 'The selfie didn’t upload. Check your connection and try again.',
  offline: 'No connection right now. Check your internet and try again.',
  not_configured: 'Verification is briefly unavailable. Try again in a few minutes.',
  error: 'Something went wrong on our side. Try again in a moment.',
};

export function Verify({ profile, setProfile, next, back }) {
  const [state, setState] = useState(profile.verified ? 'done' : 'idle'); // idle | checking | done | failed
  const [reason, setReason] = useState(null);
  const [shot, setShot] = useState(null);
  const [spin] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (state !== 'checking') return undefined;
    const loop = Animated.loop(Animated.timing(spin, { toValue: 1, duration: 1100, easing: Easing.linear, useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [state, spin]);

  const start = async () => {
    // Shows the iPhone's own camera pop-up. iOS only shows it once: after a "Don't Allow"
    // the only way back is the Settings app, so we offer a button straight to it.
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Camera needed', 'Turn on Camera for Tonight in Settings to verify that you are a real person.', [
        { text: 'Not now', style: 'cancel' },
        { text: 'Open Settings', onPress: () => Linking.openSettings() },
      ]);
      return;
    }
    const res = await ImagePicker.launchCameraAsync({ cameraType: ImagePicker.CameraType.front, quality: 0.6 });
    if (res.canceled || !res.assets?.[0]) return;
    setShot(res.assets[0].uri);
    setReason(null);
    setState('checking');
    const out = await api.verifyFace(profile, res.assets[0].uri);
    if (out.uploaded) setProfile((p) => ({ ...p, uploaded: out.uploaded }));
    if (out.verified) {
      success();
      setState('done');
    } else {
      thud();
      setReason(out.reason);
      setState('failed');
    }
  };

  const caption = {
    idle: 'A quick selfie, face in the frame',
    checking: 'Checking it’s really you…',
    done: 'Verified. Welcome.',
    failed: 'Not verified yet',
  }[state];

  return (
    <Screen>
      <Header onBack={back} step={4} total={STEPS} />
      <T v="title" style={{ marginTop: 12 }}>
        Prove you’re real.{'\n'}Takes 20 seconds.
      </T>
      <T v="meta" c={C.muted} style={{ marginTop: 6 }}>
        Everyone here did this. It’s why there are no bots.
      </T>
      <View style={[styles.oval, state === 'failed' && { borderColor: '#5A2A31' }, state === 'done' && { borderColor: C.blue }]}>
        {shot && state !== 'done' ? <Image source={{ uri: shot }} style={[StyleSheet.absoluteFill, { opacity: 0.45 }]} /> : null}
        {state === 'checking' ? (
          <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ rotate: spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] }]}>
            <LinearGradient colors={[C.pink, 'transparent']} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 6, borderRadius: 3 }} />
          </Animated.View>
        ) : null}
        {state === 'done' ? (
          <Verified size={72} />
        ) : state === 'failed' ? (
          <Icon name="close" size={48} color="#FF9AA3" stroke={2} />
        ) : state === 'idle' ? (
          <Icon name="camera" size={56} color={C.muted} stroke={1.4} />
        ) : null}
        <T v="meta" c={C.ink2} numberOfLines={2} style={{ position: 'absolute', bottom: 40, left: 28, right: 28, textAlign: 'center' }}>
          {caption}
        </T>
      </View>
      {state === 'failed' && reason ? (
        <View style={styles.failNote}>
          <T v="small" c="#FFD7DC" style={{ flex: 1 }}>
            {VERIFY_REASONS[reason] || VERIFY_REASONS.error}
          </T>
        </View>
      ) : null}
      <View style={{ gap: 10, marginTop: 22 }}>
        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
          <Icon name="check" size={18} color={C.blueL} />
          <T v="meta" c={C.safeInk}>
            Compared to your photos, then deleted
          </T>
        </View>
      </View>
      <View style={{ flex: 1 }} />
      {state === 'done' ? (
        <Next
          onPress={() => {
            setProfile((p) => ({ ...p, verified: true }));
            next();
          }}
        />
      ) : (
        <GradientButton title={state === 'checking' ? 'Checking…' : state === 'failed' ? 'Try again' : 'Take my selfie'} disabled={state === 'checking'} onPress={start} />
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
        This is your application. Members see exactly this once you’re in.
      </T>
      <View style={{ height: 360, borderRadius: 24, overflow: 'hidden', marginTop: 14 }}>
        {profile.photos?.[0] ? <Photo uri={profile.photos[0]} blur={profile.blurFace} style={StyleSheet.absoluteFill} /> : <Photo style={StyleSheet.absoluteFill} label="YOUR PHOTO" />}
        <LinearGradient colors={['rgba(14,12,16,0)', 'rgba(14,12,16,0.94)']} style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: 16, paddingTop: 70 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <T style={{ fontFamily: F.display, fontSize: 26 }}>
              {profile.name || 'You'}, {profile.age || '—'}
            </T>
            {profile.verified ? <Verified /> : null}
          </View>
          {profile.city ? (
            <T v="meta" c={C.ink2}>
              {profile.city}
              {profile.country ? `, ${profile.country}` : ''}
            </T>
          ) : null}
          {profile.bio ? (
            <T c={C.ink2} numberOfLines={2} style={{ marginTop: 6, fontSize: 14, lineHeight: 20 }}>
              “{profile.bio}”
            </T>
          ) : null}
          <View style={[styles.wrap, { marginTop: 10, gap: 6 }]}>
            {(profile.intents || [])
              .concat(profile.turnOns || [])
              .slice(0, 4)
              .map((t) => (
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
            <T style={{ fontFamily: F.semi, fontSize: 14 }}>Membership by application</T>
            <T v="small" c={C.safeInk}>
              Every profile is reviewed by hand before it goes live. Not everyone gets in. Clear photos and an honest bio help.
            </T>
          </View>
        </View>
      </LinearGradient>
      <View style={{ height: 22 }} />
      <GradientButton title="Submit my application" onPress={next} />
      <GhostButton title="Edit my answers" onPress={back} border={false} color={C.muted} style={{ marginTop: 4 }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  memberPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#4A2436',
    backgroundColor: 'rgba(240,40,122,0.08)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  emblem: { shadowColor: C.orange, shadowOffset: { width: 0, height: 0 }, borderRadius: 40 },
  emblemRing: { width: 78, height: 78, borderRadius: 39, padding: 2 },
  emblemInner: { flex: 1, borderRadius: 37, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  orn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginVertical: 1 },
  ornLine: { width: 28, height: 1, backgroundColor: C.line2 },
  ornDot: { width: 5, height: 5, transform: [{ rotate: '45deg' }], backgroundColor: '#4A4148' },
  hint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 6,
    height: 24,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255,138,61,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,138,61,0.35)',
  },
  progress: { flexDirection: 'row', gap: 5, marginTop: 12, width: '70%' },
  progSeg: { flex: 1, height: 5, borderRadius: 3 },
  sealGlow: { position: 'absolute', width: 96, height: 96, borderRadius: 48, backgroundColor: 'rgba(255,138,61,0.35)' },
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
  slot: { borderRadius: 16, overflow: 'hidden', backgroundColor: C.surf },
  slotMain: { borderWidth: 1.5, borderColor: C.pink },
  slotEmpty: { borderRadius: 16, borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#4A4148', backgroundColor: C.surf3, alignItems: 'center', justifyContent: 'center' },
  blurNote: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    minHeight: 24,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(14,12,16,0.7)',
  },
  maskBtn: { position: 'absolute', right: 6, bottom: 6, width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(14,12,16,0.75)', alignItems: 'center', justifyContent: 'center' },
  maskCard: { backgroundColor: C.surf, borderRadius: 17.5, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  maskCta: { height: 38, paddingHorizontal: 14, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  noteSafe: { flexDirection: 'row', gap: 10, alignItems: 'center', marginTop: 8, padding: 12, backgroundColor: '#141A2B', borderRadius: 14 },
  bCard: { backgroundColor: C.surf, borderRadius: 18, padding: 12, gap: 10, borderWidth: 1, borderColor: C.line },
  bIcon: { width: 30, height: 30, borderRadius: 10, backgroundColor: C.surf2, alignItems: 'center', justifyContent: 'center' },
  ansRow: { flexDirection: 'row', gap: 8 },
  ans: { flex: 1, height: 42, borderRadius: 12, borderWidth: 1.5, borderColor: '#2E2830', backgroundColor: C.surf3, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  slotX: { position: 'absolute', top: 6, right: 6, width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(14,12,16,0.75)', alignItems: 'center', justifyContent: 'center' },
  mainTag: { position: 'absolute', left: 6, bottom: 6, backgroundColor: C.pink, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  bRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: C.line },
  yn: { flexDirection: 'row', backgroundColor: C.surf2, borderRadius: 12, padding: 3, gap: 2 },
  ynBtn: { width: 50, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  failNote: { marginTop: 14, padding: 12, borderRadius: 14, backgroundColor: '#2A1418', borderWidth: 1, borderColor: '#5A2A31' },
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
