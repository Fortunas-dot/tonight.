"""Makes a copy of the Discover App Store screenshot with Lotte (demo profile, bunny mask) on the card
instead of Daan. Output: ad/screens/03-discover-lotte.png (used by build-v3-clear.mjs).
usage (from the ad folder): python scripts/discover-woman.py [photo]   default photo: lotte/masked-6.png
Coordinates are for the 1320x2868 iPhone 6.9" screenshot."""
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

AD = Path(__file__).resolve().parent.parent
APP = AD.parent
SRC = APP / 'store/screenshots/iphone-6.9/03-discover.png'
PHOTO = Path(sys.argv[1]) if len(sys.argv) > 1 else APP / 'assets/demo-raw/lotte/masked-6.png'
OUT = AD / 'screens/03-discover-lotte.png'
FONTS = Path('C:/Windows/Fonts')
bold = lambda s: ImageFont.truetype(str(FONTS / 'segoeuib.ttf'), s)
semi = lambda s: ImageFont.truetype(str(FONTS / 'seguisb.ttf'), s)

NAME, PLACE = 'Lotte, 28', 'Amsterdam · 2 km away'
CHIPS = [('Drinks first', 'pink'), ('Slow & sensual', 'pink'), ('Tested Nov', 'blue')]
CARD = (156, 1220, 1164, 2590)   # the photo card on the screenshot
RADIUS = 56

shot = Image.open(SRC).convert('RGBA')
x0, y0, x1, y1 = CARD
cw, ch = x1 - x0, y1 - y0

# 1) photo, cropped to fill the card (keep the top, where the face is)
p = Image.open(PHOTO).convert('RGB')
scale = max(cw / p.width, ch / p.height)
p = p.resize((round(p.width * scale), round(p.height * scale)), Image.LANCZOS)
left = (p.width - cw) // 2
p = p.crop((left, 0, left + cw, ch)).convert('RGBA')

# 2) dark gradient at the bottom so the name stays readable
grad = Image.new('RGBA', (cw, ch), (0, 0, 0, 0))
gd = ImageDraw.Draw(grad)
start = int(ch * 0.62)
for y in range(start, ch):
    a = int(225 * ((y - start) / (ch - start)) ** 1.3)
    gd.line([(0, y), (cw, y)], fill=(10, 8, 12, a))
p = Image.alpha_composite(p, grad)

mask = Image.new('L', (cw, ch), 0)
ImageDraw.Draw(mask).rounded_rectangle([0, 0, cw - 1, ch - 1], RADIUS, fill=255)
shot.paste(p, (x0, y0), mask)

# 3) overlays: "Here tonight" pill, name + verified tick, place, chips
ov = Image.new('RGBA', shot.size, (0, 0, 0, 0))
d = ImageDraw.Draw(ov)
d.rounded_rectangle([196, 1260, 692, 1344], 42, fill=(18, 16, 20, 205))
d.ellipse([228, 1294, 244, 1310], fill=(46, 204, 113, 255))
d.text((262, 1302), 'Here tonight · until 01:00', font=semi(32), fill='white', anchor='lm')

f = bold(84)
d.text((208, 2310), NAME, font=f, fill='white', anchor='ls')
tx = 208 + d.textlength(NAME, font=f) + 26
d.ellipse([tx, 2252, tx + 46, 2298], fill=(59, 123, 255, 255))
d.line([(tx + 12, 2276), (tx + 20, 2285), (tx + 35, 2265)], fill='white', width=6, joint='curve')
d.text((208, 2405), PLACE, font=semi(38), fill=(222, 214, 222, 255), anchor='ls')

cx = 208
for label, kind in CHIPS:
    cf = semi(30)
    w = d.textlength(label, font=cf) + 52
    fill, line = ((120, 22, 64, 190), (240, 40, 122, 255)) if kind == 'pink' else ((26, 44, 96, 190), (59, 123, 255, 255))
    d.rounded_rectangle([cx, 2456, cx + w, 2536], 40, fill=fill, outline=line, width=2)
    d.text((cx + w / 2, 2496), label, font=cf, fill='white', anchor='mm')
    cx += w + 16

shot = Image.alpha_composite(shot, ov)
OUT.parent.mkdir(exist_ok=True)
shot.convert('RGB').save(OUT)
print(OUT)
