"""Finds the top and sides of the head (hair included) so headbands, ears, horns and halos sit on the hair.
OpenCV GrabCut cuts the person out around the face; then, in the face's own upright frame (x along the eye line,
y down), it walks up from between the eyes to the top of the hair and measures the head's width below that.
Used by scripts/mask-people.mjs. Reads JSON [{path, eyes: [{x,y},{x,y}]}] on stdin, prints {path: head} where head is
{top: d, rows: [[depth, left, right], ...]} in eye gaps (top: how far above the eyes; depth: below the top).

    echo '[...]' | python -I scripts/find-heads.py [--debug out-dir]
"""
import json
import math
import os
import sys

import cv2
import numpy as np


def head(path, eyes, debug=None):
    img = cv2.imread(path)
    H, W = img.shape[:2]
    (lx, ly), (rx, ry) = (eyes[0]['x'], eyes[0]['y']), (eyes[1]['x'], eyes[1]['y'])
    gap = math.hypot(rx - lx, ry - ly)
    roll = math.atan2(ry - ly, rx - lx)
    mx, my = (lx + rx) / 2, (ly + ry) / 2
    ux, uy = math.cos(roll), math.sin(roll)  # across the face
    vx, vy = -uy, ux  # down the face

    def P(u, v):
        return mx + (u * ux + v * vx) * gap, my + (u * uy + v * vy) * gap

    # Work on an upright crop around the head: 3.6 gaps either side, 3.4 above, 3 below the eyes.
    S = 40.0  # pixels per eye gap in the crop
    cw, ch = int(7.2 * S), int(6.4 * S)
    M = cv2.getAffineTransform(
        np.float32([P(-3.6, -3.4), P(3.6, -3.4), P(-3.6, 3.0)]),
        np.float32([[0, 0], [cw, 0], [0, ch]]),
    )
    crop = cv2.warpAffine(img, M, (cw, ch), borderMode=cv2.BORDER_REPLICATE)
    ex, ey = 3.6 * S, 3.4 * S  # between the eyes, in the crop

    mask = np.full((ch, cw), cv2.GC_PR_BGD, np.uint8)
    # Probably head: a generous oval around the face and hair.
    cv2.ellipse(mask, (int(ex), int(ey - 0.3 * S)), (int(1.7 * S), int(2.6 * S)), 0, 0, 360, cv2.GC_PR_FGD, -1)
    # Surely face: eyes, nose, mouth, and the forehead just above the eyes.
    cv2.ellipse(mask, (int(ex), int(ey + 0.5 * S)), (int(0.75 * S), int(1.2 * S)), 0, 0, 360, cv2.GC_FGD, -1)
    cv2.rectangle(mask, (int(ex - 0.5 * S), int(ey - 0.9 * S)), (int(ex + 0.5 * S), int(ey)), cv2.GC_FGD, -1)
    # And a narrow strip up to the hairline, so the hair's colour is learnt as head (big curly hair was cut off).
    cv2.rectangle(mask, (int(ex - 0.25 * S), int(ey - 1.55 * S)), (int(ex + 0.25 * S), int(ey)), cv2.GC_FGD, -1)
    # Surely background: the crop's top corners and the far sides.
    cv2.rectangle(mask, (0, 0), (cw, int(0.15 * S)), cv2.GC_BGD, -1)
    cv2.rectangle(mask, (0, 0), (int(0.5 * S), ch), cv2.GC_BGD, -1)
    cv2.rectangle(mask, (cw - int(0.5 * S), 0), (cw, ch), cv2.GC_BGD, -1)
    bg, fg = np.zeros((1, 65), np.float64), np.zeros((1, 65), np.float64)
    cv2.grabCut(crop, mask, None, bg, fg, 6, cv2.GC_INIT_WITH_MASK)
    fgm = np.where((mask == cv2.GC_FGD) | (mask == cv2.GC_PR_FGD), 255, 0).astype(np.uint8)
    fgm = cv2.morphologyEx(fgm, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
    # Keep only the blob joined to the face.
    n, lab = cv2.connectedComponents(fgm)
    keep = lab[int(ey + 0.3 * S), int(ex)]
    fgm = np.where(lab == keep, 255, 0).astype(np.uint8) if keep else fgm

    # Top: the highest head pixel in a strip one gap wide above the eyes (robust to a stray hair).
    strip = fgm[:, int(ex - 0.5 * S):int(ex + 0.5 * S)]
    rows = np.where((strip > 0).mean(axis=1) > 0.5)[0]
    top_px = rows.min() if len(rows) else ey - 1.75 * S
    top = (ey - top_px) / S
    top = min(max(top, 1.0), 3.2)

    out = []
    for d in np.arange(0.0, 1.6, 0.05):
        y = int(top_px + d * S)
        if y >= ch:
            break
        xs = np.where(fgm[y] > 0)[0]
        # The run through the middle of the head, not a shoulder or someone next to them.
        c = int(ex)
        if not len(xs) or fgm[y, c] == 0:
            near = xs[np.argmin(abs(xs - c))] if len(xs) else c
            c = near
        L = c
        while L > 0 and fgm[y, L - 1] > 0:
            L -= 1
        R = c
        while R < cw - 1 and fgm[y, R + 1] > 0:
            R += 1
        out.append([round(float(d), 2), round((L - ex) / S, 3), round((R - ex) / S, 3)])

    if debug:
        vis = crop.copy()
        vis[fgm == 0] = (vis[fgm == 0] * 0.35).astype(np.uint8)
        cv2.line(vis, (0, int(top_px)), (cw, int(top_px)), (0, 255, 255), 1)
        cv2.imwrite(os.path.join(debug, os.path.basename(path).replace('.jpg', '') + '-' + os.path.basename(os.path.dirname(path)) + '.jpg'), vis)
    return {'top': round(float(top), 3), 'rows': out}


if __name__ == '__main__':
    debug = sys.argv[sys.argv.index('--debug') + 1] if '--debug' in sys.argv else None
    jobs = json.load(sys.stdin)
    res = {}
    for j in jobs:
        try:
            res[j['path']] = head(j['path'], j['eyes'], debug)
        except Exception as e:  # noqa: BLE001 — a failed cut falls back to the old placement
            res[j['path']] = {'error': str(e)}
    print(json.dumps(res))
