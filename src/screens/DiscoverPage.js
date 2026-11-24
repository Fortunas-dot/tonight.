// Discover as a profile page you scroll: big photos with the person's own words in between
// (about, ideal night, shared boundaries, turn-ons), a sticky top bar with filters, and Pass / Like always in reach.
import { useRef, useState } from 'react';
import { Alert, Animated, Easing, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, F, GRAD } from '../theme';
import { Icon, Verified } from '../icons';
import { GradientButton, LiquidBg, Photo, T, success, tap, thud } from '../ui';
import { FilterSheet, activeCount, applyFilters, filterChips } from './DiscoverFilters';

function Label({ children, color = C.pinkL }) {
  return (
    <T c={color} style={{ fontFamily: F.bold, fontSize: 11, letterSpacing: 0.8 }}>
      {children}
    </T>
  );
}

function BigPhoto({ person, index, blurAll, width, children }) {
  const uri = person.photos?.[index] || (index === 0 ? person.photo : null);
  return (
    <Photo seed={(person.seed || 0) + index} uri={uri} blur={person.blurred || blurAll} label={uri ? null : 'PHOTO'} style={{ width, height: Math.round(width * 1.22), borderRadius: 28 }}>
      {children}
    </Photo>
  );
}

function Fact({ icon, text, tone }) {
  const pink = tone === 'pink';
  return (
    <View style={[styles.fact, pink && { backgroundColor: C.pinkBg, borderColor: '#4A1A33' }]}>
      <Icon name={icon} size={14} color={pink ? C.pinkL : C.ink2} />
      <T v="small" c={pink ? '#FFD7E8' : C.ink2} style={{ fontFamily: F.medium }}>
        {text}
      </T>
    </View>
  );
}

/** One person's page. Photos and their own words are woven together, using only what they filled in. */
function PersonPage({ person, me, blurAll, onReport, onBlock }) {
  const { width } = useWindowDimensions();
  const w = width - 32;
  const half = Math.floor((w - 10) / 2);
  const mineTurnOns = me?.turnOns || [];
  const both = person.both || [];

  // The text sections they filled in, in a natural reading order.
  const sections = [];
  if (person.bio)
    sections.push(
      <View key="about" style={styles.card}>
        <Label>ABOUT ME</Label>
        <T style={{ fontSize: 16, lineHeight: 24, marginTop: 8 }}>{person.bio}</T>
      </View>,
    );
  if (person.prompt)
    sections.push(
      <LinearGradient key="prompt" colors={['#2A1020', '#1A1230']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.card, { borderColor: '#4A1A33' }]}>
        <Label>MY IDEAL NIGHT</Label>
        <T style={{ fontFamily: F.display, fontSize: 23, lineHeight: 30, marginTop: 8 }}>“{person.prompt}”</T>
      </LinearGradient>,
    );
  if (both.length || person.maybe)
    sections.push(
      <View key="both" style={[styles.card, { backgroundColor: '#111A16', borderColor: '#1E3A2E' }]}>
        <Label color={C.green}>YOU BOTH SAY YES TO</Label>
        <View style={{ gap: 10, marginTop: 10 }}>
          {both.map((b) => (
            <View key={b} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={styles.yes}>
                <Icon name="check" size={12} color="#E7FFF3" stroke={3} />
              </View>
              <T style={{ fontSize: 15 }}>{b}</T>
            </View>
          ))}
          {person.maybe ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={[styles.yes, { backgroundColor: '#4A3C17' }]}>
                <T c="#FFF3D1" style={{ fontFamily: F.bold, fontSize: 12, lineHeight: 14 }}>
                  ?
                </T>
              </View>
              <T c={C.ink2} style={{ fontSize: 15 }}>
                Maybe: {person.maybe}
              </T>
            </View>
          ) : null}
        </View>
      </View>,
    );
  if (person.turnOns?.length)
    sections.push(
      <View key="turnons" style={styles.card}>
        <Label>WHAT TURNS ME ON</Label>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
          {person.turnOns.map((t) => {
            const shared = mineTurnOns.includes(t);
            return (
              <View key={t} style={[styles.turnOn, shared && { backgroundColor: C.pinkBg, borderColor: C.pink }]}>
                {shared ? <Icon name="spark" size={12} color={C.pinkL} /> : null}
                <T v="small" c={shared ? '#FFD7E8' : C.ink2} style={{ fontFamily: shared ? F.semi : F.medium }}>
                  {t}
                </T>
              </View>
            );
          })}
        </View>
        {person.turnOns.some((t) => mineTurnOns.includes(t)) ? (
          <T v="small" c={C.muted} style={{ marginTop: 8 }}>
            Pink ones you share.
          </T>
        ) : null}
      </View>,
    );

  // The other photos (index into person.photos). Example profiles get one placeholder so the rhythm still shows.
  const realCount = (person.photos || []).length;
  const photos = realCount > 1 ? Array.from({ length: realCount - 1 }, (_, i) => i + 1) : !person.real ? [1] : [];

  // Weave: text, photo, text, photo... Then leftover photos in pairs side by side; leftover text just follows.
  const blocks = [];
  let s = 0;
  let p = 0;
  while (s < sections.length || p < photos.length) {
    if (s < sections.length) blocks.push(sections[s++]);
    if (p < photos.length) {
      // Once the text has run out, show the remaining photos two by two.
      if (s >= sections.length && photos.length - p >= 2) {
        const a = photos[p++];
        const b = photos[p++];
        blocks.push(
          <View key={`pair${a}`} style={{ flexDirection: 'row', gap: 10 }}>
            <Photo seed={(person.seed || 0) + a} uri={person.photos?.[a]} blur={person.blurred || blurAll} style={{ width: half, height: Math.round(half * 1.3), borderRadius: 22 }} />
            <Photo seed={(person.seed || 0) + b} uri={person.photos?.[b]} blur={person.blurred || blurAll} style={{ width: half, height: Math.round(half * 1.3), borderRadius: 22 }} />
          </View>,
        );
      } else {
        const a = photos[p++];
        blocks.push(<BigPhoto key={`ph${a}`} person={person} index={a} blurAll={blurAll} width={w} />);
      }
    }
  }

  return (
    <View style={{ gap: 12 }}>
      {/* hero */}
      <BigPhoto person={person} index={0} blurAll={blurAll} width={w}>
        {!person.real ? (
          <View style={styles.exampleTag}>
            <T v="small" c={C.ink2} style={{ fontFamily: F.semi, fontSize: 11 }}>
              Example profile
            </T>
          </View>
        ) : null}
        {realCount > 1 ? (
          <View style={styles.countTag}>
            <Icon name="image" size={12} color={C.ink2} />
            <T v="small" c={C.ink2} style={{ fontFamily: F.semi, fontSize: 11 }}>
              {realCount}
            </T>
          </View>
        ) : null}
        <LinearGradient colors={['rgba(14,12,16,0)', 'rgba(14,12,16,0.92)']} style={styles.heroShade}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <T style={{ fontFamily: F.displayX, fontSize: 34, letterSpacing: -1 }}>
              {person.name}
              {person.age ? `, ${person.age}` : ''}
            </T>
            {person.verified !== false ? <Verified size={22} /> : null}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
            <Icon name="pin" size={14} color={C.ink2} />
            <T v="meta" c={C.ink2}>
              {person.dist}
            </T>
            {person.hereTonight || !person.real ? (
              <View style={styles.live}>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: C.green }} />
                <T v="small" c={C.green} style={{ fontFamily: F.semi }}>
                  {person.until ? `Here tonight · until ${person.until}` : 'Here tonight'}
                </T>
              </View>
            ) : null}
          </View>
        </LinearGradient>
      </BigPhoto>

      {/* quick facts */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        <Fact icon="flame" tone="pink" text={`${person.fit || 0} of 7 boundaries fit`} />
        {(person.intents || []).slice(0, 2).map((i) => (
          <Fact key={i} icon="clock" text={i} />
        ))}
        {person.country ? <Fact icon="globe" text={person.country} /> : null}
      </View>

      {blocks}

      {!sections.length && !photos.length ? (
        <T v="meta" c={C.muted} style={{ textAlign: 'center', marginTop: 6 }}>
          {person.name} hasn’t added more yet. Say hi and ask.
        </T>
      ) : null}

      <Pressable
        accessibilityRole="button"
        onPress={() =>
          Alert.alert(`Report or block ${person.name}`, 'Ward reviews every report.', [
            { text: 'Report', onPress: () => (success(), onReport?.(person)) },
            { text: 'Block', style: 'destructive', onPress: () => onBlock?.(person) },
            { text: 'Cancel', style: 'cancel' },
          ])
        }
        style={{ alignSelf: 'center', paddingVertical: 14 }}
      >
        <T v="small" c={C.muted} style={{ fontFamily: F.semi }}>
          Report or block {person.name}
        </T>
      </Pressable>
    </View>
  );
}

export function DiscoverPage({ deck: all, profile, filters, onFilters, onLike, onReport, onBlock }) {
  const insets = useSafeAreaInsets();
  const [i, setI] = useState(0);
  const [sheet, setSheet] = useState(false);
  const [fade] = useState(() => new Animated.Value(1));
  const scroll = useRef(null);
  const blurAll = !!profile?.settings?.blurAll;
  const deck = applyFilters(all, filters, profile);
  const person = deck.length ? deck[i % deck.length] : null;
  const count = activeCount(filters);

  const next = (liked) => {
    if (!person) return;
    if (liked) thud();
    else tap();
    Animated.timing(fade, { toValue: 0, duration: 180, easing: Easing.in(Easing.quad), useNativeDriver: true }).start(() => {
      if (liked) onLike(person);
      setI((x) => x + 1);
      scroll.current?.scrollTo({ y: 0, animated: false });
      Animated.timing(fade, { toValue: 1, duration: 260, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
    });
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <LiquidBg />
      {/* sticky top bar */}
      <View style={[styles.top, { paddingTop: insets.top + 4 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', height: 48, paddingHorizontal: 16 }}>
          <T style={{ flex: 1, fontFamily: F.displayX, fontSize: 24, letterSpacing: -0.5 }}>
            tonight<T c={C.pink} style={{ fontFamily: F.displayX, fontSize: 24 }}>.</T>
          </T>
          <Pressable accessibilityRole="button" accessibilityLabel={count ? `Filters, ${count} on` : 'Filters'} onPress={() => setSheet(true)} style={styles.filterBtn}>
            <Icon name="filter" size={20} />
            {count ? (
              <View style={styles.badge}>
                <T c="#FFFFFF" style={{ fontFamily: F.bold, fontSize: 10, lineHeight: 12 }}>
                  {count}
                </T>
              </View>
            ) : null}
          </Pressable>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingHorizontal: 16, paddingBottom: 10 }}>
          {filterChips(filters, profile?.show).map((c) => (
            <Pressable key={c.id} accessibilityRole="button" onPress={() => setSheet(true)} style={[styles.chip, c.on && styles.chipOn]}>
              <T v="small" c={c.on ? C.ink : C.muted} style={{ fontFamily: c.on ? F.semi : F.medium }} numberOfLines={1}>
                {c.label}
              </T>
              <Icon name="down" size={12} color={c.on ? C.ink : C.muted} stroke={2.2} />
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {person ? (
        <Animated.View style={{ flex: 1, opacity: fade, transform: [{ translateY: fade.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }] }}>
          <ScrollView ref={scroll} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
            <PersonPage key={person.id} person={person} me={profile} blurAll={blurAll} onReport={onReport} onBlock={onBlock} />
          </ScrollView>
        </Animated.View>
      ) : (
        <View style={styles.empty}>
          <Icon name="filter" size={30} color={C.muted} />
          <T style={{ fontFamily: F.display, fontSize: 20, marginTop: 10, textAlign: 'center' }}>No one matches your filters</T>
          <T v="meta" c={C.muted} style={{ textAlign: 'center', marginTop: 4 }}>
            Try a wider age range or a bigger area.
          </T>
          <GradientButton title="Adjust filters" onPress={() => setSheet(true)} style={{ marginTop: 18, alignSelf: 'stretch' }} />
        </View>
      )}

      {/* Pass / Like, always in reach */}
      {person ? (
        <LinearGradient colors={['rgba(14,12,16,0)', 'rgba(14,12,16,0.96)']} locations={[0, 0.45]} style={styles.actions} pointerEvents="box-none">
          <Pressable accessibilityRole="button" accessibilityLabel={`Pass on ${person.name}`} onPress={() => next(false)} style={styles.pass}>
            <Icon name="close" size={24} stroke={2.4} />
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={`Like ${person.name}`} onPress={() => next(true)} style={{ flex: 1 }}>
            <LinearGradient colors={GRAD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.like}>
              <Icon name="heart" size={20} color="#FFFFFF" fill="#FFFFFF" />
              <T c="#FFFFFF" style={{ fontFamily: F.semi, fontSize: 16 }}>
                Like {person.name}
              </T>
            </LinearGradient>
          </Pressable>
        </LinearGradient>
      ) : null}

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
    </View>
  );
}

const styles = StyleSheet.create({
  top: { backgroundColor: 'rgba(14,12,16,0.92)', borderBottomWidth: 1, borderBottomColor: C.line, zIndex: 5 },
  filterBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: C.surf2, borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', top: -2, right: -2, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: C.pink, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, borderWidth: 2, borderColor: C.bg },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 32, paddingHorizontal: 12, borderRadius: 16, borderWidth: 1, borderColor: '#2E2830', backgroundColor: 'rgba(255,255,255,0.03)' },
  chipOn: { borderColor: C.pink, backgroundColor: C.pinkBg },
  heroShade: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 18, paddingTop: 90 },
  exampleTag: { position: 'absolute', top: 14, left: 14, height: 24, paddingHorizontal: 9, borderRadius: 12, backgroundColor: 'rgba(14,12,16,0.7)', justifyContent: 'center' },
  countTag: { position: 'absolute', top: 14, right: 14, flexDirection: 'row', alignItems: 'center', gap: 4, height: 24, paddingHorizontal: 9, borderRadius: 12, backgroundColor: 'rgba(14,12,16,0.7)' },
  live: { flexDirection: 'row', alignItems: 'center', gap: 5, height: 24, paddingHorizontal: 9, borderRadius: 12, backgroundColor: 'rgba(17,35,27,0.85)', marginLeft: 4 },
  fact: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 32, paddingHorizontal: 11, borderRadius: 16, backgroundColor: C.surf2, borderWidth: 1, borderColor: C.line },
  card: { padding: 18, borderRadius: 24, backgroundColor: '#151217', borderWidth: 1, borderColor: C.line },
  yes: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#1E4D3A', alignItems: 'center', justifyContent: 'center' },
  turnOn: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 32, paddingHorizontal: 12, borderRadius: 16, borderWidth: 1, borderColor: '#3A3439' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30 },
  actions: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 30, paddingBottom: 14 },
  pass: { width: 56, height: 56, borderRadius: 28, backgroundColor: C.surf2, borderWidth: 1.5, borderColor: '#3A3439', alignItems: 'center', justifyContent: 'center' },
  like: { height: 56, borderRadius: 28, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
});
