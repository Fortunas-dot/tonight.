// Discover filters, like other dating apps: age range, where, verified only, what they're after.
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState } from 'react';
import { C, F, GRAD } from '../theme';
import { Icon } from '../icons';
import { INTENTS } from '../data';
import { GradientButton, T, Toggle, tap } from '../ui';

export const DEFAULT_FILTERS = { ageMin: 18, ageMax: 60, where: 'anywhere', verifiedOnly: false, intents: [] };
const SHOW = ['Women', 'Men', 'Non-binary', 'Couples'];
const WHERE = [
  { id: 'anywhere', label: 'Anywhere' },
  { id: 'country', label: 'My country' },
  { id: 'city', label: 'My city' },
];

/** How many filters differ from the defaults (for the badge). */
export function activeCount(f) {
  let n = 0;
  if (f.ageMin !== DEFAULT_FILTERS.ageMin || f.ageMax !== DEFAULT_FILTERS.ageMax) n++;
  if (f.where !== 'anywhere') n++;
  if (f.verifiedOnly) n++;
  if (f.intents.length) n++;
  return n;
}

const same = (a, b) => !!a && !!b && a.trim().toLowerCase() === b.trim().toLowerCase();

/** Applies the filters. Example people (real: false) skip the location filter, since they have no real place. */
export function applyFilters(deck, f, me) {
  return deck.filter((p) => {
    const age = Number(p.age);
    if (age && (age < f.ageMin || age > f.ageMax)) return false;
    if (f.verifiedOnly && p.real && !p.verified) return false;
    if (p.real && f.where === 'city' && !same(p.dist, me?.city)) return false;
    if (p.real && f.where === 'country' && !same(p.country, me?.country)) return false;
    if (f.intents.length && p.intents?.length && !p.intents.some((i) => f.intents.includes(i))) return false;
    return true;
  });
}

/** Short labels for the chips under the top bar. */
export function filterChips(f, show) {
  return [
    { id: 'show', label: show?.length ? show.join(', ') : 'Everyone', on: true },
    { id: 'age', label: `Age ${f.ageMin}–${f.ageMax === 60 ? '60+' : f.ageMax}`, on: f.ageMin !== 18 || f.ageMax !== 60 },
    { id: 'where', label: WHERE.find((w) => w.id === f.where).label, on: f.where !== 'anywhere' },
    { id: 'verified', label: 'Verified only', on: f.verifiedOnly },
    { id: 'intents', label: f.intents.length ? f.intents.join(', ') : 'Looking for', on: f.intents.length > 0 },
  ];
}

function Stepper({ label, value, onChange, min, max }) {
  const btn = (d, icon) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label} ${d > 0 ? 'up' : 'down'}`}
      disabled={value + d < min || value + d > max}
      onPress={() => {
        tap();
        onChange(value + d);
      }}
      style={[styles.stepBtn, (value + d < min || value + d > max) && { opacity: 0.3 }]}
    >
      <Icon name={icon} size={16} stroke={2.4} />
    </Pressable>
  );
  return (
    <View style={styles.stepper}>
      <T v="small" c={C.muted}>
        {label}
      </T>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 6 }}>
        {btn(-1, 'down')}
        <T style={{ fontFamily: F.display, fontSize: 24, minWidth: 40, textAlign: 'center' }}>{value === 60 && label === 'To' ? '60+' : value}</T>
        {btn(1, 'up')}
      </View>
    </View>
  );
}

function Chip({ label, on, onPress }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      onPress={() => {
        tap();
        onPress();
      }}
    >
      {on ? (
        <LinearGradient colors={GRAD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.chip, { borderWidth: 0 }]}>
          <T v="label" c="#FFFFFF">
            {label}
          </T>
        </LinearGradient>
      ) : (
        <View style={styles.chip}>
          <T v="label" c={C.ink2} style={{ fontFamily: F.medium }}>
            {label}
          </T>
        </View>
      )}
    </Pressable>
  );
}

/** Bottom sheet with all filters. onApply(filters, show) */
export function FilterSheet({ visible, filters, show, hasCity, hasCountry, onClose, onApply }) {
  const insets = useSafeAreaInsets();
  const [f, setF] = useState(filters);
  const [s, setS] = useState(show || []);
  const [lastOpen, setLastOpen] = useState(visible);
  // Start from the current filters each time the sheet opens.
  if (visible !== lastOpen) {
    setLastOpen(visible);
    if (visible) {
      setF(filters);
      setS(show || []);
    }
  }
  const toggle = (arr, v) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable accessibilityLabel="Close filters" style={styles.backdrop} onPress={onClose} />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.grab} />
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
          <T style={{ flex: 1, fontFamily: F.display, fontSize: 22 }}>Filters</T>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              tap();
              setF(DEFAULT_FILTERS);
            }}
            hitSlop={8}
          >
            <T v="label" c={C.pinkL}>
              Reset
            </T>
          </Pressable>
        </View>
        <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 520 }}>
          <T v="label" c={C.muted} style={styles.h}>
            Show me
          </T>
          <View style={styles.wrap}>
            {SHOW.map((g) => (
              <Chip key={g} label={g} on={s.includes(g)} onPress={() => setS(toggle(s, g))} />
            ))}
          </View>

          <T v="label" c={C.muted} style={styles.h}>
            Age
          </T>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Stepper label="From" value={f.ageMin} min={18} max={f.ageMax} onChange={(v) => setF({ ...f, ageMin: v })} />
            <Stepper label="To" value={f.ageMax} min={f.ageMin} max={60} onChange={(v) => setF({ ...f, ageMax: v })} />
          </View>

          <T v="label" c={C.muted} style={styles.h}>
            Where
          </T>
          <View style={styles.seg}>
            {WHERE.map((w) => {
              const on = f.where === w.id;
              const off = (w.id === 'city' && !hasCity) || (w.id === 'country' && !hasCountry);
              return (
                <Pressable
                  key={w.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on, disabled: off }}
                  disabled={off}
                  onPress={() => {
                    tap();
                    setF({ ...f, where: w.id });
                  }}
                  style={[styles.segBtn, on && { backgroundColor: C.ink }, off && { opacity: 0.35 }]}
                >
                  <T v="label" c={on ? C.bg : C.muted}>
                    {w.label}
                  </T>
                </Pressable>
              );
            })}
          </View>
          {!hasCity ? (
            <T v="small" c={C.faint} style={{ marginTop: 6 }}>
              Add your city in Me › Edit profile to filter by place.
            </T>
          ) : null}

          <T v="label" c={C.muted} style={styles.h}>
            Looking for
          </T>
          <View style={styles.wrap}>
            {INTENTS.map((i) => (
              <Chip key={i} label={i} on={f.intents.includes(i)} onPress={() => setF({ ...f, intents: toggle(f.intents, i) })} />
            ))}
          </View>

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <T style={{ fontFamily: F.medium }}>Verified only</T>
              <T v="small" c={C.muted}>
                People who passed the selfie check
              </T>
            </View>
            <Toggle value={f.verifiedOnly} onChange={(v) => setF({ ...f, verifiedOnly: v })} label="Verified only" />
          </View>
        </ScrollView>
        <GradientButton
          title="Show people"
          disabled={!s.length}
          style={{ marginTop: 16 }}
          onPress={() => {
            onApply(f, s);
            onClose();
          }}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  sheet: { backgroundColor: '#141116', borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 10, borderWidth: 1, borderColor: C.line },
  grab: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: '#3A3439', marginBottom: 12 },
  h: { marginTop: 18, marginBottom: 8 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { height: 38, paddingHorizontal: 16, borderRadius: 19, borderWidth: 1.5, borderColor: '#3A3439', justifyContent: 'center' },
  stepper: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 18, backgroundColor: C.surf2 },
  stepBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#2A242C', alignItems: 'center', justifyContent: 'center' },
  seg: { flexDirection: 'row', backgroundColor: C.surf2, borderRadius: 14, padding: 4, gap: 4 },
  segBtn: { flex: 1, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 18, padding: 14, borderRadius: 16, backgroundColor: C.surf2 },
});
