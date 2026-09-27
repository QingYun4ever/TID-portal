#!/usr/bin/env python
"""Pixel-level screenshot analysis — lets a non-vision agent verify rendering.

Usage:
  python scripts/imgstat.py shot.png [--grid 4x3] [--json]

Reports global luminance stats, per-region means, dominant colors and a coarse
ASCII luminance map so layout /空白 / 白屏 problems are detectable without eyes.
"""
import sys, json, argparse
from PIL import Image, ImageStat

def ascii_map(img, cols=64, rows=24, ramp=" .:-=+*#%@"):
    small = img.convert("L").resize((cols, rows), Image.BILINEAR)
    px = list(small.getdata())
    out = []
    for r in range(rows):
        line = "".join(ramp[min(len(ramp) - 1, px[r * cols + c] * len(ramp) // 256)] for c in range(cols))
        out.append(line)
    return "\n".join(out)

def region_stats(img, gx, gy):
    W, H = img.size
    grid = []
    for j in range(gy):
        row = []
        for i in range(gx):
            box = (i * W // gx, j * H // gy, (i + 1) * W // gx, (j + 1) * H // gy)
            crop = img.crop(box).convert("L")
            row.append(round(ImageStat.Stat(crop).mean[0], 1))
        grid.append(row)
    return grid

def dominant(img, n=8):
    small = img.convert("RGB").resize((160, 100), Image.BILINEAR)
    q = small.quantize(colors=n, method=Image.MEDIANCUT).convert("RGB")
    counts = {}
    for p in q.getdata():
        counts[p] = counts.get(p, 0) + 1
    total = sum(counts.values())
    top = sorted(counts.items(), key=lambda kv: -kv[1])[:n]
    return [{"hex": "#%02X%02X%02X" % c, "pct": round(v * 100 / total, 1)} for c, v in top]

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("path")
    ap.add_argument("--grid", default="4x3")
    ap.add_argument("--json", action="store_true")
    a = ap.parse_args()

    img = Image.open(a.path)
    rgb = img.convert("RGB")
    gx, gy = (int(x) for x in a.grid.lower().split("x"))
    lum = ImageStat.Stat(rgb.convert("L"))

    data = {
        "file": a.path,
        "size": list(img.size),
        "mean_luma": round(lum.mean[0], 2),
        "stddev_luma": round(lum.stddev[0], 2),
        "min_luma": lum.extrema[0][0],
        "max_luma": lum.extrema[0][1],
        "mean_rgb": [round(v, 1) for v in ImageStat.Stat(rgb).mean],
        "regions_luma": region_stats(rgb, gx, gy),
        "dominant": dominant(rgb),
    }

    if a.json:
        print(json.dumps(data, ensure_ascii=False, indent=2))
    else:
        print(f"file      : {data['file']}")
        print(f"size      : {data['size'][0]}x{data['size'][1]}")
        print(f"mean luma : {data['mean_luma']}  (stddev {data['stddev_luma']}, range {data['min_luma']}-{data['max_luma']})")
        print(f"mean rgb  : {data['mean_rgb']}")
        print(f"dominant  : {', '.join(d['hex'] + ' ' + str(d['pct']) + '%' for d in data['dominant'])}")
        print(f"regions   : ({gx}x{gy} luminance means)")
        for row in data["regions_luma"]:
            print("            " + "  ".join(f"{v:6.1f}" for v in row))
        print("\nluminance map:")
        print(ascii_map(rgb))

if __name__ == "__main__":
    main()
