"""v6 "Come together": breathing and a glow that build to a climax, a white flash, an afterglow, then the app.
usage (from the ad folder): python scripts/build-v6-climax.py   -> out/tonight-ad-v6-climax.mp4
Voice: scripts/lines-v6-climax.txt -> npm run vo -- scripts/lines-v6-climax.txt vo-v6-climax en-GB-SoniaNeural -18% -14Hz
The breathing is synthesised here (numpy): breathing only, no other sound effects."""
import math, subprocess, wave
from pathlib import Path
import numpy as np
from scipy.signal import butter, sosfilt
from PIL import Image, ImageDraw, ImageFont

AD = Path(__file__).resolve().parent.parent
APP = AD.parent
FF = str(AD / 'node_modules/ffmpeg-static/ffmpeg.exe')
WORK = AD / 'parts-v6'; WORK.mkdir(exist_ok=True)
OUT = AD / 'out/tonight-ad-v6-climax.mp4'
VO = AD / 'vo-v6-climax'
W, H, FPS, SR = 720, 1280, 24, 48000
BG = np.array([14, 12, 16], np.float32)
INK, PINKT = (244, 239, 234), (255, 127, 181)
F = 'C:/Windows/Fonts/'
BLACK = lambda s: ImageFont.truetype(F + 'ariblk.ttf', s)
MONO = lambda s: ImageFont.truetype(F + 'consolab.ttf', s)

# ---------------- timeline (seconds)
PEAK = 12.0                 # the climax: white flash
AFTER_END = 15.2            # afterglow ("…wow.")
S1, S2, S3 = 15.2, 18.8, 21.4
END, TOTAL = 24.2, 28.2
VO_AT = [15.4, 19.0, 21.6, 24.8]
CAPTIONS = [
    (15.4, 18.7, ['good nights start with', 'saying what you want.']),
    (19.0, 21.3, ['find someone who', 'wants it too.']),
    (21.6, 24.1, ['and learn what', 'makes you... you.']),
]

BEATS, t, p = [], 0.6, 1.4
while t < PEAK - 0.3:
    BEATS.append(t); t += p; p = max(0.27, p * 0.87)
WORDS = ['slow.', 'breathe.', 'closer.', 'closer.', 'there.', 'right there.', "don't stop.", 'yes.', 'yes.', 'YES.']
word_for = lambda k: WORDS[min(len(WORDS) - 1, int(k * len(WORDS) / len(BEATS)))]
level = lambda t: min(1.0, max(0.0, t / PEAK)) ** 1.6          # how far into the build we are

def breath_env(t):
    for i, b in enumerate(BEATS):
        nxt = BEATS[i + 1] if i + 1 < len(BEATS) else PEAK
        prev = BEATS[i - 1] if i else 0
        if t < b:
            return max(0, min(1, (t - (prev + (b - prev) * 0.45)) / ((b - prev) * 0.55))) ** 1.5
        if t < nxt:
            return math.exp(-6 * (t - b) / max(0.2, nxt - b))
    return 0.0

yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
def glow(cx, cy, r, color, s):
    return np.exp(-(((xx - cx) ** 2 + (yy - cy) ** 2) / (r * r)))[..., None] * np.array(color, np.float32) * s

def canvas(r, s, warm=0.0, cx=W / 2, cy=H / 2):
    img = np.broadcast_to(BG, (H, W, 3)).copy()
    pink = np.array((240, 40, 122)) * (1 - warm) + np.array((255, 200, 220)) * warm
    img += glow(cx, cy, r, pink, s)
    img += glow(cx + 80, cy + 130, r * 0.8, (123, 60, 255), s * 0.7)
    img += glow(cx - 90, cy - 150, r * 0.6, (59, 123, 255), s * 0.35)
    return img

def to_im(img):
    return Image.fromarray(np.clip(img, 0, 255).astype(np.uint8))

def centered(d, y, s, f, fill, x=W // 2):
    d.text((x, y), s, font=f, fill=fill, anchor='mm')

def caption(im, t):
    d = ImageDraw.Draw(im)
    for a, b, lines in CAPTIONS:
        if a <= t <= b:
            for i, l in enumerate(lines):
                f = MONO(28); w = d.textlength(l, font=f) + 24; y = int(H * 0.84) + i * 40
                d.rectangle([W / 2 - w / 2, y - 18, W / 2 + w / 2, y + 18], fill=(0, 0, 0))
                d.text((W // 2, y), l, font=f, fill=(255, 231, 163), anchor='mm')
    return im

rng_v = np.random.default_rng(11)
def build(t):
    L, e = level(t), breath_env(t)
    shake = (rng_v.standard_normal(2) * 14 * L * e) if L > 0.25 else np.zeros(2)
    img = canvas(170 + 200 * e + 160 * L, 0.3 + 0.5 * e + 0.6 * L, warm=max(0, L - 0.6) * 1.6,
                 cx=W / 2 + shake[0], cy=H / 2 + shake[1])
    im = to_im(img); d = ImageDraw.Draw(im)
    k = max([i for i, b in enumerate(BEATS) if b <= t + 0.04], default=-1)
    if k >= 0:
        a = max(0.0, 1 - (t - BEATS[k]) / max(0.25, 0.9 - 0.6 * L))
        c = tuple(int(BG[j] * (1 - a) + INK[j] * a) for j in range(3))
        w = word_for(k)
        centered(d, H // 2 + shake[1], w, BLACK((84 if len(w) > 8 else 104) + int(16 * e)), c, x=W // 2 + shake[0])
    return im

def peak_and_after(t):
    dt = t - PEAK
    img = canvas(260 + 40 * math.sin(dt * 2.0), 0.55, warm=0.6)
    for k in range(3):                                   # rings rushing outwards
        r = (dt - k * 0.12) * 1400
        if 0 < r < 1600:
            ring = np.exp(-((np.sqrt((xx - W / 2) ** 2 + (yy - H / 2) ** 2) - r) ** 2) / (2 * 30 ** 2))
            img += ring[..., None] * np.array((255, 120, 190), np.float32) * max(0, 1 - r / 1600) * 1.2
    flash = max(0.0, 1 - dt / 0.6) ** 2
    img = img * (1 - flash) + 255 * flash
    im = to_im(img); d = ImageDraw.Draw(im)
    if dt > 1.2:
        s = '…wow.'; n = min(len(s), int((dt - 1.2) * 6))
        x = W / 2 - d.textlength(s, font=BLACK(96)) / 2
        d.text((x, H // 2), s[:n], font=BLACK(96), fill=INK, anchor='lm')
    return im

def screen(t, png, t0, t1, frm, to):
    im = Image.open(png).convert('RGB')
    im = im.resize((W, round(im.height * W / im.width)), Image.LANCZOS)
    e = 1 - (1 - min(1, (t - t0) / (t1 - t0))) ** 3
    y = int((im.height - H) * (frm + (to - frm) * e))
    return caption(im.crop((0, y, W, y + H)), t)

ICON = Image.open(APP / 'assets/icon.png').convert('RGB').crop((143, 143, 881, 881)).resize((330, 330), Image.LANCZOS)
ICON_LUM = np.asarray(ICON.convert('L'), np.float32)
def end(t):
    im = to_im(canvas(300, 0.25)); d = ImageDraw.Draw(im)
    a = min(1, (t - END) / 0.8)
    im.paste(ICON, ((W - 330) // 2, 360), Image.fromarray(np.clip((ICON_LUM - 28) * 5 * a, 0, 255).astype(np.uint8)))
    if t > END + 0.6: centered(d, 790, 'tonight.', BLACK(64), INK)
    if t > END + 1.1: centered(d, 870, 'come together.', MONO(32), INK)
    if t > END + 1.6: centered(d, 940, 'now on the App Store', MONO(28), PINKT)
    return im

def frame(t):
    if t < PEAK: return build(t)
    if t < AFTER_END: return peak_and_after(t)
    if t < S2: return screen(t, AD / 'screens/04-boundaries-new.png', S1, S2, 0.2, 0.62)
    if t < S3: return screen(t, AD / 'screens/03-discover-lotte.png', S2, S3, 0.15, 0.55)
    if t < END: return screen(t, APP / 'store/screenshots/iphone-6.9/06-guides.png', S3, END, 0.0, 0.5)
    return end(t)

pic = WORK / 'picture.mp4'
p = subprocess.Popen([FF, '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
                      '-vf', 'noise=alls=12:allf=t+u,vignette=PI/5,format=yuv420p', '-c:v', 'libx264', '-crf', '17', str(pic)],
                     stdin=subprocess.PIPE)
for i in range(int(TOTAL * FPS)):
    p.stdin.write(frame(i / FPS).tobytes())
p.stdin.close(); p.wait()
print('picture done')

# ---------------- sound: breathing only
# Breath = air noise shaped by the mouth's resonances (formants), plus a faint breathy voice that grows with the build.
rng = np.random.default_rng(3)
N = int(TOTAL * SR)
mix = np.zeros((N, 2), np.float32)
def bp(x, f, bw):
    return sosfilt(butter(2, [max(20, f - bw), f + bw], 'bandpass', fs=SR, output='sos'), x)
def lp(x, f):
    return sosfilt(butter(1, f, 'lowpass', fs=SR, output='sos'), x)
AH = [(860, 130, 1.0), (1520, 170, 0.6), (2950, 260, 0.38), (4150, 380, 0.22)]   # female open mouth, soft "haah"
HI = [(2300, 450, 0.55), (3700, 600, 0.8), (5600, 900, 0.5)]                     # airy, breathy inhale
shape = lambda x, fs: sum(bp(x, f, bw) * g for f, bw, g in fs)

def add(sig, t, gain=1.0, pan=0.0):
    i = int(t * SR); sig = sig[: max(0, N - i)]
    mix[i:i + len(sig), 0] += sig * gain * (1 - pan)
    mix[i:i + len(sig), 1] += sig * gain * (1 + pan)

def air(n):
    return lp(rng.standard_normal(n), 4500) * 0.6 + rng.standard_normal(n) * 0.06

def voice(n, f0a, f0b):
    tt = np.arange(n) / SR
    f0 = (f0a + (f0b - f0a) * tt / (n / SR)) * (1 + 0.01 * np.sin(2 * np.pi * 5 * tt) + 0.004 * rng.standard_normal(n).cumsum() / np.sqrt(n))
    ph = np.cumsum(f0) / SR % 1.0
    pulse = np.where(ph < 0.6, np.sin(np.pi * ph / 0.6) ** 2, 0.0)       # soft glottal pulses
    breathy = pulse * 0.5 + air(n) * pulse * 0.6                          # air leaking through the voice
    return shape(lp(breathy, 2500), AH)

def exhale(dur, v, f0):
    n = int(dur * SR); tt = np.arange(n) / SR
    env = (1 - np.exp(-tt / 0.06)) * np.exp(-tt / (dur * 0.5))          # softer onset, longer tail
    return (shape(air(n), AH) * 0.8 + voice(n, f0, f0 * 0.82) * v) * env

def inhale(dur, v=0.0, f0=240):
    n = int(dur * SR); tt = np.arange(n) / SR
    env = (tt / dur) ** 1.5 * (1 - np.exp(-(dur - tt) / 0.012))
    return (shape(air(n), HI) * 0.7 + voice(n, f0, f0 * 1.15) * v * 0.35) * env

for i, b in enumerate(BEATS):
    L = level(b)
    jitter = rng.uniform(-0.02, 0.02)
    gap = (BEATS[i + 1] - b) if i + 1 < len(BEATS) else PEAK - b
    prev_gap = (b - BEATS[i - 1]) if i else 1.2
    ind = min(0.55, prev_gap * 0.45)
    f0 = 235 + 125 * L                                                   # female range, rising with the build
    add(inhale(ind, 0.15 + 0.5 * L, f0 * 1.1), b - ind + jitter, (0.35 + 0.25 * L) * rng.uniform(0.85, 1.1), pan=-0.08)
    add(exhale(min(0.8, gap * 0.9), 0.3 + 0.7 * L, f0), b + jitter, (0.45 + 0.35 * L) * rng.uniform(0.85, 1.1), pan=0.08)

# the peak: one deep inhale, one long sighing exhale; then a calm, slow breath
add(inhale(0.5, 0.7, 380), PEAK - 0.5, 0.7)
add(exhale(2.8, 1.0, 390), PEAK, 0.95)                                  # long, high sigh falling away
add(inhale(0.9, 0.1, 260), PEAK + 1.9, 0.25)
add(exhale(1.8, 0.25, 240), PEAK + 2.8, 0.32)

# small room
for delay, g in ((0.019, 0.14), (0.037, 0.1), (0.061, 0.06)):          # close, intimate room
    d = int(delay * SR); mix[d:] += mix[:-d] * g

breath_wav = WORK / 'breath.wav'
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
inputs += ['-ss', '0.3', '-i', str(AD / 'clips/05-city.mp4'), '-ss', '0.3', '-i', str(AD / 'clips/03-dancers.mp4')]
start = AFTER_END - 0.6
chains.append(f'[{m}:a][{m + 1}:a]acrossfade=d=1:c1=tri:c2=tri,lowpass=f=2600,volume=0.3,afade=in:d=1.5,'
              f'afade=out:st={TOTAL - start - 1.6:.2f}:d=1.6,adelay={int(start * 1000)}|{int(start * 1000)}[bed]')
fc = ';'.join(chains) + ';[br]' + ''.join(f'[v{k}]' for k in range(len(VO_AT))) + \
     f'[bed]amix=inputs={len(VO_AT) + 2}:normalize=0,atrim=0:{TOTAL},loudnorm=I=-14:TP=-1.5:LRA=11,aresample=48000[a]'
audio = WORK / 'audio.wav'
subprocess.run([FF, '-v', 'error', '-y', *inputs, '-filter_complex', fc, '-map', '[a]', '-ac', '2', str(audio)], check=True)
subprocess.run([FF, '-v', 'error', '-y', '-i', str(pic), '-i', str(audio), '-map', '0:v', '-map', '1:a', '-c:v', 'copy',
                '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', str(OUT)], check=True)
print('beats', len(BEATS), 'done', OUT)
