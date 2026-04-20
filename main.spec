# -*- mode: python ; coding: utf-8 -*-
"""
PyInstaller spec for Luogu-Contest-Reminder backend.
Build steps:
  1. python build_icons.py          # generate platform icon
  2. pyinstaller main.spec
"""
import sys
import os

block_cipher = None

# ── Icon selection per platform ──────────────────────────────────────────────
_base = os.path.dirname(os.path.abspath(SPEC))  # noqa: F821  (SPEC is injected by PyInstaller)
if sys.platform == "win32":
    _icon = os.path.join(_base, "notification.ico")
elif sys.platform == "darwin":
    _icon = os.path.join(_base, "notification.icns")
else:
    _icon = os.path.join(_base, "notification.png")

# ── collect_all helper (equiv. to --collect-all) ─────────────────────────────
from PyInstaller.utils.hooks import collect_all  # noqa: F821

def _collect(*packages):
    datas, binaries, hiddenimports = [], [], []
    for pkg in packages:
        d, b, h = collect_all(pkg)
        datas += d; binaries += b; hiddenimports += h
    return datas, binaries, hiddenimports

_extra_datas, _extra_binaries, _extra_hidden = _collect("uvicorn", "starlette", "fastapi")

# ── Analysis ──────────────────────────────────────────────────────────────────
a = Analysis(  # noqa: F821
    [os.path.join(_base, "backend", "main.py")],
    pathex=[os.path.join(_base, "backend")],
    binaries=_extra_binaries,
    datas=[
        (os.path.join(_base, "backend", "static"), "static"),
        (os.path.join(_base, "notification.png"), "."),
        *_extra_datas,
    ],
    hiddenimports=[
        "sqlalchemy.dialects.sqlite",
        "email_validator",
        "jose",
        "jose.backends",
        "passlib",
        "multipart",
        *_extra_hidden,
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)  # noqa: F821

exe = EXE(  # noqa: F821
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name="luogu-contest-reminder",
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,
    disable_windowed_traceback=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=_icon,
)
