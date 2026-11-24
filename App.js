import { useCallback, useEffect, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import * as ScreenCapture from 'expo-screen-capture';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFonts } from 'expo-font';
import {
  BricolageGrotesque_500Medium,
  BricolageGrotesque_700Bold,
  BricolageGrotesque_800ExtraBold,
} from '@expo-google-fonts/bricolage-grotesque';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { C } from './src/theme';
import { CHATS, IDEAS, PEOPLE } from './src/data';
import { TabBar } from './src/ui';
import * as api from './src/backend';
import { applyNewestUpdate } from './src/version';

import { Basics, Boundaries, Code, Discretion, Photos, Preview, Verify, Welcome } from './src/screens/Onboarding';
import {
  Chat,
  Chats,
  CodeView,
  GuideView,
  Ideas,
  Match,
  Me,
  Plan,
  ProfileView,
  Support,
  Likes,
} from './src/screens/Main';
import { Compose, Lounge, PostView } from './src/screens/Lounge';
import { EditProfile } from './src/screens/ProfileFields';
import { DEFAULT_FILTERS } from './src/screens/DiscoverFilters';
import { Privacy, Settings } from './src/screens/Settings';
import { LockGate } from './src/screens/Lock';
import { Intro } from './src/screens/Intro';
import { FakeCall } from './src/screens/FakeCall';
import { DiscoverPage } from './src/screens/DiscoverPage';
import { onNotificationTap, registerForPush } from './src/notifications';

// Off during testing so screenshots can be shared. Turn back on before the App Store release.
const BLOCK_SCREENSHOTS = false;

SplashScreen.preventAutoHideAsync().catch(() => {});

const STORE = 'tonight.v1';
const FLOW = ['welcome', 'code', 'basics', 'photos', 'boundaries', 'verify', 'discretion', 'preview'];

export default function App() {
  const [fontsLoaded] = useFonts({
    BricolageGrotesque_500Medium,
    BricolageGrotesque_700Bold,
    BricolageGrotesque_800ExtraBold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  const [ready, setReady] = useState(false);
  const [step, setStep] = useState(0);
  const [onboarded, setOnboarded] = useState(false);
  const [profile, setProfile] = useState({});
  const [tab, setTab] = useState('discover');
  const [stack, setStack] = useState([]);
  const [chats, setChats] = useState(CHATS);
  const [ideas, setIdeas] = useState(IDEAS);
  const [online, setOnline] = useState(false);
  const [deck, setDeck] = useState([]);
  const [likesYou, setLikesYou] = useState([]);
  const [feedKey, setFeedKey] = useState(0); // bump to reload the Lounge feed
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [intro, setIntro] = useState(true); // opening animation, once per launch
  const endIntro = useCallback(() => setIntro(false), []);
  const [ringing, setRinging] = useState(false); // the fake incoming call

  // Get a new OTA update in right away (restarts the app once when there is one).
  useEffect(() => {
    applyNewestUpdate();
  }, []);

  // Restore saved progress once.
  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(STORE)
      .then((raw) => {
        if (!alive) return;
        if (raw) {
          const saved = JSON.parse(raw);
          setProfile(saved.profile || {});
          setOnboarded(!!saved.onboarded);
          if (saved.filters) setFilters({ ...DEFAULT_FILTERS, ...saved.filters });
        }
        setReady(true);
        // Backend: sign in, and restore the profile from Supabase if this device has none.
        api.ensureSession().then(async (id) => {
          if (!alive || !id) return;
          if (!raw) {
            const remote = await api.loadMyProfile();
            if (alive && remote?.onboarded) {
              setProfile(remote.profile);
              setOnboarded(true);
            }
          }
          // Swap expired photo links (they last a day) for fresh ones.
          if (raw) {
            const fresh = await api.refreshMyPhotos(JSON.parse(raw).profile || {});
            if (alive && fresh) setProfile((q) => ({ ...q, ...fresh }));
          }
          if (alive) setOnline(true);
        });
      })
      .catch(() => alive && setReady(true));
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (ready) AsyncStorage.setItem(STORE, JSON.stringify({ profile, onboarded, filters })).catch(() => {});
  }, [ready, profile, onboarded, filters]);

  // Save the profile to Supabase a moment after it changes (uploads new photos too).
  useEffect(() => {
    if (!online || !profile.name) return;
    const t = setTimeout(async () => {
      const uploaded = await api.saveProfile(profile, onboarded);
      if (JSON.stringify(uploaded) !== JSON.stringify(profile.uploaded || {})) setProfile((p) => ({ ...p, uploaded }));
    }, 800);
    return () => clearTimeout(t);
  }, [online, profile, onboarded]);

  // Real people, matches and ideas once signed in and onboarded.
  const refresh = useCallback(async () => {
    const [d, l, c, i] = await Promise.all([api.loadDeck(profile), api.loadLikesYou(profile), api.loadChats(profile), api.loadIdeas()]);
    setDeck(d);
    setLikesYou(l);
    setChats(c.length ? c : CHATS); // examples only until the first real match
    if (i) setIdeas([...i, ...IDEAS]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.boundaries]);

  // Push notifications: ask once signed in and onboarded; a tap opens the right tab.
  useEffect(() => {
    if (!online || !onboarded) return undefined;
    registerForPush();
    return onNotificationTap((data) => {
      setStack([]);
      if (data.kind === 'likes') setTab('likes');
      else if (data.kind === 'lounge') setTab('lounge');
      else setTab('chats');
    });
  }, [online, onboarded]);

  useEffect(() => {
    if (!online || !onboarded) return;
    // refresh() only sets state after its network calls resolve.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
    return api.subscribe({
      onMessage: (matchId, msg) =>
        setChats((cs) => cs.map((c) => (c.matchId === matchId && !c.messages.some((m) => m.id === msg.id) ? { ...c, messages: [...c.messages, msg] } : c))),
      onMatch: () => refresh(),
    });
  }, [online, onboarded, refresh]);

  // Discretion: block screenshots / recordings and blur the app switcher preview.
  // Screenshots are allowed while testing; set BLOCK_SCREENSHOTS to true again before launch.
  useEffect(() => {
    if (Platform.OS === 'web') return;
    if (BLOCK_SCREENSHOTS) {
      ScreenCapture.preventScreenCaptureAsync('tonight').catch(() => {});
      ScreenCapture.enableAppSwitcherProtectionAsync(0.6).catch(() => {});
    } else {
      ScreenCapture.allowScreenCaptureAsync('tonight').catch(() => {});
      ScreenCapture.disableAppSwitcherProtectionAsync().catch(() => {});
    }
  }, []);

  const onLayout = useCallback(() => {
    if (fontsLoaded && ready) SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded, ready]);

  if (!fontsLoaded || !ready) return null;

  const push = (name, params) => setStack((s) => [...s, { name, params }]);
  const pop = () => setStack((s) => s.slice(0, -1));
  const replaceTop = (name, params) => setStack((s) => [...s.slice(0, -1), { name, params }]);

  const sendMessage = (id, msg) => {
    const chat = chats.find((c) => c.id === id);
    if (chat?.real && msg.me) {
      const tempId = `local-${Date.now()}`;
      setChats((cs) => cs.map((c) => (c.id === id ? { ...c, messages: [...c.messages, { ...msg, id: tempId }] } : c)));
      api.sendMessage(chat.matchId, msg.text).then((realId) => {
        if (realId) setChats((cs) => cs.map((c) => (c.id === id ? { ...c, messages: c.messages.filter((m) => m.id !== realId).map((m) => (m.id === tempId ? { ...m, id: realId } : m)) } : c)));
      });
      return;
    }
    setChats((cs) => cs.map((c) => (c.id === id ? { ...c, messages: [...c.messages, msg] } : c)));
  };

  // Resolves to true when liking makes a match.
  const likeIt = async (person) => {
    if (person.real) {
      const matched = await api.like(person.id);
      setDeck((d) => d.filter((p) => p.id !== person.id));
      setLikesYou((l) => l.filter((p) => p.id !== person.id));
      if (matched) await refresh();
      return matched;
    }
    // Sample data: Lina and Sam already liked you, so liking them is a match.
    return person.id === 'lina' || person.id === 'sam';
  };

  const like = async (person) => {
    if (await likeIt(person)) push('match', { person });
  };

  const openChat = (person, firstMessage) => {
    if (firstMessage) sendMessage(person.id, { me: true, text: firstMessage });
    setTab('chats');
    setStack([{ name: 'chat', params: { id: person.id } }]);
  };

  let screen;
  if (!onboarded) {
    const name = FLOW[step];
    const props = {
      profile,
      setProfile,
      next: () => {
        if (step === FLOW.length - 1) {
          setOnboarded(true);
          setStep(0);
        } else setStep(step + 1);
      },
      back: () => setStep(Math.max(0, step - 1)),
    };
    const map = { welcome: Welcome, code: Code, basics: Basics, photos: Photos, boundaries: Boundaries, verify: Verify, discretion: Discretion, preview: Preview };
    const Step = map[name];
    screen = <Step key={name} {...props} />;
  } else {
    const top = stack[stack.length - 1];
    if (top) {
      const p = top.params || {};
      const chat = chats.find((c) => c.id === p.id);
      switch (top.name) {
        case 'profile':
          screen = (
            <ProfileView
              person={p.person}
              onClose={pop}
              onLike={async (person) => {
                if (await likeIt(person)) replaceTop('match', { person });
                else pop();
              }}
              onReport={(person) => person.real && api.report(person.id, 'Reported from profile')}
              onBlock={(person) => {
                if (!person.real) return pop();
                api.block(person.id).then(refresh);
                pop();
              }}
            />
          );
          break;
        case 'match':
          screen = <Match person={p.person} me={profile} onClose={pop} onChat={openChat} />;
          break;
        case 'chat':
          screen = chat ? <Chat key={chat.id} chat={chat} live={!chat.plan && !chat.real} filterExplicit={profile.settings?.filterExplicit !== false} onSend={sendMessage} onBack={pop} onPlan={(id) => push('plan', { id })} /> : null;
          break;
        case 'plan':
          screen = chat ? <Plan chat={chat} onBack={pop} onSend={sendMessage} onFakeCall={() => setTimeout(() => setRinging(true), 20000)} /> : null;
          break;
        case 'compose':
          screen = (
            <Compose
              onClose={pop}
              onPosted={() => {
                setFeedKey((k) => k + 1);
                pop();
              }}
            />
          );
          break;
        case 'post':
          screen = (
            <PostView
              key={p.post.id}
              post={p.post}
              onBack={() => {
                setFeedKey((k) => k + 1);
                pop();
              }}
            />
          );
          break;
        case 'guide':
          screen = <GuideView guide={p.guide} onBack={pop} />;
          break;
        case 'settings':
          screen = (
            <Settings
              profile={profile}
              setProfile={setProfile}
              go={(name) => push(name)}
              onBack={pop}
              onDeleted={() => {
                AsyncStorage.removeItem(STORE).catch(() => {});
                setProfile({});
                setOnboarded(false);
                setStep(0);
                setStack([]);
                setTab('discover');
                setChats(CHATS);
                setDeck([]);
                setLikesYou([]);
                setOnline(false);
                api.ensureSession().then((id) => id && setOnline(true));
              }}
            />
          );
          break;
        case 'editProfile':
          screen = <EditProfile profile={profile} setProfile={setProfile} onBack={pop} />;
          break;
        case 'privacy':
          screen = <Privacy profile={profile} setProfile={setProfile} onBack={pop} />;
          break;
        case 'support':
          screen = <Support onBack={pop} />;
          break;
        case 'ideas':
          screen = <Ideas ideas={ideas} setIdeas={setIdeas} onPost={api.postIdea} onVote={api.voteIdea} onBack={pop} />;
          break;
        case 'code':
          screen = <CodeView onBack={pop} />;
          break;
        default:
          screen = null;
      }
    } else {
      const tabs = {
        discover: (
          <DiscoverPage
            deck={[...deck, ...PEOPLE]}
            profile={profile}
            filters={filters}
            onFilters={(f, show) => {
              setFilters(f);
              if (show && show.join() !== (profile.show || []).join()) setProfile((p) => ({ ...p, show }));
            }}
            onLike={like}
            onReport={(person) => person.real && api.report(person.id, 'Reported from Discover')}
            onBlock={(person) => person.real && api.block(person.id).then(refresh)}
          />
        ),
        likes: <Likes people={likesYou} blurAll={!!profile.settings?.blurAll} onOpen={(person) => push('profile', { person })} />,
        chats: <Chats chats={chats} onOpen={(id) => push('chat', { id })} />,
        lounge: <Lounge profile={profile} refreshKey={feedKey} onGuide={(guide) => push('guide', { guide })} onCompose={() => push('compose')} onOpenPost={(post) => push('post', { post })} />,
        me: (
          <Me
            profile={profile}
            go={(name) => push(name)}
            onRestart={() => {
              setOnboarded(false);
              setStep(0);
              setStack([]);
              setTab('discover');
            }}
          />
        ),
      };
      screen = (
        <View style={{ flex: 1 }}>
          <View style={{ flex: 1 }}>{tabs[tab]}</View>
          <TabBar tab={tab} onTab={setTab} badges={{ likes: likesYou.length }} />
        </View>
      );
    }
  }

  return (
    <SafeAreaProvider>
      <View style={{ flex: 1, backgroundColor: C.bg }} onLayout={onLayout}>
        <StatusBar style="light" />
        <LockGate enabled={!!profile.settings?.faceLock}>{screen}</LockGate>
        {intro ? <Intro onDone={endIntro} /> : null}
        {ringing ? (
          <View style={StyleSheet.absoluteFill}>
            <FakeCall onEnd={() => setRinging(false)} />
          </View>
        ) : null}
      </View>
    </SafeAreaProvider>
  );
}
