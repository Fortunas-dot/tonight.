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
      uid = data.session.user.id;
      return uid;
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
    bio: profile.bio ?? null,
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

function toPerson(row, me, url) {
  const mine = me?.boundaries || {};
  const theirs = row.boundaries || {};
  const both = Object.keys(theirs).filter((k) => theirs[k] === 'Yes' && mine[k] === 'Yes');
  const maybe = Object.keys(theirs).find((k) => theirs[k] === 'Maybe');
  return {
    id: row.id,
    real: true,
    name: row.name || 'Someone',
    age: row.age || '',
    dist: 'Nearby',
    until: time(row.live_until),
    fit: Math.min(7, both.length),
    tier: row.verified ? 'verified' : 'glow',
    seed: hash(row.id) % 4,
    tested: row.tested_month || '—',
    showsUp: 100,
    bio: row.bio || (row.intents || []).join(' · ') || 'New on Tonight.',
    prompt: row.prompt || (row.turn_ons || []).join(', ') || 'Say hi and see where it goes.',
    both: both.length ? both : (row.intents || []).slice(0, 3),
    maybe: maybe || null,
    photo: url || null,
  };
}

async function withPhotos(rows, me) {
  const firsts = rows.map((r) => r.photos?.[0]).filter(Boolean);
  const urls = await signedUrls(firsts);
  const byPath = Object.fromEntries(firsts.map((p, i) => [p, urls[i]]));
  return rows.map((r) => toPerson(r, me, byPath[r.photos?.[0]]));
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
