// Pure pause-state contract shared by animated postcards. A generation changes
// whenever a pause invalidates a scheduled animation frame, so an old frame
// can never revive itself after the user presses Play again.
export function createPlaybackState() {
  let galleryPaused = false;
  let manualPaused = false;
  let generation = 0;
  const isPaused = () => galleryPaused || manualPaused;
  const stop = () => { generation += 1; return generation; };
  return {
    isPaused,
    generation: () => generation,
    isCurrent: value => value === generation,
    pauseManual() { manualPaused = true; stop(); return true; },
    playManual() { manualPaused = false; return !isPaused(); },
    toggleManual() { return manualPaused ? this.playManual() : !this.pauseManual(); },
    setGalleryPaused(value) { galleryPaused = Boolean(value); if (galleryPaused) stop(); return !isPaused(); }
  };
}
