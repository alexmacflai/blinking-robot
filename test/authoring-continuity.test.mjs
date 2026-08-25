import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { applySceneUpdate } from '../gallery/shared/controls.js';

test('shared rebuild updates explicitly preserve animation state', () => {
  let keepTime;
  applySceneUpdate({ rebuild(value) { keepTime = value; } }, 'rebuild');
  assert.equal(keepTime, true);
});

test('passing legs rebuild keeps traffic and does not warm up', () => {
  const source = fs.readFileSync(new URL('../gallery/postcards/passing-legs/scene.js', import.meta.url), 'utf8');
  assert.match(source, /function rebuild\(keepTime=true\)/);
  assert.match(source, /const previousRanks=keepTime\?ranks:\[\]/);
  assert.match(source, /if\(!keepTime\) warmup\(\)/);
  assert.doesNotMatch(source, /function rebuild\(\)\{ build\(\); warmup\(\);/);
});

test('every procedural postcard exposes a keep-time rebuild path', () => {
  const coffee = fs.readFileSync(new URL('../gallery/postcards/coffee/scene.js', import.meta.url), 'utf8');
  const windmill = fs.readFileSync(new URL('../gallery/postcards/windmill/scene.js', import.meta.url), 'utf8');
  assert.match(coffee, /function rebuild\(keepTime\)/);
  assert.match(coffee, /const t0=keepTime\?t:0/);
  assert.match(windmill, /function rebuild\(keepTime=true,warm=false\)/);
  assert.match(windmill, /const live=keepTime\s*\?/);
});
