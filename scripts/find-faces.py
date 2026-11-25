"""Finds the face and eyes in photos with OpenCV's bundled Haar cascades (no download, nothing leaves this machine).
Used by scripts/mask-people.mjs: prints JSON {path: {w, h, box: {x,y,w,h}, eyes: [{x,y}, {x,y}]}} in photo pixels.

    python -I scripts/find-faces.py a.jpg b.jpg
"""
import json
import sys

import cv2

data = cv2.data.haarcascades
face_ccs = [cv2.CascadeClassifier(data + n) for n in ('haarcascade_frontalface_alt2.xml', 'haarcascade_frontalface_default.xml')]
eye_ccs = [cv2.CascadeClassifier(data + n) for n in ('haarcascade_eye_tree_eyeglasses.xml', 'haarcascade_eye.xml')]


def eye_pair(grey, fx, fy, fw, fh):
    """The two biggest eyes side by side in the top of the face box (one each side of its middle, same height)."""
    top = grey[fy + int(fh * 0.15):fy + int(fh * 0.6), fx:fx + fw]
    for cc in eye_ccs:
        found = cc.detectMultiScale(top, scaleFactor=1.05, minNeighbors=4, minSize=(fw // 10, fw // 10), maxSize=(fw // 3, fw // 3))
        eyes = sorted(((fx + ex + ew / 2, fy + int(fh * 0.15) + ey + eh / 2, ew * eh) for ex, ey, ew, eh in found), key=lambda e: -e[2])
        for i, a in enumerate(eyes):
            for b in eyes[i + 1:]:
                if (a[0] - fx - fw / 2) * (b[0] - fx - fw / 2) < 0 and abs(a[1] - b[1]) < fh * 0.1 and abs(a[0] - b[0]) > fw * 0.25:
                    return sorted([a, b], key=lambda e: e[0])
    return []


def find(path):
    img = cv2.imread(path)
    h, w = img.shape[:2]
    grey = cv2.equalizeHist(cv2.cvtColor(img, cv2.COLOR_BGR2GRAY))
    faces = []
    for cc in face_ccs:
        faces += [tuple(int(v) for v in f) for f in cc.detectMultiScale(grey, scaleFactor=1.05, minNeighbors=5, minSize=(w // 12, w // 12))]
    if not faces:
        return {'w': w, 'h': h, 'box': None, 'eyes': []}
    # The person is the face whose eyes are found (then the biggest); the stricter detector's boxes come first.
    scored = [(len(eye_pair(grey, *f)) == 2, i < len(faces) and f[2] * f[3], f) for i, f in enumerate(faces)]
    best = max(scored, key=lambda s: (s[0], s[1]))
    fx, fy, fw, fh = best[2]
    pair = eye_pair(grey, fx, fy, fw, fh)
    return {
        'w': w,
        'h': h,
        'box': {'x': fx, 'y': fy, 'w': fw, 'h': fh},
        'eyes': [{'x': float(e[0]), 'y': float(e[1])} for e in pair],
    }


print(json.dumps({p: find(p) for p in sys.argv[1:]}))
