// The Lounge: a social feed (posts, photos, likes, comments) plus the Guides. Design: canvas artboards 15b–15d.
import { useCallback, useEffect, useState } from 'react';
import { Alert, Animated, Image, KeyboardAvoidingView, Modal, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, F, GRAD } from '../theme';
import { Icon, Verified } from '../icons';
import { GUIDES, POSTS } from '../data';
import { Card, LiquidBg, Rise, Segmented, T, Toggle, success, tap } from '../ui';
import { MaskEditor } from './MaskEditor';
import { Grabber, useSwipeDown } from '../sheet';
import * as api from '../backend';

export const TOPICS = [
  { id: 'For you', icon: 'spark' },
  { id: 'Confidence', icon: 'flame' },
  { id: 'First times', icon: 'heart' },
  { id: 'Kink 101', icon: 'mask' },
  { id: 'Health', icon: 'shieldCheck' },
  { id: 'Date night', icon: 'eye' },
];
const POST_TOPICS = TOPICS.slice(1)
  .map((t) => t.id)
  .concat('Stories');

/* ---------- small pieces ---------- */

const AV_GRADS = [
  ['#F0287A', '#FF8A3D'],
  ['#7B3CFF', '#3B7BFF'],
  ['#2BC48A', '#3B7BFF'],
  ['#F0287A', '#7B3CFF'],
  ['#E8B64C', '#F0287A'],
];
const hash = (s = '') => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
const initials = (alias = '?') =>
  alias
    .replace(/[^A-Za-z_ .]/g, '')
    .split(/[_ .]/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('') || '?';

export function AliasAvatar({ alias, size = 40 }) {
  const g = AV_GRADS[hash(alias) % AV_GRADS.length];
  return (
    <LinearGradient colors={g} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center' }}>
      <T c="#FFFFFF" style={{ fontFamily: F.bold, fontSize: Math.round(size * 0.33) }}>
        {initials(alias)}
      </T>
    </LinearGradient>
  );
}

export function timeAgo(iso) {
  if (!iso) return '';
  const m = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.round(h / 24);
  return d < 7 ? `${d}d` : new Date(iso).toLocaleDateString([], { day: 'numeric', month: 'short' });
}

function EducatorTag() {
  return (
    <View style={{ height: 20, paddingHorizontal: 7, borderRadius: 10, backgroundColor: '#111B33', justifyContent: 'center', marginLeft: 2 }}>
      <T c="#6FA8FF" style={{ fontFamily: F.bold, fontSize: 10 }}>
        EDUCATOR
      </T>
    </View>
  );
}

function PostHead({ post, onMore }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <AliasAvatar alias={post.alias} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <T style={{ fontFamily: F.semi, fontSize: 14 }} numberOfLines={1}>
            {post.alias}
          </T>
          {post.verified ? <Verified size={14} /> : null}
          {post.role === 'educator' ? <EducatorTag /> : null}
        </View>
        <T v="small" c={C.muted}>
          {post.topic} · {timeAgo(post.createdAt)}
        </T>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel="More options" onPress={onMore} hitSlop={10} style={{ padding: 4 }}>
        <Icon name="dots" size={20} color={C.muted} />
      </Pressable>
    </View>
  );
}

function SpicyPhoto({ uri, style, revealed, onReveal }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={revealed ? 'Photo' : 'Spicy photo, tap to view'}
      onPress={onReveal}
      style={[{ borderRadius: 14, overflow: 'hidden', backgroundColor: C.surf2 }, style]}
    >
      <Image source={{ uri }} style={StyleSheet.absoluteFill} blurRadius={revealed ? 0 : 50} />
      {revealed ? null : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(20,14,22,0.35)', alignItems: 'center', justifyContent: 'center', gap: 6 }]}>
          <Icon name="eye" size={20} />
          <View style={{ height: 22, paddingHorizontal: 8, borderRadius: 11, backgroundColor: C.pink, justifyContent: 'center' }}>
            <T c="#FFFFFF" style={{ fontFamily: F.bold, fontSize: 10 }}>
              SPICY · TAP TO VIEW
            </T>
          </View>
        </View>
      )}
    </Pressable>
  );
}

/** A poll on a post: tap an option to vote; results show once you voted. */
function Poll({ post }) {
  const [poll, setPoll] = useState(post.poll);
  if (!poll) return null;
  const total = poll.counts.reduce((a, b) => a + b, 0);
  const vote = (i) => {
    tap();
    const prev = poll.mine;
    const next = prev === i ? null : i;
    const counts = poll.counts.map((c, j) => c - (j === prev ? 1 : 0) + (j === next ? 1 : 0));
    setPoll({ ...poll, counts, mine: next });
    if (post.real) api.votePoll(post.id, next);
  };
  const voted = poll.mine !== null && poll.mine !== undefined;
  return (
    <View style={{ gap: 6, marginTop: 10 }}>
      {poll.options.map((o, i) => {
        const pct = total ? Math.round((poll.counts[i] / total) * 100) : 0;
        const on = poll.mine === i;
        return (
          <Pressable
            key={o}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            accessibilityLabel={voted ? `${o}, ${pct} percent` : `Vote ${o}`}
            onPress={() => vote(i)}
            style={[styles.pollOpt, on && { borderColor: C.pink }]}
          >
            {voted ? <View style={[styles.pollFill, { width: `${pct}%` }, on && { backgroundColor: 'rgba(240,40,122,0.22)' }]} /> : null}
            <T style={{ flex: 1, fontFamily: on ? F.semi : F.medium, fontSize: 14 }}>{o}</T>
            {voted ? (
              <T v="small" c={on ? C.pinkL : C.muted} style={{ fontFamily: F.semi }}>
                {pct}%
              </T>
            ) : null}
            {on ? <Icon name="check" size={14} color={C.pinkL} stroke={2.6} /> : null}
          </Pressable>
        );
      })}
      <T v="small" c={C.muted}>
        {total} {total === 1 ? 'vote' : 'votes'}
        {voted ? ' · tap again to change' : ''}
      </T>
    </View>
  );
}

function Photos({ post }) {
  const [revealed, setRevealed] = useState(false);
  if (!post.photos?.length) return null;
  const two = post.photos.length > 1;
  return (
    <View style={{ flexDirection: 'row', gap: 6, marginTop: 10 }}>
      {post.photos
        .slice(0, 2)
        .map((u) =>
          post.spicy ? (
            <SpicyPhoto key={u} uri={u} revealed={revealed} onReveal={() => setRevealed(true)} style={{ flex: 1, height: two ? 168 : 260 }} />
          ) : (
            <Image key={u} source={{ uri: u }} style={{ flex: 1, height: two ? 168 : 260, borderRadius: 14, backgroundColor: C.surf2 }} />
          ),
        )}
    </View>
  );
}

function Actions({ post, onLike, onComments }) {
  return (
    <View style={styles.actions}>
      <Pressable accessibilityRole="button" accessibilityLabel={`Like, ${post.likes} likes`} accessibilityState={{ selected: post.liked }} onPress={onLike} style={styles.act}>
        <Icon name="heart" size={19} color={post.liked ? C.pink : C.muted} fill={post.liked ? C.pink : 'none'} />
        <T v="label" c={post.liked ? C.pinkL : C.muted}>
          {post.likes}
        </T>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel={`${post.comments} comments`} onPress={onComments} style={styles.act}>
        <Icon name="chat" size={19} color={C.muted} />
        <T v="label" c={C.muted}>
          {post.comments}
        </T>
      </Pressable>
      <View style={{ flex: 1 }} />
      <Pressable accessibilityRole="button" accessibilityLabel="Save" onPress={() => tap()} style={styles.act}>
        <Icon name="bookmark" size={19} color={C.muted} />
      </Pressable>
    </View>
  );
}

function moreMenu(post, { onDelete }) {
  const buttons = post.mine ? [{ text: 'Delete post', style: 'destructive', onPress: onDelete }] : [{ text: 'Report', onPress: () => success() }];
  Alert.alert(post.mine ? 'Your post' : 'Post', post.mine ? '' : 'Ward will review it.', [...buttons, { text: 'Cancel', style: 'cancel' }]);
}

export function PostCard({ post, onOpen, onLike, onDelete }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Open post by ${post.alias}`} onPress={onOpen} style={styles.card}>
      <PostHead post={post} onMore={() => moreMenu(post, { onDelete })} />
      {post.title ? <T style={{ fontFamily: F.display, fontSize: 17, marginTop: 12 }}>{post.title}</T> : null}
      {post.body ? (
        <T c="#D9D2D6" numberOfLines={4} style={{ marginTop: post.title ? 6 : 10, fontSize: 14, lineHeight: 20 }}>
          {post.body}
        </T>
      ) : null}
      <Photos post={post} />
      <Poll post={post} />
      {post.expert ? (
        <View style={styles.expert}>
          <AliasAvatar alias={post.expert.alias} size={24} />
          <T v="small" c="#C9D6F2" style={{ flex: 1, lineHeight: 17 }} numberOfLines={2}>
            <T v="small" c="#6FA8FF" style={{ fontFamily: F.bold }}>
              {post.expert.alias}
            </T>{' '}
            replied: “{post.expert.body}”
          </T>
        </View>
      ) : null}
      <Actions post={post} onLike={onLike} onComments={onOpen} />
    </Pressable>
  );
}

const samplePosts = () =>
  POSTS.map((p, i) => ({
    id: p.id,
    real: false,
    alias: p.by,
    verified: true,
    topic: p.topic,
    title: p.title,
    body: '',
    photos: [],
    spicy: false,
    createdAt: new Date(Date.now() - (i + 1) * 3 * 3600 * 1000).toISOString(),
    likes: p.likes,
    comments: p.replies,
    liked: false,
  }));

/* ---------- Feed ---------- */

/** The bell: comments on your posts and replies to your comments. */
function ActivitySheet({ visible, onClose, onOpenPost }) {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState(null);
  const swipe = useSwipeDown(onClose);
  useEffect(() => {
    if (!visible) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setItems(null);
    api.loungeActivity().then(setItems);
  }, [visible]);
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable accessibilityLabel="Close activity" style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' }} onPress={onClose} />
      <Animated.View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }, swipe.style]}>
        <View {...swipe.handlers}>
          <Grabber />
          <T style={{ fontFamily: F.display, fontSize: 22, marginBottom: 6 }}>Activity</T>
        </View>
        <ScrollView style={{ maxHeight: 460 }}>
          {items === null ? (
            <T v="meta" c={C.muted} style={{ paddingVertical: 20 }}>
              Loading…
            </T>
          ) : items.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 30, gap: 6 }}>
              <Icon name="bell" size={26} color={C.muted} />
              <T style={{ fontFamily: F.semi }}>Nothing yet</T>
              <T v="small" c={C.muted} style={{ textAlign: 'center' }}>
                Replies to your posts and comments show up here.
              </T>
            </View>
          ) : (
            items.map((a, i) => (
              <Pressable
                key={`${a.postId}-${i}`}
                accessibilityRole="button"
                onPress={async () => {
                  const post = await api.loadPost(a.postId);
                  onClose();
                  if (post) onOpenPost(post);
                }}
                style={styles.activity}
              >
                <AliasAvatar alias={a.alias} size={36} />
                <View style={{ flex: 1 }}>
                  <T style={{ fontSize: 14, lineHeight: 19 }} numberOfLines={2}>
                    <T style={{ fontFamily: F.semi, fontSize: 14 }}>{a.alias}</T> {a.isReply ? 'replied to you' : 'commented'}: “{a.body}”
                  </T>
                  <T v="small" c={C.muted} numberOfLines={1}>
                    {a.postTitle} · {timeAgo(a.createdAt)}
                  </T>
                </View>
              </Pressable>
            ))
          )}
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}

/** The next Thursday 20:00 (the weekly Live Q&A). */
function nextQA() {
  const d = new Date();
  const add = (4 - d.getDay() + 7) % 7;
  d.setDate(d.getDate() + add);
  d.setHours(20, 0, 0, 0);
  if (d.getTime() < Date.now()) d.setDate(d.getDate() + 7);
  return d;
}

/** A local reminder 15 minutes before the Q&A. Resolves to true when scheduled. */
async function remindQA() {
  try {
    const N = await import('expo-notifications');
    let { status } = await N.getPermissionsAsync();
    if (status !== 'granted') ({ status } = await N.requestPermissionsAsync());
    if (status !== 'granted') return false;
    const at = new Date(nextQA().getTime() - 15 * 60000);
    await N.scheduleNotificationAsync({
      content: { title: 'Live Q&A in 15 minutes', body: 'Ask a sex therapist anything, anonymously. In the Lounge.', data: { kind: 'lounge' } },
      trigger: { type: N.SchedulableTriggerInputTypes.DATE, date: at },
    });
    return true;
  } catch {
    return false;
  }
}

export function Lounge({ onGuide, onOpenPost, onCompose, profile, refreshKey }) {
  const [tab, setTab] = useState('feed');
  const [reminded, setReminded] = useState(false);
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState('');
  const [activity, setActivity] = useState(false);
  const [topic, setTopic] = useState('For you');
  const [posts, setPosts] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const real = await api.loadFeed(topic);
    setPosts(real === null ? samplePosts().filter((p) => topic === 'For you' || p.topic === topic) : real);
  }, [topic]);

  useEffect(() => {
    // load() only sets state after the network call resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load, refreshKey]);

  const like = (p) => {
    tap();
    const on = !p.liked;
    setPosts((list) => list.map((x) => (x.id === p.id ? { ...x, liked: on, likes: x.likes + (on ? 1 : -1) } : x)));
    if (p.real) api.likePost(p.id, on);
  };
  const remove = async (p) => {
    setPosts((list) => list.filter((x) => x.id !== p.id));
    await api.deletePost(p.id);
  };

  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <LiquidBg />
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: 120 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={C.pink}
            onRefresh={async () => {
              setRefreshing(true);
              await load();
              setRefreshing(false);
            }}
          />
        }
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, height: 52 }}>
          <T style={{ flex: 1, fontFamily: F.display, fontSize: 30, letterSpacing: -0.8 }}>The Lounge</T>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={searching ? 'Close search' : 'Search posts'}
            onPress={() => {
              tap();
              setSearching(!searching);
              setQuery('');
              setTab('feed');
            }}
            style={[styles.ib, searching && { backgroundColor: C.pinkBg }]}
          >
            <Icon name={searching ? 'close' : 'search'} size={20} color={searching ? C.pinkL : C.ink} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Activity"
            onPress={() => {
              tap();
              setActivity(true);
            }}
            style={styles.ib}
          >
            <Icon name="bell" size={20} />
          </Pressable>
        </View>
        {searching ? (
          <View style={[styles.search, { marginTop: 8 }]}>
            <Icon name="search" size={18} color={C.muted} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              autoFocus
              placeholder="Search posts"
              placeholderTextColor={C.faint}
              style={{ flex: 1, color: C.ink, fontFamily: F.body, fontSize: 15 }}
              accessibilityLabel="Search posts"
              selectionColor={C.pink}
            />
          </View>
        ) : null}
        <ActivitySheet visible={activity} onClose={() => setActivity(false)} onOpenPost={onOpenPost} />
        <View style={{ marginTop: 6 }}>
          <Segmented
            value={tab}
            onChange={setTab}
            options={[
              { value: 'feed', label: 'Feed' },
              { value: 'guides', label: 'Guides' },
            ]}
          />
        </View>

        {tab === 'feed' ? (
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingVertical: 2 }} style={{ marginTop: 14, marginHorizontal: -16 }}>
              <View style={{ width: 10 }} />
              {TOPICS.map((t) => {
                const on = topic === t.id;
                return (
                  <Pressable
                    key={t.id}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                    onPress={() => {
                      tap();
                      setTopic(t.id);
                    }}
                    style={{ alignItems: 'center', gap: 6, width: 66 }}
                  >
                    {on ? (
                      <LinearGradient colors={[C.pink, C.blue]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.topicRing}>
                        <View style={[styles.topic, { borderWidth: 0, width: 52, height: 52, borderRadius: 26 }]}>
                          <Icon name={t.icon} size={22} />
                        </View>
                      </LinearGradient>
                    ) : (
                      <View style={styles.topic}>
                        <Icon name={t.icon} size={22} />
                      </View>
                    )}
                    <T v="small" c={on ? C.ink : C.muted} numberOfLines={1} style={{ fontFamily: on ? F.semi : F.medium, fontSize: 11 }}>
                      {t.id}
                    </T>
                  </Pressable>
                );
              })}
              <View style={{ width: 10 }} />
            </ScrollView>

            <Pressable accessibilityRole="button" accessibilityLabel="Write a post" onPress={onCompose} style={styles.composeBar}>
              {profile?.photos?.[0] ? (
                <Image source={{ uri: profile.photos[0] }} style={{ width: 36, height: 36, borderRadius: 18 }} blurRadius={profile.blurFace ? 20 : 0} />
              ) : (
                <AliasAvatar alias={profile?.name || 'You'} size={36} />
              )}
              <T c={C.muted} style={{ flex: 1 }}>
                Share something{profile?.name ? `, ${profile.name}` : ''}…
              </T>
              <View style={styles.composeIcon}>
                <Icon name="image" size={19} color={C.blueL} />
              </View>
            </Pressable>

            <LinearGradient
              colors={['rgba(240,40,122,0.16)', 'rgba(59,123,255,0.12)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.card, { borderColor: '#2E3A66', flexDirection: 'row', gap: 12, alignItems: 'center', paddingBottom: 12, paddingTop: 12 }]}
            >
              <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: C.pink, alignItems: 'center', justifyContent: 'center' }}>
                <T c="#FFFFFF" style={{ fontFamily: F.semi, fontSize: 10, lineHeight: 12 }}>
                  THU
                </T>
                <T c="#FFFFFF" style={{ fontFamily: F.display, fontSize: 17, lineHeight: 20 }}>
                  {nextQA().getDate()}
                </T>
              </View>
              <View style={{ flex: 1 }}>
                <T c="#FF9EC8" style={{ fontFamily: F.bold, fontSize: 11 }}>
                  LIVE Q&A · 20:00
                </T>
                <T style={{ fontFamily: F.semi, fontSize: 14, lineHeight: 19 }}>Ask a sex therapist anything, anonymously</T>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={reminded ? 'Reminder set' : 'Remind me'}
                onPress={async () => {
                  const ok = await remindQA();
                  if (ok) {
                    success();
                    setReminded(true);
                  } else Alert.alert('Turn on notifications', 'Allow notifications for Tonight to get a reminder.');
                }}
                style={{
                  height: 32,
                  paddingHorizontal: 12,
                  borderRadius: 16,
                  backgroundColor: reminded ? C.greenBg : C.ink,
                  justifyContent: 'center',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                {reminded ? <Icon name="check" size={13} color={C.green} stroke={2.6} /> : null}
                <T v="small" c={reminded ? C.green : C.bg} style={{ fontFamily: F.semi }}>
                  {reminded ? 'Reminder set' : 'Remind me'}
                </T>
              </Pressable>
            </LinearGradient>

            {posts === null ? (
              <T v="meta" c={C.muted} style={{ textAlign: 'center', marginTop: 30 }}>
                Loading the Lounge…
              </T>
            ) : posts.length === 0 ? (
              <Card style={{ marginTop: 14, alignItems: 'center', gap: 6, paddingVertical: 26 }}>
                <Icon name="chat" size={26} color={C.muted} />
                <T style={{ fontFamily: F.semi }}>Nothing in {topic} yet</T>
                <T v="small" c={C.muted}>
                  Be the first to start the conversation.
                </T>
              </Card>
            ) : (
              posts
                .filter((p) => {
                  const q = query.trim().toLowerCase();
                  return !q || `${p.title || ''} ${p.body || ''} ${p.alias} ${p.topic}`.toLowerCase().includes(q);
                })
                .map((p, i) => (
                  <Rise key={p.id} delay={Math.min(i, 5) * 60}>
                    <PostCard
                      post={p}
                      onOpen={() => (p.real ? onOpenPost(p) : Alert.alert('Example post', 'Example posts are shown while you are offline.'))}
                      onLike={() => like(p)}
                      onDelete={() => remove(p)}
                    />
                  </Rise>
                ))
            )}
          </>
        ) : (
          <GuidesTab onGuide={onGuide} />
        )}
      </ScrollView>

      {tab === 'feed' ? (
        <Pressable accessibilityRole="button" accessibilityLabel="New post" onPress={onCompose} style={styles.fabWrap}>
          <LinearGradient colors={[C.pink, C.blue]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.fab}>
            <Icon name="plus" size={26} color="#FFFFFF" stroke={2.6} />
          </LinearGradient>
        </Pressable>
      ) : null}
    </View>
  );
}

/* ---------- Guides (canvas artboard 17) ---------- */

const CAT_STYLE = {
  'Talking & consent': { icon: 'chat', colors: ['#3B7BFF', '#7B3CFF'] },
  'Sexual health': { icon: 'shieldCheck', colors: ['#2BC48A', '#3B7BFF'] },
  Aftercare: { icon: 'heart', colors: ['#F0287A', '#FF8A3D'] },
  'First meet': { icon: 'pin', colors: ['#F0287A', '#7B3CFF'] },
};
const catStyle = (cat) => CAT_STYLE[cat] || { icon: 'book', colors: [C.pink, C.blue] };

function GuidesTab({ onGuide }) {
  const [query, setQuery] = useState('');
  const [cat, setCat] = useState(null);
  const cats = [...new Set(GUIDES.map((g) => g.cat))];
  const q = query.trim().toLowerCase();
  const list = GUIDES.filter((g) => (!cat || g.cat === cat) && (!q || g.title.toLowerCase().includes(q) || g.cat.toLowerCase().includes(q)));
  const featured = GUIDES[0];
  const fs = catStyle(featured.cat);
  return (
    <View>
      <View style={styles.search}>
        <Icon name="search" size={18} color={C.muted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Tips, health, aftercare…"
          placeholderTextColor={C.faint}
          style={{ flex: 1, color: C.ink, fontFamily: F.body, fontSize: 15 }}
          accessibilityLabel="Search guides"
          selectionColor={C.pink}
        />
        {query ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Clear search" onPress={() => setQuery('')} hitSlop={8}>
            <Icon name="close" size={14} color={C.muted} stroke={2.4} />
          </Pressable>
        ) : null}
      </View>

      {!q && !cat ? (
        <Rise>
          <Pressable accessibilityRole="button" accessibilityLabel={`Guide of the week: ${featured.title}`} onPress={() => onGuide(featured)}>
            <LinearGradient colors={['#4A1238', '#2A1A5A', '#14285A']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.featured}>
              <View style={[styles.featuredGlow, { backgroundColor: fs.colors[0] }]} />
              <View style={styles.featuredBadge}>
                <Icon name="spark" size={12} color="#FFD27A" />
                <T c="#FFD27A" style={{ fontFamily: F.bold, fontSize: 10, letterSpacing: 0.6 }}>
                  GUIDE OF THE WEEK
                </T>
              </View>
              <T style={{ fontFamily: F.display, fontSize: 24, lineHeight: 29, marginTop: 14, maxWidth: '88%' }}>{featured.title}</T>
              <T v="small" c={C.ink2} style={{ marginTop: 6 }}>
                {featured.cat} · {featured.mins} min read
              </T>
              <View style={styles.readBtn}>
                <T v="label" c={C.bg}>
                  Start reading
                </T>
                <Icon name="chev" size={14} color={C.bg} stroke={2.4} />
              </View>
            </LinearGradient>
          </Pressable>
        </Rise>
      ) : null}

      <T style={{ fontFamily: F.display, fontSize: 17, marginTop: 20 }}>Browse by topic</T>
      <View style={styles.tiles}>
        {cats.map((c, i) => {
          const st = catStyle(c);
          const on = cat === c;
          const count = GUIDES.filter((g) => g.cat === c).length;
          return (
            <Rise key={c} delay={i * 50} style={{ width: '48.5%' }}>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                onPress={() => {
                  tap();
                  setCat(on ? null : c);
                }}
                style={[styles.tile, on && { borderColor: st.colors[0] }]}
              >
                <LinearGradient colors={st.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.tileIcon}>
                  <Icon name={st.icon} size={18} color="#FFFFFF" />
                </LinearGradient>
                <View style={{ flex: 1 }}>
                  <T style={{ fontFamily: F.semi, fontSize: 14, lineHeight: 18 }} numberOfLines={2}>
                    {c}
                  </T>
                  <T v="small" c={C.muted}>
                    {count} {count === 1 ? 'guide' : 'guides'}
                  </T>
                </View>
                {on ? <Icon name="check" size={16} color={st.colors[0]} stroke={2.6} /> : null}
              </Pressable>
            </Rise>
          );
        })}
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 20 }}>
        <T style={{ fontFamily: F.display, fontSize: 17 }}>{cat || (q ? 'Results' : 'Popular this week')}</T>
        {cat ? (
          <Pressable accessibilityRole="button" onPress={() => setCat(null)} hitSlop={8}>
            <T v="small" c={C.pinkL} style={{ fontFamily: F.semi }}>
              Show all
            </T>
          </Pressable>
        ) : null}
      </View>
      {list.length === 0 ? (
        <T v="meta" c={C.muted} style={{ marginTop: 12 }}>
          No guides match “{query}”.
        </T>
      ) : (
        list.map((g, i) => {
          const st = catStyle(g.cat);
          return (
            <Rise key={g.id} delay={i * 50}>
              <Pressable accessibilityRole="button" onPress={() => onGuide(g)} style={[styles.guideRow, i === list.length - 1 && { borderBottomWidth: 0 }]}>
                <T style={{ fontFamily: F.displayX, fontSize: 20, width: 22, color: i % 2 ? C.blue : C.pink }}>{i + 1}</T>
                <View style={{ flex: 1 }}>
                  <T style={{ fontFamily: F.semi, fontSize: 15, lineHeight: 20 }}>{g.title}</T>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                    <Icon name={st.icon} size={13} color={st.colors[0]} />
                    <T v="small" c={C.muted}>
                      {g.cat} · {g.mins} min
                    </T>
                  </View>
                </View>
                <Icon name="chev" size={16} color={C.muted} />
              </Pressable>
            </Rise>
          );
        })
      )}
    </View>
  );
}

/* ---------- New post ---------- */

export function Compose({ onClose, onPosted }) {
  const [alias, setAlias] = useState(null);
  const [topic, setTopic] = useState('Confidence');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [photos, setPhotos] = useState([]);
  const [spicy, setSpicy] = useState(false);
  const [poll, setPoll] = useState(null); // null, or a list of option texts
  const [masking, setMasking] = useState(false);
  const [busy, setBusy] = useState(false);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    api.myAlias().then(setAlias);
  }, []);

  const add = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, selectionLimit: 4 - photos.length, quality: 0.8 });
    if (!res.canceled) setPhotos([...photos, ...res.assets.map((a) => a.uri)].slice(0, 4));
  };

  const pollOk = !poll || poll.filter((o) => o.trim()).length >= 2;
  const canPost = (title.trim() || body.trim() || photos.length) && pollOk && !busy;
  const post = async () => {
    if (!canPost) return;
    setBusy(true);
    const id = await api.createPost({ topic, title: title.trim(), body: body.trim(), photos, spicy, poll: poll ? poll.map((o) => o.trim()).filter(Boolean) : null });
    setBusy(false);
    if (!id) {
      Alert.alert('Could not post', 'Check your connection and try again.');
      return;
    }
    success();
    onPosted(id);
  };

  if (masking && photos.length) {
    return (
      <MaskEditor
        photos={photos}
        start={0}
        onCancel={() => setMasking(false)}
        onDone={(results) => {
          if (results.length) {
            const next = [...photos];
            for (const r of results) next[r.index] = r.uri;
            setPhotos(next);
          }
          setMasking(false);
        }}
      />
    );
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: C.bg }}>
      <LiquidBg />
      <View style={[styles.head, { paddingTop: insets.top + 4 }]}>
        <Pressable accessibilityRole="button" onPress={onClose} hitSlop={10}>
          <T c={C.muted} style={{ fontFamily: F.medium }}>
            Cancel
          </T>
        </Pressable>
        <T style={{ fontFamily: F.semi, fontSize: 16 }}>New post</T>
        <Pressable accessibilityRole="button" accessibilityState={{ disabled: !canPost }} onPress={post} disabled={!canPost}>
          <LinearGradient colors={GRAD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.postBtn, !canPost && { opacity: 0.4 }]}>
            <T c="#FFFFFF" style={{ fontFamily: F.semi, fontSize: 14 }}>
              {busy ? 'Posting…' : 'Post'}
            </T>
          </LinearGradient>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120 }} keyboardShouldPersistTaps="handled">
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 }}>
          <AliasAvatar alias={alias || '?'} />
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <T style={{ fontFamily: F.semi }}>{alias || '…'}</T>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Icon name="lock" size={12} color={C.blueL} />
              <T v="small" c={C.blueL}>
                Posting under your alias, never your name
              </T>
            </View>
          </View>
        </View>
        <T v="label" c={C.muted} style={{ marginTop: 20 }}>
          Topic
        </T>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
          {POST_TOPICS.map((t) => {
            const on = topic === t;
            return (
              <Pressable
                key={t}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                onPress={() => {
                  tap();
                  setTopic(t);
                }}
                style={[styles.pill, on && { backgroundColor: C.pink, borderColor: C.pink }]}
              >
                <T v="label" c={on ? '#FFFFFF' : C.ink} style={{ fontFamily: on ? F.semi : F.medium }}>
                  {t}
                </T>
              </Pressable>
            );
          })}
        </View>
        <TextInput value={title} onChangeText={setTitle} placeholder="Title (optional)" placeholderTextColor={C.faint} multiline maxLength={200} style={styles.titleInput} accessibilityLabel="Title" />
        <TextInput
          value={body}
          onChangeText={setBody}
          placeholder="What's on your mind?"
          placeholderTextColor={C.faint}
          multiline
          maxLength={5000}
          style={styles.bodyInput}
          accessibilityLabel="Your post"
        />
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          {photos.map((u, i) => (
            <View key={u} style={styles.thumb}>
              <Image source={{ uri: u }} style={StyleSheet.absoluteFill} blurRadius={spicy ? 25 : 0} />
              <Pressable accessibilityRole="button" accessibilityLabel={`Remove photo ${i + 1}`} onPress={() => setPhotos(photos.filter((x) => x !== u))} hitSlop={6} style={styles.thumbX}>
                <Icon name="close" size={11} color={C.ink} stroke={3} />
              </Pressable>
            </View>
          ))}
          {photos.length < 4 ? (
            <Pressable accessibilityRole="button" accessibilityLabel="Add photo" onPress={add} style={[styles.thumb, styles.thumbAdd]}>
              <Icon name="plus" size={22} color={C.muted} />
            </Pressable>
          ) : null}
        </View>
        {poll ? (
          <View style={styles.pollEdit}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <T style={{ flex: 1, fontFamily: F.semi }}>Poll</T>
              <Pressable accessibilityRole="button" onPress={() => setPoll(null)} hitSlop={8}>
                <T v="small" c={C.pinkL} style={{ fontFamily: F.semi }}>
                  Remove poll
                </T>
              </Pressable>
            </View>
            {poll.map((o, i) => (
              <TextInput
                key={i}
                value={o}
                onChangeText={(t) => setPoll(poll.map((x, j) => (j === i ? t.slice(0, 60) : x)))}
                placeholder={`Option ${i + 1}`}
                placeholderTextColor={C.faint}
                style={styles.pollInput}
                accessibilityLabel={`Poll option ${i + 1}`}
              />
            ))}
            {poll.length < 4 ? (
              <Pressable accessibilityRole="button" onPress={() => setPoll([...poll, ''])} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6 }}>
                <Icon name="plus" size={14} color={C.pinkL} stroke={2.4} />
                <T v="small" c={C.pinkL} style={{ fontFamily: F.semi }}>
                  Add option
                </T>
              </Pressable>
            ) : null}
          </View>
        ) : null}
        <View style={styles.optCard}>
          <View style={[styles.optRow, { borderBottomWidth: 1, borderBottomColor: C.line }]}>
            <View style={{ flex: 1 }}>
              <T style={{ fontFamily: F.medium }}>Spicy photo</T>
              <T v="small" c={C.muted}>
                Arrives blurred until someone taps it
              </T>
            </View>
            <Toggle value={spicy} onChange={setSpicy} label="Spicy photo" />
          </View>
          <View style={styles.optRow}>
            <View style={{ flex: 1 }}>
              <T style={{ fontFamily: F.medium }}>Hide faces in my photos</T>
              <T v="small" c={C.muted}>
                Put a mask on, placed automatically
              </T>
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                if (!photos.length) {
                  Alert.alert('Add a photo first', 'Pick a photo, then choose a mask.');
                  return;
                }
                tap();
                setMasking(true);
              }}
            >
              <LinearGradient colors={GRAD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.maskBtn}>
                <T v="small" c="#FFFFFF" style={{ fontFamily: F.semi }}>
                  Add mask
                </T>
              </LinearGradient>
            </Pressable>
          </View>
        </View>
      </ScrollView>
      <View style={[styles.composeFoot, { paddingBottom: insets.bottom + 10 }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Add photo" onPress={add} style={styles.ib}>
          <Icon name="image" size={20} color={C.blueL} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={poll ? 'Remove poll' : 'Add a poll'}
          onPress={() => {
            tap();
            setPoll(poll ? null : ['', '']);
          }}
          style={[styles.ib, poll && { backgroundColor: C.violetBg }]}
        >
          <Icon name="poll" size={20} color={C.violetL} stroke={2.2} />
        </Pressable>
        <View style={{ flex: 1 }} />
        <Icon name="shieldCheck" size={14} color={C.blueL} />
        <T v="small" c={C.muted}>
          Ward checks every post
        </T>
      </View>
    </KeyboardAvoidingView>
  );
}

/* ---------- Post and comments ---------- */

function Comment({ c, reply, onLike, onReply }) {
  return (
    <View style={{ flexDirection: 'row', gap: 10, paddingVertical: 8, paddingLeft: reply ? 46 : 0 }}>
      <AliasAvatar alias={c.alias} size={reply ? 28 : 34} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={styles.bubble}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
            <T style={{ fontFamily: F.semi, fontSize: 13 }}>{c.alias}</T>
            {c.verified ? <Verified size={13} /> : null}
            {c.role === 'educator' ? <EducatorTag /> : null}
            <T v="small" c={C.muted}>
              · {timeAgo(c.createdAt)}
            </T>
          </View>
          <T c="#E6DFE3" style={{ fontSize: 14, lineHeight: 20, marginTop: 3 }}>
            {c.body}
          </T>
        </View>
        <View style={{ flexDirection: 'row', gap: 16, marginTop: 4, marginLeft: 8, alignItems: 'center' }}>
          <Pressable accessibilityRole="button" accessibilityLabel={`Like comment, ${c.likes} likes`} onPress={onLike} hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Icon name="heart" size={15} color={c.liked ? C.pink : C.muted} fill={c.liked ? C.pink : 'none'} />
            <T v="small" c={C.muted}>
              {c.likes}
            </T>
          </Pressable>
          {!reply ? (
            <Pressable accessibilityRole="button" onPress={onReply} hitSlop={8}>
              <T v="small" c={C.muted} style={{ fontFamily: F.semi }}>
                Reply
              </T>
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}

export function PostView({ post: initial, onBack }) {
  const insets = useSafeAreaInsets();
  const [post, setPost] = useState(initial);
  const [comments, setComments] = useState(null);
  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    const [p, cs] = await Promise.all([api.loadPost(initial.id), api.loadComments(initial.id)]);
    if (p) setPost(p);
    setComments(cs);
  }, [initial.id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const likePost = () => {
    tap();
    const on = !post.liked;
    setPost({ ...post, liked: on, likes: post.likes + (on ? 1 : -1) });
    api.likePost(post.id, on);
  };
  const likeComment = (c) => {
    tap();
    const on = !c.liked;
    setComments((cs) => cs.map((x) => (x.id === c.id ? { ...x, liked: on, likes: x.likes + (on ? 1 : -1) } : x)));
    api.likeComment(c.id, on);
  };
  const send = async () => {
    const t = text.trim();
    if (!t || sending) return;
    setSending(true);
    const id = await api.addComment(post.id, t, replyTo?.id || null);
    setSending(false);
    if (!id) {
      Alert.alert('Could not comment', 'Check your connection and try again.');
      return;
    }
    tap();
    setText('');
    setReplyTo(null);
    setPost((p) => ({ ...p, comments: p.comments + 1 }));
    load();
  };

  const top = (comments || []).filter((c) => !c.parentId);
  const repliesOf = (id) => (comments || []).filter((c) => c.parentId === id);

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: C.bg }}>
      <LiquidBg />
      <View style={[styles.head, { paddingTop: insets.top + 4, justifyContent: 'flex-start', gap: 6 }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={onBack} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginLeft: -12 }}>
          <Icon name="back" size={22} />
        </Pressable>
        <T style={{ fontFamily: F.semi, fontSize: 16 }}>Post</T>
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 30 }} keyboardShouldPersistTaps="handled">
        <PostHead
          post={post}
          onMore={() =>
            moreMenu(post, {
              onDelete: async () => {
                await api.deletePost(post.id);
                onBack(true);
              },
            })
          }
        />
        {post.title ? <T style={{ fontFamily: F.display, fontSize: 21, marginTop: 12 }}>{post.title}</T> : null}
        {post.body ? (
          <T c="#D9D2D6" style={{ fontSize: 15, lineHeight: 22, marginTop: 8 }}>
            {post.body}
          </T>
        ) : null}
        <Photos post={post} />
        <Poll post={post} />
        <Actions post={post} onLike={likePost} onComments={() => {}} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
          <T style={{ fontFamily: F.semi }}>{post.comments === 1 ? '1 comment' : `${post.comments} comments`}</T>
          <T v="small" c={C.muted}>
            Oldest first
          </T>
        </View>
        {comments === null ? (
          <T v="meta" c={C.muted} style={{ marginTop: 16 }}>
            Loading comments…
          </T>
        ) : top.length === 0 ? (
          <T v="meta" c={C.muted} style={{ marginTop: 16 }}>
            No comments yet. Say something kind.
          </T>
        ) : (
          top.map((c) => (
            <View key={c.id}>
              <Comment c={c} onLike={() => likeComment(c)} onReply={() => setReplyTo(c)} />
              {repliesOf(c.id).map((r) => (
                <Comment key={r.id} c={r} reply onLike={() => likeComment(r)} />
              ))}
            </View>
          ))
        )}
      </ScrollView>
      <View style={[styles.commentBar, { paddingBottom: insets.bottom + 10 }]}>
        {replyTo ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <T v="small" c={C.muted} style={{ flex: 1 }}>
              Replying to {replyTo.alias}
            </T>
            <Pressable accessibilityRole="button" onPress={() => setReplyTo(null)} hitSlop={8}>
              <T v="small" c={C.pinkL} style={{ fontFamily: F.semi }}>
                Cancel
              </T>
            </Pressable>
          </View>
        ) : null}
        <View style={styles.commentPill}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Add a comment…"
            placeholderTextColor={C.faint}
            style={{ flex: 1, color: C.ink, fontFamily: F.body, fontSize: 15 }}
            multiline
            maxLength={2000}
            accessibilityLabel="Add a comment"
          />
          <Pressable accessibilityRole="button" accessibilityLabel="Send" onPress={send} disabled={!text.trim() || sending}>
            <LinearGradient colors={[C.pink, C.blue]} style={[styles.send, (!text.trim() || sending) && { opacity: 0.4 }]}>
              <Icon name="send" size={16} color="#FFFFFF" stroke={2.2} />
            </LinearGradient>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: '#2E2830',
    backgroundColor: C.surf3,
    paddingHorizontal: 16,
    marginTop: 14,
  },
  featured: { marginTop: 14, borderRadius: 24, padding: 18, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  featuredGlow: { position: 'absolute', right: -60, top: -60, width: 180, height: 180, borderRadius: 90, opacity: 0.35 },
  featuredBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', height: 24, paddingHorizontal: 9, borderRadius: 12, backgroundColor: 'rgba(14,12,16,0.45)' },
  readBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', height: 38, paddingHorizontal: 16, borderRadius: 19, backgroundColor: C.ink, marginTop: 16 },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10, marginTop: 10 },
  tile: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 72, padding: 12, borderRadius: 18, backgroundColor: '#151217', borderWidth: 1.5, borderColor: C.line },
  tileIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  guideRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.line },
  sheet: { backgroundColor: '#141116', borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 10, borderWidth: 1, borderColor: C.line },
  grab: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: '#3A3439', marginBottom: 12 },
  activity: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.line },
  pollOpt: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 42, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1.5, borderColor: '#3A3439', overflow: 'hidden' },
  pollFill: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: 'rgba(255,255,255,0.06)' },
  pollEdit: { marginTop: 14, padding: 14, borderRadius: 16, backgroundColor: '#151217', borderWidth: 1, borderColor: C.line },
  pollInput: { height: 44, borderRadius: 12, borderWidth: 1, borderColor: C.line2, backgroundColor: C.surf3, color: C.ink, paddingHorizontal: 12, fontFamily: F.body, fontSize: 15, marginBottom: 6 },
  ib: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.surf2, alignItems: 'center', justifyContent: 'center' },
  card: { backgroundColor: '#151217', borderWidth: 1, borderColor: C.line, borderRadius: 20, paddingHorizontal: 14, paddingTop: 14, paddingBottom: 4, marginTop: 10 },
  actions: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: C.line, marginTop: 12 },
  act: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 42, paddingHorizontal: 8 },
  expert: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, padding: 8, borderRadius: 12, backgroundColor: '#111B33' },
  topic: { width: 56, height: 56, borderRadius: 28, backgroundColor: C.surf2, borderWidth: 2, borderColor: '#2E2830', alignItems: 'center', justifyContent: 'center' },
  topicRing: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  composeBar: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14, padding: 10, paddingLeft: 12, backgroundColor: '#151217', borderWidth: 1, borderColor: C.line, borderRadius: 18 },
  composeIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: C.surf2, alignItems: 'center', justifyContent: 'center' },
  fabWrap: { position: 'absolute', right: 18, bottom: 22, borderRadius: 29, shadowColor: '#7B3CFF', shadowOpacity: 0.5, shadowRadius: 16, shadowOffset: { width: 0, height: 8 } },
  fab: { width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center' },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 6 },
  postBtn: { height: 34, paddingHorizontal: 16, borderRadius: 17, justifyContent: 'center' },
  pill: { height: 36, paddingHorizontal: 14, borderRadius: 18, borderWidth: 1.5, borderColor: '#3A3439', justifyContent: 'center' },
  titleInput: { marginTop: 18, color: C.ink, fontFamily: F.display, fontSize: 22, lineHeight: 28, padding: 0 },
  bodyInput: { marginTop: 10, minHeight: 90, color: '#D9D2D6', fontFamily: F.body, fontSize: 15, lineHeight: 22, padding: 0, textAlignVertical: 'top', marginBottom: 12 },
  thumb: { width: 92, height: 112, borderRadius: 14, overflow: 'hidden', backgroundColor: C.surf2 },
  thumbAdd: { borderWidth: 1.5, borderStyle: 'dashed', borderColor: '#4A4148', backgroundColor: C.surf3, alignItems: 'center', justifyContent: 'center' },
  thumbX: { position: 'absolute', top: 6, right: 6, width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(14,12,16,0.75)', alignItems: 'center', justifyContent: 'center' },
  optCard: { marginTop: 16, backgroundColor: '#151217', borderWidth: 1, borderColor: C.line, borderRadius: 16 },
  optRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  maskBtn: { height: 34, paddingHorizontal: 12, borderRadius: 17, justifyContent: 'center' },
  composeFoot: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 20, paddingTop: 10, borderTopWidth: 1, borderTopColor: C.line, backgroundColor: C.bg },
  bubble: {
    backgroundColor: '#151217',
    borderWidth: 1,
    borderColor: C.line,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 16,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  commentBar: { paddingHorizontal: 16, paddingTop: 10, borderTopWidth: 1, borderTopColor: C.line, backgroundColor: C.bg },
  commentPill: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, borderRadius: 22, backgroundColor: C.surf2, paddingLeft: 14, paddingRight: 6, paddingVertical: 4 },
  send: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
});
