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
  description: 'One cloud, spiralling into a drain under an indifferent sign.',
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

const cam = controls.section('CAMERA', 'The camera looks down into the drain. Its pitch is derived from height and distance, so it always points at the funnel.');
r(cam, 'height above rim', 'cam.up', 10, 260, 1, v => v);
r(cam, 'distance back', 'cam.back', 60, 500, 5, v => v);
cam.note('Raising height alone flattens the funnel toward a plan view; pulling back alone weakens the perspective between the near and far rims.');
r(cam, 'focal length', 'cam.focal', 120, 900, 5, v => v);
r(cam, 'horizon', 'cam.horizon', 80, 400, 1, v => v);
r(cam, 'sideways', 'cam.offX', -80, 80, 1, v => `${v > 0 ? '+' : ''}${v}`);
cam.diagnostic(() => {
  const s = cfg.spiral, c = cfg.cam;
  const pitch = Math.atan2(c.up, Math.max(1, c.back)) * 180 / Math.PI;
  return `pitch        ${pitch.toFixed(1)}°\nrim radius   ${s.outerR}\nfunnel depth ${s.depth}`;
});

const spiral = controls.section('THE SPIRAL', 'The cloud’s centreline: one logarithmic helix descending as it winds in. This is the shape of the cloud, not a pattern drawn on it.');
r(spiral, 'rim radius', 'spiral.outerR', 20, 160, 1, v => v);
spiral.note('Beyond about 70 the outer coil runs past the frame edges, which is what makes it read as a sea rather than an object.');
r(spiral, 'tightening', 'spiral.tighten', 0.15, 1.2, 0.01, v => v.toFixed(2));
spiral.note('How fast the coils close in. Together with cloud thickness this decides whether the turns stay separate or merge into a solid bowl.');
r(spiral, 'turns', 'spiral.turns', 2, 9, 0.5, v => `${v} turns`);
r(spiral, 'funnel depth', 'spiral.depth', 0, 160, 1, v => v);
spiral.note('0 lays the spiral flat. Depth is what turns it into a drain rather than a whirl on a surface.');
r(spiral, 'rotation', 'spiral.phase', -3.15, 3.15, 0.01, v => `${(v * 180 / Math.PI).toFixed(0)}°`);
spiral.select({ label: 'handedness', get: () => String(cfg.spiral.handed), set: v => { cfg.spiral.handed = Number(v); }, values: [{ value: '1', label: 'clockwise' }, { value: '-1', label: 'anticlockwise' }], update: 'render' });

const cloud = controls.section('THE CLOUD', 'One continuous body wrapped around that centreline. The lobes are how it is built, not separate clouds — keep enough of them that the silhouette stays single.');
r(cloud, 'thickness', 'cloud.thick', 3, 40, 0.5, v => v.toFixed(1));
cloud.note('Thicker than the gap between coils and the turns merge into one mass; thinner and the spiral arm reads clearly.');
r(cloud, 'flow', 'cloud.flow', 0, 0.5, 0.005, v => v < 0.002 ? 'stopped' : `${v.toFixed(3)} · ${(cfg.spiral.turns / v).toFixed(0)}s cycle`);
cloud.note('How fast material travels inward along the body. The cycle length is shown because the cloud repeats — that is deliberate, and it is what stops the scene degrading over time.');
r(cloud, 'body detail', 'cloud.lobes', 120, 2400, 20, v => v);
cloud.note('Too few and the body breaks into visible beads; more costs frame time without changing the silhouette.');
r(cloud, 'head size', 'cloud.headSwell', 0, 2.2, 0.05, v => v.toFixed(2));
r(cloud, 'head spacing', 'cloud.headScale', 0.1, 8, 0.05, v => v.toFixed(2));
cloud.note('Heads are the big cumulus bulges. Spacing must stay high enough that a head spans only a handful of lobes, or the body just swells smoothly and stops reading as cloud.');
r(cloud, 'edge roughness', 'cloud.roughen', 0, 1.4, 0.02, v => v.toFixed(2));
r(cloud, 'wander', 'cloud.billow', 0, 0.8, 0.01, v => v.toFixed(2));
cloud.note('How far the body strays off its centreline. A little keeps the coil from looking machined.');
r(cloud, 'wander spacing', 'cloud.billowScale', 1, 20, 0.5, v => v.toFixed(1));
r(cloud, 'silhouette hardness', 'cloud.edge', 0.02, 0.6, 0.01, v => v.toFixed(2));
r(cloud, 'thin out at centre', 'cloud.tipFade', 0.02, 0.8, 0.01, v => v.toFixed(2));
cloud.note('Material runs out before the middle so nothing is left to pop. Lower values keep cloud closer in to the drain.');

const tone = controls.section('CLOUD TONE', 'Depth is carried by value, which is what keeps the coil legible in monochrome.');
r(tone, 'near tone', 'cloud.nearTone', 0, 1, 0.005, v => v.toFixed(3));
r(tone, 'far tone', 'cloud.farTone', 0, 1, 0.005, v => v.toFixed(3));
tone.note('The near and far arcs of the same body must not share a value, or the coil flattens.');
r(tone, 'depth into funnel', 'cloud.depthShade', 0, 0.8, 0.01, v => v.toFixed(2));
tone.note('Darkens material as it descends, so the funnel has a floor.');
r(tone, 'form shading', 'cloud.formShade', 0, 0.9, 0.01, v => v.toFixed(2));
tone.note('Lighter tops, darker undersides. This is what makes the mass read as volume instead of a flat disc.');

const sky = controls.section('SKY');
r(sky, 'tone', 'bg.tone', 0, 1, 0.005, v => v.toFixed(3));
r(sky, 'grain', 'bg.grain', 0, 0.12, 0.002, v => v.toFixed(3));

const sign = controls.section('SIGN', 'Standing in the same space as the cloud: its foot is the drain’s own axis, projected.');
r(sign, 'top', 'sign.topY', 10, 240, 1, v => v);
r(sign, 'size', 'sign.size', 14, 120, 1, v => v);
r(sign, 'border weight', 'sign.stroke', 1, 12, 0.25, v => v.toFixed(2));
r(sign, 'border tone', 'sign.tone', 0, 1, 0.005, v => v.toFixed(3));
r(sign, 'face tone', 'sign.faceTone', 0, 1, 0.005, v => v.toFixed(3));
r(sign, 'pictogram tone', 'sign.pictogramTone', 0, 1, 0.005, v => v.toFixed(3));
r(sign, 'pictogram size', 'sign.pictogramScale', 0.2, 1.1, 0.01, v => v.toFixed(2));
sign.note('The pictogram is a hand reaching upward, printed on the face only. It never becomes a physical hand.');
r(sign, 'foot depth', 'sign.footDepth', 0, 1.4, 0.02, v => v.toFixed(2));
sign.note('How far down the funnel the pole reaches. Cloud passing in front of it will occlude it.');
r(sign, 'pole top', 'sign.poleTop', 0, 160, 1, v => v);

const pole = controls.section('POLE');
r(pole, 'width', 'pole.width', 1, 10, 0.25, v => v.toFixed(2));
r(pole, 'tone', 'pole.tone', 0, 1, 0.005, v => v.toFixed(3));
r(pole, 'wind sway', 'pole.swayAmp', 0, 3, 0.05, v => v < 0.03 ? 'still' : `${v.toFixed(2)}°`);
r(pole, 'sway speed', 'pole.swaySpeed', 0.05, 1.5, 0.01, v => `${v.toFixed(2)}/s`);
pole.note('Sway is wind, not the drain. Keep it small enough that the sign never looks pulled toward the centre.');

const time = controls.section('TIME', 'The cloud repeats on a fixed cycle and holds no state, so it cannot drift or decay. These are here to check that.');
time.action('+1 MINUTE', () => engine.run(60), 'render');
time.action('+1 HOUR', () => engine.run(3600), 'render');
time.diagnostic(() => {
  const s = engine.state();
  return `elapsed  ${s.elapsed}s\nbody     ${s.lobes} lobes\ncycle    ${(cfg.spiral.turns / Math.max(0.001, cfg.cloud.flow)).toFixed(0)}s`;
});

controls.sync();
setInterval(() => controls.sync(), 500);
