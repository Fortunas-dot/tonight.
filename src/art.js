// Cartoon crew illustrations (made with scripts/generate-cartoons.mjs; picks exported to assets/onboarding).
import { Image, View } from 'react-native';

export const ART = {
  welcome: { src: require('../assets/onboarding/welcome.jpg'), label: 'Illustration: the masked crew at a velvet rope by a glowing pink door' },
  code: { src: require('../assets/onboarding/code.jpg'), label: 'Illustration: Ward the Doberman guarding the sealed Tonight Code' },
  boundaries: { src: require('../assets/onboarding/boundaries.jpg'), label: 'Illustration: Vi sorting yes, maybe and no cards' },
  photos: { src: require('../assets/onboarding/photos.jpg'), label: 'Illustration: Nova putting on her mask at a vanity mirror' },
  verify: { src: require('../assets/onboarding/verify.jpg'), label: 'Illustration: Volt taking a verification selfie' },
  discretion: { src: require('../assets/onboarding/discretion.jpg'), label: 'Illustration: Ash saying shh beside a phone lying face-down' },
  review: { src: require('../assets/onboarding/review.jpg'), label: 'Illustration: Ward bringing a sealed letter while Blaze crosses her fingers' },
};

// Lounge group covers, by the key stored in groups.cover (no key: a gradient with the group's initials).
export const GROUP_COVERS = {
  g1: require('../assets/guides/g1.jpg'),
  g3: require('../assets/guides/g3.jpg'),
  g4: require('../assets/guides/g4.jpg'),
  boundaries: require('../assets/onboarding/boundaries.jpg'),
};

// The art is 4:3 on the app's own dark background, so it sits on the screen without a visible frame.
export function StepArt({ name, height = 170, style }) {
  const a = ART[name];
  return (
    <View style={[{ alignSelf: 'center', height, aspectRatio: 4 / 3, borderRadius: 18, overflow: 'hidden', marginTop: 14 }, style]}>
      <Image source={a.src} accessibilityLabel={a.label} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
    </View>
  );
}
