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

const drain = controls.section('DRAIN', 'The flow the cloud is carried by. Nothing here draws a spiral — the arms are what shearing the cloud produces.');
r(drain, 'inflow', 'pool.drain', 0, 0.25, 0.002, v => v < 0.001 ? 'stopped' : v.toFixed(3));
drain.note('How fast material is pulled toward the centre. 0 leaves the cloud turning without draining.');
r(drain, 'rotation', 'pool.spin', -1, 1, 0.005, v => Math.abs(v) < 0.004 ? 'still' : `${v.toFixed(3)} ${v > 0 ? '↻' : '↺'}`);
r(drain, 'shear', 'pool.shear', 0, 2.5, 0.05, v => v.toFixed(2));
drain.note('Shear makes the inner cloud turn faster than the outer cloud. This is what winds lobes into arms; at 0 the whole field turns rigidly and no spiral forms.');
r(drain, 'empty centre', 'pool.coreFade', 0.02, 0.6, 0.005, v => `${(v * 100).toFixed(0)}% of radius`);
drain.note('Material thins out across this inner fraction and runs out before the middle, so nothing pops.');

const cloud = controls.section('CLOUD MATERIAL', 'The mass itself: how big the lobes are and how much of the field they cover.');
r(cloud, 'lobe size', 'pool.cloudScale', 1.5, 16, 0.1, v => v.toFixed(1));
cloud.note('Lower is fewer, larger masses. Higher breaks the sea into finer detail.');
r(cloud, 'coverage', 'pool.cutoff', 0.25, 0.75, 0.005, v => v.toFixed(3));
cloud.note('The density cut. Lower covers more of the field with cloud; higher opens it up.');
r(cloud, 'edge hardness', 'pool.edgeSoft', 0.005, 0.3, 0.005, v => v.toFixed(3));
cloud.note('Small values give hard graphic silhouettes; large values dissolve them into haze.');
cloud.number({ label: 'seed', path: 'pool.seed', step: 0.1, update: 'render' });
cloud.action('RE-ROLL CLOUD', () => { cfg.pool.seed = Math.round(Math.random() * 2000) / 10; controls.notify('reshaped'); }, 'render');
r(cloud, 'grain', 'pool.grain', 0, 0.12, 0.002, v => v.toFixed(3));

const tone = controls.section('CLOUD TONE', 'Depth reads through position, which is what keeps the twisting form legible in monochrome.');
r(tone, 'outer tone', 'pool.edgeTone', 0, 1, 0.005, v => v.toFixed(3));
r(tone, 'inner tone', 'pool.innerTone', 0, 1, 0.005, v => v.toFixed(3));
tone.note('The bowl: cloud darkens (or lightens) as it descends toward the drain.');
r(tone, 'gap tone', 'pool.gapTone', 0, 1, 0.005, v => v.toFixed(3));
tone.note('What shows between the lobes. Near-ink reads as a void below the sea; mid tones read as shadowed cloud.');
r(tone, 'near/far shading', 'pool.farNearShade', 0, 0.4, 0.005, v => v.toFixed(3));
tone.note('Separates the ellipse’s lower (near) rim from its upper (far) rim.');
r(tone, 'rim blend', 'pool.outerBlend', 0.05, 1, 0.01, v => v.toFixed(2));
tone.note('How gradually the drained field hands over to the still cloud sea around it.');

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
