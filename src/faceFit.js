// Fits the mask to a detected face, like a camera filter. Pure geometry, no React Native, so it can be tested on its own.
//
// The mask art is drawn around a frontal face: eye holes centred on (171, 225), 72 units apart, the mask body
// running from x 72 to 270 (99 units each side of the nose bridge at x 171), and a face about 267 units tall.
// Each half of the mask is stretched on its own, from the nose bridge to that side of the face, so on a turned
// head the far half narrows the way a real mask would.

export const ART_BRIDGE_X = 171;
export const ART_EYE_Y = 225;
const ART_HALF_W = 99; // nose bridge to the mask's outer edge
const ART_FACE_H = 267; // face height the art is drawn for
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
  top: -ART_BAND_LIFT,
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
  const roll = Math.atan2(eyeR.y - eyeL.y, eyeR.x - eyeL.x);
  const gap = Math.hypot(eyeR.x - eyeL.x, eyeR.y - eyeL.y);
  const cos = Math.cos(-roll);
  const sin = Math.sin(-roll);
  // Into the face's own upright frame: origin between the eyes, x along the eye line.
  const up = (p) => {
    const dx = p.x - mid.x;
    const dy = p.y - mid.y;
    return { x: dx * cos - dy * sin, y: dx * sin + dy * cos };
  };

  let left = null;
  let right = null;
  let height = null;
  const oval = (face.oval || []).map(up);
  if (oval.length >= 8) {
    // Where the face outline crosses the eye line.
    const xs = [];
    for (let i = 0; i < oval.length; i++) {
      const p = oval[i];
      const q = oval[(i + 1) % oval.length];
      if ((p.y <= 0 && q.y > 0) || (p.y > 0 && q.y <= 0)) xs.push(p.x + ((0 - p.y) * (q.x - p.x)) / (q.y - p.y));
    }
    if (xs.length >= 2) {
      // A touch inside the outline, so the mask never overhangs into hair or background.
      left = Math.min(...xs) * 0.96;
      right = Math.max(...xs) * 0.96;
    }
    height = Math.max(...oval.map((p) => p.y)) - Math.min(...oval.map((p) => p.y));
  }

  // The nose bridge: top of the bridge line when we have it, else halfway between the eyes.
  let bridge = 0;
  if (face.bridge && face.bridge.length) bridge = up(face.bridge[0]).x;

  // Face box (always there): its centre shifts towards the far side on a turned head, so the halves come out uneven.
  const box = face.box && face.box.w > gap ? face.box : null;
  let boxTop = null;
  if (box) {
    const c = up({ x: box.x + box.w / 2, y: box.y + box.h / 2 });
    const hw = box.w * 0.46;
    if (left === null || right === null || right - left < gap) {
      left = c.x - hw;
      right = c.x + hw;
    }
    boxTop = c.y - box.h / 2;
  }
  if (left === null || right === null || right - left < gap) {
    // Nothing better: a frontal face is about 2.3 eye-gaps wide at eye level.
    left = -gap * 1.15;
    right = gap * 1.15;
  }
  // Keep the mask believable: not narrower than 1.6 or wider than 2.7 eye-gaps, each side at least half a gap.
  left = Math.min(left, -gap * 0.5);
  right = Math.max(right, gap * 0.5);
  const width = clamp(right - left, gap * 1.6, gap * 2.7);
  const k = width / (right - left);
  left *= k;
  right *= k;
  bridge = clamp(bridge, left + gap * 0.2, right - gap * 0.2);
  const hasHeight = height && height >= gap;

  // Where the headband goes: on the top of the head. Outline top, else the face box top, else ~1.25 eye-gaps up.
  let top = oval.length >= 8 ? Math.min(...oval.map((p) => p.y)) : boxTop;
  if (top === null) top = -gap * 1.25;
  top = clamp(top - gap * 0.1, -gap * 2.2, -gap * 1.1);

  const sl = clamp((bridge - left) / ART_HALF_W, 0.08, 4);
  const sr = clamp((right - bridge) / ART_HALF_W, 0.08, 4);
  // Without an outline, keep the art's own proportions so the eye holes don't stretch.
  const sy = clamp(hasHeight ? height / ART_FACE_H : ((sl + sr) / 2) * 1.05, 0.1, 4);

  // Back to the photo: the bridge point on the eye line.
  const bx = mid.x + bridge * Math.cos(roll);
  const by = mid.y + bridge * Math.sin(roll);
  // top is measured from the bridge point, upwards along the face.
  return { x: bx, y: by, r: (roll * 180) / Math.PI, sl, sr, sy, top, auto: true };
}

/** Scales a placement by k (pinch), keeping its centre. */
export const scalePlacement = (p, k) => ({
  ...p,
  sl: p.sl * k,
  sr: p.sr * k,
  sy: p.sy * k,
  top: (p.top ?? -ART_BAND_LIFT * p.sy) * k,
});

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
  return {
    eyeL,
    eyeR,
    box,
    oval: oval ? oval.points.map(toFrame) : [],
    bridge: bridgeC ? bridgeC.points.map(toFrame) : [],
  };
}
