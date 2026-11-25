// Sign in with Apple, so an account survives a new phone. The native module only exists in builds from
// version 12 on; older builds (and web) just don't show the option.
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

let mod;
let lastCode = null;
/** The authorization code from the latest Apple sign-in (used once, then cleared). */
export const lastAppleCode = () => {
  const c = lastCode;
  lastCode = null;
  return c;
};
function apple() {
  if (mod !== undefined) return mod;
  mod = null;
  if (Platform.OS !== 'ios') return mod;
  try {
    mod = require('expo-apple-authentication');
  } catch {
    mod = null;
  }
  return mod;
}

/** true once we know this phone can show the Apple button. */
export function useAppleAvailable() {
  const [ok, setOk] = useState(false);
  useEffect(() => {
    let alive = true;
    const m = apple();
    if (m?.isAvailableAsync) {
      m.isAvailableAsync()
        .then((v) => alive && setOk(!!v))
        .catch(() => {});
    }
    return () => {
      alive = false;
    };
  }, []);
  return ok;
}

/** Apple's own button (required by App Review), or null when not available. */
export function AppleButton({ kind = 'continue', onPress, style }) {
  const m = apple();
  if (!m?.AppleAuthenticationButton) return null;
  const type = kind === 'signIn' ? m.AppleAuthenticationButtonType.SIGN_IN : m.AppleAuthenticationButtonType.CONTINUE;
  return <m.AppleAuthenticationButton buttonType={type} buttonStyle={m.AppleAuthenticationButtonStyle.WHITE} cornerRadius={28} style={[{ height: 54 }, style]} onPress={onPress} />;
}

/**
 * Asks Apple for an identity token. Returns the token, or null when cancelled. No name or email is requested.
 * The one-time authorization code that comes with it is kept in lastAppleCode() for api.storeAppleCode.
 */
export async function appleToken() {
  const m = apple();
  if (!m) return null;
  try {
    const cred = await m.signInAsync({ requestedScopes: [] });
    lastCode = cred.authorizationCode || null;
    return cred.identityToken || null;
  } catch (e) {
    if (e?.code === 'ERR_REQUEST_CANCELED') return null;
    throw e;
  }
}
