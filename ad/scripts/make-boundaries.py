"""Puts the current "What are you after?" screen (captured from the running app) into the App Store
"You set the boundaries." frame. Output: ad/screens/04-boundaries-new.png (used by the v3 and v4 builds).
usage (from the ad folder): python scripts/make-boundaries.py
The capture, screens/src/after-full.png, is the app at 440 css px wide shown at 2x (880 px), stitched from
three screenshots. To recapture: run the app on web, open the step, and stitch again (see README)."""
from pathlib import Path
from PIL import Image, ImageDraw

AD = Path(__file__).resolve().parent.parent
SRC = AD.parent / 'store/screenshots/iphone-6.9/04-boundaries.png'
CAP = AD / 'screens/src/after-full.png'
OUT = AD / 'screens/04-boundaries-new.png'

SCREEN_X0, SCREEN_X1 = 116, 1204   # the phone's screen on the 1320x2868 store image
TOP = 845                          # where the app's content starts, under the island
FADE = 70

shot = Image.open(SRC).convert('RGB')
cap = Image.open(CAP).convert('RGB')
w = SCREEN_X1 - SCREEN_X0
cap = cap.resize((w, round(cap.height * w / cap.width)), Image.LANCZOS)
cap = cap.crop((0, 0, w, shot.height - TOP))

# clear the old screen content below the island, then fade the capture in at its top edge
ImageDraw.Draw(shot).rectangle([SCREEN_X0, TOP, SCREEN_X1 - 1, shot.height], fill=(14, 12, 16))
mask = Image.new('L', cap.size, 255)
md = ImageDraw.Draw(mask)
for y in range(FADE):
    md.line([(0, y), (w, y)], fill=int(255 * y / FADE))
shot.paste(cap, (SCREEN_X0, TOP), mask)
OUT.parent.mkdir(exist_ok=True)
shot.save(OUT)
print(OUT)
