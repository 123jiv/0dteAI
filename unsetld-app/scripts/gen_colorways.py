#!/usr/bin/env python3
"""Procedural colorway plates for UNSETLD (no licensing questions).

Run:  python3 scripts/gen_colorways.py            # everything
      python3 scripts/gen_colorways.py sun-fade   # one or more ids

Deterministic (fixed seeds), numpy + Pillow only. Writes to assets/colorways/:
  <id>.jpg          reader plate 1290x2796, q82 (stepped down to q75 if needed), <= 300 KB
  <id>-widget.jpg   1024x1024, q80 (re-rendered at that size, composition recomputed)
  <id>-swatch.jpg   324x576, q85 (re-rendered at that size)
Solid / gradient colorways (black, plum, coffee, olive) only get the widget and
swatch files: the app draws their reader background itself, and the swatch is a
faithful copy of that rendering (vertical gradient over the full height).

Every texture is built from smooth fields (Gaussian-filtered noise, fBm, domain
warping) rather than tiled noise, and finished with a sub-LSB dither so dark
gradients never band.
"""
import io
import os
import sys

import numpy as np
from PIL import Image, ImageDraw

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
OUT = os.path.join(ROOT, 'assets', 'colorways')

PLATE_W, PLATE_H = 1290, 2796           # reader plate (iPhone Pro Max @3x)
KINDS = {                                # name: ((W, H), JPEG quality)
    'plate': ((PLATE_W, PLATE_H), 82),
    'widget': ((1024, 1024), 80),
    'swatch': ((324, 576), 85),
}
PLATE_MAX_BYTES = 300 * 1024
PLATE_MIN_QUALITY = 75

# Rec. 709 luma weights, used for luminance-preserving operations.
LUMA = np.array([0.2126, 0.7152, 0.0722])


def hexrgb(h):
    h = h.lstrip('#')
    return np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)], dtype=np.float64)


# --------------------------------------------------------------------------------------
# Frames and noise fields
# --------------------------------------------------------------------------------------

class Frame:
    """One output image. Large-scale texture lives in *plate space* (reader-plate pixels)
    so the widget and swatch are true re-renders of the same material: an output of
    width W shows the vertically centred window of the plate at scale s = W / 1290."""

    def __init__(self, kind):
        (self.W, self.H), self.quality = KINDS[kind]
        self.kind = kind
        self.s = self.W / PLATE_W
        self.y0 = (PLATE_H - self.H / self.s) / 2

    def grid(self, f=1):
        """Pixel-centre coordinates of a grid f times coarser than the output.
        Returns (u, v) normalised to the frame and (X, Y) in plate space."""
        w, h = int(round(self.W / f)), int(round(self.H / f))
        x = (np.arange(w) + 0.5) * (self.W / w)
        y = (np.arange(h) + 0.5) * (self.H / h)
        xx, yy = np.meshgrid(x, y)
        return xx / self.W, yy / self.H, xx / self.s, yy / self.s + self.y0


GRID = 8      # plate px per coarse cell
MARGIN = 48   # coarse cells of padding (room for domain warps)
CW = PLATE_W // GRID + 2 * MARGIN
CH = PLATE_H // GRID + 2 * MARGIN


def gauss_filter(n, sigma):
    """Periodic Gaussian blur via FFT (float precision, no 8-bit steps)."""
    h, w = n.shape
    fy = np.fft.fftfreq(h)[:, None]
    fx = np.fft.rfftfreq(w)[None, :]
    k = np.exp(-2.0 * np.pi ** 2 * sigma ** 2 * (fx ** 2 + fy ** 2))
    return np.fft.irfft2(np.fft.rfft2(n) * k, s=(h, w))


def coarse_field(seed, sigma):
    """Unit-variance smooth noise on the coarse plate grid (sigma in plate px >= 16)."""
    n = np.random.default_rng(seed).standard_normal((CH, CW))
    f = gauss_filter(n, sigma / GRID)
    return (f - f.mean()) / f.std()


def _cr(t):
    t2, t3 = t * t, t * t * t
    return ((-t3 + 2 * t2 - t) * 0.5, (3 * t3 - 5 * t2 + 2) * 0.5,
            (-3 * t3 + 4 * t2 + t) * 0.5, (t3 - t2) * 0.5)


def sample(field, X, Y):
    """Catmull-Rom sample of a coarse field at plate-space coordinates."""
    gx = X / GRID + MARGIN - 0.5
    gy = Y / GRID + MARGIN - 0.5
    x0 = np.floor(gx).astype(np.int64)
    y0 = np.floor(gy).astype(np.int64)
    wx, wy = _cr(gx - x0), _cr(gy - y0)
    out = np.zeros(X.shape)
    for j in range(4):
        yy = np.clip(y0 - 1 + j, 0, CH - 1)
        row = np.zeros(X.shape)
        for i in range(4):
            row += wx[i] * field[yy, np.clip(x0 - 1 + i, 0, CW - 1)]
        out += wy[j] * row
    return out


def fbm(seed, X, Y, sigmas, amps, warp=0.0, warp_sigma=None):
    """Sum of octaves sampled in plate space, optionally domain-warped."""
    if warp:
        ws = warp_sigma or sigmas[0]
        dx = sample(coarse_field(seed + 101, ws), X, Y)
        dy = sample(coarse_field(seed + 202, ws), X, Y)
        X, Y = X + warp * dx, Y + warp * dy
    out = sum(a * sample(coarse_field(seed + i, sg), X, Y) for i, (sg, a) in enumerate(zip(sigmas, amps)))
    return out / np.sqrt(sum(a * a for a in amps))


def fine_noise(rng, h, w, sx, sy=None):
    """Unit-variance noise at output resolution with (possibly anisotropic) blur in px."""
    sy = sx if sy is None else sy
    n = rng.standard_normal((h, w))
    fy = np.fft.fftfreq(h)[:, None]
    fx = np.fft.rfftfreq(w)[None, :]
    k = np.exp(-2.0 * np.pi ** 2 * ((sx * fx) ** 2 + (sy * fy) ** 2))
    f = np.fft.irfft2(np.fft.rfft2(n) * k, s=(h, w))
    return (f - f.mean()) / f.std()


def upsample(a, frame):
    """Bicubic upsample of a work-resolution float map to the frame size."""
    if a.shape == (frame.H, frame.W):
        return a
    return np.asarray(Image.fromarray(a.astype(np.float32), 'F').resize((frame.W, frame.H), Image.BICUBIC),
                      dtype=np.float64)


def work_factor(frame):
    return 2 if frame.kind == 'plate' else 1


def smoothstep(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0.0, 1.0)
    return t * t * (3 - 2 * t)


def monotone_cubic(xs, ys, x):
    """Fritsch-Carlson monotone cubic interpolation: smooth through colour stops,
    so a multi-stop gradient has no Mach-band kinks at the stops."""
    xs, ys = np.asarray(xs, float), np.asarray(ys, float)
    d = np.diff(ys) / np.diff(xs)
    m = np.zeros_like(ys)
    m[0], m[-1] = d[0], d[-1]
    for i in range(1, len(ys) - 1):
        # weighted harmonic mean of neighbouring slopes (zero at local extrema)
        if d[i - 1] * d[i] <= 0:
            m[i] = 0.0
        else:
            w1 = 2 * (xs[i + 1] - xs[i]) + (xs[i] - xs[i - 1])
            w2 = (xs[i + 1] - xs[i]) + 2 * (xs[i] - xs[i - 1])
            m[i] = (w1 + w2) / (w1 / d[i - 1] + w2 / d[i])
    x = np.clip(x, xs[0], xs[-1])
    k = np.clip(np.searchsorted(xs, x, side='right') - 1, 0, len(xs) - 2)
    h = xs[k + 1] - xs[k]
    t = (x - xs[k]) / h
    t2, t3 = t * t, t * t * t
    return ((2 * t3 - 3 * t2 + 1) * ys[k] + (t3 - 2 * t2 + t) * h * m[k]
            + (-2 * t3 + 3 * t2) * ys[k + 1] + (t3 - t2) * h * m[k + 1])


def soft_light(b, s):
    """W3C soft-light, both in 0..1."""
    d = np.where(b <= 0.25, ((16 * b - 12) * b + 4) * b, np.sqrt(np.clip(b, 0, None)))
    return np.where(s <= 0.5, b - (1 - 2 * s) * b * (1 - b), b + (2 * s - 1) * (d - b))


def tint(base_hex, lum):
    """Base colour scaled by a luminance multiplier map -> HxWx3."""
    return hexrgb(base_hex)[None, None, :] * lum[..., None]


def film_grain(rng, frame, std_levels, blur=0.55):
    """Mono film grain in 8-bit levels, slightly soft so it reads as grain, not static."""
    return fine_noise(rng, frame.H, frame.W, blur) * std_levels


def finish(rgb, rng):
    """Mono TPDF dither (+-1 LSB) then quantise."""
    d = (rng.random(rgb.shape[:2]) - rng.random(rgb.shape[:2]))[..., None]
    return np.clip(np.round(rgb + d), 0, 255).astype(np.uint8)


def fibres(rng, frame, count, length, width, angle_sd, horiz_bias, value_fn, ss=2):
    """Short, slightly curved strands drawn supersampled into a float map (output px).
    length/width in output px (lognormal median for length); value_fn(n) gives each
    strand's value."""
    W, H = frame.W, frame.H
    im = Image.new('F', (W * ss, H * ss), 0.0)
    dr = ImageDraw.Draw(im)
    n = int(count)
    xs = rng.random(n) * (W + 40) - 20
    ys = rng.random(n) * (H + 40) - 20
    ls = np.exp(rng.normal(np.log(length), 0.45, n))
    ang = np.where(rng.random(n) < horiz_bias, rng.normal(0, angle_sd, n), rng.random(n) * np.pi)
    bend = rng.normal(0, 0.18, n)
    ws = np.maximum(1, np.round(width * ss * np.exp(rng.normal(0, 0.25, n)))).astype(int)
    vals = value_fn(n)
    for i in range(n):
        ca, sa = np.cos(ang[i]), np.sin(ang[i])
        pts = []
        for t in np.linspace(-0.5, 0.5, 6):
            off = bend[i] * ls[i] * (0.25 - t * t)          # gentle arc
            px = xs[i] + ca * t * ls[i] - sa * off
            py = ys[i] + sa * t * ls[i] + ca * off
            pts.append((px * ss, py * ss))
        dr.line(pts, fill=float(vals[i]), width=int(ws[i]), joint='curve')
    out = im.resize((W, H), Image.BOX)
    return np.asarray(out, dtype=np.float64)


# --------------------------------------------------------------------------------------
# Colorways
# --------------------------------------------------------------------------------------

def solid(hex_):
    def gen(frame, rng):
        return np.broadcast_to(hexrgb(hex_), (frame.H, frame.W, 3)).astype(np.float64)
    return gen


def vgradient(top, bottom):
    """Matches the app's LinearGradient (top -> bottom, full height)."""
    def gen(frame, rng):
        v = (np.arange(frame.H) + 0.5) / frame.H
        col = hexrgb(top)[None, :] * (1 - v[:, None]) + hexrgb(bottom)[None, :] * v[:, None]
        return np.broadcast_to(col[:, None, :], (frame.H, frame.W, 3)).astype(np.float64)
    return gen


def gen_bone(frame, rng):
    """Heavyweight uncoated paper: soft formation mottle + fine short fibres."""
    f = work_factor(frame)
    _, _, X, Y = frame.grid(f)
    broad = fbm(210, X, Y, [260, 110], [1.0, 0.6], warp=60)
    floc = fbm(220, X, Y, [40, 20], [1.0, 0.7], warp=12, warp_sigma=60)
    lum = 1 + upsample(0.0045 * broad + 0.0065 * floc, frame)
    fs = max(frame.s, 0.45)
    # fine formation (paper "cloudiness" at the millimetre scale)
    lum += 0.0045 * fine_noise(rng, frame.H, frame.W, 2.6 * fs)
    lum += 0.0030 * fine_noise(rng, frame.H, frame.W, 0.9)
    area = frame.W * frame.H / fs ** 2
    dark = fibres(rng, frame, area / 1100, 16 * fs, 0.55, 0.5, 0.35,
                  lambda n: rng.uniform(0.02, 0.055, n))
    light = fibres(rng, frame, area / 1500, 20 * fs, 0.7, 0.5, 0.35, lambda n: rng.uniform(0.012, 0.03, n))
    lum = lum - dark + light
    rgb = tint('#EDE9E3', lum)
    # dark fibres carry a hint of warm-grey pulp colour
    rgb -= dark[..., None] * np.array([0.0, 2.0, 6.0])[None, None, :]
    return rgb


def gen_snow_wash(frame, rng):
    """Acid / snow-washed cotton: irregular soft clouds, a few sharper bleach fronts."""
    f = work_factor(frame)
    _, _, X, Y = frame.grid(f)
    clouds = fbm(310, X, Y, [150, 66, 28], [1.0, 0.5, 0.22], warp=55, warp_sigma=300)
    # bleach: in a few regions (gated by a very slow field) the lighter clouds get a
    # crisper front - the edge follows the cloud contour, so nothing looks cut out
    detail = fbm(330, X, Y, [40, 18], [1.0, 0.4], warp=20, warp_sigma=80)
    gate = smoothstep(0.2, 1.1, fbm(340, X, Y, [420], [1.0]))
    lvl = clouds + 0.22 * detail
    bleach = smoothstep(0.5, 0.86, lvl) * gate
    front = np.exp(-((lvl - 0.47) / 0.07) ** 2) * gate * (1 - bleach)
    m = 0.065 * np.tanh(0.6 * clouds) + 0.024 * bleach - 0.008 * front
    m = np.clip(m, -0.08, 0.08)
    lum = 1 + upsample(m, frame)
    # fabric grain (<= 2%): weft-ish and warp-ish streaks, very low amplitude
    g = 0.6 * fine_noise(rng, frame.H, frame.W, 1.6, 0.6) + 0.4 * fine_noise(rng, frame.H, frame.W, 0.6, 1.5)
    lum += 0.0075 * g / g.std()
    rgb = tint('#BDB9B2', lum)
    # bleached cotton loses a touch of warmth
    bl = upsample(bleach, frame)[..., None]
    grey = (rgb @ LUMA)[..., None]
    return rgb * (1 - 0.3 * bl) + grey * 0.3 * bl


SUN_STOPS = [(0.0, '#55524D'), (0.45, '#3A3835'), (0.85, '#1D1C1B'), (1.0, '#121110')]


def gen_sun_fade(frame, rng):
    """Hero: sun-faded black garment panel. Radial airbrush + corner burns + mottle."""
    f = work_factor(frame)
    u, v, X, Y = frame.grid(f)
    W, H = frame.W, frame.H
    px, py = u * W, v * H
    if frame.kind == 'widget':
        cx, cy = 0.5 * W, 0.5 * H                     # recomputed centred for the widget
    else:
        cx, cy = 0.52 * W, 0.46 * H
    # radius: distance / half-diagonal, with a gentle vertical stretch so the faded
    # zone follows a portrait panel instead of reading as a round spotlight
    half_diag = 0.5 * np.hypot(W, H)
    stretch = 1.18 if H > W else 1.0
    r = np.hypot((px - cx) * stretch, (py - cy) / stretch) / half_diag
    rgb = np.stack([monotone_cubic([s for s, _ in SUN_STOPS], [hexrgb(c)[i] for _, c in SUN_STOPS], r)
                    for i in range(3)], axis=-1)
    # 25% burn into the top-left and bottom-right corners
    R = 0.62 * min(W, H) + 0.18 * max(W, H)
    burn = np.exp(-(np.hypot(px, py) / R) ** 2 * 1.6) + np.exp(-(np.hypot(W - px, H - py) / R) ** 2 * 1.6)
    rgb *= (1 - 0.25 * np.clip(burn, 0, 1))[..., None]
    # soft-light mottle, 18%: large soft blotches
    mott = fbm(410, X, Y, [190, 85, 36], [1.0, 0.45, 0.15], warp=45, warp_sigma=320)
    s = np.clip(0.5 + 0.2 * mott, 0, 1)[..., None]
    b = rgb / 255.0
    rgb = 255.0 * (b + 0.18 * (soft_light(b, s) - b))
    rgb = np.stack([upsample(rgb[..., i], frame) for i in range(3)], axis=-1)
    # soft-knee luminance clamp: nothing brighter than #55524D (grain included)
    ymax = hexrgb('#55524D') @ LUMA
    y = rgb @ LUMA
    knee = ymax - 9.0
    over = np.clip(y - knee, 0, None)
    y2 = np.where(y > knee, knee + 4.0 * np.tanh(over / 4.0), y)
    rgb *= (y2 / np.maximum(y, 1e-6))[..., None]
    # mono grain, 4%: strongest in the mids, gentle in the shadows
    lumn = (rgb @ LUMA) / 255.0
    g = film_grain(rng, frame, 2.3) * np.clip(0.55 + 1.6 * lumn, 0, 1.2)
    rgb += g[..., None] * (rgb / np.maximum(rgb @ LUMA, 1e-6)[..., None])
    y = rgb @ LUMA
    # hard ceiling a few levels under the limit so JPEG ringing can't overshoot it
    rgb *= np.minimum(1.0, (ymax - 4.0) / np.maximum(y, 1e-6))[..., None]
    return rgb


def gen_concrete(frame, rng):
    """Polished concrete: quiet cement mottle, sparse aggregate, two faint water stains."""
    f = work_factor(frame)
    u, v, X, Y = frame.grid(f)
    W, H = frame.W, frame.H
    mott = fbm(510, X, Y, [210, 80, 28], [1.0, 0.55, 0.3], warp=90, warp_sigma=200)
    m = 0.022 * mott
    # water stains (positioned per frame so every output keeps both)
    aspect = H / W
    warpf = fbm(530, X, Y, [70, 30], [1.0, 0.4])
    for (sx, sy, sr, k) in [(0.27, 0.30, 0.46, 0), (0.80, 0.74, 0.34, 1)]:
        d = np.hypot(u - sx, (v - sy) * aspect) / sr
        ang = np.arctan2((v - sy) * aspect, u - sx)
        lobes = 0.07 * np.sin(3 * ang + 1.3 * k) + 0.05 * np.sin(5 * ang + 2.1 + k)
        fd = d * (1 + lobes) + 0.06 * warpf
        e = 0.985                                   # the tide line
        inside = 1 - smoothstep(0.80, e, fd)        # soft damp interior
        # rim: soft on the inside, crisp on the outside (where the water stopped)
        rim = np.where(fd < e, np.exp(-((fd - e) / 0.05) ** 2), np.exp(-((fd - e) / 0.010) ** 2))
        inner = np.exp(-((fd - 0.72) / 0.05) ** 2) * 0.5
        m += -0.03 * inside - 0.024 * rim - 0.008 * inner
    lum = 1 + upsample(m, frame)
    fs = max(frame.s, 0.4)
    lum += 0.005 * fine_noise(rng, H, W, 1.0) + 0.005 * fine_noise(rng, H, W, 2.6 * fs)
    rgb = tint('#8F8A84', lum)
    # aggregate: sparse flecks of varied size, dark and light, plus a few quiet stones
    agg = speckle(rng, frame)
    return rgb + agg[..., None] * np.array([1.0, 0.985, 0.96])[None, None, :]


def speckle(rng, frame, ss=3):
    W, H = frame.W, frame.H
    fs = max(frame.s, 0.4)
    area = W * H / fs ** 2
    im = Image.new('F', (W * ss, H * ss), 0.0)
    dr = ImageDraw.Draw(im)
    groups = [  # (count per plate px^2, radius px (output, at plate scale), level delta range)
        (1 / 700, (0.45, 0.9), (-34, -14)),
        (1 / 2200, (0.45, 0.9), (10, 22)),
        (1 / 5000, (0.9, 1.8), (-30, -12)),
        (1 / 9000, (0.9, 1.8), (8, 18)),
        (1 / 45000, (1.8, 3.4), (-18, -8)),
        (1 / 60000, (3.0, 7.0), (-7, 6)),
    ]
    for dens, (r0, r1), (l0, l1) in groups:
        n = rng.poisson(area * dens)
        xs, ys = rng.random(n) * W, rng.random(n) * H
        rs = np.exp(rng.uniform(np.log(r0), np.log(r1), n)) * fs
        ls = rng.uniform(l0, l1, n)
        for i in range(n):
            k = rng.integers(6, 10)
            a0 = rng.random() * 2 * np.pi
            asp = rng.uniform(1.0, 1.7)
            rot = rng.random() * np.pi
            pts = []
            for j in range(k):
                a = a0 + 2 * np.pi * j / k
                rr = rs[i] * rng.uniform(0.7, 1.15)
                ex, ey = np.cos(a) * rr * asp, np.sin(a) * rr
                pts.append(((xs[i] + ex * np.cos(rot) - ey * np.sin(rot)) * ss,
                            (ys[i] + ex * np.sin(rot) + ey * np.cos(rot)) * ss))
            dr.polygon(pts, fill=float(ls[i]))
    return np.asarray(im.resize((W, H), Image.BOX), dtype=np.float64)


def gen_charcoal(frame, rng):
    """Charcoal heather jersey: short horizontal-ish lighter/darker fibres."""
    f = work_factor(frame)
    _, _, X, Y = frame.grid(f)
    W, H = frame.W, frame.H
    lum = 1 + upsample(0.018 * fbm(610, X, Y, [180, 60], [1.0, 0.5], warp=80), frame)
    rgb = tint('#1E1D1B', lum)
    fs = max(frame.s, 0.45)
    area = W * H / fs ** 2
    lightf = fibres(rng, frame, area / 140, 9 * fs, 0.8, 0.2, 0.92, lambda n: rng.uniform(3.0, 11.0, n))
    darkf = fibres(rng, frame, area / 220, 8 * fs, 0.8, 0.2, 0.92, lambda n: rng.uniform(2.0, 5.0, n))
    knit = fine_noise(rng, H, W, 1.4, 0.5)
    delta = lightf - darkf + 1.1 * knit
    return rgb + delta[..., None] * np.array([1.0, 0.98, 0.94])[None, None, :]


def gen_midnight(frame, rng):
    """Midnight navy under a sodium streetlight glow from the top right."""
    W, H = frame.W, frame.H
    yy, xx = np.mgrid[0:H, 0:W]
    d = np.hypot(xx + 0.5 - 0.88 * W, yy + 0.5 - 0.08 * H) / (0.70 * W)
    t = np.clip(d, 0, 1)
    q = 1 - t * t
    a = 0.16 * (0.5 * q ** 4 + 0.5 * q ** 2)         # bright core, long soft tail, zero slope at the edge
    rgb = hexrgb('#0C0F16')[None, None, :] * (1 - a[..., None]) + hexrgb('#D6AA68')[None, None, :] * a[..., None]
    rgb += (fine_noise(rng, H, W, 0.6) * 0.9)[..., None]   # ~1% dither grain
    return rgb


COLORWAYS = [
    # id, generator, has reader plate, seed
    ('black', solid('#0A0A0A'), False, 1),
    ('bone', gen_bone, True, 2),
    ('snow-wash', gen_snow_wash, True, 3),
    ('sun-fade', gen_sun_fade, True, 4),
    ('concrete', gen_concrete, True, 5),
    ('charcoal', gen_charcoal, True, 6),
    ('plum', vgradient('#3F2F38', '#33262D'), False, 7),
    ('coffee', vgradient('#403329', '#34291F'), False, 8),
    ('olive', vgradient('#3E3F31', '#333428'), False, 9),
    ('midnight', gen_midnight, True, 10),
]


def encode(img, quality):
    buf = io.BytesIO()
    img.save(buf, 'JPEG', quality=quality, optimize=True, progressive=True, subsampling='4:2:0')
    return buf.getvalue()


def render(cid, gen, kind, seed):
    frame = Frame(kind)
    rng = np.random.default_rng([seed, list(KINDS).index(kind)])
    arr = finish(gen(frame, rng), rng)
    img = Image.fromarray(arr, 'RGB')
    name = f'{cid}.jpg' if kind == 'plate' else f'{cid}-{kind}.jpg'
    q = frame.quality
    data = encode(img, q)
    if kind == 'plate':
        while len(data) > PLATE_MAX_BYTES and q > PLATE_MIN_QUALITY:
            q -= 1
            data = encode(img, q)
        if len(data) > PLATE_MAX_BYTES:
            raise SystemExit(f'{name}: {len(data)} bytes at q{q} exceeds the 300 KB budget')
    with open(os.path.join(OUT, name), 'wb') as fh:
        fh.write(data)
    print(f'{name:24s} {img.size[0]}x{img.size[1]}  q{q}  {len(data) / 1024:6.1f} KB')


def main(only):
    os.makedirs(OUT, exist_ok=True)
    for cid, gen, has_plate, seed in COLORWAYS:
        if only and cid not in only:
            continue
        kinds = ['plate', 'widget', 'swatch'] if has_plate else ['widget', 'swatch']
        for kind in kinds:
            render(cid, gen, kind, seed)


if __name__ == '__main__':
    main(set(sys.argv[1:]))
