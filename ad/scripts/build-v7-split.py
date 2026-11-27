"""v7 "Two phones, one night": split screen, Lotte on top and Daan below, the same evening at the same time,
until they meet at the bar door. Realistic Flow clips (Veo 3.1 Lite) of the demo profiles Lotte and Daan.
usage (from the ad folder): python scripts/build-v7-split.py   -> out/tonight-ad-v7-split.mp4
Clips in clips-v7/: 01-lotte-home, 02-daan-home, 03-lotte-typing, 04-daan-leaves, 05-bar-door, 06-bar-inside.
A clip that isn't there yet becomes a dark "coming" placeholder, so a draft can be built early."""
import subprocess
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

AD = Path(__file__).resolve().parent.parent
APP = AD.parent
FF = str(AD / 'node_modules/ffmpeg-static/ffmpeg.exe')
CL = AD / 'clips-v7'
WORK = AD / 'parts-v7'; WORK.mkdir(exist_ok=True)
OUT = AD / 'out/tonight-ad-v7-split.mp4'
W, H, FPS = 720, 1280, 24
F = 'C:/Windows/Fonts/'
MONO = lambda s: ImageFont.truetype(F + 'consolab.ttf', s)
BLACK = lambda s: ImageFont.truetype(F + 'ariblk.ttf', s)

def esc(p): return str(p).replace('\\', '/').replace(':', '\\:')

def label_png(name, lines, y, size=30, box=True):
    """Transparent overlay with one or more mono labels (timestamps / captions)."""
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    for i, (text, col) in enumerate(lines):
        f = MONO(size); w = d.textlength(text, font=f) + 26; yy = y + i * (size + 16)
        if box: d.rectangle([W / 2 - w / 2, yy - size * 0.7, W / 2 + w / 2, yy + size * 0.7], fill=(0, 0, 0, 200))
        d.text((W / 2, yy), text, font=f, fill=col, anchor='mm')
    p = WORK / f'{name}.png'; im.save(p); return p

YEL, PINK, INK = (255, 231, 163), (255, 127, 181), (244, 239, 234)
GRADE = 'eq=contrast=1.05:saturation=0.95,vignette=PI/5,noise=alls=7:allf=t+u'

def clip_or_placeholder(name, ss, dur, w, h, crop_y=0.3):
    """A clip scaled to fill w x h (crop_y picks which part of the tall clip stays), or a placeholder."""
    src = CL / f'{name}.mp4'
    if src.exists():
        return ['-ss', str(ss), '-t', str(dur), '-i', str(src)], \
               f'scale={w}:-2,crop={w}:{h}:0:(ih-{h})*{crop_y},fps={FPS},{GRADE}'
    ph = WORK / f'ph-{name}-{w}x{h}.png'
    im = Image.new('RGB', (w, h), (22, 18, 26)); d = ImageDraw.Draw(im)
    d.text((w / 2, h / 2), f'[{name}]\ncoming after the credit refill', font=MONO(24), fill=(150, 140, 155), anchor='mm', align='center')
    im.save(ph)
    return ['-loop', '1', '-framerate', str(FPS), '-t', str(dur), '-i', str(ph)], f'fps={FPS},{GRADE}'

parts = []
def render(name, inputs, fc, dur):
    out = WORK / f'{len(parts):02d}-{name}.mp4'
    subprocess.run([FF, '-v', 'error', '-y', *inputs, '-filter_complex', fc, '-map', '[v]', '-t', str(dur), '-an',
                    '-c:v', 'libx264', '-crf', '17', '-pix_fmt', 'yuv420p', str(out)], check=True)
    parts.append((out, dur))

def split(name, top, bottom, dur, top_lbl, bot_lbl):
    """Top half Lotte, bottom half Daan, a thin line between, a timestamp on each half."""
    (ti, tf), (bi, bf) = top, bottom
    lt = label_png(f'{name}-lbl', [top_lbl], 600, 28)
    lb = label_png(f'{name}-lbl2', [bot_lbl], 1240, 28)
    fc = f'[0:v]{tf}[t];[1:v]{bf}[b];[t][b]vstack,drawbox=x=0:y=638:w={W}:h=4:color=0xF0287A:t=fill[s];' \
         f'[s][2:v]overlay[s2];[s2][3:v]overlay[v]'
    render(name, [*ti, *bi, '-i', str(lt), '-i', str(lb)], fc, dur)

def full(name, clip, ss, dur, lines, crop_y=0.5):
    i, f = clip_or_placeholder(clip, ss, dur, W, H, crop_y)
    lbl = label_png(f'{name}-lbl', lines, int(H * 0.84), 30)
    render(name, [*i, '-i', str(lbl)], f'[0:v]{f}[c];[c][1:v]overlay[v]', dur)

def screen(name, png, dur, frm, to, lines):
    lbl = label_png(f'{name}-lbl', lines, int(H * 0.84), 30)
    fc = f"[0:v]scale={W}:-2,crop={W}:{H}:0:'(ih-{H})*({frm}+({to}-{frm})*t/{dur})',{GRADE},fade=in:d=0.15[c];[c][1:v]overlay[v]"
    render(name, ['-loop', '1', '-framerate', str(FPS), '-t', str(dur), '-i', str(png), '-i', str(lbl)], fc, dur)

def end(name, dur):
    icon = Image.open(APP / 'assets/icon.png').convert('RGB').crop((143, 143, 881, 881)).resize((330, 330), Image.LANCZOS)
    im = Image.new('RGB', (W, H), (14, 12, 16)); im.paste(icon, ((W - 330) // 2, 360)); d = ImageDraw.Draw(im)
    d.text((W / 2, 790), 'tonight.', font=BLACK(64), fill=INK, anchor='mm')
    d.text((W / 2, 870), 'take the vow. meet tonight.', font=MONO(32), fill=INK, anchor='mm')
    d.text((W / 2, 940), 'now on the App Store', font=MONO(28), fill=PINK, anchor='mm')
    p = WORK / 'end.png'; im.save(p)
    render(name, ['-loop', '1', '-framerate', str(FPS), '-t', str(dur), '-i', str(p)],
           f'[0:v]noise=alls=7:allf=t+u,fade=in:d=0.5,fade=out:st={dur - 0.6}:d=0.6[v]', dur)

# ---------------- the story
split('home', clip_or_placeholder('01-lotte-home', 0.0, 4.2, W, 640, 0.25),
      clip_or_placeholder('02-daan-home', 0.0, 4.2, W, 640, 0.42), 4.2,
      ('21:04 · she goes live', YEL), ('21:04 · so does he', YEL))
split('home2', clip_or_placeholder('01-lotte-home', 4.2, 3.4, W, 640, 0.25),
      clip_or_placeholder('02-daan-home', 4.2, 3.4, W, 640, 0.42), 3.4,
      ('21:06 · drinks first. no pressure.', YEL), ('21:06 · same.', YEL))
screen('discover', AD / 'screens/03-discover-lotte.png', 3.0, 0.2, 0.62, [("21:09 · here tonight · 2 km away", YEL)])
screen('after', AD / 'screens/04-boundaries-new.png', 2.6, 0.25, 0.6, [("21:10 · it's mutual.", YEL)])
split('leave', clip_or_placeholder('03-lotte-typing', 0.5, 3.6, W, 640, 0.3),
      clip_or_placeholder('04-daan-leaves', 0.5, 3.6, W, 640, 0.35), 3.6,
      ('21:12 · "café de wolf, 22:00?"', YEL), ('21:12 · "see you there."', YEL))
full('door', '05-bar-door', 0.0, 5.0, [('21:58', YEL)], 0.45)
full('inside', '06-bar-inside', 0.5, 4.0, [('22:03', YEL)], 0.5)
end('end', 3.8)

# ---------------- join, music bed + the clips' own room sound
lst = WORK / 'list.txt'
lst.write_text('\n'.join(f"file '{p.as_posix()}'" for p, _ in parts))
pic = WORK / 'picture.mp4'
subprocess.run([FF, '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', str(lst), '-c', 'copy', str(pic)], check=True)
total = sum(d for _, d in parts)
bed = ['-ss', '0.3', '-i', str(AD / 'clips/05-city.mp4'), '-ss', '0.3', '-i', str(AD / 'clips/02-phone.mp4'),
       '-ss', '0.3', '-i', str(AD / 'clips/03-dancers.mp4'), '-ss', '0.3', '-i', str(AD / 'clips/05-city.mp4')]
fc = '[1:a][2:a]acrossfade=d=1[x1];[x1][3:a]acrossfade=d=1[x2];[x2][4:a]acrossfade=d=1,lowpass=f=3500,volume=0.5,' \
     f'afade=in:d=1,afade=out:st={total - 1.8:.2f}:d=1.8,atrim=0:{total}[a0];[a0]loudnorm=I=-14:TP=-1.5:LRA=11,aresample=48000[a]'
subprocess.run([FF, '-v', 'error', '-y', '-i', str(pic), *bed, '-filter_complex', fc, '-map', '0:v', '-map', '[a]',
                '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', str(OUT)], check=True)
print('length', round(total, 2), 'done', OUT)
