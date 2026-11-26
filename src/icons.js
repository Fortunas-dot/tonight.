import Svg, { Circle, Path, Rect } from 'react-native-svg';

// Stroke icons in one family (24px grid, 1.8 stroke), filled ones marked with fill.
const PATHS = {
  back: ['M15 18l-6-6 6-6'],
  close: ['M6 6l12 12M18 6L6 18'],
  down: ['M6 9l6 6 6-6'],
  up: ['M6 15l6-6 6 6'],
  chev: ['M9 6l6 6-6 6'],
  plus: ['M12 5v14M5 12h14'],
  check: ['M5 12l5 5 9-10'],
  chat: ['M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z'],
  heart: ['M12 20s-7-4.3-8.6-8.8C2.2 8 4.2 4.8 7.4 4.8c1.9 0 3.4 1 4.6 2.6 1.2-1.6 2.7-2.6 4.6-2.6 3.2 0 5.2 3.2 4 6.4C19 15.7 12 20 12 20z'],
  flame: ['M12 3c1 4 5 5.5 5 10a5 5 0 0 1-10 0c0-2.5 1.5-4 2.5-5 .3 2 1.3 3 2.5 3-1-3 0-6 0-8z'],
  shield: ['M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z'],
  shieldCheck: ['M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z', 'M9 12l2 2 4-4'],
  lock: ['M8 11V7a4 4 0 0 1 8 0v4'],
  eye: ['M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z'],
  eyeOff: ['M3 3l18 18', 'M10.6 6.1A9.8 9.8 0 0 1 12 6c5 0 9 6 9 6a17 17 0 0 1-2.6 3.2M6.6 6.6C4.3 8.1 3 12 3 12s4 6 9 6c1.4 0 2.7-.4 3.8-1'],
  send: ['M12 19V5M6 11l6-6 6 6'],
  filter: ['M4 7h10M18 7h2M4 17h4M12 17h8'],
  pin: ['M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z'],
  bulb: ['M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0 0 12 3z'],
  book: ['M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z', 'M4 21a2 2 0 0 1 2-2h13'],
  clock: ['M12 9v4l2.5 2'],
  share: ['M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7', 'M12 3v12', 'M7 8l5-5 5 5'],
  bookmark: ['M6 3h12v18l-6-4-6 4z'],
  bell: ['M6 16v-5a6 6 0 0 1 12 0v5l2 2H4z', 'M10 21h4'],
  image: ['M5 5h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z', 'M21 16l-5-5-8 8', 'M9 8.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3z'],
  spark: ['M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z'],
  mask: ['M3 10c2-3 6-3 9-1 3-2 7-2 9 1-1 4-5 5-7 3-1-1-3-1-4 0-2 2-6 1-7-3z'],
  poll: ['M5 20V10', 'M12 20V4', 'M19 20v-7'],
  gear: ['M12 9a3 3 0 1 1 0 6a3 3 0 1 1 0-6z', 'M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z'],
  logout: ['M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3', 'M10 8l-4 4 4 4', 'M6 12h10'],
  trash: ['M4 7h16', 'M10 11v6M14 11v6', 'M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13', 'M9 7V4h6v3'],
  pause: ['M9 5v14M15 5v14'],
  doc: ['M7 3h7l5 5v13H7z', 'M14 3v5h5', 'M10 13h6M10 17h6'],
  ruler: ['M3 17L17 3l4 4L7 21z', 'M7 13l2 2M10 10l2 2M13 7l2 2'],
  glass: ['M7 3h10l-1 7a4 4 0 0 1-8 0z', 'M12 14v6', 'M8 21h8'],
  smoke: ['M3 16h14v3H3z', 'M19 16v3', 'M17 12c0-2 2-2 2-4s-2-2-2-4'],
  star: ['M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.6 6.7 19.4l1.2-6L3.4 9.3l6-.7z'],
  home: ['M4 11l8-7 8 7', 'M6 10v10h12V10', 'M10 20v-5h4v5'],
  link: ['M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7L11.5 6.8', 'M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1.5-1.5'],
  lang: ['M4 5h9', 'M8.5 3v2', 'M6 5c0 4 3 7 6 8', 'M11 5c-.5 3-3 6-6 8', 'M13 21l4-10 4 10', 'M14.5 17h5'],
  orient: ['M12 3a9 9 0 1 1 0 18a9 9 0 1 1 0-18z', 'M12 3v18', 'M3 12h18'],
  globe: ['M12 3a9 9 0 1 1 0 18a9 9 0 1 1 0-18z', 'M3 12h18', 'M12 3c2.5 2.5 3.8 5.6 3.8 9s-1.3 6.5-3.8 9c-2.5-2.5-3.8-5.6-3.8-9S9.5 5.5 12 3z'],
  pen: ['M4 20h4L19 9l-4-4L4 16z', 'M13.5 6.5l4 4'],
  cake: ['M4 21h16', 'M5 21v-8h14v8', 'M5 15c2 1.5 4.5 1.5 7 0s5-1.5 7 0', 'M12 13V9', 'M12 6.5c-.8-.6-.8-1.8 0-2.5.8.7.8 1.9 0 2.5z'],
  // "I am" tiles in onboarding
  woman: ['M12 4a5 5 0 1 1 0 10a5 5 0 1 1 0-10z', 'M12 14v7', 'M9 18h6'],
  man: ['M10 9a5 5 0 1 1 0 10a5 5 0 1 1 0-10z', 'M14 10l6-6', 'M15 4h5v5'],
  nonbinary: ['M12 9a5 5 0 1 1 0 10a5 5 0 1 1 0-10z', 'M12 9V3', 'M9.5 4l5 3', 'M14.5 4l-5 3'],
  couple: ['M8.5 4.8a3.2 3.2 0 1 1 0 6.4a3.2 3.2 0 1 1 0-6.4z', 'M15.5 4.8a3.2 3.2 0 1 1 0 6.4a3.2 3.2 0 1 1 0-6.4z', 'M3 20c.6-3.4 2.8-5.5 5.5-5.5S13.4 16.6 14 20', 'M10 20c.6-3.4 2.8-5.5 5.5-5.5S20.4 16.6 21 20'],
  dots: [],
  search: ['M20 20l-3.5-3.5'],
  camera: ['M4 8h3l2-3h6l2 3h3v11H4z'],
  fingerprint: ['M12 11v4M8.5 9.5A4 4 0 0 1 16 11v2c0 2-.5 4-1.5 5.5M8 12c0 3-.5 5-1.5 6.5M12 3a8 8 0 0 0-8 8v1M20 11a8 8 0 0 0-3-6.2M12 7a4 4 0 0 0-4 4'],
};

export function Icon({ name, size = 22, color = '#F4EFEA', stroke = 1.8, fill = 'none' }) {
  const paths = PATHS[name] || [];
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {name === 'lock' && <Rect x={4} y={11} width={16} height={10} rx={2} stroke={color} strokeWidth={stroke} />}
      {name === 'eye' && <Circle cx={12} cy={12} r={3} stroke={color} strokeWidth={stroke} />}
      {name === 'clock' && <Circle cx={12} cy={13} r={8} stroke={color} strokeWidth={stroke} />}
      {name === 'search' && <Circle cx={11} cy={11} r={7} stroke={color} strokeWidth={stroke} />}
      {name === 'pin' && <Circle cx={12} cy={10} r={2.5} stroke={color} strokeWidth={stroke} />}
      {name === 'camera' && <Circle cx={12} cy={13} r={3.5} stroke={color} strokeWidth={stroke} />}
      {name === 'filter' && (
        <>
          <Circle cx={16} cy={7} r={2} stroke={color} strokeWidth={stroke} />
          <Circle cx={10} cy={17} r={2} stroke={color} strokeWidth={stroke} />
        </>
      )}
      {name === 'dots' && (
        <>
          <Circle cx={5} cy={12} r={1.8} fill={color} />
          <Circle cx={12} cy={12} r={1.8} fill={color} />
          <Circle cx={19} cy={12} r={1.8} fill={color} />
        </>
      )}
      {name === 'user' && (
        <>
          <Circle cx={12} cy={8} r={4} stroke={color} strokeWidth={stroke} />
          <Path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" stroke={color} strokeWidth={stroke} strokeLinecap="round" />
        </>
      )}
      {name === 'card' && <Rect x={5} y={3} width={14} height={18} rx={3.5} stroke={color} strokeWidth={stroke} />}
      {paths.map((d) => (
        <Path key={d} d={d} stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" fill={fill} />
      ))}
    </Svg>
  );
}

/** The verified badge: a filled blue circle with a check. */
export function Verified({ size = 20 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessibilityLabel="Live-verified">
      <Circle cx={12} cy={12} r={11} fill="#6FA8FF" />
      <Path d="M7.5 12.5l3 3 6-6.5" stroke="#06142E" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </Svg>
  );
}
