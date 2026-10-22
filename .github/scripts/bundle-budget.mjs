// Download budget: compares the build (bundle-stats.json) with a committed baseline and fails
// when any measure grows beyond the allowed headroom (default 10%).
// Usage: node bundle-budget.mjs <bundle-stats.json> <baseline.json> [outFile]
// Measures are aggregates (not per hashed file name), so the baseline survives content-hash changes.
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

/** Totals per measure: gzip for code, raw bytes for models and textures, plus the largest of each. */
export function measure(assets) {
  const of = (test) => assets.filter(test);
  const sum = (list, k) => list.reduce((n, a) => n + a[k], 0);
  const max = (list, k) => list.reduce((m, a) => Math.max(m, a[k]), 0);
  const js = of((a) => a.file.endsWith('.js'));
  const css = of((a) => a.file.endsWith('.css'));
  const models = of((a) => a.kind === 'model');
  const textures = of((a) => a.kind === 'texture');
  return {
    jsGzip: sum(js, 'gzip'),
    cssGzip: sum(css, 'gzip'),
    largestJsGzip: max(js, 'gzip'),
    modelBytes: sum(models, 'bytes'),
    largestModelBytes: max(models, 'bytes'),
    textureBytes: sum(textures, 'bytes'),
  };
}

/** One row per baseline measure; `ok` is false when actual > baseline * (1 + headroom). */
export function checkBudget(actual, baseline) {
  const headroom = typeof baseline.headroom === 'number' ? baseline.headroom : 0.1;
  return Object.entries(baseline.measures).map(([key, base]) => {
    const value = actual[key];
    if (typeof value !== 'number' || typeof base !== 'number' || base <= 0) {
      throw new Error(`Budget measure "${key}" is missing or invalid`);
    }
    const limit = Math.round(base * (1 + headroom));
    return {
      key,
      baseline: base,
      limit,
      actual: value,
      deltaPct: ((value - base) / base) * 100,
      ok: value <= limit,
    };
  });
}

function main() {
  const [statsFile, baselineFile, outFile = 'bundle-budget.json'] = process.argv.slice(2);
  if (!statsFile || !baselineFile) {
    console.error('Usage: node bundle-budget.mjs <bundle-stats.json> <baseline.json> [outFile]');
    process.exit(2);
  }
  const { assets } = JSON.parse(readFileSync(statsFile, 'utf8'));
  if (!Array.isArray(assets) || assets.length === 0) throw new Error(`${statsFile} has no assets`);
  const rows = checkBudget(measure(assets), JSON.parse(readFileSync(baselineFile, 'utf8')));
  writeFileSync(outFile, JSON.stringify({ rows }, null, 2));
  for (const r of rows) {
    const verdict = r.ok ? 'ok  ' : 'FAIL';
    console.log(`${verdict} ${r.key}: ${r.actual} B (baseline ${r.baseline}, limit ${r.limit}, ${r.deltaPct.toFixed(1)}%)`);
  }
  if (rows.some((r) => !r.ok)) {
    console.error('::error::Download budget exceeded. Shrink the assets, or raise the baseline if the growth is intended.');
    process.exit(1);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) main();
