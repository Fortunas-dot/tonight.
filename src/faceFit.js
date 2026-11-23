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
const ART_EYE_GAP = 72;

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
      left = Math.min(...xs);
      right = Math.max(...xs);
    }
    height = Math.max(...oval.map((p) => p.y)) - Math.min(...oval.map((p) => p.y));
  }

  // The nose bridge: top of the bridge line when we have it, else halfway between the eyes.
  let bridge = 0;
  if (face.bridge && face.bridge.length) bridge = up(face.bridge[0]).x;

  if (left === null || right === null || right - left < gap) {
    // No usable outline: a frontal face is about 2.75 eye-gaps wide at eye level.
    left = -gap * 1.375;
    right = gap * 1.375;
  }
  bridge = clamp(bridge, left + gap * 0.2, right - gap * 0.2);
  if (!height || height < gap) height = (gap / ART_EYE_GAP) * ART_FACE_H;

  const sl = clamp((bridge - left) / ART_HALF_W, 0.08, 4);
  const sr = clamp((right - bridge) / ART_HALF_W, 0.08, 4);
  const sy = clamp(height / ART_FACE_H, 0.1, 4);

  // Back to the photo: the bridge point on the eye line.
  const bx = mid.x + bridge * Math.cos(roll);
  const by = mid.y + bridge * Math.sin(roll);
  return { x: bx, y: by, r: (roll * 180) / Math.PI, sl, sr, sy, auto: true };
}

/** Scales a placement by k (pinch), keeping its centre. */
export const scalePlacement = (p, k) => ({
  ...p,
  sl: p.sl * k,
  sr: p.sr * k,
  sy: p.sy * k,
});

export const placementScale = (p) => (p.sl + p.sr) / 2;

/** Pulls the face parts out of an ML Kit result, mapped into the frame with toFrame. */
export function facePartsFromMlKit(face, toFrame) {
  const contour = (type) => ((face.contours || []).find((c) => c.type === type)?.points || []).map(toFrame);
  const landmark = (type) => {
    const l = (face.landmarks || []).find((x) => x.type === type && x.position);
    return l ? toFrame(l.position) : null;
  };
  const eyeA = contour('leftEye');
  const eyeB = contour('rightEye');
  let e1 = eyeA.length ? mean(eyeA) : landmark('leftEye');
  let e2 = eyeB.length ? mean(eyeB) : landmark('rightEye');
  if (!e1 || !e2) {
    const fr = face.frame;
    const tl = toFrame(fr.origin);
    const br = toFrame({
      x: fr.origin.x + fr.size.x,
      y: fr.origin.y + fr.size.y,
    });
    const w = br.x - tl.x;
    const h = br.y - tl.y;
    e1 = { x: tl.x + w * 0.3, y: tl.y + h * 0.4 };
    e2 = { x: tl.x + w * 0.7, y: tl.y + h * 0.4 };
  }
  const [eyeL, eyeR] = e1.x <= e2.x ? [e1, e2] : [e2, e1];
  return {
    eyeL,
    eyeR,
    oval: contour('faceOval'),
    bridge: contour('noseBridge'),
  };
}
