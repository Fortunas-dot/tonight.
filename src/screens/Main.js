import { useEffect, useRef, useState } from 'react';
import { Alert, Animated, Easing, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, F, GRAD } from '../theme';
import { Icon, Verified } from '../icons';
import { GUIDES, VOWS } from '../data';
import { versionLabel } from '../version';
import { completeness } from '../completeness';
import * as api from '../backend';
import Svg, { Circle as SvgCircle, Defs as SvgDefs, LinearGradient as SvgGrad, Path as SvgPath, Stop as SvgStop } from 'react-native-svg';
import { Avatar, Card, GhostButton, GradientButton, Header, IconButton, LiquidBg, LiveDot, Photo, Rise, Row, Screen, Segmented, T, success, tap } from '../ui';

/* ---------- Match ---------- */

// "It's mutual": dark and warm. Your photo and theirs lean in towards each other, an ember glows where they meet.
function MatchFlame({ size = 26 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <SvgDefs>
        <SvgGrad id="matchFlame" x1="0.5" y1="1" x2="0.5" y2="0">
          <SvgStop offset="0" stopColor="#F0287A" />
          <SvgStop offset="0.55" stopColor="#FF8C3C" />
          <SvgStop offset="1" stopColor="#FFD27A" />
        </SvgGrad>
      </SvgDefs>
      <SvgPath d="M12 2c1.2 4.5 6 6.2 6 11.2A6 6 0 0 1 6 13.2c0-2.8 1.7-4.5 2.9-5.6.3 2.2 1.5 3.4 2.9 3.4-1.1-3.4 0-6.7.2-9z" fill="url(#matchFlame)" />
    </Svg>
  );
}

export function Match({ person, me, onChat, onClose }) {
  const insets = useSafeAreaInsets();
  const [pop] = useState(() => new Animated.Value(0));
  const [ember] = useState(() => new Animated.Value(0));
  useEffect(() => {
    success();
    Animated.spring(pop, { toValue: 1, useNativeDriver: true, speed: 7, bounciness: 10 }).start();
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(ember, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(ember, { toValue: 0, duration: 1600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pop, ember]);
  const both = (person.both || []).slice(0, 3);
  const openers = ['Drink at Bar Mona, 21:30?', 'That smile. Tonight?'];
  const lean = (dir) => ({
    transform: [
      { translateX: pop.interpolate({ inputRange: [0, 1], outputRange: [dir * 60, 0] }) },
      { rotate: pop.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${dir * 9}deg`] }) },
    ],
    opacity: pop,
  });
  return (
    <View style={{ flex: 1, backgroundColor: '#08070A', paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16 }}>
      <View pointerEvents="none" style={styles.matchGlow} />
      <LinearGradient pointerEvents="none" colors={['rgba(8,7,10,0)', 'rgba(59,123,255,0.16)']} style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 340 }} />
      <View style={{ alignItems: 'flex-end', paddingHorizontal: 16 }}>
        <IconButton name="close" label="Close" onPress={onClose} color="#FFFFFF" />
      </View>

      <View style={{ height: 250, marginTop: 6 }}>
        <Animated.View style={[styles.matchCard, { left: '13%', borderColor: 'rgba(255,127,181,0.6)' }, lean(-1)]}>
          <Photo seed={5} uri={me?.photos?.[0]} style={{ flex: 1 }} />
        </Animated.View>
        <Animated.View style={[styles.matchCard, { right: '13%', borderColor: 'rgba(111,168,255,0.65)' }, lean(1)]}>
          <Photo seed={person.seed} uri={person.photo} style={{ flex: 1 }} />
        </Animated.View>
        <Animated.View
          pointerEvents="none"
          style={[styles.matchEmber, { opacity: ember.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0.95] }), transform: [{ scale: ember.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1.12] }) }] }]}
        />
        <Animated.View style={[styles.matchSeal, { transform: [{ scale: pop }] }]}>
          <MatchFlame />
        </Animated.View>
      </View>

      <View style={{ alignItems: 'center', paddingHorizontal: 24, marginTop: 8 }}>
        <T style={{ fontFamily: F.semi, fontSize: 11, letterSpacing: 4 }} c="#FFB37A">
          THE FEELING IS
        </T>
        <T style={{ fontFamily: F.displayX, fontSize: 56, lineHeight: 60, letterSpacing: -1.6, textShadowColor: 'rgba(240,40,122,0.7)', textShadowRadius: 22 }} c="#FF5FA2">
          mutual.
        </T>
        <T c="#D9D2D6" style={{ textAlign: 'center', fontSize: 15, lineHeight: 21, marginTop: 6 }}>
          You and {person.name} want the same night.
        </T>
        {both.length ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6, marginTop: 12 }}>
            {both.map((b) => (
              <View key={b} style={styles.matchChip}>
                <T v="small" c="#F4EFEA" style={{ fontFamily: F.semi }}>
                  {b}
                </T>
              </View>
            ))}
          </View>
        ) : null}
      </View>

      <View style={{ flex: 1 }} />
      <View style={{ paddingHorizontal: 20, gap: 10 }}>
        <T v="small" c={C.muted} style={{ fontFamily: F.semi, letterSpacing: 2, fontSize: 11 }}>
          BREAK THE ICE
        </T>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {openers.map((o) => (
            <Pressable key={o} accessibilityRole="button" onPress={() => onChat(person, o)} style={styles.matchOpener}>
              <T c="#F4EFEA" style={{ fontSize: 13 }}>
                {o}
              </T>
            </Pressable>
          ))}
        </View>
        <GradientButton title={`Say something to ${person.name}`} onPress={() => onChat(person)} style={{ marginTop: 4 }} />
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Icon name="clock" size={14} color="#FFB37A" />
            <T v="small" c={C.muted}>
              48h to make a plan
            </T>
          </View>
          <Pressable accessibilityRole="button" onPress={onClose} hitSlop={10} style={{ paddingVertical: 10 }}>
            <T v="label" c="#F4EFEA">
              Keep browsing
            </T>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

/* ---------- Likes you ---------- */

export function Likes({ people: real = [], onOpen, blurAll }) {
  const people = real;
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
              A complete profile gets noticed faster. When someone likes you, they show up here, free.
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
                    {(p.both || []).length} in common · {p.dist}
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

const chatPerson = (c) => c.person || {};

export function Chats({ chats, onOpen, filterExplicit = true }) {
  const plan = chats.find((c) => c.plan);
  const fresh = chats.filter((c) => !c.plan && !c.messages.length);
  const talking = chats.filter((c) => !c.plan && c.messages.length);
  return (
    <Screen scroll>
      <T v="title" style={{ marginTop: 8 }}>
        Chats
      </T>

      {!chats.length ? (
        <Card style={{ marginTop: 18, alignItems: 'center', gap: 6, paddingVertical: 28 }}>
          <Icon name="chat" size={28} color={C.muted} />
          <T style={{ fontFamily: F.semi }}>No matches yet</T>
          <T v="small" c={C.muted} style={{ textAlign: 'center' }}>
            Like someone in Discover. When it’s mutual, your chat starts here.
          </T>
        </Card>
      ) : null}

      {fresh.length ? (
        <>
          <T v="label" c={C.faint} style={{ marginTop: 20, marginBottom: 10 }}>
            New matches · your move
          </T>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 14 }}>
            {fresh.map((c, i) => {
              const p = chatPerson(c);
              return (
                <Rise key={c.id} delay={i * 60}>
                  <Pressable accessibilityRole="button" accessibilityLabel={`New match ${p.name}, say hi`} onPress={() => onOpen(c.id)} style={{ alignItems: 'center', width: 72 }}>
                    <Avatar size={66} seed={p.seed} uri={p.photo} ring="glow" />
                    <T v="small" style={{ marginTop: 6, fontFamily: F.semi }} numberOfLines={1}>
                      {p.name}
                    </T>
                    {c.left ? (
                      <T v="small" c={C.pinkL} style={{ fontSize: 10 }}>
                        {c.left}
                      </T>
                    ) : null}
                  </Pressable>
                </Rise>
              );
            })}
          </ScrollView>
        </>
      ) : null}

      {plan ? (
        <Rise>
          <Pressable accessibilityRole="button" onPress={() => onOpen(plan.id)}>
            <LinearGradient colors={['rgba(240,40,122,0.18)', 'rgba(123,60,255,0.14)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.planCard}>
              <Avatar seed={chatPerson(plan).seed} uri={chatPerson(plan).photo} ring="fire" />
              <View style={{ flex: 1 }}>
                <T v="small" c={C.pinkL} style={{ fontFamily: F.bold, letterSpacing: 0.5 }}>
                  TONIGHT
                </T>
                <T style={{ fontFamily: F.semi }}>
                  {chatPerson(plan).name} · {plan.plan.place}, {plan.plan.time}
                </T>
                <T v="meta" c={C.muted} numberOfLines={1}>
                  {plan.messages[plan.messages.length - 1]?.text}
                </T>
              </View>
              <Icon name="chev" size={16} color={C.muted} />
            </LinearGradient>
          </Pressable>
        </Rise>
      ) : null}

      {talking.length ? (
        <T v="label" c={C.faint} style={{ marginTop: 22, marginBottom: 4 }}>
          Messages
        </T>
      ) : null}
      {talking.map((c, i) => {
        const p = chatPerson(c);
        const last = c.messages[c.messages.length - 1];
        const theirTurn = last && !last.me;
        return (
          <Rise key={c.id} delay={60 * (i + 1)}>
            <Pressable accessibilityRole="button" onPress={() => onOpen(c.id)} style={styles.chatRow}>
              <Avatar seed={p.seed} uri={p.photo} ring={p.tier === 'fire' ? 'fire' : p.tier === 'glow' ? 'glow' : 'verified'} />
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <T style={{ fontFamily: F.semi }}>{p.name}</T>
                  {theirTurn ? <View style={styles.turnDot} /> : null}
                </View>
                <T v="meta" c={theirTurn ? C.ink2 : C.muted} numberOfLines={1} style={theirTurn ? { fontFamily: F.medium } : null}>
                  {last.me ? `You: ${last.text}` : last.text}
                </T>
              </View>
              {c.left ? (
                <T v="small" c={C.pinkL}>
                  {c.left}
                </T>
              ) : null}
            </Pressable>
          </Rise>
        );
      })}

      {filterExplicit ? (
        <Card tone="safe" style={{ marginTop: 20, flexDirection: 'row', gap: 10, alignItems: 'center' }}>
          <Icon name="shieldCheck" size={20} color={C.blueL} />
          <T v="small" c={C.safeInk} style={{ flex: 1 }}>
            Explicit first messages stay hidden until you tap. Change this in Privacy & discretion.
          </T>
        </Card>
      ) : null}
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
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Hidden message, may be explicit. Tap to show."
      onPress={() => setShow(true)}
      style={[styles.them, { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#22335C', backgroundColor: C.blueBg }]}
    >
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

export function Chat({ chat, onSend, onRetry, onBack, onPlan, onProfile, live, filterExplicit = true }) {
  // Messages they sent before you ever replied count as "first messages".
  const firstMine = chat.messages.findIndex((m) => m.me);
  const hide = (m, i) => filterExplicit && !m.me && !m.plan && (firstMine === -1 || i < firstMine) && EXPLICIT.test(m.text || '');
  const insets = useSafeAreaInsets();
  const p = chatPerson(chat);
  const [text, setText] = useState('');
  const [typing, setTyping] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [now, setNow] = useState(() => new Date().toISOString());
  const lastTypingSent = useRef(0);

  // Real chats: mark them read while open, and tell the other side when I'm typing.
  const msgCount = chat.messages.length;
  useEffect(() => {
    if (chat.real) api.markRead(chat.matchId);
  }, [chat.real, chat.matchId, msgCount]);
  // Guides you both saved to your wishlist (the server only ever returns the overlap).
  const [bothIds, setBothIds] = useState([]);
  useEffect(() => {
    if (!chat.real || !chat.matchId) return undefined;
    let alive = true;
    api.sharedWishlist(chat.matchId).then((ids) => alive && setBothIds(ids));
    return () => {
      alive = false;
    };
  }, [chat.real, chat.matchId]);
  const both = GUIDES.filter((g) => bothIds.includes(g.id));
  // Re-check "typing…" every couple of seconds so it disappears when they stop.
  useEffect(() => {
    if (!chat.real) return undefined;
    const t = setInterval(() => setNow(new Date().toISOString()), 2000);
    return () => clearInterval(t);
  }, [chat.real]);
  const theyType = chat.real && chat.theirTyping && Date.parse(now) - Date.parse(chat.theirTyping) < 6000;
  const onType = (t) => {
    setText(t);
    if (!chat.real || !t) return;
    const ms = Date.parse(new Date().toISOString());
    if (ms - lastTypingSent.current > 3000) {
      lastTypingSent.current = ms;
      api.setTyping(chat.matchId);
    }
  };
  // "Seen" under my last message once they've read past it.
  const lastMine = (() => {
    for (let i = chat.messages.length - 1; i >= 0; i--) if (chat.messages[i].me) return i;
    return -1;
  })();
  const lastMineSeen = lastMine >= 0 && chat.real && chat.theirRead && chat.messages[lastMine].at && Date.parse(chat.theirRead) >= Date.parse(chat.messages[lastMine].at);
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
        <Pressable accessibilityRole="button" accessibilityLabel={`View ${p.name}'s profile`} onPress={() => onProfile?.(p)} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Avatar size={36} seed={p.seed} uri={p.photo} ring={p.tier === 'fire' ? 'fire' : 'glow'} />
          <View style={{ flex: 1 }}>
            <T style={{ fontFamily: F.semi }}>{p.name}</T>
            <T v="small" c={C.green}>
              {theyType ? 'typing…' : chat.plan ? `Plan at ${chat.plan.time}` : `Live until ${p.until}`} ·{' '}
              <T v="small" c={C.muted}>
                view profile
              </T>
            </T>
          </View>
        </Pressable>
        <IconButton name="shield" label="Safety tools" color={C.blueL} onPress={() => onPlan(chat.id)} />
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 8 }}>
        <T v="small" c={C.faint} style={{ alignSelf: 'center' }}>
          Matched today · open for 48 hours
        </T>
        {both.length ? (
          <View style={styles.bothSaved}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Icon name="bookmark" size={14} color={C.pinkL} />
              <T v="small" c={C.pinkL} style={{ fontFamily: F.semi, letterSpacing: 0.4 }}>
                YOU BOTH SAVED
              </T>
            </View>
            {both.map((g) => (
              <T key={g.id} c={C.ink} style={{ fontSize: 14, lineHeight: 20, marginTop: 4 }}>
                {g.title}
              </T>
            ))}
            <T v="small" c={C.muted} style={{ marginTop: 6 }}>
              Only what you both added shows here. An easy way to start talking.
            </T>
          </View>
        ) : null}
        {chat.plan && !chat.messages.some((m) => m.plan) ? (
          <Pressable accessibilityRole="button" accessibilityLabel={`Plan: ${chat.plan.place} at ${chat.plan.time}. Open plan and safety`} onPress={() => onPlan(chat.id)}>
            <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 20 }}>
              <LinearGradient colors={GRAD} style={{ width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="pin" size={18} color="#FFFFFF" />
              </LinearGradient>
              <View style={{ flex: 1 }}>
                <T style={{ fontFamily: F.semi }}>
                  {chat.plan.place} · {chat.plan.time}
                </T>
                <T v="small" c={C.muted}>
                  Your plan · tap to change it or for safety tools
                </T>
              </View>
              <Icon name="chev" size={16} color={C.muted} />
            </Card>
          </Pressable>
        ) : null}
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
                <>
                  <LinearGradient colors={['#D81B6A', '#9B2BA0']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.me}>
                    <T c="#FFFFFF">{m.text}</T>
                  </LinearGradient>
                  {m.failed ? (
                    <Pressable accessibilityRole="button" accessibilityLabel="Message not sent, tap to try again" onPress={() => onRetry?.(chat.id, m.id)} hitSlop={8} style={{ alignSelf: 'flex-end', marginTop: 3 }}>
                      <T v="small" c="#FF7A8A" style={{ fontSize: 11, fontFamily: F.semi }}>
                        Not sent · tap to retry
                      </T>
                    </Pressable>
                  ) : i === lastMine && chat.real ? (
                    <T v="small" c={lastMineSeen ? C.blueL : C.faint} style={{ alignSelf: 'flex-end', marginTop: 3, fontSize: 11 }}>
                      {lastMineSeen ? 'Seen' : String(m.id).startsWith('local-') ? 'Sending…' : 'Sent'}
                    </T>
                  ) : null}
                </>
              ) : hide(m, i) ? (
                <HiddenMessage text={m.text} />
              ) : (
                <View style={styles.them}>
                  <T>{m.text}</T>
                </View>
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
        {typing || theyType ? <Typing /> : null}
      </ScrollView>
      <View style={[styles.composer, { paddingBottom: insets.bottom + 10 }]}>
        {!chat.plan ? (
          <Pressable accessibilityRole="button" onPress={() => onPlan(chat.id)} style={styles.planPill}>
            <Icon name="pin" size={14} color={C.pinkL} />
            <T v="small" c={C.ink} style={{ fontFamily: F.semi }}>
              Make a plan
            </T>
          </Pressable>
        ) : null}
        <View style={styles.composerPill}>
          <TextInput
            value={text}
            onChangeText={onType}
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
  { icon: 'close', label: 'Cancel kindly', cancel: true, text: 'Hey, I can’t make it tonight after all. Sorry for the short notice, hope you have a good night.' },
];

// After you met: a private check-in about the other person. It powers their Trusted / Glowing / On fire frames;
// they only ever see their own totals, never who said what.
function YesNo({ value, onChange, label }) {
  return (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      {[
        [true, 'Yes'],
        [false, 'No'],
      ].map(([v, t]) => (
        <Pressable
          key={t}
          accessibilityRole="button"
          accessibilityLabel={`${label}: ${t}`}
          accessibilityState={{ selected: value === v }}
          onPress={() => {
            tap();
            onChange(v);
          }}
          style={[styles.planChip, { flex: 1 }, value === v && (v ? styles.yesOn : styles.noOn)]}
        >
          <T v="small" c={value === v ? '#FFFFFF' : C.ink} style={{ fontFamily: F.semi }}>
            {t}
          </T>
        </Pressable>
      ))}
    </View>
  );
}

function CheckinCard({ chat, name }) {
  const [done, setDone] = useState(null); // null loading, false not yet, object = my check-in
  const [open, setOpen] = useState(false);
  const [showedUp, setShowedUp] = useState(null);
  const [positive, setPositive] = useState(null);
  const [communicator, setCommunicator] = useState(false);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    let alive = true;
    api.myCheckin(chat.matchId).then((c) => alive && setDone(c || false));
    return () => {
      alive = false;
    };
  }, [chat.matchId]);
  if (done === null) return null;
  const ready = showedUp !== null && (showedUp === false || positive !== null) && !saving;
  const submit = async () => {
    setSaving(true);
    const ok = await api.submitCheckin(chat.matchId, chat.id, { showedUp, positive: showedUp ? positive : false, communicator: showedUp && communicator });
    setSaving(false);
    if (!ok) {
      Alert.alert('Couldn’t save your check-in', 'Check your connection and try again.');
      return;
    }
    success();
    setDone({ showed_up: showedUp });
    setOpen(false);
  };
  return (
    <Card style={{ marginTop: 16, gap: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Icon name="star" size={18} color="#FFD27A" />
        <T style={{ fontFamily: F.semi, flex: 1 }}>{done ? `You checked in about ${name}` : `Met ${name}? Check in`}</T>
        {!open ? (
          <Pressable accessibilityRole="button" onPress={() => setOpen(true)} hitSlop={8}>
            <T v="label" c={C.pinkL}>
              {done ? 'Change' : 'Start'}
            </T>
          </Pressable>
        ) : null}
      </View>
      {!open ? (
        <T v="small" c={C.muted} style={{ lineHeight: 17 }}>
          {done ? 'Thanks. It stays private and helps the community earn its frames.' : 'Private, takes 10 seconds. It helps good members earn their Trusted, Glowing and On fire frames.'}
        </T>
      ) : (
        <View style={{ gap: 10 }}>
          <T v="small" c={C.ink2}>
            Did {name} show up?
          </T>
          <YesNo value={showedUp} onChange={setShowedUp} label="Showed up" />
          {showedUp ? (
            <>
              <T v="small" c={C.ink2}>
                Did it feel safe and respectful?
              </T>
              <YesNo value={positive} onChange={setPositive} label="Safe and respectful" />
              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked: communicator }}
                onPress={() => {
                  tap();
                  setCommunicator((v) => !v);
                }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 }}
              >
                <View style={[styles.checkBox, communicator && styles.checkBoxOn]}>{communicator ? <Icon name="check" size={13} color="#FFFFFF" stroke={2.6} /> : null}</View>
                <T v="small" c={C.ink2} style={{ flex: 1 }}>
                  {name} was a great communicator
                </T>
              </Pressable>
            </>
          ) : null}
          <GradientButton title={saving ? 'Saving…' : 'Save check-in'} disabled={!ready} onPress={submit} />
          <T v="small" c={C.muted} style={{ textAlign: 'center' }}>
            Something felt unsafe? Use Report below. Ward reviews it.
          </T>
        </View>
      )}
    </Card>
  );
}

// The time wheel: every quarter from 17:00 to 03:00. Days: tonight, tomorrow and the next few weekdays.
const WHEEL_TIMES = Array.from({ length: 41 }, (_, i) => {
  const m = 17 * 60 + i * 15;
  return `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
});
const WHEEL_ROW = 40;
function planDays() {
  const now = new Date();
  return ['Tonight', 'Tomorrow', ...[2, 3, 4, 5].map((d) => new Date(now.getFullYear(), now.getMonth(), now.getDate() + d).toLocaleDateString('en-US', { weekday: 'long' }))];
}

function TimeWheel({ value, onChange }) {
  const scroll = useRef(null);
  const start = Math.max(0, WHEEL_TIMES.indexOf(value));
  const [index, setIndex] = useState(start);
  const settle = (y) => {
    const i = Math.min(WHEEL_TIMES.length - 1, Math.max(0, Math.round(y / WHEEL_ROW)));
    if (i !== index) tap();
    setIndex(i);
    onChange(WHEEL_TIMES[i]);
  };
  return (
    <View style={styles.wheel}>
      <View pointerEvents="none" style={styles.wheelBand} />
      <ScrollView
        ref={scroll}
        showsVerticalScrollIndicator={false}
        snapToInterval={WHEEL_ROW}
        decelerationRate="fast"
        contentOffset={{ x: 0, y: start * WHEEL_ROW }}
        contentContainerStyle={{ paddingVertical: WHEEL_ROW * 2 }}
        scrollEventThrottle={16}
        onScroll={(e) => setIndex(Math.min(WHEEL_TIMES.length - 1, Math.max(0, Math.round(e.nativeEvent.contentOffset.y / WHEEL_ROW))))}
        onMomentumScrollEnd={(e) => settle(e.nativeEvent.contentOffset.y)}
        onScrollEndDrag={(e) => {
          if (!e.nativeEvent.velocity || Math.abs(e.nativeEvent.velocity.y) < 0.05) settle(e.nativeEvent.contentOffset.y);
        }}
        accessibilityLabel={`Time, ${WHEEL_TIMES[index]}`}
      >
        {WHEEL_TIMES.map((t, i) => (
          <Pressable
            key={t}
            accessibilityRole="button"
            onPress={() => {
              scroll.current?.scrollTo({ y: i * WHEEL_ROW, animated: true });
              settle(i * WHEEL_ROW);
            }}
            style={{ height: WHEEL_ROW, alignItems: 'center', justifyContent: 'center' }}
          >
            <T style={{ fontFamily: i === index ? F.display : F.body, fontSize: i === index ? 24 : 18, opacity: Math.max(0.25, 1 - Math.abs(i - index) * 0.3) }}>{t}</T>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

export function Plan({ chat, onBack, onSend, onSavePlan, onCancelPlan, onFakeCall, onUnmatch, startEditing = false }) {
  const p = chatPerson(chat);
  // Making or changing the plan: a public place and a time. Saved for both of you and posted in the chat.
  const [editing, setEditing] = useState(startEditing || !chat.plan);
  const [place, setPlace] = useState(chat.plan?.place || '');
  // The plan's time is "21:30" for tonight, or "Friday 21:30" / "Tomorrow 21:30".
  const [days] = useState(planDays);
  const [day, setDay] = useState(() => {
    const d = days.findIndex((x) => (chat.plan?.time || '').startsWith(`${x} `));
    return d > 0 ? d : 0;
  });
  const [clock, setClock] = useState(() => (chat.plan?.time || '').match(/(\d{2}:\d{2})$/)?.[1] || '21:00');
  const time = day === 0 ? clock : `${days[day]} ${clock}`;
  const [saving, setSaving] = useState(false);
  const canSave = place.trim().length > 1 && time.trim().length > 0 && !saving;
  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    const ok = await onSavePlan?.(chat.id, place.trim(), time.trim());
    setSaving(false);
    if (!ok) {
      Alert.alert('Couldn’t save the plan', 'Check your connection and try again.');
      return;
    }
    success();
    setEditing(false);
  };
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
          {chat.plan && !editing ? (
            <Pressable accessibilityRole="button" onPress={() => setEditing(true)} style={{ marginTop: 10, alignSelf: 'flex-start' }} hitSlop={8}>
              <T v="label" c={C.pinkL}>
                Change plan
              </T>
            </Pressable>
          ) : null}
        </View>
        {editing ? (
          <View style={{ paddingHorizontal: 14, paddingBottom: 16, gap: 10 }}>
            <T v="label" c={C.muted}>
              Where
            </T>
            <TextInput
              value={place}
              onChangeText={setPlace}
              placeholder="A bar or café, e.g. Bar Mona"
              placeholderTextColor={C.faint}
              maxLength={60}
              autoCapitalize="words"
              style={styles.planInput}
              accessibilityLabel="Where you meet"
            />
            <T v="label" c={C.muted} style={{ marginTop: 4 }}>
              When
            </T>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {days.map((d, i) => (
                <Pressable
                  key={d}
                  accessibilityRole="button"
                  accessibilityState={{ selected: day === i }}
                  onPress={() => {
                    tap();
                    setDay(i);
                  }}
                  style={[styles.planChip, day === i && styles.planChipOn]}
                >
                  <T v="small" c={day === i ? C.bg : C.ink} style={{ fontFamily: F.semi }}>
                    {d}
                  </T>
                </Pressable>
              ))}
            </ScrollView>
            <TimeWheel value={clock} onChange={setClock} />
            <T v="small" c={C.muted} style={{ textAlign: 'center' }}>
              {day === 0 ? `Tonight at ${clock}` : `${days[day]} at ${clock}`}
            </T>
            <GradientButton title={saving ? 'Saving…' : chat.plan ? 'Update plan' : `Send plan to ${p.name}`} disabled={!canSave} onPress={save} style={{ marginTop: 4 }} />
            {chat.plan ? (
              <GhostButton title="Keep the current plan" onPress={() => setEditing(false)} border={false} color={C.muted} />
            ) : null}
          </View>
        ) : null}
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
              Alert.alert(q.label, `Send this to ${p.name}?${q.cancel && chat.plan ? ' Your plan is cancelled for both of you.' : ''}\n\n“${q.text}”`, [
                { text: 'Keep it', style: 'cancel' },
                {
                  text: q.cancel && chat.plan ? 'Send and cancel plan' : 'Send',
                  style: q.cancel && chat.plan ? 'destructive' : 'default',
                  onPress: async () => {
                    // Cancel kindly also calls off the plan, for both of you.
                    if (q.cancel) {
                      const ok = await onCancelPlan?.(chat.id, q.text);
                      if (!ok) {
                        Alert.alert('Couldn’t cancel', 'Check your connection and try again.');
                        return;
                      }
                    } else onSend(chat.id, { me: true, text: q.text });
                    success();
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
      {chat.real ? <CheckinCard chat={chat} name={p.name} /> : null}
      <T v="label" c={C.muted} style={{ marginTop: 26, marginBottom: 6 }}>
        Safety
      </T>
      <Card style={{ paddingVertical: 0 }}>
        <Row
          icon="shield"
          iconColor={C.blueL}
          iconBg={C.blueBg}
          title={`Report ${p.name}`}
          sub="Ward reviews it. You’re unmatched straight away."
          onPress={() =>
            Alert.alert(`Report ${p.name}?`, 'They won’t know it was you. The chat is removed for both of you.', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Report', style: 'destructive', onPress: () => onUnmatch?.(chat, true) },
            ])
          }
        />
        <Row
          icon="close"
          iconColor={C.red}
          iconBg="#2A1418"
          title="Unmatch"
          sub="Ends the match and the chat for both of you"
          onPress={() =>
            Alert.alert(`Unmatch ${p.name}?`, 'This can’t be undone.', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Unmatch', style: 'destructive', onPress: () => onUnmatch?.(chat, false) },
            ])
          }
          last
        />
      </Card>
    </Screen>
  );
}

/* ---------- Guides ---------- */

// One block of a guide article (see GUIDES in data.js).
function GuideBlock({ b }) {
  const para = { fontSize: 16, lineHeight: 25 };
  if (b.h) return <T style={{ fontFamily: F.display, fontSize: 21, lineHeight: 26, marginTop: 28 }}>{b.h}</T>;
  if (b.p)
    return (
      <T c={C.ink2} style={[para, { marginTop: 12 }]}>
        {b.p}
      </T>
    );
  if (b.quote)
    return (
      <View style={{ marginTop: 22, paddingLeft: 16, borderLeftWidth: 3, borderLeftColor: C.pink }}>
        <T style={{ fontFamily: F.display, fontSize: 20, lineHeight: 28 }}>“{b.quote}”</T>
      </View>
    );
  if (b.tip)
    return (
      <View style={{ marginTop: 16, flexDirection: 'row', gap: 10, padding: 14, borderRadius: 16, backgroundColor: 'rgba(240,40,122,0.10)', borderWidth: 1, borderColor: 'rgba(240,40,122,0.28)' }}>
        <Icon name="spark" size={18} color={C.pinkL} />
        <T c={C.ink} style={{ flex: 1, fontSize: 15, lineHeight: 22 }}>
          <T c={C.pinkL} style={{ fontFamily: F.bold }}>
            Tip:{' '}
          </T>
          {b.tip}
        </T>
      </View>
    );
  if (b.say)
    return (
      <View style={{ marginTop: 14, gap: 8 }}>
        <T v="small" c={C.muted} style={{ fontFamily: F.semi, letterSpacing: 1 }}>
          TRY SAYING
        </T>
        {b.say.map((line) => (
          <View key={line} style={{ alignSelf: 'flex-start', maxWidth: '88%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18, borderBottomLeftRadius: 6, backgroundColor: C.surf2, borderWidth: 1, borderColor: C.line2 }}>
            <T c={C.ink} style={{ fontSize: 15, lineHeight: 21 }}>
              {line}
            </T>
          </View>
        ))}
      </View>
    );
  if (b.list)
    return (
      <View style={{ marginTop: 12, gap: 8 }}>
        {b.list.map((item) => (
          <View key={item} style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: C.pink, marginTop: 10 }} />
            <T c={C.ink2} style={[para, { flex: 1 }]}>
              {item}
            </T>
          </View>
        ))}
      </View>
    );
  return null;
}

export function GuideView({ guide, onBack, profile, setProfile }) {
  // Saved on your (private) profile; a match only sees the guides you both saved.
  const saved = (profile?.wishlist || []).includes(guide.id);
  const toggleSaved = () => {
    if (saved) tap();
    else success();
    setProfile?.((p) => {
      const list = p.wishlist || [];
      return { ...p, wishlist: list.includes(guide.id) ? list.filter((id) => id !== guide.id) : [...list, guide.id] };
    });
  };
  return (
    <Screen scroll>
      <Header title="" onBack={onBack} />
      {guide.art ? (
        <View style={{ alignSelf: 'stretch', aspectRatio: 16 / 9, borderRadius: 20, overflow: 'hidden', marginBottom: 16 }}>
          <Image source={guide.art} accessibilityLabel={guide.artLabel} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
        </View>
      ) : null}
      <T v="small" c={C.pinkL} style={{ fontFamily: F.semi, letterSpacing: 1 }}>
        {guide.cat.toUpperCase()} · {guide.mins} MIN READ
      </T>
      <T v="title" style={{ marginTop: 6, fontSize: 30, lineHeight: 35 }}>
        {guide.title}
      </T>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 }}>
        <LinearGradient colors={GRAD} style={{ width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="spark" size={14} color="#FFFFFF" />
        </LinearGradient>
        <T v="meta" c={C.muted}>
          Tonight Guides · Reviewed by a sex educator
        </T>
      </View>
      {guide.lead ? (
        <T style={{ marginTop: 18, fontSize: 18, lineHeight: 27, fontFamily: F.semi }} c={C.ink}>
          {guide.lead}
        </T>
      ) : null}
      {(guide.blocks || []).map((b, i) => (
        <GuideBlock key={i} b={b} />
      ))}
      <View style={{ marginTop: 28, borderRadius: 18, padding: 16, backgroundColor: C.surf2, borderWidth: 1, borderColor: C.line2 }}>
        <T style={{ fontFamily: F.display, fontSize: 17 }}>In short</T>
        <View style={{ marginTop: 12, gap: 12 }}>
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
      </View>
      <Card tone="safe" style={{ marginTop: 20, flexDirection: 'row', gap: 10, alignItems: 'center' }}>
        <Icon name="shieldCheck" size={18} color={C.blueL} />
        <T v="small" c={C.safeInk}>
          Reviewed by a certified sex educator
        </T>
      </Card>
      <View style={{ height: 20 }} />
      <GradientButton
        title={saved ? 'On your wishlist · tap to remove' : 'Add to my wishlist'}
        onPress={toggleSaved}
      />
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

/* ---------- Badges ---------- */

// Profile frames (PRODUCT_UX §3e): earned, never bought. Each builds on the one before; the numbers come from
// private check-ins after a meet (my_badge_stats). Each frame has its own colour and weight: thin blue, emerald green,
// thick violet with a slow-turning glow, thick fire with an orange glow.
const FRAMES = [
  {
    id: 'verified',
    name: 'Verified',
    ring: ['#6FA8FF', '#6FA8FF'],
    look: { width: 2.5 },
    how: 'Pass the selfie check: your selfie is matched against your profile photos.',
    has: (p) => !!p.verified,
  },
  {
    id: 'trusted',
    name: 'Trusted',
    ring: ['#2BC48A', '#5FE3C0'],
    look: { width: 3.5 },
    how: 'Verified, plus 3 positive check-ins from people you met.',
    has: (p, s) => !!p.verified && s.positive >= 3,
    progress: (s) => `${Math.min(3, s.positive)} of 3 positive check-ins`,
  },
  {
    id: 'glowing',
    name: 'Glowing',
    ring: ['#D9A6FF', '#9B4DFF', '#6A2CE0', '#D9A6FF'],
    look: { width: 5, glow: '#9B4DFF', spin: true },
    how: 'Trusted, plus you showed up to your last 5 plans, and to at least 90% of all your plans.',
    has: (p, s) => FRAMES[1].has(p, s) && s.last5 >= 5 && s.last5_all && s.checkins > 0 && s.shows / s.checkins >= 0.9,
    progress: (s) => `Showed up ${s.shows} of ${s.checkins} · last ${Math.min(5, s.last5)} of 5 in a row${s.last5_all ? '' : ' (reset)'}`,
  },
  {
    id: 'fire',
    name: 'On fire',
    ring: ['#FFD27A', '#FF8A3D', '#F0287A', '#FFD27A'],
    look: { width: 6, glow: '#FF8A3D', spin: true },
    how: 'Glowing, plus 3 “great communicator” badges from matches and no reports in 90 days.',
    has: (p, s) => FRAMES[2].has(p, s) && s.communicator >= 3 && s.reports90 === 0,
    progress: (s) => `${Math.min(3, s.communicator)} of 3 “great communicator”${s.reports90 ? ' · a report in the last 90 days' : ''}`,
  },
];
const NO_STATS = { checkins: 0, positive: 0, shows: 0, last5: 0, last5_all: false, communicator: 0, reports90: 0 };

function RingPreview({ colors, uri, size = 56, dim, look = {} }) {
  const w = look.width || 2.5;
  const [turn] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (!look.spin || dim) return undefined;
    const loop = Animated.loop(Animated.timing(turn, { toValue: 1, duration: 6000, easing: Easing.linear, useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [turn, look.spin, dim]);
  const inner = size - w * 2;
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: dim ? 0.45 : 1,
        ...(look.glow && !dim ? { shadowColor: look.glow, shadowOpacity: 0.9, shadowRadius: size / 6, shadowOffset: { width: 0, height: 0 } } : null),
      }}
    >
      <Animated.View style={{ position: 'absolute', width: size, height: size, borderRadius: size / 2, overflow: 'hidden', transform: [{ rotate: turn.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] }}>
        <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1 }} />
      </Animated.View>
      <View style={{ width: inner, height: inner, borderRadius: inner / 2, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' }}>
        {uri ? <Image source={{ uri }} style={{ width: inner - 4, height: inner - 4, borderRadius: (inner - 4) / 2 }} /> : <Photo style={{ width: inner - 4, height: inner - 4, borderRadius: (inner - 4) / 2 }} />}
      </View>
    </View>
  );
}

function StatusPill({ kind, text }) {
  const look = {
    have: { text: 'You have this', fg: C.green, bg: 'rgba(43,196,138,0.14)' },
    live: { text: text || 'Live now', fg: C.green, bg: 'rgba(43,196,138,0.14)' },
    off: { text: 'Off right now · go live on Discover', fg: C.muted, bg: C.surf2 },
    notYet: { text: 'Not yet', fg: C.muted, bg: C.surf2 },
    progress: { text, fg: '#FFB36B', bg: 'rgba(255,138,61,0.12)' },
    team: { text: 'Given by our team', fg: C.blueL, bg: C.blueBg },
  }[kind];
  return (
    <View style={{ alignSelf: 'flex-start', marginTop: 8, paddingHorizontal: 10, height: 24, borderRadius: 12, justifyContent: 'center', backgroundColor: look.bg }}>
      <T v="small" c={look.fg} style={{ fontFamily: F.semi, fontSize: 11 }}>
        {look.text}
      </T>
    </View>
  );
}

export function Badges({ profile, onBack }) {
  const uri = profile.photos?.[0];
  const [stats, setStats] = useState(NO_STATS);
  useEffect(() => {
    let alive = true;
    api.myBadgeStats().then((s) => alive && s && setStats({ ...NO_STATS, ...s }));
    return () => {
      alive = false;
    };
  }, []);
  const earned = FRAMES.filter((f) => f.has(profile, stats));
  const top = earned[earned.length - 1];
  const [nowMs] = useState(() => Date.now());
  const live = !!profile.liveUntil && Date.parse(profile.liveUntil) > nowMs;
  return (
    <Screen scroll>
      <Header title="Your badges" onBack={onBack} />
      <Card style={{ alignItems: 'center', paddingVertical: 22, marginTop: 6 }}>
        <RingPreview colors={top ? top.ring : [C.line2, C.line2]} look={top?.look} uri={uri} size={96} />
        <T style={{ fontFamily: F.display, fontSize: 20, marginTop: 12 }}>{top ? `${top.name} frame` : 'No frame yet'}</T>
        <T v="meta" c={C.muted} style={{ textAlign: 'center', marginTop: 4, maxWidth: 280 }}>
          {top ? 'This frame shows around your photo everywhere in Tonight.' : 'Pass the selfie check to get your first frame.'}
        </T>
      </Card>

      <T v="label" c={C.muted} style={{ marginTop: 22, marginBottom: 4 }}>
        Profile frames
      </T>
      <T v="small" c={C.muted} style={{ marginBottom: 10 }}>
        Earned, never bought. Each one builds on the one before.
      </T>
      <View style={{ gap: 10 }}>
        {FRAMES.map((f) => {
          const has = f.has(profile, stats);
          return (
            <Card key={f.id} style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
              <RingPreview colors={f.ring} look={f.look} uri={uri} dim={!has} />
              <View style={{ flex: 1 }}>
                <T style={{ fontFamily: F.semi, fontSize: 16 }}>{f.name}</T>
                <T v="small" c={C.ink2} style={{ marginTop: 2, lineHeight: 17 }}>
                  {f.how}
                </T>
                <StatusPill kind={has ? 'have' : f.progress ? 'progress' : 'notYet'} text={!has && f.progress ? f.progress(stats) : undefined} />
              </View>
            </Card>
          );
        })}
      </View>

      <T v="label" c={C.muted} style={{ marginTop: 22, marginBottom: 10 }}>
        Other badges
      </T>
      <View style={{ gap: 10 }}>
        <Card style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
          <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(43,196,138,0.14)', alignItems: 'center', justifyContent: 'center' }}>
            <LiveDot size={10} />
          </View>
          <View style={{ flex: 1 }}>
            <T style={{ fontFamily: F.semi, fontSize: 16 }}>Here tonight</T>
            <T v="small" c={C.ink2} style={{ marginTop: 2, lineHeight: 17 }}>
              Tap “Go live tonight” on Discover. For 6 hours you show first, with a green badge, to people looking for tonight.
            </T>
            {/* A status you switch on yourself, not something to earn */}
            <StatusPill
              kind={live ? 'live' : 'off'}
              text={live ? `Live until ${new Date(profile.liveUntil).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : undefined}
            />
          </View>
        </Card>
        <Card style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
          <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: C.blueBg, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="shieldCheck" size={24} color={C.blueL} />
          </View>
          <View style={{ flex: 1 }}>
            <T style={{ fontFamily: F.semi, fontSize: 16 }}>Sex educator</T>
            <T v="small" c={C.ink2} style={{ marginTop: 2, lineHeight: 17 }}>
              Shown on Lounge replies from certified educators who answer questions and review our guides.
            </T>
            <StatusPill kind="team" />
          </View>
        </Card>
      </View>
      <View style={{ height: 24 }} />
    </Screen>
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
            {profile.verified ? (
              <T v="meta" c={C.blueL}>
                Verified
              </T>
            ) : (
              'Not verified yet'
            )}
          </T>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Settings"
          onPress={() => go('settings')}
          style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: C.surf2, alignItems: 'center', justifyContent: 'center' }}
        >
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
        <Row icon="star" iconColor="#FFD27A" iconBg="rgba(255,210,122,0.12)" title="Your badges" sub={profile.verified ? 'Verified frame · see what’s next' : 'What each badge means'} onPress={() => go('badges')} />
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
          Someone made you feel unsafe?{' '}
          <T v="small" c="#FFC9CE" style={{ fontFamily: F.bold }}>
            Tell Ward. It jumps the queue.
          </T>
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
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Write a message…"
            placeholderTextColor={C.faint}
            style={styles.composerInput}
            onSubmitEditing={send}
            returnKeyType="send"
            accessibilityLabel="Message support"
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
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="Suggest an idea…"
          placeholderTextColor={C.faint}
          style={{ flex: 1, color: C.ink, fontFamily: F.body, fontSize: 15 }}
          accessibilityLabel="Suggest an idea"
        />
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
      {!list.length ? (
        <Card style={{ marginTop: 14, alignItems: 'center', gap: 6, paddingVertical: 26 }}>
          <Icon name="bulb" size={26} color={C.pinkL} />
          <T style={{ fontFamily: F.semi }}>{sort === 'mine' ? 'You haven’t suggested anything yet' : 'No ideas yet'}</T>
          <T v="small" c={C.muted} style={{ textAlign: 'center' }}>
            Be the first: type an idea above. Members vote, and the most wanted ones get built.
          </T>
        </Card>
      ) : null}
      {list.map((i) => (
        <View key={i.id} style={styles.idea}>
          <View style={{ alignItems: 'center', width: 44 }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Upvote"
              accessibilityState={{ selected: i.mine === 1 }}
              onPress={() => vote(i.id, 1)}
              style={[styles.vote, i.mine === 1 && { borderColor: C.pink, backgroundColor: C.pinkBg }]}
            >
              <Icon name="up" size={18} color={i.mine === 1 ? C.pinkL : C.muted} stroke={2.4} />
            </Pressable>
            <T style={{ fontFamily: F.displayX, fontSize: 17, marginVertical: 4 }} c={i.score > 0 ? C.ink : C.muted}>
              {i.score > 0 ? `+${i.score}` : i.score}
            </T>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Downvote"
              accessibilityState={{ selected: i.mine === -1 }}
              onPress={() => vote(i.id, -1)}
              style={[styles.vote, i.mine === -1 && { borderColor: C.blue, backgroundColor: C.blueBg }]}
            >
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
                  <T v="small" style={{ fontFamily: F.semi }}>
                    Tonight team:{' '}
                  </T>
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
  complete: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 16, padding: 14, borderRadius: 22, backgroundColor: '#151217', borderWidth: 1, borderColor: C.line },
  nextStep: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', marginTop: 8, height: 26, paddingHorizontal: 10, borderRadius: 13, backgroundColor: C.pinkBg },
  pctBadge: {
    position: 'absolute',
    bottom: -6,
    alignSelf: 'center',
    minWidth: 40,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 6,
    backgroundColor: C.pink,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: C.bg,
  },
  topbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 48, paddingHorizontal: 8 },
  filterBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: C.surf2, borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center' },
  filterBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: C.pink,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: C.bg,
  },
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
  matchGlow: { position: 'absolute', left: -120, top: 40, width: 630, height: 520, borderRadius: 315, backgroundColor: 'rgba(240,40,122,0.22)', transform: [{ scaleY: 0.82 }] },
  matchCard: { position: 'absolute', top: 14, width: 150, height: 214, borderRadius: 26, overflow: 'hidden', borderWidth: 2, shadowColor: '#000', shadowOpacity: 0.6, shadowRadius: 24, shadowOffset: { width: 0, height: 18 } },
  matchEmber: { position: 'absolute', left: '50%', top: 82, width: 84, height: 84, marginLeft: -42, borderRadius: 42, backgroundColor: 'rgba(255,120,60,0.55)', shadowColor: '#FF6A3D', shadowOpacity: 1, shadowRadius: 26 },
  matchSeal: { position: 'absolute', left: '50%', top: 96, width: 56, height: 56, marginLeft: -28, borderRadius: 28, backgroundColor: '#0E0C10', borderWidth: 2, borderColor: '#FF8C3C', alignItems: 'center', justifyContent: 'center' },
  matchChip: { height: 28, paddingHorizontal: 12, borderRadius: 14, justifyContent: 'center', backgroundColor: 'rgba(240,40,122,0.16)', borderWidth: 1, borderColor: 'rgba(240,40,122,0.45)' },
  matchOpener: { height: 40, paddingHorizontal: 14, borderRadius: 20, justifyContent: 'center', backgroundColor: '#17131A', borderWidth: 1, borderColor: '#3A3439' },
  planCard: { marginTop: 18, flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 24, borderWidth: 1, borderColor: '#4A1A33' },
  turnDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.pink },
  chatRow: { flexDirection: 'row', alignItems: 'center', gap: 14, height: 76, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  bothSaved: { alignSelf: 'stretch', marginTop: 6, marginBottom: 4, padding: 14, borderRadius: 18, backgroundColor: 'rgba(240,40,122,0.08)', borderWidth: 1, borderColor: 'rgba(240,40,122,0.25)' },
  chatHead: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 8, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: C.line },
  me: { paddingVertical: 11, paddingHorizontal: 15, borderRadius: 22, borderBottomRightRadius: 6 },
  them: { paddingVertical: 11, paddingHorizontal: 15, borderRadius: 22, borderBottomLeftRadius: 6, backgroundColor: '#1F1A21', alignSelf: 'flex-start' },
  photoMsg: { width: 180, height: 140, borderRadius: 22, borderBottomLeftRadius: 6, overflow: 'hidden' },
  composer: { paddingHorizontal: 14, paddingTop: 10 },
  composerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 52,
    paddingLeft: 16,
    paddingRight: 6,
    borderRadius: 26,
    backgroundColor: C.surf3,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  composerInput: { flex: 1, color: C.ink, fontFamily: F.body, fontSize: 15 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  planInput: { height: 50, borderRadius: 14, borderWidth: 1.5, borderColor: C.line2, backgroundColor: C.surf3, paddingHorizontal: 14, color: C.ink, fontFamily: F.body, fontSize: 15 },
  planChip: { height: 36, paddingHorizontal: 14, borderRadius: 18, borderWidth: 1.5, borderColor: C.line2, alignItems: 'center', justifyContent: 'center' },
  planChipOn: { backgroundColor: C.ink, borderColor: C.ink },
  yesOn: { backgroundColor: '#1E8F66', borderColor: '#1E8F66' },
  noOn: { backgroundColor: '#B23A48', borderColor: '#B23A48' },
  checkBox: { width: 22, height: 22, borderRadius: 7, borderWidth: 1.5, borderColor: C.line2, alignItems: 'center', justifyContent: 'center' },
  checkBoxOn: { backgroundColor: C.pink, borderColor: C.pink },
  wheel: { height: WHEEL_ROW * 5, borderRadius: 16, backgroundColor: C.surf3, overflow: 'hidden' },
  wheelBand: { position: 'absolute', left: 12, right: 12, top: WHEEL_ROW * 2, height: WHEEL_ROW, borderRadius: 12, backgroundColor: 'rgba(240,40,122,0.14)', borderWidth: 1, borderColor: 'rgba(240,40,122,0.4)' },
  planPill: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, height: 34, paddingHorizontal: 14, borderRadius: 17, backgroundColor: 'rgba(240,40,122,0.14)', borderWidth: 1, borderColor: 'rgba(240,40,122,0.4)', marginBottom: 8 },
  quick: { flex: 1, height: 64, borderRadius: 16, borderWidth: 1.5, borderColor: C.line2, backgroundColor: C.surf3, alignItems: 'center', justifyContent: 'center', gap: 5 },
  report: { flexDirection: 'row', gap: 10, alignItems: 'center', backgroundColor: '#2A1A1E', borderRadius: 14, padding: 12, margin: 16, marginBottom: 0 },
  ideaInput: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 52,
    paddingLeft: 16,
    paddingRight: 6,
    borderRadius: 26,
    backgroundColor: C.surf3,
    borderWidth: 1.5,
    borderColor: C.line2,
    marginTop: 14,
  },
  idea: { flexDirection: 'row', gap: 12, padding: 14, backgroundColor: C.surf3, borderRadius: 18, borderWidth: 1, borderColor: C.line, marginTop: 10 },
  vote: { width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, borderColor: C.line2, alignItems: 'center', justifyContent: 'center' },
});
