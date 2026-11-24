// Puts the demo people from scripts/people-prompts.md into Supabase, with their photos from assets/demo-raw/<slug>/.
// Each one is an anonymous account (the same sign-in the app uses), so no secret key is needed. Its session is kept
// in scripts/.demo-sessions.json (git-ignored) so a re-run updates the same account instead of making a new one.
//
// After seeding, mark them as demo in the Supabase SQL editor (members can't set is_demo themselves):
//   update public.profiles set is_demo = true where id in (<ids printed below>);
// Demo profiles like back whoever likes them (trigger likes_zz_demo), and the app labels them.
//
//   node scripts/seed-demo.mjs            create / update every demo person
//   node scripts/seed-demo.mjs --remove   delete every demo account in the sessions file (photos included)
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import { loadPeople, SHOTS } from './generate-people.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SESSIONS = join(root, 'scripts', '.demo-sessions.json');
const source = await readFile(join(root, 'src', 'lib', 'supabase.js'), 'utf8');
const URL = source.match(/SUPABASE_URL = '([^']+)'/)[1];
const KEY = source.match(/SUPABASE_KEY = '([^']+)'/)[1];

const sessions = existsSync(SESSIONS) ? JSON.parse(await readFile(SESSIONS, 'utf8')) : {};
const saveSessions = () => writeFile(SESSIONS, JSON.stringify(sessions, null, 2));
const list = (v) => (v ? v.split(/,\s*/).map((s) => s.trim()).filter(Boolean) : []);

// Signs in as the person's existing account, or makes a new anonymous one.
async function signIn(slug) {
  const client = createClient(URL, KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const saved = sessions[slug];
  const { data, error } = saved
    ? await client.auth.refreshSession({ refresh_token: saved.refresh_token })
    : await client.auth.signInAnonymously();
  if (error) throw new Error(`sign-in for ${slug} failed: ${error.message}`);
  sessions[slug] = { id: data.user.id, refresh_token: data.session.refresh_token };
  await saveSessions();
  return { client, id: data.user.id };
}

function rowFor(p, id, photos) {
  const details = Object.fromEntries(
    (p.Details || '').split(/;\s*/).filter(Boolean).map((kv) => {
      const [k, v] = kv.split('=');
      return [k.trim(), ['when', 'languages'].includes(k.trim()) ? list(v) : v.trim().replace("'", '’')];
    }),
  );
  const prompts = (p.Prompts || '').split(/\s*\|\s*/).filter(Boolean).map((qa) => {
    const [q, a] = qa.split('=');
    return { q: q.trim().replace("'", '’'), a: a.trim() };
  });
  const boundaries = { ...Object.fromEntries(list(p.Yes).map((b) => [b, 'Yes'])), ...Object.fromEntries(list(p.Maybe).map((b) => [b, 'Maybe'])) };
  return {
    id,
    name: p.name,
    age: Number(p.Age),
    gender: p.Gender,
    show: ['Women', 'Men', 'Non-binary', 'Couples'],
    intents: list(p.Intents),
    boundaries,
    turn_ons: list(p['Turn-ons']),
    bio: p.Bio,
    prompt: p.Prompt,
    country: p.Country,
    city: p.City,
    details,
    prompts,
    photos,
    blur_face: false,
    verified: false,
    paused: false,
    onboarded: true,
    // Demo people stay "here tonight" for a week after each seed.
    live_until: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
  };
}

async function seed() {
  const { people } = await loadPeople();
  const ids = [];
  for (const p of people) {
    const dir = join(root, 'assets', 'demo-raw', p.slug);
    const files = ['1.jpg', ...SHOTS.map((_, i) => `${i + 2}.jpg`)].filter((f) => existsSync(join(dir, f)));
    if (!files.length) { console.log(`${p.name}: no photos yet — run generate-people.mjs first`); continue; }
    const { client, id } = await signIn(p.slug);
    const paths = [];
    for (const f of files) {
      const path = `${id}/demo-${f}`;
      const { error } = await client.storage.from('photos').upload(path, await readFile(join(dir, f)), { contentType: 'image/jpeg', upsert: true });
      if (error) throw new Error(`${p.name} ${f}: ${error.message}`);
      paths.push(path);
    }
    const { error } = await client.from('profiles').upsert(rowFor(p, id, paths));
    if (error) throw new Error(`${p.name}: ${error.message}`);
    await client.from('profile_private').upsert({ user_id: id, settings: {}, updated_at: new Date().toISOString() });
    ids.push(id);
    console.log(`${p.name}: ready (${paths.length} photos) ${id}`);
  }
  console.log(`\nMark them as demo:\nupdate public.profiles set is_demo = true where id in (${ids.map((i) => `'${i}'`).join(', ')});`);
}

async function removeAll() {
  for (const slug of Object.keys(sessions)) {
    try {
      const { client, id } = await signIn(slug);
      const { data } = await client.storage.from('photos').list(id, { limit: 100 });
      if (data?.length) await client.storage.from('photos').remove(data.map((f) => `${id}/${f.name}`));
      const { error } = await client.rpc('delete_my_account');
      if (error) throw error;
      delete sessions[slug];
      await saveSessions();
      console.log(`${slug}: removed`);
    } catch (e) {
      console.log(`${slug}: FAILED — ${e.message || e}`);
    }
  }
}

try {
  if (process.argv.includes('--remove')) await removeAll();
  else await seed();
} catch (err) {
  console.error('Stopped:', err.message || err);
  process.exit(1);
}
