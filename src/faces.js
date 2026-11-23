// On-device face finding (Google ML Kit). Nothing leaves the phone.
// Finds the face outline, eyes and nose bridge, and turns them into where the mask goes (see faceFit.js).
import { Image } from 'react-native';
import { MANUAL, facePartsFromMlKit, fitMask } from './faceFit';

export { MANUAL };
export const VW = 342;
export const VH = 430;

let detector = null;
async function getDetector() {
  if (detector) return detector;
  const { RNMLKitFaceDetector } = await import('@infinitered/react-native-mlkit-face-detection');
  const d = new RNMLKitFaceDetector(
    {
      performanceMode: 'accurate',
      landmarkMode: true,
      contourMode: true,
      classificationMode: false,
    },
    true,
  );
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

/** Where the mask should sit on this photo (see fitMask), or null when no face is found. */
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

    return fitMask(facePartsFromMlKit(face, toFrame));
  } catch (e) {
    console.warn('[faces] detection failed', e?.message || e);
    return null;
  }
}
