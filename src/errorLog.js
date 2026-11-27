// Error log: sends what went wrong to Supabase (public.app_errors) so the team sees it on the testing dashboard
// (fortunas.nl/tonight/admin › Errors), with who, which screen, which app version and which phone.
// Catches: our own "[tag] …" warnings, console.error, crashes outside React, unhandled promise rejections,
// and screens that crash while drawing (see ErrorBoundary). Never throws and never logs itself.
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import { supabase } from './lib/supabase';
import { versionLabel } from './version';

let screen = null;
let installed = false;
const recent = new Map(); // message -> last sent (ms), to skip repeats
const REPEAT_MS = 60 * 1000;

/** The screen the member has open; sent with each error. */
export function setErrorScreen(name) {
  screen = name ? String(name).slice(0, 80) : null;
}

const text = (v) => {
  if (v == null) return '';
  if (typeof v === 'string') return v;
  if (v instanceof Error) return v.message || String(v);
  if (typeof v === 'object' && (v.message || v.code)) return [v.code, v.message].filter(Boolean).join(' ');
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
};

function device() {
  try {
    return [Device.manufacturer, Device.modelName].filter(Boolean).join(' ') || null;
  } catch {
    return null;
  }
}

/**
 * Log an error. kind: 'error' | 'warning' | 'crash'. source: where it came from (backend, render, global, …).
 * err: an Error, a Supabase error or a string. context: small extra details (no message texts or photos).
 */
export function logError(source, err, context = null, kind = 'error') {
  try {
    const message = text(err).trim().slice(0, 2000);
    if (!message) return;
    const sig = `${source}|${message}`;
    const now = Date.now();
    if (now - (recent.get(sig) || 0) < REPEAT_MS) return;
    recent.set(sig, now);
    if (recent.size > 200) recent.delete(recent.keys().next().value);
    if (__DEV__) return; // in development the red/yellow boxes show it already
    const payload = {
      p_kind: kind,
      p_source: source,
      p_message: message,
      p_stack: err instanceof Error && err.stack ? String(err.stack).slice(0, 8000) : null,
      p_context: context,
      p_screen: screen,
      p_app_version: versionLabel(),
      p_platform: `${Platform.OS} ${Platform.Version ?? ''}`.trim(),
      p_device: device(),
    };
    supabase.rpc('log_app_error', payload).then(() => {}, () => {});
  } catch {
    // logging must never break the app
  }
}

// "[backend] like failed" style warnings: tag becomes the source, the rest the message.
function fromConsole(args, kind) {
  const first = typeof args[0] === 'string' ? args[0] : '';
  const tag = first.match(/^\[([\w-]+)\]\s*/);
  if (kind === 'warning' && !tag) return; // library warnings stay out of the log
  const rest = [tag ? first.slice(tag[0].length) : first, ...args.slice(1)].map(text).filter(Boolean).join(' · ');
  const err = args.find((a) => a instanceof Error);
  logError(tag ? tag[1] : 'console', err && !tag ? err : rest, null, kind);
}

/** Once, at start-up: hook console, uncaught errors and unhandled promise rejections. */
export function installErrorLog() {
  if (installed) return;
  installed = true;

  const warn = console.warn;
  console.warn = (...args) => {
    warn(...args);
    fromConsole(args, 'warning');
  };
  const error = console.error;
  console.error = (...args) => {
    error(...args);
    fromConsole(args, 'error');
  };

  const EU = global.ErrorUtils;
  if (EU?.getGlobalHandler) {
    const prev = EU.getGlobalHandler();
    EU.setGlobalHandler((e, isFatal) => {
      logError('global', e, { fatal: !!isFatal }, isFatal ? 'crash' : 'error');
      prev?.(e, isFatal);
    });
  }

  // Promises nobody caught (Hermes on the phones; the browser event on web).
  if (global.HermesInternal?.enablePromiseRejectionTracker && !__DEV__) {
    global.HermesInternal.enablePromiseRejectionTracker({
      allRejections: true,
      onUnhandled: (_id, reason) => logError('promise', reason),
      onHandled: () => {},
    });
  } else if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.addEventListener('unhandledrejection', (e) => logError('promise', e.reason));
    window.addEventListener('error', (e) => logError('global', e.error || e.message));
  }
}
