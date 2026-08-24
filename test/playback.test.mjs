import test from 'node:test';
import assert from 'node:assert/strict';
import { createPlaybackState } from '../gallery/shared/playback.js';

test('manual pause invalidates an old frame and Play creates a usable new generation', () => {
  const playback = createPlaybackState();
  const oldFrame = playback.generation();
  assert.equal(playback.isPaused(), false);
  playback.pauseManual();
  assert.equal(playback.isPaused(), true);
  assert.equal(playback.isCurrent(oldFrame), false);
  assert.equal(playback.playManual(), true);
  assert.equal(playback.isPaused(), false);
  assert.equal(playback.isCurrent(playback.generation()), true);
});

test('gallery visibility pause and manual pause remain independent', () => {
  const playback = createPlaybackState();
  playback.setGalleryPaused(true);
  playback.playManual();
  assert.equal(playback.isPaused(), true);
  playback.setGalleryPaused(false);
  assert.equal(playback.isPaused(), false);
  playback.pauseManual();
  playback.setGalleryPaused(true);
  playback.setGalleryPaused(false);
  assert.equal(playback.isPaused(), true);
});
