#!/usr/bin/env bash
set -euo pipefail
ASSETS_DIR="assets"
SRC=""
for cand in   "${ASSETS_DIR}/hero-background-source.mp4"   "${ASSETS_DIR}/hero-background-1080.mp4"   "${ASSETS_DIR}/hero-background.mp4"   "${ASSETS_DIR}/hero-background-1080.webm"   "${ASSETS_DIR}/hero-background.webm"
do
  if [ -f "$cand" ]; then SRC="$cand"; break; fi
done
if [ -z "$SRC" ]; then
  echo "::warning::Nenhum arquivo fonte encontrado para reencodar (ex.: assets/hero-background-source.mp4). Pulando etapa de vídeo."
  exit 0
fi
echo "Fonte de vídeo: $SRC"
if ! command -v ffmpeg >/dev/null 2>&1; then echo "::error::ffmpeg não está instalado"; exit 1; fi
encode_if_needed () {
  local dst="$1"; shift
  if [ ! -f "$dst" ] || [ "$SRC" -nt "$dst" ]; then
    echo "Gerando $dst"
    ffmpeg -y -v error "$@" && echo "OK: $dst" || { echo "::error::Falha ao gerar $dst"; exit 1; }
  else
    echo "Skip (atual): $dst"
  fi
}
# 480p
encode_if_needed "${ASSETS_DIR}/hero-background-480.webm" -i "$SRC" -vf scale=-2:480  -c:v libvpx-vp9 -b:v 1M   -crf 33 -g 120 -an
encode_if_needed "${ASSETS_DIR}/hero-background-480.mp4"  -i "$SRC" -vf scale=-2:480  -c:v libx264    -preset slow -crf 28 -profile:v baseline -pix_fmt yuv420p -an
# 720p
encode_if_needed "${ASSETS_DIR}/hero-background-720.webm" -i "$SRC" -vf scale=-2:720  -c:v libvpx-vp9 -b:v 1.5M -crf 32 -g 120 -an
encode_if_needed "${ASSETS_DIR}/hero-background-720.mp4"  -i "$SRC" -vf scale=-2:720  -c:v libx264    -preset slow -crf 27 -profile:v main     -pix_fmt yuv420p -an
# 1080p
encode_if_needed "${ASSETS_DIR}/hero-background-1080.webm" -i "$SRC" -vf scale=-2:1080 -c:v libvpx-vp9 -b:v 2.5M -crf 31 -g 120 -an
encode_if_needed "${ASSETS_DIR}/hero-background-1080.mp4"  -i "$SRC" -vf scale=-2:1080 -c:v libx264    -preset slow -crf 24 -profile:v high     -pix_fmt yuv420p -an
echo "Reencode concluído."
