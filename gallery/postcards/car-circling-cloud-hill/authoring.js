import { createPostcardControls, saveCanvasPng, saveCanvasVideo } from '../../shared/controls.js';
import { applyRenderSelection, installRenderMessageHandler, paletteLabel } from '../../shared/render-settings.js';

const engine = window.__hill, cfg = engine.CFG;
const galleryConfig = await fetch('./gallery.json', { cache: 'no-store' }).then(response => response.json());

const scene = {
  fit: () => engine.fit(),
  render: () => engine.render(),
  refresh: () => engine.refresh(),
  update: () => engine.update(true),
  rebuild: () => engine.rebuild(true),
  togglePaused: () => engine.toggle(),
  savePng: () => saveCanvasPng(document.querySelector('#c'), 'car-circling-cloud-hill-frame-2160x3840.png'),
  saveVideo: options => { engine.play(); return saveCanvasVideo(document.querySelector('#c'), options); },
  info: () => ({ W: cfg.gridK * 9, H: cfg.gridK * 16 })
};

const controls = createPostcardControls({
  panel: document.querySelector('#panel'),
  title: 'CAR CIRCLING A CLOUD-COVERED HILL',
  description: 'Traffic over a hill that sits between two layers of cloud.',
  scene, config: cfg,
  valuesFile: 'values.json',
  gridValues: [11, 13, 16, 20, 26, 32, 40, 48],
  galleryConfig, galleryFile: 'gallery.json'
});

const renderSettings = window.HILL_RENDER_SETTINGS;
installRenderMessageHandler(scene, cfg, renderSettings);

const presets = controls.section('GLOBAL RENDER PRESETS', 'Saved global presets are shared with the gallery. Local experiments remain only in downloaded postcard values.');
presets.select({ label: 'global palette', get: () => cfg.render.globalSelection.palette, set: id => { applyRenderSelection(cfg, renderSettings, { ...cfg.render.globalSelection, palette: id }); }, values: renderSettings.palettes.map(p => ({ value: p.id, label: paletteLabel(p) })), update: 'refresh' });
presets.select({ label: 'global pixel grid', get: () => cfg.render.globalSelection.pixelPreset, set: id => { applyRenderSelection(cfg, renderSettings, { ...cfg.render.globalSelection, pixelPreset: id }); }, values: renderSettings.pixelPresets.map(p => ({ value: p.id, label: p.name })), update: 'rebuild' });

/* The hill, road, house and smoke are baked once, so anything that changes
   their geometry, their tone, or the camera has to re-bake: those controls
   use `rebuild`, not `render`. Only the cars and cloud drift are free. */
const r = (section, label, path, min, max, step, format, update = 'render') => section.range({ label, path, min, max, step, format, update });
const rb = (section, label, path, min, max, step, format) => r(section, label, path, min, max, step, format, 'rebuild');

const cam = controls.section('CAMERA', 'In front of the hill and a little above its foot. The pitch is derived from height and distance, so the camera always looks at the hill.');
rb(cam, 'height above foot', 'cam.up', 0, 220, 1, v => v);
rb(cam, 'distance back', 'cam.back', 120, 700, 5, v => v);
cam.note('Raising the height alone tips the hill toward a plan view and flattens the wrap of the road; pulling back alone weakens the difference in size between a car at the top and one at the bottom.');
rb(cam, 'focal length', 'cam.focal', 120, 700, 5, v => v);
rb(cam, 'horizon', 'cam.horizon', 120, 460, 1, v => `${v} of 416`);
rb(cam, 'sideways', 'cam.offX', -80, 80, 1, v => `${v > 0 ? '+' : ''}${v}`);
cam.diagnostic(() => {
  const c = cfg.cam;
  const pitch = Math.atan2(c.up, Math.max(1, c.back)) * 180 / Math.PI;
  return `pitch        ${pitch.toFixed(1)}°\nhill height  ${cfg.hill.height}\nhill radius  ${cfg.hill.radius}`;
});

const hill = controls.section('THE HILL', 'A surface of revolution. It is shaded as a near-flat mass on purpose: the road is the only mark it carries, and a dome gradient would band under the dither and compete with it.');
rb(hill, 'base radius', 'hill.radius', 30, 140, 1, v => v);
rb(hill, 'height', 'hill.height', 40, 260, 1, v => v);
rb(hill, 'flank steepness', 'hill.flank', 1.2, 5, 0.05, v => v.toFixed(2));
rb(hill, 'crown roundness', 'hill.crown', 0.2, 1.4, 0.01, v => v.toFixed(2));
hill.note('Low crown gives a flat table with steep sides and makes a car spend most of its journey near the top; high crown makes a cone and loses the sketch’s dome. The two are read together.');
rb(hill, 'tone', 'hill.tone', 0, 1, 0.005, v => v.toFixed(3));
rb(hill, 'silhouette darkening', 'hill.rimDark', 0, 0.9, 0.01, v => v.toFixed(2));
rb(hill, 'darkening tightness', 'hill.rimCurve', 0.5, 10, 0.1, v => v.toFixed(1));
hill.note('The rim is what holds the hill apart from a cloud of the same value behind it. Higher tightness keeps the mass flat and confines the change to the very edge.');
rb(hill, 'mesh rings', 'hill.rings', 12, 120, 2, v => v);
rb(hill, 'mesh meridians', 'hill.meridians', 16, 160, 4, v => v);
rb(hill, 'ring crowding', 'hill.ringBias', 0.3, 1.6, 0.05, v => v.toFixed(2));
hill.note('Below 1 the rings crowd toward the foot, where the flank is steepest. Raise the counts only if the silhouette shows facets.');
rb(hill, 'mesh safety margin', 'hill.meshInset', 0, 4, 0.05, v => v.toFixed(2));
hill.note('Pulls the hill mesh slightly inward so the road and cars reliably clear it in depth. Raise this if a car flickers or vanishes mid-slope; lower it only if the hill visibly shrinks off the road\'s edge.');

const road = controls.section('THE ROAD', 'ONE straight line laid across the hill\'s central axis, front to back. The front half sits at a fixed bearing; the back half sits at exactly the opposite bearing (+180°) — never eased, never swept, so there is no turn anywhere, on either half.');
rb(road, 'bearing', 'road.frontBearing', -1.6, 1.6, 0.01, v => `${(v * 180 / Math.PI).toFixed(0)}°`);
road.note('The front half\'s fixed direction. The back half is always exactly this plus 180° — not a separate control, because a second free bearing is what turning used to come from.');
rb(road, 'width', 'road.width', 2, 30, 0.5, v => v.toFixed(1));
rb(road, 'summit clearance', 'road.summitRho', 0, 0.4, 0.005, v => v.toFixed(3));
rb(road, 'summit rounding', 'road.summitRound', 0.02, 0.8, 0.01, v => v.toFixed(2));
road.note('How wide the arc is where the road crosses the top. Small values turn the crossing into a hairpin.');
rb(road, 'lift off the hill', 'road.lift', 0, 3, 0.05, v => v.toFixed(2));
road.note('Enough to clear the hill in depth, not so much that the road pokes out past the silhouette at the shoulder.');
rb(road, 'tone', 'road.tone', 0, 1, 0.005, v => v.toFixed(3));
rb(road, 'samples', 'road.samples', 40, 400, 10, v => v);

const dash = controls.section('CENTRE DASHES', 'A road marking, not a subject. Keep them clearly lighter than a car, or a car on the road is indistinguishable from a dash and the postcard loses its only moving thing.');
rb(dash, 'tone', 'road.dashTone', 0, 1, 0.005, v => v.toFixed(3));
rb(dash, 'spacing', 'road.dashPeriod', 0.01, 0.2, 0.005, v => v.toFixed(3));
rb(dash, 'dash length', 'road.dashLength', 0, 1, 0.02, v => v <= 0 ? 'off' : v.toFixed(2));
rb(dash, 'width', 'road.dashWidth', 0.2, 6, 0.1, v => v.toFixed(1));
rb(dash, 'lift', 'road.dashLift', 0, 1.5, 0.05, v => v.toFixed(2));

const car = controls.section('THE TRAFFIC', 'Cars ride the road on a wrapped phase. The span is longer than the road, and the extra length is empty: nothing is ever seen to appear on the road or turn round.');
r(car, 'speed', 'car.speed', 0.01, 0.6, 0.005, v => `${v.toFixed(3)} · ${(2 / v).toFixed(0)}s to cross`);
r(car, 'cars at once', 'car.slots', 1, 6, 1, v => v);
car.note('One is the ticket’s reading: a car has left the frame before the next comes over the shoulder. More than one puts several on the road at the same time.');
r(car, 'empty road between', 'car.gap', 0, 4, 0.05, v => `${v.toFixed(2)} · ${(v / Math.max(0.001, cfg.car.speed)).toFixed(0)}s`);
r(car, 'size', 'car.size', 2, 24, 0.5, v => v.toFixed(1));
r(car, 'size variation', 'car.sizeVary', 0, 0.6, 0.02, v => v.toFixed(2));
r(car, 'width', 'car.widthRatio', 0.25, 1, 0.01, v => v.toFixed(2));
r(car, 'height', 'car.heightRatio', 0.2, 1, 0.01, v => v.toFixed(2));
r(car, 'tone', 'car.tone', 0, 1, 0.005, v => v.toFixed(3));
r(car, 'tone variation', 'car.toneVary', 0, 0.4, 0.005, v => v.toFixed(3));
r(car, 'form shading', 'car.shade', 0, 0.6, 0.01, v => v.toFixed(2));
r(car, 'wheel tone', 'car.wheelTone', 0, 1, 0.005, v => v.toFixed(3));
r(car, 'wheels appear at', 'car.wheelAt', 0, 30, 0.5, v => `${v.toFixed(1)}px long`);
car.note('Wheels are drawn only once a car is long enough on screen for them to be more than a stray pixel. Set to 0 to draw them always.');
r(car, 'accent every', 'car.accentEvery', 0, 12, 1, v => v === 0 ? 'never' : `every ${v}`);
car.note('In 2-bit mode an accented car takes palette slot 2. Off by default: a procession of coloured cars makes the traffic the spectacle rather than the ordinary thing.');
car.diagnostic(() => {
  const c = cfg.car;
  const span = 2 + Math.max(0, c.gap);
  return `on the road   ${engine.state().onRoad}\nfull cycle    ${(span / Math.max(0.001, c.speed)).toFixed(0)}s\nempty for     ${(Math.max(0, c.gap) / Math.max(0.001, c.speed)).toFixed(0)}s`;
});

const house = controls.section('THE HOUSE', 'Small, still, beside the road. It is placed from the road’s own frame, so moving the road carries it along.');
rb(house, 'where on the road', 'house.atS', -1, 1, 0.01, v => v.toFixed(2));
rb(house, 'sideways from the road', 'house.beside', -60, 60, 1, v => v);
rb(house, 'along the road', 'house.along', -30, 30, 1, v => v);
house.note('Against the sky at the summit a light-walled house disappears and only its roof reads. Step it down the shoulder, or keep it dark.');
rb(house, 'size', 'house.size', 0, 60, 0.5, v => v <= 0 ? 'none' : v.toFixed(1));
rb(house, 'wall height', 'house.wall', 0.15, 1, 0.01, v => v.toFixed(2));
rb(house, 'roof pitch', 'house.roof', 0, 0.9, 0.01, v => v.toFixed(2));
rb(house, 'plan width', 'house.width', 0.3, 1.4, 0.02, v => v.toFixed(2));
rb(house, 'plan depth', 'house.depth', 0.3, 1.4, 0.02, v => v.toFixed(2));
rb(house, 'facing', 'house.yaw', -3.15, 3.15, 0.01, v => `${(v * 180 / Math.PI).toFixed(0)}°`);
rb(house, 'settle into the hill', 'house.sink', -0.2, 0.4, 0.01, v => v.toFixed(2));
rb(house, 'wall tone', 'house.tone', 0, 1, 0.005, v => v.toFixed(3));
rb(house, 'roof tone', 'house.roofTone', 0, 1, 0.005, v => v.toFixed(3));
rb(house, 'form shading', 'house.shade', 0, 0.5, 0.01, v => v.toFixed(2));

const smoke = controls.section('CHIMNEY AND SMOKE', 'The plume is a continuous rising stream, not a one-off animation: each puff\'s progress from the chimney mouth to full dispersal is a wrapped phase, the same trick the traffic uses, so nothing pops in or out and nothing accumulates. It is the scene\'s second moving thing — a deliberate reversal of this postcard\'s original brief, which kept it static so it would not compete with the car.');
rb(smoke, 'chimney width', 'house.chimney', 0, 0.5, 0.01, v => v.toFixed(2));
rb(smoke, 'chimney height', 'house.chimneyAt', 0, 0.8, 0.01, v => v.toFixed(2));
r(smoke, 'plume height', 'house.smokeHeight', 0, 6, 0.05, v => v <= 0 ? 'none' : v.toFixed(2));
r(smoke, 'rise speed', 'house.smokeSpeed', 0, 1.5, 0.01, v => v <= 0 ? 'still' : `${v.toFixed(2)} · ${(1/Math.max(0.001,v)).toFixed(1)}s/lap`);
r(smoke, 'plume lean', 'house.smokeDrift', -1.5, 1.5, 0.02, v => v.toFixed(2));
r(smoke, 'plume coils', 'house.smokeCoils', 0, 4, 0.05, v => v.toFixed(2));
r(smoke, 'puff wander', 'house.smokeJitter', 0, 1.5, 0.02, v => v.toFixed(2));
smoke.note('Each puff keeps its own random sideways drift every lap, instead of every puff tracing the identical curve. It fades in from zero at the chimney mouth to full size by full dispersal, so the plume still reads as coming from one point.');
r(smoke, 'puff size variation', 'house.smokeSizeVary', 0, 0.9, 0.02, v => v.toFixed(2));
r(smoke, 'puffs', 'house.smokePuffs', 3, 40, 1, v => v);
r(smoke, 'puff size at chimney', 'house.smokeR0', 0.01, 0.5, 0.005, v => v.toFixed(3));
r(smoke, 'puff size at top', 'house.smokeR1', 0.01, 0.8, 0.005, v => v.toFixed(3));
r(smoke, 'tone', 'house.smokeTone', 0, 1, 0.005, v => v.toFixed(3));

const light = controls.section('LIGHT', 'A direction, not a lighting model. It decides which flat tone a face of the house or a car takes.');
rb(light, 'from the side', 'light.x', -1, 1, 0.02, v => v.toFixed(2));
rb(light, 'from above', 'light.y', -1, 1, 0.02, v => v.toFixed(2));
rb(light, 'from the front', 'light.z', -1, 1, 0.02, v => v.toFixed(2));

const sky = controls.section('SKY', 'A vertical gradient. The start is the top of the postcard by definition; only where it ends is authored.');
r(sky, 'top tone', 'bg.topTone', 0, 1, 0.005, v => v.toFixed(3));
r(sky, 'end tone', 'bg.bottomTone', 0, 1, 0.005, v => v.toFixed(3));
r(sky, 'gradient ends at', 'bg.endY', 20, 416, 2, v => `${v} of 416`);
r(sky, 'grain', 'bg.grain', 0, 0.12, 0.002, v => v.toFixed(3));

const cloudMotion = controls.section('CLOUD MOTION', 'Four cloud groups move at different speeds. The rear uses the minimum wind, the front uses the maximum, and the two middle groups interpolate between them.');
rb(cloudMotion, 'minimum wind', 'cloudMotion.windMin', -12, 12, 0.1, v => Math.abs(v) < 0.05 ? 'still' : v.toFixed(1));
rb(cloudMotion, 'maximum wind', 'cloudMotion.windMax', -12, 12, 0.1, v => Math.abs(v) < 0.05 ? 'still' : v.toFixed(1));
cloudMotion.note('Wind is measured in authored pixels per second. The bank depth values determine the interpolation; the two rear banks are depth 0 and 0.33, and the two front banks are depth 0.67 and 1.');

/* One section per bank, built from the values file so the four cloud groups
   keep their scene-specific shape controls in the authoring surface. */
cfg.banks.forEach((bank, index) => {
  const behind = bank.front ? 'In front of the hill, and drawn after the cars: this is what a car disappears into.' : 'Behind the hill, and drawn before it.';
  const section = controls.section(`CLOUD — ${String(bank.id).toUpperCase()}`, `${bank.kind === 'puff' ? 'Clusters of hard-edged lobes in open sky.' : 'A hard-edged lobed upper surface filling to the bottom of the frame.'} ${behind}`);
  const p = key => `banks.${index}.${key}`;
  section.note(`Depth ${bank.depth.toFixed(2)}. This group’s wind is interpolated between the global minimum and maximum.`);
  rb(section, 'height', p('y'), 0, 460, 1, v => `${v} of 416`);
  rb(section, 'tone', p('tone'), 0, 1, 0.005, v => v.toFixed(3));
  rb(section, 'tile width', p('tile'), 60, 500, 5, v => v);
  section.note('The bank repeats across this width. Narrower packs more cloud into the frame.');
  if (bank.kind === 'puff') {
    rb(section, 'clusters', p('clusters'), 1, 8, 1, v => v);
    rb(section, 'lobes per cluster', p('per'), 1, 10, 1, v => v);
  } else {
    rb(section, 'lobes', p('lobes'), 2, 16, 1, v => v);
    rb(section, 'floor above the line', p('floorUp'), 0, 40, 1, v => v === 0 ? 'no floor' : v);
    section.note('A floor keeps the mass continuous while its lobes billow above it. Without one you have to pack the lobes tight, and tightly packed lobes make the surface a ruled line.');
  }
  if (bank.front) {
    rb(section, 'mask minimum', p('maskMin'), 0, 1, 0.01, v => v.toFixed(2));
    rb(section, 'mask maximum', p('maskMax'), 0, 1, 0.01, v => v.toFixed(2));
    rb(section, 'mask size', p('maskSize'), 0, 416, 1, v => v <= 0 ? 'none' : `${v}px`);
    section.note('This cloud has its own group-level mask. The ramp starts at the top of the whole cloud group and runs for this many authored pixels before reaching the mask maximum. Use the full distance to the bottom of the postcard for a top-to-bottom gradient. No shared mask and no per-lobe holes.');
  }
  rb(section, 'lobe width (min)', p('rx.0'), 4, 80, 1, v => v);
  rb(section, 'lobe width (max)', p('rx.1'), 4, 90, 1, v => v);
  rb(section, 'lobe height (min)', p('ry.0'), 2, 60, 1, v => v);
  rb(section, 'lobe height (max)', p('ry.1'), 2, 70, 1, v => v);
  rb(section, 'seed', p('seed'), 1, 99999, 1, v => v);
});

const time = controls.section('TIME', 'The still world is baked and the cars and cloud groups ride wrapped phases, so nothing here can drift or decay. These are to check that.');
time.action('+1 MINUTE', () => engine.run(60), 'render');
time.action('+1 HOUR', () => engine.run(3600), 'render');
time.diagnostic(() => {
  const s = engine.state();
  return `elapsed      ${s.elapsed}s\non the road  ${s.onRoad}`;
});

controls.sync();
setInterval(() => controls.sync(), 500);
