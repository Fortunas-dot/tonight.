// Email and password, next to Sign in with Apple:
// - KeepWithEmail (Settings): ties this account to an email (tap the link in the email), then a password.
// - EmailSignIn (Welcome): sign in on a new phone; "Forgot password?" emails a login link, then a new password.
// The links open the app (tonight://auth); App.js passes them to api.handleAuthLink, which tells these screens.
import { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { C, F } from '../theme';
import { Icon } from '../icons';
import { GhostButton, GradientButton, Header, Screen, T, success, thud } from '../ui';
import * as api from '../backend';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MIN_PW = 8;

const MESSAGES = {
  taken: 'That email already belongs to a Tonight account. Sign in with it on the welcome screen instead.',
  rate: 'Too many emails in a short time. Wait a few minutes and try again.',
  code: 'That link didn’t work or has expired. Ask for a new one.',
  notyet: 'Not confirmed yet. Open the email on this phone and tap the link in it.',
  credentials: 'Email or password is wrong.',
  weak: `Pick a stronger password: at least ${MIN_PW} characters.`,
  email: 'That doesn’t look like an email address.',
  failed: 'Something went wrong. Check your connection and try again.',
};

function Input({ label, icon, value, onChangeText, secure, keyboardType, autoComplete, textContentType, placeholder, autoFocus, maxLength, big }) {
  const [focus, setFocus] = useState(false);
  const [show, setShow] = useState(false);
  return (
    <View style={{ marginTop: 14 }}>
      <T v="label" c={focus ? C.ink : C.muted} style={{ marginBottom: 6, marginLeft: 2 }}>
        {label}
      </T>
      <View style={[styles.box, focus && styles.boxFocus]}>
        <Icon name={icon} size={18} color={focus ? C.pinkL : C.muted} />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={C.faint}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          secureTextEntry={secure && !show}
          keyboardType={keyboardType}
          autoComplete={autoComplete}
          textContentType={textContentType}
          autoCapitalize="none"
          autoCorrect={false}
          autoFocus={autoFocus}
          maxLength={maxLength}
          accessibilityLabel={label}
          style={[styles.input, big && { fontSize: 24, letterSpacing: 8, fontFamily: F.semi }]}
        />
        {secure ? (
          <Pressable accessibilityRole="button" accessibilityLabel={show ? 'Hide password' : 'Show password'} onPress={() => setShow((v) => !v)} hitSlop={10}>
            <Icon name={show ? 'eyeOff' : 'eye'} size={18} color={C.muted} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function Problem({ kind }) {
  if (!kind) return null;
  return (
    <View style={styles.problem}>
      <Icon name="close" size={16} color="#FF9AA3" />
      <T v="small" c="#FFD7DC" style={{ flex: 1 }}>
        {MESSAGES[kind] || MESSAGES.failed}
      </T>
    </View>
  );
}

function WaitForLink({ email, what, onResend, onCheck, busy, problem }) {
  return (
    <>
      <View style={styles.mailIcon}>
        <Icon name="send" size={28} color={C.pinkL} />
      </View>
      <T v="title" style={{ marginTop: 16 }}>
        Check your email
      </T>
      <T v="meta" c={C.muted} style={{ marginTop: 6 }}>
        {what} Open it on this phone and tap the link: Tonight opens and carries on by itself.
      </T>
      <View style={styles.steps}>
        {['Open your mail app', `Find the email from Tonight (Supabase Auth) to ${email}`, 'Tap the link in it'].map((t, i) => (
          <View key={t} style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
            <View style={styles.stepNum}>
              <T v="small" style={{ fontFamily: F.semi }}>
                {i + 1}
              </T>
            </View>
            <T v="meta" c={C.ink2} style={{ flex: 1 }}>
              {t}
            </T>
          </View>
        ))}
      </View>
      <T v="small" c={C.faint} style={{ marginTop: 10 }}>
        Nothing after a minute? Check your spam folder.
      </T>
      <Problem kind={problem} />
      <View style={{ height: 24 }} />
      {onCheck ? <GradientButton title={busy ? 'Checking…' : 'I’ve tapped the link'} disabled={busy} onPress={onCheck} /> : null}
      <GhostButton title="Send the email again" onPress={onResend} border={false} color={C.muted} style={{ marginTop: 4 }} />
    </>
  );
}

function Wrap({ children }) {
  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {children}
    </KeyboardAvoidingView>
  );
}

/** Settings › Keep your account › Use email: email → code → password. */
export function KeepWithEmail({ onBack, onDone }) {
  const [step, setStep] = useState('email'); // email | code | password
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState(null);

  const run = async (fn) => {
    if (busy) return;
    setBusy(true);
    setProblem(null);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  };

  const sendCode = () =>
    run(async () => {
      if (!EMAIL_RE.test(email.trim())) return setProblem('email');
      const r = await api.startEmailLink(email);
      if (r !== 'sent') {
        thud();
        return setProblem(r);
      }
      setStep('code');
    });


  const savePw = () =>
    run(async () => {
      if (pw.length < MIN_PW) return setProblem('weak');
      const r = await api.setPassword(pw);
      if (r !== 'ok') {
        thud();
        return setProblem(r);
      }
      success();
      onDone(email.trim().toLowerCase());
    });

  // The link in the email opens the app; once it's handled, the email is confirmed.
  useEffect(() => {
    if (step !== 'code') return undefined;
    return api.onAuthLink((r) => {
      if (r.error) return setProblem('code');
      success();
      setProblem(null);
      setStep('password');
    });
  }, [step]);

  const checkConfirmed = () =>
    run(async () => {
      const links = await api.accountLinks();
      if (links.email && links.email === email.trim().toLowerCase()) {
        success();
        setStep('password');
      } else setProblem('notyet');
    });

  return (
    <Wrap>
      <Screen scroll>
        <Header title="Keep your account" onBack={step === 'code' ? () => setStep('email') : onBack} />
        {step === 'email' ? (
          <>
            <T v="title" style={{ marginTop: 8 }}>
              Your email
            </T>
            <T v="meta" c={C.muted} style={{ marginTop: 6 }}>
              We email you a link to check it’s yours. We only use your email to restore your account, never for marketing, and it’s never shown to anyone.
            </T>
            <Input
              label="Email"
              icon="send"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoComplete="email"
              textContentType="emailAddress"
              placeholder="you@example.com"
              autoFocus
            />
            <Problem kind={problem} />
            <View style={{ height: 24 }} />
            <GradientButton title={busy ? 'Sending…' : 'Send me the link'} disabled={busy || !email.trim()} onPress={sendCode} />
          </>
        ) : step === 'code' ? (
          <WaitForLink email={email.trim().toLowerCase()} what="We sent a confirmation link." busy={busy} problem={problem} onCheck={checkConfirmed} onResend={sendCode} />
        ) : (
          <>
            <T v="title" style={{ marginTop: 8 }}>
              Choose a password
            </T>
            <T v="meta" c={C.muted} style={{ marginTop: 6 }}>
              At least {MIN_PW} characters. With this and your email you can sign in on any phone.
            </T>
            <Input label="Password" icon="lock" value={pw} onChangeText={setPw} secure autoComplete="new-password" textContentType="newPassword" placeholder="••••••••" autoFocus />
            <Problem kind={problem} />
            <View style={{ height: 24 }} />
            <GradientButton title={busy ? 'Saving…' : 'Save password'} disabled={busy || pw.length < MIN_PW} onPress={savePw} />
          </>
        )}
        {busy ? <ActivityIndicator color={C.muted} style={{ marginTop: 16 }} /> : null}
      </Screen>
    </Wrap>
  );
}

/** Welcome › Sign in with email. onSignedIn() runs once the account is active on this phone. */
export function EmailSignIn({ onBack, onSignedIn }) {
  const [step, setStep] = useState('login'); // login | code | password
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState(null);
  const [note, setNote] = useState(null);

  const run = async (fn) => {
    if (busy) return;
    setBusy(true);
    setProblem(null);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  };

  const login = () =>
    run(async () => {
      if (!EMAIL_RE.test(email.trim())) return setProblem('email');
      const r = await api.signInEmail(email, pw);
      if (r.error) {
        thud();
        return setProblem(r.error);
      }
      success();
      await onSignedIn();
    });

  const forgot = () =>
    run(async () => {
      if (!EMAIL_RE.test(email.trim())) return setProblem('email');
      const r = await api.sendLoginCode(email);
      // Same answer whether or not the address has an account, so nobody can find out who is a member.
      if (r === 'rate') return setProblem('rate');
      setNote(`If ${email.trim().toLowerCase()} has a Tonight account, a login link is on its way.`);
      setStep('code');
    });


  // Tapping the login link signs this phone in; then a new password.
  useEffect(() => {
    if (step !== 'code') return undefined;
    return api.onAuthLink((r) => {
      if (r.error) return setProblem('code');
      success();
      setProblem(null);
      setPw('');
      setStep('password');
    });
  }, [step]);

  const newPw = () =>
    run(async () => {
      if (pw.length < MIN_PW) return setProblem('weak');
      const r = await api.setPassword(pw);
      if (r !== 'ok') {
        thud();
        return setProblem(r);
      }
      success();
      await onSignedIn();
    });

  return (
    <Wrap>
      <Screen scroll>
        <Header title="" onBack={step === 'login' ? onBack : () => setStep('login')} />
        {step === 'login' ? (
          <>
            <T v="title" style={{ marginTop: 8 }}>
              Welcome back
            </T>
            <T v="meta" c={C.muted} style={{ marginTop: 6 }}>
              Sign in with the email and password you set under Settings › Keep your account.
            </T>
            <Input
              label="Email"
              icon="send"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoComplete="email"
              textContentType="username"
              placeholder="you@example.com"
              autoFocus
            />
            <Input label="Password" icon="lock" value={pw} onChangeText={setPw} secure autoComplete="current-password" textContentType="password" placeholder="••••••••" />
            <Pressable accessibilityRole="button" onPress={forgot} style={{ alignSelf: 'flex-end', paddingVertical: 12 }}>
              <T v="label" c={C.pinkL} style={{ fontSize: 14 }}>
                Forgot password?
              </T>
            </Pressable>
            <Problem kind={problem} />
            <View style={{ height: 16 }} />
            <GradientButton title={busy ? 'Signing in…' : 'Sign in'} disabled={busy || !email.trim() || !pw} onPress={login} />
          </>
        ) : step === 'code' ? (
          <WaitForLink email={email.trim().toLowerCase()} what={note} busy={busy} problem={problem} onResend={forgot} />
        ) : (
          <>
            <T v="title" style={{ marginTop: 8 }}>
              New password
            </T>
            <T v="meta" c={C.muted} style={{ marginTop: 6 }}>
              You’re signed in. Choose a new password of at least {MIN_PW} characters.
            </T>
            <Input label="New password" icon="lock" value={pw} onChangeText={setPw} secure autoComplete="new-password" textContentType="newPassword" placeholder="••••••••" autoFocus />
            <Problem kind={problem} />
            <View style={{ height: 24 }} />
            <GradientButton title={busy ? 'Saving…' : 'Save and continue'} disabled={busy || pw.length < MIN_PW} onPress={newPw} />
          </>
        )}
      </Screen>
    </Wrap>
  );
}

const styles = StyleSheet.create({
  box: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.surf, borderRadius: 16, borderWidth: 1.5, borderColor: C.surf, paddingHorizontal: 14, minHeight: 56 },
  boxFocus: { borderColor: C.pink },
  input: { flex: 1, color: C.ink, fontFamily: F.body, fontSize: 16, paddingVertical: 14 },
  mailIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: C.pinkBg, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  steps: { gap: 12, marginTop: 18, backgroundColor: C.surf, borderRadius: 16, padding: 14 },
  stepNum: { width: 24, height: 24, borderRadius: 12, backgroundColor: C.surf2, alignItems: 'center', justifyContent: 'center' },
  problem: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', marginTop: 14, backgroundColor: '#2A1418', borderRadius: 12, padding: 12 },
});
