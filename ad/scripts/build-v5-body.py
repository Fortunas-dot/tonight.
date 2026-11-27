"""v5 "What the body can do": a breathing intro that speeds up, a deadpan body documentary, then the app.
usage (from the ad folder): python scripts/build-v5-body.py   -> out/tonight-ad-v5-body.mp4
Voice: scripts/lines-v5-body.txt -> npm run vo -- scripts/lines-v5-body.txt vo-v5-body en-GB-SoniaNeural -18% -14Hz
Breathing and heartbeat are synthesised here (numpy), so there is nothing to license."""
import math, subprocess
from pathlib import Path
import numpy as np
from scipy.signal import butter, sosfilt
from PIL import Image, ImageDraw, ImageFont

AD = Path(__file__).resolve().parent.parent
APP = AD.parent
FF = str(AD / 'node_modules/ffmpeg-static/ffmpeg.exe')
WORK = AD / 'parts-v5'; WORK.mkdir(exist_ok=True)
OUT = AD / 'out/tonight-ad-v5-body.mp4'
VO = AD / 'vo-v5-body'
W, H, FPS, SR = 720, 1280, 24, 48000
BG = np.array([14, 12, 16], np.float32)
INK, PINKT = (244, 239, 234), (255, 127, 181)
F = 'C:/Windows/Fonts/'
BLACK = lambda s: ImageFont.truetype(F + 'ariblk.ttf', s)
MONO = lambda s: ImageFont.truetype(F + 'consolab.ttf', s)

# ---------------- timeline (seconds)
INTRO_END, SILENCE_END = 9.0, 9.5
B1, B2, B3 = 9.5, 13.6, 16.8          # body facts
C1, C2 = 21.3, 24.6                    # app screens
END, TOTAL = 28.2, 32.2
VO_AT = [9.7, 13.85, 17.0, 21.6, 24.9, 28.8]
CAPTIONS = [  # (from, to, lines) small captions for sound-off viewing
    (9.7, 13.5, ['the human body has more', 'than six hundred muscles.']),
    (13.85, 16.7, ['its largest organ', 'is the skin.']),
    (17.0, 21.2, ['most people only ever explore', 'a fraction of it.']),
    (21.6, 24.5, ['find people who are', 'just as curious.']),
    (24.9, 28.1, ['learn from each other.', 'out loud.']),
]

# breaths: exhale moments, slow at first and getting faster
BEATS, t, p = [], 0.7, 1.55
while t < INTRO_END - 0.25:
    BEATS.append(t); t += p; p = max(0.42, p * 0.86)
WORDS = ['in.', 'out.', 'slower.', 'closer.', 'deeper.', 'again.', 'again.', 'curious?']

def breath_env(t):
    """0..1: rises on the inhale before each beat, drops on the exhale."""
    for i, b in enumerate(BEATS):
        nxt = BEATS[i + 1] if i + 1 < len(BEATS) else b + 0.6
        prev = BEATS[i - 1] if i else 0
        if t < b:
            return max(0, min(1, (t - (prev + (b - prev) * 0.45)) / ((b - prev) * 0.55))) ** 1.5
        if t < nxt and t < b + (nxt - b) * 0.45:
            return math.exp(-6 * (t - b) / max(0.2, nxt - b))
    return 0.0

yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
def glow(cx, cy, r, color, strength):
    d2 = ((xx - cx) ** 2 + (yy - cy) ** 2) / (r * r)
    return np.exp(-d2)[..., None] * np.array(color, np.float32)[None, None] * strength

def base(t, r, s, cy=H * 0.5):
    img = np.broadcast_to(BG, (H, W, 3)).copy()
    img += glow(W * 0.5, cy, r, (240, 40, 122), s)
    img += glow(W * 0.62, cy + 120, r * 0.8, (123, 60, 255), s * 0.7)
    img += glow(W * 0.38, cy - 140, r * 0.6, (59, 123, 255), s * 0.35)
    return Image.fromarray(np.clip(img, 0, 255).astype(np.uint8))

def centered(d, y, s, f, fill):
    d.text((W // 2, y), s, font=f, fill=fill, anchor='mm')

def caption(im, t):
    d = ImageDraw.Draw(im)
    for a, b, lines in CAPTIONS:
        if a <= t <= b:
            for i, l in enumerate(lines):
                f = MONO(28); w = d.textlength(l, font=f) + 24; y = int(H * 0.84) + i * 40
                d.rectangle([W / 2 - w / 2, y - 18, W / 2 + w / 2, y + 18], fill=(0, 0, 0))
                d.text((W // 2, y), l, font=f, fill=(255, 231, 163), anchor='mm')
    return im

def intro(t):
    e = breath_env(t)
    im = base(t, 170 + 230 * e, 0.35 + 0.65 * e)
    d = ImageDraw.Draw(im)
    k = max([i for i, b in enumerate(BEATS) if b <= t + 0.05], default=-1)
    if k >= 0:
        age = t - BEATS[k]
        a = max(0.0, 1 - age / 0.9)
        word = WORDS[min(k, len(WORDS) - 1)] if k < len(BEATS) - 1 else 'curious?'
        c = tuple(int(BG[j] + (INK[j] - BG[j]) * a) for j in range(3))
        centered(d, H // 2, word, BLACK(96 + int(10 * e)), c)
    return im

def fact(t, big, small, t0, t1, count_to=None, shrink=False):
    p = (t - t0) / (t1 - t0)
    if shrink:
        im = base(t, max(30, 360 * (1 - p) ** 1.6), 0.5)
    else:
        im = base(t, 260 + 30 * math.sin(t * 2.2), 0.42)
    d = ImageDraw.Draw(im)
    if count_to:
        n = int(count_to * min(1, (t - t0) / 1.6) ** 0.6)
        big = f'{n}+' if n >= count_to else str(n)
    centered(d, H // 2 - 70, big, BLACK(170 if len(big) < 5 else 96), INK)
    centered(d, H // 2 + 70, small, MONO(36), PINKT)
    return caption(im, t)

def screen(t, png, t0, t1, frm, to):
    im = Image.open(png).convert('RGB')
    im = im.resize((W, round(im.height * W / im.width)), Image.LANCZOS)
    e = (t - t0) / (t1 - t0); e = 1 - (1 - min(1, e)) ** 3
    y = int((im.height - H) * (frm + (to - frm) * e))
    return caption(im.crop((0, y, W, y + H)), t)

ICON = Image.open(APP / 'assets/icon.png').convert('RGB').crop((143, 143, 881, 881)).resize((330, 330), Image.LANCZOS)
def end(t):
    im = base(t, 300, 0.25); d = ImageDraw.Draw(im)
    a = min(1, (t - END) / 0.8)
    lum = np.asarray(ICON.convert('L'), np.float32)        # the icon's dark tile becomes see-through
    m = Image.fromarray(np.clip((lum - 28) * 5 * a, 0, 255).astype(np.uint8))
    im.paste(ICON, ((W - 330) // 2, 360), m)
    if t > END + 0.6: centered(d, 790, 'tonight.', BLACK(64), INK)
    if t > END + 1.1: centered(d, 870, 'explore together.', MONO(32), INK)
    if t > END + 1.6: centered(d, 940, 'now on the App Store', MONO(28), PINKT)
    return im

def frame(t):
    if t < INTRO_END: return intro(t)
    if t < SILENCE_END: return Image.new('RGB', (W, H), tuple(int(c) for c in BG))
    if t < B2: return fact(t, '', 'muscles', B1, B2, count_to=600)
    if t < B3: return fact(t, '2 m²', 'of skin. your largest organ.', B2, B3)
    if t < C1: return fact(t, 'a fraction', 'explored.', B3, C1, shrink=True)
    if t < C2: return screen(t, AD / 'screens/04-boundaries-new.png', C1, C2, 0.2, 0.62)
    if t < END: return screen(t, APP / 'store/screenshots/iphone-6.9/06-guides.png', C2, END, 0.0, 0.5)
    return end(t)

pic = WORK / 'picture.mp4'
p = subprocess.Popen([FF, '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
                      '-vf', 'noise=alls=12:allf=t+u,vignette=PI/5,format=yuv420p', '-c:v', 'libx264', '-crf', '17', str(pic)],
                     stdin=subprocess.PIPE)
for i in range(int(TOTAL * FPS)):
    p.stdin.write(frame(i / FPS).tobytes())
p.stdin.close(); p.wait()
print('picture done')

# ---------------- sound: breathing + heartbeat, synthesised
rng = np.random.default_rng(3)
N = int(TOTAL * SR)
mix = np.zeros((N, 2), np.float32)
band = lambda x, lo, hi: sosfilt(butter(2, [lo, hi], 'bandpass', fs=SR, output='sos'), x)

def add(sig, t, gain=1.0, pan=0.0):
    i = int(t * SR); sig = sig[: max(0, N - i)]
    mix[i:i + len(sig), 0] += sig * gain * (1 - pan)
    mix[i:i + len(sig), 1] += sig * gain * (1 + pan)

def exhale(dur):
    n = int(dur * SR); tt = np.arange(n) / SR
    env = (1 - np.exp(-tt / 0.03)) * np.exp(-tt / (dur * 0.38))
    noise = band(rng.standard_normal(n), 350, 2200) * 0.9 + band(rng.standard_normal(n), 900, 1300) * 0.6
    f0 = 190 * (1 - 0.15 * tt / dur)                       # a soft breathy voice under the air
    voice = band(np.sign(np.sin(2 * np.pi * np.cumsum(f0) / SR)) * 0.5, 300, 1600)
    return (noise + voice * 0.22) * env

def inhale(dur):
    n = int(dur * SR); tt = np.arange(n) / SR
    env = (tt / dur) ** 1.8 * (1 - np.exp(-(dur - tt) / 0.02))
    return band(rng.standard_normal(n), 1400, 5200) * env * 0.55

def heart():
    n = int(0.5 * SR); tt = np.arange(n) / SR
    lub = np.sin(2 * np.pi * (62 - 25 * tt) * tt) * np.exp(-tt / 0.07)
    dub = np.zeros(n); k = int(0.19 * SR)
    dub[k:] = np.sin(2 * np.pi * (75 - 30 * tt[:n - k]) * tt[:n - k]) * np.exp(-tt[:n - k] / 0.05) * 0.7
    return lub + dub

for i, b in enumerate(BEATS):
    gap = (BEATS[i + 1] - b) if i + 1 < len(BEATS) else 0.6
    prev_gap = (b - BEATS[i - 1]) if i else 1.2
    intensity = 0.55 + 0.45 * i / max(1, len(BEATS) - 1)
    ind = min(0.5, prev_gap * 0.45)
    add(inhale(ind), b - ind, 0.35 * intensity, pan=-0.1)
    add(exhale(min(0.75, gap * 0.8)), b, 0.42 * intensity, pan=0.1)
    add(heart(), b, 0.9 * intensity)

# room reverb on the breathing (a quick, simple tail)
for delay, g in ((0.031, 0.25), (0.057, 0.18), (0.089, 0.12)):
    d = int(delay * SR); mix[d:] += mix[:-d] * g

# voice and music go through ffmpeg
breath_wav = WORK / 'breath.wav'
import wave
with wave.open(str(breath_wav), 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((np.clip(mix / max(1e-6, np.abs(mix).max()) * 0.9, -1, 1) * 32767).astype(np.int16).tobytes())

inputs = ['-i', str(breath_wav)]
chains = ['[0:a]volume=1.0[br]']
for k, at in enumerate(VO_AT):
    inputs += ['-i', str(VO / f'{k:02d}.wav')]
    ms = int(at * 1000)
    chains.append(f'[{k + 1}:a]adelay={ms}|{ms},volume=2.0,aecho=0.85:0.6:45|90:0.16|0.08[v{k}]')
m = len(VO_AT) + 1
inputs += ['-ss', '0.3', '-i', str(AD / 'clips/05-city.mp4'), '-ss', '0.3', '-i', str(AD / 'clips/02-phone.mp4'),
           '-ss', '0.3', '-i', str(AD / 'clips/03-dancers.mp4')]
start = SILENCE_END + 0.2
chains.append(f'[{m}:a][{m + 1}:a]acrossfade=d=1:c1=tri:c2=tri[x];[x][{m + 2}:a]acrossfade=d=1:c1=tri:c2=tri,lowpass=f=2600,'
              f'volume=0.3,afade=in:d=1.5,afade=out:st={TOTAL - start - 1.6:.2f}:d=1.6,adelay={int(start * 1000)}|{int(start * 1000)}[bed]')
fc = ';'.join(chains) + ';[br]' + ''.join(f'[v{k}]' for k in range(len(VO_AT))) + \
     f'[bed]amix=inputs={len(VO_AT) + 2}:normalize=0,atrim=0:{TOTAL},loudnorm=I=-14:TP=-1.5:LRA=11,aresample=48000[a]'
audio = WORK / 'audio.wav'
subprocess.run([FF, '-v', 'error', '-y', *inputs, '-filter_complex', fc, '-map', '[a]', '-ac', '2', str(audio)], check=True)
subprocess.run([FF, '-v', 'error', '-y', '-i', str(pic), '-i', str(audio), '-map', '0:v', '-map', '1:a', '-c:v', 'copy',
                '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', str(OUT)], check=True)
print('beats', len(BEATS), 'done', OUT)
