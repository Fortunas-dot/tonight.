// Everything that talks to Supabase. Screens get plain objects in the same shape as the sample data.
import { File } from 'expo-file-system';
import { supabase } from './lib/supabase';

const BUCKET = 'photos';
const URL_TTL = 60 * 60 * 24; // signed photo links last a day

let uid = null;
export const myId = () => uid;

/** Signs in (anonymously, kept on the device) and returns the user id, or null when offline. */
export async function ensureSession() {
  try {
    const { data } = await supabase.auth.getSession();
    if (data.session) {
      // Check the saved login still exists on the server (an account can be removed); otherwise start fresh.
      const { data: who, error: whoErr } = await supabase.auth.getUser();
      if (!whoErr && who?.user) {
        uid = who.user.id;
        return uid;
      }
      await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
    }
    const { data: signed, error } = await supabase.auth.signInAnonymously();
    if (error) throw error;
    uid = signed.user.id;
    return uid;
  } catch (e) {
    console.warn('[backend] sign-in failed', e?.message || e);
    return null;
  }
}

/* ---------- Photos ---------- */

async function signedUrls(paths) {
  if (!paths?.length) return [];
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrls(paths, URL_TTL);
  if (error) return [];
  return data.map((d) => d.signedUrl).filter(Boolean);
}

/** Uploads any local photo that is not in the bucket yet. Returns { paths, uploaded }. */
async function uploadPhotos(photos = [], uploaded = {}) {
  const next = { ...uploaded };
  const paths = [];
  for (const uri of photos) {
    if (next[uri]) {
      paths.push(next[uri]);
      continue;
    }
    if (!/^(file|content|ph|assets-library):/.test(uri)) continue;
    const ext = (uri.split('?')[0].split('.').pop() || 'jpg').toLowerCase();
    const type = ext === 'png' ? 'image/png' : ext === 'heic' ? 'image/heic' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
    const path = `${uid}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext === 'jpeg' ? 'jpg' : ext}`;
    try {
      const body = await new File(uri).arrayBuffer();
      const { error } = await supabase.storage.from(BUCKET).upload(path, body, { contentType: type, upsert: false });
      if (error) throw error;
      next[uri] = path;
      paths.push(path);
    } catch (e) {
      console.warn('[backend] photo upload failed', e?.message || e);
    }
  }
  return { paths, uploaded: next };
}

/* ---------- My profile ---------- */

// Saves run one at a time, so a cleanup never removes a photo another save just uploaded.
let saving = Promise.resolve();

/** Saves the local profile to Supabase. Returns the updated `uploaded` map for photos. */
export function saveProfile(profile, onboarded) {
  const run = saving.then(() => saveProfileNow(profile, onboarded));
  saving = run.catch(() => {});
  return run;
}

async function saveProfileNow(profile, onboarded) {
  if (!uid) return profile.uploaded || {};
  const { paths, uploaded } = await uploadPhotos(profile.photos, profile.uploaded);
  const row = {
    id: uid,
    name: profile.name ?? null,
    age: profile.age ?? null,
    gender: profile.gender ?? null,
    show: profile.show ?? [],
    intents: profile.intents ?? [],
    boundaries: profile.boundaries ?? {},
    turn_ons: profile.turnOns ?? [],
    bio: profile.bio || null,
    country: profile.country || null,
    city: profile.city || null,
    settings: profile.settings ?? {},
    paused: !!profile.settings?.paused,
    prompt: profile.prompt ?? null,
    photos: paths,
    blur_face: !!profile.blurFace,
    verified: !!profile.verified,
    discretion: profile.discretion ?? {},
    onboarded: !!onboarded,
    live_until: onboarded ? new Date(Date.now() + 6 * 3600 * 1000).toISOString() : null,
  };
  const { error } = await supabase.from('profiles').upsert(row);
  if (error) {
    console.warn('[backend] save profile failed', error.message);
    return uploaded;
  }
  // Delete photos that are no longer on the profile, such as the bare-face original of a photo that now wears a mask.
  try {
    const { data: files } = await supabase.storage.from(BUCKET).list(uid, { limit: 100 });
    const stale = (files || []).map((f) => `${uid}/${f.name}`).filter((p) => !paths.includes(p));
    if (stale.length) await supabase.storage.from(BUCKET).remove(stale);
    for (const [k, v] of Object.entries(uploaded)) if (stale.includes(v)) delete uploaded[k];
  } catch (e) {
    console.warn('[backend] photo cleanup failed', e?.message || e);
  }
  return uploaded;
}

/** Loads my saved profile (for a fresh install on the same account). */
export async function loadMyProfile() {
  if (!uid) return null;
  const { data } = await supabase.from('profiles').select('*').eq('id', uid).maybeSingle();
  if (!data) return null;
  const urls = await signedUrls(data.photos);
  return {
    onboarded: data.onboarded,
    profile: {
      name: data.name,
      age: data.age,
      gender: data.gender,
      show: data.show,
      intents: data.intents,
      boundaries: data.boundaries,
      turnOns: data.turn_ons,
      bio: data.bio,
      country: data.country,
      city: data.city,
      settings: data.settings || {},
      prompt: data.prompt,
      photos: urls,
      uploaded: Object.fromEntries(urls.map((u, i) => [u, data.photos[i]])),
      blurFace: data.blur_face,
      verified: data.verified,
      discretion: data.discretion,
    },
  };
}

/* ---------- Face verification ---------- */

/**
 * Uploads the selfie and asks the server to compare it with the profile photos (AWS Rekognition).
 * The server deletes the selfie afterwards. Resolves to { verified, reason, uploaded }.
 * reason 'offline' or 'not_configured' means the real check could not run.
 */
export async function verifyFace(profile, selfieUri) {
  if (!uid) return { verified: false, reason: 'offline', uploaded: profile.uploaded || {} };
  try {
    const uploaded = await saveProfile(profile, false);
    const body = await new File(selfieUri).arrayBuffer();
    const { error: upErr } = await supabase.storage.from('selfies').upload(`${uid}/selfie.jpg`, body, { contentType: 'image/jpeg', upsert: true });
    if (upErr) throw upErr;
    const { data, error } = await supabase.functions.invoke('verify-face', { body: {} });
    if (error) throw error;
    return { ...data, uploaded };
  } catch (e) {
    console.warn('[backend] verify failed', e?.message || e);
    return { verified: false, reason: 'error', uploaded: profile.uploaded || {} };
  }
}

/* ---------- Other people ---------- */

const hash = (s) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
const time = (iso) => (iso ? new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'late');

function toPerson(row, me, url, allUrls = []) {
  const mine = me?.boundaries || {};
  const theirs = row.boundaries || {};
  const both = Object.keys(theirs).filter((k) => theirs[k] === 'Yes' && mine[k] === 'Yes');
  const maybe = Object.keys(theirs).find((k) => theirs[k] === 'Maybe');
  return {
    id: row.id,
    real: true,
    name: row.name || 'Someone',
    age: row.age || '',
    dist: (!row.settings?.hideCity && row.city) || 'Nearby',
    country: row.country || null,
    until: time(row.live_until),
    fit: Math.min(7, both.length),
    tier: row.verified ? 'verified' : 'glow',
    seed: hash(row.id) % 4,
    tested: row.tested_month || '—',
    showsUp: 100,
    bio: row.bio || '',
    prompt: row.prompt || '',
    both: both.length ? both : (row.intents || []).slice(0, 3),
    maybe: maybe || null,
    photo: url || null,
    blurred: !!row.blur_face, // shown blurred until you match
    verified: !!row.verified,
    intents: row.intents || [],
    turnOns: row.turn_ons || [],
    photos: allUrls.length ? allUrls : url ? [url] : [],
    gender: row.gender || null,
    hereTonight: !!row.live_until && new Date(row.live_until).getTime() > Date.now(),
  };
}

async function withPhotos(rows, me) {
  // Every photo (up to 6 each), signed in one call.
  const all = rows.flatMap((r) => (r.photos || []).slice(0, 6));
  const { data } = all.length ? await supabase.storage.from(BUCKET).createSignedUrls(all, URL_TTL) : { data: [] };
  const byPath = Object.fromEntries((data || []).filter((d) => d.signedUrl).map((d) => [d.path, d.signedUrl]));
  return rows.map((r) => {
    const urls = (r.photos || []).slice(0, 6).map((p) => byPath[p]).filter(Boolean);
    return toPerson(r, me, urls[0], urls);
  });
}

export async function loadDeck(me) {
  if (!uid) return [];
  const { data, error } = await supabase.rpc('discover_profiles', { max_rows: 30 });
  if (error) return [];
  return withPhotos(data, me);
}

export async function loadLikesYou(me) {
  if (!uid) return [];
  const { data, error } = await supabase.rpc('likes_you');
  if (error) return [];
  return withPhotos(data, me);
}

/** Likes someone. Resolves to true when it is a match. */
export async function like(personId) {
  if (!uid) return false;
  const { error } = await supabase.from('likes').insert({ liker: uid, likee: personId });
  if (error && error.code !== '23505') {
    console.warn('[backend] like failed', error.message);
    return false;
  }
  const [a, b] = uid < personId ? [uid, personId] : [personId, uid];
  const { data } = await supabase.from('matches').select('id').eq('user_a', a).eq('user_b', b).maybeSingle();
  return !!data;
}

export async function report(personId, reason) {
  if (!uid) return;
  await supabase.from('reports').insert({ reporter: uid, target: personId, reason });
}

export async function block(personId) {
  if (!uid) return;
  await supabase.from('blocks').insert({ blocker: uid, blocked: personId });
}

/* ---------- Chats ---------- */

const leftFor = (created) => {
  const h = Math.max(0, 48 - Math.floor((Date.now() - new Date(created).getTime()) / 3600000));
  return `${h}h left`;
};

/** My matches as chat objects: { id: otherUserId, matchId, person, messages, plan, left, real }. */
export async function loadChats(me) {
  if (!uid) return [];
  const { data: matches, error } = await supabase.from('matches').select('*').order('created_at', { ascending: false });
  if (error || !matches.length) return [];
  const otherIds = matches.map((m) => (m.user_a === uid ? m.user_b : m.user_a));
  const ids = matches.map((m) => m.id);
  const [{ data: profiles }, { data: msgs }, { data: plans }] = await Promise.all([
    supabase.from('profiles').select('*').in('id', otherIds),
    supabase.from('messages').select('*').in('match_id', ids).order('created_at'),
    supabase.from('plans').select('*').in('match_id', ids),
  ]);
  const people = await withPhotos(profiles || [], me);
  return matches
    .map((m) => {
      const other = m.user_a === uid ? m.user_b : m.user_a;
      const person = people.find((p) => p.id === other);
      if (!person) return null;
      const plan = (plans || []).find((p) => p.match_id === m.id);
      return {
        id: other,
        matchId: m.id,
        real: true,
        person,
        left: leftFor(m.created_at),
        plan: plan ? { place: plan.place, time: plan.at_time } : undefined,
        messages: (msgs || []).filter((x) => x.match_id === m.id).map((x) => ({ id: x.id, me: x.sender === uid, text: x.body })),
      };
    })
    .filter(Boolean);
}

export async function sendMessage(matchId, text) {
  if (!uid) return null;
  const { data, error } = await supabase.from('messages').insert({ match_id: matchId, sender: uid, body: text }).select('id').single();
  if (error) {
    console.warn('[backend] send failed', error.message);
    return null;
  }
  return data.id;
}

/** Calls onMessage(matchId, msg) for new messages and onMatch() for new matches. Returns an unsubscribe function. */
export function subscribe({ onMessage, onMatch }) {
  if (!uid) return () => {};
  const channel = supabase
    .channel(`user-${uid}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, ({ new: m }) => {
      onMessage(m.match_id, { id: m.id, me: m.sender === uid, text: m.body });
    })
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'matches' }, ({ new: m }) => {
      if (m.user_a === uid || m.user_b === uid) onMatch();
    })
    .subscribe();
  return () => supabase.removeChannel(channel);
}

/* ---------- Ideas ---------- */

export async function loadIdeas() {
  if (!uid) return null;
  const [{ data: ideas, error }, { data: votes }] = await Promise.all([
    supabase.from('ideas_scored').select('*').order('created_at', { ascending: false }),
    supabase.from('idea_votes').select('idea_id, value').eq('user_id', uid),
  ]);
  if (error) return null;
  const mine = Object.fromEntries((votes || []).map((v) => [v.idea_id, v.value]));
  return ideas.map((i) => ({
    id: i.id,
    real: true,
    title: i.title,
    desc: i.description,
    by: i.author === uid ? 'You' : 'Anonymous',
    cat: i.cat,
    status: i.status,
    score: i.score,
    reply: i.reply || undefined,
    mine: mine[i.id] || 0,
  }));
}

export async function postIdea(title) {
  if (!uid) return null;
  const { data, error } = await supabase.from('ideas').insert({ author: uid, title }).select('id').single();
  if (error) return null;
  await supabase.from('idea_votes').insert({ idea_id: data.id, user_id: uid, value: 1 });
  return data.id;
}

export async function voteIdea(ideaId, value) {
  if (!uid) return;
  if (!value) await supabase.from('idea_votes').delete().eq('idea_id', ideaId).eq('user_id', uid);
  else await supabase.from('idea_votes').upsert({ idea_id: ideaId, user_id: uid, value });
}

/* ---------- Lounge: posts, comments, likes ---------- */

const POST_BUCKET = 'post-photos';

/** My Lounge alias (created the first time). */
export async function myAlias() {
  if (!uid) return null;
  const { data } = await supabase.rpc('my_alias');
  return data || null;
}

const toPost = (r, urls = {}) => ({
  id: r.id,
  real: true,
  alias: r.author_alias,
  verified: r.author_verified,
  role: r.author_role,
  topic: r.topic,
  title: r.title,
  body: r.body,
  photos: (r.photos || []).map((p) => urls[p]).filter(Boolean),
  spicy: r.spicy,
  createdAt: r.created_at,
  likes: r.like_count,
  comments: r.comment_count,
  liked: r.liked,
  mine: r.mine,
  expert: r.expert_reply || null,
  poll: r.poll_options ? { options: r.poll_options, counts: r.poll_counts || r.poll_options.map(() => 0), mine: r.my_vote ?? null } : null,
});

async function postPhotoUrls(rows) {
  const paths = rows.flatMap((r) => r.photos || []);
  if (!paths.length) return {};
  const { data } = await supabase.storage.from(POST_BUCKET).createSignedUrls(paths, URL_TTL);
  return Object.fromEntries((data || []).filter((d) => d.signedUrl).map((d) => [d.path, d.signedUrl]));
}

/** Newest posts first; topic 'For you' means all. Returns null when offline. */
export async function loadFeed(topic) {
  if (!uid) return null;
  let q = supabase.from('posts_feed').select('*').order('created_at', { ascending: false }).limit(50);
  if (topic && topic !== 'For you') q = q.eq('topic', topic);
  const { data, error } = await q;
  if (error) return null;
  const urls = await postPhotoUrls(data);
  return data.map((r) => toPost(r, urls));
}

export async function loadPost(id) {
  if (!uid) return null;
  const { data } = await supabase.from('posts_feed').select('*').eq('id', id).maybeSingle();
  if (!data) return null;
  return toPost(data, await postPhotoUrls([data]));
}

export async function likePost(id, on) {
  if (!uid) return;
  if (on) await supabase.from('post_likes').upsert({ post_id: id, user_id: uid });
  else await supabase.from('post_likes').delete().eq('post_id', id).eq('user_id', uid);
}

/** Creates a post; photos are local uris (already masked if the member chose that). */
export async function createPost({ topic, title, body, photos = [], spicy, poll }) {
  if (!uid) return null;
  const paths = [];
  for (const uri of photos) {
    const ext = (uri.split('?')[0].split('.').pop() || 'jpg').toLowerCase();
    const path = `${uid}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext === 'jpeg' ? 'jpg' : ext}`;
    const bytes = await new File(uri).arrayBuffer();
    const { error } = await supabase.storage.from(POST_BUCKET).upload(path, bytes, { contentType: ext === 'png' ? 'image/png' : 'image/jpeg' });
    if (!error) paths.push(path);
  }
  const { data, error } = await supabase
    .from('posts')
    .insert({ author: uid, topic, title: title || null, body: body || '', photos: paths, spicy: !!spicy, poll_options: poll && poll.length >= 2 ? poll : null })
    .select('id')
    .single();
  if (error) {
    console.warn('[backend] post failed', error.message);
    return null;
  }
  return data.id;
}

export async function deletePost(id) {
  if (!uid) return;
  await supabase.from('posts').delete().eq('id', id);
}

export async function loadComments(postId) {
  if (!uid) return [];
  const { data } = await supabase.from('comments_feed').select('*').eq('post_id', postId).order('created_at');
  return (data || []).map((c) => ({
    id: c.id,
    parentId: c.parent_id,
    alias: c.author_alias,
    verified: c.author_verified,
    role: c.author_role,
    body: c.body,
    createdAt: c.created_at,
    likes: c.like_count,
    liked: c.liked,
    mine: c.mine,
  }));
}

export async function addComment(postId, body, parentId = null) {
  if (!uid) return null;
  const { data, error } = await supabase.from('comments').insert({ post_id: postId, author: uid, body, parent_id: parentId }).select('id').single();
  if (error) return null;
  return data.id;
}

export async function likeComment(id, on) {
  if (!uid) return;
  if (on) await supabase.from('comment_likes').upsert({ comment_id: id, user_id: uid });
  else await supabase.from('comment_likes').delete().eq('comment_id', id).eq('user_id', uid);
}

/* ---------- Settings ---------- */

export async function loadBlocks() {
  if (!uid) return [];
  const { data } = await supabase.rpc('my_blocks');
  return data || [];
}

export async function unblock(personId) {
  if (!uid) return;
  await supabase.from('blocks').delete().eq('blocker', uid).eq('blocked', personId);
}

/** Deletes my photos, then my account and everything linked to it. */
export async function deleteAccount() {
  if (!uid) return false;
  for (const bucket of ['photos', 'post-photos', 'selfies']) {
    try {
      const { data } = await supabase.storage.from(bucket).list(uid, { limit: 1000 });
      const paths = (data || []).map((f) => `${uid}/${f.name}`);
      if (paths.length) await supabase.storage.from(bucket).remove(paths);
    } catch {
      // keep going; the account removal below is what matters
    }
  }
  const { error } = await supabase.rpc('delete_my_account');
  if (error) {
    console.warn('[backend] delete account failed', error.message);
    return false;
  }
  await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
  uid = null;
  return true;
}

/** Comments on my posts and replies to my comments (the Lounge bell). */
export async function loungeActivity() {
  if (!uid) return [];
  const { data } = await supabase.rpc('my_lounge_activity');
  return (data || []).map((a) => ({ postId: a.post_id, postTitle: a.post_title, alias: a.alias, body: a.body, isReply: a.is_reply, createdAt: a.created_at }));
}

/** Votes in a poll (option index), or removes my vote with null. */
export async function votePoll(postId, option) {
  if (!uid) return;
  if (option === null) await supabase.from('poll_votes').delete().eq('post_id', postId).eq('user_id', uid);
  else await supabase.from('poll_votes').upsert({ post_id: postId, user_id: uid, option });
}
