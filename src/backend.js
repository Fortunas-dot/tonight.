// Everything that talks to Supabase. Screens get plain objects in the same shape as the sample data.
import AsyncStorage from '@react-native-async-storage/async-storage';
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

/* ---------- Keeping the account (Sign in with Apple) ---------- */

/** Is this account tied to an Apple ID (so it can be restored on a new phone)? */
export async function appleLinked() {
  const { data } = await supabase.auth.getUser();
  return !!data?.user?.identities?.some((i) => i.provider === 'apple');
}

/**
 * Ties the current (anonymous) account to an Apple ID, keeping everything in it.
 * Returns 'linked', 'taken' (that Apple ID already has a Tonight account) or 'failed'.
 */
export async function linkApple(token, code) {
  const { error } = await supabase.auth.linkIdentity({ provider: 'apple', token });
  if (!error) {
    await supabase.auth.refreshSession().catch(() => {});
    storeAppleCode(code);
    return 'linked';
  }
  console.warn('[backend] link apple failed', error.code, error.message);
  if (error.code === 'identity_already_exists' || /already/i.test(error.message || '')) return 'taken';
  return 'failed';
}

/** Switches to the account behind this Apple ID (made fresh if there is none). Returns the new user id or null. */
export async function signInApple(token, code) {
  const { data, error } = await supabase.auth.signInWithIdToken({ provider: 'apple', token });
  if (error || !data?.user) {
    console.warn('[backend] apple sign-in failed', error?.message);
    return null;
  }
  uid = data.user.id;
  storeAppleCode(code);
  return uid;
}

/** Hands Apple's one-time code to the server, which keeps a token only to revoke it on account deletion. */
export function storeAppleCode(code) {
  if (!code) return;
  supabase.functions.invoke('apple-auth', { body: { action: 'store', code } }).catch(() => {});
}

/* ---------- Keeping the account (email and password) ---------- */
// The confirmation and login emails carry a link. It opens the app (tonight://auth, allowed under Supabase ›
// Auth › URL Configuration) with the session in it; handleAuthLink() picks that up. (With your own SMTP the
// templates can also show a 6-digit {{ .Token }}; confirmEmailLink / verifyLoginCode accept that too.)
export const AUTH_REDIRECT = 'tonight://auth';
const authLinkListeners = new Set();

/** Calls cb({ type }) whenever an email link signed this phone in. Returns an unsubscribe function. */
export function onAuthLink(cb) {
  authLinkListeners.add(cb);
  return () => authLinkListeners.delete(cb);
}

// Only a link this phone asked for may sign it in. Without this, any tonight://auth link (from a web page or a
// message) could swap the phone onto someone else's account, and an anonymous account would be lost for good.
// Kept on disk because the app may be closed while the person is in their mail app.
const LINK_KEY = 'tonight.expectedAuthLink';
const LINK_TTL = 60 * 60 * 1000; // email links are valid for an hour

async function expectAuthLink(kind) {
  try {
    await AsyncStorage.setItem(LINK_KEY, JSON.stringify({ kind, uid, at: Date.now() }));
  } catch {}
}

async function takeExpectedAuthLink() {
  try {
    const raw = await AsyncStorage.getItem(LINK_KEY);
    const exp = raw ? JSON.parse(raw) : null;
    return exp && Date.now() - exp.at < LINK_TTL ? exp : null;
  } catch {
    return null;
  }
}

/** The account id inside an access token (not trusted for anything but this comparison; the server checks it). */
function tokenUserId(jwt) {
  try {
    const b64 = jwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(globalThis.atob(b64.padEnd(b64.length + ((4 - (b64.length % 4)) % 4), '='))).sub || null;
  } catch {
    return null;
  }
}

/** Handles tonight://auth#access_token=…&refresh_token=…&type=… (or ?code=…). Returns { type } or { error } or null. */
export async function handleAuthLink(url) {
  if (!url || !url.startsWith('tonight://auth')) return null;
  const expected = await takeExpectedAuthLink();
  if (!expected) {
    console.warn('[backend] ignored an email link this phone did not ask for');
    return null;
  }
  const params = {};
  const part = url.split(/[?#]/).slice(1).join('&');
  for (const kv of part.split('&')) {
    const [k, v] = kv.split('=');
    if (k) params[decodeURIComponent(k)] = decodeURIComponent((v || '').replace(/\+/g, ' '));
  }
  let out;
  if (params.error || params.error_description) out = { error: params.error_code || params.error || 'failed', message: params.error_description };
  else if (params.access_token && params.refresh_token) {
    // Confirming the email of this account must stay on this account.
    if (expected.kind === 'keep' && expected.uid && tokenUserId(params.access_token) !== expected.uid) {
      console.warn('[backend] ignored an email link for another account');
      return null;
    }
    const { data, error } = await supabase.auth.setSession({ access_token: params.access_token, refresh_token: params.refresh_token });
    out = error ? { error: 'failed' } : { type: params.type || 'link' };
    if (data?.user) uid = data.user.id;
  } else if (params.code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(params.code);
    out = error ? { error: 'failed' } : { type: params.type || 'link' };
    if (data?.user) uid = data.user.id;
  } else return null;
  if (!out.error) await AsyncStorage.removeItem(LINK_KEY).catch(() => {});
  authLinkListeners.forEach((cb) => cb(out));
  return out;
}

const authError = (error) => {
  const code = error?.code || '';
  const msg = (error?.message || '').toLowerCase();
  if (code === 'email_exists' || msg.includes('already') || msg.includes('registered')) return 'taken';
  if (code === 'over_email_send_rate_limit' || code === 'over_request_rate_limit' || msg.includes('rate limit')) return 'rate';
  if (code === 'otp_expired' || msg.includes('expired') || msg.includes('invalid')) return 'code';
  if (code === 'invalid_credentials' || msg.includes('invalid login')) return 'credentials';
  if (code === 'weak_password' || msg.includes('password')) return 'weak';
  if (code === 'email_address_invalid' || msg.includes('email address')) return 'email';
  return 'failed';
};

/** How this account can be restored: { apple, email } (email only once confirmed). */
export async function accountLinks() {
  await supabase.auth.refreshSession().catch(() => {});
  const { data } = await supabase.auth.getUser();
  const u = data?.user;
  return { apple: !!u?.identities?.some((i) => i.provider === 'apple'), email: u?.email || null, pending: u?.new_email || null };
}

/**
 * Keeps the account with an email and password in one step, no confirmation email (server function account-email).
 * Returns 'ok' or an error kind: 'email', 'weak', 'taken' or 'failed'.
 */
export async function saveEmailPassword(email, password) {
  try {
    const { data, error } = await supabase.functions.invoke('account-email', { body: { email: email.trim().toLowerCase(), password } });
    if (error || !data) return 'failed';
    if (!data.ok) return data.reason || 'failed';
    await supabase.auth.refreshSession().catch(() => {});
    return 'ok';
  } catch (e) {
    console.warn('[backend] save email failed', e?.message || e);
    return 'failed';
  }
}

/** Step 1 of keeping the account with email: sends a 6-digit code to that address. Returns 'sent' or an error kind. */
export async function startEmailLink(email) {
  await expectAuthLink('keep');
  const { error } = await supabase.auth.updateUser({ email: email.trim().toLowerCase() }, { emailRedirectTo: AUTH_REDIRECT });
  if (error) {
    console.warn('[backend] email link failed', error.code, error.message);
    return authError(error);
  }
  return 'sent';
}

/** Step 2: the code from the email. Returns 'ok' or an error kind. */
export async function confirmEmailLink(email, code) {
  const { error } = await supabase.auth.verifyOtp({ email: email.trim().toLowerCase(), token: code.trim(), type: 'email_change' });
  if (error) {
    console.warn('[backend] email code failed', error.code, error.message);
    return authError(error);
  }
  return 'ok';
}

/** Step 3 (and after "forgot password"): sets the password. Returns 'ok' or an error kind. */
export async function setPassword(password) {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    console.warn('[backend] set password failed', error.code, error.message);
    return authError(error);
  }
  return 'ok';
}

/** New phone: email + password. Returns the user id, or an error kind as { error }. */
export async function signInEmail(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
  if (error || !data?.user) return { error: authError(error) };
  uid = data.user.id;
  return { id: uid };
}

/** Forgot password: a 6-digit login code, only for existing accounts. */
export async function sendLoginCode(email) {
  await expectAuthLink('login');
  const { error } = await supabase.auth.signInWithOtp({ email: email.trim().toLowerCase(), options: { shouldCreateUser: false, emailRedirectTo: AUTH_REDIRECT } });
  if (error) {
    console.warn('[backend] login code failed', error.code, error.message);
    return authError(error);
  }
  return 'sent';
}

export async function verifyLoginCode(email, code) {
  const { data, error } = await supabase.auth.verifyOtp({ email: email.trim().toLowerCase(), token: code.trim(), type: 'email' });
  if (error || !data?.user) return { error: authError(error) };
  uid = data.user.id;
  return { id: uid };
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
    // A hidden city stays private (profile_private); the public profile then has none.
    city: profile.settings?.hideCity ? null : profile.city || null,
    details: profile.details ?? {},
    prompts: (profile.prompts || []).filter((x) => x?.q && x?.a?.trim()).slice(0, 3),
    paused: !!profile.settings?.paused,
    prompt: profile.prompt ?? null,
    photos: paths,
    blur_face: !!profile.blurFace,
    verified: !!profile.verified,
    discretion: profile.discretion ?? {},
    // "Go live tonight" is your choice (Discover top bar); it ends by itself.
    live_until: onboarded && profile.liveUntil && Date.parse(profile.liveUntil) > Date.now() ? profile.liveUntil : null,
  };
  // Only ever switched on: going through sign-up again (or a sign-in mid-way) must never turn a member's profile
  // back into an unfinished one, which locked members out (Nov 2026). A new row starts unfinished by default.
  if (onboarded) row.onboarded = true;
  const { error } = await supabase.from('profiles').upsert(row);
  if (!error) {
    await supabase
      .from('profile_private')
      .upsert({
        user_id: uid,
        settings: profile.settings ?? {},
        hidden_city: profile.settings?.hideCity ? profile.city || null : null,
        // Private: a match only ever sees the guides you both saved (shared_wishlist).
        wishlist: profile.wishlist ?? [],
        updated_at: new Date().toISOString(),
      });
  }
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
  const [{ data }, { data: priv }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', uid).maybeSingle(),
    supabase.from('profile_private').select('*').eq('user_id', uid).maybeSingle(),
  ]);
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
      city: data.city || priv?.hidden_city || null,
      settings: priv?.settings || {},
      wishlist: priv?.wishlist || [],
      liveUntil: data.live_until || null,
      details: data.details || {},
      prompts: data.prompts || [],
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
    demo: !!row.is_demo, // seeded by scripts/seed-demo.mjs, labelled in the app
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
    details: row.details || {},
    prompts: row.prompts || [],
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
    const urls = (r.photos || [])
      .slice(0, 6)
      .map((p) => byPath[p])
      .filter(Boolean);
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
  const [{ data: profiles }, { data: msgs }, { data: plans }, { data: states }] = await Promise.all([
    supabase.from('profiles').select('*').in('id', otherIds),
    supabase.from('messages').select('*').in('match_id', ids).order('created_at'),
    supabase.from('plans').select('*').in('match_id', ids),
    supabase.from('match_state').select('*').in('match_id', ids),
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
        messages: (msgs || []).filter((x) => x.match_id === m.id).map((x) => ({ id: x.id, me: x.sender === uid, text: x.body, at: x.created_at })),
        // When the other person last read this chat / last typed in it.
        theirRead: (states || []).find((s) => s.match_id === m.id && s.user_id !== uid)?.read_at || null,
        theirTyping: (states || []).find((s) => s.match_id === m.id && s.user_id !== uid)?.typing_at || null,
        // When I last opened this chat: anything from them after that is unread.
        myRead: (states || []).find((s) => s.match_id === m.id && s.user_id === uid)?.read_at || null,
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

/** Sets (or changes) the plan for a match: one per match, either person can change it. */
export async function savePlan(matchId, place, time) {
  if (!uid || !matchId) return false;
  const { error } = await supabase
    .from('plans')
    .upsert({ match_id: matchId, place, at_time: time, created_by: uid, created_at: new Date().toISOString() });
  if (error) {
    console.warn('[backend] save plan failed', error.message);
    return false;
  }
  return true;
}

/** Calls off the plan for a match (either person can). */
export async function cancelPlan(matchId) {
  if (!uid || !matchId) return false;
  const { error } = await supabase.from('plans').delete().eq('match_id', matchId);
  if (error) {
    console.warn('[backend] cancel plan failed', error.message);
    return false;
  }
  return true;
}

/** Guide ids both people in this match added to their wishlist (never the rest of either list). */
export async function sharedWishlist(matchId) {
  if (!uid || !matchId) return [];
  const { data, error } = await supabase.rpc('shared_wishlist', { m: matchId });
  if (error) {
    console.warn('[backend] shared wishlist failed', error.message);
    return [];
  }
  return data || [];
}

/** I've read this chat up to now ("Seen" for the other person). */
export async function markRead(matchId) {
  if (!uid || !matchId) return;
  await supabase.from('match_state').upsert({ match_id: matchId, user_id: uid, read_at: new Date().toISOString() });
}

/** I'm typing in this chat (sent at most every few seconds by the chat screen). */
export async function setTyping(matchId) {
  if (!uid || !matchId) return;
  await supabase.from('match_state').upsert({ match_id: matchId, user_id: uid, typing_at: new Date().toISOString() });
}

/**
 * Calls onMessage(matchId, msg) for new messages, onMatch() for new matches and onState(matchId, { readAt, typingAt })
 * when the other person reads or types. Returns an unsubscribe function.
 */
export function subscribe({ onMessage, onMatch, onState, onComment, onPlan }) {
  if (!uid) return () => {};
  const channel = supabase
    .channel(`user-${uid}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, ({ new: m }) => {
      onMessage(m.match_id, { id: m.id, me: m.sender === uid, text: m.body, at: m.created_at });
    })
    // Someone commented somewhere in the Lounge: the app re-checks whether it was on my post or a reply to me.
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'comments' }, ({ new: c }) => {
      if (c && c.author !== uid) onComment?.();
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'match_state' }, ({ new: s }) => {
      if (s && s.user_id !== uid) onState?.(s.match_id, { readAt: s.read_at, typingAt: s.typing_at });
    })
    // A plan made or changed in one of my chats (by either of us).
    .on('postgres_changes', { event: '*', schema: 'public', table: 'plans' }, ({ eventType, new: p, old: o }) => {
      if (eventType === 'DELETE') {
        if (o && o.match_id) onPlan?.(o.match_id, undefined); // called off (the old row carries its key, match_id)
      } else if (p && p.match_id) onPlan?.(p.match_id, { place: p.place, time: p.at_time });
    })
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'matches' }, ({ new: m }) => {
      if (m.user_a === uid || m.user_b === uid) onMatch();
    })
    // An unmatch only carries the id, so just reload the chats.
    .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'matches' }, () => onMatch())
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
export async function loadFeed(topic, groupId) {
  if (!uid) return null;
  // Saved posts (only mine) mark the feed and power the "Saved" tab.
  const { data: saves } = await supabase.from('post_saves').select('post_id').eq('user_id', uid);
  const saved = new Set((saves || []).map((s) => s.post_id));
  let q = supabase.from('posts_feed').select('*').order('created_at', { ascending: false }).limit(50);
  if (topic === 'Saved') {
    if (!saved.size) return [];
    q = q.in('id', [...saved]);
  } else if (topic && topic !== 'For you') q = q.eq('topic', topic);
  // Group posts live only in their group; the main feed shows the rest.
  if (groupId) q = q.eq('group_id', groupId);
  else if (topic !== 'Saved') q = q.is('group_id', null);
  const { data, error } = await q;
  if (error) return null;
  const urls = await postPhotoUrls(data);
  return data.map((r) => ({ ...toPost(r, urls), saved: saved.has(r.id) }));
}

export async function savePost(id, on) {
  if (!uid) return;
  if (on) await supabase.from('post_saves').upsert({ post_id: id, user_id: uid });
  else await supabase.from('post_saves').delete().eq('post_id', id).eq('user_id', uid);
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
export async function createPost({ topic, title, body, photos = [], spicy, poll, groupId }) {
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
    .insert({ author: uid, topic, title: title || null, body: body || '', photos: paths, spicy: !!spicy, poll_options: poll && poll.length >= 2 ? poll : null, group_id: groupId || null })
    .select('id')
    .single();
  if (error) {
    console.warn('[backend] post failed', error.message);
    return null;
  }
  return data.id;
}

/* ---------- Check-ins (after a meet) ---------- */

/** My check-in about this match, or null if I haven't done one. */
export async function myCheckin(matchId) {
  if (!uid || !matchId) return null;
  const { data } = await supabase.from('checkins').select('showed_up, positive, great_communicator').eq('match_id', matchId).eq('from_user', uid).maybeSingle();
  return data || null;
}

/** Private: the other person never sees who said what, only their own totals. */
export async function submitCheckin(matchId, toUser, { showedUp, positive, communicator }) {
  if (!uid || !matchId || !toUser) return false;
  const { error } = await supabase
    .from('checkins')
    .upsert({ match_id: matchId, from_user: uid, to_user: toUser, showed_up: !!showedUp, positive: !!positive, great_communicator: !!communicator });
  if (error) console.warn('[backend] check-in failed', error.message);
  return !error;
}

/** My totals for the badges page: { checkins, positive, shows, last5, last5_all, communicator, reports90 }. */
export async function myBadgeStats() {
  if (!uid) return null;
  const { data, error } = await supabase.rpc('my_badge_stats');
  if (error) return null;
  return data;
}

/* ---------- Lounge groups ---------- */

// Group photos live in the post-photos bucket (members can see it), in my own folder.
async function uploadGroupPhoto(uri) {
  const ext = (uri.split('?')[0].split('.').pop() || 'jpg').toLowerCase();
  const clean = ['png', 'webp', 'heic'].includes(ext) ? ext : 'jpg';
  const path = `${uid}/group-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.${clean}`;
  try {
    const body = /^(blob|data|https?):/.test(uri) ? await (await fetch(uri)).arrayBuffer() : await new File(uri).arrayBuffer();
    const { error } = await supabase.storage.from(POST_BUCKET).upload(path, body, { contentType: clean === 'jpg' ? 'image/jpeg' : `image/${clean}` });
    if (error) throw error;
    return path;
  } catch (e) {
    console.warn('[backend] group photo upload failed', e?.message || e);
    return null;
  }
}

/** Starts a group (members can start up to 3); you become its first member. Returns the new group's id. */
export async function createGroup(name, about, photoUri) {
  if (!uid) return null;
  const slug = `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30)}-${Math.random().toString(36).slice(2, 6)}`;
  const photo = photoUri ? await uploadGroupPhoto(photoUri) : null;
  const { data, error } = await supabase.from('groups').insert({ slug, name, about, photo, created_by: uid, sort: 100 }).select('id').single();
  if (error) {
    console.warn('[backend] create group failed', error.message);
    return { error: /groups_started_by|policy/.test(error.message) ? 'limit' : 'failed' };
  }
  return { id: data.id };
}

/** Edits a group I started. photoUri: a new picture to upload, null to remove the photo, undefined to keep it. */
export async function updateGroup(id, { name, about, photoUri }) {
  if (!uid) return false;
  const change = { name, about };
  if (photoUri === null) change.photo = null;
  else if (photoUri) {
    const photo = await uploadGroupPhoto(photoUri);
    if (!photo) return false;
    change.photo = photo;
  }
  const { data, error } = await supabase.from('groups').update(change).eq('id', id).select('id');
  if (error || !data?.length) console.warn('[backend] update group failed', error?.message || 'not yours');
  return !error && !!data?.length;
}

/** All groups with member counts, whether I joined, whether I started it, and a link to its photo. */
export async function loadGroups() {
  if (!uid) return null;
  const { data, error } = await supabase.rpc('group_list');
  if (error) {
    console.warn('[backend] groups failed', error.message);
    return null;
  }
  const paths = (data || []).map((g) => g.photo).filter(Boolean);
  const { data: signed } = paths.length ? await supabase.storage.from(POST_BUCKET).createSignedUrls(paths, URL_TTL) : { data: [] };
  const urls = Object.fromEntries((signed || []).filter((d) => d.signedUrl).map((d) => [d.path, d.signedUrl]));
  return (data || []).map((g) => ({ ...g, photoUrl: g.photo ? urls[g.photo] || null : null }));
}

export async function joinGroup(groupId, on) {
  if (!uid) return false;
  const { error } = on
    ? await supabase.from('group_members').upsert({ group_id: groupId, user_id: uid })
    : await supabase.from('group_members').delete().eq('group_id', groupId).eq('user_id', uid);
  if (error) console.warn('[backend] join group failed', error.message);
  return !error;
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

/* ---------- Membership review ---------- */

/** My application: { status: 'pending' | 'approved' | 'rejected', note } or null when unknown (offline, no profile yet). */
export async function myReview() {
  if (!uid) return null;
  const { data, error } = await supabase.from('profiles').select('review_status, review_note, onboarded').eq('id', uid).maybeSingle();
  if (error || !data || !data.onboarded) return null;
  return { status: data.review_status || 'pending', note: data.review_note || null };
}

/** After a decline: send the (improved) profile in again. */
export async function reapply() {
  const { error } = await supabase.rpc('reapply');
  if (error) console.warn('[backend] reapply failed', error.message);
  return !error;
}

/** { decided, approved } over all applications, for an honest acceptance rate. */
export async function acceptanceStats() {
  const { data } = await supabase.rpc('acceptance_stats');
  return data || null;
}

/** Applications waiting for review, oldest first, with signed photos. */
export async function modApplications() {
  const { data, error } = await supabase.rpc('mod_applications');
  if (error) {
    console.warn('[backend] applications failed', error.message);
    return [];
  }
  const list = data || [];
  const paths = [...new Set(list.flatMap((a) => (a.photos || []).slice(0, 6)))];
  const urls = paths.length ? await supabase.storage.from(BUCKET).createSignedUrls(paths, URL_TTL) : { data: [] };
  const byPath = Object.fromEntries((urls.data || []).filter((u) => u.signedUrl).map((u) => [u.path, u.signedUrl]));
  return list.map((a) => ({ ...a, photoUrls: (a.photos || []).map((p) => byPath[p]).filter(Boolean) }));
}

/** decision: 'approved' | 'rejected'; note is shown to the applicant on a decline. */
export async function modDecide(userId, decision, note = null) {
  const { error } = await supabase.rpc('mod_decide', { applicant: userId, decision, note });
  if (error) console.warn('[backend] decide failed', error.message);
  return !error;
}

/* ---------- Moderation ---------- */

export async function isModerator() {
  if (!uid) return false;
  const { data } = await supabase.rpc('is_moderator');
  return data === true;
}

/** For moderators: { applications, reports } waiting; null for everyone else. */
export async function modCounts() {
  if (!uid) return null;
  const { data } = await supabase.rpc('mod_counts');
  return data || null;
}

export async function amIBanned() {
  if (!uid) return false;
  const { data } = await supabase.rpc('am_i_banned');
  return data === true;
}

/** Reports for review, newest first; each with the reported person's first photo signed. */
export async function modQueue(includeClosed = false) {
  const { data, error } = await supabase.rpc('mod_queue', { include_closed: includeClosed });
  if (error) {
    console.warn('[backend] mod queue failed', error.message);
    return [];
  }
  const list = data || [];
  const paths = [...new Set(list.map((r) => r.target_photo).filter(Boolean))];
  const urls = paths.length ? await supabase.storage.from(BUCKET).createSignedUrls(paths, URL_TTL) : { data: [] };
  const byPath = Object.fromEntries((urls.data || []).filter((u) => u.signedUrl).map((u) => [u.path, u.signedUrl]));
  return list.map((r) => ({ ...r, photo: r.target_photo ? byPath[r.target_photo] || null : null }));
}

/** action: 'dismiss' | 'remove_post' | 'ban' */
export async function modResolve(reportId, action, note = null) {
  const { error } = await supabase.rpc('mod_resolve', { report_id: reportId, action, note });
  if (error) console.warn('[backend] resolve failed', error.message);
  return !error;
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
  // Apple asks apps to revoke Sign in with Apple when the account goes (Guideline 5.1.1(v)).
  await supabase.functions.invoke('apple-auth', { body: { action: 'revoke' } }).catch(() => {});
  const { error } = await supabase.rpc('delete_my_account');
  if (error) {
    console.warn('[backend] delete account failed', error.message);
    return false;
  }
  await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
  uid = null;
  return true;
}

/** Signs out on this phone only. The account stays on the server; sign back in on the welcome screen. */
export async function signOut() {
  await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
  uid = null;
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

/**
 * Photo links on the profile are signed and expire after a day. Swap every uploaded photo for a fresh link
 * (also when the local file is gone). Returns { photos, uploaded, masked } or null when nothing changed.
 */
export async function refreshMyPhotos(profile) {
  if (!uid) return null;
  const uploaded = profile.uploaded || {};
  const photos = profile.photos || [];
  const paths = photos.map((u) => uploaded[u]).filter(Boolean);
  if (!paths.length) return null;
  const { data } = await supabase.storage.from(BUCKET).createSignedUrls(paths, URL_TTL);
  const fresh = Object.fromEntries((data || []).filter((d) => d.signedUrl).map((d) => [d.path, d.signedUrl]));
  const nextPhotos = photos.map((u) => (uploaded[u] && fresh[uploaded[u]]) || u);
  const nextUploaded = {};
  const nextMasked = {};
  photos.forEach((u, i) => {
    if (uploaded[u]) nextUploaded[nextPhotos[i]] = uploaded[u];
    if (profile.masked?.[u]) nextMasked[nextPhotos[i]] = profile.masked[u];
  });
  return { photos: nextPhotos, uploaded: nextUploaded, masked: nextMasked };
}

/** Ends a match for both people (the chat and plan go with it). */
export async function unmatch(matchId) {
  if (!uid || !matchId) return false;
  const { error } = await supabase.from('matches').delete().eq('id', matchId);
  return !error;
}

/** Reports a Lounge post. The server adds its author for the moderators (members can't see who wrote a post). */
export async function reportPost(postId, reason = 'Reported from the Lounge') {
  if (!uid) return;
  await supabase.from('reports').insert({ reporter: uid, post_id: postId, reason });
}
