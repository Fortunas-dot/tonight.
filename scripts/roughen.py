"""Gives AI photos a phone-camera finish so they don't look clean and professional: a slight tilt, an uneven colour
cast, sensor grain (more in the dark), a touch of softness and repeated JPEG compression, as if sent around a few times.
Each photo gets its own amounts (seeded by its path, so re-runs give the same result).

    python -I scripts/roughen.py in.jpg out.jpg [in2.jpg out2.jpg …]
"""
import random
import sys
import zlib

import cv2
import numpy as np


def roughen(src, dst):
    rnd = random.Random(zlib.crc32(src.replace('\\', '/').encode()))
    img = cv2.imread(src).astype(np.float32)
    h, w = img.shape[:2]

    # A slight tilt, cropped so no corners show.
    angle = rnd.uniform(-1.6, 1.6)
    zoom = 1 + abs(angle) * 0.035
    m = cv2.getRotationMatrix2D((w / 2, h / 2), angle, zoom)
    img = cv2.warpAffine(img, m, (w, h), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)

    # Colour: a cast per photo (warm indoor, green fluorescent, cool shade), flatter or punchier contrast.
    cast = rnd.choice([(0.94, 1.0, 1.07), (0.97, 1.03, 0.98), (1.05, 1.0, 0.95), (1.0, 1.0, 1.0)])  # B, G, R
    img *= np.array(cast, dtype=np.float32)
    contrast = rnd.uniform(0.9, 1.08)
    lift = rnd.uniform(-4, 10)
    img = (img - 128) * contrast + 128 + lift

    # Phone cameras smear detail a little before sharpening it back.
    if rnd.random() < 0.6:
        img = cv2.GaussianBlur(img, (0, 0), rnd.uniform(0.5, 1.0))

    # Grain: stronger in dark photos, a bit coloured.
    dark = 1 - float(np.clip(img.mean() / 255, 0, 1))
    sigma = rnd.uniform(2.5, 4.5) + dark * 6
    noise = np.random.default_rng(rnd.randrange(1 << 30)).normal(0, sigma, (h, w, 1)).astype(np.float32)
    chroma = np.random.default_rng(rnd.randrange(1 << 30)).normal(0, sigma * 0.35, (h, w, 3)).astype(np.float32)
    img = img + noise + chroma

    out = np.clip(img, 0, 255).astype(np.uint8)
    # Slightly smaller, then compressed twice (taken, then sent through a chat app).
    scale = rnd.uniform(0.82, 0.95)
    out = cv2.resize(out, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA)
    for q in (rnd.randint(80, 88), rnd.randint(68, 78)):
        ok, buf = cv2.imencode('.jpg', out, [cv2.IMWRITE_JPEG_QUALITY, q])
        out = cv2.imdecode(buf, cv2.IMREAD_COLOR)
    cv2.imwrite(dst, out, [cv2.IMWRITE_JPEG_QUALITY, 92])


args = sys.argv[1:]
for i in range(0, len(args), 2):
    roughen(args[i], args[i + 1])
