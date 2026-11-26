// Puts the app's masks on the demo people's photos, the way the Mask editor does on the phone:
// find the face (scripts/find-faces.py, OpenCV), place the mask with the app's own fitMask (src/faceFit.js),
// and burn the same mask art into the photo (1080 wide, cropped to the app's 342 by 430 frame).
// Which mask: "- **Mask:**" in scripts/people-prompts.md (bunny, masq, kitten, devil, angel, lace, latex, bow, crystal, frost).
//
//   node scripts/mask-people.mjs [<slug> …]     (all people when none are named)
// Writes assets/demo-raw/<slug>/masked-1.png …; scripts/seed-demo.mjs uploads those instead of the bare photos.
// Art and transforms mirror src/screens/MaskEditor.js — change both together.
import { Buffer } from 'node:buffer';
import { execFileSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';
import { loadPeople } from './generate-people.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const fitSrc = await readFile(join(root, 'src', 'faceFit.js'), 'utf8');
const { fitMask, earsOf, ART_BRIDGE_X, ART_EYE_Y, ART_BAND_Y } = await import(`data:text/javascript;base64,${Buffer.from(fitSrc).toString('base64')}`);

const VW = 342;
const VH = 430;
const OUT_W = 1080;
const OUT_H = Math.round((OUT_W * VH) / VW);

// ─────────── Mask art (same paths as MaskEditor.js) ───────────
const BODY = 'M72 194C98 196 136 188 171 205C206 188 244 196 270 194C266 234 246 264 212 265C193 266 182 255 171 248C160 255 149 266 130 265C96 264 76 234 72 194Z';
const HOLES = 'M108 228C111 215 153 211 161 225C157 239 113 242 108 228Z M234 228C231 215 189 211 181 225C185 239 229 242 234 228Z';
const EYES = `${BODY} ${HOLES}`;
// Follows the top of the head out to the hair at the sides (a shallow arch floated above the hair). Apex at y 95 (+16 → ART_BAND_Y).
const BAND = 'M70 168C84 112 128 95 171 95C214 95 258 112 272 168';

const DEFS = `
<linearGradient id="satin" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3A1828"/><stop offset="0.55" stop-color="#14080F"/><stop offset="1" stop-color="#070306"/></linearGradient>
<linearGradient id="trimPink" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FF7FB5"/><stop offset="0.5" stop-color="#F0287A"/><stop offset="1" stop-color="#B01E8E"/></linearGradient>
<linearGradient id="velvetViolet" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4B2A7A"/><stop offset="1" stop-color="#170C2A"/></linearGradient>
<linearGradient id="gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFE6A3"/><stop offset="0.5" stop-color="#E8B64C"/><stop offset="1" stop-color="#A8761E"/></linearGradient>
<linearGradient id="earInner" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FF9CC6"/><stop offset="1" stop-color="#E0246F"/></linearGradient>
<linearGradient id="feather" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#7B3CFF"/><stop offset="1" stop-color="#E3C8FF"/></linearGradient>
<linearGradient id="lens" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#A9A3A8"/><stop offset="0.45" stop-color="#C9C4C8"/><stop offset="1" stop-color="#BDB8BC"/></linearGradient>
<linearGradient id="redSatin" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F0384E"/><stop offset="0.5" stop-color="#B80F2A"/><stop offset="1" stop-color="#5E0412"/></linearGradient>
<linearGradient id="horn" x1="0" y1="1" x2="0.3" y2="0"><stop offset="0" stop-color="#7A0616"/><stop offset="0.6" stop-color="#D3172F"/><stop offset="1" stop-color="#FF6B7D"/></linearGradient>
<linearGradient id="latex" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3A3A42"/><stop offset="0.35" stop-color="#0B0B0E"/><stop offset="1" stop-color="#020203"/></linearGradient>
<linearGradient id="silver" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset="0.5" stop-color="#C4C6CE"/><stop offset="1" stop-color="#7C7F8A"/></linearGradient>
<linearGradient id="pearl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset="0.6" stop-color="#F1ECEF"/><stop offset="1" stop-color="#D9D1D6"/></linearGradient>
<radialGradient id="crystal" cx="35%" cy="30%" r="70%"><stop offset="0" stop-color="#FFFFFF"/><stop offset="0.5" stop-color="#E9E6FF"/><stop offset="1" stop-color="#9890C0"/></radialGradient>
<pattern id="lacePat" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(18)"><circle cx="5" cy="5" r="3.3" fill="none" stroke="#000" stroke-width="1.4"/><circle cx="0" cy="0" r="1.4" fill="#000"/><circle cx="10" cy="0" r="1.4" fill="#000"/><circle cx="0" cy="10" r="1.4" fill="#000"/><circle cx="10" cy="10" r="1.4" fill="#000"/></pattern>
<clipPath id="maskBody"><path d="${EYES}" clip-rule="evenodd"/></clipPath>
<clipPath id="eyeOpenings"><path d="${HOLES}"/></clipPath>
<clipPath id="maskLeftHalf"><rect x="-800" y="-800" width="971.6" height="2000"/></clipPath>
<clipPath id="maskRightHalf"><rect x="170.4" y="-800" width="1000" height="2000"/></clipPath>
<radialGradient id="frost" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#2A2430" stop-opacity="0.98"/><stop offset="0.8" stop-color="#2A2430" stop-opacity="0.95"/><stop offset="1" stop-color="#2A2430" stop-opacity="0.75"/></radialGradient>`;

const shadow = (d) => `<path d="${d}" fill="#000000" opacity="0.32" transform="translate(0 5)" fill-rule="evenodd"/>`;
const eyeMask = (fill, trim, shine = 0.22) => `<g>${shadow(EYES)}
<path d="${EYES}" fill-rule="evenodd" fill="${fill}"/>
<path d="${BODY}" fill="none" stroke="${trim}" stroke-width="3" stroke-linejoin="round"/>
<path d="${HOLES}" fill="url(#lens)"/>
<g clip-path="url(#eyeOpenings)"><path d="${HOLES}" fill="none" stroke="#000" stroke-width="6" opacity="0.22" transform="translate(0 2)"/></g>
<path d="${HOLES}" fill="none" stroke="${trim}" stroke-width="1.1" opacity="0.55"/>
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

const bandIn = (c) => `<path d="${BAND}" fill="none" stroke="#120A10" stroke-width="9" stroke-linecap="round"/><path d="${BAND}" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round" opacity="0.9"/>`;
const crystals = (d, r = 3.4, gap = 7.5) => `<path d="${d}" fill="none" stroke="url(#crystal)" stroke-width="${r}" stroke-dasharray="0 ${gap}" stroke-linecap="round"/>`;
const LOWER = 'M72 194C76 234 96 264 130 265C149 266 160 255 171 248C182 255 193 266 212 265C246 264 266 234 270 194';
const TOPEDGE = 'M72 194C98 196 136 188 171 205C206 188 244 196 270 194';
// The six from Nov 2026 (same art as MaskEditor.js: Devil, BlackLace, Latex, Bow, Angel, Crystal).
const MORE = {
  devil: {
    ears: `<g transform="translate(0 16)">
<path d="M126 104C112 86 108 62 120 40C124 62 136 80 152 94Z" fill="#000" opacity="0.25" transform="translate(2 4)"/>
<path d="M126 104C112 86 108 62 120 40C124 62 136 80 152 94Z" fill="url(#horn)" stroke="#3A0008" stroke-width="2" stroke-linejoin="round"/>
<path d="M216 104C230 86 234 62 222 40C218 62 206 80 190 94Z" fill="#000" opacity="0.25" transform="translate(2 4)"/>
<path d="M216 104C230 86 234 62 222 40C218 62 206 80 190 94Z" fill="url(#horn)" stroke="#3A0008" stroke-width="2" stroke-linejoin="round"/>
<path d="M122 76C122 64 124 54 120 46M220 76C220 64 218 54 222 46" fill="none" stroke="#fff" stroke-width="1.6" opacity="0.35"/>
${bandIn('#D3172F')}</g>`,
    face: `<g>${eyeMask('url(#redSatin)', '#2A0006', 0.3)}<path d="M171 214l-5 -9h10z" fill="#2A0006"/></g>`,
  },
  lace: {
    face: `<g>${shadow(EYES)}<path d="${EYES}" fill-rule="evenodd" fill="#0A0709" opacity="0.55"/>
<g clip-path="url(#maskBody)"><rect x="60" y="180" width="230" height="100" fill="url(#lacePat)"/>
<path d="${HOLES}" fill="none" stroke="#0A0709" stroke-width="12"/></g>
<path d="${HOLES}" fill="url(#lens)"/><g clip-path="url(#eyeOpenings)"><path d="${HOLES}" fill="none" stroke="#000" stroke-width="6" opacity="0.22" transform="translate(0 2)"/></g>
<path d="${HOLES}" fill="none" stroke="#0A0709" stroke-width="2.4"/>
<path d="${LOWER}" fill="none" stroke="#0A0709" stroke-width="6.5" stroke-dasharray="0 8" stroke-linecap="round"/>
<path d="${TOPEDGE}" fill="none" stroke="#0A0709" stroke-width="3"/>
<path d="M171 205c-6-10-14-14-24-15M171 205c6-10 14-14 24-15" fill="none" stroke="#0A0709" stroke-width="2"/>
<path d="M258 206c-2.5-6-11-5-10.5 1.8c.5 5 10.5 10.2 10.5 10.2s10-5.2 10.5-10.2c.5-6.8-8-7.8-10.5-1.8z" fill="#D3172F"/></g>`,
  },
  latex: {
    face: `<g>${eyeMask('url(#latex)', '#55565E', 0.55)}
<path d="M80 200C104 196 140 194 166 210" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity="0.18"/>
<path d="${LOWER}" fill="none" stroke="url(#silver)" stroke-width="5" stroke-dasharray="0 11" stroke-linecap="round" transform="translate(0 -6)"/>
<circle cx="171" cy="214" r="7" fill="none" stroke="url(#silver)" stroke-width="2.6"/>
<circle cx="80" cy="200" r="3.6" fill="url(#silver)"/><circle cx="262" cy="200" r="3.6" fill="url(#silver)"/></g>`,
  },
  bow: {
    ears: `<g transform="translate(0 16)">${bandIn('#D3172F')}
<g transform="translate(205 98) rotate(14)">
<path d="M0 0C-12 -22 -44 -30 -48 -10C-52 8 -22 10 0 0Z" fill="#000" opacity="0.25" transform="translate(2 4)"/>
<path d="M0 0C12 -22 44 -30 48 -10C52 8 22 10 0 0Z" fill="#000" opacity="0.25" transform="translate(2 4)"/>
<path d="M0 0C-12 -22 -44 -30 -48 -10C-52 8 -22 10 0 0Z" fill="url(#redSatin)" stroke="#5E0412" stroke-width="1.5"/>
<path d="M0 0C12 -22 44 -30 48 -10C52 8 22 10 0 0Z" fill="url(#redSatin)" stroke="#5E0412" stroke-width="1.5"/>
<path d="M-3 2C-10 14 -16 26 -22 34L-12 32L-8 40C-4 28 0 14 0 4Z" fill="url(#redSatin)"/>
<path d="M3 2C10 14 16 26 22 34L12 32L8 40C4 28 0 14 0 4Z" fill="url(#redSatin)"/>
<ellipse cx="0" cy="-1" rx="7" ry="8" fill="#B80F2A" stroke="#5E0412" stroke-width="1.5"/>
<path d="M-40 -14C-32 -20 -20 -18 -10 -8M40 -14C32 -20 20 -18 10 -8" fill="none" stroke="#fff" stroke-width="1.5" opacity="0.4"/></g></g>`,
    face: `<g>${eyeMask('url(#redSatin)', '#5E0412', 0.32)}</g>`,
  },
  angel: {
    ears: `<g transform="translate(0 16)">
<ellipse cx="171" cy="62" rx="62" ry="13" fill="none" stroke="#FFE6A3" stroke-width="10" opacity="0.25"/>
<ellipse cx="171" cy="62" rx="62" ry="13" fill="none" stroke="url(#gold)" stroke-width="5"/>
<ellipse cx="171" cy="60" rx="58" ry="10" fill="none" stroke="#fff" stroke-width="1.2" opacity="0.6"/></g>`,
    face: `<g>${eyeMask('url(#pearl)', 'url(#gold)', 0.5)}
<path d="M100 240q16 18 40 20M242 240q-16 18-40 20" fill="none" stroke="url(#gold)" stroke-width="1.6" opacity="0.9"/>
<circle cx="171" cy="207" r="4.5" fill="url(#crystal)"/></g>`,
  },
  crystal: {
    face: `<g>${eyeMask('url(#satin)', '#2B2230', 0.35)}
${crystals(TOPEDGE, 4, 7.2)}
${crystals(HOLES, 2.6, 5.4)}
<path d="M96 246C110 268 130 276 150 270M246 246C232 268 212 276 192 270" fill="none" stroke="url(#crystal)" stroke-width="2.6" stroke-dasharray="0 6" stroke-linecap="round"/>
<path d="M124 262v14M218 262v14" stroke="url(#crystal)" stroke-width="2.6" stroke-dasharray="0 5" stroke-linecap="round"/>
<circle cx="124" cy="281" r="3.6" fill="url(#crystal)"/><circle cx="218" cy="281" r="3.6" fill="url(#crystal)"/>
<circle cx="171" cy="206" r="5" fill="url(#crystal)"/></g>`,
  },
};
Object.assign(ART, MORE);

const half = (p, sx) => `translate(${p.x} ${p.y}) rotate(${p.r || 0}) scale(${sx} ${p.sy}) translate(${-ART_BRIDGE_X} ${-ART_EYE_Y})`;
// Same as MaskEditor's earsTransform: the ears' own offset and scale from fitMask.
const earsAt = (p) => {
  const e = earsOf(p);
  return `translate(${p.x + e.ex} ${p.y + e.ey}) rotate(${p.r || 0}) scale(${e.es}) translate(${-ART_BRIDGE_X} ${-ART_BAND_Y})`;
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
  return fitMask({ eyeL, eyeR, box, oval: face.edges ? outline(eyeL, eyeR, face.edges) : [], bridge: [] });
}

// A face outline like ML Kit's, from hand-measured edges: where the face's edge crosses the eye line, in eye gaps
// from the middle between the eyes ([left, right], e.g. [-0.9, 1.2] on a head turned to the right). The outline is
// an ellipse from forehead (1.5 gaps above the eyes) to chin (1.9 below), so fitMask gets each side's width right.
function outline(eyeL, eyeR, [tl, tr]) {
  const gap = Math.hypot(eyeR.x - eyeL.x, eyeR.y - eyeL.y);
  const roll = Math.atan2(eyeR.y - eyeL.y, eyeR.x - eyeL.x);
  const mid = { x: (eyeL.x + eyeR.x) / 2, y: (eyeL.y + eyeR.y) / 2 };
  const cy = 0.2 * gap;
  const ry = 1.7 * gap;
  const rx = (((tr - tl) / 2) * gap) / Math.sqrt(1 - (cy / ry) ** 2);
  const cx = ((tl + tr) / 2) * gap;
  return Array.from({ length: 36 }, (_, i) => {
    const a = (i / 36) * 2 * Math.PI;
    const u = cx + rx * Math.cos(a);
    const v = cy + ry * Math.sin(a);
    return { x: mid.x + u * Math.cos(roll) - v * Math.sin(roll), y: mid.y + u * Math.sin(roll) + v * Math.cos(roll) };
  });
}

const { people, show } = await loadPeople();
const wanted = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const todo = people.filter((p) => !wanted.length || wanted.includes(p.slug));
// The photos the app shows (Show in people-prompts.md), each given a phone-camera finish first (roughen.py → rough-N.jpg).
const jobs = todo.flatMap((p) =>
  (p.Show ? p.Show.split(/,\s*/) : show)
    .map((n) => ({ p, n, src: join(root, 'assets', 'demo-raw', p.slug, `${n}.jpg`), file: join(root, 'assets', 'demo-raw', p.slug, `rough-${n}.jpg`) }))
    .filter((j) => existsSync(j.src)),
);
// Only when the photo is new or changed: the finish is the same every run, and the hand-measured faces depend on it.
const stale = jobs.filter((j) => !existsSync(j.file) || statSync(j.file).mtimeMs < statSync(j.src).mtimeMs);
if (stale.length) execFileSync('python', ['-I', join(root, 'scripts', 'roughen.py'), ...stale.flatMap((j) => [j.src, j.file])]);
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
