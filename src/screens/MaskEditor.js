// Mask your face, like a camera filter: the face is found on the phone and the mask is placed on it
// (eyes, tilt and size). Drag or pinch only to fine-tune, or when no face is found.
// The mask is burned into a new image on the phone, so the bare face is never uploaded.
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Dimensions, Image, PanResponder, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import Svg, { Circle, ClipPath, Defs, Ellipse, G, Image as SvgImage, LinearGradient as SvgLinear, Path, Pattern, RadialGradient, Rect, Stop } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { File, Paths } from 'expo-file-system';
import { C, F, GRAD } from '../theme';
import { Icon } from '../icons';
import { Screen, T, Toggle, success, tap } from '../ui';
import { MANUAL, VH, VW, findFace } from '../faces';
import { ART_BAND_Y, ART_BRIDGE_X, ART_EYE_Y, earsOf, rotatePlacement, scalePlacement } from '../faceFit';

// Everything is drawn in the design's 342 by 430 frame (see faces.js).
const OUT_W = 1080;
const OUT_H = Math.round((OUT_W * VH) / VW);

// The masks, drawn around the wearer's eyes: eye holes centred 44 units either side of the nose bridge (171, 228).
// A real face is about 2.4 eye-gaps wide and the top of the head about 1.7 eye-gaps above the eyes.

// Eye mask with soft almond eye openings, filled light grey so the eyes stay hidden.
const BODY = 'M72 194C98 196 136 188 171 205C206 188 244 196 270 194C266 234 246 264 212 265C193 266 182 255 171 248C160 255 149 266 130 265C96 264 76 234 72 194Z';
const HOLES = 'M100.5 228C103.5 215 145.5 211 153.5 225C149.5 239 105.5 242 100.5 228Z M241.5 228C238.5 215 196.5 211 188.5 225C192.5 239 236.5 242 241.5 228Z';
const EYES = `${BODY} ${HOLES}`;
// The band a headpiece sits on: follows the top of the head out to the hair at the sides (a shallow arch floated
// above the hair). Apex at y 95 (+16 → ART_BAND_Y).
const BAND = 'M70 168C84 112 128 95 171 95C214 95 258 112 272 168';
// The mask's edges on their own, for beads, studs and crystals along them.
const TOP_EDGE = 'M72 194C98 196 136 188 171 205C206 188 244 196 270 194';
const LOWER_EDGE = 'M72 194C76 234 96 264 130 265C149 266 160 255 171 248C182 255 193 266 212 265C246 264 266 234 270 194';
const HEART = 'M258 206c-2.5-6-11-5-10.5 1.8c.5 5 10.5 10.2 10.5 10.2s10-5.2 10.5-10.2c.5-6.8-8-7.8-10.5-1.8z';

// Gradients shared by every mask; each Svg that draws a mask includes these in its Defs.
function MaskDefs() {
  return (
    <>
      <SvgLinear id="satin" x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0" stopColor="#3A1828" />
        <Stop offset="0.55" stopColor="#14080F" />
        <Stop offset="1" stopColor="#070306" />
      </SvgLinear>
      <SvgLinear id="trimPink" x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0" stopColor="#FF7FB5" />
        <Stop offset="0.5" stopColor="#F0287A" />
        <Stop offset="1" stopColor="#B01E8E" />
      </SvgLinear>
      <SvgLinear id="velvetViolet" x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0" stopColor="#4B2A7A" />
        <Stop offset="1" stopColor="#170C2A" />
      </SvgLinear>
      <SvgLinear id="gold" x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0" stopColor="#FFE6A3" />
        <Stop offset="0.5" stopColor="#E8B64C" />
        <Stop offset="1" stopColor="#A8761E" />
      </SvgLinear>
      <SvgLinear id="earInner" x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0" stopColor="#FF9CC6" />
        <Stop offset="1" stopColor="#E0246F" />
      </SvgLinear>
      <SvgLinear id="feather" x1="0" y1="1" x2="1" y2="0">
        <Stop offset="0" stopColor="#7B3CFF" />
        <Stop offset="1" stopColor="#E3C8FF" />
      </SvgLinear>
      <SvgLinear id="lens" x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0" stopColor="#A9A3A8" />
        <Stop offset="0.45" stopColor="#C9C4C8" />
        <Stop offset="1" stopColor="#BDB8BC" />
      </SvgLinear>
      <SvgLinear id="redSatin" x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0" stopColor="#F0384E" />
        <Stop offset="0.5" stopColor="#B80F2A" />
        <Stop offset="1" stopColor="#5E0412" />
      </SvgLinear>
      <SvgLinear id="horn" x1="0" y1="1" x2="0.3" y2="0">
        <Stop offset="0" stopColor="#7A0616" />
        <Stop offset="0.6" stopColor="#D3172F" />
        <Stop offset="1" stopColor="#FF6B7D" />
      </SvgLinear>
      <SvgLinear id="latex" x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0" stopColor="#3A3A42" />
        <Stop offset="0.35" stopColor="#0B0B0E" />
        <Stop offset="1" stopColor="#020203" />
      </SvgLinear>
      <SvgLinear id="silver" x1="0" y1="0" x2="1" y2="1">
        <Stop offset="0" stopColor="#FFFFFF" />
        <Stop offset="0.5" stopColor="#C4C6CE" />
        <Stop offset="1" stopColor="#7C7F8A" />
      </SvgLinear>
      <SvgLinear id="pearl" x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0" stopColor="#FFFFFF" />
        <Stop offset="0.6" stopColor="#F1ECEF" />
        <Stop offset="1" stopColor="#D9D1D6" />
      </SvgLinear>
      <RadialGradient id="crystal" cx="35%" cy="30%" r="70%">
        <Stop offset="0" stopColor="#FFFFFF" />
        <Stop offset="0.5" stopColor="#E9E6FF" />
        <Stop offset="1" stopColor="#9890C0" />
      </RadialGradient>
      <Pattern id="lacePat" width={10} height={10} patternUnits="userSpaceOnUse" patternTransform="rotate(18)">
        <Circle cx={5} cy={5} r={3.3} fill="none" stroke="#000000" strokeWidth={1.4} />
        <Circle cx={0} cy={0} r={1.4} fill="#000000" />
        <Circle cx={10} cy={0} r={1.4} fill="#000000" />
        <Circle cx={0} cy={10} r={1.4} fill="#000000" />
        <Circle cx={10} cy={10} r={1.4} fill="#000000" />
      </Pattern>
      <ClipPath id="maskBody">
        <Path d={EYES} clipRule="evenodd" />
      </ClipPath>
      <ClipPath id="eyeOpenings">
        <Path d={HOLES} />
      </ClipPath>
      <ClipPath id="maskLeftHalf">
        <Rect x={-800} y={-800} width={971.6} height={2000} />
      </ClipPath>
      <ClipPath id="maskRightHalf">
        <Rect x={170.4} y={-800} width={1000} height={2000} />
      </ClipPath>
      <RadialGradient id="frost" cx="50%" cy="50%" r="50%">
        <Stop offset="0" stopColor="#2A2430" stopOpacity="0.98" />
        <Stop offset="0.8" stopColor="#2A2430" stopOpacity="0.95" />
        <Stop offset="1" stopColor="#2A2430" stopOpacity="0.75" />
      </RadialGradient>
    </>
  );
}

// Soft shadow under the mask so it sits on the skin instead of floating.
function Shadow({ d }) {
  return <Path d={d} fill="#000000" opacity={0.32} transform="translate(0 5)" fillRule="evenodd" />;
}

function EyeMask({ fill, trim, shine = 0.22 }) {
  return (
    <G>
      <Shadow d={EYES} />
      <Path d={EYES} fillRule="evenodd" fill={fill} />
      {/* trim around the outside only: a trim around the eyes looked like goggles */}
      <Path d={BODY} fill="none" stroke={trim} strokeWidth={3} strokeLinejoin="round" />
      {/* the eyes hidden behind light grey, with the mask's edge shading its top so it has depth */}
      <Path d={HOLES} fill="url(#lens)" />
      <G clipPath="url(#eyeOpenings)">
        <Path d={HOLES} fill="none" stroke="#000000" strokeWidth={6} opacity={0.22} transform="translate(0 2)" />
      </G>
      <Path d={HOLES} fill="none" stroke={trim} strokeWidth={1.1} opacity={0.55} />
      {/* satin shine along the top edge */}
      <Path d="M84 202C106 200 142 196 166 208M176 208C200 196 236 200 258 202" fill="none" stroke="#FFFFFF" strokeWidth={2} strokeLinecap="round" opacity={shine} />
    </G>
  );
}

function Lace({ color }) {
  return (
    <G fill="none" stroke={color} strokeWidth={1.3} opacity={0.75}>
      <Path d="M98 246q14 12 30 12M244 246q-14 12-30 12" />
      <Circle cx={104} cy={252} r={2.4} />
      <Circle cx={116} cy={258} r={2.4} />
      <Circle cx={238} cy={252} r={2.4} />
      <Circle cx={226} cy={258} r={2.4} />
      <Circle cx={171} cy={238} r={2} />
    </G>
  );
}

function Bunny({ part }) {
  return (
    <G>
      {part !== 'face' ? (
        <G transform="translate(0 16)">
          <G opacity={0.98}>
            <Path d="M112 104C96 64 98 6 120 -10C142 6 146 64 136 100Z" fill="#000000" opacity={0.25} transform="translate(2 4)" />
            <Path d="M112 104C96 64 98 6 120 -10C142 6 146 64 136 100Z" fill="url(#satin)" stroke="url(#trimPink)" strokeWidth={2.5} />
            <Path d="M116 94C108 64 110 20 120 6C130 20 132 64 128 92Z" fill="url(#earInner)" />
            <Path d="M206 100C196 64 200 6 222 -10C244 6 246 64 230 104Z" fill="#000000" opacity={0.25} transform="translate(2 4)" />
            <Path d="M206 100C196 64 200 6 222 -10C244 6 246 64 230 104Z" fill="url(#satin)" stroke="url(#trimPink)" strokeWidth={2.5} />
            <Path d="M214 92C210 64 212 20 222 6C232 20 234 64 226 94Z" fill="url(#earInner)" />
          </G>
          <Path d={BAND} fill="none" stroke="#120A10" strokeWidth={9} strokeLinecap="round" />
          <Path d={BAND} fill="none" stroke="url(#trimPink)" strokeWidth={2} strokeLinecap="round" opacity={0.9} />
        </G>
      ) : null}
      {part !== 'ears' ? (
        <G>
          <EyeMask fill="url(#satin)" trim="url(#trimPink)" />
          <Lace color="#FF7FB5" />
          {/* little heart at the temple */}
          <Path d="M258 210c-2.5-6-11-5-10.5 1.8c.5 5 10.5 10.2 10.5 10.2s10-5.2 10.5-10.2c.5-6.8-8-7.8-10.5-1.8z" fill="url(#trimPink)" />
        </G>
      ) : null}
    </G>
  );
}

function Masquerade() {
  return (
    <G>
      {/* feathers rising from the right temple */}
      <Path d="M250 206C262 160 286 118 312 96C304 140 286 180 258 214Z" fill="url(#feather)" opacity={0.95} />
      <Path d="M254 212C276 178 304 154 330 146C314 176 290 200 262 220Z" fill="url(#feather)" opacity={0.8} />
      <Path d="M250 204C252 160 262 120 276 92C282 130 274 172 258 210Z" fill="#C3A2FF" opacity={0.75} />
      <Path d="M258 214L300 120" stroke="#F4EFEA" strokeWidth={1} opacity={0.5} />
      <EyeMask fill="url(#velvetViolet)" trim="url(#gold)" shine={0.28} />
      <Path d="M100 240q16 18 40 20M242 240q-16 18-40 20" fill="none" stroke="url(#gold)" strokeWidth={1.8} opacity={0.9} />
      <Circle cx={171} cy={206} r={5.5} fill="url(#gold)" />
      <Circle cx={92} cy={222} r={3} fill="url(#gold)" />
      <Circle cx={250} cy={222} r={3} fill="url(#gold)" />
    </G>
  );
}

function Kitten({ part }) {
  return (
    <G>
      {part !== 'face' ? (
        <G transform="translate(0 16)">
          <Path d="M100 118L112 36L156 96Z" fill="#000000" opacity={0.25} transform="translate(2 4)" />
          <Path d="M100 118L112 36L156 96Z" fill="url(#satin)" stroke="url(#trimPink)" strokeWidth={2.5} strokeLinejoin="round" />
          <Path d="M112 104L118 60L142 94Z" fill="url(#earInner)" />
          <Path d="M242 118L230 36L186 96Z" fill="#000000" opacity={0.25} transform="translate(2 4)" />
          <Path d="M242 118L230 36L186 96Z" fill="url(#satin)" stroke="url(#trimPink)" strokeWidth={2.5} strokeLinejoin="round" />
          <Path d="M230 104L224 60L200 94Z" fill="url(#earInner)" />
          <Path d={BAND} fill="none" stroke="#120A10" strokeWidth={9} strokeLinecap="round" />
          <Path d={BAND} fill="none" stroke="url(#trimPink)" strokeWidth={2} strokeLinecap="round" opacity={0.9} />
        </G>
      ) : null}
      {part !== 'ears' ? (
        <G>
          <EyeMask fill="url(#satin)" trim="url(#trimPink)" />
          {/* whiskers on the cheeks */}
          <G stroke="#FF9CC6" strokeWidth={1.8} strokeLinecap="round" opacity={0.75}>
            <Path d="M104 270l-34-6M106 280l-34 4M238 270l34-6M236 280l34 4" />
          </G>
        </G>
      ) : null}
    </G>
  );
}

// A headband in a given colour, for the headpieces below.
function Band({ color }) {
  return (
    <>
      <Path d={BAND} fill="none" stroke="#120A10" strokeWidth={9} strokeLinecap="round" />
      <Path d={BAND} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" opacity={0.9} />
    </>
  );
}

// The light grey eyes on their own, for masks that don't use EyeMask.
function GreyEyes({ rim }) {
  return (
    <>
      <Path d={HOLES} fill="url(#lens)" />
      <G clipPath="url(#eyeOpenings)">
        <Path d={HOLES} fill="none" stroke="#000000" strokeWidth={6} opacity={0.22} transform="translate(0 2)" />
      </G>
      <Path d={HOLES} fill="none" stroke={rim} strokeWidth={2.4} />
    </>
  );
}

// Dots along a path (beads, studs, rhinestones): zero-length dashes with round caps.
function Dots({ d, color, size, gap, ...rest }) {
  return <Path d={d} fill="none" stroke={color} strokeWidth={size} strokeDasharray={`0 ${gap}`} strokeLinecap="round" {...rest} />;
}

// Red satin with horns on a headband.
function Devil({ part }) {
  const horns = 'M126 104C112 86 108 62 120 40C124 62 136 80 152 94Z M216 104C230 86 234 62 222 40C218 62 206 80 190 94Z';
  return (
    <G>
      {part !== 'face' ? (
        <G transform="translate(0 16)">
          <Path d={horns} fill="#000000" opacity={0.25} transform="translate(2 4)" />
          <Path d={horns} fill="url(#horn)" stroke="#3A0008" strokeWidth={2} strokeLinejoin="round" />
          <Path d="M122 76C122 64 124 54 120 46M220 76C220 64 218 54 222 46" fill="none" stroke="#FFFFFF" strokeWidth={1.6} opacity={0.35} />
          <Band color="#D3172F" />
        </G>
      ) : null}
      {part !== 'ears' ? (
        <G>
          <EyeMask fill="url(#redSatin)" trim="#2A0006" shine={0.3} />
          <Path d="M171 214l-5 -9h10z" fill="#2A0006" />
        </G>
      ) : null}
    </G>
  );
}

// See-through black lace with a beaded edge and a little red heart.
function BlackLace() {
  return (
    <G>
      <Shadow d={EYES} />
      <Path d={EYES} fillRule="evenodd" fill="#0A0709" opacity={0.55} />
      <G clipPath="url(#maskBody)">
        <Rect x={60} y={180} width={230} height={100} fill="url(#lacePat)" />
        <Path d={HOLES} fill="none" stroke="#0A0709" strokeWidth={12} />
      </G>
      <GreyEyes rim="#0A0709" />
      <Dots d={LOWER_EDGE} color="#0A0709" size={6.5} gap={8} />
      <Path d={TOP_EDGE} fill="none" stroke="#0A0709" strokeWidth={3} />
      {/* an eyelash flick between the eyes */}
      <Path d="M171 205c-6-10-14-14-24-15M171 205c6-10 14-14 24-15" fill="none" stroke="#0A0709" strokeWidth={2} />
      <Path d={HEART} fill="#D3172F" />
    </G>
  );
}

// Shiny black latex with silver studs and a ring between the eyes.
function Latex() {
  return (
    <G>
      <EyeMask fill="url(#latex)" trim="#55565E" shine={0.55} />
      <Path d="M80 200C104 196 140 194 166 210" fill="none" stroke="#FFFFFF" strokeWidth={4} strokeLinecap="round" opacity={0.18} />
      <Dots d={LOWER_EDGE} color="url(#silver)" size={5} gap={11} transform="translate(0 -6)" />
      <Circle cx={171} cy={214} r={7} fill="none" stroke="url(#silver)" strokeWidth={2.6} />
      <Circle cx={80} cy={200} r={3.6} fill="url(#silver)" />
      <Circle cx={262} cy={200} r={3.6} fill="url(#silver)" />
    </G>
  );
}

// Red satin with a red bow on the headband: you're the present.
function Bow({ part }) {
  const loops = 'M0 0C-12 -22 -44 -30 -48 -10C-52 8 -22 10 0 0Z M0 0C12 -22 44 -30 48 -10C52 8 22 10 0 0Z';
  return (
    <G>
      {part !== 'face' ? (
        <G transform="translate(0 16)">
          <Band color="#D3172F" />
          <G transform="translate(205 98) rotate(14)">
            <Path d={loops} fill="#000000" opacity={0.25} transform="translate(2 4)" />
            <Path d={loops} fill="url(#redSatin)" stroke="#5E0412" strokeWidth={1.5} />
            <Path d="M-3 2C-10 14 -16 26 -22 34L-12 32L-8 40C-4 28 0 14 0 4Z M3 2C10 14 16 26 22 34L12 32L8 40C4 28 0 14 0 4Z" fill="url(#redSatin)" />
            <Ellipse cx={0} cy={-1} rx={7} ry={8} fill="#B80F2A" stroke="#5E0412" strokeWidth={1.5} />
            <Path d="M-40 -14C-32 -20 -20 -18 -10 -8M40 -14C32 -20 20 -18 10 -8" fill="none" stroke="#FFFFFF" strokeWidth={1.5} opacity={0.4} />
          </G>
        </G>
      ) : null}
      {part !== 'ears' ? <EyeMask fill="url(#redSatin)" trim="#5E0412" shine={0.32} /> : null}
    </G>
  );
}

// White pearl with gold trim and a gold halo (the Devil's other half).
function Angel({ part }) {
  return (
    <G>
      {part !== 'face' ? (
        <G transform="translate(0 16)">
          <Ellipse cx={171} cy={62} rx={62} ry={13} fill="none" stroke="#FFE6A3" strokeWidth={10} opacity={0.25} />
          <Ellipse cx={171} cy={62} rx={62} ry={13} fill="none" stroke="url(#gold)" strokeWidth={5} />
          <Ellipse cx={171} cy={60} rx={58} ry={10} fill="none" stroke="#FFFFFF" strokeWidth={1.2} opacity={0.6} />
        </G>
      ) : null}
      {part !== 'ears' ? (
        <G>
          <EyeMask fill="url(#pearl)" trim="url(#gold)" shine={0.5} />
          <Path d="M100 240q16 18 40 20M242 240q-16 18-40 20" fill="none" stroke="url(#gold)" strokeWidth={1.6} opacity={0.9} />
          <Circle cx={171} cy={207} r={4.5} fill="url(#crystal)" />
        </G>
      ) : null}
    </G>
  );
}

// Dark plum satin with rhinestones along the top, around the eyes and in a little chain under each eye.
function Crystal() {
  return (
    <G>
      <EyeMask fill="url(#satin)" trim="#2B2230" shine={0.35} />
      <Dots d={TOP_EDGE} color="url(#crystal)" size={4} gap={7.2} />
      <Dots d={HOLES} color="url(#crystal)" size={2.6} gap={5.4} />
      <Dots d="M96 246C110 268 130 276 150 270M246 246C232 268 212 276 192 270" color="url(#crystal)" size={2.6} gap={6} />
      <Dots d="M124 262v14M218 262v14" color="url(#crystal)" size={2.6} gap={5} />
      <Circle cx={124} cy={281} r={3.6} fill="url(#crystal)" />
      <Circle cx={218} cy={281} r={3.6} fill="url(#crystal)" />
      <Circle cx={171} cy={206} r={5} fill="url(#crystal)" />
    </G>
  );
}

// Covers the whole face with a frosted oval.
function Frost() {
  return (
    <G>
      <Ellipse cx={171} cy={258} rx={92} ry={128} fill="url(#frost)" />
      <Ellipse cx={171} cy={258} rx={92} ry={128} fill="none" stroke="#6FA8FF" strokeWidth={1.5} opacity={0.5} />
    </G>
  );
}

// group: the picker's sections, in this order.
const MASKS = [
  { id: 'none', label: 'None', group: 'none' },
  { id: 'bunny', label: 'Bunny', Comp: Bunny, ears: true, group: 'Cute' },
  { id: 'kitten', label: 'Kitten', Comp: Kitten, ears: true, group: 'Cute' },
  { id: 'devil', label: 'Devil', Comp: Devil, ears: true, group: 'Sexy' },
  { id: 'angel', label: 'Angel', Comp: Angel, ears: true, group: 'Sexy' },
  { id: 'lace', label: 'Lace', Comp: BlackLace, group: 'Sexy' },
  { id: 'latex', label: 'Latex', Comp: Latex, group: 'Sexy' },
  { id: 'bow', label: 'Bow', Comp: Bow, ears: true, group: 'Sexy' },
  { id: 'masq', label: 'Masquerade', Comp: Masquerade, group: 'Glam' },
  { id: 'crystal', label: 'Crystal', Comp: Crystal, group: 'Glam' },
  { id: 'frost', label: 'Frost', Comp: Frost, group: 'Hide' },
];
const GROUPS = ['none', 'Cute', 'Sexy', 'Glam', 'Hide'];

// A mask on its own for the picker: the whole headpiece when it has one, else cropped close so it reads large.
function Thumb({ id, size = 62 }) {
  if (id === 'none')
    return (
      <Svg width={26} height={26} viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth={1.8} strokeLinecap="round">
        <Circle cx={12} cy={12} r={8} />
        <Path d="M6.5 17.5l11-11" />
      </Svg>
    );
  const m = MASKS.find((x) => x.id === id);
  const M = m.Comp;
  const box = m.ears ? '46 -14 250 290' : id === 'frost' ? '71 122 200 274' : id === 'masq' ? '64 82 270 270' : '62 128 218 218';
  return (
    <Svg width={size} height={size} viewBox={box}>
      <Defs>
        <MaskDefs />
      </Defs>
      <M />
    </Svg>
  );
}

// One mask in the picker: a card with the mask large, its name under it; the chosen one gets the gradient edge.
function MaskCard({ m, on, onPress }) {
  const inner = (
    <View style={[styles.card, on && styles.cardOn]}>
      <View style={styles.cardArt}>
        <Thumb id={m.id} />
      </View>
      <T v="small" c={on ? C.ink : C.muted} numberOfLines={1} adjustsFontSizeToFit style={{ fontFamily: on ? F.semi : F.medium, fontSize: 12 }}>
        {m.label}
      </T>
    </View>
  );
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={`${m.label} mask`} onPress={onPress} style={({ pressed }) => pressed && { transform: [{ scale: 0.96 }] }}>
      {on ? (
        <LinearGradient colors={GRAD} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.cardRing}>
          {inner}
          <View style={styles.cardTick}>
            <Icon name="check" size={10} color="#FFFFFF" stroke={3.4} />
          </View>
        </LinearGradient>
      ) : (
        <View style={styles.cardRing}>{inner}</View>
      )}
    </Pressable>
  );
}

const dist = (t) => Math.hypot(t[0].pageX - t[1].pageX, t[0].pageY - t[1].pageY);
const angle = (t) => (Math.atan2(t[1].pageY - t[0].pageY, t[1].pageX - t[0].pageX) * 180) / Math.PI;

// What the face finder saw: eyes (blue), face outline and box (pink), nose bridge (white).
function FacePoints({ parts }) {
  if (!parts) return null;
  const { eyeL, eyeR, oval = [], box, bridge = [] } = parts;
  return (
    <G>
      {box ? <Rect x={box.x} y={box.y} width={box.w} height={box.h} fill="none" stroke="#FF6FA8" strokeWidth={1} strokeDasharray="4 3" opacity={0.8} /> : null}
      {oval.map((p, i) => (
        <Circle key={`o${i}`} cx={p.x} cy={p.y} r={1.6} fill="#FF6FA8" />
      ))}
      {bridge.map((p, i) => (
        <Circle key={`b${i}`} cx={p.x} cy={p.y} r={2} fill="#FFFFFF" />
      ))}
      {[eyeL, eyeR].filter(Boolean).map((p, i) => (
        <Circle key={`e${i}`} cx={p.x} cy={p.y} r={4} fill="none" stroke="#6FA8FF" strokeWidth={2} />
      ))}
    </G>
  );
}
// Each half of the mask gets its own width (sl, sr), so it follows a turned head. See faceFit.js.
const halfTransform = (p, sx) => `translate(${p.x} ${p.y}) rotate(${p.r || 0}) scale(${sx} ${p.sy}) translate(${-ART_BRIDGE_X} ${-ART_EYE_Y})`;

// Ears and headband sit on top of the head: one even scale, the band's apex put at place.top above the eyes.
const earsTransform = (p) => {
  const e = earsOf(p);
  return `translate(${p.x + e.ex} ${p.y + e.ey}) rotate(${p.r || 0}) scale(${e.es}) translate(${-ART_BRIDGE_X} ${-ART_BAND_Y})`;
};

function Fitted({ place, Comp }) {
  const ears = MASKS.some((m) => m.Comp === Comp && m.ears);
  const part = ears ? 'face' : undefined;
  return (
    <G>
      {ears ? (
        <G transform={earsTransform(place)}>
          <Comp part="ears" />
        </G>
      ) : null}
      <G transform={halfTransform(place, place.sl)}>
        <G clipPath="url(#maskLeftHalf)">
          <Comp part={part} />
        </G>
      </G>
      <G transform={halfTransform(place, place.sr)}>
        <G clipPath="url(#maskRightHalf)">
          <Comp part={part} />
        </G>
      </G>
    </G>
  );
}

// Draws one photo with its mask, full size and off screen, then hands back the burned-in PNG.
function Burner({ uri, place, mask, onDone }) {
  const ref = useRef(null);
  const sent = useRef(false);
  const M = MASKS.find((m) => m.id === mask)?.Comp;
  const shoot = () => {
    if (sent.current || !ref.current) return;
    sent.current = true;
    // The Svg itself is laid out at the output size, so the whole photo fills the PNG.
    ref.current.toDataURL((b64) => onDone(b64));
  };
  useEffect(() => {
    const t = setTimeout(shoot, 1500); // in case the image's load event never arrives
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <View style={styles.offscreen} pointerEvents="none">
      <Svg ref={ref} width={OUT_W} height={OUT_H} viewBox={`0 0 ${VW} ${VH}`}>
        <Defs>
          <MaskDefs />
        </Defs>
        <SvgImage href={{ uri }} x={0} y={0} width={VW} height={VH} preserveAspectRatio="xMidYMid slice" onLoad={() => setTimeout(shoot, 120)} />
        {M ? <Fitted place={place} Comp={M} /> : null}
      </Svg>
    </View>
  );
}

function saveB64(b64) {
  const f = new File(Paths.cache, `masked-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.png`);
  f.create();
  f.write(b64, { encoding: 'base64' });
  return f.uri;
}

/**
 * photos: the original photo uris; start: which one to open on.
 * onDone(results): results is a list of { index, uri, mask } for every photo that got a mask.
 */
export function MaskEditor({ photos, start = 0, onCancel, onDone }) {
  const { width } = useWindowDimensions();
  const pw = width - 48;
  const ph = (pw * VH) / VW;
  const [idx, setIdx] = useState(start);
  const [mask, setMask] = useState('bunny');
  const [places, setPlaces] = useState({}); // index → { x, y, s, r, auto }
  const [autoPlaces, setAutoPlaces] = useState({}); // index → what the face finder placed, for "Fit again"
  const [showPoints, setShowPoints] = useState(false);
  const [found, setFound] = useState({}); // index → 'finding' | 'found' | 'none'
  const [applyAll, setApplyAll] = useState(photos.length > 1);
  const [burning, setBurning] = useState(null); // { queue: [index...], done: [{index, uri}] }
  // The gesture handler reads the open photo and its placement from here.
  const [live] = useState(() => ({ idx: start, places: {} }));
  useEffect(() => {
    // A plain mutable holder, written after render, read only by the gesture callbacks.
    // eslint-disable-next-line react-hooks/immutability
    live.idx = idx;
    live.places = places;
  }, [live, idx, places]);

  // Find the face in every photo, the open one first.
  useEffect(() => {
    let alive = true;
    const order = [start, ...photos.map((_, i) => i).filter((i) => i !== start)];
    (async () => {
      for (const i of order) {
        if (!alive) return;
        setFound((f) => ({ ...f, [i]: 'finding' }));
        const place = await findFace(photos[i]);
        if (!alive) return;
        setFound((f) => ({ ...f, [i]: place ? 'found' : 'none' }));
        setPlaces((p) => (p[i] ? p : { ...p, [i]: place || MANUAL }));
        if (place) setAutoPlaces((a) => ({ ...a, [i]: place }));
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pos = places[idx] || MANUAL;

  // Fine-tuning: drag to move, pinch to resize.
  const [pan] = useState(() => {
    let from = null;
    const set = (next) => setPlaces((p) => ({ ...p, [live.idx]: next }));
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        from = { ...(live.places[live.idx] || MANUAL), pinch: null };
      },
      onPanResponderMove: (e, g) => {
        const t = e.nativeEvent.touches;
        const k = VW / (Dimensions.get('window').width - 48);
        if (t.length >= 2) {
          // Two fingers: pinch to resize, twist to turn.
          if (!from.pinch) from.pinch = { d: dist(t), a: angle(t) };
          const zoom = Math.max(0.3, Math.min(3, dist(t) / from.pinch.d));
          let turn = angle(t) - from.pinch.a;
          if (turn > 180) turn -= 360;
          if (turn < -180) turn += 360;
          set({ ...rotatePlacement(scalePlacement(from, zoom), turn), pinch: undefined, moved: true });
        } else if (!from.pinch) {
          set({
            ...from,
            pinch: undefined,
            x: from.x + g.dx * k,
            y: from.y + g.dy * k,
            moved: true,
          });
        }
      },
    });
  });

  const M = MASKS.find((m) => m.id === mask)?.Comp;
  const status = found[idx];

  const done = () => {
    if (!M) {
      onDone([]);
      return;
    }
    // This photo always; with "all photos" on, also every other photo where a face was found.
    const queue = [idx, ...(applyAll ? photos.map((_, i) => i).filter((i) => i !== idx && found[i] === 'found') : [])];
    setBurning({ queue, done: [] });
  };

  const onBurned = (b64) => {
    const [index, ...rest] = burning.queue;
    let uri = null;
    try {
      uri = saveB64(b64);
    } catch {
      uri = null;
    }
    const doneList = uri ? [...burning.done, { index, uri, mask }] : burning.done;
    if (rest.length) setBurning({ queue: rest, done: doneList });
    else {
      success();
      setBurning(null);
      onDone(doneList);
    }
  };

  const busy = !!burning;
  const skipped = applyAll ? photos.filter((_, i) => i !== idx && found[i] === 'none').length : 0;

  return (
    <Screen>
      <View style={styles.head}>
        <Pressable accessibilityRole="button" onPress={onCancel} hitSlop={10} disabled={busy}>
          <T c={C.muted} style={{ fontFamily: F.medium }}>
            Cancel
          </T>
        </Pressable>
        <T style={{ fontFamily: F.semi }}>Mask your face</T>
        <Pressable accessibilityRole="button" onPress={done} disabled={busy} hitSlop={10}>
          {busy ? (
            <ActivityIndicator color={C.pink} />
          ) : (
            <T c="#FF7FB5" style={{ fontFamily: F.semi }}>
              Done
            </T>
          )}
        </Pressable>
      </View>

      <View style={[styles.stage, { width: pw, height: ph }]} {...pan.panHandlers}>
        <Svg width={pw} height={ph} viewBox={`0 0 ${VW} ${VH}`}>
          <Defs>
            <MaskDefs />
          </Defs>
          <SvgImage href={{ uri: photos[idx] }} x={0} y={0} width={VW} height={VH} preserveAspectRatio="xMidYMid slice" />
          {M && status !== 'finding' && status ? <Fitted place={pos} Comp={M} /> : null}
          {showPoints ? <FacePoints parts={(autoPlaces[idx] || {}).parts} /> : null}
        </Svg>
        <View style={[styles.pill, { left: 12, top: 12 }]} pointerEvents="none">
          {status === 'found' ? <View style={[styles.dot, { backgroundColor: '#6FA8FF' }]} /> : null}
          {status === 'finding' || !status ? <ActivityIndicator size="small" color="#6FA8FF" /> : null}
          <T v="small" c={status === 'none' ? '#FFD27A' : '#6FA8FF'} style={{ fontFamily: F.semi }}>
            {status === 'found' ? 'Face found · mask on' : status === 'none' ? 'No face found · drag it into place' : 'Finding your face…'}
          </T>
        </View>
        {status && status !== 'finding' ? (
          <View style={[styles.pill, { right: 12, bottom: 12 }]} pointerEvents="none">
            <T v="small">{status === 'found' ? 'Drag, pinch or twist to fine-tune' : 'Drag, pinch or twist'}</T>
          </View>
        ) : null}
      </View>

      {status && status !== 'finding' ? (
        <View style={styles.tools}>
          {autoPlaces[idx] ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                tap();
                setShowPoints((v) => !v);
              }}
              hitSlop={8}
              style={styles.tool}
            >
              <Icon name={showPoints ? 'eyeOff' : 'eye'} size={15} color={C.muted} />
              <T v="small" c={C.muted}>
                {showPoints ? 'Hide face points' : 'Show face points'}
              </T>
            </Pressable>
          ) : (
            <View />
          )}
          {autoPlaces[idx] && pos.moved ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                tap();
                setPlaces((p) => ({ ...p, [idx]: autoPlaces[idx] }));
              }}
              hitSlop={8}
              style={styles.tool}
            >
              <Icon name="spark" size={15} color={C.pinkL} />
              <T v="small" c={C.pinkL} style={{ fontFamily: F.semi }}>
                Fit again
              </T>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {photos.length > 1 ? (
        <View style={styles.thumbs}>
          {photos.map((u, i) => (
            <Pressable key={u} accessibilityRole="button" accessibilityLabel={`Photo ${i + 1}`} accessibilityState={{ selected: i === idx }} onPress={() => setIdx(i)} disabled={busy}>
              <View style={[styles.thumb, i === idx && { borderColor: C.pink }]}>
                <Image source={{ uri: u }} style={StyleSheet.absoluteFill} />
                {found[i] === 'found' ? (
                  <View style={styles.thumbTick}>
                    <Icon name="check" size={9} color="#FFFFFF" stroke={3.4} />
                  </View>
                ) : null}
              </View>
            </Pressable>
          ))}
        </View>
      ) : null}

      {/* The masks in sections (Cute, Sexy, Glam, Hide), scrolling sideways; the fade at the edge says there's more. */}
      <View style={styles.picker}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pickerRow}>
          {GROUPS.map((g) => (
            <View key={g} style={g === 'none' ? null : styles.section}>
              <T v="small" c={g === 'none' ? 'transparent' : C.faint} style={styles.sectionLabel}>
                {g === 'none' ? ' ' : g.toUpperCase()}
              </T>
              <View style={styles.sectionCards}>
                {MASKS.filter((m) => m.group === g).map((m) => (
                  <MaskCard
                    key={m.id}
                    m={m}
                    on={mask === m.id}
                    onPress={() => {
                      tap();
                      setMask(m.id);
                    }}
                  />
                ))}
              </View>
            </View>
          ))}
        </ScrollView>
        <LinearGradient colors={['rgba(14,12,16,0)', C.bg]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.pickerFade} pointerEvents="none" />
      </View>

      {photos.length > 1 ? (
        <View style={styles.applyCard}>
          <View style={{ flex: 1 }}>
            <T style={{ fontFamily: F.medium }}>Apply to all my photos</T>
            <T v="small" c={C.muted} style={{ marginTop: 2 }}>
              {skipped ? `${skipped} without a clear face will stay as they are` : 'Placed on each face automatically'}
            </T>
          </View>
          <Toggle value={applyAll} onChange={setApplyAll} label="Apply mask to all my photos" />
        </View>
      ) : null}

      <View style={{ flex: 1 }} />
      <View
        style={{
          flexDirection: 'row',
          gap: 8,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon name="lock" size={16} color="#6FA8FF" />
        <T v="small" c={C.safeInk}>
          Added on your phone. Your bare face never leaves it.
        </T>
      </View>

      {burning ? <Burner key={burning.queue[0]} uri={photos[burning.queue[0]]} place={places[burning.queue[0]] || MANUAL} mask={mask} onDone={onBurned} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stage: {
    marginTop: 8,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: C.surf2,
    alignSelf: 'center',
  },
  pill: {
    position: 'absolute',
    minHeight: 28,
    paddingHorizontal: 10,
    borderRadius: 14,
    backgroundColor: 'rgba(14,12,16,0.75)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: { width: 7, height: 7, borderRadius: 4 },
  tools: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingHorizontal: 4 },
  tool: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4 },
  thumbs: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    justifyContent: 'center',
  },
  thumb: {
    width: 40,
    height: 50,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: C.surf2,
  },
  thumbTick: {
    position: 'absolute',
    right: 2,
    bottom: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#3B7BFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  picker: { marginTop: 14, marginHorizontal: -24 },
  pickerRow: { paddingHorizontal: 24, paddingRight: 48, gap: 14 },
  pickerFade: { position: 'absolute', right: 0, top: 0, bottom: 0, width: 36 },
  section: { borderLeftWidth: 1, borderLeftColor: C.line, paddingLeft: 14 },
  sectionLabel: { fontFamily: F.semi, fontSize: 10, letterSpacing: 1.2, marginBottom: 6, marginLeft: 2 },
  sectionCards: { flexDirection: 'row', gap: 8 },
  cardRing: { borderRadius: 18, padding: 2 },
  card: {
    width: 76,
    height: 96,
    borderRadius: 16,
    backgroundColor: C.surf2,
    borderWidth: 1,
    borderColor: C.line,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingBottom: 6,
  },
  cardOn: { backgroundColor: '#221A26', borderColor: 'transparent' },
  cardArt: { height: 64, alignItems: 'center', justifyContent: 'center' },
  cardTick: {
    position: 'absolute',
    right: -3,
    top: -3,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: C.pink,
    borderWidth: 2,
    borderColor: C.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 16,
    padding: 14,
    backgroundColor: C.surf,
    borderRadius: 16,
  },
  offscreen: {
    position: 'absolute',
    left: -(OUT_W + 1000),
    top: 0,
    width: OUT_W,
    height: OUT_H,
  },
});
