"""Regenerate all app logo assets from a single source PNG.

Source : public/ts-global-erp-logo.png  (save the new logo here)
Targets: logo.png (sidebar/login), logo192.png, logo512.png,
         favicon-16x16.png, favicon.ico  (browser tab + PWA manifest)

Usage:  python scripts/apply-logo.py
"""
import os
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUBLIC = os.path.join(ROOT, "public")
SOURCE = os.path.join(PUBLIC, "ts-global-erp-logo.png")

# (filename, size or None to keep source size)
TARGETS = [
    ("logo.png", None),
    ("logo512.png", (512, 512)),
    ("logo192.png", (192, 192)),
    ("favicon-16x16.png", (16, 16)),
]
ICO_SIZES = [(16, 16), (32, 32), (48, 48), (64, 64)]


def main() -> None:
    if not os.path.exists(SOURCE):
        raise SystemExit(
            f"Source not found: {SOURCE}\n"
            "Save the new logo PNG to public/ts-global-erp-logo.png first."
        )

    src = Image.open(SOURCE).convert("RGBA")
    print(f"source: {SOURCE}  ({src.width}x{src.height})")

    for name, size in TARGETS:
        out = os.path.join(PUBLIC, name)
        img = src if size is None else src.resize(size, Image.LANCZOS)
        img.save(out)
        print(f"  wrote {name}  ({img.width}x{img.height})")

    ico_path = os.path.join(PUBLIC, "favicon.ico")
    src.save(ico_path, format="ICO", sizes=ICO_SIZES)
    print(f"  wrote favicon.ico  {ICO_SIZES}")

    print("done.")


if __name__ == "__main__":
    main()
