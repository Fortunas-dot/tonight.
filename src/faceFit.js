// Fits the mask to a detected face, like a camera filter. Pure geometry, no React Native, so it can be tested on its own.
//
// The mask art is drawn around a frontal face: eye holes centred on (127, 228) and (215, 228), 44 units either side of
// the nose bridge at x 171, the mask body running from x 72 to 270 (99 units each side); its height keeps those
// proportions. Each half is sized so its eye hole lands on that eye (the face edges only keep it sensible), so on a
// turned head the far half narrows the way a real mask would.

export const ART_BRIDGE_X = 171;
export const ART_EYE_Y = 225;
const ART_HALF_W = 99; // nose bridge to the mask's outer edge
const ART_EYE_DX = 44; // nose bridge to the middle of an eye hole
// The headband's apex in the art (ears drawn around it), and how high it sits above the eyes at art size.
export const ART_BAND_Y = 111;
const ART_BAND_LIFT = ART_EYE_Y - ART_BAND_Y;

/** Placement when no face is found: centred, upright, art size. */
export const MANUAL = {
  x: ART_BRIDGE_X,
  y: ART_EYE_Y,
  r: 0,
  sl: 1,
  sr: 1,
  sy: 1,
  auto: false,
};

const mean = (pts) => ({
  x: pts.reduce((s, p) => s + p.x, 0) / pts.length,
  y: pts.reduce((s, p) => s + p.y, 0) / pts.length,
});
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/**
 * face: { eyeL, eyeR, oval?: [{x,y}], bridge?: [{x,y}], box?: {x, y, w, h} } in frame units,
 * where eyeL is the eye on the left of the picture.
 * Returns { x, y, r, sl, sr, sy, auto: true }: the nose bridge on the eye line, the head's tilt in degrees,
 * and horizontal scales for the left and right halves plus one vertical scale.
 */
export function fitMask(face) {
  const { eyeL, eyeR } = face;
  const mid = { x: (eyeL.x + eyeR.x) / 2, y: (eyeL.y + eyeR.y) / 2 };
  // Head tilt: ML Kit measures it from the whole face. The line between the eyes goes wrong on a turned head
  // (the far eye is half hidden), so it is only the fallback.
  const eyeRoll = Math.atan2(eyeR.y - eyeL.y, eyeR.x - eyeL.x);
  // On a (nearly) frontal face the eye line is the most precise, so ML Kit's tilt is used once the head turns.
  const turned = typeof face.yaw !== 'number' || Math.abs(face.yaw) > 15;
  const roll = turned && typeof face.roll === 'number' && Number.isFinite(face.roll) ? (face.roll * Math.PI) / 180 : eyeRoll;
  const cos = Math.cos(-roll);
  const sin = Math.sin(-roll);
  // Into the face's own upright frame: origin between the eyes, x across the face.
  const up = (p) => {
    const dx = p.x - mid.x;
    const dy = p.y - mid.y;
    return { x: dx * cos - dy * sin, y: dx * sin + dy * cos };
  };
  const gap = Math.max(1, Math.abs(up(eyeR).x - up(eyeL).x));

  const oval = (face.oval || []).map(up);
  const hasOval = oval.length >= 8;
  const box = face.box && face.box.w > gap ? face.box : null;
  const boxC = box ? up({ x: box.x + box.w / 2, y: box.y + box.h / 2 }) : null;

  // The head: its width, centre and top in the upright frame.
  let headW = null;
  let headCx = 0;
  let headTop = null;
  if (hasOval) {
    const xs = oval.map((p) => p.x);
    const ys = oval.map((p) => p.y);
    headW = Math.max(...xs) - Math.min(...xs);
    headCx = (Math.max(...xs) + Math.min(...xs)) / 2;
    headTop = Math.min(...ys);
  } else if (box) {
    headW = box.w * 0.92;
    headCx = boxC.x;
    headTop = boxC.y - box.h / 2;
  }
  // One size unit that doesn't shrink when the head turns (the eye gap does).
  const unit = Math.max(gap, headW ? headW / 2.3 : 0);

  let left = null;
  let right = null;
  if (hasOval) {
    // Where the face outline crosses the eye line.
    const xs = [];
    for (let i = 0; i < oval.length; i++) {
      const p = oval[i];
      const q = oval[(i + 1) % oval.length];
      if ((p.y <= 0 && q.y > 0) || (p.y > 0 && q.y <= 0)) xs.push(p.x + ((0 - p.y) * (q.x - p.x)) / (q.y - p.y));
    }
    if (xs.length >= 2) {
      left = Math.min(...xs);
      right = Math.max(...xs);
    }
  }
  if ((left === null || right - left < unit) && box) {
    left = boxC.x - box.w * 0.46;
    right = boxC.x + box.w * 0.46;
  }
  if (left === null || right - left < unit) {
    left = -unit * 1.15;
    right = unit * 1.15;
  }
  // Ear to ear: the outline at eye height runs along the cheeks, and a mask is tied on just past them, at the ears.
  // (Pulled in to stay inside the outline, the mask looked squashed onto the eyes.)
  const c0 = (left + right) / 2;
  const reach = Math.min(1.12, (unit * 3) / Math.max(1, right - left));
  left = c0 + (left - c0) * reach;
  right = c0 + (right - c0) * reach;

  // The nose bridge: top of the bridge line when we have it, else halfway between the eyes.
  let bridge = 0;
  if (face.bridge && face.bridge.length) bridge = up(face.bridge[0]).x;
  bridge = clamp(bridge, left + unit * 0.15, right - unit * 0.15);

  // Each half: its eye hole on that eye. Sized from the face edges alone, the holes landed between the eyes and the
  // mask looked squeezed onto them; the edges now only stop a misread eye from making a half far too big or small.
  const byEyeL = (bridge - up(eyeL).x) / ART_EYE_DX;
  const byEyeR = (up(eyeR).x - bridge) / ART_EYE_DX;
  const byEdgeL = (bridge - left) / ART_HALF_W;
  const byEdgeR = (right - bridge) / ART_HALF_W;
  const sl = clamp(clamp(byEyeL, byEdgeL * 0.75, byEdgeL * 1.35), 0.06, 4);
  const sr = clamp(clamp(byEyeR, byEdgeR * 0.75, byEdgeR * 1.35), 0.06, 4);
  // Height keeps the art's proportions (both halves together, so a turned head doesn't flatten it):
  // following the face's height instead made a tall, narrow, squashed mask.
  const sy = clamp((sl + sr) / 2, 0.1, 4);

  // Ears: centred on the head (not the nose, which moves off-centre when the head turns), the band just above
  // the top of the face, about as wide as the head.
  if (headTop === null) headTop = -unit * 1.25;
  // On the hair, not on the forehead: about 1.75 eye-gaps above the eyes, where the top of the head is. On real
  // photos ML Kit's outline stops at the forehead, so its top alone put headbands on the brow (bunny, bow, devil).
  const bandY = clamp(Math.min(headTop - unit * 0.04, -unit * 1.75), -unit * 2.3, -unit * 1.5);
  const earsS = clamp(((headW || unit * 2.3) * 0.98) / 170, 0.06, 4);

  // Back to the photo.
  const toPhoto = (u) => ({ x: mid.x + u.x * Math.cos(roll) - u.y * Math.sin(roll), y: mid.y + u.x * Math.sin(roll) + u.y * Math.cos(roll) });
  const b = toPhoto({ x: bridge, y: 0 });
  const e = toPhoto({ x: headCx, y: bandY });
  return {
    x: b.x,
    y: b.y,
    r: (roll * 180) / Math.PI,
    sl,
    sr,
    sy,
    // Ears as an offset from the mask (so dragging moves both) plus their own scale.
    ex: e.x - b.x,
    ey: e.y - b.y,
    es: earsS,
    auto: true,
  };
}

/** Scales a placement by k (pinch), keeping its centre. */
export const scalePlacement = (p, k) => {
  const ears = earsOf(p);
  return { ...p, sl: p.sl * k, sr: p.sr * k, sy: p.sy * k, ex: ears.ex * k, ey: ears.ey * k, es: ears.es * k };
};

/** Turns a placement by deg degrees (two-finger twist), the ears turning with it around the mask. */
export const rotatePlacement = (p, deg) => {
  const ears = earsOf(p);
  const a = (deg * Math.PI) / 180;
  const c = Math.cos(a);
  const s = Math.sin(a);
  return { ...p, r: (p.r || 0) + deg, ex: ears.ex * c - ears.ey * s, ey: ears.ex * s + ears.ey * c, es: ears.es };
};

/** Where the ears go for a placement: its own fit, or straight above the mask at art proportions. */
export function earsOf(p) {
  if (typeof p.ex === 'number') return { ex: p.ex, ey: p.ey, es: p.es };
  const s = (p.sl + p.sr) / 2;
  const lift = typeof p.top === 'number' ? p.top : -ART_BAND_LIFT * p.sy;
  const a = ((p.r || 0) * Math.PI) / 180;
  return { ex: -lift * Math.sin(a), ey: lift * Math.cos(a), es: s };
}

export const placementScale = (p) => (p.sl + p.sr) / 2;

// ML Kit's part names differ per platform ("faceOval", "FaceOval", "Face Oval", ...), so compare them loosely.
const norm = (t) =>
  String(t || '')
    .toLowerCase()
    .replace(/[^a-z]/g, '');

/** Pulls the face parts out of an ML Kit result, mapped into the frame with toFrame. */
export function facePartsFromMlKit(face, toFrame) {
  const contours = (face.contours || []).filter((c) => c && c.points && c.points.length);
  const byName = (re) => contours.find((c) => re.test(norm(c.type)));
  // Fallback by shape: ML Kit always gives 36 points for the face outline, 16 per eye and 2 for the nose bridge.
  const byCount = (n) => contours.filter((c) => c.points.length === n);
  const oval = byName(/oval/) || byCount(36)[0];
  let eyeConts = [byName(/^(lefteye|eyeleft)$/), byName(/^(righteye|eyeright)$/)].filter(Boolean);
  if (eyeConts.length < 2) eyeConts = byCount(16).slice(0, 2);
  const bridgeC = byName(/bridge/) || byCount(2)[0];

  const landmark = (re) => {
    const l = (face.landmarks || []).find((x) => x && x.position && re.test(norm(x.type)));
    return l ? toFrame(l.position) : null;
  };

  let e1 = null;
  let e2 = null;
  if (eyeConts.length === 2) {
    e1 = mean(eyeConts[0].points.map(toFrame));
    e2 = mean(eyeConts[1].points.map(toFrame));
  } else {
    e1 = landmark(/^(lefteye|eyeleft)$/);
    e2 = landmark(/^(righteye|eyeright)$/);
  }
  const fr = face.frame;
  let box = null;
  if (fr && fr.origin && fr.size) {
    const tl = toFrame(fr.origin);
    const br = toFrame({ x: fr.origin.x + fr.size.x, y: fr.origin.y + fr.size.y });
    box = { x: Math.min(tl.x, br.x), y: Math.min(tl.y, br.y), w: Math.abs(br.x - tl.x), h: Math.abs(br.y - tl.y) };
  }
  if (box && (!e1 || !e2 || Math.hypot(e1.x - e2.x, e1.y - e2.y) < box.w * 0.15)) {
    e1 = { x: box.x + box.w * 0.32, y: box.y + box.h * 0.4 };
    e2 = { x: box.x + box.w * 0.68, y: box.y + box.h * 0.4 };
  }
  if (!e1 || !e2) throw new Error('no eyes');
  const [eyeL, eyeR] = e1.x <= e2.x ? [e1, e2] : [e2, e1];
  // ML Kit: positive Z is counter-clockwise in the picture; SVG rotation is clockwise.
  const roll = face.hasHeadEulerAngleZ !== false && typeof face.headEulerAngleZ === 'number' ? -face.headEulerAngleZ : null;
  const yaw = face.hasHeadEulerAngleY !== false && typeof face.headEulerAngleY === 'number' ? face.headEulerAngleY : null;
  return {
    eyeL,
    eyeR,
    roll,
    yaw,
    box,
    oval: oval ? oval.points.map(toFrame) : [],
    bridge: bridgeC ? bridgeC.points.map(toFrame) : [],
  };
}
