// Me › Settings › Moderation (moderators only): every report, with the person or post it is about,
// and one tap to dismiss it, remove the post or ban the account. Apple asks for action within 24 hours.
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, F, GRAD } from '../theme';
import { Icon, Verified } from '../icons';
import { Card, Header, Photo, Segmented, T, success, tap } from '../ui';
import * as api from '../backend';

const ago = (iso) => {
  const m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (m < 60) return `${m || 1} min ago`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h} h ago`;
  return `${Math.round(h / 24)} days ago`;
};

// Hours left of Apple's 24-hour window, for open reports.
const dueLabel = (iso) => {
  const left = 24 - (Date.now() - new Date(iso).getTime()) / 3600000;
  if (left <= 0) return { text: 'Overdue', color: C.red };
  if (left < 6) return { text: `${Math.ceil(left)} h left`, color: '#FFB547' };
  return { text: `${Math.floor(left)} h left`, color: C.muted };
};

function Action({ icon, label, color = C.ink, onPress, busy }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={busy}
      onPress={() => {
        tap();
        onPress();
      }}
      style={({ pressed }) => [styles.action, { opacity: busy ? 0.5 : pressed ? 0.7 : 1 }]}
    >
      <Icon name={icon} size={16} color={color} />
      <T v="label" c={color} style={{ fontSize: 14 }}>
        {label}
      </T>
    </Pressable>
  );
}

function ReportCard({ r, onResolve, busy }) {
  const open = r.status === 'open';
  const due = open ? dueLabel(r.created_at) : null;
  const who = r.target_name ? `${r.target_name}${r.target_age ? `, ${r.target_age}` : ''}` : r.target_alias || 'Deleted account';
  const ban = () =>
    Alert.alert(
      `Ban ${r.target_name || r.target_alias || 'this account'}?`,
      'They disappear from Discover, lose their matches and chats, and their Lounge posts and comments are removed. They can’t post again.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Ban', style: 'destructive', onPress: () => onResolve(r, 'ban') },
      ],
    );
  return (
    <Card style={{ marginBottom: 12, opacity: open ? 1 : 0.6 }}>
      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
        <Photo uri={r.photo} seed={1} style={{ width: 52, height: 52, borderRadius: 14 }} />
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <T style={{ fontFamily: F.semi }} numberOfLines={1}>
              {who}
            </T>
            {r.target_verified ? <Verified size={14} /> : null}
          </View>
          <T v="small" c={C.muted} numberOfLines={1}>
            {r.target_alias ? `@${r.target_alias} · ` : ''}
            {r.target_reports > 1 ? `${r.target_reports} reports in total` : 'First report'}
          </T>
        </View>
        {due ? (
          <T v="small" c={due.color} style={{ fontFamily: F.semi }}>
            {due.text}
          </T>
        ) : (
          <View style={[styles.badge, { backgroundColor: r.status === 'actioned' ? '#2A1418' : C.surf2 }]}>
            <T v="small" c={r.status === 'actioned' ? C.red : C.muted} style={{ fontSize: 11 }}>
              {r.status === 'actioned' ? 'Actioned' : 'Dismissed'}
            </T>
          </View>
        )}
      </View>

      <View style={styles.reason}>
        <Icon name="shield" size={14} color={C.pinkL} />
        <T v="meta" c={C.ink2} style={{ flex: 1 }}>
          {r.reason || 'No reason given'}
        </T>
      </View>

      {r.post_id ? (
        <View style={styles.post}>
          <T v="small" c={C.faint} style={{ marginBottom: 4 }}>
            LOUNGE POST
          </T>
          {r.post_gone ? (
            <T v="meta" c={C.muted}>
              Already removed
            </T>
          ) : (
            <>
              {r.post_title ? <T style={{ fontFamily: F.semi }}>{r.post_title}</T> : null}
              {r.post_body ? (
                <T v="meta" c={C.ink2} numberOfLines={5}>
                  {r.post_body}
                </T>
              ) : null}
            </>
          )}
        </View>
      ) : r.target_bio ? (
        <T v="meta" c={C.muted} numberOfLines={3} style={{ marginTop: 10 }}>
          “{r.target_bio}”
        </T>
      ) : null}

      <T v="small" c={C.faint} style={{ marginTop: 10 }}>
        Reported by @{r.reporter_alias || 'member'} · {ago(r.created_at)}
        {!open && r.resolution ? ` · ${r.resolution}` : ''}
      </T>

      {open ? (
        <View style={styles.actions}>
          <Action icon="check" label="No violation" busy={busy} onPress={() => onResolve(r, 'dismiss')} />
          {r.post_id && !r.post_gone ? <Action icon="trash" label="Remove post" color="#FFB547" busy={busy} onPress={() => onResolve(r, 'remove_post')} /> : null}
          {r.target && !r.target_banned ? <Action icon="close" label="Ban" color={C.red} busy={busy} onPress={ban} /> : null}
        </View>
      ) : null}
    </Card>
  );
}

const DECLINE_REASONS = ['Photos are unclear or don’t show you', 'The profile is too empty', 'Doesn’t fit what Tonight is for'];

function Application({ a, busy, onDecide }) {
  const { width } = useWindowDimensions();
  const w = Math.min(width - 48 - 12, 300);
  const decline = () =>
    Alert.alert(`Decline ${a.name || 'this application'}?`, 'They see the reason you pick and can improve their profile and apply again.', [
      ...DECLINE_REASONS.map((r) => ({ text: r, onPress: () => onDecide(a, 'rejected', r) })),
      { text: 'No reason', onPress: () => onDecide(a, 'rejected', null) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  const place = a.city ? (a.country ? `${a.city}, ${a.country}` : a.city) : a.country;
  const facts = [a.gender, place, (a.show || []).length ? `Into ${a.show.join(', ').toLowerCase()}` : null].filter(Boolean);
  return (
    <Card style={{ marginBottom: 14, padding: 0, overflow: 'hidden' }}>
      {a.photoUrls.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, padding: 6 }}>
          {a.photoUrls.map((u) => (
            <Photo key={u} uri={u} style={{ width: w, height: w * 1.25, borderRadius: 14 }} />
          ))}
        </ScrollView>
      ) : (
        <View style={{ padding: 14 }}>
          <T v="small" c={C.red}>
            No photos
          </T>
        </View>
      )}
      <View style={{ padding: 14, paddingTop: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <T style={{ fontFamily: F.display, fontSize: 22 }}>
            {a.name || 'No name'}
            {a.age ? `, ${a.age}` : ''}
          </T>
          {a.verified ? <Verified size={16} /> : null}
          <View style={{ flex: 1 }} />
          <T v="small" c={C.muted}>
            {ago(a.applied_at)}
          </T>
        </View>
        <T v="small" c={a.verified ? C.blueL : '#FFB547'} style={{ marginTop: 2 }}>
          {a.verified ? 'Face verified' : 'Not face-verified'}
          {a.reapplied ? ' · Applied again after a decline' : ''}
        </T>
        {facts.length ? (
          <T v="meta" c={C.ink2} style={{ marginTop: 8 }}>
            {facts.join(' · ')}
          </T>
        ) : null}
        {a.bio ? (
          <T c={C.ink2} style={{ marginTop: 8 }}>
            “{a.bio}”
          </T>
        ) : (
          <T v="meta" c={C.muted} style={{ marginTop: 8 }}>
            No bio
          </T>
        )}
        {(a.intents || []).length || (a.turn_ons || []).length ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
            {(a.intents || [])
              .concat(a.turn_ons || [])
              .slice(0, 8)
              .map((t) => (
                <View key={t} style={styles.tag}>
                  <T v="small">{t}</T>
                </View>
              ))}
          </View>
        ) : null}
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
          <Pressable accessibilityRole="button" disabled={busy} onPress={decline} style={({ pressed }) => [styles.decide, { backgroundColor: C.surf2, opacity: busy ? 0.5 : pressed ? 0.7 : 1 }]}>
            <Icon name="close" size={18} color={C.red} />
            <T v="label" c={C.red}>
              Decline
            </T>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={() => {
              tap();
              onDecide(a, 'approved', null);
            }}
            style={({ pressed }) => ({ flex: 1.4, opacity: busy ? 0.5 : pressed ? 0.8 : 1 })}
          >
            <LinearGradient colors={GRAD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.decide, { flex: 0 }]}>
              {busy ? <ActivityIndicator color="#FFFFFF" /> : <Icon name="check" size={18} color="#FFFFFF" stroke={2.4} />}
              <T v="label" c="#FFFFFF">
                Accept
              </T>
            </LinearGradient>
          </Pressable>
        </View>
      </View>
    </Card>
  );
}

function Applications({ refreshKey }) {
  const [apps, setApps] = useState(null);
  const [stats, setStats] = useState(null);
  const [busy, setBusy] = useState(null);
  const load = useCallback(async () => {
    const [list, st] = await Promise.all([api.modApplications(), api.acceptanceStats()]);
    setApps(list);
    setStats(st);
  }, []);
  useEffect(() => {
    // load() only sets state after the network calls resolve.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load, refreshKey]);
  const decide = async (a, decision, note) => {
    setBusy(a.id);
    const ok = await api.modDecide(a.id, decision, note);
    setBusy(null);
    if (!ok) {
      Alert.alert('That didn’t work', 'Check your connection and try again.');
      return;
    }
    success();
    setApps((xs) => xs.filter((x) => x.id !== a.id));
    api.acceptanceStats().then(setStats);
  };
  const rate = stats && stats.decided ? Math.round((stats.approved / stats.decided) * 100) : null;
  return (
    <>
      <View style={styles.statRow}>
        <View style={styles.stat}>
          <T style={{ fontFamily: F.display, fontSize: 22 }}>{apps ? apps.length : '–'}</T>
          <T v="small" c={C.muted}>
            Waiting
          </T>
        </View>
        <View style={styles.stat}>
          <T style={{ fontFamily: F.display, fontSize: 22 }}>{stats ? stats.decided : '–'}</T>
          <T v="small" c={C.muted}>
            Decided
          </T>
        </View>
        <View style={styles.stat}>
          <T style={{ fontFamily: F.display, fontSize: 22 }} c={C.pinkL}>
            {rate === null ? '–' : `${rate}%`}
          </T>
          <T v="small" c={C.muted}>
            Accepted
          </T>
        </View>
      </View>
      <T v="small" c={C.faint} style={{ marginBottom: 14 }}>
        Applicants see this acceptance rate once 30 applications are decided.
      </T>
      {apps === null ? (
        <ActivityIndicator color={C.muted} style={{ marginTop: 40 }} />
      ) : !apps.length ? (
        <Card style={{ alignItems: 'center', paddingVertical: 32, gap: 8 }}>
          <Icon name="check" size={30} color={C.blueL} />
          <T style={{ fontFamily: F.semi }}>No one waiting</T>
          <T v="small" c={C.muted} style={{ textAlign: 'center' }}>
            New applications show up here. You get a notification for each one.
          </T>
        </Card>
      ) : (
        apps.map((a) => <Application key={a.id} a={a} busy={busy === a.id} onDecide={decide} />)
      )}
    </>
  );
}

export function Moderation({ onBack }) {
  const [section, setSection] = useState('apps');
  const [appsKey, setAppsKey] = useState(0);
  const insets = useSafeAreaInsets();
  const [view, setView] = useState('open');
  const [items, setItems] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(null);

  const load = useCallback(async () => {
    const list = await api.modQueue(view === 'all');
    setItems(list);
  }, [view]);

  useEffect(() => {
    // load() only sets state after the network call resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const resolve = async (r, action) => {
    setBusy(r.id);
    const ok = await api.modResolve(r.id, action);
    setBusy(null);
    if (!ok) {
      Alert.alert('That didn’t work', 'Check your connection and try again.');
      return;
    }
    success();
    load();
  };

  const openCount = (items || []).filter((r) => r.status === 'open').length;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 8, paddingHorizontal: 24, paddingBottom: insets.bottom + 32 }}
        refreshControl={
          <RefreshControl
            tintColor={C.muted}
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              if (section === 'apps') setAppsKey((k) => k + 1);
              else await load();
              setRefreshing(false);
            }}
          />
        }
      >
        <Header title="Moderation" onBack={onBack} />
        <View style={styles.sections}>
          {[
            ['apps', 'Applications'],
            ['reports', 'Reports'],
          ].map(([k, label]) => (
            <Pressable
              key={k}
              accessibilityRole="tab"
              accessibilityState={{ selected: section === k }}
              onPress={() => {
                tap();
                setSection(k);
              }}
              style={[styles.section, section === k && styles.sectionOn]}
            >
              <T v="label" c={section === k ? C.ink : C.muted}>
                {label}
              </T>
            </Pressable>
          ))}
        </View>
        {section === 'apps' ? (
          <Applications refreshKey={appsKey} />
        ) : (
          <>
            <T v="meta" c={C.muted} style={{ marginBottom: 14 }}>
              Every report needs an answer within 24 hours. You get a notification for each new one.
            </T>
            <Segmented
              value={view}
              onChange={setView}
              options={[
                { value: 'open', label: openCount && view === 'open' ? `Open · ${openCount}` : 'Open' },
                { value: 'all', label: 'All reports' },
              ]}
            />
            <View style={{ height: 16 }} />
            {items === null ? (
              <ActivityIndicator color={C.muted} style={{ marginTop: 40 }} />
            ) : !items.length ? (
              <Card style={{ alignItems: 'center', paddingVertical: 32, gap: 8 }}>
                <Icon name="shieldCheck" size={30} color={C.blueL} />
                <T style={{ fontFamily: F.semi }}>{view === 'open' ? 'All clear' : 'No reports yet'}</T>
                <T v="small" c={C.muted} style={{ textAlign: 'center' }}>
                  {view === 'open' ? 'Nothing is waiting for review.' : 'Reports from profiles, chats and the Lounge show up here.'}
                </T>
              </Card>
            ) : (
              items.map((r) => <ReportCard key={r.id} r={r} busy={busy === r.id} onResolve={resolve} />)
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  sections: { flexDirection: 'row', gap: 22, borderBottomWidth: 1, borderBottomColor: C.line, marginBottom: 16 },
  section: { paddingVertical: 10, borderBottomWidth: 2, borderBottomColor: 'transparent', marginBottom: -1 },
  sectionOn: { borderBottomColor: C.pink },
  statRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  stat: { flex: 1, backgroundColor: C.surf, borderRadius: 14, paddingVertical: 12, alignItems: 'center' },
  tag: { backgroundColor: C.surf2, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  decide: { flex: 1, height: 50, borderRadius: 25, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  reason: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', marginTop: 12, backgroundColor: C.pinkBg, borderRadius: 12, padding: 10 },
  post: { marginTop: 10, borderLeftWidth: 2, borderLeftColor: C.line || '#2A2430', paddingLeft: 10 },
  badge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  suspendIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#2A1418', alignItems: 'center', justifyContent: 'center' },
  action: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.surf2, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9 },
});

/** Shown instead of the app to an account a moderator banned. */
export function Suspended() {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, paddingTop: insets.top, paddingBottom: insets.bottom }}>
      <View style={styles.suspendIcon}>
        <Icon name="shield" size={30} color={C.red} />
      </View>
      <T style={{ fontFamily: F.display, fontSize: 24, marginTop: 18, textAlign: 'center' }}>Account suspended</T>
      <T v="meta" c={C.muted} style={{ textAlign: 'center', marginTop: 8 }}>
        After reports from other members, our team found that this account broke the Tonight Code. It no longer shows up for anyone.
      </T>
      <T v="small" c={C.faint} style={{ textAlign: 'center', marginTop: 16 }}>
        Think this is a mistake? Email info@fortunas.nl.
      </T>
    </View>
  );
}
