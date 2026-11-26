// Cartoon crew illustrations (made with scripts/generate-cartoons.mjs; picks exported to assets/onboarding,
// then cut out with scripts/cutout-art.py).
import { Image, View } from 'react-native';

export const ART = {
  welcome: { src: require('../assets/onboarding/welcome.png'), aspect: 1.385, label: 'Illustration: the masked crew at a velvet rope by a glowing pink door' },
  code: { src: require('../assets/onboarding/code.png'), aspect: 1.246, label: 'Illustration: Ward the Doberman guarding the sealed Tonight Code' },
  boundaries: { src: require('../assets/onboarding/boundaries.png'), aspect: 1.331, label: 'Illustration: Vi sorting yes, maybe and no cards' },
  photos: { src: require('../assets/onboarding/photos.png'), aspect: 1.164, label: 'Illustration: Nova putting on her mask at a vanity mirror' },
  verify: { src: require('../assets/onboarding/verify.png'), aspect: 1.012, label: 'Illustration: Volt taking a verification selfie' },
  discretion: { src: require('../assets/onboarding/discretion.png'), aspect: 0.889, label: 'Illustration: Ash saying shh beside a phone lying face-down' },
  review: { src: require('../assets/onboarding/review.png'), aspect: 1.177, label: 'Illustration: Ward bringing a sealed letter while Blaze crosses her fingers' },
};

// Lounge group covers, by the key stored in groups.cover (no key: a gradient with the group's initials).
export const GROUP_COVERS = {
  g1: require('../assets/guides/g1.jpg'),
  g3: require('../assets/guides/g3.jpg'),
  g4: require('../assets/guides/g4.jpg'),
  boundaries: require('../assets/onboarding/boundaries.jpg'),
};

// The art is cut out of its dark background (scripts/cutout-art.py: transparent PNGs) and trimmed to the characters,
// so they sit right on the app's glow, and the frame is exactly the drawing: no empty band above pushing it up.
export function StepArt({ name, height = 170, style }) {
  const a = ART[name];
  return (
    <View style={[{ alignSelf: 'center', height, aspectRatio: a.aspect, marginTop: 18, marginBottom: 2 }, style]}>
      <Image source={a.src} accessibilityLabel={a.label} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
    </View>
  );
}
