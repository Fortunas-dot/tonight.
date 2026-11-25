// Generates the cartoon crew (Blaze, Volt, Vi) and Ward the watchdog with fal.ai Nano Banana Pro.
// Style follows design-src/CharsC.dc.html ("Cartoon people", chosen on the canvas) and PRODUCT_UX §3c/§3g.
// Output: assets/cartoons-raw/<slug>/try-N.png (git-ignored) + assets/cartoons-raw/index.html contact sheet.
//
// Usage:  node scripts/generate-cartoons.mjs [--try N] [<slug> …]     (default: all four, 4 options each)
// Needs FAL_KEY in .env (never bundled into the app).
import { Buffer } from 'node:buffer';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'assets', 'cartoons-raw');

const STYLE =
  'Flat 2D vector cartoon illustration, clean bold shapes, smooth gradients, soft rim light, ' +
  'modern app mascot style, friendly and a little flirty, cute and wholesome, fully clothed, ' +
  'half-body portrait centered, plain very dark plum background (#0E0C10), ' +
  'color palette of hot pink #F0287A, electric blue #3B7BFF and violet #7B3CFF, no text, no logo, no watermark';

export const CREW = {
  blaze: {
    name: 'Blaze',
    who: 'a young woman with long dark wavy hair and a pink headband, winking playfully with a confident smile, ' +
      'red lips, gold hoop earring, rosy cheeks, wearing a hot pink top',
  },
  volt: {
    name: 'Volt',
    who: 'a young Black man with a short quiff and a neat trimmed beard, raising one eyebrow with a cheeky grin, ' +
      'wearing an electric blue shirt with an open collar',
  },
  vi: {
    name: 'Vi',
    who: 'a young androgynous person with big violet curly hair, round black glasses, freckles and blushing cheeks, ' +
      'smiling warmly with eyes closed happily, wearing a cozy violet hoodie',
  },
  ash: {
    name: 'Ash',
    who: 'a young white man with tousled light brown hair and light stubble, blue eyes, a relaxed charming half-smile, ' +
      'wearing a white t-shirt under a light blue denim jacket',
  },
  nova: {
    name: 'Nova',
    who: 'a young East Asian woman with a sleek black bob with bangs, sparkling eyes, a playful smile with a small blush, ' +
      'small star stud earrings, wearing a violet-pink satin top',
  },
  ward: {
    name: 'Ward',
    who: 'a Doberman dog mascot sitting upright, tall pointy ears, glossy blue-black coat with tan markings, amber eyes, ' +
      'blue collar with a small shield-shaped tag, calm and alert expression, protective but friendly, never scary',
  },
};

async function fromDotEnv(name) {
  if (process.env[name]) return process.env[name];
  const text = await readFile(join(root, '.env'), 'utf8').catch(() => '');
  const line = text.split(/\r?\n/).find((l) => l.startsWith(`${name}=`));
  return line ? line.slice(name.length + 1).trim() : null;
}

async function fal(key, model, input) {
  const res = await fetch(`https://fal.run/${model}`, {
    method: 'POST',
    headers: { Authorization: `Key ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${model} → HTTP ${res.status}: ${JSON.stringify(body).slice(0, 400)}`);
  return body;
}

async function download(url, file) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download failed: HTTP ${res.status}`);
  await writeFile(file, Buffer.from(await res.arrayBuffer()));
}

async function makeOne(key, slug, tries) {
  const c = CREW[slug];
  const dir = join(out, slug);
  await mkdir(dir, { recursive: true });
  const prompt = `${STYLE}. The character: ${c.who}.`;
  console.log(`${c.name}: ${tries} options…`);
  const r = await fal(key, 'fal-ai/nano-banana-pro', {
    prompt, num_images: tries, aspect_ratio: '1:1', resolution: '1K', output_format: 'png',
  });
  for (const [i, img] of r.images.entries()) await download(img.url, join(dir, `try-${i + 1}.png`));
  await writeFile(join(dir, 'meta.json'), JSON.stringify({ name: c.name, model: 'fal-ai/nano-banana-pro', prompt, count: r.images.length }, null, 2));
  console.log(`${c.name}: saved ${r.images.length}`);
}

async function contactSheet() {
  let rows = '';
  for (const slug of Object.keys(CREW)) {
    const files = (await readdir(join(out, slug)).catch(() => [])).filter((f) => f.endsWith('.png')).sort();
    if (!files.length) continue;
    rows += `<h2>${CREW[slug].name}</h2><div class="row">${files
      .map((f) => `<figure><img src="${slug}/${f}"><figcaption>${slug} · ${f.replace('.png', '')}</figcaption></figure>`).join('')}</div>`;
  }
  await writeFile(join(out, 'index.html'), `<!doctype html><meta charset="utf-8"><title>Cartoon crew options</title>
<style>body{margin:0;padding:24px;background:#0E0C10;color:#F4EFEA;font:14px Inter,system-ui,sans-serif}
h1{margin:0 0 4px}h2{margin:28px 0 10px;color:#F0287A}.row{display:flex;gap:14px;flex-wrap:wrap}
figure{margin:0}img{width:260px;height:260px;border-radius:18px;display:block;background:#17131A}
figcaption{color:#A39AA2;font-size:12px;margin-top:6px}</style>
<h1>Cartoon crew — pick one per character</h1><p style="color:#A39AA2">fal.ai Nano Banana Pro · style from CharsC (Cartoon people)</p>${rows}`);
}

// ── Masks: same art as the people photos (scripts/mask-people.mjs), as references in assets/cartoons-raw/mask-<m>.png.
// node scripts/generate-cartoons.mjs --masks [blaze=4 …]   → <slug>/masked-N.png, from the chosen try-N.png
const MASKS = { blaze: ['bunny', 4], volt: ['masq', 4], vi: ['masq', 2], ash: ['masq', 2], nova: ['kitten', 1] };
const MASK_TEXT = {
  bunny: 'a black satin bunny eye mask with hot pink trim, grey eye openings, a tiny pink heart on one side and lace dots, plus a matching headband with tall black satin bunny ears lined in pink',
  masq: 'a deep violet velvet masquerade eye mask with gold trim, a small gold jewel between the eyes, and lilac feathers rising from one side',
  kitten: 'a black satin eye mask with hot pink trim and little pink whisker lines, plus a matching headband with pointed black satin cat ears lined in pink',
};
const dataUri = async (file) => `data:image/png;base64,${(await readFile(file)).toString('base64')}`;

async function maskOne(key, slug, from, count) {
  const [mask] = MASKS[slug];
  const dir = join(out, slug);
  const prompt =
    `Image 1 is the character, image 2 is the mask. Keep the character from image 1 exactly the same: same face, hair, ` +
    `skin tone, expression, clothes, pose, framing, flat vector cartoon style and dark background. ` +
    `Put the mask from image 2 on the character's face, worn over the eyes, with the eyes visible through the openings: ` +
    `${MASK_TEXT[mask]}. Draw the mask in the same flat cartoon style. No text.`;
  console.log(`${CREW[slug].name}: ${mask} mask on try-${from}…`);
  const r = await fal(key, 'fal-ai/nano-banana-pro/edit', {
    prompt, image_urls: [await dataUri(join(dir, `try-${from}.png`)), await dataUri(join(out, `mask-${mask}.png`))],
    num_images: count, aspect_ratio: '1:1', resolution: '1K', output_format: 'png',
  });
  for (const [i, img] of r.images.entries()) await download(img.url, join(dir, `masked-${i + 1}.png`));
  console.log(`${CREW[slug].name}: saved ${r.images.length} masked`);
}

const args = process.argv.slice(2);
if (args.includes('--masks')) {
  const key = await fromDotEnv('FAL_KEY');
  if (!key) { console.log('FAL_KEY missing in .env'); process.exit(1); }
  const picks = Object.fromEntries(args.filter((a) => a.includes('=')).map((a) => { const [s, n] = a.split('='); return [s, Number(n)]; }));
  const slugs = Object.keys(picks).length ? Object.keys(picks) : Object.keys(MASKS);
  const res = await Promise.allSettled(slugs.map((s) => maskOne(key, s, picks[s] || MASKS[s][1], 2)));
  res.forEach((r, i) => { if (r.status === 'rejected') console.log(`${slugs[i]} failed: ${r.reason.message}`); });
  process.exit(0);
}
const ti = args.indexOf('--try');
const tries = ti >= 0 ? Number(args[ti + 1]) : 4;
const wanted = args.filter((a, i) => !a.startsWith('--') && args[i - 1] !== '--try');
const slugs = wanted.length ? wanted : Object.keys(CREW);
const key = await fromDotEnv('FAL_KEY');
if (!key) { console.log('FAL_KEY missing in .env'); process.exit(1); }
const results = await Promise.allSettled(slugs.map((s) => makeOne(key, s, tries)));
results.forEach((r, i) => { if (r.status === 'rejected') console.log(`${slugs[i]} failed: ${r.reason.message}`); });
await contactSheet();
console.log(`Contact sheet: ${join(out, 'index.html')}`);
