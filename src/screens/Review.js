// Shown after onboarding until a moderator accepts the application (Tonight is members-only).
// Pending: what happens next, with the real acceptance rate once there is enough data to be honest about it.
// Declined: what to improve, and a way to apply again.
import { useEffect, useState } from 'react';
import { Animated, Easing, Image, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { C, F, GRAD } from '../theme';
import { Icon } from '../icons';
import { Card, GhostButton, GradientButton, Photo, Screen, T } from '../ui';
import * as api from '../backend';
import { ART } from '../art';

function Step({ icon, title, sub, state }) {
  const done = state === 'done';
  const now = state === 'now';
  return (
    <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
      {done || now ? (
        <LinearGradient colors={GRAD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.dot}>
          <Icon name={done ? 'check' : icon} size={15} color="#FFFFFF" stroke={2.4} />
        </LinearGradient>
      ) : (
        <View style={[styles.dot, { backgroundColor: C.surf2 }]}>
          <Icon name={icon} size={15} color={C.muted} />
        </View>
      )}
      <View style={{ flex: 1, paddingTop: 2 }}>
        <T style={{ fontFamily: F.semi }} c={done || now ? C.ink : C.muted}>
          {title}
        </T>
        {sub ? (
          <T v="small" c={C.muted} style={{ marginTop: 2 }}>
            {sub}
          </T>
        ) : null}
      </View>
    </View>
  );
}

// Pending: the three steps in one compact row, so the whole screen fits without scrolling.
function Tracker() {
  const steps = [
    { icon: 'check', label: 'Sent', state: 'done' },
    { icon: 'eye', label: 'In review', state: 'now' },
    { icon: 'flame', label: 'You’re in', state: 'next' },
  ];
  return (
    <View style={styles.tracker}>
      {steps.map((s, i) => (
        <View key={s.label} style={{ flex: 1, alignItems: 'center' }}>
          {i > 0 ? <View style={[styles.trackLine, s.state === 'next' && { backgroundColor: C.line2 }]} /> : null}
          {s.state === 'next' ? (
            <View style={[styles.dot, { backgroundColor: C.surf2 }]}>
              <Icon name={s.icon} size={15} color={C.muted} />
            </View>
          ) : (
            <LinearGradient colors={GRAD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.dot}>
              <Icon name={s.icon} size={15} color="#FFFFFF" stroke={2.4} />
            </LinearGradient>
          )}
          <T v="small" c={s.state === 'next' ? C.muted : C.ink} style={{ marginTop: 6, fontFamily: s.state === 'now' ? F.semi : F.medium }}>
            {s.label}
          </T>
        </View>
      ))}
    </View>
  );
}

export function UnderReview({ profile, status, note, onEdit, onReapply, onRefresh }) {
  const [stats, setStats] = useState(null);
  const [pulse] = useState(() => new Animated.Value(0));
  const [busy, setBusy] = useState(false);
  const declined = status === 'rejected';

  useEffect(() => {
    let alive = true;
    api.acceptanceStats().then((s) => alive && setStats(s));
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 1400, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => {
      alive = false;
      loop.stop();
    };
  }, [pulse]);

  // Only a real number, and only once enough applications were decided for it to mean something.
  const rate = stats && stats.decided >= 30 ? Math.round((stats.approved / stats.decided) * 100) : null;

  if (!declined) {
    // One screen, no scrolling: the picture takes whatever height is left and shrinks on small phones.
    return (
      <Screen bottom={16}>
        <T style={{ fontFamily: F.displayX, fontSize: 22, marginTop: 4 }}>
          tonight
          <T c={C.pink} style={{ fontFamily: F.displayX, fontSize: 22 }}>
            .
          </T>
        </T>
        <View style={{ alignItems: 'center', marginTop: 8 }}>
          <View style={{ width: 96, height: 96, alignItems: 'center', justifyContent: 'center' }}>
            <Animated.View
              style={[
                StyleSheet.absoluteFill,
                {
                  borderRadius: 48,
                  borderWidth: 1.5,
                  borderColor: C.pink,
                  opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.15, 0.7] }),
                  transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1.06] }) }],
                },
              ]}
            />
            <Photo uri={profile.photos?.[0]} blur={profile.blurFace} style={{ width: 80, height: 80, borderRadius: 40 }} />
          </View>
          <T style={{ fontFamily: F.display, fontSize: 26, marginTop: 10, textAlign: 'center' }}>Your application is in</T>
          <T v="meta" c={C.muted} style={{ textAlign: 'center', marginTop: 4, maxWidth: 320 }}>
            {`Thanks${profile.name ? `, ${profile.name}` : ''}. A person looks at every profile before it goes live. We’ll let you know.`}
          </T>
        </View>
        <View style={styles.artBox}>
          <Image source={ART.review.src} accessibilityLabel={ART.review.label} style={styles.art} resizeMode="contain" />
        </View>
        <Tracker />
        <T v="small" c={C.muted} style={{ textAlign: 'center', marginTop: 8 }}>
          Usually within 24 hours: photos, bio and verification.
        </T>
        <View style={styles.exclusiveLine}>
          <Icon name="lock" size={13} color={C.pinkL} />
          <T v="small" c={C.ink2}>
            {rate !== null ? `Members only. ${rate}% of applications are accepted.` : 'Members only. Not everyone gets in.'}
          </T>
        </View>
        <GradientButton title="Polish my profile meanwhile" onPress={onEdit} style={{ marginTop: 14 }} />
        <GhostButton title="Check for news" onPress={onRefresh} border={false} color={C.muted} style={{ marginTop: 2 }} />
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <T style={{ fontFamily: F.displayX, fontSize: 22, marginTop: 8 }}>
        tonight
        <T c={C.pink} style={{ fontFamily: F.displayX, fontSize: 22 }}>
          .
        </T>
      </T>

      <View style={{ alignItems: 'center', marginTop: 26 }}>
        <View style={{ width: 132, height: 132, alignItems: 'center', justifyContent: 'center' }}>
          {!declined ? (
            <Animated.View
              style={[
                StyleSheet.absoluteFill,
                {
                  borderRadius: 66,
                  borderWidth: 1.5,
                  borderColor: C.pink,
                  opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.15, 0.7] }),
                  transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1.06] }) }],
                },
              ]}
            />
          ) : null}
          <Photo uri={profile.photos?.[0]} blur={profile.blurFace} style={{ width: 112, height: 112, borderRadius: 56 }} />
        </View>
        <T style={{ fontFamily: F.display, fontSize: 28, marginTop: 16, textAlign: 'center' }}>{declined ? 'Not this time' : 'Your application is in'}</T>
        <T v="meta" c={C.muted} style={{ textAlign: 'center', marginTop: 6, maxWidth: 300 }}>
          {declined
            ? 'Your profile wasn’t accepted yet. You can improve it and apply once more.'
            : `Thanks${profile.name ? `, ${profile.name}` : ''}. Tonight is members-only: a person looks at every profile before it goes live. You’ll get a notification when there’s news.`}
        </T>
      </View>

      {declined ? (
        <Card style={{ marginTop: 24 }}>
          <T v="label" c={C.muted} style={{ marginBottom: 8 }}>
            {note ? 'Feedback from the team' : 'What helps'}
          </T>
          {note ? (
            <T c={C.ink2}>{note}</T>
          ) : (
            <View style={{ gap: 8 }}>
              {['At least three clear photos where we can see it’s you', 'A bio that says who you are and what you’re looking for', 'Your boundaries and turn-ons filled in honestly'].map((t) => (
                <View key={t} style={{ flexDirection: 'row', gap: 8 }}>
                  <Icon name="check" size={16} color={C.blueL} />
                  <T v="meta" c={C.ink2} style={{ flex: 1 }}>
                    {t}
                  </T>
                </View>
              ))}
            </View>
          )}
        </Card>
      ) : (
        <Card style={{ marginTop: 24, gap: 16 }}>
          <Step icon="check" title="Application sent" state="done" />
          <Step icon="eye" title="Reviewed by our team" sub="Photos, bio and verification. Usually within 24 hours." state="now" />
          <Step icon="flame" title="You’re in" sub="Discover, likes and the Lounge open up." state="next" />
        </Card>
      )}

      <View style={styles.exclusive}>
        <Icon name="lock" size={16} color={C.pinkL} />
        <T v="small" c={C.ink2} style={{ flex: 1 }}>
          {rate !== null ? `Members only. ${rate}% of applications are accepted.` : 'Members only. Every profile is reviewed by hand, and not everyone gets in.'}
        </T>
      </View>

      <View style={{ height: 24 }} />
      {declined ? (
        <>
          <GradientButton title="Improve my profile" onPress={onEdit} />
          <GhostButton
            title={busy ? 'Sending…' : 'Apply again'}
            onPress={async () => {
              if (busy) return;
              setBusy(true);
              await onReapply();
              setBusy(false);
            }}
            style={{ marginTop: 10 }}
          />
        </>
      ) : (
        <>
          <GradientButton title="Polish my profile meanwhile" onPress={onEdit} />
          <GhostButton title="Check for news" onPress={onRefresh} border={false} color={C.muted} style={{ marginTop: 4 }} />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  dot: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  exclusive: { flexDirection: 'row', gap: 10, alignItems: 'center', marginTop: 16, borderRadius: 14, borderWidth: 1, borderColor: '#3A2230', padding: 12 },
  exclusiveLine: { flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', marginTop: 6 },
  artBox: { flex: 1, minHeight: 90, alignItems: 'center', justifyContent: 'center', marginVertical: 8 },
  art: { height: '100%', maxHeight: 220, aspectRatio: ART.review.aspect, maxWidth: '100%' },
  tracker: { flexDirection: 'row', alignItems: 'flex-start', paddingTop: 4 },
  trackLine: { position: 'absolute', top: 18, right: '50%', width: '100%', height: 2, backgroundColor: C.pink, opacity: 0.7 },
});
