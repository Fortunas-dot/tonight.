import { useCallback, useEffect, useState } from 'react';
import { Platform, View } from 'react-native';
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
import { Basics, Boundaries, Code, Discretion, Photos, Preview, Verify, Welcome } from './src/screens/Onboarding';
import {
  Chat,
  Chats,
  CodeView,
  Discover,
  GuideView,
  Ideas,
  Lounge,
  Match,
  Me,
  Plan,
  Privacy,
  ProfileView,
  Support,
  Likes,
} from './src/screens/Main';

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
        }
        setReady(true);
      })
      .catch(() => alive && setReady(true));
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (ready) AsyncStorage.setItem(STORE, JSON.stringify({ profile, onboarded })).catch(() => {});
  }, [ready, profile, onboarded]);

  // Discretion: block screenshots / recordings and blur the app switcher preview.
  useEffect(() => {
    if (Platform.OS === 'web') return;
    ScreenCapture.preventScreenCaptureAsync('tonight').catch(() => {});
    ScreenCapture.enableAppSwitcherProtectionAsync(0.6).catch(() => {});
  }, []);

  const onLayout = useCallback(() => {
    if (fontsLoaded && ready) SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded, ready]);

  if (!fontsLoaded || !ready) return null;

  const push = (name, params) => setStack((s) => [...s, { name, params }]);
  const pop = () => setStack((s) => s.slice(0, -1));
  const replaceTop = (name, params) => setStack((s) => [...s.slice(0, -1), { name, params }]);

  const sendMessage = (id, msg) => setChats((cs) => cs.map((c) => (c.id === id ? { ...c, messages: [...c.messages, msg] } : c)));

  const like = (person) => {
    // Sample data: Lina and Sam already liked you, so liking them is a match.
    if (person.id === 'lina' || person.id === 'sam') push('match', { person });
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
              onLike={(person) => {
                if (person.id === 'lina' || person.id === 'sam') replaceTop('match', { person });
                else pop();
              }}
            />
          );
          break;
        case 'match':
          screen = <Match person={p.person} onClose={pop} onChat={openChat} />;
          break;
        case 'chat':
          screen = <Chat key={chat.id} chat={chat} live={!chat.plan} onSend={sendMessage} onBack={pop} onPlan={(id) => push('plan', { id })} />;
          break;
        case 'plan':
          screen = <Plan chat={chat} onBack={pop} />;
          break;
        case 'guide':
          screen = <GuideView guide={p.guide} onBack={pop} />;
          break;
        case 'privacy':
          screen = <Privacy onBack={pop} />;
          break;
        case 'support':
          screen = <Support onBack={pop} />;
          break;
        case 'ideas':
          screen = <Ideas ideas={ideas} setIdeas={setIdeas} onBack={pop} />;
          break;
        case 'code':
          screen = <CodeView onBack={pop} />;
          break;
        default:
          screen = null;
      }
    } else {
      const tabs = {
        discover: <Discover deck={PEOPLE} onOpen={(person) => push('profile', { person })} onLike={like} />,
        likes: <Likes onOpen={(person) => push('profile', { person })} />,
        chats: <Chats chats={chats} onOpen={(id) => push('chat', { id })} />,
        lounge: <Lounge onGuide={(guide) => push('guide', { guide })} />,
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
          <TabBar tab={tab} onTab={setTab} badges={{ likes: PEOPLE.length }} />
        </View>
      );
    }
  }

  return (
    <SafeAreaProvider>
      <View style={{ flex: 1, backgroundColor: C.bg }} onLayout={onLayout}>
        <StatusBar style="light" />
        {screen}
      </View>
    </SafeAreaProvider>
  );
}
