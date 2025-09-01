#!/usr/bin/env bash
set -euo pipefail

# Usage: tools/encode_videos.sh [SRC] [--force]
# Default SRC
SRC="${1:-assets/hero-background.mp4}"
FORCE="false"
if [[ "${2:-}" == "--force" ]]; then
  FORCE="true"
fi

if [[ ! -f "$SRC" ]]; then
  echo "Erro: arquivo de origem não encontrado: $SRC" >&2
  exit 2
fi

# Verificações básicas do ffmpeg
if ! command -v ffmpeg >/dev/null 2>&1; then
  echo "Erro: ffmpeg não encontrado no PATH." >&2
  exit 3
fi

# Deriva nomes de saída a partir do SRC
# Ex.: assets/hero-background.mp4 -> assets/hero-background-{480,720,1080}.{webm,mp4}
SRC_DIR="$(dirname "$SRC")"
SRC_BASE="$(basename "$SRC")"
NAME_NOEXT="${SRC_BASE%.*}"

OUT_DIR="${SRC_DIR}"
mkdir -p "$OUT_DIR"

# Perf/perfis (ajuste conforme sua preferência)
# VP9 (webm): CRF 32~36 (menor = melhor qualidade/arquivo maior), velocidade good+tile
# H.264 (mp4): CRF 23~28, preset medium/fast
CRF_VP9=33
CRF_H264=24

# Lista de alturas de saída (mantém aspecto; largura calculada automaticamente e ajustada para par)
SIZES=(480 720 1080)

encode_webm() {
  local in="$1"
  local height="$2"
  local out="${OUT_DIR}/${NAME_NOEXT}-${height}.webm"

  if [[ -f "$out" && "$FORCE" != "true" ]]; then
    echo "Pulando (já existe): $out"
    return 0
  fi

  echo "Gerando $out"
  ffmpeg -y -loglevel error -stats \
    -i "$in" \
    -vf "scale=-2:${height}" \
    -c:v libvpx-vp9 -b:v 0 -crf "${CRF_VP9}" -row-mt 1 -tile-columns 1 -frame-parallel 1 -cpu-used 2 \
    -c:a libopus -b:a 128k \
    "$out"
}

encode_mp4() {
  local in="$1"
  local height="$2"
  local out="${OUT_DIR}/${NAME_NOEXT}-${height}.mp4"

  if [[ -f "$out" && "$FORCE" != "true" ]]; then
    echo "Pulando (já existe): $out"
    return 0
  fi

  echo "Gerando $out"
  ffmpeg -y -loglevel error -stats \
    -i "$in" \
    -vf "scale=-2:${height}" \
    -c:v libx264 -preset medium -crf "${CRF_H264}" -profile:v high -pix_fmt yuv420p -movflags +faststart \
    -c:a aac -b:a 128k \
    "$out"
}

echo "Fonte de vídeo: $SRC"
for h in "${SIZES[@]}"; do
  encode_webm "$SRC" "$h"
  encode_mp4  "$SRC" "$h"
done

echo "OK: encoding finalizado."
