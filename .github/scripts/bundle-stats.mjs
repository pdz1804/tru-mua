// Writes per-asset raw and gzip sizes of the Vite build to a JSON file.
// Code (js/css/html) is gzipped like the CDN serves it; 3D models and textures are counted raw,
// because .glb and image bytes barely compress and they dominate what a phone downloads.
// Usage: node bundle-stats.mjs <distDir> <outFile>
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { gzipSync } from 'node:zlib';

const [dist = 'dist', out = 'bundle-stats.json'] = process.argv.slice(2);

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

const CODE = /\.(js|css|html)$/;
const MODEL = /\.(glb|gltf|bin)$/;
const TEXTURE = /\.(png|jpe?g|webp|ktx2)$/;

const assets = walk(dist)
  .filter((p) => CODE.test(p) || MODEL.test(p) || TEXTURE.test(p))
  .map((p) => {
    const buf = readFileSync(p);
    const file = relative(dist, p).replaceAll('\\', '/');
    const kind = CODE.test(p) ? 'code' : MODEL.test(p) ? 'model' : 'texture';
    return {
      file,
      kind,
      bytes: buf.length,
      gzip: kind === 'code' ? gzipSync(buf, { level: 9 }).length : buf.length,
    };
  })
  .sort((a, b) => b.bytes - a.bytes);

writeFileSync(out, JSON.stringify({ assets }, null, 2));
console.log(`Wrote ${assets.length} assets to ${out}`);
