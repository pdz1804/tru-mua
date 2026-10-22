import assert from 'node:assert/strict';
import { test } from 'node:test';

import { checkBudget, measure } from './bundle-budget.mjs';
import { checkModel, readGlb, triangles } from './check-models.mjs';

const assets = [
  { file: 'assets/index-abc.js', kind: 'code', bytes: 300, gzip: 100 },
  { file: 'assets/chunk-def.js', kind: 'code', bytes: 90, gzip: 30 },
  { file: 'assets/index-xyz.css', kind: 'code', bytes: 80, gzip: 20 },
  { file: 'models/designer/a.glb', kind: 'model', bytes: 500, gzip: 500 },
  { file: 'models/designer/b.glb', kind: 'model', bytes: 200, gzip: 200 },
  { file: 'models/kaykit/t.png', kind: 'texture', bytes: 40, gzip: 40 },
];

test('measure splits code (gzip) from models and textures (raw)', () => {
  assert.deepEqual(measure(assets), {
    jsGzip: 130,
    cssGzip: 20,
    largestJsGzip: 100,
    modelBytes: 700,
    largestModelBytes: 500,
    textureBytes: 40,
  });
});

test('checkBudget passes at the limit and fails just above it', () => {
  const baseline = { headroom: 0.1, measures: { jsGzip: 100 } };
  assert.equal(checkBudget({ jsGzip: 110 }, baseline)[0].ok, true);
  assert.equal(checkBudget({ jsGzip: 111 }, baseline)[0].ok, false);
});

test('checkBudget rejects a measure the build does not produce', () => {
  assert.throws(() => checkBudget({}, { measures: { jsGzip: 100 } }), /missing or invalid/);
});

/** A minimal valid GLB around the given glTF JSON. */
function glb(json) {
  let text = JSON.stringify(json);
  while (text.length % 4) text += ' ';
  const body = Buffer.from(text, 'utf8');
  const head = Buffer.alloc(20);
  head.write('glTF', 0, 'ascii');
  head.writeUInt32LE(2, 4);
  head.writeUInt32LE(20 + body.length, 8);
  head.writeUInt32LE(body.length, 12);
  head.write('JSON', 16, 'ascii');
  return Buffer.concat([head, body]);
}

const cube = {
  asset: { version: '2.0' },
  meshes: [{ primitives: [{ attributes: { POSITION: 0 }, indices: 1 }] }],
  accessors: [{ count: 24 }, { count: 36 }],
};

test('readGlb and triangles read a valid binary', () => {
  assert.equal(triangles(readGlb(glb(cube))), 12);
  assert.deepEqual(checkModel('cube', glb(cube)).problems, []);
});

test('checkModel flags Draco, bad magic and empty files', () => {
  const draco = checkModel('d', glb({ ...cube, extensionsRequired: ['KHR_draco_mesh_compression'] }));
  assert.match(draco.problems.join(), /draco/);
  assert.match(checkModel('x', Buffer.from('not a model at all...')).problems.join(), /bad magic/);
  assert.match(checkModel('e', glb({ asset: { version: '2.0' } })).problems.join(), /no meshes/);
});
