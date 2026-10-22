// Aggregates the CI artifacts into one Markdown quality report.
// Usage: node quality-report.mjs <reportsDir>  (appends to $GITHUB_STEP_SUMMARY, or prints)
// Env: NEEDS_JSON = toJSON(needs) from the workflow; CODEQL_TOTAL / CODEQL_ERRORS.
import { appendFileSync, existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, join } from 'node:path';

const root = process.argv[2] ?? 'reports';
const out = [];
const w = (s = '') => out.push(s);

function files(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? files(p) : [p];
  });
}
const all = files(root).map((p) => p.replaceAll('\\', '/'));
const find = (re) => all.filter((p) => re.test(p));
function readJson(p) {
  try {
    return JSON.parse(readFileSync(p, 'utf8'));
  } catch (err) {
    console.warn(`Could not parse ${p}: ${err.message}`);
    return null;
  }
}
const pct = (n) => (typeof n === 'number' && Number.isFinite(n) ? `${n.toFixed(1)}%` : 'n/a');
const kb = (b) => (b >= 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(2)} MB` : `${(b / 1024).toFixed(1)} kB`);
const icon = (ok) => (ok ? 'pass' : 'FAIL');

w('# Quality report');
w();
w(`Commit \`${(process.env.GITHUB_SHA ?? 'local').slice(0, 7)}\` on \`${process.env.GITHUB_REF_NAME ?? 'local'}\``);
w();

// Job status overview
const needs = process.env.NEEDS_JSON ? JSON.parse(process.env.NEEDS_JSON) : {};
if (Object.keys(needs).length) {
  w('## Gates');
  w();
  w('| Job | Result |');
  w('|---|---|');
  for (const [job, v] of Object.entries(needs)) {
    const r = v.result;
    w(`| ${job} | ${r === 'success' ? 'pass' : r === 'skipped' ? 'skipped' : `**${r.toUpperCase()}**`} |`);
  }
  w();
}

// Unit tests (JUnit per Node version)
const junits = find(/unit-tests-node(\d+)\/.*junit\.xml$/);
if (junits.length) {
  w('## Unit tests (Vitest)');
  w();
  w('| Node | Tests | Passed | Failed | Skipped | Duration |');
  w('|---|---:|---:|---:|---:|---:|');
  for (const p of junits.sort()) {
    const node = p.match(/unit-tests-node(\d+)/)[1];
    const head = readFileSync(p, 'utf8').match(/<testsuites[^>]*>/)?.[0] ?? '';
    const attr = (k) => Number(head.match(new RegExp(`\\b${k}="([\\d.]+)"`))?.[1] ?? 0);
    const tests = attr('tests'),
      failed = attr('failures') + attr('errors'),
      skipped = attr('skipped');
    w(`| ${node} | ${tests} | ${tests - failed - skipped} | ${failed} | ${skipped} | ${attr('time').toFixed(1)} s |`);
  }
  w();
}

// Coverage
const cov = find(/unit-tests-node22\/.*coverage-summary\.json$/)[0];
if (cov) {
  const t = readJson(cov)?.total;
  if (t) {
    w('## Coverage');
    w();
    w('| Lines | Branches | Functions | Statements |');
    w('|---:|---:|---:|---:|');
    w(`| ${[t.lines, t.branches, t.functions, t.statements].map((m) => pct(m.pct)).join(' | ')} |`);
    w();
  }
}

// Lint
const eslint = find(/lint-report\/eslint\.json$/)[0];
if (eslint) {
  const results = readJson(eslint) ?? [];
  const errors = results.reduce((n, r) => n + (r.errorCount ?? 0), 0);
  const warnings = results.reduce((n, r) => n + (r.warningCount ?? 0), 0);
  w('## Lint (ESLint, zero warnings)');
  w();
  w('| Files | Errors | Warnings | Gate |');
  w('|---:|---:|---:|---|');
  w(`| ${results.length} | ${errors} | ${warnings} | ${icon(errors === 0 && warnings === 0)} |`);
  w();
}

// Download budget
const budget = find(/build-quality\/.*bundle-budget\.json$/)[0];
if (budget) {
  const { rows = [] } = readJson(budget) ?? {};
  w('## Download budget (blocks above baseline + 10%)');
  w();
  w('| Measure | Baseline | Limit | Actual | Change | Gate |');
  w('|---|---:|---:|---:|---:|---|');
  for (const r of rows) {
    const delta = `${r.deltaPct >= 0 ? '+' : ''}${r.deltaPct.toFixed(1)}%`;
    w(`| ${r.key} | ${kb(r.baseline)} | ${kb(r.limit)} | ${kb(r.actual)} | ${delta} | ${icon(r.ok)} |`);
  }
  w();
}
const bundle = find(/build-quality\/.*bundle-stats\.json$/)[0];
if (bundle) {
  const { assets = [] } = readJson(bundle) ?? {};
  const code = assets.filter((a) => a.kind === 'code');
  w('## Code bundle');
  w();
  w('| Asset | Size | Gzip |');
  w('|---|---:|---:|');
  for (const a of code) w(`| \`${a.file}\` | ${kb(a.bytes)} | ${kb(a.gzip)} |`);
  w();
}

// 3D models
const models = find(/build-quality\/.*models-report\.json$/)[0];
if (models) {
  const { rows = [], unlisted = [] } = readJson(models) ?? {};
  const bad = rows.filter((r) => r.problems.length);
  const total = rows.reduce((n, r) => n + r.bytes, 0);
  const tris = rows.reduce((n, r) => n + r.triangles, 0);
  w('## Designer models (glTF 2.0 binary, no Draco/meshopt/KTX2, at most 2 MB and 60k triangles each)');
  w();
  w(`**${rows.length} listed**, ${bad.length} with problems, ${unlisted.length} unlisted; ${kb(total)} and ${tris.toLocaleString('en')} triangles in all.`);
  w();
  w('| Heaviest models | Size | Triangles | Result |');
  w('|---|---:|---:|---|');
  const heavy = [...bad, ...[...rows].sort((a, b) => b.bytes - a.bytes).filter((r) => !bad.includes(r))];
  for (const r of heavy.slice(0, Math.max(10, bad.length)))
    w(`| \`${r.name}\` | ${kb(r.bytes)} | ${r.triangles.toLocaleString('en')} | ${r.problems.length ? `FAIL: ${r.problems.join('; ')}` : 'pass'} |`);
  w();
}

// Playwright, one JSON report per viewport project
const pws = find(/e2e-(desktop|mobile)\/.*playwright-results\.json$/);
if (pws.length) {
  w('## Browser walkthrough (Playwright, CPU-rendered WebGL)');
  w();
  w('| Viewport | Passed | Failed | Flaky | Skipped | Duration |');
  w('|---|---:|---:|---:|---:|---:|');
  for (const p of pws.sort()) {
    const st = readJson(p)?.stats ?? {};
    const vp = p.match(/e2e-(desktop|mobile)\//)[1];
    w(`| ${vp} | ${st.expected ?? 0} | ${st.unexpected ?? 0} | ${st.flaky ?? 0} | ${st.skipped ?? 0} | ${((st.duration ?? 0) / 1000).toFixed(0)} s |`);
  }
  w();
}

// npm audit
const audits = find(/audit-reports\/.*-audit\.json$/);
if (audits.length) {
  w('## Dependency audit (production high/critical blocks; all dependencies report only)');
  w();
  w('| Scope | Critical | High | Moderate | Low |');
  w('|---|---:|---:|---:|---:|');
  for (const p of audits.sort()) {
    const v = readJson(p)?.metadata?.vulnerabilities ?? {};
    const scope = basename(p) === 'prod-audit.json' ? 'production' : 'all (report only)';
    w(`| ${scope} | ${v.critical ?? '?'} | ${v.high ?? '?'} | ${v.moderate ?? '?'} | ${v.low ?? '?'} |`);
  }
  w();
}

// CodeQL
if (process.env.CODEQL_TOTAL !== undefined && process.env.CODEQL_TOTAL !== '') {
  const errors = Number(process.env.CODEQL_ERRORS ?? 0);
  w('## Static analysis (CodeQL security-and-quality)');
  w();
  w('| Findings | Error-level | Gate |');
  w('|---:|---:|---|');
  w(`| ${process.env.CODEQL_TOTAL} | ${errors} | ${icon(errors === 0)} |`);
  w();
}

w('## Artifacts');
w();
w(
  'ESLint JSON, bundle stats and budget, the model report, Playwright HTML reports per viewport (traces and screenshots on failure), audit JSON and CodeQL SARIF are attached to this run.',
);

const md = out.join('\n') + '\n';
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, md);
else process.stdout.write(md);
