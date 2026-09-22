"""Generate the Dubai Legal brand assets from the supplied artwork.

Run it from this directory:

    python3 make_logo.py

Inputs:  logo-source.jpg                 the artwork as supplied
Outputs: ../../public/logo.svg           the traced vector mark, transparent
         ../../public/logo.png           the mark as a transparent PNG
         ../../public/logo-mark.png      a small transparent PNG for the interface
         ../../public/icon-192.png       PWA icons, on white so they read anywhere
         ../../public/icon-512.png
         ../../public/apple-touch-icon.png
         ../../src/app/icon.png          the browser favicon

The JPEG is a white background with navy and gold line art. The white is dropped
by using how far each pixel sits from white as its alpha, and each ink colour is
traced into Bezier paths with potrace — so `logo.svg` is real vector art, not a
bitmap wrapped in an <svg> tag. The trace is taken from a 3x upscale so the thin
rules in the sail and the marks on the clock face survive.

Requires: pillow, potracer  (pip install --user pillow potracer)
"""

from collections import Counter
from pathlib import Path

import numpy as np
import potrace
from PIL import Image

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
PUBLIC = ROOT / 'public'
APP = ROOT / 'src' / 'app'

SRC = HERE / 'logo-source.jpg'
UPSCALE = 3
TURDSIZE = 1
OPTTOLERANCE = 0.1
ALPHAMAX = 1.0
INK_THRESHOLD = 244
GOLD_MARGIN = 16


def hex_colour(rgb):
    return '#%02X%02X%02X' % tuple(int(value) for value in rgb)


def luminance(rgb):
    return (
        0.299 * rgb[:, :, 0].astype(float)
        + 0.587 * rgb[:, :, 1].astype(float)
        + 0.114 * rgb[:, :, 2].astype(float)
    )


def classify(rgb):
    """(ink, gold) masks: everything that is not white, split by warmth."""
    ink = luminance(rgb) < INK_THRESHOLD
    gold = ink & ((rgb[:, :, 0].astype(int) - rgb[:, :, 2].astype(int)) > GOLD_MARGIN)
    return ink, gold


def load():
    """The cropped art at native size, and again upscaled for tracing."""
    source = Image.open(SRC).convert('RGB')
    bbox = source.convert('L').point(lambda value: 255 if value < INK_THRESHOLD - 4 else 0).getbbox()
    if bbox is None:
        raise SystemExit('the source image has no visible artwork')

    left, top, right, bottom = bbox
    pad = 6
    native = source.crop(
        (
            max(0, left - pad),
            max(0, top - pad),
            min(source.width, right + pad),
            min(source.height, bottom + pad),
        )
    )

    native_pixels = np.asarray(native).astype(np.uint8)
    native_ink, native_gold = classify(native_pixels.astype(np.int16))

    big = native.resize((native.width * UPSCALE, native.height * UPSCALE), Image.LANCZOS)
    big_pixels = np.asarray(big).astype(np.int16)
    big_ink, big_gold = classify(big_pixels)

    return {
        'native': native,
        'native_pixels': native_pixels,
        'native_ink': native_ink,
        'big': big,
        'big_pixels': big_pixels,
        'big_ink': big_ink,
        'big_gold': big_gold,
    }


def dominant(pixels, mask, fallback):
    selection = pixels[mask]
    if len(selection) == 0:
        return fallback
    return Counter(map(tuple, selection.tolist())).most_common(1)[0][0]


def trace(mask):
    """SVG subpaths for a mask, in the artwork's own coordinates."""
    data = np.asarray(mask, dtype=bool)
    padded = np.zeros((data.shape[0] + 2, data.shape[1] + 2), dtype=bool)
    padded[1:-1, 1:-1] = data

    path = potrace.Bitmap(padded).trace(
        turdsize=TURDSIZE, alphamax=ALPHAMAX, opttolerance=OPTTOLERANCE
    )

    def point(x, y):
        # Undo the padding, then the upscale, so the viewBox is the artwork's
        # own measurements rather than an arbitrary multiple.
        return ((x - 1) / UPSCALE, (y - 1) / UPSCALE)

    frame_x, frame_y = padded.shape[1] - 1, padded.shape[0] - 1
    subpaths = []
    for curve in path.curves:
        points = [(curve.start_point.x, curve.start_point.y)]
        for segment in curve:
            points.append((segment.end_point.x, segment.end_point.y))

        xs = [value[0] for value in points]
        ys = [value[1] for value in points]
        # potrace traces the image frame as a curve of its own; drop it.
        if min(xs) <= 0.4 and min(ys) <= 0.4 and max(xs) >= frame_x - 0.4 and max(ys) >= frame_y - 0.4:
            continue

        commands = []
        for index, segment in enumerate(curve):
            if index == 0:
                start = point(*points[0])
                commands.append(f'M{start[0]:.2f} {start[1]:.2f}')
            if segment.is_corner:
                corner = point(segment.c.x, segment.c.y)
                end = point(segment.end_point.x, segment.end_point.y)
                commands.append(f'L{corner[0]:.2f} {corner[1]:.2f}')
                commands.append(f'L{end[0]:.2f} {end[1]:.2f}')
            else:
                first = point(segment.c1.x, segment.c1.y)
                second = point(segment.c2.x, segment.c2.y)
                end = point(segment.end_point.x, segment.end_point.y)
                commands.append(
                    f'C{first[0]:.2f} {first[1]:.2f} {second[0]:.2f} {second[1]:.2f} '
                    f'{end[0]:.2f} {end[1]:.2f}'
                )
        commands.append('Z')
        subpaths.append(''.join(commands))

    return subpaths


def transparent_mark(native, pixels, ink):
    """The artwork as a PNG with a transparent background, pixel for pixel."""
    # Alpha keeps the original anti-aliasing: half-lit edge pixels stay half-lit,
    # which is what makes the mark sit properly on a coloured surface.
    alpha = np.where(ink, np.clip(255.0 - luminance(pixels.astype(int)), 0, 255), 0.0)
    alpha[alpha < 40] = 0.0

    rgba = np.dstack([pixels[:, :, 0], pixels[:, :, 1], pixels[:, :, 2], alpha]).astype(np.uint8)
    return Image.fromarray(rgba, 'RGBA')


def square_icon(mark, size, background):
    canvas = Image.new('RGBA', (size, size), background)
    scale = (size * 0.82) / max(mark.size)
    scaled = mark.resize(
        (max(1, int(mark.width * scale)), max(1, int(mark.height * scale))), Image.LANCZOS
    )
    canvas.paste(scaled, ((size - scaled.width) // 2, (size - scaled.height) // 2), scaled)
    return canvas


def save_png(image, path):
    """
    Save as a small palette PNG.

    The artwork is two flat inks with an alpha edge, so a sixteen-colour palette
    is far more than enough and turns a 200 kB file into a few kilobytes — which
    matters for a mark that sits in the header of every page.
    """
    image.convert('RGBA').quantize(colors=16, method=Image.FASTOCTREE).save(path, optimize=True)
    return path.stat().st_size


def main():
    artwork = load()
    native = artwork['native']
    width, height = native.size

    navy_colour = dominant(artwork['big_pixels'], artwork['big_ink'] & ~artwork['big_gold'], (19, 46, 76))
    gold_colour = dominant(artwork['big_pixels'], artwork['big_gold'], (194, 155, 78))
    print(f'artwork {width}x{height}  navy {hex_colour(navy_colour)}  gold {hex_colour(gold_colour)}')

    # The navy layer is the whole silhouette, so the gold is painted on top of it
    # and no hairline of background can show through where the two meet.
    navy_paths = trace(artwork['big_ink'])
    gold_paths = trace(artwork['big_gold'])

    svg = (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" '
        f'width="{width}" height="{height}" role="img" aria-label="Dubai Legal">\n'
        '  <title>Dubai Legal</title>\n'
        f'  <path fill="{hex_colour(navy_colour)}" d="{" ".join(navy_paths)}"/>\n'
        f'  <path fill="{hex_colour(gold_colour)}" d="{" ".join(gold_paths)}"/>\n'
        '</svg>\n'
    )
    (PUBLIC / 'logo.svg').write_text(svg)
    print(f'public/logo.svg      {len(svg):,} bytes   {len(navy_paths) + len(gold_paths)} paths')

    mark = transparent_mark(native, artwork['native_pixels'], artwork['native_ink'])
    print(f'public/logo.png      {mark.size[0]}x{mark.size[1]}  {save_png(mark, PUBLIC / "logo.png"):,} bytes')

    small = mark.copy()
    small.thumbnail((96, 96), Image.LANCZOS)
    print(
        f'public/logo-mark.png {small.size[0]}x{small.size[1]}  '
        f'{save_png(small, PUBLIC / "logo-mark.png"):,} bytes'
    )

    # Icons sit on white: a launcher, a tab strip or a home screen can be any
    # colour, and a navy mark on a transparent tile disappears against a dark one.
    for size, path in (
        (512, PUBLIC / 'icon-512.png'),
        (192, PUBLIC / 'icon-192.png'),
        (180, PUBLIC / 'apple-touch-icon.png'),
        (64, APP / 'icon.png'),
    ):
        written = save_png(square_icon(mark, size, (255, 255, 255, 255)), path)
        print(f'{path.relative_to(ROOT)}  {size}x{size}  {written:,} bytes')


if __name__ == '__main__':
    main()
