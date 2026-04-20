"""
Convert notification.png to platform-specific icon formats for PyInstaller.
Run this script once before packaging: python build_icons.py
"""
import sys
import os
from PIL import Image

SRC = os.path.join(os.path.dirname(__file__), "notification.png")


def make_ico(src: str, dst: str) -> None:
    img = Image.open(src).convert("RGBA")
    sizes = [16, 32, 48, 64, 128, 256]
    icons = [img.resize((s, s), Image.LANCZOS) for s in sizes]
    icons[0].save(dst, format="ICO", sizes=[(s, s) for s in sizes],
                  append_images=icons[1:])
    print(f"Created {dst}")


def make_icns(src: str, dst: str) -> None:
    """Create .icns via iconutil on macOS."""
    import subprocess, tempfile, shutil
    img = Image.open(src).convert("RGBA")
    iconset = tempfile.mkdtemp(suffix=".iconset")
    try:
        spec = {
            "icon_16x16": 16, "icon_16x16@2x": 32,
            "icon_32x32": 32, "icon_32x32@2x": 64,
            "icon_128x128": 128, "icon_128x128@2x": 256,
            "icon_256x256": 256, "icon_256x256@2x": 512,
            "icon_512x512": 512,
        }
        for name, size in spec.items():
            img.resize((size, size), Image.LANCZOS).save(
                os.path.join(iconset, f"{name}.png"))
        subprocess.run(["iconutil", "-c", "icns", iconset, "-o", dst], check=True)
        print(f"Created {dst}")
    finally:
        shutil.rmtree(iconset)


if __name__ == "__main__":
    base = os.path.dirname(os.path.abspath(__file__))
    if sys.platform == "win32":
        make_ico(SRC, os.path.join(base, "notification.ico"))
    elif sys.platform == "darwin":
        make_icns(SRC, os.path.join(base, "notification.icns"))
    else:
        print("Linux: PNG icon will be used directly.")
