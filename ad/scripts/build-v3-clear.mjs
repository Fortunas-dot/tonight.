// "Clear" cut of the Tonight brand film: the artsy look of v2, plus real app screens and a
// voiceover that says what the app does.
// usage (from the ad folder): npm run build:clear   -> out/tonight-ad-v3-clear.mp4
// Voice lines: scripts/lines-v3-clear.txt -> npm run vo -- scripts/lines-v3-clear.txt vo-v3-clear
// After changing the voice, paste the printed lengths into VOLEN below.
import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import ffmpeg from 'ffmpeg-static';

const ROOT = path.resolve(import.meta.dirname, '..');
const CLIPS = path.join(ROOT, 'clips');
const SCREENS = path.resolve(ROOT, '..', 'store', 'screenshots', 'iphone-6.9');
const WORK = path.join(ROOT, 'parts-v3');
const VO = path.join(ROOT, 'vo-v3-clear');
const ICON = path.resolve(ROOT, '..', 'assets', 'icon.png');
const OUT = path.join(ROOT, 'out', 'tonight-ad-v3-clear.mp4');
mkdirSync(WORK, { recursive: true });

const W = 720, H = 1280, FPS = 24, BG = '0x0E0C10';
const SUB_FONT = 'C\\:/Windows/Fonts/consolab.ttf';
const CARD_FONT = 'C\\:/Windows/Fonts/ariblk.ttf';
const run = (args) => execFileSync(ffmpeg, ['-nostdin', '-v', 'error', '-y', ...args], { stdio: 'inherit' });
const esc = (p) => p.replace(/\\/g, '/').replace(/:/g, '\\:');
let tn = 0;
const txt = (s) => { const f = path.join(WORK, `t${tn++}.txt`); writeFileSync(f, s); return esc(f); };

const VOLEN = [4.48, 7.18, 5.44, 8.75, 3.97, 3.98, 2.56, 3.56, 3.74];

const GRADE = 'eq=contrast=1.1:saturation=0.85:brightness=-0.02,vignette=PI/4.5,noise=alls=16:allf=t+u';
const LOOK = {
  color: GRADE,
  bw: 'hue=s=0,eq=contrast=1.35:brightness=-0.03,vignette=PI/4,noise=alls=22:allf=t+u',
  shift: `${GRADE},rgbashift=rh=-8:bh=8`,
};
const c = (clip, from, to, look = 'color') => ({ clip, from, to, look });
const screen = (img, dur, from = 0, to = 0.55) => ({ img, dur, from, to }); // pans from..to of the image height
const card = (text, dur) => ({ card: text, dur });
const flash = (dur = 0.08, color = 'white') => ({ flash: color, dur });

// One voice line per group, laid over a run of quick cuts. `sub` = on-screen caption.
const groups = [
  { vo: 0, sub: ['tonight is a dating app', 'for adults who know what they want'],
    segs: [c('01-mask-heads', 0.2, 1.6, 'bw'), c('06-eye', 2.0, 2.6, 'bw'), c('01-mask-heads', 4.0, 6.0, 'bw')] },
  { vo: 1, sub: ['members only.', 'every face verified live.'],
    segs: [c('02-phone', 0.3, 1.8), flash(), screen('01-main.png', 3.4, 0.0, 0.5), c('03-dancers', 2.6, 3.4, 'shift'), c('02-phone', 4.0, 5.5)] },
  { vo: 2, sub: ['free tonight? go live', "and see who's out. right now."],
    segs: [c('05-city', 0.0, 1.4), screen(path.join(ROOT, 'screens', '03-discover-lotte.png'), 3.2, 0.1, 0.6), c('03-dancers', 0.2, 1.4)] },
  { vo: 3, sub: ['you set your boundaries first.', 'matched only with people who want the same.'],
    segs: [screen(path.join(ROOT, 'screens', '04-boundaries-new.png'), 2.3, 0.0, 0.45), card(['YES.'], 0.75), card(['MAYBE.'], 0.75), card(['NO.'], 0.9),
      screen(path.join(ROOT, 'screens', '04-boundaries-new.png'), 2.2, 0.45, 0.62), c('08-mask-grid', 0.5, 2.0)] },
  { vo: 4, sub: ['wear a mask.', 'your bare face never leaves your phone.'],
    segs: [c('04-disco-ball', 0.0, 1.4, 'bw'), screen('02-masks.png', 2.9, 0.05, 0.55)] },
  { vo: 5, sub: ['private photos stay blurred', 'until you both say yes'],
    segs: [c('06-eye', 0.0, 2.2), c('06-eye', 4.0, 5.9, 'bw')] },
  { vo: 6, sub: ['less chatting. more plans.'],
    segs: [c('07-bar-door', 0.2, 1.8), c('07-bar-door', 3.4, 4.5, 'shift')] },
  { vo: 7, sub: ['seven vows.', "break one and you're out."],
    segs: [screen('05-code.png', 4.0, 0.05, 0.5)] },
  { vo: 8, end: true,
    segs: [c('08-mask-grid', 0.0, 1.1), flash(0.12, 'black'), { end: true, dur: 4.2 }] },
];

const segLen = (s) => (s.clip ? s.to - s.from : s.dur);
let seg = 0, t = 0;
const files = [], voAt = [], subs = [];
for (const g of groups) {
  const lead = g.segs[0].card ? 0.1 : 0.3;
  const need = lead + VOLEN[g.vo] + 0.45;
  const have = g.segs.reduce((a, s) => a + segLen(s), 0);
  const last = g.segs[g.segs.length - 1];
  if (have < need) { if (last.clip) last.to = Math.min(7.8, last.to + (need - have)); else last.dur += need - have; }
  voAt.push({ i: g.vo, at: t + lead });
  const gLen = g.segs.reduce((a, s) => a + segLen(s), 0);
  if (g.sub) subs.push({ lines: g.sub, from: t + lead, to: t + gLen - 0.1 });

  for (const s of g.segs) {
    const out = path.join(WORK, `s${String(seg++).padStart(2, '0')}.mp4`);
    const d = segLen(s).toFixed(3);
    const color = ['-f', 'lavfi', '-i', `color=c=${s.flash === 'white' ? 'white' : BG}:s=${W}x${H}:r=${FPS}:d=${d}`];
    if (s.clip) {
      run(['-ss', String(s.from), '-t', d, '-i', path.join(CLIPS, `${s.clip}.mp4`), '-an',
        '-vf', `scale=${W}:${H},fps=${FPS},${LOOK[s.look]},format=yuv420p`, '-c:v', 'libx264', '-crf', '17', out]);
    } else if (s.img) {
      // App Store screenshot, slowly scrolling down, light grain so it matches the clips.
      const ih = `ih`, y = `(${ih}-${H})*(${s.from}+(${s.to}-${s.from})*t/${d})`;
      run(['-loop', '1', '-framerate', String(FPS), '-t', d, '-i', path.resolve(SCREENS, s.img),
        '-vf', `scale=${W}:-2,crop=${W}:${H}:0:'${y}',vignette=PI/5,noise=alls=8:allf=t+u,fade=in:st=0:d=0.15,format=yuv420p`,
        '-c:v', 'libx264', '-crf', '17', out]);
    } else if (s.card) {
      const size = 150, gap = 165, y0 = `(h-${s.card.length * gap})/2`;
      const vf = s.card.map((l, i) =>
        `drawtext=fontfile='${CARD_FONT}':textfile='${txt(l)}':fontsize=${size}:fontcolor=white:x=(w-text_w)/2:y=${y0}+${i * gap}`
      ).join(',') + ',noise=alls=18:allf=t+u,format=yuv420p';
      run([...color, '-vf', vf, '-c:v', 'libx264', '-crf', '17', out]);
    } else if (s.end) {
      const text = [['tonight.', 64, 0xF4EFEA, 790], ['take the vow. meet tonight.', 32, 0xF4EFEA, 880], ['now on the App Store', 28, 0xFF7FB5, 960]];
      const fc = `[1:v]crop=iw*0.72:ih*0.72,scale=340:340,format=rgba,fade=in:st=0:d=0.8:alpha=1[logo];` +
        `[0:v][logo]overlay=(W-w)/2:380,` +
        text.map(([l, size, col, y]) =>
          `drawtext=fontfile='${l === 'tonight.' ? CARD_FONT : SUB_FONT}':textfile='${txt(l)}':fontsize=${size}` +
          `:fontcolor=0x${col.toString(16)}:x=(w-text_w)/2:y=${y}`).join(',') +
        `,noise=alls=14:allf=t+u,fade=out:st=${(segLen(s) - 0.7).toFixed(2)}:d=0.7,format=yuv420p[v]`;
      run([...color, '-loop', '1', '-t', d, '-i', ICON, '-filter_complex', fc, '-map', '[v]', '-c:v', 'libx264', '-crf', '17', out]);
    } else {
      run([...color, '-vf', 'format=yuv420p', '-c:v', 'libx264', '-crf', '17', out]);
    }
    files.push(out);
    t += segLen(s);
  }
}
const total = t;
console.log('segments', files.length, 'length', total.toFixed(2));

// 1) picture
const list = path.join(WORK, 'list.txt');
writeFileSync(list, files.map((f) => `file '${f.replace(/\\/g, '/')}'`).join('\n'));
const pic = path.join(WORK, 'picture.mp4');
run(['-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', pic]);

// 2) music bed: the clips' own soundtracks crossfaded into one continuous track
const bedSrc = ['03-dancers', '05-city', '02-phone', '01-mask-heads', '03-dancers', '05-city', '07-bar-door', '02-phone', '03-dancers'];
const bedIn = bedSrc.flatMap((n) => ['-i', path.join(CLIPS, `${n}.mp4`)]);
let bf = bedSrc.map((_, i) => `[${i}:a]aresample=48000,atrim=0.2:7.8,asetpts=PTS-STARTPTS[b${i}]`).join(';');
let prev = 'b0';
for (let i = 1; i < bedSrc.length; i++) { bf += `;[${prev}][b${i}]acrossfade=d=1.2:c1=tri:c2=tri[x${i}]`; prev = `x${i}`; }
bf += `;[${prev}]atrim=0:${total},lowpass=f=3200,afade=in:d=0.6,afade=out:st=${total - 1.5}:d=1.5[bed]`;
const bed = path.join(WORK, 'bed.wav');
run([...bedIn, '-filter_complex', bf, '-map', '[bed]', '-ac', '2', bed]);

// 3) voice lines placed on the timeline, with a little room reverb
const voIn = voAt.flatMap(({ i }) => ['-i', path.join(VO, `${String(i).padStart(2, '0')}.wav`)]);
const vf = voAt.map(({ at }, k) => `[${k}:a]adelay=${Math.round(at * 1000)}|${Math.round(at * 1000)}[v${k}]`).join(';') +
  `;${voAt.map((_, k) => `[v${k}]`).join('')}amix=inputs=${voAt.length}:normalize=0,` +
  `acompressor=threshold=-20dB:ratio=3:attack=5:release=120,aecho=0.85:0.6:45|90:0.18|0.1,volume=1.8,apad,atrim=0:${total}[vo]`;
const voice = path.join(WORK, 'voice.wav');
run([...voIn, '-filter_complex', vf, '-map', '[vo]', '-ac', '2', '-ar', '48000', voice]);

// 4) final: captions on picture, music ducked under the voice, loudness for Instagram
const subF = subs.flatMap(({ lines, from, to }) => lines.map((l, i) =>
  `drawtext=fontfile='${SUB_FONT}':textfile='${txt(l)}':fontsize=28:fontcolor=0xFFE7A3` +
  `:x=(w-text_w)/2:y=${Math.round(H * 0.84) + i * 40}:box=1:boxcolor=black@0.55:boxborderw=8` +
  `:enable='between(t,${from.toFixed(2)},${to.toFixed(2)})'`)).join(',');
run(['-i', pic, '-i', bed, '-i', voice, '-filter_complex',
  `[0:v]${subF}[v];[2:a]asplit=2[vk][vm];[1:a]volume=0.55[b];` +
  `[b][vk]sidechaincompress=threshold=0.03:ratio=8:attack=20:release=400[duck];` +
  `[duck][vm]amix=inputs=2:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=11,aresample=48000[a]`,
  '-map', '[v]', '-map', '[a]', '-c:v', 'libx264', '-crf', '18', '-preset', 'slow', '-pix_fmt', 'yuv420p',
  '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', OUT]);
console.log('done', OUT);
