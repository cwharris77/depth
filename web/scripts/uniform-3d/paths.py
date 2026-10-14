"""Shared paths, importable from Blender's Python and a plain Python alike.

Source models live in the main checkout's ignored 3d/sources folder. Git's common dir is used so every worktree finds
that one copy; UNIFORM_3D_SOURCES overrides it."""
import os, subprocess
from pathlib import Path

HERE = Path(__file__).parent
_common = subprocess.run(['git', 'rev-parse', '--path-format=absolute', '--git-common-dir'], cwd=HERE, capture_output=True,
                         text=True, check=True).stdout.strip()
SOURCES = Path(os.environ.get('UNIFORM_3D_SOURCES', Path(_common).parent / '3d' / 'sources'))
BUILD = HERE / 'build'
