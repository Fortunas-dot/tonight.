// On-device face finding (Google ML Kit). Nothing leaves the phone.
// Turns a detected face into where the mask goes in the editor's 342 × 430 frame.
import { Image } from 'react-native';

export const VW = 342;
export const VH = 430;
// In the mask artwork the eye holes sit 72 units apart, centred on (171, 225).
const MASK_EYE_GAP = 72;
export const MASK_EYE_X = 171;
export const MASK_EYE_Y = 225;

let detector = null;
async function getDetector() {
  if (detector) return detector;
  const { RNMLKitFaceDetector } = await import('@infinitered/react-native-mlkit-face-detection');
  const d = new RNMLKitFaceDetector({ performanceMode: 'accurate', landmarkMode: true, classificationMode: false, contourMode: false }, true);
  await d.initialize();
  detector = d;
  return d;
}

const imageSize = (uri) =>
  new Promise((resolve, reject) => {
    Image.getSize(uri, (width, height) => resolve({ width, height }), reject);
  });

// Face detection reads a file on the phone, so an uploaded photo (a web link) is fetched into the cache first.
async function localCopy(uri) {
  if (!/^https?:/.test(uri)) return uri;
  const { File, Paths } = await import('expo-file-system');
  const dest = new File(Paths.cache, `face-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.jpg`);
  const file = await File.downloadFileAsync(uri, dest);
  return file.uri;
}

/** Where the mask should sit on this photo: { x, y, s, r, auto: true }, or null when no face is found. */
export async function findFace(uri) {
  try {
    const local = await localCopy(uri);
    const [d, size] = await Promise.all([getDetector(), imageSize(local)]);
    const res = await d.detectFaces(local);
    const faces = res?.faces || [];
    if (!faces.length) return null;
    // The biggest face is the person in the photo.
    const face = faces.reduce((a, b) => (b.frame.size.x * b.frame.size.y > a.frame.size.x * a.frame.size.y ? b : a));

    // Photo pixels → frame units (the photo fills the frame, cropped like "cover").
    const f = Math.max(VW / size.width, VH / size.height);
    const ox = (VW - size.width * f) / 2;
    const oy = (VH - size.height * f) / 2;
    const toFrame = (p) => ({ x: ox + p.x * f, y: oy + p.y * f });

    const eyes = (face.landmarks || []).filter((l) => (l.type === 'leftEye' || l.type === 'rightEye') && l.position).map((l) => toFrame(l.position));
    let a;
    let b;
    if (eyes.length === 2) {
      [a, b] = eyes[0].x <= eyes[1].x ? eyes : [eyes[1], eyes[0]];
    } else {
      // No eye landmarks: estimate them from the face box.
      const fr = face.frame;
      const tl = toFrame(fr.origin);
      const w = fr.size.x * f;
      const h = fr.size.y * f;
      a = { x: tl.x + w * 0.3, y: tl.y + h * 0.4 };
      b = { x: tl.x + w * 0.7, y: tl.y + h * 0.4 };
    }
    const gap = Math.hypot(b.x - a.x, b.y - a.y);
    if (gap < 4) return null;
    return {
      x: (a.x + b.x) / 2,
      y: (a.y + b.y) / 2,
      s: gap / MASK_EYE_GAP,
      r: (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI,
      auto: true,
    };
  } catch (e) {
    console.warn('[faces] detection failed', e?.message || e);
    return null;
  }
}

/** Default spot when no face was found: centred, upright. */
export const MANUAL = { x: MASK_EYE_X, y: MASK_EYE_Y, s: 1, r: 0, auto: false };
