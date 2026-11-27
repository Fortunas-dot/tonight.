"""Image ads for Tonight: 5 concepts (+2 carousel slides) in 3 sizes.
usage (from the ad folder): python scripts/build-images.py  -> out/images/<concept>-<size>.png
Sizes: 4x5 = 1080x1350 (feed), 9x16 = 1080x1920 (Stories/Reels, keeps the top/bottom clear of Instagram's UI),
1x1 = 1080x1080. Fonts are the app's own (Bricolage Grotesque, Inter). Edit the COPY dict to change any wording."""
import subprocess
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

AD = Path(__file__).resolve().parent.parent
APP = AD.parent
OUT = AD / 'out/images'; OUT.mkdir(parents=True, exist_ok=True)
FF = str(AD / 'node_modules/ffmpeg-static/ffmpeg.exe')
FONTS = APP / 'node_modules/@expo-google-fonts'
BRIC = lambda s: ImageFont.truetype(str(FONTS / 'bricolage-grotesque/800ExtraBold/BricolageGrotesque_800ExtraBold.ttf'), s)
INTER = lambda s, w='600SemiBold': ImageFont.truetype(str(FONTS / f'inter/{w}/Inter_{w}.ttf'), s)
EMOJI = ImageFont.truetype('C:/Windows/Fonts/seguiemj.ttf', 40)

BG = (14, 12, 16); INK = (244, 239, 234); MUTED = (163, 154, 162)
PINK = (240, 40, 122); PINKL = (255, 127, 181); VIOLET = (123, 60, 255); BLUE = (59, 123, 255)
YES, MAYBE, NO = (46, 204, 113), (245, 183, 49), (231, 76, 60)
SIZES = {'4x5': (1080, 1350), '9x16': (1080, 1920), '1x1': (1080, 1080)}

# ---------------------------------------------------------------- helpers
def background(W, H, glows=((0.2, 0.15, PINK, 0.55), (0.9, 0.55, VIOLET, 0.45), (0.15, 0.95, BLUE, 0.3))):
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    img = np.broadcast_to(np.array(BG, np.float32), (H, W, 3)).copy()
    r = max(W, H) * 0.42
    for gx, gy, col, s in glows:
        img += np.exp(-(((xx - gx * W) ** 2 + (yy - gy * H) ** 2) / (r * r)))[..., None] * np.array(col, np.float32) * s
    noise = np.random.default_rng(1).normal(0, 4, (H, W, 1))
    return Image.fromarray(np.clip(img + noise, 0, 255).astype(np.uint8))

def safe(H):
    """(top, bottom) margins; Stories keep clear of the profile bar and reply box."""
    return (260, 340) if H > 1500 else (int(H * 0.075), int(H * 0.075))

def wrap(d, text, font, width):
    words, lines, cur = text.split(), [], ''
    for w in words:
        t = (cur + ' ' + w).strip()
        if d.textlength(t, font=font) <= width or not cur: cur = t
        else: lines.append(cur); cur = w
    lines.append(cur); return lines

def headline(d, text, x, y, width, size, fill=INK, max_lines=4, lh=1.02, align='left'):
    """Biggest Bricolage size (<= size) that fits in max_lines; returns the y below it."""
    while size > 30:
        f = BRIC(size); lines = []
        for pi, part in enumerate(text.split('\n')): lines += [(l, pi) for l in wrap(d, part, f, width)]
        if len(lines) <= max_lines: break
        size -= 4
    for i, (l, pi) in enumerate(lines):   # colour per paragraph, not per wrapped line
        lx = x if align == 'left' else x + (width - d.textlength(l, font=f)) / 2
        d.text((lx, y + i * size * lh), l, font=f, fill=fill if not isinstance(fill, list) else fill[pi % len(fill)])
    return y + len(lines) * size * lh

STORE_LINE = 'casual dating · on the App Store'   # under the logo on every image
ICON = Image.open(APP / 'assets/icon.png').convert('RGB').crop((143, 143, 881, 881))
def logo(im, x, y, h=86, store=True, center=False, W=None):
    """App icon + 'tonight.' + 'now on the App Store'. Returns the lockup's width."""
    icon = ICON.resize((h, h), Image.LANCZOS)
    mask = Image.fromarray(np.clip((np.asarray(icon.convert('L'), np.float32) - 28) * 5, 0, 255).astype(np.uint8))
    d = ImageDraw.Draw(im)
    f1, f2 = BRIC(int(h * 0.62)), INTER(int(h * 0.27), '500Medium')
    tw = max(d.textlength('tonight.', font=f1), d.textlength(STORE_LINE, font=f2) if store else 0)
    total = h + 18 + tw
    if center: x = (W - total) / 2
    im.paste(icon, (int(x), int(y)), mask)
    if store:
        d.text((x + h + 18, y + h * 0.05), 'tonight.', font=f1, fill=INK)
        d.text((x + h + 18, y + h * 0.66), STORE_LINE, font=f2, fill=PINKL)
    else:
        d.text((x + h + 18, y + h * 0.18), 'tonight.', font=f1, fill=INK)
    return total

def store_phone(png, top_frac=0.235, bottom=None):
    """The phone (with app screen) cut out of an App Store screenshot, without the store headline."""
    im = Image.open(png).convert('RGB')
    y0 = int(im.height * top_frac)
    return im.crop((40, y0, im.width - 40, bottom or im.height))

def paste_fade(base, img, x, y, fade_bottom=0, fade_top=0):
    m = Image.new('L', img.size, 255); md = ImageDraw.Draw(m)
    for i in range(fade_bottom): md.line([(0, img.height - 1 - i), (img.width, img.height - 1 - i)], fill=int(255 * i / fade_bottom))
    for i in range(fade_top): md.line([(0, i), (img.width, i)], fill=int(255 * i / fade_top))
    base.paste(img, (int(x), int(y)), m)

def bubble(d, x, y, text, side='in', size=40, W=1080):
    f = INTER(size, '500Medium')
    w = sum(d.textlength(c, font=EMOJI if ord(c) > 0x2000 else f) for c in text) + size * 1.3
    h = size * 2.0
    if side == 'out': x = W - x - w
    d.rounded_rectangle([x, y, x + w, y + h], h / 2, fill=PINK if side == 'out' else (38, 34, 40))
    cx = x + size * 0.65
    for c in text:
        ff = EMOJI if ord(c) > 0x2000 else f
        d.text((cx, y + h / 2 + (2 if ff is EMOJI else 0)), c, font=ff, fill=INK, anchor='lm', embedded_color=ff is EMOJI)
        cx += d.textlength(c, font=ff)
    return y + h

def frame_from(clip, t, out):
    subprocess.run([FF, '-nostdin', '-v', 'error', '-y', '-ss', str(t), '-i', str(clip), '-frames:v', '1', str(out)], check=True)
    return Image.open(out).convert('RGB')

def cover(img, w, h, fy=0.5):
    s = max(w / img.width, h / img.height)
    img = img.resize((round(img.width * s), round(img.height * s)), Image.LANCZOS)
    x = (img.width - w) // 2; y = int((img.height - h) * fy)
    return img.crop((x, y, x + w, y + h))

# ---------------------------------------------------------------- concepts
def uup(W, H):
    im = background(W, H, ((0.85, 0.2, VIOLET, 0.25), (0.1, 0.9, PINK, 0.35)))
    d = ImageDraw.Draw(im); top, bot = safe(H); m = 72
    y = top
    chat = [('in', 'hey'), ('time', 'Mon 23:47'), ('in', 'wyd'), ('in', 'u up?'), ('in', 'good vibes only 😜'),
            ('sys', 'Jason unmatched you')]
    if H < 1200: chat = [('in', 'hey'), ('in', 'wyd'), ('in', 'u up?'), ('sys', 'Jason unmatched you')]
    size = 46 if H > 1100 else 38
    for kind, t in chat:
        if kind == 'time':
            d.text((W / 2, y + 22), t, font=INTER(26), fill=MUTED, anchor='mm'); y += 56
        elif kind == 'sys':
            f = INTER(28); w = d.textlength(t, font=f) + 50
            d.rounded_rectangle([W / 2 - w / 2, y + 8, W / 2 + w / 2, y + 68], 30, fill=(30, 27, 32))
            d.text((W / 2, y + 38), t, font=f, fill=(210, 120, 140), anchor='mm'); y += 92
        else:
            y = bubble(d, m, y, t, size=size, W=W) + 16
    y += 30 if H > 1100 else 10
    y = headline(d, 'Keep it casual.\nJust say what you want first.', m, y, W - 2 * m, 84 if H > 1100 else 80, fill=[INK, PINKL])
    logo(im, m, H - bot - 90, 86)
    return im

def uup_slide2(W, H):
    im = background(W, H); d = ImageDraw.Draw(im); top, bot = safe(H); m = 72
    y = headline(d, 'Tonight asks first.', m, top, W - 2 * m, 110)
    d.text((m, y + 14), 'Casual dating on your terms: one night, regular FWB\nor open to more. Plus your yes / maybe / no.',
           font=INTER(34, '500Medium'), fill=MUTED, spacing=12)
    ph = store_phone(AD / 'screens/04-boundaries-new.png')
    ph_top = int(y + 150); ph_h = int(H - ph_top - (bot + 110))
    ph = ph.resize((int(ph.width * ph_h / ph.height), ph_h), Image.LANCZOS)
    paste_fade(im, ph, (W - ph.width) / 2, ph_top, fade_bottom=120)
    logo(im, 0, H - bot - 90, 86, center=True, W=W)
    return im

def ymn(W, H):
    im = background(W, H, ((0.9, 0.1, VIOLET, 0.35), (0.1, 0.6, PINK, 0.3)))
    d = ImageDraw.Draw(im); top, bot = safe(H); m = 72
    big = 230 if H > 1100 else 200
    y = top - 20
    for word, col in (('YES.', YES), ('MAYBE.', MAYBE), ('NO.', NO)):
        d.text((m - 8, y), word, font=BRIC(big), fill=col); y += big * 0.95
    y += 20
    y = headline(d, 'Casual dating.\nYour terms first.', m, y, W - 2 * m, 96 if H > 1100 else 80)
    if False:   # phone left out: it only showed as a cut-off sliver
        ph = store_phone(AD / 'screens/04-boundaries-new.png', top_frac=0.43)
        ph_w = 560 if H < 1500 else 700
        ph = ph.resize((ph_w, int(ph.height * ph_w / ph.width)), Image.LANCZOS)
        ph_y = int(max(y + 30, H - bot - 120 - min(ph.height, int(H * 0.5))))
        ph = ph.crop((0, 0, ph.width, min(ph.height, H - bot - 120 - ph_y)))
        paste_fade(im, ph, W - ph.width + 60, ph_y, fade_bottom=110)
    logo(im, m, H - bot - 90, 86)
    return im

def mask(W, H):
    im = Image.new('RGB', (W, H), BG)
    photo = cover(Image.open(APP / 'assets/demo-raw/lotte/masked-6.png').convert('RGB'), W, H, fy=0.25)
    im.paste(photo, (0, 0))
    shade = Image.new('L', (W, H), 0); sd = ImageDraw.Draw(shade)
    for yy in range(H):   # dark at the bottom (text) and a little at the top
        a = max(0, (yy - H * 0.42) / (H * 0.58)) ** 1.2 * 240 + max(0, (H * 0.15 - yy) / (H * 0.15)) * 90
        sd.line([(0, yy), (W, yy)], fill=int(min(250, a)))
    im = Image.composite(Image.new('RGB', (W, H), BG), im, shade)
    d = ImageDraw.Draw(im); top, bot = safe(H); m = 72
    yh = H - bot - 90 - (330 if H > 1100 else 280)
    headline(d, 'No strings.\nJust tonight.', m, yh, W - 2 * m, 120 if H > 1100 else 100, fill=[INK, PINKL])
    logo(im, m, H - bot - 90, 86)
    return im

def before(W, H):
    im = background(W, H, ((0.5, 0.2, (90, 90, 100), 0.35),)); d = ImageDraw.Draw(im); top, bot = safe(H); m = 72
    d.text((m, top), 'OTHER APPS', font=INTER(32, '700Bold'), fill=MUTED)
    y = top + 70
    items = ['Endless swiping', '“hey” … “wyd” … “u up?”', 'Guessing what they want', 'Ghosted after three days']
    size = 74 if H > 1100 else 62
    for it in items:
        lines = wrap(d, it, BRIC(size), W - 2 * m - 70)
        cx, cy, r = m + size * 0.35, y + size * 0.55, size * 0.26   # a drawn red cross
        d.line([(cx - r, cy - r), (cx + r, cy + r)], fill=NO, width=9); d.line([(cx - r, cy + r), (cx + r, cy - r)], fill=NO, width=9)
        for i, l in enumerate(lines):
            d.text((m + 80, y + i * size * 1.02), l, font=BRIC(size), fill=(120, 112, 122))
            lw = d.textlength(l, font=BRIC(size))
            d.line([(m + 80, y + i * size * 1.02 + size * 0.58), (m + 80 + lw, y + i * size * 1.02 + size * 0.58)], fill=(120, 112, 122), width=5)
        y += len(lines) * size * 1.02 + (46 if H > 1100 else 24)
    d.text((W - m, H - bot - 40), 'swipe →', font=INTER(36, '600SemiBold'), fill=PINKL, anchor='rm')
    return im

def after(W, H):
    im = background(W, H); d = ImageDraw.Draw(im); top, bot = safe(H); m = 72
    d.text((m, top), 'TONIGHT', font=INTER(32, '700Bold'), fill=PINKL)
    y = top + 70
    items = ['Casual. For tonight, not forever.', 'One night, FWB or open to more', 'Yes / maybe / no before you match',
             'A mask until you’re ready']
    size = 74 if H > 1100 else 60
    for it in items:
        lines = wrap(d, it, BRIC(size), W - 2 * m - 80)
        d.ellipse([m, y + size * 0.15, m + size * 0.8, y + size * 0.95], fill=YES)
        d.text((m + size * 0.4, y + size * 0.55), '✓', font=INTER(int(size * 0.55), '700Bold'), fill=BG, anchor='mm')
        for i, l in enumerate(lines):
            d.text((m + 90, y + i * size * 1.02), l, font=BRIC(size), fill=INK)
        y += len(lines) * size * 1.02 + (46 if H > 1100 else 22)
    logo(im, m, H - bot - 90, 86)
    return im

def split(W, H):
    im = Image.new('RGB', (W, H), BG); top, bot = safe(H)
    lot = frame_from(AD / 'clips-v7/01-lotte-home.mp4', 6.6, OUT / '_lotte.png')
    daa = frame_from(AD / 'clips-v7/02-daan-home.mp4', 4.0, OUT / '_daan.png')
    half = H // 2
    im.paste(cover(lot, W, half, 0.22), (0, 0)); im.paste(cover(daa, W, H - half, 0.4), (0, half))
    d = ImageDraw.Draw(im)
    d.rectangle([0, half - 3, W, half + 3], fill=PINK)
    def tag(text, y):
        f = INTER(32, '600SemiBold'); w = d.textlength(text, font=f) + 36
        d.rounded_rectangle([48, y, 48 + w, y + 58], 29, fill=(0, 0, 0)); d.text((66, y + 29), text, font=f, fill=(255, 231, 163), anchor='lm')
    band_h = 300 if H > 1100 else 240
    tag('21:04 · she goes live', max(top - 40, 40)); tag('21:04 · so does he', half + band_h // 2 + 30)
    # headline across the seam
    band = Image.new('RGB', (W, band_h), BG)
    im.paste(Image.blend(im.crop((0, half - band_h // 2, W, half + band_h // 2)), band, 0.72), (0, half - band_h // 2))
    d = ImageDraw.Draw(im)
    d.rectangle([0, half - band_h // 2, W, half - band_h // 2 + 4], fill=PINK); d.rectangle([0, half + band_h // 2 - 4, W, half + band_h // 2], fill=PINK)
    headline(d, 'Free tonight.\nKeeping it casual.', 0, half - band_h // 2 + 34, W, 110 if H > 1100 else 92, align='center', fill=[INK, PINKL])
    shade = Image.new('L', (W, 260), 0); sdd = ImageDraw.Draw(shade)
    for i in range(260): sdd.line([(0, i), (W, i)], fill=int(230 * i / 260))
    im.paste(Image.new('RGB', (W, 260), BG), (0, H - 260 - (bot - 120 if H > 1500 else 0)), shade)
    logo(im, 0, H - bot - 90, 86, center=True, W=W)
    return im

CONCEPTS = {'1-uup': uup, '1-uup-slide2': uup_slide2, '2-yes-maybe-no': ymn, '3-mask': mask,
            '4-before': before, '4-after': after, '5-split': split}
for name, fn in CONCEPTS.items():
    for sz, (W, H) in SIZES.items():
        fn(W, H).save(OUT / f'{name}-{sz}.png')
    print('made', name)
for p in OUT.glob('_*.png'): p.unlink()
