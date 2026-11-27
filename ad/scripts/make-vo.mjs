// Generates voiceover lines with Microsoft's free neural voices (edge-tts) and trims the silence.
// usage: node scripts/make-vo.mjs <lines.txt> <outDir> [voice] [rate] [pitch]
//   lines.txt: one spoken line per line; output is outDir/00.wav, 01.wav, ...
//   e.g. node scripts/make-vo.mjs scripts/lines-v3-clear.txt vo-v3-clear en-GB-SoniaNeural -15% -14Hz
// To use your own recordings (e.g. ElevenLabs) instead: drop 00.wav, 01.wav ... into the folder.
import { execFileSync } from 'node:child_process';
import { readFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import ffmpeg from 'ffmpeg-static';
import ffprobe from 'ffprobe-static';

const AD = path.resolve(import.meta.dirname, '..');
const [linesFile, outDir, voice = 'en-GB-SoniaNeural', rate = '-15%', pitch = '-14Hz'] = process.argv.slice(2);
const out = path.resolve(AD, outDir);
mkdirSync(out, { recursive: true });
const tts = path.join(AD, '.venv', 'Scripts', 'edge-tts.exe');

const lines = readFileSync(path.resolve(AD, linesFile), 'utf8').split(/\r?\n/).filter((l) => l.trim());
const lens = [];
lines.forEach((line, i) => {
  const n = String(i).padStart(2, '0');
  const mp3 = path.join(out, `${n}.mp3`), wav = path.join(out, `${n}.wav`);
  execFileSync(tts, ['--voice', voice, `--rate=${rate}`, `--pitch=${pitch}`, '--text', line, '--write-media', mp3]);
  const trim = 'silenceremove=start_periods=1:start_threshold=-45dB';
  execFileSync(ffmpeg, ['-nostdin', '-v', 'error', '-y', '-i', mp3, '-af',
    `${trim},areverse,${trim},areverse,aresample=48000`, '-ac', '2', wav]);
  const d = +execFileSync(ffprobe.path, ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', wav]).toString();
  lens.push(+d.toFixed(2));
  console.log(n, d.toFixed(2), line);
});
console.log('lengths:', JSON.stringify(lens));
