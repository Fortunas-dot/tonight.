// Swipe-down-to-close for bottom sheets: drag the top part (grab bar and title) down; past a third of the way
// or with a quick flick it closes, otherwise it springs back.
import { useState } from 'react';
import { Animated, PanResponder, StyleSheet, View } from 'react-native';

export function useSwipeDown(onClose) {
  const [y] = useState(() => new Animated.Value(0));
  const [pan] = useState(() =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => g.dy > 4 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderMove: (_, g) => y.setValue(Math.max(0, g.dy)),
      onPanResponderRelease: (_, g) => {
        if (g.dy > 140 || g.vy > 0.9) {
          Animated.timing(y, { toValue: 900, duration: 180, useNativeDriver: true }).start(() => {
            y.setValue(0);
            onClose();
          });
        } else {
          Animated.spring(y, { toValue: 0, useNativeDriver: true, speed: 18, bounciness: 6 }).start();
        }
      },
      onPanResponderTerminate: () => Animated.spring(y, { toValue: 0, useNativeDriver: true }).start(),
    }),
  );
  return { handlers: pan.panHandlers, style: { transform: [{ translateY: y }] } };
}

/** The grab bar, with a tall touch area so it is easy to catch. */
export function Grabber() {
  return (
    <View style={styles.zone}>
      <View style={styles.bar} />
    </View>
  );
}

const styles = StyleSheet.create({
  zone: { alignSelf: 'stretch', alignItems: 'center', paddingTop: 2, paddingBottom: 14 },
  bar: { width: 44, height: 5, borderRadius: 3, backgroundColor: '#4A4148' },
});
