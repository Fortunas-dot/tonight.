// Profile fields (name, age, description, country, city) with a polished look, shared by
// onboarding step 1 and Me › Edit profile.
import { useCallback, useEffect, useState } from 'react';
import { Alert, Image, Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { MaskEditor } from './MaskEditor';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, F } from '../theme';
import { Icon, Verified } from '../icons';
import { GradientButton, LiquidBg, Photo, T, Toggle, success, tap } from '../ui';
import { countryCode, searchCities, searchCountries } from '../countries';

export const BIO_MAX = 300;
const STARTERS = ['Looking for ', 'My ideal night: ', 'Green flags: ', 'You should know: '];

/* ---------- building blocks ---------- */

/** A labelled input with an icon that lights up while you type. */
export function Field({ label, icon, value, onChangeText, placeholder, hint, multiline, max, keyboardType, maxLength, autoCapitalize = 'sentences', children }) {
  const [focus, setFocus] = useState(false);
  const near = max && value.length > max - 30;
  return (
    <View style={{ marginTop: 14 }}>
      <View style={styles.labelRow}>
        <T v="label" c={focus ? C.ink : C.muted}>
          {label}
        </T>
        {hint ? (
          <T v="small" c={C.faint}>
            {hint}
          </T>
        ) : null}
      </View>
      <View style={[styles.box, multiline && styles.boxMulti, focus && styles.boxFocus]}>
        {icon ? (
          <View style={[styles.boxIcon, multiline && { marginTop: 2 }]}>
            <Icon name={icon} size={18} color={focus ? C.pinkL : C.muted} />
          </View>
        ) : null}
        <TextInput
          value={value}
          onChangeText={(t) => onChangeText(max ? t.slice(0, max) : t)}
          placeholder={placeholder}
          placeholderTextColor={C.faint}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          multiline={multiline}
          keyboardType={keyboardType}
          maxLength={maxLength}
          autoCapitalize={autoCapitalize}
          selectionColor={C.pink}
          style={[styles.input, multiline && styles.inputMulti]}
          accessibilityLabel={label}
        />
        {value && focus && !multiline ? (
          <Pressable accessibilityRole="button" accessibilityLabel={`Clear ${label}`} onPress={() => onChangeText('')} hitSlop={8} style={styles.clear}>
            <Icon name="close" size={12} color={C.ink} stroke={2.6} />
          </Pressable>
        ) : null}
        {max ? (
          <T v="small" c={near ? C.pinkL : C.faint} style={styles.counter}>
            {value.length}/{max}
          </T>
        ) : null}
      </View>
      {children}
    </View>
  );
}

/** A small titled block with an icon, used to group fields. */
export function Section({ icon, title, caption, children }) {
  return (
    <View style={styles.section}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <LinearGradient colors={['rgba(240,40,122,0.22)', 'rgba(59,123,255,0.18)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.sectionIcon}>
          <Icon name={icon} size={17} color={C.ink} />
        </LinearGradient>
        <View style={{ flex: 1 }}>
          <T style={{ fontFamily: F.display, fontSize: 17 }}>{title}</T>
          {caption ? (
            <T v="small" c={C.muted}>
              {caption}
            </T>
          ) : null}
        </View>
      </View>
      {children}
    </View>
  );
}

/**
 * A search box that only accepts a choice from its list (countries, or cities from the place search).
 * search(query) returns names or { name, region, country } objects; what you type is reverted unless you pick one.
 */
export function SearchSelect({ label, icon, value, onChange, placeholder, search, emptyHint, disabled, disabledHint }) {
  const [focus, setFocus] = useState(false);
  const [query, setQuery] = useState(value || '');
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(false);
  const [lastValue, setLastValue] = useState(value);
  if (value !== lastValue) {
    setLastValue(value);
    setQuery(value || '');
  }

  useEffect(() => {
    if (!focus) return undefined;
    let alive = true;
    const t = setTimeout(async () => {
      setBusy(true);
      const res = await search(query === value ? '' : query);
      if (alive) {
        setItems(res);
        setBusy(false);
      }
    }, 220);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [focus, query, value, search]);

  const pick = (item) => {
    const name = typeof item === 'string' ? item : item.name;
    tap();
    setQuery(name);
    setFocus(false);
    Keyboard.dismiss();
    onChange(name, item);
  };

  return (
    <View style={{ marginTop: 14 }}>
      <View style={styles.labelRow}>
        <T v="label" c={focus ? C.ink : C.muted}>
          {label}
        </T>
        {value ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Icon name="check" size={12} color={C.green} stroke={2.6} />
            <T v="small" c={C.green}>
              Selected
            </T>
          </View>
        ) : null}
      </View>
      <View style={[styles.box, focus && styles.boxFocus, disabled && { opacity: 0.45 }]}>
        <View style={styles.boxIcon}>
          <Icon name={focus ? 'search' : icon} size={18} color={focus ? C.pinkL : C.muted} />
        </View>
        <TextInput
          value={query}
          onChangeText={setQuery}
          editable={!disabled}
          placeholder={disabled ? disabledHint : placeholder}
          placeholderTextColor={C.faint}
          onFocus={() => {
            setFocus(true);
          }}
          onBlur={() => {
            // Only a picked value counts: free text goes back to the last choice.
            setTimeout(() => {
              setFocus(false);
              setQuery(value || '');
            }, 150);
          }}
          autoCapitalize="words"
          autoCorrect={false}
          selectionColor={C.pink}
          style={styles.input}
          accessibilityLabel={label}
        />
        {query && focus ? (
          <Pressable accessibilityRole="button" accessibilityLabel={`Clear ${label}`} onPress={() => setQuery('')} hitSlop={8} style={styles.clear}>
            <Icon name="close" size={12} color={C.ink} stroke={2.6} />
          </Pressable>
        ) : null}
      </View>
      {focus ? (
        <View style={styles.dropdown}>
          {busy && !items.length ? (
            <T v="small" c={C.muted} style={{ padding: 14 }}>
              Searching…
            </T>
          ) : items.length ? (
            items.map((it, i) => {
              const name = typeof it === 'string' ? it : it.name;
              const sub = typeof it === 'string' ? '' : [it.region, it.country].filter(Boolean).join(', ');
              const on = name === value;
              return (
                <Pressable key={`${name}-${sub}-${i}`} accessibilityRole="button" onPress={() => pick(it)} style={[styles.option, i === items.length - 1 && { borderBottomWidth: 0 }]}>
                  <Icon name={icon} size={16} color={on ? C.pinkL : C.muted} />
                  <View style={{ flex: 1 }}>
                    <T style={{ fontFamily: on ? F.semi : F.medium }}>{name}</T>
                    {sub ? (
                      <T v="small" c={C.muted}>
                        {sub}
                      </T>
                    ) : null}
                  </View>
                  {on ? <Icon name="check" size={16} color={C.pinkL} stroke={2.4} /> : null}
                </Pressable>
              );
            })
          ) : (
            <T v="small" c={C.muted} style={{ padding: 14 }}>
              {emptyHint}
            </T>
          )}
        </View>
      ) : null}
    </View>
  );
}

function Starters({ bio, setBio }) {
  if (bio.trim().length > 40) return null;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
      {STARTERS.map((s) => (
        <Pressable
          key={s}
          accessibilityRole="button"
          accessibilityLabel={`Start with: ${s.trim()}`}
          onPress={() => {
            tap();
            setBio((bio.trim() ? `${bio.trim()} ` : '') + s);
          }}
          style={styles.starter}
        >
          <Icon name="plus" size={12} color={C.pinkL} stroke={2.6} />
          <T v="small" c={C.ink2}>
            {s.replace(/[: ]+$/, '')}
          </T>
        </Pressable>
      ))}
    </View>
  );
}

/** Description, country and city (used inside onboarding step 1). */
const NIGHT_MAX = 150;
const NIGHT_STARTERS = ['A drink first, then ', 'Candles, music and ', 'Somewhere new, then '];

export function ProfileFields({ bio, setBio, prompt = '', setPrompt, country, setCountry, city, setCity }) {
  const findCountries = useCallback(async (q) => searchCountries(q), []);
  const code = countryCode(country);
  const findCities = useCallback(async (q) => searchCities(q, code), [code]);
  return (
    <>
      <Section icon="pen" title="About you" caption="What should a match know first?">
        <Field label="Description" icon="chat" value={bio} onChangeText={setBio} placeholder="A few lines about you and what you're looking for" multiline max={BIO_MAX} />
        <Starters bio={bio} setBio={setBio} />
        {setPrompt ? (
          <>
            <Field label="My ideal night" icon="flame" value={prompt} onChangeText={setPrompt} placeholder="Describe your perfect night out (or in)" multiline max={NIGHT_MAX} />
            {prompt.trim().length < 10 ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                {NIGHT_STARTERS.map((s) => (
                  <Pressable
                    key={s}
                    accessibilityRole="button"
                    accessibilityLabel={`Start with: ${s.trim()}`}
                    onPress={() => {
                      tap();
                      setPrompt(s);
                    }}
                    style={styles.starter}
                  >
                    <Icon name="plus" size={12} color={C.pinkL} stroke={2.6} />
                    <T v="small" c={C.ink2}>
                      {s.trim().replace(/,$/, '')}…
                    </T>
                  </Pressable>
                ))}
              </View>
            ) : null}
          </>
        ) : null}
      </Section>
      <Section icon="globe" title="Where you are" caption="Only your city is shown, never your exact location.">
        <SearchSelect
          label="Country"
          icon="globe"
          value={country}
          onChange={(c) => {
            if (c !== country) setCity('');
            setCountry(c);
          }}
          placeholder="Search your country"
          search={findCountries}
          emptyHint="No country with that name."
        />
        <SearchSelect
          label="City"
          icon="pin"
          value={city}
          onChange={setCity}
          placeholder="Search your city"
          search={findCities}
          emptyHint="Type at least 2 letters of your city."
          disabled={!country}
          disabledHint="Pick your country first"
        />
      </Section>
    </>
  );
}

/* ---------- Photos in Edit profile ---------- */

function PhotoGrid({ photos, setPhotos, masked, onMask }) {
  const [gridW, setGridW] = useState(0);
  const tileW = gridW ? Math.floor((gridW - 16) / 3) : 0;
  const tile = { width: tileW, height: Math.round(tileW * 1.25) };
  const add = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [3, 4], quality: 0.8 });
    if (!res.canceled && res.assets?.[0]) setPhotos([...photos, res.assets[0].uri].slice(0, 6));
  };
  const remove = (i) => {
    if (photos.length <= 1) {
      Alert.alert('Keep at least one photo', 'Add another photo first, then remove this one.');
      return;
    }
    setPhotos(photos.filter((_, j) => j !== i));
  };
  const makeMain = (i) => {
    tap();
    setPhotos([photos[i], ...photos.filter((_, j) => j !== i)]);
  };
  const slots = Array.from({ length: 6 }, (_, i) => photos[i]);
  return (
    <View style={styles.grid} onLayout={(e) => setGridW(e.nativeEvent.layout.width)}>
      {!tileW
        ? null
        : slots.map((uri, i) =>
            uri ? (
              <Pressable
                key={`${uri}-${i}`}
                accessibilityRole="button"
                accessibilityLabel={i === 0 ? 'Main photo' : `Photo ${i + 1}, tap to make it your main photo`}
                onPress={() => i && makeMain(i)}
                style={[styles.slot, tile, i === 0 && styles.slotMain]}
              >
                <Image source={{ uri }} style={StyleSheet.absoluteFill} />
                <Pressable accessibilityRole="button" accessibilityLabel={`Remove photo ${i + 1}`} onPress={() => remove(i)} hitSlop={8} style={styles.slotX}>
                  <Icon name="close" size={11} color={C.ink} stroke={3} />
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Mask photo ${i + 1}`}
                  onPress={() => onMask(i)}
                  hitSlop={6}
                  style={[styles.slotMask, masked[uri] && { backgroundColor: C.pink }]}
                >
                  <Icon name="mask" size={14} color="#FFFFFF" />
                </Pressable>
                {i === 0 ? (
                  <View style={styles.mainTag}>
                    <T c="#FFFFFF" style={{ fontFamily: F.bold, fontSize: 9 }}>
                      MAIN
                    </T>
                  </View>
                ) : null}
              </Pressable>
            ) : (
              <Pressable
                key={`empty-${i}`}
                accessibilityRole="button"
                accessibilityLabel="Add photo"
                onPress={add}
                style={[styles.slot, tile, styles.slotEmpty, i === photos.length && { borderColor: C.pink }]}
              >
                <Icon name="plus" size={20} color={i === photos.length ? C.pinkL : C.muted} />
              </Pressable>
            ),
          )}
    </View>
  );
}

/* ---------- Me › Edit profile ---------- */

function PreviewCard({ profile, name, age, bio, city, country }) {
  const photo = profile.photos?.[0];
  return (
    <View style={styles.preview}>
      <Photo uri={photo} blur={profile.blurFace} style={StyleSheet.absoluteFill} />
      {photo ? null : <LinearGradient colors={['#2A1A2A', '#141018']} style={StyleSheet.absoluteFill} />}
      <LinearGradient colors={['rgba(14,12,16,0)', 'rgba(14,12,16,0.92)']} style={styles.previewShade}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <T style={{ fontFamily: F.display, fontSize: 24 }} numberOfLines={1}>
            {name.trim() || 'You'}
            {age ? `, ${age}` : ''}
          </T>
          {profile.verified ? <Verified size={18} /> : null}
        </View>
        {city.trim() ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
            <Icon name="pin" size={13} color={C.ink2} />
            <T v="small" c={C.ink2}>
              {city.trim()}
              {country.trim() ? `, ${country.trim()}` : ''}
            </T>
          </View>
        ) : null}
        <T c={bio.trim() ? C.ink : C.faint} numberOfLines={2} style={{ fontSize: 14, lineHeight: 20, marginTop: 6 }}>
          {bio.trim() ? `“${bio.trim()}”` : 'Your description shows here.'}
        </T>
      </LinearGradient>
      <View style={styles.previewTag}>
        <Icon name="eye" size={12} color="#C9D6F2" />
        <T v="small" c="#C9D6F2" style={{ fontFamily: F.semi, fontSize: 11 }}>
          How others see you
        </T>
      </View>
    </View>
  );
}

export function EditProfile({ profile, setProfile, onBack }) {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState(profile.name || '');
  const [age, setAge] = useState(profile.age ? String(profile.age) : '');
  const [bio, setBio] = useState(profile.bio || '');
  const [prompt, setPrompt] = useState(profile.prompt || '');
  const [country, setCountry] = useState(profile.country || '');
  const [city, setCity] = useState(profile.city || '');
  const [photos, setPhotos] = useState(profile.photos || []);
  const [masked, setMasked] = useState(profile.masked || {});
  const [blur, setBlur] = useState(!!profile.blurFace);
  const [masking, setMasking] = useState(null);
  const ageNum = parseInt(age, 10);
  const valid = name.trim().length > 0 && ageNum >= 18 && ageNum < 100;
  const dirty =
    photos.join('|') !== (profile.photos || []).join('|') ||
    blur !== !!profile.blurFace ||
    name.trim() !== (profile.name || '') ||
    ageNum !== profile.age ||
    bio.trim() !== (profile.bio || '') ||
    prompt.trim() !== (profile.prompt || '') ||
    country.trim() !== (profile.country || '') ||
    city.trim() !== (profile.city || '');
  const save = () => {
    if (!valid || !dirty) return;
    success();
    setProfile((p) => ({ ...p, name: name.trim(), age: ageNum, bio: bio.trim(), prompt: prompt.trim(), country: country.trim(), city: city.trim(), photos, masked, blurFace: blur }));
    onBack();
  };

  if (masking !== null && photos[masking]) {
    return (
      <MaskEditor
        photos={photos}
        start={masking}
        onCancel={() => setMasking(null)}
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
          setMasking(null);
        }}
      />
    );
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: C.bg }}>
      <LiquidBg />
      <View style={[styles.head, { paddingTop: insets.top + 4 }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={onBack} style={styles.headBtn}>
          <Icon name="back" size={22} />
        </Pressable>
        <T style={{ flex: 1, fontFamily: F.semi, fontSize: 17, textAlign: 'center' }}>Edit profile</T>
        <View style={styles.headBtn} />
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 130 }} keyboardShouldPersistTaps="handled">
        <PreviewCard profile={{ ...profile, photos, blurFace: blur }} name={name} age={age} bio={bio} city={city} country={country} />
        <Section icon="image" title="Photos" caption="Tap a photo to make it your main one.">
          <PhotoGrid photos={photos} setPhotos={setPhotos} masked={masked} onMask={setMasking} />
          <View style={styles.photoOpt}>
            <View style={{ flex: 1 }}>
              <T style={{ fontFamily: F.medium }}>Blur my face until we match</T>
              <T v="small" c={C.muted}>
                Others see your photos blurred until you both like each other
              </T>
            </View>
            <Toggle value={blur} onChange={setBlur} label="Blur my face until we match" />
          </View>
        </Section>
        <Section icon="user" title="The basics" caption="Only your first name and age are shown.">
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
        <ProfileFields bio={bio} setBio={setBio} prompt={prompt} setPrompt={setPrompt} country={country} setCountry={setCountry} city={city} setCity={setCity} />
      </ScrollView>
      <LinearGradient colors={['rgba(14,12,16,0)', C.bg]} locations={[0, 0.35]} style={[styles.saveBar, { paddingBottom: insets.bottom + 12 }]}>
        <GradientButton title={dirty ? 'Save changes' : 'No changes yet'} disabled={!valid || !dirty} onPress={save} />
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 },
  box: { flexDirection: 'row', alignItems: 'center', minHeight: 54, borderRadius: 16, borderWidth: 1.5, borderColor: '#2A242C', backgroundColor: C.surf3, paddingHorizontal: 14 },
  boxMulti: { alignItems: 'flex-start', paddingTop: 14, paddingBottom: 30 },
  boxFocus: { borderColor: C.pink, backgroundColor: '#1A1218' },
  boxIcon: { width: 22, marginRight: 10, alignItems: 'center' },
  input: { flex: 1, color: C.ink, fontFamily: F.body, fontSize: 16, paddingVertical: 12 },
  inputMulti: { minHeight: 84, paddingVertical: 0, lineHeight: 22, textAlignVertical: 'top' },
  clear: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#3A3439', alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  counter: { position: 'absolute', right: 14, bottom: 9 },
  section: { marginTop: 18, padding: 16, borderRadius: 22, backgroundColor: 'rgba(23,19,26,0.85)', borderWidth: 1, borderColor: C.line },
  sectionIcon: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, height: 32, paddingHorizontal: 12, borderRadius: 16, borderWidth: 1, borderColor: '#3A3439', backgroundColor: 'rgba(255,255,255,0.02)' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  slot: { borderRadius: 14, overflow: 'hidden', backgroundColor: C.surf2 },
  slotMain: { borderWidth: 2, borderColor: C.pink },
  slotEmpty: { borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#4A4148', backgroundColor: C.surf3, alignItems: 'center', justifyContent: 'center' },
  slotX: { position: 'absolute', top: 5, right: 5, width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(14,12,16,0.75)', alignItems: 'center', justifyContent: 'center' },
  slotMask: { position: 'absolute', right: 5, bottom: 5, width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(14,12,16,0.75)', alignItems: 'center', justifyContent: 'center' },
  mainTag: { position: 'absolute', left: 5, bottom: 5, backgroundColor: C.pink, borderRadius: 7, paddingHorizontal: 5, paddingVertical: 2 },
  photoOpt: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 14, padding: 12, borderRadius: 14, backgroundColor: C.surf2 },
  dropdown: { marginTop: 6, borderRadius: 16, borderWidth: 1, borderColor: C.line2, backgroundColor: '#1A161C', overflow: 'hidden' },
  option: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: C.line },
  starter: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 30, paddingHorizontal: 10, borderRadius: 15, backgroundColor: C.pinkBg, borderWidth: 1, borderColor: '#4A1A33' },
  head: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingBottom: 4 },
  headBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  preview: { height: 230, borderRadius: 24, overflow: 'hidden', marginTop: 6, borderWidth: 1, borderColor: C.line },
  previewShade: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 16, paddingTop: 60 },
  previewTag: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 26,
    paddingHorizontal: 10,
    borderRadius: 13,
    backgroundColor: 'rgba(14,12,16,0.7)',
  },
  saveBar: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 20, paddingTop: 30 },
});
