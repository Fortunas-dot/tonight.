// Email and password, next to Sign in with Apple:
// - KeepWithEmail (Settings): ties this account to an email (6-digit code from the email), then a password.
// - EmailSignIn (Welcome): sign in on a new phone; "Forgot password?" sends a code and lets you set a new one.
import { useState } from 'react';
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
  code: 'That code is wrong or has expired. Check the email or ask for a new one.',
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
  const [code, setCode] = useState('');
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
      setCode('');
      setStep('code');
    });

  const checkCode = () =>
    run(async () => {
      const r = await api.confirmEmailLink(email, code);
      if (r !== 'ok') {
        thud();
        return setProblem(r);
      }
      success();
      setStep('password');
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
              We send you a 6-digit code to check it’s yours. We only use it to restore your account, never for marketing, and it’s never shown to anyone.
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
            <GradientButton title={busy ? 'Sending…' : 'Send me a code'} disabled={busy || !email.trim()} onPress={sendCode} />
          </>
        ) : step === 'code' ? (
          <>
            <T v="title" style={{ marginTop: 8 }}>
              Check your email
            </T>
            <T v="meta" c={C.muted} style={{ marginTop: 6 }}>
              We sent a 6-digit code to {email.trim().toLowerCase()}. It can take a minute; check your spam folder too.
            </T>
            <Input
              label="Code"
              icon="lock"
              value={code}
              onChangeText={(t) => setCode(t.replace(/\D/g, ''))}
              keyboardType="number-pad"
              autoComplete="one-time-code"
              textContentType="oneTimeCode"
              placeholder="000000"
              maxLength={6}
              autoFocus
              big
            />
            <Problem kind={problem} />
            <View style={{ height: 24 }} />
            <GradientButton title={busy ? 'Checking…' : 'Confirm'} disabled={busy || code.length < 6} onPress={checkCode} />
            <GhostButton title="Send a new code" onPress={sendCode} border={false} color={C.muted} style={{ marginTop: 4 }} />
          </>
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
  const [code, setCode] = useState('');
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
      setCode('');
      setNote(`If ${email.trim().toLowerCase()} has a Tonight account, a 6-digit code is on its way.`);
      setStep('code');
    });

  const checkCode = () =>
    run(async () => {
      const r = await api.verifyLoginCode(email, code);
      if (r.error) {
        thud();
        return setProblem('code');
      }
      success();
      setPw('');
      setStep('password');
    });

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
          <>
            <T v="title" style={{ marginTop: 8 }}>
              Check your email
            </T>
            <T v="meta" c={C.muted} style={{ marginTop: 6 }}>
              {note} Check your spam folder too.
            </T>
            <Input
              label="Code"
              icon="lock"
              value={code}
              onChangeText={(t) => setCode(t.replace(/\D/g, ''))}
              keyboardType="number-pad"
              autoComplete="one-time-code"
              textContentType="oneTimeCode"
              placeholder="000000"
              maxLength={6}
              autoFocus
              big
            />
            <Problem kind={problem} />
            <View style={{ height: 24 }} />
            <GradientButton title={busy ? 'Checking…' : 'Continue'} disabled={busy || code.length < 6} onPress={checkCode} />
            <GhostButton title="Send a new code" onPress={forgot} border={false} color={C.muted} style={{ marginTop: 4 }} />
          </>
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
  problem: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', marginTop: 14, backgroundColor: '#2A1418', borderRadius: 12, padding: 12 },
});
