// What you're after, your boundaries and your turn-ons: shared by onboarding and Edit profile.
import { Pressable, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { C, F, GRAD } from '../theme';
import { Icon } from '../icons';
import { BOUNDARIES, KIND_INTENTS, MAX_TURN_ONS, TURN_ON_GROUPS, WHEN_INTENTS } from '../data';
import { Chip, T, tap } from '../ui';

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

// One part of the Yes / Maybe / No switch; the chosen part fills in its colour.
function Answer({ a, on, onPress, label }) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ selected: on }}
      onPress={onPress}
      style={[styles.ans, on && { backgroundColor: a.bg, borderColor: a.border }]}
    >
      {on && a.icon ? <Icon name={a.icon} size={13} color={a.ink} stroke={2.6} /> : null}
      <T c={on ? a.ink : C.muted} style={{ fontFamily: on ? F.semi : F.medium, fontSize: 14 }}>
        {a.v}
      </T>
    </Pressable>
  );
}

// "What are you after?": what each kind means, shown under it on its tile.
const INTENT_INFO = {
  'One night': { icon: 'flame', sub: 'Fun, no strings' },
  'Regular FWB': { icon: 'heart', sub: 'Someone to see again' },
  Threesomes: { icon: 'couple', sub: 'Make it three' },
  'Group & orgies': { icon: 'group', sub: 'The more the merrier' },
  'Kink & play': { icon: 'link', sub: 'Explore together' },
  'Open to more': { icon: 'spark', sub: 'See where it goes' },
};

function IntentTile({ label, on, onPress }) {
  const info = INTENT_INFO[label] || { icon: 'check', sub: '' };
  const inner = (
    <View style={[styles.tile, styles.intentTile, on && styles.tileOn]}>
      <Icon name={info.icon} size={22} color={on ? C.pinkL : C.muted} />
      <View>
        <T c={on ? C.ink : C.ink2} style={{ fontFamily: F.semi, fontSize: 15 }}>
          {label}
        </T>
        <T v="small" c={on ? C.ink2 : C.faint} style={{ marginTop: 2 }}>
          {info.sub}
        </T>
      </View>
      {on ? (
        <View style={styles.tileTick}>
          <Icon name="check" size={11} color="#FFFFFF" stroke={3.4} />
        </View>
      ) : null}
    </View>
  );
  return (
    <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: on }} accessibilityLabel={`${label}: ${info.sub}`} onPress={onPress} style={styles.tileCell}>
      {on ? (
        <LinearGradient colors={GRAD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.tileRing}>
          {inner}
        </LinearGradient>
      ) : (
        <View style={styles.tileRing}>{inner}</View>
      )}
    </Pressable>
  );
}

const togList = (arr, set, v, max) => set(arr.includes(v) ? arr.filter((x) => x !== v) : max && arr.length >= max ? arr : [...arr, v]);

// "What are you after?": when, then what kind. Shared by onboarding and Edit profile.
export function IntentPicker({ intents, setIntents, first }) {
  return (
    <>
      <View style={[styles.capsRow, first && { marginTop: 14 }]}>
        <T v="small" c={C.faint} style={[styles.capsLabel, { marginTop: 0 }]}>
          WHEN
        </T>
        <T v="small" c={C.faint}>
          Pick one or more
        </T>
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {WHEN_INTENTS.map((w) => {
          const on = intents.includes(w);
          return (
            <Pressable
              key={w}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              accessibilityLabel={`When: ${w}`}
              onPress={() => {
                tap();
                togList(intents, setIntents, w);
              }}
              style={[styles.seg, { width: undefined, flex: 1 }, on && styles.segOnPink]}
            >
              {on ? <Icon name="check" size={13} color={C.pinkL} stroke={3.2} /> : null}
              <T numberOfLines={1} c={on ? C.ink : C.ink2} style={{ fontFamily: on ? F.semi : F.medium, fontSize: 14 }}>
                {w}
              </T>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.capsRow}>
        <T v="small" c={C.faint} style={[styles.capsLabel, { marginTop: 0 }]}>
          WHAT YOU’RE INTO
        </T>
        <T v="small" c={C.faint}>
          Pick any
        </T>
      </View>
      <View style={styles.tileGrid}>
        {KIND_INTENTS.map((i) => (
          <IntentTile
            key={i}
            label={i}
            on={intents.includes(i)}
            onPress={() => {
              tap();
              togList(intents, setIntents, i);
            }}
          />
        ))}
      </View>
    </>
  );
}

// Yes / Maybe / No for each boundary. No's are never shown to others.
export function BoundaryPicker({ answers, setAnswers }) {
  return (
    <>
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
    </>
  );
}

// Turn-on chips in groups, up to MAX_TURN_ONS.
export function TurnOnPicker({ turnOns, setTurnOns }) {
  return TURN_ON_GROUPS.map((g) => (
    <View key={g.title} style={{ marginTop: 14 }}>
      <T v="label" c={C.faint} style={{ marginBottom: 8 }}>
        {g.title}
      </T>
      <View style={styles.wrap}>
        {g.items.map((t) => (
          <Chip key={t} small label={t} on={turnOns.includes(t)} onPress={() => togList(turnOns, setTurnOns, t, MAX_TURN_ONS)} />
        ))}
      </View>
    </View>
  ));
}

const styles = StyleSheet.create({
  capsLabel: { fontFamily: F.semi, fontSize: 12, letterSpacing: 1.1, marginTop: 28, marginBottom: 10 },
  capsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 26, marginBottom: 10 },
  tileGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tileCell: { width: '48%', flexGrow: 1 },
  tileRing: { borderRadius: 19, padding: 1.5 },
  tile: { height: 96, borderRadius: 18, backgroundColor: C.surf, borderWidth: 1, borderColor: C.line, padding: 14, justifyContent: 'space-between' },
  tileOn: { backgroundColor: C.pinkBg, borderColor: 'transparent' },
  tileTick: { position: 'absolute', right: 12, top: 12, width: 20, height: 20, borderRadius: 10, backgroundColor: C.pink, alignItems: 'center', justifyContent: 'center' },
  seg: { width: '48%', flexGrow: 1, height: 48, borderRadius: 14, borderWidth: 1, borderColor: C.line, backgroundColor: C.surf, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingHorizontal: 4 },
  segOnPink: { backgroundColor: C.pinkBg, borderColor: C.pink },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  noteSafe: { flexDirection: 'row', gap: 10, alignItems: 'center', marginTop: 8, padding: 12, backgroundColor: '#141A2B', borderRadius: 14 },
  bCard: { backgroundColor: C.surf, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 12, gap: 10, borderWidth: 1, borderColor: C.line },
  bIcon: { width: 30, height: 30, borderRadius: 10, backgroundColor: C.surf2, alignItems: 'center', justifyContent: 'center' },
  ansRow: { flexDirection: 'row', height: 40, borderRadius: 12, borderWidth: 1, borderColor: C.line2, backgroundColor: C.bg, overflow: 'hidden', padding: 3, gap: 3 },
  ans: { flex: 1, borderRadius: 9, borderWidth: 1, borderColor: 'transparent', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  intentTile: { height: 100 },
});
