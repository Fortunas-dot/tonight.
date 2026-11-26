import { useEffect, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, F, GRAD } from './theme';
import { Icon } from './icons';

export const tap = () => Haptics.selectionAsync().catch(() => {});
export const thud = () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
export const success = () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

/* ---------- Text ---------- */

const TYPE = {
  display: { fontFamily: F.display, fontSize: 40, lineHeight: 42, letterSpacing: -1.2 },
  title: { fontFamily: F.display, fontSize: 30, lineHeight: 34, letterSpacing: -0.6 },
  h: { fontFamily: F.display, fontSize: 20, lineHeight: 24 },
  body: { fontFamily: F.body, fontSize: 15, lineHeight: 22 },
  label: { fontFamily: F.semi, fontSize: 13, lineHeight: 18 },
  meta: { fontFamily: F.body, fontSize: 13, lineHeight: 18 },
  small: { fontFamily: F.body, fontSize: 12, lineHeight: 16 },
};

export function T({ v = 'body', c = C.ink, style, children, ...rest }) {
  // A bigger font without its own line height would keep the variant's line height and get clipped at the top.
  const own = StyleSheet.flatten(style) || {};
  const fit = own.fontSize && !own.lineHeight && own.fontSize > TYPE[v].fontSize ? { lineHeight: Math.round(own.fontSize * 1.25) } : null;
  return (
    <Text style={[TYPE[v], { color: c }, style, fit]} {...rest}>
      {children}
    </Text>
  );
}

/* ---------- Liquid background: two slow morphing colour blobs ---------- */

function Blob({ color, size, start, duration, reverse }) {
  const [t] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(t, { toValue: 1, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(t, { toValue: 0, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [t, duration]);
  const dir = reverse ? -1 : 1;
  const transform = [
    { translateX: t.interpolate({ inputRange: [0, 1], outputRange: [0, 50 * dir] }) },
    { translateY: t.interpolate({ inputRange: [0, 1], outputRange: [0, 60] }) },
    { scale: t.interpolate({ inputRange: [0, 1], outputRange: [1, 1.15] }) },
  ];
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', width: size, height: size }, start, { transform }]}>
      {[1, 0.78, 0.56, 0.36].map((k) => (
        <View
          key={k}
          style={{
            position: 'absolute',
            left: (size * (1 - k)) / 2,
            top: (size * (1 - k)) / 2,
            width: size * k,
            height: size * k,
            borderRadius: (size * k) / 2,
            backgroundColor: color,
            opacity: 0.05,
          }}
        />
      ))}
    </Animated.View>
  );
}

export function LiquidBg({ strong }) {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Blob color={C.pink} size={strong ? 520 : 440} start={{ left: -170, top: -150 }} duration={9500} />
      <Blob color={C.blue} size={420} start={{ right: -180, bottom: -130 }} duration={11500} reverse />
    </View>
  );
}

/* ---------- Screen ---------- */

export function Screen({ children, scroll, pad = 24, bottom = 24, style, bg = C.bg, strong }) {
  const insets = useSafeAreaInsets();
  const inner = { paddingTop: insets.top + 8, paddingHorizontal: pad, paddingBottom: insets.bottom + bottom };
  return (
    <View style={{ flex: 1, backgroundColor: bg, overflow: 'hidden' }}>
      <LiquidBg strong={strong} />
      {scroll ? (
        <ScrollView contentContainerStyle={[inner, style]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      ) : (
        <View style={[{ flex: 1 }, inner, style]}>{children}</View>
      )}
    </View>
  );
}

/* ---------- Buttons ---------- */

function useSpring() {
  const [s] = useState(() => new Animated.Value(1));
  const press = (to) => Animated.spring(s, { toValue: to, useNativeDriver: true, speed: 40, bounciness: 10 }).start();
  return [s, () => press(0.95), () => press(1)];
}

export function GradientButton({ title, onPress, disabled, style, height = 56 }) {
  const [s, down, up] = useSpring();
  return (
    <Animated.View style={[{ transform: [{ scale: s }], opacity: disabled ? 0.4 : 1 }, style]}>
      <Pressable
        accessibilityRole="button"
        disabled={disabled}
        onPressIn={down}
        onPressOut={up}
        onPress={() => {
          tap();
          onPress?.();
        }}
      >
        <LinearGradient colors={GRAD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.btn, { height, borderRadius: height / 2 }]}>
          <T v="label" c="#FFFFFF" style={{ fontSize: 16 }}>
            {title}
          </T>
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}

export function GhostButton({ title, onPress, style, color = C.ink, border = true }) {
  const [s, down, up] = useSpring();
  return (
    <Animated.View style={[{ transform: [{ scale: s }] }, style]}>
      <Pressable
        accessibilityRole="button"
        onPressIn={down}
        onPressOut={up}
        onPress={() => {
          tap();
          onPress?.();
        }}
        style={[styles.btn, { height: 52, borderRadius: 26, borderWidth: border ? 1.5 : 0, borderColor: C.line2 }]}
      >
        <T v="label" c={color} style={{ fontSize: 15 }}>
          {title}
        </T>
      </Pressable>
    </Animated.View>
  );
}

export function IconButton({ name, onPress, label, color = C.ink, size = 22, style }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      onPress={() => {
        tap();
        onPress?.();
      }}
      style={[{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }, style]}
    >
      <Icon name={name} size={size} color={color} />
    </Pressable>
  );
}

/* ---------- Chips, toggles, segments ---------- */

export function Chip({ label, on, onPress, tone = 'pink', small }) {
  const bg = tone === 'blue' ? C.blue : C.pink;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!on }}
      onPress={() => {
        tap();
        onPress?.();
      }}
      style={[styles.chip, small && { height: 34, paddingHorizontal: 12 }, on ? { backgroundColor: bg, borderColor: bg } : null]}
    >
      <T v="label" c={on ? '#FFFFFF' : C.ink} style={{ fontFamily: on ? F.semi : F.medium, fontSize: small ? 13 : 14 }}>
        {label}
      </T>
    </Pressable>
  );
}

export function Toggle({ value, onChange, label, color = C.pink }) {
  const [x] = useState(() => new Animated.Value(value ? 1 : 0));
  useEffect(() => {
    Animated.spring(x, { toValue: value ? 1 : 0, useNativeDriver: false, speed: 30, bounciness: 8 }).start();
  }, [value, x]);
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: !!value }}
      onPress={() => {
        tap();
        onChange?.(!value);
      }}
    >
      <Animated.View style={[styles.toggle, { backgroundColor: x.interpolate({ inputRange: [0, 1], outputRange: [C.line2, color] }) }]}>
        <Animated.View style={[styles.knob, { transform: [{ translateX: x.interpolate({ inputRange: [0, 1], outputRange: [0, 20] }) }] }]} />
      </Animated.View>
    </Pressable>
  );
}

export function Segmented({ options, value, onChange }) {
  return (
    <View style={styles.seg}>
      {options.map((o) => (
        <Pressable
          key={o.value}
          accessibilityRole="button"
          accessibilityState={{ selected: value === o.value }}
          onPress={() => {
            tap();
            onChange(o.value);
          }}
          style={[styles.segBtn, value === o.value && { backgroundColor: C.ink }]}
        >
          <T v="label" c={value === o.value ? C.bg : C.muted} style={{ fontSize: 14 }}>
            {o.label}
          </T>
        </Pressable>
      ))}
    </View>
  );
}

/* ---------- Layout helpers ---------- */

export function Header({ title, onBack, right, step, total }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', height: 48, marginBottom: 4 }}>
      {onBack ? <IconButton name="back" label="Back" onPress={onBack} style={{ marginLeft: -12 }} /> : null}
      {total ? (
        <View style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: '#241F26', marginHorizontal: 8, overflow: 'hidden' }}>
          <LinearGradient colors={GRAD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ width: `${(step / total) * 100}%`, height: 4 }} />
        </View>
      ) : (
        <T v="label" style={{ flex: 1, fontSize: 16 }}>
          {title}
        </T>
      )}
      {total ? (
        <T v="meta" c={C.muted}>
          {step} of {total}
        </T>
      ) : null}
      {right}
    </View>
  );
}

export function Card({ children, style, tone }) {
  const bg = tone === 'safe' ? C.safeBg : tone === 'pink' ? C.pinkBg : C.surf;
  return <View style={[{ backgroundColor: bg, borderRadius: 18, padding: 14 }, style]}>{children}</View>;
}

export function Row({ title, sub, right, onPress, icon, iconColor = C.pinkL, iconBg = C.pinkBg, last }) {
  const content = (
    <View style={[styles.row, last && { borderBottomWidth: 0 }]}>
      {icon ? (
        <View style={[styles.rowIcon, { backgroundColor: iconBg }]}>
          <Icon name={icon} size={18} color={iconColor} />
        </View>
      ) : null}
      <View style={{ flex: 1 }}>
        <T style={{ fontFamily: F.medium }}>{title}</T>
        {sub ? (
          <T v="small" c={C.muted} style={{ marginTop: 2 }}>
            {sub}
          </T>
        ) : null}
      </View>
      {right}
      {onPress && !right ? <Icon name="chev" size={16} color={C.muted} /> : null}
    </View>
  );
  return onPress ? (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        tap();
        onPress();
      }}
    >
      {content}
    </Pressable>
  ) : (
    content
  );
}

/** Placeholder for a member photo until real photos exist (warm gradient, no fake faces). */
// blur: show the photo blurred (people who chose "Blur my face until we match"), with a small lock tag.
export function Photo({ style, seed = 0, children, label, uri, blur }) {
  const sets = [
    ['#3A2B33', '#1C171E'],
    ['#2E2440', '#17131F'],
    ['#3A2A24', '#1B1517'],
    ['#24304A', '#131722'],
  ];
  const [a, b] = sets[seed % sets.length];
  return (
    <LinearGradient colors={[a, b]} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }} style={[{ overflow: 'hidden' }, style]}>
      {uri ? <Image source={{ uri }} style={StyleSheet.absoluteFill} resizeMode="cover" blurRadius={blur ? 45 : 0} /> : null}
      {uri && blur ? <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(14,12,16,0.25)' }]} /> : null}
      {uri && blur ? (
        <View style={styles.blurTag}>
          <Icon name="lock" size={12} color="#C9D6F2" />
          <T v="small" c="#C9D6F2" style={{ fontSize: 11, fontFamily: F.semi }}>
            Blurred until you match
          </T>
        </View>
      ) : null}
      {blur && !uri ? (
        <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center', gap: 8 }]}>
          <View style={{ width: 54, height: 54, borderRadius: 27, backgroundColor: 'rgba(14,12,16,0.55)', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="lock" size={24} color="#C9D6F2" />
          </View>
          <T v="small" c="#C9D6F2" style={{ fontFamily: F.semi }}>
            Unlocks when you match
          </T>
        </View>
      ) : null}
      {label && !uri && !blur ? (
        <T v="small" c="#6F6470" style={{ position: 'absolute', alignSelf: 'center', top: '42%', letterSpacing: 2, fontFamily: F.medium }}>
          {label}
        </T>
      ) : null}
      {children}
    </LinearGradient>
  );
}

export function Avatar({ size = 52, seed = 0, ring = 'none', uri }) {
  const rings = { glow: GRAD, fire: ['#FFD27A', '#FF8A3D', '#F0287A'], verified: ['#6FA8FF', '#6FA8FF'] };
  const inner = <Photo seed={seed} uri={uri} style={{ width: size - 8, height: size - 8, borderRadius: (size - 8) / 2 }} />;
  if (ring === 'none') return <Photo seed={seed} uri={uri} style={{ width: size, height: size, borderRadius: size / 2 }} />;
  return (
    <LinearGradient colors={rings[ring]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: size - 4, height: size - 4, borderRadius: (size - 4) / 2, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' }}>{inner}</View>
    </LinearGradient>
  );
}

export function LiveDot({ size = 7 }) {
  const [p] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const loop = Animated.loop(Animated.timing(p, { toValue: 1, duration: 2000, useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [p]);
  return (
    <View style={{ width: size, height: size }}>
      <Animated.View
        style={{
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size,
          backgroundColor: C.green,
          opacity: p.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] }),
          transform: [{ scale: p.interpolate({ inputRange: [0, 1], outputRange: [1, 3] }) }],
        }}
      />
      <View style={{ width: size, height: size, borderRadius: size, backgroundColor: C.green }} />
    </View>
  );
}

/** Fades and lifts content into place, with an optional stagger delay. */
export function Rise({ children, delay = 0, style }) {
  const [a] = useState(() => new Animated.Value(0));
  useEffect(() => {
    Animated.timing(a, { toValue: 1, duration: 650, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [a, delay]);
  return <Animated.View style={[style, { opacity: a, transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }] }]}>{children}</Animated.View>;
}

/* ---------- Tab bar ---------- */

const TABS = [
  { id: 'discover', icon: 'card', label: 'Discover' },
  { id: 'likes', icon: 'heart', label: 'Likes you' },
  { id: 'chats', icon: 'chat', label: 'Chats' },
  { id: 'lounge', icon: 'flame', label: 'Lounge' },
  { id: 'me', icon: 'user', label: 'Me' },
];

// The coloured line on top of the tab bar breathes softly, and now and then a light glides along it.
// Kept very subtle; it stands still when the phone asks for reduced motion.
function TabBarLine() {
  const [breath] = useState(() => new Animated.Value(0));
  const [glide] = useState(() => new Animated.Value(0));
  const [barW, setBarW] = useState(0);
  useEffect(() => {
    let loops = [];
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .catch(() => false)
      .then((reduce) => {
        if (!alive || reduce) return;
        loops = [
          Animated.loop(
            Animated.sequence([
              Animated.timing(breath, { toValue: 1, duration: 2600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
              Animated.timing(breath, { toValue: 0, duration: 2600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
            ]),
          ),
          Animated.loop(
            Animated.sequence([
              Animated.timing(glide, { toValue: 1, duration: 3200, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
              Animated.delay(4200),
              Animated.timing(glide, { toValue: 0, duration: 0, useNativeDriver: true }),
            ]),
          ),
        ];
        loops.forEach((l) => l.start());
      });
    return () => {
      alive = false;
      loops.forEach((l) => l.stop());
    };
  }, [breath, glide]);
  return (
    <View pointerEvents="none" onLayout={(e) => setBarW(e.nativeEvent.layout.width)} style={{ position: 'absolute', top: -1, left: 0, right: 0, height: 6, overflow: 'visible' }}>
      <Animated.View style={{ height: 1.5, opacity: breath.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0.95] }) }}>
        <LinearGradient colors={['rgba(240,40,122,0)', C.pink, C.violet, C.blue, 'rgba(59,123,255,0)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ flex: 1 }} />
      </Animated.View>
      {barW ? (
        <Animated.View
          style={{
            position: 'absolute',
            top: -1,
            width: 90,
            height: 3.5,
            borderRadius: 2,
            opacity: glide.interpolate({ inputRange: [0, 0.15, 0.85, 1], outputRange: [0, 0.55, 0.55, 0] }),
            transform: [{ translateX: glide.interpolate({ inputRange: [0, 1], outputRange: [-90, barW] }) }],
          }}
        >
          <LinearGradient colors={['rgba(255,255,255,0)', 'rgba(255,214,236,0.9)', 'rgba(255,255,255,0)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ flex: 1, borderRadius: 2 }} />
        </Animated.View>
      ) : null}
    </View>
  );
}

export function TabBar({ tab, onTab, badges = {} }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.tabbar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      <TabBarLine />
      {TABS.map((t) => {
        const on = t.id === tab;
        return (
          <Pressable
            key={t.id}
            accessibilityRole="tab"
            accessibilityLabel={t.label}
            accessibilityState={{ selected: on }}
            onPress={() => {
              tap();
              onTab(t.id);
            }}
            style={styles.tab}
          >
            <Icon name={t.icon} size={24} color={on ? C.pink : C.muted} stroke={2} />
            <T v="small" c={on ? C.pink : C.muted} style={{ fontFamily: F.medium, fontSize: 11, marginTop: 3 }}>
              {t.label}
            </T>
            {badges[t.id] ? (
              <View style={styles.badge} accessibilityLabel={`${badges[t.id]} new`}>
                <T v="small" c="#FFFFFF" style={{ fontFamily: F.bold, fontSize: 10, lineHeight: 13 }}>
                  {badges[t.id] > 9 ? '9+' : badges[t.id]}
                </T>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

export const styles = StyleSheet.create({
  btn: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  chip: {
    height: 40,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: C.line2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggle: { width: 51, height: 31, borderRadius: 16, padding: 2 },
  knob: { width: 27, height: 27, borderRadius: 14, backgroundColor: '#FFFFFF' },
  seg: { flexDirection: 'row', backgroundColor: C.surf2, borderRadius: 14, padding: 4, gap: 4 },
  segBtn: { flex: 1, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 56,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#241F27',
  },
  rowIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  tabbar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 6,
    backgroundColor: C.bg,
    borderTopWidth: 1,
    borderTopColor: C.line,
  },
  tab: { alignItems: 'center', width: 68, paddingVertical: 4 },
  badge: {
    position: 'absolute',
    top: 0,
    right: 12,
    minWidth: 19,
    height: 19,
    paddingHorizontal: 5,
    borderRadius: 10,
    backgroundColor: '#FF3B30',
    borderWidth: 2,
    borderColor: C.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  blurTag: {
    position: 'absolute',
    top: 10,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 24,
    paddingHorizontal: 9,
    borderRadius: 12,
    backgroundColor: 'rgba(14,12,16,0.7)',
  },
});
