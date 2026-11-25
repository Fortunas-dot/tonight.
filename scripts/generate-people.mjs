// Generates the demo people's photos with fal.ai (same method as Passportbros' generate-ladies.mjs).
// All prompts live in scripts/people-prompts.md.
// 1) portrait: Flux dev + the Boreal v2 "boring reality" LoRA — an ordinary snapshot look            → 1.jpg
// 2) other shots: Nano Banana Pro edit keeps the face from 1.jpg, then a light Flux + Boreal
//    image-to-image pass takes off the polish                                                          → 2.jpg, 3.jpg
// Everything lands in assets/demo-raw/<slug>/ (git-ignored) with meta.json; the seed script uploads from there.
//
// Usage:  node scripts/generate-people.mjs <slug> [<slug> …]   |   --all
// Flags:  --portraits   only portraits      --force   redo existing files
//         --try N       N portrait options as try-1.jpg …      --pick K   use try-K.jpg as the portrait
//         --shot N      with --try / --pick: the same for shot N (2 Night out, 3 Daytime)
// Needs FAL_KEY in .env (never bundled into the app).
import { Buffer } from 'node:buffer';
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const BOREAL = 'https://huggingface.co/kudzueye/boreal-flux-dev-v2/resolve/main/boreal-v2.safetensors';
export const SHOTS = ['Night out', 'Daytime', 'Mirror', 'Selfie', 'Party', 'Candid'];
const SHOT_MODEL = 'nano-banana-pro/edit → flux-lora i2i + boreal-v2';

// "## Name (slug)" sections with "- **Key:** value" lines; "## Settings" holds the shared values.
export async function loadPeople() {
  const md = await readFile(join(root, 'scripts', 'people-prompts.md'), 'utf8');
  let settings = {};
  const people = [];
  for (const sec of md.split(/^## /m).slice(1)) {
    const [heading, ...lines] = sec.split(/\r?\n/);
    const fields = {};
    for (const line of lines) {
      const m = line.match(/^- \*\*(.+?):\*\*\s*(.+)$/);
      if (m) fields[m[1].trim()] = m[2].trim();
    }
    if (heading.trim() === 'Settings') { settings = fields; continue; }
    const h = heading.match(/^(.+?)\s*\((.+)\)\s*$/);
    if (h && fields.Who) people.push({ name: h[1].trim(), slug: h[2].trim(), ...fields });
  }
  const [width, height] = (settings.Size || '768x1024').split('x').map(Number);
  return {
    settings: { prefix: settings.Prefix || 'phone photo of', strength: Number(settings['Boreal strength'] || 0.85), width, height },
    // Which photos the app shows, in order (1 is the portrait, 2… the SHOTS); missing ones are skipped.
    show: (settings.Show || '1, 2, 3').split(/,\s*/).filter(Boolean),
    people,
  };
}

export async function fromDotEnv(name) {
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
  if (body.has_nsfw_concepts?.[0]) throw new Error(`${model} flagged the result; adjust the prompt`);
  return body;
}

async function download(url, file) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download failed: HTTP ${res.status}`);
  await writeFile(file, Buffer.from(await res.arrayBuffer()));
}

async function readMeta(dir, p) {
  try { return JSON.parse(await readFile(join(dir, 'meta.json'), 'utf8')); } catch { return { slug: p.slug, name: p.name, shots: [] }; }
}
const record = (meta, entry) => { meta.shots = [...meta.shots.filter((s) => s.file !== entry.file), entry].sort((a, b) => a.file.localeCompare(b.file)); };

async function makePerson(key, settings, person, { portraitsOnly, force, tries, pick, shot }) {
  const dir = join(root, 'assets', 'demo-raw', person.slug);
  await mkdir(dir, { recursive: true });
  const meta = await readMeta(dir, person);
  const saveMeta = () => writeFile(join(dir, 'meta.json'), JSON.stringify(meta, null, 2));
  const prompt = (scene) => `${settings.prefix} ${person.Who}, ${scene}`;
  const boreal = { loras: [{ path: BOREAL, scale: settings.strength }], num_inference_steps: 28, guidance_scale: 3.5, output_format: 'jpeg', enable_safety_checker: true };
  const pronoun = person.Gender === 'Man' ? 'man' : 'woman';
  // The edit endpoint takes data URIs, so the local portrait is the face reference.
  const reference = async () => `data:image/jpeg;base64,${(await readFile(join(dir, '1.jpg'))).toString('base64')}`;
  const sameFace = async (p, ref, keepAs) => {
    const same = await fal(key, 'fal-ai/nano-banana-pro/edit', {
      prompt: `${p}. Same ${pronoun} as in the reference photo.`, image_urls: [ref], aspect_ratio: '3:4', resolution: '1K', output_format: 'jpeg',
    });
    await download(same.images[0].url, join(dir, keepAs)); // kept to judge each step
    return fal(key, 'fal-ai/flux-lora/image-to-image', { ...boreal, prompt: p, image_url: same.images[0].url, strength: 0.35 });
  };

  if (shot) {
    const label = SHOTS[shot - 2];
    if (!label || !person[label]) throw new Error(`no shot ${shot}; use 2–${SHOTS.length + 1} (${SHOTS.join(', ')})`);
    if (tries) {
      const p = prompt(person[label]);
      const ref = await reference();
      console.log(`${person.name}: ${tries} ${label} options…`);
      const seeds = await Promise.all(Array.from({ length: tries }, async (_, i) => {
        const r = await sameFace(p, ref, `${shot}-try-${i + 1}-same-face.jpg`);
        await download(r.images[0].url, join(dir, `${shot}-try-${i + 1}.jpg`));
        return r.seed;
      }));
      meta.shotTries = { ...meta.shotTries, [shot]: { label, prompt: p, seeds } };
      return saveMeta();
    }
    if (!pick) throw new Error('--shot needs --try N or --pick K');
    const src = join(dir, `${shot}-try-${pick}.jpg`);
    if (!existsSync(src)) throw new Error(`no option ${pick}; run --shot ${shot} --try first`);
    await copyFile(src, join(dir, `${shot}.jpg`));
    const t = meta.shotTries?.[shot];
    record(meta, { file: `${shot}.jpg`, label, model: SHOT_MODEL, prompt: t?.prompt, seed: t?.seeds?.[pick - 1], picked: pick });
    return saveMeta();
  }

  if (tries) {
    const p = prompt(person.Portrait);
    console.log(`${person.name}: ${tries} portrait options…`);
    const r = await fal(key, 'fal-ai/flux-lora', { ...boreal, prompt: p, num_images: tries, image_size: { width: settings.width, height: settings.height } });
    for (const [i, img] of r.images.entries()) await download(img.url, join(dir, `try-${i + 1}.jpg`));
    meta.tries = { prompt: p, seed: r.seed };
    return saveMeta();
  }
  if (pick) {
    const src = join(dir, `try-${pick}.jpg`);
    if (!existsSync(src)) throw new Error(`no option ${pick}; run --try first`);
    await copyFile(src, join(dir, '1.jpg'));
    record(meta, { file: '1.jpg', label: 'Portrait', model: 'flux-lora + boreal-v2', prompt: meta.tries?.prompt, seed: meta.tries?.seed, picked: pick });
    return saveMeta();
  }
  if (force || !existsSync(join(dir, '1.jpg'))) {
    console.log(`${person.name}: portrait…`);
    const p = prompt(person.Portrait);
    const r = await fal(key, 'fal-ai/flux-lora', { ...boreal, prompt: p, image_size: { width: settings.width, height: settings.height } });
    await download(r.images[0].url, join(dir, '1.jpg'));
    record(meta, { file: '1.jpg', label: 'Portrait', model: 'flux-lora + boreal-v2', prompt: p, seed: r.seed });
    await saveMeta();
  }
  if (portraitsOnly) return;

  const ref = await reference();
  for (const [i, label] of SHOTS.entries()) {
    const file = `${i + 2}.jpg`;
    if (!person[label] || (!force && existsSync(join(dir, file)))) continue;
    console.log(`${person.name}: ${label}…`);
    const p = prompt(person[label]);
    const r = await sameFace(p, ref, `${i + 2}-same-face.jpg`);
    await download(r.images[0].url, join(dir, file));
    record(meta, { file, label, model: SHOT_MODEL, prompt: p, seed: r.seed });
    await saveMeta();
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const { settings, people } = await loadPeople();
  const args = process.argv.slice(2);
  const wanted = args.includes('--all') ? people : people.filter((p) => args.includes(p.slug));
  if (!wanted.length) {
    console.log(`Name one or more people, or --all. Available: ${people.map((p) => p.slug).join(', ')}`);
    process.exit(1);
  }
  const key = await fromDotEnv('FAL_KEY');
  if (!key) { console.log('FAL_KEY missing in .env'); process.exit(1); }
  const flag = (name) => { const i = args.indexOf(name); return i >= 0 ? Number(args[i + 1]) : 0; };
  const opts = { portraitsOnly: args.includes('--portraits'), force: args.includes('--force'), tries: flag('--try'), pick: flag('--pick'), shot: flag('--shot') };
  const queue = [...wanted];
  await Promise.all(Array.from({ length: 4 }, async () => {
    while (queue.length) {
      const p = queue.shift();
      try { await makePerson(key, settings, p, opts); console.log(`${p.name}: done`); } catch (e) { console.log(`${p.name}: FAILED — ${e.message}`); }
    }
  }));
}
