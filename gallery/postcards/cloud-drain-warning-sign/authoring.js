import { createPostcardControls, saveCanvasPng, saveCanvasVideo } from '../../shared/controls.js';
import { applyRenderSelection, installRenderMessageHandler, paletteLabel } from '../../shared/render-settings.js';

const engine = window.__drain, cfg = engine.CFG;
const galleryConfig = await fetch('./gallery.json', { cache: 'no-store' }).then(response => response.json());

const scene = {
  fit: () => engine.fit(),
  render: () => engine.render(),
  refresh: () => engine.refresh(),
  update: () => engine.update(true),
  rebuild: () => engine.rebuild(true),
  togglePaused: () => engine.toggle(),
  savePng: () => saveCanvasPng(document.querySelector('#c'), 'cloud-drain-warning-sign-frame-2160x3840.png'),
  saveVideo: options => { engine.play(); return saveCanvasVideo(document.querySelector('#c'), options); },
  info: () => ({ W: cfg.gridK * 9, H: cfg.gridK * 16 })
};

const controls = createPostcardControls({
  panel: document.querySelector('#panel'),
  title: 'CLOUD-DRAIN WARNING SIGN',
  description: 'A warning sign above a cloud sea going down a drain.',
  scene, config: cfg,
  valuesFile: 'values.json',
  gridValues: [11, 13, 16, 20, 26, 32, 40, 48],
  galleryConfig, galleryFile: 'gallery.json'
});

const renderSettings = window.DRAIN_RENDER_SETTINGS;
installRenderMessageHandler(scene, cfg, renderSettings);

const presets = controls.section('GLOBAL RENDER PRESETS', 'Saved global presets are shared with the gallery. Local experiments remain only in downloaded postcard values.');
presets.select({ label: 'global palette', get: () => cfg.render.globalSelection.palette, set: id => { applyRenderSelection(cfg, renderSettings, { ...cfg.render.globalSelection, palette: id }); }, values: renderSettings.palettes.map(p => ({ value: p.id, label: paletteLabel(p) })), update: 'refresh' });
presets.select({ label: 'global pixel grid', get: () => cfg.render.globalSelection.pixelPreset, set: id => { applyRenderSelection(cfg, renderSettings, { ...cfg.render.globalSelection, pixelPreset: id }); }, values: renderSettings.pixelPresets.map(p => ({ value: p.id, label: p.name })), update: 'rebuild' });

const r = (section, label, path, min, max, step, format, update = 'render') => section.range({ label, path, min, max, step, format, update });

const view = controls.section('VIEW', 'Where the whirlpool sits and how far above it the camera reads.');
r(view, 'drain centre x', 'pool.cx', 40, 194, 1, v => v);
r(view, 'drain centre y', 'pool.cy', 150, 400, 1, v => v);
r(view, 'drain radius', 'pool.radius', 60, 260, 1, v => v);
r(view, 'camera elevation', 'pool.squashY', 0.15, 1, 0.01, v => v.toFixed(2));
view.note('Elevation squashes the circle into an ellipse. 1.00 is straight down; low values flatten to a horizon.');

const spiral = controls.section('SPIRAL');
r(spiral, 'arms', 'pool.arms', 1, 8, 1, v => v);
r(spiral, 'twist', 'pool.rings', 0.1, 3, 0.05, v => v.toFixed(2));
spiral.note('Twist is the log spiral’s tightness: higher values coil the arms more and pack them closer toward the centre.');
r(spiral, 'drain speed', 'pool.rotSpeed', -0.6, 0.6, 0.005, v => Math.abs(v) < 0.004 ? 'stopped' : `${v.toFixed(3)} ${v > 0 ? 'inward' : 'outward'}`);
spiral.note('Positive speed pulls material inward. 0 stops the drain without changing its shape.');
r(spiral, 'band depth', 'pool.bandDepth', 0, 0.45, 0.005, v => v.toFixed(3));
r(spiral, 'band hardness', 'pool.bandHard', 0, 0.95, 0.01, v => v.toFixed(2));
spiral.note('Hardness turns the arms from a soft gradient into flat graphic masses.');

const tone = controls.section('CLOUD TONE', 'Depth reads through position, so these are the controls that keep the spiral from collapsing into a blob.');
r(tone, 'outer tone', 'pool.edgeTone', 0, 1, 0.005, v => v.toFixed(3));
r(tone, 'inner tone', 'pool.innerTone', 0, 1, 0.005, v => v.toFixed(3));
r(tone, 'centre tone', 'pool.centreTone', 0, 1, 0.005, v => v.toFixed(3));
r(tone, 'near/far shading', 'pool.farNearShade', 0, 0.4, 0.005, v => v.toFixed(3));
tone.note('Near/far shading separates the ellipse’s lower (near) rim from its upper (far) rim.');
r(tone, 'centre fade', 'pool.coreFade', 0.02, 0.6, 0.005, v => `${(v * 100).toFixed(0)}% of radius`);
tone.note('Material diminishes across this inner fraction and disappears without a pop.');
r(tone, 'outer edge softness', 'pool.edgeSoft', 0, 0.5, 0.005, v => v.toFixed(3));
r(tone, 'cloud grain', 'pool.grain', 0, 0.12, 0.002, v => v.toFixed(3));

const sky = controls.section('SKY');
r(sky, 'tone', 'bg.tone', 0, 1, 0.005, v => v.toFixed(3));
r(sky, 'grain', 'bg.grain', 0, 0.12, 0.002, v => v.toFixed(3));

const sea = controls.section('CLOUD SEA', 'The continuous mass the whirlpool is a depression in.');
r(sea, 'horizon', 'sea.horizonY', 80, 380, 1, v => v);
r(sea, 'horizon softness', 'sea.horizonSoft', 1, 80, 1, v => v);
r(sea, 'tone', 'sea.tone', 0, 1, 0.005, v => v.toFixed(3));
r(sea, 'depth shading', 'sea.depthShade', -0.5, 0.5, 0.005, v => v.toFixed(3));
sea.note('Depth shading darkens or lightens the sea toward the bottom edge, so it does not read as one flat fill.');
r(sea, 'grain', 'sea.grain', 0, 0.12, 0.002, v => v.toFixed(3));

const sign = controls.section('SIGN');
r(sign, 'horizontal', 'sign.cx', 40, 194, 1, v => v);
r(sign, 'top', 'sign.topY', 10, 240, 1, v => v);
r(sign, 'size', 'sign.size', 14, 110, 1, v => v);
r(sign, 'border weight', 'sign.stroke', 1, 12, 0.25, v => v.toFixed(2));
r(sign, 'border tone', 'sign.tone', 0, 1, 0.005, v => v.toFixed(3));
r(sign, 'face tone', 'sign.faceTone', 0, 1, 0.005, v => v.toFixed(3));
r(sign, 'pictogram tone', 'sign.pictogramTone', 0, 1, 0.005, v => v.toFixed(3));
r(sign, 'pictogram size', 'sign.pictogramScale', 0.2, 1.1, 0.01, v => v.toFixed(2));
sign.note('The pictogram is a hand reaching upward, printed on the face only. It never becomes a physical hand.');

const pole = controls.section('POLE');
r(pole, 'width', 'pole.width', 1, 10, 0.25, v => v.toFixed(2));
r(pole, 'tone', 'pole.tone', 0, 1, 0.005, v => v.toFixed(3));
r(pole, 'wind sway', 'pole.swayAmp', 0, 3, 0.05, v => v < 0.03 ? 'still' : `${v.toFixed(2)}°`);
r(pole, 'sway speed', 'pole.swaySpeed', 0.05, 1.5, 0.01, v => `${v.toFixed(2)}/s`);
pole.note('Sway is wind, not the drain. Keep it small enough that the sign never looks pulled toward the centre.');

controls.sync();
setInterval(() => controls.sync(), 500);
