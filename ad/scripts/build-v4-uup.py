"""v4 "u up?" ad: the other apps' greatest hits in a chat, then the turn to Tonight.
usage (from the ad folder): python scripts/build-v4-uup.py   -> out/tonight-ad-v4-uup.mp4
Edit CHAT (the messages and their times) or the TIMELINE numbers below and rebuild.
Voice: scripts/lines-v4-uup.txt -> npm run vo -- scripts/lines-v4-uup.txt vo-v4-uup en-GB-SoniaNeural -12% -12Hz"""
import math, random, subprocess
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter

AD = Path(__file__).resolve().parent.parent
APP = AD.parent
FF = str(AD / 'node_modules/ffmpeg-static/ffmpeg.exe')
WORK = AD / 'parts-v4'; WORK.mkdir(exist_ok=True)
OUT = AD / 'out/tonight-ad-v4-uup.mp4'
VO = AD / 'vo-v4-uup'
W, H, FPS = 720, 1280, 24
BG = (14, 12, 16)
INK, MUTED = (244, 239, 234), (138, 130, 140)
PINK, BUBBLE = (240, 40, 122), (38, 34, 40)
F = 'C:/Windows/Fonts/'
font = lambda name, s: ImageFont.truetype(F + name, s)
REG, SEMI, BOLD = (lambda s: font('segoeui.ttf', s)), (lambda s: font('seguisb.ttf', s)), (lambda s: font('segoeuib.ttf', s))
EMOJI = font('seguiemj.ttf', 40)
MONO = lambda s: font('consolab.ttf', s)
BLACK = lambda s: font('ariblk.ttf', s)

# ---- the chat: (time, kind, text). kinds: in, out, time, photo, sys, typing (text = duration)
CHAT = [
    (0.5, 'typing', 0.6), (1.1, 'in', 'hey'),
    (1.9, 'time', 'Mon 23:47'), (2.1, 'in', 'hey'),
    (2.9, 'time', 'Tue 02:13'), (3.1, 'in', 'wyd'),
    (3.8, 'in', 'u up?'),
    (4.7, 'out', 'hi! what are you looking for?'),
    (5.3, 'typing', 1.3), (6.6, 'in', 'idk just seeing where it goes'),
    (7.3, 'in', 'good vibes only 😜'),
    (8.0, 'photo', 'sent a photo'),
    (8.8, 'time', 'Thu 01:58'), (9.0, 'in', '??'),
    (9.4, 'in', 'hello'),
    (9.8, 'in', 'k'),
    (10.5, 'sys', 'Jason unmatched you'),
]
FLOOD_START, FLOOD_END = 11.3, 12.9      # every other chat at once
BLACK_START = 12.9                       # silence
TURN = 13.5                              # "or..."
SAY = 14.3                               # "say what you want / before you match."
BOUND = 18.3                             # boundaries screen
DISC = 21.2                              # Discover screen with Lotte
END = 23.6                               # logo
TOTAL = 27.2

ease = lambda x: 1 - (1 - max(0, min(1, x))) ** 3

def text_w(d, s, f):
    return d.textlength(s, font=f)

def draw_text(d, xy, s, f, fill):
    """Text with colour emoji: split emoji runs onto the emoji font."""
    x, y = xy
    run, is_e = '', None
    def flush(r, e):
        nonlocal x
        if not r: return
        ff = EMOJI if e else f
        d.text((x, y + (2 if e else 0)), r, font=ff, fill=fill, embedded_color=e)
        x += d.textlength(r, font=ff)
    for ch in s:
        e = ord(ch) > 0x2000
        if is_e is not None and e != is_e:
            flush(run, is_e); run = ''
        run += ch; is_e = e
    flush(run, is_e)

def mixed_w(d, s, f):
    return sum(d.textlength(c, font=EMOJI if ord(c) > 0x2000 else f) for c in s)

# ---- chat layout (fixed; only visibility and scroll change over time)
probe = ImageDraw.Draw(Image.new('RGB', (1, 1)))
MSG = REG(40)
items, y = [], 0
for t, kind, txt in CHAT:
    if kind == 'typing':
        items.append(dict(t=t, end=t + txt, kind=kind, y=y, h=86)); continue
    if kind == 'time':
        h = 64
    elif kind == 'sys':
        h = 90
    elif kind == 'photo':
        h = 330
    else:
        h = 86
    items.append(dict(t=t, kind=kind, txt=txt, y=y, h=h)); y += h + 14
CHAT_TOP, CHAT_BOTTOM = 230, H - 170

def chat_frame(t):
    im = Image.new('RGB', (W, H), BG); d = ImageDraw.Draw(im)
    # header: a generic match, nothing app-specific
    d.ellipse([40, 92, 112, 164], fill=(70, 64, 74))
    d.ellipse([62, 106, 90, 134], fill=(110, 102, 112)); d.pieslice([50, 132, 102, 190], 180, 360, fill=(110, 102, 112))
    d.text((132, 102), 'Jason', font=BOLD(40), fill=INK)
    d.text((132, 148), 'matched 3 days ago', font=REG(26), fill=MUTED)
    d.line([(0, 200), (W, 200)], fill=(34, 30, 36), width=2)
    # input bar
    d.rounded_rectangle([30, H - 130, W - 30, H - 60], 35, outline=(58, 52, 57), width=2)
    d.text((64, H - 95), 'Message…', font=REG(32), fill=(90, 84, 92), anchor='lm')

    visible = [it for it in items if t >= it['t'] and not (it['kind'] == 'typing' and t > it['end'])]
    bottom = max([it['y'] + it['h'] for it in visible], default=0)
    scroll = max(0, bottom - (CHAT_BOTTOM - CHAT_TOP))
    # smooth the scroll a little
    for it in visible:
        a = ease((t - it['t']) / 0.18)
        top = CHAT_TOP + it['y'] - scroll + int((1 - a) * 24)
        if top + it['h'] < CHAT_TOP - 20: continue
        k = it['kind']
        if k == 'time':
            d.text((W // 2, top + 30), it['txt'], font=SEMI(24), fill=MUTED, anchor='mm')
        elif k == 'sys':
            s = it['txt']; w = text_w(d, s, SEMI(28)) + 48
            d.rounded_rectangle([W / 2 - w / 2, top + 16, W / 2 + w / 2, top + 74], 29, fill=(30, 27, 32))
            d.text((W // 2, top + 45), s, font=SEMI(28), fill=(200, 120, 140), anchor='mm')
        elif k == 'typing':
            d.rounded_rectangle([40, top, 170, top + 80], 40, fill=BUBBLE)
            for i in range(3):
                ph = math.sin((t - it['t']) * 9 - i * 0.9)
                c = 120 + int(80 * (ph + 1) / 2)
                d.ellipse([70 + i * 26, top + 32 - int(4 * ph), 86 + i * 26, top + 48 - int(4 * ph)], fill=(c, c - 6, c))
        elif k == 'photo':
            ph = Image.open(APP / 'assets/demo-raw/daan/1.jpg').convert('RGB').resize((260, 320))
            ph = ph.filter(ImageFilter.GaussianBlur(28))
            ov = Image.new('RGB', ph.size, (60, 20, 40)); ph = Image.blend(ph, ov, 0.45)
            m = Image.new('L', ph.size, 0); ImageDraw.Draw(m).rounded_rectangle([0, 0, 259, 319], 30, fill=255)
            im.paste(ph, (40, top), m)
            d.ellipse([140, top + 110, 200, top + 170], outline=(255, 255, 255), width=6)
            d.line([(150, top + 160), (190, top + 120)], fill=(255, 255, 255), width=6)
            d.text((170, top + 210), 'sent a photo', font=SEMI(28), fill=INK, anchor='mm')
            d.text((170, top + 248), 'nobody asked', font=REG(24), fill=(230, 180, 200), anchor='mm')
        else:
            s = it['txt']; w = mixed_w(d, s, MSG) + 56
            if k == 'in':
                box = [40, top, 40 + w, top + 80]; fill = BUBBLE
            else:
                box = [W - 40 - w, top, W - 40, top + 80]; fill = PINK
            d.rounded_rectangle(box, 40, fill=fill)
            draw_text(d, (box[0] + 28, top + 13), s, MSG, INK)
    # cover anything scrolled under the header
    d.rectangle([0, 0, W, 199], fill=BG)
    d.ellipse([40, 92, 112, 164], fill=(70, 64, 74))
    d.ellipse([62, 106, 90, 134], fill=(110, 102, 112)); d.pieslice([50, 132, 102, 190], 180, 360, fill=(110, 102, 112))
    d.text((132, 102), 'Jason', font=BOLD(40), fill=INK)
    d.text((132, 148), 'matched 3 days ago', font=REG(26), fill=MUTED)
    return im

FLOOD_TXT = ['hey', 'hey', 'wyd', 'u up?', 'hey 😏', 'hi', 'good vibes only', 'wyd rn', 'u up', 'hey', 'send pic?', 'lol', 'k', 'hey stranger', 'u still up?', 'hey']
random.seed(7)
FLOOD = []
n, tt = 0, FLOOD_START
while tt < FLOOD_END:
    FLOOD.append((tt, FLOOD_TXT[n % len(FLOOD_TXT)], random.randint(30, 420), random.randint(80, H - 160)))
    n += 1; tt += max(0.035, 0.16 * (1 - (tt - FLOOD_START) / (FLOOD_END - FLOOD_START)) ** 1.5)

def flood_frame(t):
    im = chat_frame(t); d = ImageDraw.Draw(im)
    for t0, s, x, y in FLOOD:
        if t < t0: break
        w = mixed_w(d, s, MSG) + 56
        d.rounded_rectangle([x, y, x + w, y + 80], 40, fill=BUBBLE, outline=(20, 18, 22), width=3)
        draw_text(d, (x + 28, y + 13), s, MSG, INK)
    return im

def type_on(d, s, f, cx, y, t, t0, cps=22, fill=INK):
    k = int(max(0, (t - t0)) * cps)
    x = cx - d.textlength(s, font=f) / 2   # start where the full line will start, so it doesn't wobble
    d.text((x, y), s[:k], font=f, fill=fill, anchor='lm')

def turn_frame(t):
    im = Image.new('RGB', (W, H), BG); d = ImageDraw.Draw(im)
    if t >= TURN and t < SAY:
        type_on(d, 'or…', MONO(64), W // 2, H // 2, t, TURN, cps=8)
    if t >= SAY:
        type_on(d, 'say what you want', BLACK(56), W // 2, H // 2 - 50, t, SAY, cps=18)
        type_on(d, 'before you match.', BLACK(56), W // 2, H // 2 + 40, t, SAY + 1.3, cps=18, fill=PINK)
    return im

def screen_frame(t, png, t0, dur, frm, to, caption):
    im = Image.open(png).convert('RGB')
    im = im.resize((W, round(im.height * W / im.width)), Image.LANCZOS)
    p = (t - t0) / dur
    y = int((im.height - H) * (frm + (to - frm) * ease(p)))
    fr = im.crop((0, y, W, y + H)); d = ImageDraw.Draw(fr)
    if caption:
        f = MONO(30); w = d.textlength(caption, font=f) + 36
        d.rectangle([W / 2 - w / 2, H * 0.86 - 26, W / 2 + w / 2, H * 0.86 + 26], fill=(0, 0, 0))
        d.text((W // 2, int(H * 0.86)), caption, font=f, fill=(255, 231, 163), anchor='mm')
    return fr

ICON = Image.open(APP / 'assets/icon.png').convert('RGB')
ICON = ICON.crop((143, 143, 881, 881)).resize((330, 330), Image.LANCZOS)
def end_frame(t):
    im = Image.new('RGB', (W, H), BG); d = ImageDraw.Draw(im)
    a = ease((t - END) / 0.8)
    ic = Image.blend(Image.new('RGB', ICON.size, BG), ICON, a)
    im.paste(ic, ((W - 330) // 2, 360))
    if t > END + 0.6: d.text((W // 2, 790), 'tonight.', font=BLACK(64), fill=INK, anchor='mm')
    if t > END + 1.1: d.text((W // 2, 870), 'say what you want.', font=MONO(32), fill=INK, anchor='mm')
    if t > END + 1.6: d.text((W // 2, 940), 'now on the App Store', font=MONO(28), fill=(255, 127, 181), anchor='mm')
    return im

def frame(t):
    if t < FLOOD_START: return chat_frame(t)
    if t < BLACK_START: return flood_frame(t)
    if t < BOUND: return turn_frame(t)
    if t < DISC: return screen_frame(t, AD / 'screens/04-boundaries-new.png', BOUND, DISC - BOUND, 0.0, 0.5, 'yes. maybe. no.')
    if t < END: return screen_frame(t, AD / 'screens/03-discover-lotte.png', DISC, END - DISC, 0.15, 0.6, 'matched on what you both want.')
    return end_frame(t)

# ---- picture: raw frames piped into ffmpeg, grain + slight vignette on top
pic = WORK / 'picture.mp4'
nframes = int(TOTAL * FPS)
p = subprocess.Popen([FF, '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
                      '-vf', 'noise=alls=10:allf=t+u,vignette=PI/6,format=yuv420p', '-c:v', 'libx264', '-crf', '17', str(pic)],
                     stdin=subprocess.PIPE)
for i in range(nframes):
    p.stdin.write(frame(i / FPS).tobytes())
p.stdin.close(); p.wait()
print('picture done', nframes, 'frames')

# ---- sound: message pings, the flood, a hit at the turn, voice, music under the end
ping = lambda f1, f2, dur=0.35: f"aevalsrc='0.35*(sin(2*PI*{f1}*t)+0.6*sin(2*PI*{f2}*t))*exp(-12*t)':s=48000:d={dur}"
events = []  # (time, sound-file)
snd = WORK / 'ping_in.wav'; snd_out = WORK / 'ping_out.wav'; thud = WORK / 'thud.wav'; unmatch = WORK / 'unmatch.wav'
subprocess.run([FF, '-v', 'error', '-y', '-f', 'lavfi', '-i', ping(1318, 1976), str(snd)], check=True)
subprocess.run([FF, '-v', 'error', '-y', '-f', 'lavfi', '-i', ping(880, 1318, 0.25), str(snd_out)], check=True)
subprocess.run([FF, '-v', 'error', '-y', '-f', 'lavfi', '-i', "aevalsrc='0.9*sin(2*PI*(55-20*t)*t)*exp(-3*t)':s=48000:d=1.6", str(thud)], check=True)
subprocess.run([FF, '-v', 'error', '-y', '-f', 'lavfi', '-i', "aevalsrc='0.3*sin(2*PI*(520-300*t)*t)*exp(-5*t)':s=48000:d=0.6", str(unmatch)], check=True)
for t, kind, _ in CHAT:
    if kind in ('in', 'photo'): events.append((t, snd, 1.0))
    if kind == 'out': events.append((t, snd_out, 1.0))
    if kind == 'sys': events.append((t, unmatch, 1.0))
for t0, *_ in FLOOD: events.append((t0, snd, 0.55))
events.append((TURN - 0.1, thud, 1.0))
vo_times = [TURN + 0.1, SAY + 0.2, BOUND + 0.3, DISC + 0.25, END + 0.6]
for i, t in enumerate(vo_times): events.append((t, VO / f'{i:02d}.wav', 2.2))

inputs, chains = [], []
for k, (t, f, vol) in enumerate(events):
    inputs += ['-i', str(f)]
    ms = int(t * 1000)
    chains.append(f'[{k}:a]aresample=48000,aformat=channel_layouts=stereo,volume={vol},adelay={ms}|{ms}[e{k}]')
# music: the clips' soundtrack under the screens and logo
bed_i = len(events)
inputs += ['-ss', '0.3', '-i', str(AD / 'clips/03-dancers.mp4'), '-ss', '0.3', '-i', str(AD / 'clips/05-city.mp4')]
chains.append(f'[{bed_i}:a][{bed_i + 1}:a]acrossfade=d=1:c1=tri:c2=tri,lowpass=f=3000,volume=0.35,'
              f'afade=in:d=0.4,afade=out:st={TOTAL - BOUND - 1.5:.2f}:d=1.5,adelay={int(BOUND * 1000) - 300}|{int(BOUND * 1000) - 300}[bed]')
mix = ''.join(f'[e{k}]' for k in range(len(events))) + '[bed]'
fc = ';'.join(chains) + f';{mix}amix=inputs={len(events) + 1}:normalize=0,atrim=0:{TOTAL},' \
     'aecho=0.8:0.5:40:0.08,loudnorm=I=-14:TP=-1.5:LRA=11,aresample=48000[a]'
audio = WORK / 'audio.wav'
subprocess.run([FF, '-v', 'error', '-y', *inputs, '-filter_complex', fc, '-map', '[a]', '-ac', '2', str(audio)], check=True)

subprocess.run([FF, '-v', 'error', '-y', '-i', str(pic), '-i', str(audio), '-map', '0:v', '-map', '1:a', '-c:v', 'copy',
                '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', str(OUT)], check=True)
print('done', OUT)
