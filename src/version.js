// Which app code is running, and getting new OTA updates in on the first launch instead of the second.
import { Platform } from 'react-native';
import * as Updates from 'expo-updates';

/** Short label such as "Update 1c8c40d1 · 23 Nov 17:02" or "Built-in version". */
export function versionLabel() {
  if (Platform.OS === 'web') return 'Web preview';
  try {
    if (!Updates.isEnabled) return 'Updates off';
    if (Updates.isEmbeddedLaunch || !Updates.updateId) return `Built-in version · ${Updates.channel || 'no channel'}`;
    const at = Updates.createdAt ? Updates.createdAt.toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';
    return `Update ${Updates.updateId.slice(0, 8)}${at ? ` · ${at}` : ''}`;
  } catch {
    return 'Version unknown';
  }
}

/** On launch: if a newer update is on the server, download it and restart into it straight away. */
export async function applyNewestUpdate() {
  if (Platform.OS === 'web' || __DEV__) return;
  try {
    if (!Updates.isEnabled) return;
    const check = await Updates.checkForUpdateAsync();
    if (!check.isAvailable) return;
    const fetched = await Updates.fetchUpdateAsync();
    if (fetched.isNew) await Updates.reloadAsync();
  } catch (e) {
    console.warn('[updates] check failed', e?.message || e);
  }
}
