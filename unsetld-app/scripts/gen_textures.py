"""Procedurally generates the theme textures (no licensing questions).

Run: python3 scripts/gen_textures.py
Outputs PNGs into assets/textures/. Deterministic (fixed seeds).
"""
import os
import numpy as np
from PIL import Image, ImageFilter

OUT = os.path.join(os.path.dirname(__file__), "..", "assets", "textures")
os.makedirs(OUT, exist_ok=True)


def save(arr, name, mode="L"):
    Image.fromarray(arr.astype(np.uint8), mode).save(os.path.join(OUT, name), optimize=True)


def grain(size=256, strength=1.0, seed=1, name="grain.png"):
    """Tileable white-noise grain as a white layer with varying alpha."""
    rng = np.random.default_rng(seed)
    noise = rng.normal(0.5, 0.18 * strength, (size, size)).clip(0, 1)
    alpha = (np.abs(noise - 0.5) * 2 * 60 * strength).clip(0, 255)
    rgba = np.zeros((size, size, 4), dtype=np.uint8)
    rgba[..., :3] = 255
    rgba[..., 3] = alpha
    Image.fromarray(rgba, "RGBA").save(os.path.join(OUT, name), optimize=True)


def value_noise(w, h, scale, seed):
    rng = np.random.default_rng(seed)
    gw, gh = int(w / scale) + 2, int(h / scale) + 2
    grid = rng.random((gh, gw))
    img = Image.fromarray((grid * 255).astype(np.uint8), "L").resize((w, h), Image.BICUBIC)
    return np.asarray(img, dtype=np.float32) / 255.0


def marble(w=540, h=960, seed=7, name="marble.png"):
    """Dark marble: a few broad, domain-warped veins over soft cloudy stone."""
    x = np.linspace(0, 1, w)[None, :]
    y = np.linspace(0, 1, h)[:, None]
    warp = sum(value_noise(w, h, s, seed + i) * a for i, (s, a) in enumerate([(420, 1.0), (210, 0.5), (105, 0.25), (52, 0.12)]))
    cloud = sum(value_noise(w, h, s, seed + 10 + i) * a for i, (s, a) in enumerate([(300, 1.0), (120, 0.4), (40, 0.15)]))
    v1 = np.abs(np.sin((x * 1.1 + y * 1.9 + warp * 1.6) * np.pi * 2))
    v2 = np.abs(np.sin((x * 2.3 - y * 0.8 + warp * 2.4 + 0.3) * np.pi * 2))
    veins = (1 - v1) ** 14 * 1.0 + (1 - v2) ** 22 * 0.45
    lum = 9 + cloud * 9 + veins * 85
    img = Image.fromarray(lum.clip(0, 255).astype(np.uint8), "L").filter(ImageFilter.GaussianBlur(0.8))
    rgb = Image.merge("RGB", [img, img.point(lambda v: v * 0.97), img.point(lambda v: v * 0.93)])
    rgb.save(os.path.join(OUT, name), optimize=True)


def carbon(size=64, name="carbon.png"):
    """Tileable woven carbon-fibre pattern."""
    arr = np.zeros((size, size), dtype=np.float32)
    cell = size // 4
    for cy in range(4):
        for cx in range(4):
            horizontal = (cx + cy) % 2 == 0
            yy, xx = np.mgrid[0:cell, 0:cell]
            t = (yy if horizontal else xx) / cell
            shade = 22 + 26 * np.sin(t * np.pi)
            arr[cy * cell:(cy + 1) * cell, cx * cell:(cx + 1) * cell] = shade
    save(arr, name)


def brushed(w=512, h=512, seed=3, name="brushed.png"):
    rng = np.random.default_rng(seed)
    rows = rng.normal(0, 1, (h, 1)) * 6
    streaks = np.repeat(rows, w, axis=1) + rng.normal(0, 2.5, (h, w))
    img = Image.fromarray((128 + streaks).clip(0, 255).astype(np.uint8), "L").filter(ImageFilter.BoxBlur(1))
    arr = np.asarray(img, dtype=np.float32)
    alpha = (np.abs(arr - 128) * 3).clip(0, 70)
    rgba = np.zeros((h, w, 4), dtype=np.uint8)
    rgba[..., :3] = 255
    rgba[..., 3] = alpha
    Image.fromarray(rgba, "RGBA").save(os.path.join(OUT, name), optimize=True)


if __name__ == "__main__":
    grain(name="grain.png", strength=0.8, seed=1)
    grain(name="heavy-grain.png", strength=1.6, seed=2)
    marble()
    carbon()
    brushed()
    for f in sorted(os.listdir(OUT)):
        print(f, os.path.getsize(os.path.join(OUT, f)))
