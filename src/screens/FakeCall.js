// "Fake a call": an incoming-call screen that rings after a short delay, so leaving a date is easy.
import { useEffect, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Vibration, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { F } from '../theme';
import { Icon } from '../icons';
import { T } from '../ui';

export function FakeCall({ caller = 'Mom', onEnd }) {
  const insets = useSafeAreaInsets();
  const [answered, setAnswered] = useState(false);
  const [secs, setSecs] = useState(0);
  const [pulse] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (answered) {
      Vibration.cancel();
      const t = setInterval(() => setSecs((x) => x + 1), 1000);
      return () => clearInterval(t);
    }
    Vibration.vibrate([0, 800, 600], true);
    const loop = Animated.loop(Animated.timing(pulse, { toValue: 1, duration: 1400, easing: Easing.out(Easing.quad), useNativeDriver: true }));
    loop.start();
    return () => {
      Vibration.cancel();
      loop.stop();
    };
  }, [answered, pulse]);

  const mm = String(Math.floor(secs / 60)).padStart(2, '0');
  const ss = String(secs % 60).padStart(2, '0');
  return (
    <View style={[styles.wrap, { paddingTop: insets.top + 60, paddingBottom: insets.bottom + 40 }]}>
      <View style={{ alignItems: 'center' }}>
        <View style={{ width: 110, height: 110, alignItems: 'center', justifyContent: 'center' }}>
          {!answered ? (
            <Animated.View
              style={[
                styles.ring,
                { opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] }), transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.7] }) }] },
              ]}
            />
          ) : null}
          <View style={styles.avatar}>
            <T style={{ fontFamily: F.display, fontSize: 40 }}>{caller[0]}</T>
          </View>
        </View>
        <T style={{ fontFamily: F.semi, fontSize: 32, marginTop: 18 }}>{caller}</T>
        <T c="#C9C2C8" style={{ fontSize: 17, marginTop: 4 }}>
          {answered ? `${mm}:${ss}` : 'mobile'}
        </T>
      </View>
      <View style={{ flex: 1 }} />
      {answered ? (
        <View style={{ alignItems: 'center' }}>
          <Pressable accessibilityRole="button" accessibilityLabel="End call" onPress={onEnd} style={[styles.btn, { backgroundColor: '#FF3B30' }]}>
            <Icon name="close" size={30} color="#FFFFFF" stroke={2.6} />
          </Pressable>
          <T c="#C9C2C8" style={{ marginTop: 8 }}>
            End
          </T>
        </View>
      ) : (
        <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
          <View style={{ alignItems: 'center' }}>
            <Pressable accessibilityRole="button" accessibilityLabel="Decline" onPress={onEnd} style={[styles.btn, { backgroundColor: '#FF3B30' }]}>
              <Icon name="close" size={30} color="#FFFFFF" stroke={2.6} />
            </Pressable>
            <T c="#C9C2C8" style={{ marginTop: 8 }}>
              Decline
            </T>
          </View>
          <View style={{ alignItems: 'center' }}>
            <Pressable accessibilityRole="button" accessibilityLabel="Accept" onPress={() => setAnswered(true)} style={[styles.btn, { backgroundColor: '#34C759' }]}>
              <Icon name="check" size={30} color="#FFFFFF" stroke={2.6} />
            </Pressable>
            <T c="#C9C2C8" style={{ marginTop: 8 }}>
              Accept
            </T>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#1C1C1E', paddingHorizontal: 40 },
  ring: { position: 'absolute', width: 110, height: 110, borderRadius: 55, borderWidth: 2, borderColor: '#FFFFFF' },
  avatar: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#5A5A60', alignItems: 'center', justifyContent: 'center' },
  btn: { width: 76, height: 76, borderRadius: 38, alignItems: 'center', justifyContent: 'center' },
});
