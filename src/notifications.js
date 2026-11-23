// Push notifications: the iPhone permission pop-up, saving this device's push token, and opening the right screen on tap.
import { Linking, Platform } from 'react-native';
import Constants from 'expo-constants';
import { supabase } from './lib/supabase';
import { myId } from './backend';

let N = null;
async function mod() {
  if (Platform.OS === 'web') return null;
  if (N) return N;
  try {
    N = await import('expo-notifications');
    N.setNotificationHandler({
      handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
    });
    return N;
  } catch {
    return null; // a build without the notifications module
  }
}

/** Asks for permission (the iPhone pop-up appears only the first time) and saves the token. Returns 'granted' | 'denied' | 'unavailable'. */
export async function registerForPush() {
  const n = await mod();
  if (!n) return 'unavailable';
  try {
    const Device = await import('expo-device');
    if (!Device.isDevice) return 'unavailable';
    let { status } = await n.getPermissionsAsync();
    if (status !== 'granted') ({ status } = await n.requestPermissionsAsync());
    if (status !== 'granted') return 'denied';
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const { data: token } = await n.getExpoPushTokenAsync({ projectId });
    const uid = myId();
    if (uid && token) await supabase.from('push_tokens').upsert({ user_id: uid, token, platform: Platform.OS, updated_at: new Date().toISOString() });
    return 'granted';
  } catch (e) {
    console.warn('[push] register failed', e?.message || e);
    return 'unavailable';
  }
}

/** The current permission without asking. */
export async function pushStatus() {
  const n = await mod();
  if (!n) return 'unavailable';
  const { status } = await n.getPermissionsAsync();
  return status;
}

export const openPhoneSettings = () => Linking.openSettings();

/** Calls onOpen(data) when a notification is tapped, also for the one that opened the app. Returns a cleanup function. */
export function onNotificationTap(onOpen) {
  let sub = null;
  let alive = true;
  mod().then(async (n) => {
    if (!n || !alive) return;
    const last = await n.getLastNotificationResponseAsync();
    if (last && alive) onOpen(last.notification.request.content.data || {});
    sub = n.addNotificationResponseReceivedListener((r) => onOpen(r.notification.request.content.data || {}));
  });
  return () => {
    alive = false;
    sub?.remove();
  };
}
