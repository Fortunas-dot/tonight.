import { useEffect, useState } from 'react';
import { Alert, Animated, Easing, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, F, GRAD } from '../theme';
import { Icon, Verified } from '../icons';
import { PEOPLE, VOWS, personById } from '../data';
import { versionLabel } from '../version';
import { completeness } from '../completeness';
import Svg, { Circle as SvgCircle, Defs as SvgDefs, LinearGradient as SvgGrad, Stop as SvgStop } from 'react-native-svg';
import { FilterSheet, activeCount, applyFilters, filterChips } from './DiscoverFilters';
import {
  Avatar,
  Card,
  GhostButton,
  GradientButton,
  Header,
  IconButton,
  LiquidBg,
  LiveDot,
  Photo,
  Rise,
  Row,
  Screen,
  Segmented,
  T,
  success,
  tap,
  thud,
} from '../ui';

/* ---------- Discover ---------- */

export function Discover({ onOpen, onLike, deck: all, profile, filters, onFilters }) {
  const blurAll = !!profile?.settings?.blurAll;
  const [i, setI] = useState(0);
  const [fly] = useState(() => new Animated.Value(0));
  const [sheet, setSheet] = useState(false);
  const deck = applyFilters(all, filters, profile);
  const person = deck.length ? deck[i % deck.length] : null;
  const count = activeCount(filters);

  const go = (dir) => {
    if (dir > 0) thud();
    else tap();
    Animated.timing(fly, { toValue: dir, duration: 260, easing: Easing.in(Easing.quad), useNativeDriver: true }).start(() => {
      if (dir > 0) onLike(person);
      fly.setValue(0);
      setI((x) => x + 1);
    });
  };

  return (
    <Screen pad={12} bottom={8}>
      <View style={styles.topbar}>
        <T style={{ fontFamily: F.displayX, fontSize: 24, letterSpacing: -0.5 }}>
          tonight<T c={C.pink} style={{ fontFamily: F.displayX, fontSize: 24 }}>.</T>
        </T>
        <Pressable accessibilityRole="button" accessibilityLabel={count ? `Filters, ${count} on` : 'Filters'} onPress={() => setSheet(true)} style={styles.filterBtn}>
          <Icon name="filter" size={20} />
          {count ? (
            <View style={styles.filterBadge}>
              <T c="#FFFFFF" style={{ fontFamily: F.bold, fontSize: 10, lineHeight: 12 }}>
                {count}
              </T>
            </View>
          ) : null}
        </Pressable>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingHorizontal: 8 }} style={{ flexGrow: 0, marginTop: 2 }}>
        {filterChips(filters, profile?.show).map((c) => (
          <Pressable key={c.id} accessibilityRole="button" onPress={() => setSheet(true)} style={[styles.fChip, c.on && styles.fChipOn]}>
            <T v="small" c={c.on ? C.ink : C.muted} style={{ fontFamily: c.on ? F.semi : F.medium }} numberOfLines={1}>
              {c.label}
            </T>
            <Icon name="down" size={12} color={c.on ? C.ink : C.muted} stroke={2.2} />
          </Pressable>
        ))}
      </ScrollView>
      <FilterSheet
        visible={sheet}
        filters={filters}
        show={profile?.show}
        hasCity={!!profile?.city}
        hasCountry={!!profile?.country}
        onClose={() => setSheet(false)}
        onApply={(f, show) => {
          setI(0);
          onFilters(f, show);
        }}
      />
      {!person ? (
        <View style={styles.emptyDeck}>
          <Icon name="filter" size={30} color={C.muted} />
          <T style={{ fontFamily: F.display, fontSize: 20, marginTop: 10, textAlign: 'center' }}>No one matches your filters</T>
          <T v="meta" c={C.muted} style={{ textAlign: 'center', marginTop: 4 }}>
            Try a wider age range or a bigger area.
          </T>
          <GradientButton title="Adjust filters" onPress={() => setSheet(true)} style={{ marginTop: 18, alignSelf: 'stretch' }} />
        </View>
      ) : (
        <>
      <Animated.View
        style={{
          flex: 1,
          marginTop: 6,
          transform: [
            { translateX: fly.interpolate({ inputRange: [-1, 0, 1], outputRange: [-420, 0, 420] }) },
            { rotate: fly.interpolate({ inputRange: [-1, 0, 1], outputRange: ['-14deg', '0deg', '14deg'] }) },
          ],
        }}
      >
        <Pressable onPress={() => onOpen(person)} style={{ flex: 1 }} accessibilityRole="button" accessibilityLabel={`Open ${person.name}'s profile`}>
          <Photo seed={person.seed} uri={person.photo} blur={person.blurred || blurAll} style={styles.card} label="PHOTO">
            {!person.real ? (
              <View style={styles.exampleTag}>
                <T v="small" c={C.ink2} style={{ fontFamily: F.semi, fontSize: 11 }}>
                  Example profile
                </T>
              </View>
            ) : null}
            <View style={styles.bars}>
              {[0, 1, 2, 3].map((b) => (
                <View key={b} style={[styles.bar, b === 0 && { backgroundColor: C.ink }]} />
              ))}
            </View>
            <LinearGradient colors={['rgba(14,12,16,0)', 'rgba(14,12,16,0.94)']} style={styles.cardInfo}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <T style={{ fontFamily: F.display, fontSize: 32, letterSpacing: -0.6 }}>
                  {person.name}, {person.age}
                </T>
                <Verified size={22} />
              </View>
              <View style={{ flexDirection: 'row', gap: 12, marginTop: 4 }}>
                <T v="meta" c={C.ink2}>
                  {person.dist}
                </T>
                <T v="meta" c={C.green}>
                  Live until {person.until}
                </T>
              </View>
              <T style={{ marginTop: 10 }}>“{person.bio}”</T>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
                <View style={[styles.pill, { backgroundColor: C.pink }]}>
                  <T v="small" c="#FFFFFF" style={{ fontFamily: F.semi }}>
                    {person.fit} of 7 boundaries fit
                  </T>
                </View>
                <View style={styles.pill}>
                  <T v="small">Shows up {person.showsUp}%</T>
                </View>
              </View>
            </LinearGradient>
          </Photo>
        </Pressable>
      </Animated.View>
      <View style={styles.actions}>
        <Pressable accessibilityRole="button" accessibilityLabel="Pass" onPress={() => go(-1)} style={styles.roundGhost}>
          <Icon name="close" size={24} stroke={2.2} />
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Like" onPress={() => go(1)}>
          <LinearGradient colors={GRAD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.roundLike}>
            <Icon name="heart" size={28} color="#FFFFFF" fill="#FFFFFF" stroke={1} />
          </LinearGradient>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Open profile" onPress={() => onOpen(person)} style={styles.roundGhost}>
          <Icon name="up" size={24} stroke={2.2} />
        </Pressable>
      </View>
        </>
      )}
    </Screen>
  );
}

/* ---------- Profile ---------- */

export function ProfileView({ person, onClose, onLike, onReport, onBlock }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 140 }}>
        <Photo seed={person.seed} uri={person.photo} blur={person.blurred} style={{ height: 440 }} label="PHOTO">
          <LinearGradient colors={['rgba(14,12,16,0)', C.bg]} style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 200 }} />
        </Photo>
        <View style={{ paddingHorizontal: 24, marginTop: -70 }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10 }}>
            <T style={{ fontFamily: F.display, fontSize: 38, letterSpacing: -1.2 }}>{person.name}</T>
            <T style={{ fontFamily: F.displayM, fontSize: 30 }} c="rgba(244,239,234,0.6)">
              {person.age}
            </T>
            <Verified />
          </View>
          <T v="meta" c={C.muted} style={{ marginTop: 4 }}>
            {person.dist} · <T v="meta" c={C.green}>Live until {person.until}</T>
          </T>
          <T v="label" c={C.faint} style={{ marginTop: 26, marginBottom: 8 }}>
            You both want
          </T>
          {person.both.map((b) => (
            <View key={b} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, height: 34 }}>
              <LinearGradient colors={GRAD} style={styles.check}>
                <Icon name="check" size={11} color="#FFFFFF" stroke={4} />
              </LinearGradient>
              <T style={{ fontSize: 16 }}>{b}</T>
            </View>
          ))}
          {person.maybe ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, height: 34 }}>
              <View style={[styles.check, { backgroundColor: '#5A4A22' }]}>
                <T v="small" c="#FFF3D1" style={{ fontFamily: F.bold }}>
                  ?
                </T>
              </View>
              <T style={{ fontSize: 16 }} c={C.ink2}>
                Maybe: {person.maybe}
              </T>
            </View>
          ) : null}
          <T v="label" c={C.faint} style={{ marginTop: 26, marginBottom: 8 }}>
            Ideal night
          </T>
          <T style={{ fontFamily: F.displayM, fontSize: 21, lineHeight: 28 }}>“{person.prompt}”</T>
        </View>
      </ScrollView>
      <View style={[styles.closeWrap, { top: insets.top + 8 }]}>
        <IconButton name="down" label="Close profile" onPress={onClose} style={styles.glass} />
        <IconButton
          name="dots"
          label="Report or block"
          onPress={() => Alert.alert('Report or block', `Ward will review ${person.name}'s profile.`, [
              {
                text: 'Report',
                onPress: () => {
                  success();
                  onReport?.(person);
                },
              },
              { text: 'Block', style: 'destructive', onPress: () => onBlock?.(person) },
              { text: 'Cancel', style: 'cancel' },
            ])}
          style={styles.glass}
        />
      </View>
      <LinearGradient colors={['rgba(14,12,16,0)', C.bg]} locations={[0, 0.4]} style={[styles.stickyBar, { paddingBottom: insets.bottom + 14 }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Pass" onPress={onClose} style={styles.roundGhost}>
          <Icon name="close" size={22} stroke={2.2} />
        </Pressable>
        <GradientButton title={`Like ${person.name}`} onPress={() => onLike(person)} style={{ flex: 1 }} />
      </LinearGradient>
    </View>
  );
}

/* ---------- Match ---------- */

function Bubble({ delay, left, size }) {
  const [y] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const loop = Animated.loop(Animated.timing(y, { toValue: 1, duration: 7000, delay, easing: Easing.linear, useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [y, delay]);
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        bottom: -40,
        left,
        width: size,
        height: size,
        borderRadius: size,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.4)',
        backgroundColor: 'rgba(255,255,255,0.08)',
        opacity: y.interpolate({ inputRange: [0, 0.1, 0.8, 1], outputRange: [0, 0.9, 0.6, 0] }),
        transform: [{ translateY: y.interpolate({ inputRange: [0, 1], outputRange: [0, -900] }) }],
      }}
    />
  );
}

export function Match({ person, me, onChat, onClose }) {
  const insets = useSafeAreaInsets();
  const [pop] = useState(() => new Animated.Value(0));
  useEffect(() => {
    success();
    Animated.spring(pop, { toValue: 1, useNativeDriver: true, speed: 8, bounciness: 12 }).start();
  }, [pop]);
  return (
    <LinearGradient colors={[C.pink, C.violet, C.blue]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1, paddingTop: insets.top + 8, paddingBottom: insets.bottom + 20, paddingHorizontal: 24 }}>
      {[[30, 14, 0], [90, 22, 1500], [170, 10, 3000], [250, 18, 900], [320, 12, 2400], [200, 26, 4200]].map(([l, s, d]) => (
        <Bubble key={l} left={l} size={s} delay={d} />
      ))}
      <View style={{ alignItems: 'flex-end' }}>
        <IconButton name="close" label="Close" onPress={onClose} color="#FFFFFF" />
      </View>
      <Animated.View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 30, transform: [{ scale: pop }] }}>
        <View style={styles.matchPhoto}>
          <Photo seed={5} uri={me?.photos?.[0]} style={{ flex: 1 }} />
        </View>
        <View style={[styles.matchPhoto, { marginLeft: -36 }]}>
          <Photo seed={person.seed} uri={person.photo} style={{ flex: 1 }} />
        </View>
      </Animated.View>
      <T style={{ fontFamily: F.displayX, fontSize: 52, letterSpacing: -1.6, textAlign: 'center', marginTop: 28 }} c="#FFFFFF">
        It’s mutual.
      </T>
      <T c="#FFFFFF" style={{ textAlign: 'center', fontSize: 16, marginTop: 10 }}>
        You and {person.name} are both live tonight{'\n'}and fit on {person.fit} of 7 boundaries.
      </T>
      <View style={styles.matchNote}>
        <Icon name="clock" size={20} color="#FFFFFF" />
        <T c="#FFFFFF" style={{ flex: 1, fontSize: 14 }}>
          Open for 48 hours. Make a plan together and it stays.
        </T>
      </View>
      <View style={{ flex: 1 }} />
      <Pressable accessibilityRole="button" onPress={() => onChat(person, 'Drink at Bar Mona, 21:30?')} style={styles.matchOpt}>
        <T c="#FFFFFF">Drink at Bar Mona, 21:30?</T>
      </Pressable>
      <Pressable accessibilityRole="button" onPress={() => onChat(person)} style={[styles.matchCta]}>
        <T v="label" c="#5B2BD9" style={{ fontSize: 16 }}>
          Write my own message
        </T>
      </Pressable>
      <Pressable onPress={onClose} style={{ alignItems: 'center', paddingVertical: 14 }}>
        <T v="label" c="#FFFFFF">
          Keep browsing
        </T>
      </Pressable>
    </LinearGradient>
  );
}

/* ---------- Likes you ---------- */

export function Likes({ people: real = [], onOpen, blurAll }) {
  // Real likes first; the examples only show while nobody has liked you yet.
  const examples = real.length ? [] : PEOPLE;
  const people = real.length ? real : examples;
  return (
    <Screen scroll>
      <T v="title" style={{ marginTop: 8 }}>
        Likes you
      </T>
      <T v="meta" c={C.muted} style={{ marginTop: 4 }}>
        {real.length ? `${real.length} ${real.length === 1 ? 'person likes' : 'people like'} you. Like them back to match.` : 'Free for everyone, always. Like them back to match.'}
      </T>
      {!real.length ? (
        <Card style={{ marginTop: 14, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: C.line }}>
          <Icon name="heart" size={22} color={C.pinkL} />
          <View style={{ flex: 1 }}>
            <T style={{ fontFamily: F.semi }}>No likes yet</T>
            <T v="small" c={C.muted}>
              A complete profile gets noticed faster. Below are examples of how likes show up.
            </T>
          </View>
        </Card>
      ) : null}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 16 }}>
        {people.map((p, i) => (
          <Rise key={p.id} delay={i * 70} style={{ width: '48%' }}>
            <Pressable accessibilityRole="button" onPress={() => onOpen(p)}>
              <Photo seed={p.seed} uri={p.photo} blur={p.blurred || blurAll} style={{ height: 200, borderRadius: 18 }}>
                <LinearGradient colors={['rgba(14,12,16,0)', 'rgba(14,12,16,0.9)']} style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: 10, paddingTop: 30 }}>
                  <T style={{ fontFamily: F.display, fontSize: 16 }}>
                    {p.name}, {p.age}
                  </T>
                  <T v="small" c={C.ink2}>
                    {p.fit}/7 fit · {p.dist}
                  </T>
                </LinearGradient>
              </Photo>
            </Pressable>
          </Rise>
        ))}
      </View>
    </Screen>
  );
}

/* ---------- Chats ---------- */

const chatPerson = (c) => c.person || personById(c.id);

export function Chats({ chats, onOpen }) {
  const plan = chats.find((c) => c.plan);
  return (
    <Screen scroll>
      <T v="title" style={{ marginTop: 8 }}>
        Chats
      </T>
      {plan ? (
        <Rise>
          <Pressable accessibilityRole="button" onPress={() => onOpen(plan.id)}>
            <Card style={{ marginTop: 16, flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 24 }}>
              <Avatar seed={chatPerson(plan).seed} uri={chatPerson(plan).photo} ring="fire" />
              <View style={{ flex: 1 }}>
                <T v="small" c={C.pinkL} style={{ fontFamily: F.semi, letterSpacing: 0.3 }}>
                  TONIGHT
                </T>
                <T style={{ fontFamily: F.semi }}>
                  {chatPerson(plan).name} · {plan.plan.place}, {plan.plan.time}
                </T>
                <T v="meta" c={C.muted} numberOfLines={1}>
                  {plan.messages[plan.messages.length - 1]?.text}
                </T>
              </View>
            </Card>
          </Pressable>
        </Rise>
      ) : null}
      <T v="label" c={C.faint} style={{ marginTop: 26, marginBottom: 4 }}>
        Make a plan to keep these
      </T>
      {chats
        .filter((c) => !c.plan)
        .map((c, i) => {
          const p = chatPerson(c);
          const last = c.messages[c.messages.length - 1];
          return (
            <Rise key={c.id} delay={60 * (i + 1)}>
              <Pressable accessibilityRole="button" onPress={() => onOpen(c.id)} style={styles.chatRow}>
                <Avatar seed={p.seed} uri={p.photo} ring={p.tier === 'fire' ? 'fire' : p.tier === 'glow' ? 'glow' : 'verified'} />
                <View style={{ flex: 1 }}>
                  <T style={{ fontFamily: F.semi }}>{p.name}</T>
                  <T v="meta" c={C.muted} numberOfLines={1}>
                    {last ? last.text : 'New match. Your move.'}
                  </T>
                </View>
                <T v="small" c={C.pinkL}>
                  {c.left}
                </T>
              </Pressable>
            </Rise>
          );
        })}
      <Card tone="safe" style={{ marginTop: 20, flexDirection: 'row', gap: 10, alignItems: 'center' }}>
        <Icon name="shieldCheck" size={20} color={C.blueL} />
        <T v="small" c={C.safeInk} style={{ flex: 1 }}>
          We filtered 1 request with explicit language before you saw it.
        </T>
      </Card>
    </Screen>
  );
}

function Typing() {
  const [a] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const loop = Animated.loop(Animated.timing(a, { toValue: 1, duration: 1000, useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [a]);
  return (
    <View style={[styles.them, { flexDirection: 'row', gap: 4, paddingVertical: 14 }]}>
      {[0, 0.33, 0.66].map((o) => (
        <Animated.View
          key={o}
          style={{
            width: 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: C.muted,
            opacity: a.interpolate({ inputRange: [0, o, Math.min(o + 0.33, 1), 1], outputRange: [0.3, 1, 0.3, 0.3] }),
          }}
        />
      ))}
    </View>
  );
}

const REPLIES = ['Love that. Tell me more 😏', 'Sounds perfect. See you there?', 'Haha okay, you have my attention.', 'I’m in. What time works?'];

// Words that make a first message count as explicit (Privacy › Filter explicit first messages).
const EXPLICIT = /\b(dick|cock|pussy|tits?|boobs?|nudes?|naked|horny|fuck(ing)?|suck|cum|blowjob|bj|anal|sexting|send pics?|dick ?pic)\b/i;

function HiddenMessage({ text }) {
  const [show, setShow] = useState(false);
  if (show) {
    return (
      <View style={styles.them}>
        <T>{text}</T>
      </View>
    );
  }
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="Hidden message, may be explicit. Tap to show." onPress={() => setShow(true)} style={[styles.them, { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#22335C', backgroundColor: C.blueBg }]}>
      <Icon name="eyeOff" size={16} color={C.blueL} />
      <View>
        <T v="small" c={C.safeInk} style={{ fontFamily: F.semi }}>
          Hidden: may be explicit
        </T>
        <T v="small" c={C.muted}>
          Tap to show
        </T>
      </View>
    </Pressable>
  );
}

export function Chat({ chat, onSend, onBack, onPlan, live, filterExplicit = true }) {
  // Messages they sent before you ever replied count as "first messages".
  const firstMine = chat.messages.findIndex((m) => m.me);
  const hide = (m, i) => filterExplicit && !m.me && !m.plan && (firstMine === -1 || i < firstMine) && EXPLICIT.test(m.text || '');
  const insets = useSafeAreaInsets();
  const p = chatPerson(chat);
  const [text, setText] = useState('');
  const [typing, setTyping] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const send = () => {
    const t = text.trim();
    if (!t) return;
    tap();
    onSend(chat.id, { me: true, text: t });
    setText('');
    if (live) {
      setTyping(true);
      setTimeout(() => {
        setTyping(false);
        onSend(chat.id, { me: false, text: REPLIES[Math.floor(Math.random() * REPLIES.length)] });
      }, 1600);
    }
  };
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: C.bg }}>
      <LiquidBg />
      <View style={[styles.chatHead, { paddingTop: insets.top + 4 }]}>
        <IconButton name="back" label="Back to chats" onPress={onBack} />
        <Avatar size={36} seed={p.seed} uri={p.photo} ring={p.tier === 'fire' ? 'fire' : 'glow'} />
        <View style={{ flex: 1 }}>
          <T style={{ fontFamily: F.semi }}>{p.name}</T>
          <T v="small" c={C.green}>
            {chat.plan ? `Plan at ${chat.plan.time}` : `Live until ${p.until}`}
          </T>
        </View>
        <IconButton name="shield" label="Safety tools" color={C.blueL} onPress={() => onPlan(chat.id)} />
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 8 }}>
        <T v="small" c={C.faint} style={{ alignSelf: 'center' }}>
          Matched today · open for 48 hours
        </T>
        {chat.messages.map((m, i) =>
          m.plan ? (
            <Pressable key={i} accessibilityRole="button" onPress={() => onPlan(chat.id)}>
              <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 20 }}>
                <LinearGradient colors={GRAD} style={{ width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="pin" size={18} color="#FFFFFF" />
                </LinearGradient>
                <View style={{ flex: 1 }}>
                  <T style={{ fontFamily: F.semi }}>
                    {chat.plan.place} · {chat.plan.time}
                  </T>
                  <T v="small" c={C.green}>
                    Both confirmed · match saved
                  </T>
                </View>
                <Icon name="chev" size={16} color={C.muted} />
              </Card>
            </Pressable>
          ) : (
            <Rise key={i} style={m.me ? { alignSelf: 'flex-end', maxWidth: '78%' } : { alignSelf: 'flex-start', maxWidth: '78%' }}>
              {m.me ? (
                <LinearGradient colors={['#D81B6A', '#9B2BA0']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.me}>
                  <T c="#FFFFFF">{m.text}</T>
                </LinearGradient>
              ) : (
                hide(m, i) ? (
                  <HiddenMessage text={m.text} />
                ) : (
                  <View style={styles.them}>
                    <T>{m.text}</T>
                  </View>
                )
              )}
            </Rise>
          ),
        )}
        {chat.id === 'lina' ? (
          <Pressable accessibilityRole="button" accessibilityLabel={revealed ? 'Photo' : 'Blurred photo, tap to view'} onPress={() => setRevealed(true)} style={styles.photoMsg}>
            <Photo seed={2} style={StyleSheet.absoluteFill} />
            {revealed ? null : (
              <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(20,17,22,0.88)', alignItems: 'center', justifyContent: 'center', gap: 6 }]}>
                <Icon name="eye" size={20} />
                <T v="small">Tap to view</T>
              </View>
            )}
          </Pressable>
        ) : null}
        {typing ? <Typing /> : null}
      </ScrollView>
      <View style={[styles.composer, { paddingBottom: insets.bottom + 10 }]}>
        <View style={styles.composerPill}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder={`Message ${p.name}`}
            placeholderTextColor={C.faint}
            style={styles.composerInput}
            onSubmitEditing={send}
            returnKeyType="send"
            accessibilityLabel="Message"
          />
          <Pressable accessibilityRole="button" accessibilityLabel="Send" onPress={send}>
            <LinearGradient colors={[C.pink, C.blue]} style={styles.sendBtn}>
              <Icon name="send" size={18} color="#FFFFFF" stroke={2.2} />
            </LinearGradient>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

/* ---------- Plan & safety ---------- */

const QUICK = [
  { icon: 'clock', label: 'Running late', text: 'Running about 10 minutes late, sorry! See you soon.' },
  { icon: 'chat', label: 'Fake a call', fake: true },
  { icon: 'close', label: 'Cancel kindly', text: 'Hey, I can’t make it tonight after all. Sorry for the short notice, hope you have a good night.' },
];

export function Plan({ chat, onBack, onSend, onFakeCall }) {
  const p = chatPerson(chat);
  return (
    <Screen scroll>
      <Header title={`Tonight with ${p.name}`} onBack={onBack} />
      <Card style={{ padding: 0, overflow: 'hidden', borderRadius: 22, marginTop: 6 }}>
        <View style={{ height: 120, backgroundColor: C.surf3, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="pin" size={34} color={C.pink} />
        </View>
        <View style={{ padding: 14 }}>
          <T v="h">{chat.plan ? `${chat.plan.place} · ${chat.plan.time}` : 'No plan yet'}</T>
          <T v="meta" c={C.muted}>
            Public venue first. Always.
          </T>
        </View>
      </Card>
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
        {QUICK.map((q) => (
          <Pressable
            key={q.label}
            accessibilityRole="button"
            onPress={() => {
              tap();
              if (q.fake) {
                Alert.alert('Fake a call', 'Your phone will ring in 20 seconds. Keep the app open.', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Start', onPress: onFakeCall },
                ]);
                return;
              }
              Alert.alert(q.label, `Send this to ${p.name}?\n\n“${q.text}”`, [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Send',
                  onPress: () => {
                    success();
                    onSend(chat.id, { me: true, text: q.text });
                    onBack();
                  },
                },
              ]);
            }}
            style={styles.quick}
          >
            <Icon name={q.icon} size={20} />
            <T v="small">{q.label}</T>
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}

/* ---------- Guides ---------- */

export function GuideView({ guide, onBack }) {
  const [saved, setSaved] = useState(false);
  return (
    <Screen scroll>
      <Header title="" onBack={onBack} />
      <T v="small" c={C.pinkL} style={{ fontFamily: F.semi, letterSpacing: 1 }}>
        {guide.cat.toUpperCase()} · {guide.mins} MIN READ
      </T>
      <T v="title" style={{ marginTop: 6 }}>
        {guide.title}
      </T>
      <View style={{ marginTop: 16, gap: 14 }}>
        {guide.body.map((b, i) => (
          <View key={i} style={{ flexDirection: 'row', gap: 12 }}>
            <LinearGradient colors={[GRAD[i % 3], GRAD[(i + 1) % 3]]} style={{ width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}>
              <T v="small" c="#FFFFFF" style={{ fontFamily: F.bold }}>
                {i + 1}
              </T>
            </LinearGradient>
            <T style={{ flex: 1 }} c={C.ink2}>
              {b}
            </T>
          </View>
        ))}
      </View>
      <Card tone="safe" style={{ marginTop: 20, flexDirection: 'row', gap: 10, alignItems: 'center' }}>
        <Icon name="shieldCheck" size={18} color={C.blueL} />
        <T v="small" c={C.safeInk}>
          Reviewed by a certified sex educator
        </T>
      </Card>
      <View style={{ height: 20 }} />
      <GradientButton title={saved ? 'Added to your wishlist' : 'Add to my wishlist'} onPress={() => { success(); setSaved(true); }} />
      <T v="small" c={C.muted} style={{ textAlign: 'center', marginTop: 8 }}>
        Matches only see wishlist items you both added
      </T>
    </Screen>
  );
}

/* ---------- Me & settings ---------- */

function GlowRing({ children, size = 72 }) {
  const [r] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const loop = Animated.loop(Animated.timing(r, { toValue: 1, duration: 5000, easing: Easing.linear, useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [r]);
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={{ position: 'absolute', width: size * 1.5, height: size * 1.5, transform: [{ rotate: r.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] }}>
        <LinearGradient colors={[C.pink, C.violet, C.blue, C.violet, C.pink]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1 }} />
      </Animated.View>
      <View style={{ width: size - 6, height: size - 6, borderRadius: (size - 6) / 2, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' }}>{children}</View>
    </View>
  );
}

function ProgressRing({ percent, size = 64 }) {
  const r = (size - 8) / 2;
  const c = 2 * Math.PI * r;
  return (
    <Svg width={size} height={size}>
      <SvgDefs>
        <SvgGrad id="ring" x1="0" y1="0" x2="1" y2="1">
          <SvgStop offset="0" stopColor={C.pink} />
          <SvgStop offset="1" stopColor={C.blue} />
        </SvgGrad>
      </SvgDefs>
      <SvgCircle cx={size / 2} cy={size / 2} r={r} stroke="#2A242C" strokeWidth={7} fill="none" />
      <SvgCircle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke="url(#ring)"
        strokeWidth={7}
        fill="none"
        strokeLinecap="round"
        strokeDasharray={`${(c * percent) / 100} ${c}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </Svg>
  );
}

function CompletenessCard({ profile, go }) {
  const { percent, next } = completeness(profile);
  const target = next && next.id === 'verified' ? null : 'editProfile';
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Profile ${percent}% complete`} onPress={() => target && go(target)} style={styles.complete}>
      <View style={{ width: 64, height: 64, alignItems: 'center', justifyContent: 'center' }}>
        <ProgressRing percent={percent} />
        <T style={{ position: 'absolute', fontFamily: F.display, fontSize: 16 }}>{percent}%</T>
      </View>
      <View style={{ flex: 1 }}>
        <T style={{ fontFamily: F.semi }}>{percent === 100 ? 'Your profile is complete' : 'Complete your profile'}</T>
        <T v="small" c={C.muted} style={{ marginTop: 2 }}>
          {next ? 'Complete profiles get up to 3× more matches.' : 'Nice. You’re showing your best side.'}
        </T>
        {next ? (
          <View style={styles.nextStep}>
            <T v="small" c={C.pinkL} style={{ fontFamily: F.bold }}>
              +{next.gain}%
            </T>
            <T v="small" c={C.ink}>
              {next.label}
            </T>
          </View>
        ) : null}
      </View>
      {target && next ? <Icon name="chev" size={16} color={C.muted} /> : null}
    </Pressable>
  );
}

export function Me({ profile, go, onRestart }) {
  const { percent } = completeness(profile);
  return (
    <Screen scroll>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 8 }}>
        <Pressable accessibilityRole="button" accessibilityLabel={`Edit profile, ${percent}% complete`} onPress={() => go('editProfile')}>
          <GlowRing>
            {profile.photos?.[0] ? <Image source={{ uri: profile.photos[0] }} style={{ width: 62, height: 62, borderRadius: 31 }} /> : <Photo style={{ width: 62, height: 62, borderRadius: 31 }} />}
          </GlowRing>
          <View style={styles.pctBadge}>
            <T c="#FFFFFF" style={{ fontFamily: F.bold, fontSize: 11, lineHeight: 14 }}>
              {percent}%
            </T>
          </View>
        </Pressable>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <T style={{ fontFamily: F.display, fontSize: 24 }}>
              {profile.name || 'You'}
              {profile.age ? `, ${profile.age}` : ''}
            </T>
            {profile.verified ? <Verified size={18} /> : null}
          </View>
          <T v="meta" c={C.muted}>
            {profile.city ? `${profile.city}${profile.country ? `, ${profile.country}` : ''} · ` : ''}
            {profile.verified ? <T v="meta" c={C.blueL}>Verified</T> : 'Not verified yet'}
          </T>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Settings" onPress={() => go('settings')} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: C.surf2, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="gear" size={20} />
        </Pressable>
      </View>
      <CompletenessCard profile={profile} go={go} />
      <T v="label" c={C.muted} style={{ marginTop: 22, marginBottom: 6 }}>
        You
      </T>
      {profile.bio ? (
        <Card style={{ marginBottom: 10 }}>
          <T c={C.ink2} style={{ lineHeight: 21 }}>
            “{profile.bio}”
          </T>
        </Card>
      ) : null}
      <Card style={{ paddingVertical: 0 }}>
        <Row icon="pin" iconColor={C.pinkL} iconBg={C.pinkBg} title="Edit profile" onPress={() => go('editProfile')} />
        <Row icon="gear" iconColor={C.ink2} iconBg={C.surf2} title="Settings" sub="Notifications, privacy, account" onPress={() => go('settings')} />
        <Row icon="lock" iconColor={C.blueL} iconBg={C.blueBg} title="Privacy & discretion" onPress={() => go('privacy')} />
        <Row icon="flame" iconColor={C.violetL} iconBg={C.violetBg} title="The Tonight Code" onPress={() => go('code')} last />
      </Card>
      <T v="label" c={C.muted} style={{ marginTop: 22, marginBottom: 6 }}>
        Help shape Tonight
      </T>
      <Card style={{ paddingVertical: 0 }}>
        <Row icon="bulb" title="Ideas board" onPress={() => go('ideas')} />
        <Row
          icon="chat"
          iconColor={C.blueL}
          iconBg={C.blueBg}
          title="Support chat"
          onPress={() => go('support')}
          right={
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <LiveDot />
              <T v="small" c={C.green}>
                Online
              </T>
            </View>
          }
          last
        />
      </Card>
      <GhostButton title="Restart onboarding (test build)" onPress={onRestart} border={false} color={C.muted} style={{ marginTop: 18 }} />
      <T v="small" c={C.faint} style={{ textAlign: 'center', marginTop: 4 }}>
        {versionLabel()}
      </T>
      <T v="small" c={C.faint} style={{ textAlign: 'center' }}>
        Tonight 1.0 · test build with sample members
      </T>
    </Screen>
  );
}

export function CodeView({ onBack }) {
  return (
    <Screen scroll bg={C.bgDeep}>
      <Header title="The Tonight Code" onBack={onBack} />
      {VOWS.map((v) => (
        <View key={v.n} style={{ alignItems: 'center', paddingVertical: 10 }}>
          <T v="small" c={C.orange} style={{ fontFamily: F.bold, letterSpacing: 3 }}>
            {v.n}
          </T>
          <T style={{ fontFamily: F.display, fontSize: 18, textShadowColor: 'rgba(255,138,61,0.7)', textShadowRadius: 10 }} c="#FFF3EA">
            {v.text}
          </T>
        </View>
      ))}
      <Card tone="safe" style={{ marginTop: 16 }}>
        <T v="small" c={C.safeInk}>
          You sealed these vows when you joined. Ward, our watchdog, guards them for everyone.
        </T>
      </Card>
    </Screen>
  );
}

export function Support({ onBack }) {
  const insets = useSafeAreaInsets();
  const [msgs, setMsgs] = useState([{ me: false, text: 'Hi! Ask us anything: billing, verification, a bug. A real person reads every message.' }]);
  const [text, setText] = useState('');
  const [typing, setTyping] = useState(false);
  const send = () => {
    const t = text.trim();
    if (!t) return;
    tap();
    setMsgs((m) => [...m, { me: true, text: t }]);
    setText('');
    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      setMsgs((m) => [...m, { me: false, text: 'Thanks! In this test build a teammate will follow up by email at info@fortunas.nl.' }]);
    }, 1500);
  };
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={[styles.chatHead, { paddingTop: insets.top + 4 }]}>
        <IconButton name="back" label="Back" onPress={onBack} />
        <LinearGradient colors={[C.pink, C.blue]} style={{ width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' }}>
          <T c="#FFFFFF" style={{ fontFamily: F.displayX }}>
            t.
          </T>
        </LinearGradient>
        <View style={{ flex: 1 }}>
          <T style={{ fontFamily: F.semi }}>Support</T>
          <T v="small" c={C.green}>
            Real people · usually reply in minutes
          </T>
        </View>
      </View>
      <Pressable accessibilityRole="button" onPress={() => setText('I want to report someone: ')} style={styles.report}>
        <Icon name="shield" size={18} color="#FFC9CE" />
        <T v="small" c="#FFC9CE" style={{ flex: 1 }}>
          Someone made you feel unsafe? <T v="small" c="#FFC9CE" style={{ fontFamily: F.bold }}>Tell Ward. It jumps the queue.</T>
        </T>
      </Pressable>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 8 }}>
        {msgs.map((m, i) => (
          <Rise key={i} style={m.me ? { alignSelf: 'flex-end', maxWidth: '80%' } : { alignSelf: 'flex-start', maxWidth: '80%' }}>
            {m.me ? (
              <LinearGradient colors={['#D81B6A', '#9B2BA0']} style={styles.me}>
                <T c="#FFFFFF">{m.text}</T>
              </LinearGradient>
            ) : (
              <View style={[styles.them, { backgroundColor: '#1A2440' }]}>
                <T>{m.text}</T>
              </View>
            )}
          </Rise>
        ))}
        {typing ? <Typing /> : null}
      </ScrollView>
      <View style={[styles.composer, { paddingBottom: insets.bottom + 10 }]}>
        <View style={styles.composerPill}>
          <TextInput value={text} onChangeText={setText} placeholder="Write a message…" placeholderTextColor={C.faint} style={styles.composerInput} onSubmitEditing={send} returnKeyType="send" accessibilityLabel="Message support" />
          <Pressable accessibilityRole="button" accessibilityLabel="Send" onPress={send}>
            <LinearGradient colors={[C.pink, C.blue]} style={styles.sendBtn}>
              <Icon name="send" size={18} color="#FFFFFF" stroke={2.2} />
            </LinearGradient>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

export function Ideas({ ideas, setIdeas, onPost, onVote, onBack }) {
  const [sort, setSort] = useState('top');
  const [draft, setDraft] = useState('');
  const vote = (id, dir) => {
    tap();
    setIdeas(
      ideas.map((i) => {
        if (i.id !== id) return i;
        const was = i.mine || 0;
        const now = was === dir ? 0 : dir;
        if (i.real) onVote?.(i.id, now);
        return { ...i, mine: now, score: i.score - was + now };
      }),
    );
  };
  const post = () => {
    const t = draft.trim();
    if (!t) return;
    success();
    const tempId = `n${Date.now()}`;
    setIdeas([{ id: tempId, title: t, desc: '', by: 'You', cat: 'New', status: 'Open', score: 1, mine: 1 }, ...ideas]);
    onPost?.(t).then((id) => id && setIdeas((list) => list.map((i) => (i.id === tempId ? { ...i, id, real: true } : i))));
    setDraft('');
    setSort('new');
  };
  const list = sort === 'top' ? [...ideas].sort((a, b) => b.score - a.score) : sort === 'mine' ? ideas.filter((i) => i.by === 'You') : ideas;
  const statusColor = { Planned: [C.blueBg, C.blueL], Open: ['#241F26', C.ink2], 'Not planned': ['#2A1A1E', '#FFB3BD'], Shipped: [C.greenBg, C.green] };
  return (
    <Screen scroll>
      <Header title="Ideas" onBack={onBack} />
      <T v="meta" c={C.muted}>
        Vote on what we build next. The most wanted ideas go on the roadmap.
      </T>
      <View style={styles.ideaInput}>
        <TextInput value={draft} onChangeText={setDraft} placeholder="Suggest an idea…" placeholderTextColor={C.faint} style={{ flex: 1, color: C.ink, fontFamily: F.body, fontSize: 15 }} accessibilityLabel="Suggest an idea" />
        <Pressable accessibilityRole="button" accessibilityLabel="Post idea" onPress={post}>
          <LinearGradient colors={GRAD} style={styles.sendBtn}>
            <Icon name="plus" size={18} color="#FFFFFF" stroke={2.4} />
          </LinearGradient>
        </Pressable>
      </View>
      <View style={{ marginTop: 12 }}>
        <Segmented
          value={sort}
          onChange={setSort}
          options={[
            { value: 'top', label: 'Top' },
            { value: 'new', label: 'New' },
            { value: 'mine', label: 'Mine' },
          ]}
        />
      </View>
      {list.map((i) => (
        <View key={i.id} style={styles.idea}>
          <View style={{ alignItems: 'center', width: 44 }}>
            <Pressable accessibilityRole="button" accessibilityLabel="Upvote" accessibilityState={{ selected: i.mine === 1 }} onPress={() => vote(i.id, 1)} style={[styles.vote, i.mine === 1 && { borderColor: C.pink, backgroundColor: C.pinkBg }]}>
              <Icon name="up" size={18} color={i.mine === 1 ? C.pinkL : C.muted} stroke={2.4} />
            </Pressable>
            <T style={{ fontFamily: F.displayX, fontSize: 17, marginVertical: 4 }} c={i.score > 0 ? C.ink : C.muted}>
              {i.score > 0 ? `+${i.score}` : i.score}
            </T>
            <Pressable accessibilityRole="button" accessibilityLabel="Downvote" accessibilityState={{ selected: i.mine === -1 }} onPress={() => vote(i.id, -1)} style={[styles.vote, i.mine === -1 && { borderColor: C.blue, backgroundColor: C.blueBg }]}>
              <Icon name="down" size={18} color={i.mine === -1 ? C.blueL : C.muted} stroke={2.4} />
            </Pressable>
          </View>
          <View style={{ flex: 1 }}>
            <T style={{ fontFamily: F.display, fontSize: 16 }}>{i.title}</T>
            {i.desc ? (
              <T v="meta" c={C.ink2} style={{ marginTop: 2 }}>
                {i.desc}
              </T>
            ) : null}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
              <T v="small" c={C.muted}>
                {i.by} · {i.cat}
              </T>
              <View style={{ backgroundColor: statusColor[i.status][0], borderRadius: 11, paddingHorizontal: 8, paddingVertical: 3 }}>
                <T v="small" c={statusColor[i.status][1]} style={{ fontFamily: F.bold, fontSize: 11 }}>
                  {i.status}
                </T>
              </View>
            </View>
            {i.reply ? (
              <View style={{ backgroundColor: C.safeBg, borderRadius: 12, padding: 8, marginTop: 8 }}>
                <T v="small" c={C.safeInk}>
                  <T v="small" style={{ fontFamily: F.semi }}>Tonight team: </T>
                  {i.reply}
                </T>
              </View>
            ) : null}
          </View>
        </View>
      ))}
    </Screen>
  );
}


const styles = StyleSheet.create({
  exampleTag: { position: 'absolute', top: 22, right: 14, height: 24, paddingHorizontal: 9, borderRadius: 12, backgroundColor: 'rgba(14,12,16,0.7)', justifyContent: 'center', zIndex: 2 },
  complete: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 16, padding: 14, borderRadius: 22, backgroundColor: '#151217', borderWidth: 1, borderColor: C.line },
  nextStep: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', marginTop: 8, height: 26, paddingHorizontal: 10, borderRadius: 13, backgroundColor: C.pinkBg },
  pctBadge: { position: 'absolute', bottom: -6, alignSelf: 'center', minWidth: 40, height: 20, borderRadius: 10, paddingHorizontal: 6, backgroundColor: C.pink, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: C.bg },
  topbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 48, paddingHorizontal: 8 },
  filterBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: C.surf2, borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center' },
  filterBadge: { position: 'absolute', top: -2, right: -2, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: C.pink, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, borderWidth: 2, borderColor: C.bg },
  fChip: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 32, paddingHorizontal: 12, borderRadius: 16, borderWidth: 1, borderColor: '#2E2830', backgroundColor: 'rgba(255,255,255,0.03)' },
  fChipOn: { borderColor: C.pink, backgroundColor: C.pinkBg },
  emptyDeck: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30 },
  card: { flex: 1, borderRadius: 28 },
  bars: { position: 'absolute', top: 12, left: 16, right: 16, flexDirection: 'row', gap: 4 },
  bar: { flex: 1, height: 3, borderRadius: 2, backgroundColor: 'rgba(244,239,234,0.3)' },
  cardInfo: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 20, paddingTop: 80 },
  pill: { height: 30, paddingHorizontal: 12, borderRadius: 15, backgroundColor: 'rgba(244,239,234,0.14)', justifyContent: 'center' },
  actions: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 22, paddingVertical: 14 },
  roundGhost: { width: 58, height: 58, borderRadius: 29, borderWidth: 1.5, borderColor: C.line2, backgroundColor: C.surf3, alignItems: 'center', justifyContent: 'center' },
  roundLike: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  check: { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  closeWrap: { position: 'absolute', left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between' },
  glass: { backgroundColor: 'rgba(20,17,22,0.6)', borderRadius: 22 },
  stickyBar: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingTop: 30, paddingHorizontal: 24, flexDirection: 'row', gap: 12, alignItems: 'center' },
  matchPhoto: { width: 150, height: 150, borderRadius: 75, borderWidth: 4, borderColor: '#FFFFFF', overflow: 'hidden' },
  matchNote: { flexDirection: 'row', gap: 12, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.14)', borderRadius: 18, padding: 14, marginTop: 26 },
  matchOpt: { height: 50, borderRadius: 14, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.5)', justifyContent: 'center', paddingHorizontal: 16, marginBottom: 10 },
  matchCta: { height: 56, borderRadius: 28, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  chatRow: { flexDirection: 'row', alignItems: 'center', gap: 14, height: 76, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  chatHead: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 8, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: C.line },
  me: { paddingVertical: 11, paddingHorizontal: 15, borderRadius: 22, borderBottomRightRadius: 6 },
  them: { paddingVertical: 11, paddingHorizontal: 15, borderRadius: 22, borderBottomLeftRadius: 6, backgroundColor: '#1F1A21', alignSelf: 'flex-start' },
  photoMsg: { width: 180, height: 140, borderRadius: 22, borderBottomLeftRadius: 6, overflow: 'hidden' },
  composer: { paddingHorizontal: 14, paddingTop: 10 },
  composerPill: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 52, paddingLeft: 16, paddingRight: 6, borderRadius: 26, backgroundColor: C.surf3, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  composerInput: { flex: 1, color: C.ink, fontFamily: F.body, fontSize: 15 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  quick: { flex: 1, height: 64, borderRadius: 16, borderWidth: 1.5, borderColor: C.line2, backgroundColor: C.surf3, alignItems: 'center', justifyContent: 'center', gap: 5 },
  report: { flexDirection: 'row', gap: 10, alignItems: 'center', backgroundColor: '#2A1A1E', borderRadius: 14, padding: 12, margin: 16, marginBottom: 0 },
  ideaInput: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 52, paddingLeft: 16, paddingRight: 6, borderRadius: 26, backgroundColor: C.surf3, borderWidth: 1.5, borderColor: C.line2, marginTop: 14 },
  idea: { flexDirection: 'row', gap: 12, padding: 14, backgroundColor: C.surf3, borderRadius: 18, borderWidth: 1, borderColor: C.line, marginTop: 10 },
  vote: { width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, borderColor: C.line2, alignItems: 'center', justifyContent: 'center' },
});
