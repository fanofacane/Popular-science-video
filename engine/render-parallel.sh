#!/usr/bin/env bash
# Usage: ./render-parallel.sh <page.html> <out.mp4> [jobs=4]
# Splits the timeline into N parts, renders them at the same time, then joins them (no re-encode).
set -euo pipefail
page=$1; out=$(realpath -m "$2"); jobs=${3:-4}; fps=30
dur=$(node -e "import('playwright').then(async({chromium})=>{const b=await chromium.launch();const p=await b.newPage();await p.goto('file://'+require('path').resolve('$page'));await p.evaluate(()=>window.ready);console.log(await p.evaluate(()=>window.DURATION));await b.close()})")
frames=$(python3 -c "print(round($dur*$fps))"); per=$(( (frames + jobs - 1) / jobs ))
tmp=$(mktemp -d); : > "$tmp/list.txt"
for k in $(seq 0 $((jobs-1))); do
  f0=$((k*per)); f1=$(( (k+1)*per < frames ? (k+1)*per : frames ))
  from=$(python3 -c "print($f0/$fps)"); to=$(python3 -c "print($f1/$fps)")
  node render.mjs "$page" "$tmp/part$k.mp4" --from "$from" --to "$to" > "$tmp/log$k.txt" 2>&1 &
  echo "file '$tmp/part$k.mp4'" >> "$tmp/list.txt"
done
wait
ffmpeg -v error -y -f concat -safe 0 -i "$tmp/list.txt" -c copy "$out"
rm -rf "$tmp"; echo "done $out ($dur s)"
