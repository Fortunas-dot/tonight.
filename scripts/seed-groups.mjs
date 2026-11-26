// Fills the Lounge groups with sample activity from the demo accounts (scripts/.demo-sessions.json, made by
// seed-demo.mjs): they join groups, post in them, comment on and like each other's posts. Only demo accounts are
// used, never a real member's. A re-run first removes what these accounts posted in groups, so it never doubles up.
//
//   node scripts/seed-groups.mjs            (re)create the sample group activity
//   node scripts/seed-groups.mjs --remove   remove it again (posts, comments, likes, memberships of demo accounts)
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SESSIONS = join(root, 'scripts', '.demo-sessions.json');
const source = await readFile(join(root, 'src', 'lib', 'supabase.js'), 'utf8');
const URL = source.match(/SUPABASE_URL = '([^']+)'/)[1];
const KEY = source.match(/SUPABASE_KEY = '([^']+)'/)[1];
const sessions = JSON.parse(await readFile(SESSIONS, 'utf8'));

const who = {};
for (const slug of Object.keys(sessions)) {
  const client = createClient(URL, KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await client.auth.refreshSession({ refresh_token: sessions[slug].refresh_token });
  if (error) throw new Error(`sign-in for ${slug} failed: ${error.message}`);
  sessions[slug].refresh_token = data.session.refresh_token;
  who[slug] = { client, id: data.user.id };
}
await writeFile(SESSIONS, JSON.stringify(sessions, null, 2));

const any = Object.values(who)[0].client;
const { data: groups, error: gErr } = await any.rpc('group_list');
if (gErr) throw new Error(gErr.message);
const bySlug = Object.fromEntries(groups.map((g) => [g.slug, g.id]));

// Clean slate: every demo account's group posts and memberships.
for (const [slug, { client, id }] of Object.entries(who)) {
  const { data: mine } = await client.from('posts_feed').select('id').eq('mine', true).not('group_id', 'is', null);
  for (const p of mine || []) await client.from('posts').delete().eq('id', p.id);
  await client.from('group_members').delete().eq('user_id', id);
  if (mine?.length) console.log(`${slug}: removed ${mine.length} group posts`);
}
if (process.argv.includes('--remove')) {
  console.log('Sample group activity removed.');
  process.exit(0);
}

// Who is in which group.
const MEMBERS = {
  'amsterdam-nights': ['lotte', 'ines', 'maya', 'sofie', 'daan'],
  'first-times': ['ines', 'sofie', 'daan'],
  'couples-corner': ['maya', 'daan', 'lotte'],
  'kink-101': ['lotte', 'maya', 'sofie'],
  'over-35': ['ines', 'daan'],
  'queer-curious': ['maya', 'sofie', 'lotte'],
};

// Posts, oldest first, each with replies and likes from other members of that group.
const POSTS = [
  {
    group: 'amsterdam-nights', by: 'lotte', topic: 'Date night',
    title: 'Best low-key bar for a first drink?',
    body: 'Somewhere you can actually hear each other, not too bright, easy to leave if it’s not clicking. Go.',
    replies: [['daan', 'Hiding in Plain Sight on Rapenburg. Dark, good cocktails, small tables.'], ['ines', 'Café Brecht if you want cosy and loud-ish, Door 74 if you want fancy.']],
    likes: ['ines', 'daan', 'maya'],
  },
  {
    group: 'amsterdam-nights', by: 'maya', topic: 'Date night',
    title: 'Who’s out this Friday?',
    body: 'Thinking De Pijp, a couple of drinks and then see where the night goes. Anyone around?',
    poll: ['In', 'Maybe', 'Next time'],
    replies: [['sofie', 'Probably! Depends on how long work runs.']],
    likes: ['sofie', 'lotte'],
  },
  {
    group: 'first-times', by: 'sofie', topic: 'First times',
    title: 'Nervous before my first meet. Normal?',
    body: 'Profile’s live, I’ve matched with someone nice and we said Thursday. Half excited, half want to cancel. How did your first one go?',
    replies: [['ines', 'Completely normal. Pick a public place, tell a friend, and remember you can leave any time. Mine was honestly just a fun drink.'], ['daan', 'Say you’re nervous. Most people find that disarming, and it takes the pressure off for both of you.']],
    likes: ['ines', 'daan'],
  },
  {
    group: 'first-times', by: 'daan', topic: 'Confidence',
    title: 'How do you bring up boundaries without killing the mood?',
    body: 'I never know when. Before meeting feels formal, during feels awkward.',
    replies: [['sofie', 'The yes/maybe/no on profiles helps. I just say “saw your maybes, tell me more” over a drink.']],
    likes: ['sofie'],
  },
  {
    group: 'couples-corner', by: 'maya', topic: 'Date night',
    title: 'Meeting a couple for the first time: tips?',
    body: 'Matched with a couple who seem lovely. Anything you wish someone had told you before your first time?',
    replies: [['lotte', 'Make sure you talk to both of them, not just one. And agree on a signal if anyone wants to call it a night.'], ['daan', 'From the couple side: we always do a drink first, no expectations. Ask them how they handle that.']],
    likes: ['lotte', 'daan'],
  },
  {
    group: 'kink-101', by: 'lotte', topic: 'Kink 101',
    title: 'Safe words: traffic lights or something else?',
    body: 'Green / yellow / red has worked for me so far, but curious what others use, especially for non-verbal moments.',
    replies: [['maya', 'Traffic lights plus a hand signal: two taps means stop. Agree on it before anything starts.'], ['sofie', 'Thanks for asking this, I didn’t know about the non-verbal one.']],
    likes: ['maya', 'sofie'],
  },
  {
    group: 'over-35', by: 'ines', topic: 'Confidence',
    title: 'Back on the scene after a long relationship',
    body: 'Twelve years off the market. The apps feel very different now. Anyone else in the same boat?',
    replies: [['daan', 'Same here, eight years. Honestly this place is a lot more relaxed than the big apps. Clear intentions helps.']],
    likes: ['daan'],
  },
  {
    group: 'queer-curious', by: 'sofie', topic: 'First times',
    title: 'Curious but never acted on it',
    body: 'I’ve always been curious about women but never done anything about it. Is it okay to say that on my profile?',
    replies: [['maya', 'Absolutely. “Curious” is a perfectly good answer, and people here appreciate the honesty.'], ['lotte', 'Plenty of people start exactly there. Take it at your own pace.']],
    likes: ['maya', 'lotte'],
  },
];

for (const [group, slugs] of Object.entries(MEMBERS)) {
  for (const slug of slugs) {
    const { error } = await who[slug].client.from('group_members').upsert({ group_id: bySlug[group], user_id: who[slug].id });
    if (error) console.warn(`${slug} join ${group}: ${error.message}`);
  }
}

for (const p of POSTS) {
  const author = who[p.by];
  const { data, error } = await author.client
    .from('posts')
    .insert({ author: author.id, topic: p.topic, title: p.title, body: p.body, photos: [], spicy: false, poll_options: p.poll || null, group_id: bySlug[p.group] })
    .select('id')
    .single();
  if (error) {
    console.warn(`post "${p.title}": ${error.message}`);
    continue;
  }
  for (const [slug, body] of p.replies || []) {
    const { error: e } = await who[slug].client.from('comments').insert({ post_id: data.id, author: who[slug].id, body });
    if (e) console.warn(`reply by ${slug}: ${e.message}`);
  }
  for (const slug of p.likes || []) {
    const { error: e } = await who[slug].client.from('post_likes').upsert({ post_id: data.id, user_id: who[slug].id });
    if (e) console.warn(`like by ${slug}: ${e.message}`);
  }
  console.log(`posted in ${p.group}: ${p.title}`);
}

const { data: after } = await any.rpc('group_list');
for (const g of after) console.log(`${g.name}: ${g.members} members`);
