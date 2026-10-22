#!/usr/bin/env bash
# Black-box smoke test of a deployed copy of the site (a preview channel or the live site).
# Read-only GETs, no secrets. The page must serve the React mount point, the app script must load,
# and every designer model in the manifest must download as a glTF binary, because one missing
# file silently leaves a code-built stand-in in the scene.
# Usage: smoke.sh <base-url> <title>   (appends a Markdown table to $GITHUB_STEP_SUMMARY)
set -uo pipefail

base="${1%/}"
title="${2:-Smoke test}"
max_seconds="${MAX_SECONDS:-5}"
fail=0
rows=""
tmp="$(mktemp -d)"

# check <label> <path> <expected content-type prefix> [extra test on the body]
check() {
  local label="$1" path="$2" want="$3" extra="${4:-true}" out code secs type ok="pass"
  out=$(curl -sS -o "$tmp/body" -w '%{http_code}|%{time_total}|%{content_type}' \
    --retry 2 --retry-delay 3 --max-time 30 "$base$path" 2>/dev/null) || out="000|0|-"
  IFS="|" read -r code secs type <<<"$out"
  if [ "$code" != "200" ] || [[ "$type" != "$want"* ]] || ! eval "$extra"; then ok="FAIL"; fail=1; fi
  if awk "BEGIN{exit !($secs > $max_seconds)}"; then ok="FAIL (slow)"; fail=1; fi
  rows+="| $label | \`$path\` | $code | ${type%%;*} | $(awk "BEGIN{printf \"%.0f\", $secs*1000}") ms | $ok |"$'\n'
}

# untimed warm-up so a cold CDN edge does not count against response times
curl -sS -o /dev/null --max-time 30 "$base/" || true

check "Page" "/" "text/html" "grep -q '<div id=\"root\">' \"\$tmp/body\""
script=$(grep -oE 'assets/index-[A-Za-z0-9_-]+\.js' "$tmp/body" | head -1)
if [ -n "$script" ]; then
  check "App script" "/$script" "text/javascript"
else
  rows+="| App script | - | - | - | - | FAIL (no script tag) |"$'\n'
  fail=1
fi
check "Model manifest" "/models/designer/manifest.json" "application/json" "jq -e 'length > 0' \"\$tmp/body\" >/dev/null"
cp "$tmp/body" "$tmp/manifest.json"

# every listed designer model: 200, glTF magic, non-empty
models=0
broken=""
while read -r name; do
  [ -n "$name" ] || continue
  models=$((models + 1))
  code=$(curl -sS -o "$tmp/m.glb" -w '%{http_code}' --retry 2 --max-time 30 "$base/models/designer/$name.glb" 2>/dev/null || echo 000)
  if [ "$code" != "200" ] || [ "$(head -c 4 "$tmp/m.glb")" != "glTF" ]; then broken+="$name ($code) "; fi
done < <(jq -r '.[]' "$tmp/manifest.json" 2>/dev/null)
if [ -z "$broken" ] && [ "$models" -gt 0 ]; then model_ok=pass; else model_ok="FAIL: ${broken:-none listed}"; fail=1; fi

{
  echo "## $title: $base"
  echo
  [ "$fail" -eq 0 ] && echo "**Status: UP**, all checks passed." || echo "**Status: DEGRADED OR DOWN**, see failures below."
  echo
  echo "| Check | Path | HTTP | Content type | Response time | Result |"
  echo "|---|---|---:|---|---:|---|"
  printf '%s' "$rows"
  echo
  echo "| Invariant | Value | Result |"
  echo "|---|---:|---|"
  echo "| Designer models served as glTF binaries | $models | $model_ok |"
  echo
  echo "_Checked $(date -u '+%Y-%m-%d %H:%M UTC')_"
} >> "${GITHUB_STEP_SUMMARY:-/dev/stdout}"

if [ "$fail" -ne 0 ]; then
  echo "::error title=$title failed::$base failed one or more checks; see the job summary."
  exit 1
fi
echo "$title passed: $base ($models models)"
