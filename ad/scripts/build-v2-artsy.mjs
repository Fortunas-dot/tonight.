// "Artsy" cut of the Tonight brand film: fast cuts, grain, black-and-white flashes,
// one continuous music bed ducked under a British voiceover.
// usage (from the ad folder): npm run build:artsy   -> out/tonight-ad-v2-artsy.mp4
import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import ffmpeg from 'ffmpeg-static';

const FF = ffmpeg;
const ROOT = path.resolve(import.meta.dirname, '..');
const CLIPS = path.join(ROOT, 'clips');
const WORK = path.join(ROOT, 'parts-v2');
const VO = path.join(ROOT, 'vo-v2-artsy');
const ICON = path.resolve(ROOT, '..', 'assets', 'icon.png');
mkdirSync(WORK, { recursive: true });

const W = 720, H = 1280, FPS = 24, BG = '0x0E0C10';
const SUB_FONT = 'C\\:/Windows/Fonts/consolab.ttf';
const CARD_FONT = 'C\\:/Windows/Fonts/ariblk.ttf';
const run = (args) => execFileSync(FF, ['-nostdin', '-v', 'error', '-y', ...args], { stdio: 'inherit' });
const esc = (p) => p.replace(/\\/g, '/').replace(/:/g, '\\:');
let tn = 0;
const txt = (s) => { const f = path.join(WORK, `t${tn++}.txt`); writeFileSync(f, s); return esc(f); };

// Trimmed voice line lengths (vo2/NN.wav).
const VOLEN = [3.12, 2.82, 4.06, 3.08, 5.35, 3.31, 3.75, 3.33, 2.72, 0.69, 2.63];

const GRADE = 'eq=contrast=1.1:saturation=0.85:brightness=-0.02,vignette=PI/4.5,noise=alls=16:allf=t+u';
const LOOK = {
  color: GRADE,
  bw: `hue=s=0,eq=contrast=1.35:brightness=-0.03,vignette=PI/4,noise=alls=22:allf=t+u`,
  shift: `${GRADE},rgbashift=rh=-8:bh=8`,
};
const c = (clip, from, to, look = 'color') => ({ clip, from, to, look });
const card = (text, dur) => ({ card: text, dur });
const flash = (dur = 0.08, color = 'white') => ({ flash: color, dur });

// Each group = one voice line over a run of quick cuts.
const groups = [
  { vo: 0, sub: ["we've been wanting to make this", 'for a while'],
    segs: [c('01-mask-heads', 0.2, 1.5, 'bw'), c('06-eye', 2.0, 2.8, 'bw'), c('01-mask-heads', 4.0, 5.9, 'bw')] },
  { vo: 1, sub: ['for people who already', 'know what they want'],
    segs: [c('02-phone', 0.3, 1.8), flash(), c('02-phone', 4.0, 5.9)] },
  { vo: 2, sub: ['no bots. no fakes. no games.'],
    segs: [c('03-dancers', 0.2, 1.4), c('03-dancers', 2.6, 3.4, 'shift'), flash(0.2, 'black'), c('03-dancers', 5.0, 6.8)] },
  { vo: 3, segs: [card(['REAL', 'FACES.'], 1.5), card(['BEHIND', 'A MASK.'], 2.1)] },
  { vo: 4, sub: ['everyone here is verified.', 'everyone here is discreet.'],
    segs: [c('04-disco-ball', 0.0, 2.0, 'bw'), c('08-mask-grid', 0.5, 1.1), c('04-disco-ball', 3.0, 4.0), flash(), c('04-disco-ball', 5.4, 7.4)] },
  { vo: 5, sub: ['free tonight?', 'so is someone nearby'],
    segs: [c('05-city', 0.0, 2.0), c('05-city', 4.4, 6.4)] },
  { vo: 6, segs: [card(['SAY', 'YES.'], 1.2), card(['SAY', 'MAYBE.'], 1.4), card(['SAY', 'NO.'], 1.7)] },
  { vo: 7, sub: ['nothing shows', 'until you both say yes'],
    segs: [c('06-eye', 0.0, 2.2), c('06-eye', 4.0, 5.9, 'bw')] },
  { vo: 8, sub: ['less chatting. more plans.'],
    segs: [c('07-bar-door', 0.2, 2.0), c('07-bar-door', 3.4, 5.1, 'shift')] },
  { vo: 9, sub: ['tonight.'],
    segs: [c('08-mask-grid', 0.0, 1.2), flash(0.12, 'black'), c('08-mask-grid', 2.4, 4.2, 'bw')] },
  { vo: 10, end: true, segs: [{ end: true, dur: 3.8 }] },
];

const segLen = (s) => (s.clip ? s.to - s.from : s.dur);
let seg = 0, t = 0;
const files = [], voAt = [], subs = [];
for (const g of groups) {
  const lead = g.segs[0].card || g.end ? 0.1 : 0.35;
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
    } else if (s.card) {
      const size = 150, gap = 165, y0 = `(h-${s.card.length * gap})/2`;
      const vf = s.card.map((l, i) =>
        `drawtext=fontfile='${CARD_FONT}':textfile='${txt(l)}':fontsize=${size}:fontcolor=white:x=(w-text_w)/2:y=${y0}+${i * gap}`
      ).join(',') + `,noise=alls=18:allf=t+u,format=yuv420p`;
      run([...color, '-vf', vf, '-c:v', 'libx264', '-crf', '17', out]);
    } else if (s.end) {
      const fc = `[1:v]crop=iw*0.72:ih*0.72,scale=360:360,format=rgba,fade=in:st=0:d=0.8:alpha=1[logo];` +
        `[0:v][logo]overlay=(W-w)/2:360,` +
        ['take the vow.', 'meet tonight.'].map((l, i) =>
          `drawtext=fontfile='${SUB_FONT}':textfile='${txt(l)}':fontsize=40:fontcolor=0xF4EFEA:x=(w-text_w)/2:y=${820 + i * 56}`
        ).join(',') + `,noise=alls=14:allf=t+u,fade=out:st=${(segLen(s) - 0.7).toFixed(2)}:d=0.7,format=yuv420p[v]`;
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
const bedSrc = ['03-dancers', '05-city', '02-phone', '01-mask-heads', '03-dancers', '05-city', '07-bar-door'];
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

// 4) final: subtitles on picture, music ducked under the voice, loudness for Instagram
const subF = subs.flatMap(({ lines, from, to }) => lines.map((l, i) =>
  `drawtext=fontfile='${SUB_FONT}':textfile='${txt(l)}':fontsize=30:fontcolor=0xFFE7A3` +
  `:x=(w-text_w)/2:y=${Math.round(H * 0.74) + i * 42}:shadowcolor=black@0.8:shadowx=0:shadowy=2` +
  `:enable='between(t,${from.toFixed(2)},${to.toFixed(2)})'`)).join(',');
const final = path.join(ROOT, 'out', 'tonight-ad-v2-artsy.mp4');
run(['-i', pic, '-i', bed, '-i', voice, '-filter_complex',
  `[0:v]${subF}[v];[2:a]asplit=2[vk][vm];[1:a]volume=0.55[b];` +
  `[b][vk]sidechaincompress=threshold=0.03:ratio=8:attack=20:release=400[duck];` +
  `[duck][vm]amix=inputs=2:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=11,aresample=48000[a]`,
  '-map', '[v]', '-map', '[a]', '-c:v', 'libx264', '-crf', '18', '-preset', 'slow', '-pix_fmt', 'yuv420p',
  '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', final]);
console.log('done', final);
