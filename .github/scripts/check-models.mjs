// Validates every designer model the manifest lists, the way three.js will load it on a phone:
// the file exists, is a glTF 2.0 binary, needs no extension we do not ship a decoder for (Draco,
// meshopt, KTX2), stays under the per-file size cap and the triangle cap, and nothing unlisted
// lies around in the folder. Writes a JSON report for the quality summary.
// Usage: node check-models.mjs <modelsDir> [outFile]
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

export const MAX_BYTES = 2 * 1024 * 1024;
export const MAX_TRIANGLES = 60_000;
const UNSUPPORTED = ['KHR_draco_mesh_compression', 'EXT_meshopt_compression', 'KHR_texture_basisu'];

/** Parses the GLB header and JSON chunk. Throws on anything three.js's GLTFLoader would reject. */
export function readGlb(buf) {
  if (buf.length < 20 || buf.toString('ascii', 0, 4) !== 'glTF') throw new Error('not a .glb (bad magic)');
  const version = buf.readUInt32LE(4);
  if (version !== 2) throw new Error(`glTF version ${version}, need 2`);
  if (buf.readUInt32LE(8) !== buf.length) throw new Error('header length does not match the file size');
  const jsonLength = buf.readUInt32LE(12);
  if (buf.toString('ascii', 16, 20) !== 'JSON') throw new Error('first chunk is not JSON');
  return JSON.parse(buf.toString('utf8', 20, 20 + jsonLength));
}

/** Triangles drawn, counted from index (or position) accessors of triangle-mode primitives. */
export function triangles(gltf) {
  let n = 0;
  for (const mesh of gltf.meshes ?? [])
    for (const p of mesh.primitives ?? []) {
      if ((p.mode ?? 4) !== 4) continue;
      const acc = gltf.accessors?.[p.indices ?? p.attributes?.POSITION];
      n += Math.floor((acc?.count ?? 0) / 3);
    }
  return n;
}

export function checkModel(name, buf) {
  const problems = [];
  let tris = 0;
  try {
    const gltf = readGlb(buf);
    tris = triangles(gltf);
    const needed = [...(gltf.extensionsRequired ?? []), ...(gltf.extensionsUsed ?? [])];
    for (const ext of UNSUPPORTED)
      if (needed.includes(ext)) problems.push(`uses ${ext} (no decoder shipped)`);
    if (!gltf.meshes?.length) problems.push('has no meshes');
    if (tris > MAX_TRIANGLES) problems.push(`${tris} triangles > ${MAX_TRIANGLES}`);
  } catch (err) {
    problems.push(err.message);
  }
  if (buf.length > MAX_BYTES) problems.push(`${buf.length} B > ${MAX_BYTES} B`);
  return { name, bytes: buf.length, triangles: tris, problems };
}

function main() {
  const [dir = 'public/models/designer', out = 'models-report.json'] = process.argv.slice(2);
  const listed = JSON.parse(readFileSync(join(dir, 'manifest.json'), 'utf8'));
  if (!Array.isArray(listed) || new Set(listed).size !== listed.length)
    throw new Error('manifest must be a list without duplicates');
  const rows = listed.map((name) => {
    const p = join(dir, `${name}.glb`);
    return existsSync(p)
      ? checkModel(name, readFileSync(p))
      : { name, bytes: 0, triangles: 0, problems: ['listed but missing'] };
  });
  const unlisted = readdirSync(dir)
    .filter((f) => f.endsWith('.glb') && !listed.includes(f.slice(0, -4)))
    .map((f) => f.slice(0, -4));
  writeFileSync(out, JSON.stringify({ rows, unlisted }, null, 2));
  const bad = rows.filter((r) => r.problems.length);
  for (const r of bad) console.error(`::error file=${dir}/${r.name}.glb::${r.problems.join('; ')}`);
  for (const u of unlisted)
    console.warn(`::warning file=${dir}/${u}.glb::not in manifest.json, ships but never loads`);
  console.log(`${rows.length} listed models, ${bad.length} with problems, ${unlisted.length} unlisted`);
  if (bad.length) process.exit(1);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) main();
