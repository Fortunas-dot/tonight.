// Face ID lock: when switched on in Privacy, Tonight asks for Face ID when it opens or comes back.
import { useEffect, useState } from 'react';
import { AppState, Platform, Pressable, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { C, F, GRAD } from '../theme';
import { Icon } from '../icons';
import { LiquidBg, T } from '../ui';

async function auth() {
  if (Platform.OS === 'web') return true;
  try {
    const LA = await import('expo-local-authentication');
    if (!(await LA.hasHardwareAsync()) || !(await LA.isEnrolledAsync())) return true; // nothing to check against
    const res = await LA.authenticateAsync({ promptMessage: 'Unlock Tonight', fallbackLabel: 'Use passcode' });
    return res.success;
  } catch {
    return true; // a build without the module: never lock people out
  }
}

/** Is Face ID available on this phone? */
export async function canUseFaceId() {
  if (Platform.OS === 'web') return false;
  try {
    const LA = await import('expo-local-authentication');
    return (await LA.hasHardwareAsync()) && (await LA.isEnrolledAsync());
  } catch {
    return false;
  }
}

/** Wraps the app; shows a lock screen until unlocked when `enabled`. */
export function LockGate({ enabled, children }) {
  const [locked, setLocked] = useState(enabled);

  useEffect(() => {
    if (!enabled) return undefined;
    let last = AppState.currentState;
    const sub = AppState.addEventListener('change', (next) => {
      if (last === 'background' && next === 'active') setLocked(true);
      last = next;
    });
    return () => sub.remove();
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !locked) return;
    auth().then((ok) => ok && setLocked(false));
  }, [enabled, locked]);

  if (!enabled || !locked) return children;
  return (
    <View style={styles.wrap}>
      <LiquidBg strong />
      <LinearGradient colors={GRAD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.badge}>
        <Icon name="lock" size={34} color="#FFFFFF" stroke={2} />
      </LinearGradient>
      <T style={{ fontFamily: F.display, fontSize: 26, marginTop: 20 }}>Tonight is locked</T>
      <T v="meta" c={C.muted} style={{ marginTop: 6 }}>
        Unlock with Face ID to continue.
      </T>
      <Pressable accessibilityRole="button" onPress={() => auth().then((ok) => ok && setLocked(false))} style={styles.btn}>
        <T v="label" c={C.bg}>
          Unlock
        </T>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', padding: 30 },
  badge: { width: 84, height: 84, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  btn: { marginTop: 26, height: 50, paddingHorizontal: 34, borderRadius: 25, backgroundColor: C.ink, justifyContent: 'center' },
});
