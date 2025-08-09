#!/usr/bin/env bash
set -euo pipefail

# Compress files in dist/ with gzip and brotli.
# Defaults to only compressing common text assets. Use --all to compress every file type.
# Usage:
#   bash scripts/compress-dist.sh [--all] [--dir DIST_DIR]

ALL=0
DIST_DIR="dist"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --all)
      ALL=1
      shift
      ;;
    --dir)
      if [[ $# -lt 2 ]]; then
        echo "--dir requires a value" >&2
        exit 2
      fi
      DIST_DIR="$2"
      shift 2
      ;;
    *)
      echo "Unknown argument: $1" >&2
      echo "Usage: bash scripts/compress-dist.sh [--all] [--dir DIST_DIR]" >&2
      exit 2
      ;;
  esac
done

if [[ ! -d "$DIST_DIR" ]]; then
  echo "Directory not found: $DIST_DIR" >&2
  exit 1
fi

has_cmd() { command -v "$1" >/dev/null 2>&1; }

GZIP_OK=0
BROTLI_OK=0
if has_cmd gzip; then GZIP_OK=1; else echo "Warning: gzip not found; skipping gzip." >&2; fi
if has_cmd brotli; then BROTLI_OK=1; else echo "Warning: brotli not found; skipping brotli. Install with: brew install brotli" >&2; fi

# Build the find predicate based on mode
if [[ "$ALL" -eq 1 ]]; then
  # All files, except already-compressed outputs
  FIND_EXPR=( -type f ! -name '*.gz' ! -name '*.br' )
  echo "Compressing ALL files in $DIST_DIR (this may not help for already-compressed images/videos)" >&2
else
  # Only typical text assets
  FIND_EXPR=( -type f \
    \( -iname '*.html' -o -iname '*.css' -o -iname '*.js' -o -iname '*.mjs' -o -iname '*.cjs' \
       -iname '*.svg' -o -iname '*.json' -o -iname '*.xml' -o -iname '*.txt' -o -iname '*.map' \) \
    ! -name '*.gz' ! -name '*.br' )
  echo "Compressing text assets in $DIST_DIR (html, css, js, svg, json, xml, txt, map)" >&2
fi

# Run gzip and brotli as available
if [[ "$GZIP_OK" -eq 1 ]]; then
  echo "Running gzip..." >&2
  # -k keep original, -9 max compression, -f overwrite existing .gz
  find "$DIST_DIR" "${FIND_EXPR[@]}" -exec gzip -f -k -9 {} +
fi

if [[ "$BROTLI_OK" -eq 1 ]]; then
  echo "Running brotli..." >&2
  # -k keep original, -q 11 max quality, -f overwrite existing .br
  find "$DIST_DIR" "${FIND_EXPR[@]}" -exec brotli -f -k -q 11 {} +
fi

echo "Done." >&2
