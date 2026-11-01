"""Bake deterministic, small material maps; no model or scene data is read or changed."""
from pathlib import Path
import argparse
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "frontend/public/textures/journey/li"
OUT.mkdir(parents=True, exist_ok=True)
RNG = np.random.default_rng(20261027)


def noise(size, scale=1):
    y, x = np.mgrid[0:size, 0:size] / size
    result = np.zeros((size, size))
    for frequency, amplitude in [(2, .45), (7, .24), (19, .16), (61, .09), (137, .035)]:
        phase = RNG.random(3) * np.pi * 2
        result += np.sin(x * np.pi * 2 * frequency + phase[0]) * np.cos(y * np.pi * 2 * (frequency + 1) + phase[1]) * amplitude
    return result * scale


def save_color(name, rgb):
    Image.fromarray(np.clip(rgb, 0, 255).astype("uint8")).save(OUT / f"{name}-color.webp", quality=91, method=6)


def save_surface(name, rgb, height, roughness, strength):
    save_color(name, rgb)
    dx = (np.roll(height, -1, axis=1) - np.roll(height, 1, axis=1)) * strength
    dy = (np.roll(height, -1, axis=0) - np.roll(height, 1, axis=0)) * strength
    normal = np.stack((-dx, dy, np.ones_like(dx)), axis=-1)
    normal /= np.linalg.norm(normal, axis=-1, keepdims=True)
    Image.fromarray(((normal * .5 + .5) * 255).astype("uint8")).save(OUT / f"{name}-normal.png", optimize=True)
    Image.fromarray(np.clip(roughness, 0, 255).astype("uint8")).save(OUT / f"{name}-roughness.png", optimize=True)


# Full-roof UV map, with the previous tile density but no repeated moss masks.
# TextureLoader flipY means image TOP is UV v=1: the eave, not the ridge.
n = 1024
y, x = np.mgrid[0:n, 0:n] / n
row = np.floor(y * 32).astype(int)
u = (x * 20 + (row % 2) * .5) % 1
v = (y * 32) % 1
grain = noise(n)
seam = (u < .035) | (u > .965) | (v < .05)
cap = np.sin(u * np.pi)
tile_variation = np.sin(np.floor(x * 20 + (row % 2) * .5) * 17.13 + row * 23.17)
shade = grain * 10 + tile_variation * 4 + cap * 4 - seam * 17
roof_rgb = np.array([118, 132, 121]) + shade[..., None]
corner = np.exp(-((np.minimum(x, 1 - x) / .13) ** 2)) * np.exp(-((y / .075) ** 2))
flecks = np.clip((grain + .13) * 2, 0, 1) * corner * .33
roof_rgb = roof_rgb * (1 - flecks[..., None]) + np.array([120, 126, 92]) * flecks[..., None]
roof_height = cap * .09 - seam * .04 + grain * .014 + np.sin(v * np.pi) * .014
save_surface("roof", roof_rgb, roof_height, 222 + grain * 15 + corner * 12, 5)

# Old wood: neutral map preserves the existing warm timber colors in the materials.
n = 512
y, x = np.mgrid[0:n, 0:n] / n
grain = noise(n)
growth = np.sin(x * np.pi * 76 + np.sin(y * np.pi * 4) * .8 + grain * 2)
hairline = np.maximum(0, growth) ** 16
weather = np.sin(x * np.pi * 6 + y * .4) * 3 + grain * 10
shade = weather - hairline * 14
wood_rgb = np.array([231, 220, 204]) + shade[..., None]
wood_height = growth * .008 + grain * .012 - hairline * .016
save_surface("wood", wood_rgb, wood_height, 227 + grain * 12, 3)

# Stone joints and wear use the SAME height field as the color map.
row = np.floor(y * 4)
u = (x * 4 + (row % 2) * .5) % 1
v = (y * 4) % 1
edge = np.minimum.reduce([u, 1 - u, v, 1 - v])
joint = 1 - np.clip(edge / .022, 0, 1)
bevel = 1 - np.clip(edge / .05, 0, 1)
grain = noise(n)
shade = grain * 7 - joint * 24 - bevel * 4
stone_rgb = np.array([214, 211, 201]) + shade[..., None]
save_surface("stone", stone_rgb, .5 - joint * .05 - bevel * .015 + grain * .006, 239 + grain * 7, 4)

n = 256
y, x = np.mgrid[0:n, 0:n] / n
weave = (np.sin(x * np.pi * 128) + np.sin(y * np.pi * 128)) * .5
fold = np.sin(x * np.pi * 10 + np.sin(y * np.pi * 2) * .5) * .05
fold += np.sin((x + y * .12) * np.pi * 20) * .012
shade = weave * 2 + fold * 25 + noise(n) * 2
save_surface("cloth", np.array([246, 243, 236]) + shade[..., None], fold + weave * .004, np.full((n, n), 248), 5)

# Feather mountain crest fully into transparency, hiding the existing polygon edge.
w, h = 512, 128
y, x = np.mgrid[0:h, 0:w] / np.array([h - 1, w - 1])[:, None, None]
top = np.clip((y - .08) / .23, 0, 1)
top = top * top * (3 - 2 * top)
base = np.clip((1 - y) / .2, .12, 1)
alpha = np.clip(top * base * (242 + np.sin(x * 29 + y * 8) * 9), 0, 255)
Image.fromarray(alpha.astype("uint8")).save(OUT / "mountain-edge-alpha.png", optimize=True)

# One horizontally tileable mist texture, animated by UV offset on existing surfaces.
w, h = 512, 128
y, x = np.mgrid[0:h, 0:w] / np.array([h - 1, w])[:, None, None]
band = np.exp(-((y - .5 - np.sin(x * np.pi * 2) * .07) / .16) ** 2)
band *= .7 + .15 * np.sin(x * np.pi * 4) + .15 * np.cos(x * np.pi * 10)
Image.fromarray((np.clip(band, 0, 1) * 255).astype("uint8")).save(OUT / "mist-alpha.png", optimize=True)

for name, w, h in [("lantern-glow", 128, 128), ("morning-ray", 128, 512)]:
    y, x = np.mgrid[0:h, 0:w] / np.array([h - 1, w - 1])[:, None, None]
    if name == "lantern-glow":
        distance = np.hypot(x - .5, y - .5) * 2
        alpha = np.maximum(0, 1 - distance) ** 3 * .33
        color = [243, 219, 169]
    else:
        alpha = np.exp(-((x - .5) / .2) ** 2 * 2) * np.sin(y * np.pi) ** 1.2 * .1
        color = [226, 235, 225]
    rgba = np.zeros((h, w, 4), dtype="uint8")
    rgba[..., :3] = color
    rgba[..., 3] = (alpha * 255).astype("uint8")
    Image.fromarray(rgba).save(OUT / f"{name}.png", optimize=True)

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--mountains-source", type=Path, help="Optional original transparent ink-wash artwork to package as WebP")
args = parser.parse_args()
if args.mountains_source:
    Image.open(args.mountains_source).save(OUT / "mountains-ink.webp", quality=90, method=6)

print(f"Saved {len(list(OUT.glob('*.png'))) + len(list(OUT.glob('*.webp')))} maps to {OUT}")
print(f"Total: {sum(p.stat().st_size for p in OUT.iterdir() if p.is_file()) / 1024:.0f} KiB")
