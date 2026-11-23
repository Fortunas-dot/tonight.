// Me › Settings: account, discover, notifications, privacy & safety, help, and deleting your account.
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { C, F } from '../theme';
import { Icon, Verified } from '../icons';
import { Card, Header, Photo, Row, Screen, T, Toggle, success, tap } from '../ui';
import { versionLabel } from '../version';
import * as api from '../backend';

const NOTIFY = [
  ['matches', 'New matches'],
  ['messages', 'Messages'],
  ['likes', 'Someone likes you'],
  ['lounge', 'Replies in the Lounge'],
];

function Label({ children }) {
  return (
    <T v="label" c={C.muted} style={{ marginTop: 24, marginBottom: 8, marginLeft: 4 }}>
      {children}
    </T>
  );
}

export function Settings({ profile, setProfile, go, onBack, onDeleted }) {
  const settings = profile.settings || {};
  const notify = { matches: true, messages: true, likes: true, lounge: true, ...(settings.notify || {}) };
  const [alias, setAlias] = useState(null);
  const [blocks, setBlocks] = useState(null);
  const [showBlocks, setShowBlocks] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    api.myAlias().then(setAlias);
  }, []);

  const loadBlocks = useCallback(async () => setBlocks(await api.loadBlocks()), []);

  const set = (patch) => setProfile((p) => ({ ...p, settings: { ...(p.settings || {}), ...patch } }));
  const setNotify = (k, v) => set({ notify: { ...notify, [k]: v } });

  const confirmDelete = () =>
    Alert.alert('Delete your account?', 'This removes your profile, photos, matches, chats, posts and comments for good. It cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete for good',
        style: 'destructive',
        onPress: async () => {
          setDeleting(true);
          const ok = await api.deleteAccount();
          setDeleting(false);
          if (!ok) {
            Alert.alert('Could not delete', 'Check your connection and try again, or contact support.');
            return;
          }
          success();
          onDeleted();
        },
      },
    ]);

  return (
    <Screen scroll>
      <Header title="Settings" onBack={onBack} />

      <Pressable accessibilityRole="button" accessibilityLabel="Edit profile" onPress={() => go('editProfile')}>
        <LinearGradient colors={['rgba(240,40,122,0.14)', 'rgba(59,123,255,0.12)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.account}>
          <Photo uri={profile.photos?.[0]} style={{ width: 56, height: 56, borderRadius: 28 }} />
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <T style={{ fontFamily: F.display, fontSize: 19 }}>
                {profile.name || 'You'}
                {profile.age ? `, ${profile.age}` : ''}
              </T>
              {profile.verified ? <Verified size={16} /> : null}
            </View>
            <T v="small" c={C.muted}>
              {profile.verified ? 'Live-verified' : 'Not verified yet'}
              {alias ? ` · Lounge alias ${alias}` : ''}
            </T>
          </View>
          <Icon name="chev" size={16} color={C.muted} />
        </LinearGradient>
      </Pressable>

      <Label>Discover</Label>
      <Card style={{ paddingVertical: 0 }}>
        <Row
          icon="pause"
          iconColor={C.violetL}
          iconBg={C.violetBg}
          title="Pause my profile"
          sub={settings.paused ? 'Hidden from Discover. Matches and chats stay.' : 'Take a break without losing your matches'}
          right={<Toggle value={!!settings.paused} onChange={(v) => set({ paused: v })} label="Pause my profile" />}
          last
        />
      </Card>

      <Label>Notifications</Label>
      <Card style={{ paddingVertical: 0 }}>
        {NOTIFY.map(([k, title], i) => (
          <Row key={k} title={title} right={<Toggle value={notify[k]} onChange={(v) => setNotify(k, v)} label={title} />} />
        ))}
        <Row
          title="Discreet previews"
          sub="Notifications say “New activity” instead of names"
          right={<Toggle value={settings.discreet !== false} onChange={(v) => set({ discreet: v })} color={C.blue} label="Discreet previews" />}
          last
        />
      </Card>

      <Label>Privacy & safety</Label>
      <Card style={{ paddingVertical: 0 }}>
        <Row icon="lock" iconColor={C.blueL} iconBg={C.blueBg} title="Privacy & discretion" sub="App icon, Face ID, quiet mode" onPress={() => go('privacy')} />
        <Row
          icon="shield"
          iconColor={C.blueL}
          iconBg={C.blueBg}
          title="Blocked people"
          sub={blocks ? `${blocks.length} blocked` : 'People you blocked never see you'}
          onPress={() => {
            tap();
            if (!showBlocks && blocks === null) loadBlocks();
            setShowBlocks(!showBlocks);
          }}
          last={!showBlocks}
        />
        {showBlocks ? (
          <View style={{ paddingBottom: 8 }}>
            {blocks === null ? (
              <ActivityIndicator color={C.pink} style={{ margin: 12 }} />
            ) : blocks.length === 0 ? (
              <T v="small" c={C.muted} style={{ padding: 12 }}>
                You haven’t blocked anyone.
              </T>
            ) : (
              blocks.map((b) => (
                <View key={b.id} style={styles.blockRow}>
                  <T style={{ flex: 1 }}>{b.name}</T>
                  <Pressable
                    accessibilityRole="button"
                    onPress={async () => {
                      tap();
                      await api.unblock(b.id);
                      loadBlocks();
                    }}
                    style={styles.unblock}
                  >
                    <T v="small" c={C.ink} style={{ fontFamily: F.semi }}>
                      Unblock
                    </T>
                  </Pressable>
                </View>
              ))
            )}
          </View>
        ) : null}
      </Card>

      <Label>Help & community</Label>
      <Card style={{ paddingVertical: 0 }}>
        <Row icon="chat" iconColor={C.blueL} iconBg={C.blueBg} title="Support chat" onPress={() => go('support')} />
        <Row icon="bulb" title="Ideas board" onPress={() => go('ideas')} />
        <Row icon="flame" iconColor={C.violetL} iconBg={C.violetBg} title="The Tonight Code" onPress={() => go('code')} last />
      </Card>

      <Label>Legal</Label>
      <Card style={{ paddingVertical: 0 }}>
        <Row icon="doc" iconColor={C.muted} iconBg={C.surf2} title="Terms of use" onPress={() => Linking.openURL('https://fortunas.nl/tonight/terms')} />
        <Row icon="doc" iconColor={C.muted} iconBg={C.surf2} title="Privacy policy" onPress={() => Linking.openURL('https://fortunas.nl/tonight/privacy')} last />
      </Card>

      <Pressable accessibilityRole="button" onPress={confirmDelete} disabled={deleting} style={styles.delete}>
        {deleting ? <ActivityIndicator color={C.red} /> : <Icon name="trash" size={18} color={C.red} />}
        <T v="label" c={C.red}>
          {deleting ? 'Deleting…' : 'Delete account and all data'}
        </T>
      </Pressable>
      <T v="small" c={C.faint} style={{ textAlign: 'center', marginTop: 10 }}>
        Tonight · {versionLabel()}
      </T>
      <View style={{ height: 30 }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  account: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: 22, borderWidth: 1, borderColor: C.line, marginTop: 4 },
  blockRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 8 },
  unblock: { height: 32, paddingHorizontal: 14, borderRadius: 16, backgroundColor: C.surf2, justifyContent: 'center' },
  delete: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 52, borderRadius: 26, borderWidth: 1.5, borderColor: '#5A2A31', marginTop: 28 },
});
