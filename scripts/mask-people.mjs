// Puts the app's masks on the demo people's photos, the way the Mask editor does on the phone:
// find the face (scripts/find-faces.py, OpenCV), place the mask with the app's own fitMask (src/faceFit.js),
// and burn the same mask art into the photo (1080 wide, cropped to the app's 342 by 430 frame).
// Which mask: "- **Mask:**" in scripts/people-prompts.md (bunny, masq, kitten, frost).
//
//   node scripts/mask-people.mjs [<slug> …]     (all people when none are named)
// Writes assets/demo-raw/<slug>/masked-1.png …; scripts/seed-demo.mjs uploads those instead of the bare photos.
// Art and transforms mirror src/screens/MaskEditor.js — change both together.
import { Buffer } from 'node:buffer';
import { execFileSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';
import { loadPeople } from './generate-people.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const fitSrc = await readFile(join(root, 'src', 'faceFit.js'), 'utf8');
const { fitMask, ART_BRIDGE_X, ART_EYE_Y, ART_BAND_Y } = await import(`data:text/javascript;base64,${Buffer.from(fitSrc).toString('base64')}`);

const VW = 342;
const VH = 430;
const OUT_W = 1080;
const OUT_H = Math.round((OUT_W * VH) / VW);

// ─────────── Mask art (same paths as MaskEditor.js) ───────────
const BODY = 'M72 194C98 196 136 188 171 205C206 188 244 196 270 194C266 234 246 264 212 265C193 266 182 255 171 248C160 255 149 266 130 265C96 264 76 234 72 194Z';
const HOLES = 'M112 227Q135 208 158 227Q135 241 112 227Z M184 227Q207 208 230 227Q207 241 184 227Z';
const EYES = `${BODY} ${HOLES}`;
const BAND = 'M86 132Q171 58 256 132';

const DEFS = `
<linearGradient id="satin" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3A1828"/><stop offset="0.55" stop-color="#14080F"/><stop offset="1" stop-color="#070306"/></linearGradient>
<linearGradient id="trimPink" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FF7FB5"/><stop offset="0.5" stop-color="#F0287A"/><stop offset="1" stop-color="#B01E8E"/></linearGradient>
<linearGradient id="velvetViolet" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4B2A7A"/><stop offset="1" stop-color="#170C2A"/></linearGradient>
<linearGradient id="gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFE6A3"/><stop offset="0.5" stop-color="#E8B64C"/><stop offset="1" stop-color="#A8761E"/></linearGradient>
<linearGradient id="earInner" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FF9CC6"/><stop offset="1" stop-color="#E0246F"/></linearGradient>
<linearGradient id="feather" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#7B3CFF"/><stop offset="1" stop-color="#E3C8FF"/></linearGradient>
<clipPath id="maskLeftHalf"><rect x="-800" y="-800" width="971.6" height="2000"/></clipPath>
<clipPath id="maskRightHalf"><rect x="170.4" y="-800" width="1000" height="2000"/></clipPath>
<radialGradient id="frost" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#2A2430" stop-opacity="0.98"/><stop offset="0.8" stop-color="#2A2430" stop-opacity="0.95"/><stop offset="1" stop-color="#2A2430" stop-opacity="0.75"/></radialGradient>`;

const shadow = (d) => `<path d="${d}" fill="#000000" opacity="0.32" transform="translate(0 5)" fill-rule="evenodd"/>`;
const eyeMask = (fill, trim, shine = 0.22) => `<g>${shadow(EYES)}
<path d="${EYES}" fill-rule="evenodd" fill="${fill}" stroke="${trim}" stroke-width="3" stroke-linejoin="round"/>
<path d="${HOLES}" fill="none" stroke="${trim}" stroke-width="1.6" opacity="0.9"/>
<path d="M84 202C106 200 142 196 166 208M176 208C200 196 236 200 258 202" fill="none" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" opacity="${shine}"/></g>`;
const lace = (c) => `<g fill="none" stroke="${c}" stroke-width="1.3" opacity="0.75"><path d="M98 246q14 12 30 12M244 246q-14 12-30 12"/>
<circle cx="104" cy="252" r="2.4"/><circle cx="116" cy="258" r="2.4"/><circle cx="238" cy="252" r="2.4"/><circle cx="226" cy="258" r="2.4"/><circle cx="171" cy="238" r="2"/></g>`;
const band = `<path d="${BAND}" fill="none" stroke="#120A10" stroke-width="9" stroke-linecap="round"/><path d="${BAND}" fill="none" stroke="url(#trimPink)" stroke-width="2" stroke-linecap="round" opacity="0.9"/>`;

const ART = {
  bunny: {
    ears: `<g transform="translate(0 16)"><g opacity="0.98">
<path d="M112 104C96 64 98 6 120 -10C142 6 146 64 136 100Z" fill="#000000" opacity="0.25" transform="translate(2 4)"/>
<path d="M112 104C96 64 98 6 120 -10C142 6 146 64 136 100Z" fill="url(#satin)" stroke="url(#trimPink)" stroke-width="2.5"/>
<path d="M116 94C108 64 110 20 120 6C130 20 132 64 128 92Z" fill="url(#earInner)"/>
<path d="M206 100C196 64 200 6 222 -10C244 6 246 64 230 104Z" fill="#000000" opacity="0.25" transform="translate(2 4)"/>
<path d="M206 100C196 64 200 6 222 -10C244 6 246 64 230 104Z" fill="url(#satin)" stroke="url(#trimPink)" stroke-width="2.5"/>
<path d="M214 92C210 64 212 20 222 6C232 20 234 64 226 94Z" fill="url(#earInner)"/></g>${band}</g>`,
    face: `<g>${eyeMask('url(#satin)', 'url(#trimPink)')}${lace('#FF7FB5')}
<path d="M258 210c-2.5-6-11-5-10.5 1.8c.5 5 10.5 10.2 10.5 10.2s10-5.2 10.5-10.2c.5-6.8-8-7.8-10.5-1.8z" fill="url(#trimPink)"/></g>`,
  },
  masq: {
    face: `<g>
<path d="M250 206C262 160 286 118 312 96C304 140 286 180 258 214Z" fill="url(#feather)" opacity="0.95"/>
<path d="M254 212C276 178 304 154 330 146C314 176 290 200 262 220Z" fill="url(#feather)" opacity="0.8"/>
<path d="M250 204C252 160 262 120 276 92C282 130 274 172 258 210Z" fill="#C3A2FF" opacity="0.75"/>
<path d="M258 214L300 120" stroke="#F4EFEA" stroke-width="1" opacity="0.5"/>
${eyeMask('url(#velvetViolet)', 'url(#gold)', 0.28)}
<path d="M100 240q16 18 40 20M242 240q-16 18-40 20" fill="none" stroke="url(#gold)" stroke-width="1.8" opacity="0.9"/>
<circle cx="171" cy="206" r="5.5" fill="url(#gold)"/><circle cx="92" cy="222" r="3" fill="url(#gold)"/><circle cx="250" cy="222" r="3" fill="url(#gold)"/></g>`,
  },
  kitten: {
    ears: `<g transform="translate(0 16)">
<path d="M100 118L112 36L156 96Z" fill="#000000" opacity="0.25" transform="translate(2 4)"/>
<path d="M100 118L112 36L156 96Z" fill="url(#satin)" stroke="url(#trimPink)" stroke-width="2.5" stroke-linejoin="round"/>
<path d="M112 104L118 60L142 94Z" fill="url(#earInner)"/>
<path d="M242 118L230 36L186 96Z" fill="#000000" opacity="0.25" transform="translate(2 4)"/>
<path d="M242 118L230 36L186 96Z" fill="url(#satin)" stroke="url(#trimPink)" stroke-width="2.5" stroke-linejoin="round"/>
<path d="M230 104L224 60L200 94Z" fill="url(#earInner)"/>${band}</g>`,
    face: `<g>${eyeMask('url(#satin)', 'url(#trimPink)')}
<g stroke="#FF9CC6" stroke-width="1.8" stroke-linecap="round" opacity="0.75"><path d="M104 270l-34-6M106 280l-34 4M238 270l34-6M236 280l34 4"/></g></g>`,
  },
  frost: {
    face: `<g><ellipse cx="171" cy="258" rx="92" ry="128" fill="url(#frost)"/><ellipse cx="171" cy="258" rx="92" ry="128" fill="none" stroke="#6FA8FF" stroke-width="1.5" opacity="0.5"/></g>`,
  },
};

const half = (p, sx) => `translate(${p.x} ${p.y}) rotate(${p.r || 0}) scale(${sx} ${p.sy}) translate(${-ART_BRIDGE_X} ${-ART_EYE_Y})`;
const earsAt = (p) => {
  const s = (p.sl + p.sr) / 2;
  const top = p.top ?? -(ART_EYE_Y - ART_BAND_Y) * p.sy;
  return `translate(${p.x} ${p.y}) rotate(${p.r || 0}) translate(0 ${top}) scale(${s}) translate(${-ART_BRIDGE_X} ${-ART_BAND_Y})`;
};

function fitted(place, mask) {
  const art = ART[mask];
  return `${art.ears ? `<g transform="${earsAt(place)}">${art.ears}</g>` : ''}
<g transform="${half(place, place.sl)}"><g clip-path="url(#maskLeftHalf)">${art.face}</g></g>
<g transform="${half(place, place.sr)}"><g clip-path="url(#maskRightHalf)">${art.face}</g></g>`;
}

// Photo pixels → frame units (the photo fills the frame like "cover"), then the same fallbacks as facePartsFromMlKit.
function placeFor(face) {
  if (!face.box) return null;
  const f = Math.max(VW / face.w, VH / face.h);
  const ox = (VW - face.w * f) / 2;
  const oy = (VH - face.h * f) / 2;
  const toFrame = (p) => ({ x: ox + p.x * f, y: oy + p.y * f });
  const tl = toFrame(face.box);
  const box = { x: tl.x, y: tl.y, w: face.box.w * f, h: face.box.h * f };
  let [eyeL, eyeR] = face.eyes.map(toFrame);
  if (!eyeL || !eyeR || Math.hypot(eyeL.x - eyeR.x, eyeL.y - eyeR.y) < box.w * 0.15) {
    // OpenCV's face box is tighter than ML Kit's: the eyes sit at about 40% of its height.
    eyeL = { x: box.x + box.w * 0.31, y: box.y + box.h * 0.4 };
    eyeR = { x: box.x + box.w * 0.69, y: box.y + box.h * 0.4 };
  }
  return fitMask({ eyeL, eyeR, box, oval: [], bridge: [] });
}

const { people, show } = await loadPeople();
const wanted = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const todo = people.filter((p) => !wanted.length || wanted.includes(p.slug));
// The photos the app shows (Show in people-prompts.md), each given a phone-camera finish first (roughen.py → rough-N.jpg).
const jobs = todo.flatMap((p) =>
  show
    .map((n) => ({ p, n, src: join(root, 'assets', 'demo-raw', p.slug, `${n}.jpg`), file: join(root, 'assets', 'demo-raw', p.slug, `rough-${n}.jpg`) }))
    .filter((j) => existsSync(j.src)),
);
execFileSync('python', ['-I', join(root, 'scripts', 'roughen.py'), ...jobs.flatMap((j) => [j.src, j.file])]);
const faces = JSON.parse(execFileSync('python', ['-I', join(root, 'scripts', 'find-faces.py'), ...jobs.map((j) => j.file)], { encoding: 'utf8', maxBuffer: 1 << 24 }));
// Hand-measured faces win over detection (scripts/mask-overrides.json, keyed "<slug>/rough-<n>.jpg", rough-photo pixels).
const overrides = JSON.parse(await readFile(join(root, 'scripts', 'mask-overrides.json'), 'utf8'));
for (const j of jobs) {
  const o = overrides[`${j.p.slug}/rough-${j.n}.jpg`];
  if (o) faces[j.file] = { ...faces[j.file], ...o };
}

for (const p of todo) {
  const mask = p.Mask || 'masq';
  if (!ART[mask]) { console.log(`${p.name}: unknown mask "${mask}"`); continue; }
  for (const { n, file } of jobs.filter((j) => j.p === p)) {
    const place = placeFor(faces[file]);
    if (!place) { console.log(`${p.name} ${n}.jpg: no face found — left bare`); continue; }
    const photo = `data:image/jpeg;base64,${(await readFile(file)).toString('base64')}`;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${OUT_W}" height="${OUT_H}" viewBox="0 0 ${VW} ${VH}"><defs>${DEFS}</defs>
<image href="${photo}" x="0" y="0" width="${VW}" height="${VH}" preserveAspectRatio="xMidYMid slice"/>${fitted(place, mask)}</svg>`;
    const png = new Resvg(svg, { fitTo: { mode: 'width', value: OUT_W } }).render().asPng();
    await writeFile(join(dirname(file), `masked-${n}.png`), png);
    console.log(`${p.name} ${n}.jpg: ${mask}${faces[file].eyes.length === 2 ? '' : ' (eyes from the face box)'}`);
  }
}
