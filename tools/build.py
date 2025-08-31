
import re, shutil, os, glob
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parents[1]
src = root
dist = root

index = dist/"index.html"
html = index.read_text(encoding="utf-8", errors="ignore")

# No-op: in repo version, CSS/JS already external & minified.
# This script keeps as placeholder for future pipeline steps.
print("Build completed. No further steps needed.")
