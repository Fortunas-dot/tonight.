"""Cuts the onboarding illustrations out of their dark background, so they sit on the app's glow without a box.

    python -I scripts/cutout-art.py assets/onboarding/code.jpg [...]   ->  assets/onboarding/code.png (transparent)

Only background connected to the picture's edge is removed (flood fill from the border, colour close to the
background), so dark hair and outlines inside a character stay. Edges are softened, and a gentle fade near the
picture's own border hides any leftover glow box.
"""
import sys

import cv2
import numpy as np

TOL = 16  # how far (per channel) a pixel may be from the background colour and still count as background


def cutout(src):
    img = cv2.imread(src)
    h, w = img.shape[:2]
    # The background colour: the median of the border pixels.
    border = np.concatenate([img[0], img[-1], img[:, 0], img[:, -1]])
    bg = np.median(border, axis=0)

    # Background = pixels close to bg, reached from the border (floodFill on a "close to bg" map).
    close = (np.abs(img.astype(np.int16) - bg).max(axis=2) <= TOL).astype(np.uint8)
    mask = np.zeros((h + 2, w + 2), np.uint8)
    seeds = [(x, 0) for x in range(0, w, 8)] + [(x, h - 1) for x in range(0, w, 8)] + [(0, y) for y in range(0, h, 8)] + [(w - 1, y) for y in range(0, h, 8)]
    for x, y in seeds:
        if close[y, x] and not mask[y + 1, x + 1]:
            cv2.floodFill(close, mask, (x, y), 2, 0, 0, cv2.FLOODFILL_MASK_ONLY | 4 | (255 << 8))
    background = mask[1:-1, 1:-1] > 0

    # Soft alpha: fully transparent in the background, a smooth ramp over a few pixels at the subject's edge.
    alpha = np.where(background, 0, 255).astype(np.uint8)
    alpha = cv2.GaussianBlur(alpha, (0, 0), 1.6)

    # Also fade glows that are only a little brighter than the background (door glow, halos) into nothing.
    dist = np.abs(img.astype(np.int16) - bg).max(axis=2).astype(np.float32)
    glow = np.clip((dist - TOL) / 40.0, 0, 1)
    alpha = np.where(background, 0, np.maximum(alpha / 255.0 * glow, (alpha / 255.0) * (dist > TOL + 40))) * 255

    # Gentle fade in the outer 6% so nothing ends on a hard line.
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    edge = np.minimum(np.minimum(xx, w - 1 - xx) / (w * 0.06), np.minimum(yy, h - 1 - yy) / (h * 0.06))
    alpha = alpha * np.clip(edge, 0, 1)

    out = np.dstack([img, alpha.astype(np.uint8)])
    cv2.imwrite(src.rsplit('.', 1)[0] + '.png', out, [cv2.IMWRITE_PNG_COMPRESSION, 9])


for path in sys.argv[1:]:
    cutout(path)
    print('cut out', path)
