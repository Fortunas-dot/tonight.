// Builds the Tonight brand film from the eight Flow clips.
// usage: node build.mjs <ffmpeg.exe>
import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';

const FF = process.argv[2];
const ROOT = path.resolve(import.meta.dirname, '..');
const CLIPS = path.join(ROOT, 'ad-clips');
const WORK = path.join(ROOT, 'ad-work', 'parts');
const ICON = path.resolve(ROOT, '..', 'icon.png');
mkdirSync(WORK, { recursive: true });

const W = 720, H = 1280, FPS = 24, BG = '0x0E0C10';
const SUB_FONT = 'C\\:/Windows/Fonts/segoeuib.ttf';
const CARD_FONT = 'C\\:/Windows/Fonts/ariblk.ttf';
const CLIP_LEN = 4.6;

const run = (args) => execFileSync(FF, ['-v', 'error', '-y', ...args], { stdio: 'inherit' });
const esc = (p) => p.replace(/\\/g, '/').replace(/:/g, '\\:');
let n = 0;
const txt = (s) => { const f = path.join(WORK, `t${n++}.txt`); writeFileSync(f, s); return esc(f); };

// Lines of text centred horizontally, stacked from y0.
function lines(list, { font, size, color, y0, gap, border = 0 }) {
  return list.map((l, i) =>
    `drawtext=fontfile='${font}':textfile='${txt(l)}':fontsize=${size}:fontcolor=${color}` +
    `:x=(w-text_w)/2:y=${y0}+${i}*${gap}` +
    (border ? `:borderw=${border}:bordercolor=black@0.85` : '') +
    `:shadowcolor=black@0.6:shadowx=0:shadowy=2`
  ).join(',');
}

const shots = [
  ['01-mask-heads', ["we've been wanting to make this", 'for a while']],
  ['02-phone', ['for people who already', 'know what they want']],
  ['03-dancers', ['no bots. no fakes. no games.']],
  ['CARD', ['REAL FACES.', 'BEHIND', 'A MASK.']],
  ['04-disco-ball', ['everyone here is verified.', 'everyone here is discreet.']],
  ['05-city', ['free tonight?', 'so is someone nearby']],
  ['CARD', ['SAY YES.', 'SAY MAYBE.', 'SAY NO.']],
  ['06-eye', ['nothing shows until', 'you both say yes']],
  ['07-bar-door', ['less chatting. more plans.']],
  ['08-mask-grid', ['tonight.']],
  ['END'],
];

const parts = [];
// Voiceover lengths (seconds) of vo/NN.mp3, one per part.
const VO = [2.54, 3.17, 4.61, 3.58, 4.61, 3.50, 3.94, 2.90, 3.17, 1.87, 2.78];
const BED = path.join(CLIPS, '03-dancers.mp4'); // music under the cards
const VO_DELAY = 0.25;
shots.forEach(([name, text], i) => {
  const out = path.join(WORK, `${String(i).padStart(2, '0')}.mp4`);
  const vo = path.join(ROOT, 'ad-work', 'vo', `${String(i).padStart(2, '0')}.mp3`);
  const isClip = name !== 'CARD' && name !== 'END';
  const base = name === 'CARD' ? 1.6 : name === 'END' ? 3.6 : CLIP_LEN;
  const d = Math.min(7.6, Math.max(base, VO[i] + VO_DELAY + 0.2));
  const bedIn = ['-ss', '0.15', '-t', String(d), '-i', isClip ? path.join(CLIPS, `${name}.mp4`) : BED];
  // inputs: 0 = picture source, 1 = bed audio, 2 = voice (+ 3 = logo on END)
  const audio =
    `[1:a]aresample=48000,volume=0.28,afade=in:st=0:d=0.08,afade=out:st=${(d - 0.15).toFixed(2)}:d=0.15[bed];` +
    `[2:a]aresample=48000,adelay=${VO_DELAY * 1000}|${VO_DELAY * 1000},volume=1.6,` +
    `aecho=0.8:0.6:40:0.12[vo];[bed][vo]amix=inputs=2:normalize=0:duration=first,apad,atrim=0:${d}[a]`;
  let video, pic;
  if (name === 'CARD') {
    pic = ['-f', 'lavfi', '-i', `color=c=${BG}:s=${W}x${H}:r=${FPS}:d=${d}`];
    video = `[0:v]` + lines(text, { font: CARD_FONT, size: 78, color: 'white', y0: `(h-${text.length}*100)/2`, gap: 100 }) +
      `,fade=in:st=0:d=0.12[v]`;
  } else if (name === 'END') {
    pic = ['-f', 'lavfi', '-i', `color=c=${BG}:s=${W}x${H}:r=${FPS}:d=${d}`];
    video =
      `[3:v]crop=iw*0.72:ih*0.72,scale=380:380,format=rgba,fade=in:st=0:d=0.6:alpha=1[logo];` +
      `[0:v][logo]overlay=(W-w)/2:330,` +
      lines(['TAKE THE VOW.', 'MEET TONIGHT.'], { font: CARD_FONT, size: 64, color: 'white', y0: 800, gap: 84 }) +
      `,fade=out:st=${(d - 0.5).toFixed(2)}:d=0.5[v]`;
  } else {
    pic = ['-ss', '0.15', '-t', String(d), '-i', path.join(CLIPS, `${name}.mp4`)];
    video = `[0:v]scale=${W}:${H},fps=${FPS},` +
      lines(text, { font: SUB_FONT, size: 40, color: '0xFF4D94', y0: H - 300, gap: 54, border: 3 }) + `[v]`;
  }
  const extra = name === 'END' ? ['-loop', '1', '-t', String(d), '-i', ICON] : [];
  run([...pic, ...bedIn, '-i', vo, ...extra, '-filter_complex', `${video};${audio}`,
    '-map', '[v]', '-map', '[a]', '-t', String(d), '-ac', '2',
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', '-c:a', 'aac', out]);
  parts.push(out);
  console.log('built', path.basename(out), name, d.toFixed(2) + 's');
});

const inputs = parts.flatMap((p) => ['-i', p]);
const fc = parts.map((_, i) => `[${i}:v][${i}:a]`).join('') + `concat=n=${parts.length}:v=1:a=1[v][a0];[a0]loudnorm=I=-14:TP=-1.5:LRA=11,aresample=48000[a]`;
const final = path.join(ROOT, 'tonight-ad.mp4');
run([...inputs, '-filter_complex', fc, '-map', '[v]', '-map', '[a]',
  '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', '-preset', 'slow', '-c:a', 'aac', '-b:a', '192k',
  '-movflags', '+faststart', final]);
console.log('done', final);
