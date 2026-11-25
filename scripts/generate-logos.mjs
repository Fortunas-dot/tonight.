// App icon concepts with fal.ai Nano Banana Pro → assets/cartoons-raw/logos/<id>-N.png (git-ignored).
// node scripts/generate-logos.mjs [id …]
import { Buffer } from 'node:buffer';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'assets', 'cartoons-raw', 'logos');

const BASE =
  'iOS app icon, square, full-bleed background, one bold simple centered symbol that reads clearly at small size, ' +
  'premium and seductive nightlife brand, deep near-black plum background #0E0C10 with a soft glow, ' +
  'palette of hot pink #F0287A, electric blue #3B7BFF and violet #7B3CFF, smooth gradients, crisp vector edges, ' +
  'no text, no letters unless asked, no watermark, no rounded-corner frame, no mockup';

const CONCEPTS = {
  'neon-bunny': 'a glowing pink neon-tube outline of an elegant bunny head with tall ears wearing a small eye mask, like a club sign',
  'satin-mask': 'a glossy black satin eye mask with tall bunny ears lined in hot pink, a single pink heart on one side, seen straight on, luxurious',
  't-ears': 'a bold lowercase letter "t" in a pink-to-blue gradient whose top forms two bunny ears, with a small pink dot after it, playful monogram',
  keyhole: 'a glowing golden-pink keyhole whose top is shaped like a pair of bunny ears, set in a dark velvet door, secret members-only feel',
  'moon-ears': 'a thin crescent moon in pink-violet gradient with a pair of bunny ears silhouetted against it, night sky with two tiny stars',
  'two-masks': 'two overlapping masquerade eye masks, one pink with bunny ears and one electric blue with a feather, forming a couple, slightly tilted toward each other',
};

async function fromDotEnv(name) {
  if (process.env[name]) return process.env[name];
  const text = await readFile(join(root, '.env'), 'utf8').catch(() => '');
  const line = text.split(/\r?\n/).find((l) => l.startsWith(`${name}=`));
  return line ? line.slice(name.length + 1).trim() : null;
}

async function makeOne(key, id) {
  const res = await fetch('https://fal.run/fal-ai/nano-banana-pro', {
    method: 'POST',
    headers: { Authorization: `Key ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: `${BASE}. The symbol: ${CONCEPTS[id]}.`, num_images: 2, aspect_ratio: '1:1', resolution: '1K', output_format: 'png' }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${JSON.stringify(body).slice(0, 300)}`);
  for (const [i, img] of body.images.entries()) {
    const r = await fetch(img.url);
    await writeFile(join(out, `${id}-${i + 1}.png`), Buffer.from(await r.arrayBuffer()));
  }
  console.log(`${id}: saved ${body.images.length}`);
}

const key = await fromDotEnv('FAL_KEY');
if (!key) { console.log('FAL_KEY missing in .env'); process.exit(1); }
await mkdir(out, { recursive: true });
const ids = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(CONCEPTS);
const results = await Promise.allSettled(ids.map((id) => makeOne(key, id)));
results.forEach((r, i) => { if (r.status === 'rejected') console.log(`${ids[i]} failed: ${r.reason.message}`); });
