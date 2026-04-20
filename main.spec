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

# ── Analysis ──────────────────────────────────────────────────────────────────
a = Analysis(  # noqa: F821
    [os.path.join(_base, "backend", "main.py")],
    pathex=[os.path.join(_base, "backend")],
    binaries=[],
    datas=[
        (os.path.join(_base, "notification.png"), "."),
    ],
    hiddenimports=[
        "uvicorn.logging",
        "uvicorn.loops",
        "uvicorn.loops.auto",
        "uvicorn.protocols",
        "uvicorn.protocols.http",
        "uvicorn.protocols.http.auto",
        "uvicorn.protocols.websockets",
        "uvicorn.protocols.websockets.auto",
        "uvicorn.lifespan",
        "uvicorn.lifespan.on",
        "email.mime.text",
        "email.mime.multipart",
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
