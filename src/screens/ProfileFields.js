// Description, country and city: shared by onboarding (Basics) and Edit profile.
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { C, F } from '../theme';
import { GradientButton, Header, Screen, T, success, tap } from '../ui';

export const BIO_MAX = 300;
const COUNTRIES = ['Netherlands', 'Belgium', 'Germany', 'United Kingdom', 'France', 'Spain'];

export function ProfileFields({ bio, setBio, country, setCountry, city, setCity }) {
  return (
    <View>
      <T v="label" c={C.muted} style={styles.lbl}>
        About you
      </T>
      <TextInput
        value={bio}
        onChangeText={(t) => setBio(t.slice(0, BIO_MAX))}
        placeholder="A few lines about you and what you're looking for"
        placeholderTextColor={C.faint}
        multiline
        style={[styles.input, styles.bio]}
        accessibilityLabel="About you"
      />
      <T v="small" c={bio.length > BIO_MAX - 30 ? C.pinkL : C.faint} style={{ textAlign: 'right', marginTop: 4 }}>
        {bio.length}/{BIO_MAX}
      </T>

      <T v="label" c={C.muted} style={styles.lbl}>
        Country
      </T>
      <TextInput value={country} onChangeText={setCountry} placeholder="Your country" placeholderTextColor={C.faint} style={styles.input} accessibilityLabel="Country" autoCapitalize="words" />
      <View style={styles.quick}>
        {COUNTRIES.map((c) => {
          const on = country.trim().toLowerCase() === c.toLowerCase();
          return (
            <Pressable
              key={c}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              onPress={() => {
                tap();
                setCountry(c);
              }}
              style={[styles.chip, on && { backgroundColor: C.blue, borderColor: C.blue }]}
            >
              <T v="small" c={on ? '#FFFFFF' : C.ink2} style={{ fontFamily: on ? F.semi : F.medium }}>
                {c}
              </T>
            </Pressable>
          );
        })}
      </View>

      <T v="label" c={C.muted} style={styles.lbl}>
        City
      </T>
      <TextInput value={city} onChangeText={setCity} placeholder="Your city" placeholderTextColor={C.faint} style={styles.input} accessibilityLabel="City" autoCapitalize="words" />
      <T v="small" c={C.faint} style={{ marginTop: 6 }}>
        Only your city is shown, never your exact location.
      </T>
    </View>
  );
}

const styles = StyleSheet.create({
  lbl: { marginTop: 18, marginBottom: 8 },
  input: { minHeight: 52, borderRadius: 14, borderWidth: 1, borderColor: C.line2, backgroundColor: C.surf3, color: C.ink, paddingHorizontal: 16, fontFamily: F.body, fontSize: 16 },
  bio: { minHeight: 110, paddingTop: 14, paddingBottom: 14, lineHeight: 22, textAlignVertical: 'top' },
  quick: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  chip: { height: 30, paddingHorizontal: 11, borderRadius: 15, borderWidth: 1, borderColor: '#3A3439', justifyContent: 'center' },
});

/** Me › Edit profile: name, age, description, country and city. */
export function EditProfile({ profile, setProfile, onBack }) {
  const [name, setName] = useState(profile.name || '');
  const [age, setAge] = useState(profile.age ? String(profile.age) : '');
  const [bio, setBio] = useState(profile.bio || '');
  const [country, setCountry] = useState(profile.country || '');
  const [city, setCity] = useState(profile.city || '');
  const ageNum = parseInt(age, 10);
  const valid = name.trim().length > 0 && ageNum >= 18 && ageNum < 100;
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: C.bg }}>
      <Screen scroll>
        <Header title="Edit profile" onBack={onBack} />
        <T v="label" c={C.muted} style={styles.lbl}>
          First name or nickname
        </T>
        <TextInput value={name} onChangeText={setName} placeholder="Your name" placeholderTextColor={C.faint} style={styles.input} accessibilityLabel="First name" />
        <T v="label" c={C.muted} style={styles.lbl}>
          Age
        </T>
        <TextInput value={age} onChangeText={(t) => setAge(t.replace(/[^0-9]/g, ''))} keyboardType="number-pad" maxLength={2} placeholder="18+" placeholderTextColor={C.faint} style={styles.input} accessibilityLabel="Age" />
        <ProfileFields bio={bio} setBio={setBio} country={country} setCountry={setCountry} city={city} setCity={setCity} />
        <View style={{ height: 26 }} />
        <GradientButton
          title="Save"
          disabled={!valid}
          onPress={() => {
            success();
            setProfile((p) => ({ ...p, name: name.trim(), age: ageNum, bio: bio.trim(), country: country.trim(), city: city.trim() }));
            onBack();
          }}
        />
      </Screen>
    </KeyboardAvoidingView>
  );
}
