import { createPostcardControls } from '../../shared/controls.js';
import { loadRenderSettings, applyRenderSelection, installRenderMessageHandler, paletteLabel } from '../../shared/render-settings.js';
import { createWindmillScene } from './scene.js';

const values = await fetch('./values.json', { cache: 'no-store' }).then(response => response.json());
const renderSettings=await loadRenderSettings(); applyRenderSelection(values,renderSettings);
const scene = createWindmillScene({
  canvas: document.querySelector('#c'),
  stage: document.querySelector('#stage'),
  hud: document.querySelector('#hud'),
  loadEl: document.querySelector('#load'),
  config: values
});
const cfg = scene.config;
const controls = createPostcardControls({
  panel: document.querySelector('#panel'),
  title: 'WINDMILL',
  description: 'A mill turning through stacked cloud banks.',
  scene,
  config: cfg,
  valuesFile: 'values.json',
  gridValues: [11, 13, 16, 20, 26, 32, 40, 48]
});
installRenderMessageHandler(scene,cfg,renderSettings);
const presets=controls.section('GLOBAL RENDER PRESETS','Saved global presets are shared with the gallery. Local experiments remain only in downloaded postcard values.');
presets.select({label:'global palette',get:()=>cfg.render.globalSelection.palette,set:id=>{applyRenderSelection(cfg,renderSettings,{...cfg.render.globalSelection,palette:id});},values:renderSettings.palettes.map(p=>({value:p.id,label:paletteLabel(p)})),update:'refresh'});
presets.select({label:'global pixel grid',get:()=>cfg.render.globalSelection.pixelPreset,set:id=>{applyRenderSelection(cfg,renderSettings,{...cfg.render.globalSelection,pixelPreset:id});},values:renderSettings.pixelPresets.map(p=>({value:p.id,label:p.name})),update:'rebuild'});
const localPalette=controls.section('LOCAL PALETTE EXPERIMENT');
localPalette.choice({label:'mode',get:()=>cfg.render.paletteMode,set:value=>{cfg.render.paletteMode=value;},values:['1-bit','2-bit'],update:'refresh'});
localPalette.color({label:'dark',path:'render.dark',update:'refresh'}).color({label:'middle',path:'render.middle',update:'refresh'}).color({label:'light',path:'render.light',update:'refresh'}).color({label:'accent',path:'render.accent',update:'refresh'});
const range = (section, label, path, min, max, step, format, update = 'update') => section.range({ label, path, min, max, step, format, update });

range(controls.section('SCENE'), 'horizon', 'lift', -10, 70, 1, value => value);

const sky = controls.section('SKY');
range(sky, 'top tone', 'sky.top', 0, 0.6, 0.01, value => value.toFixed(2));
range(sky, 'horizon tone', 'sky.horizon', 0.3, 1, 0.01, value => value.toFixed(2));
range(sky, 'curve', 'sky.curve', 0.35, 2.2, 0.05, value => value.toFixed(2));
sky.note('Curve below 1 pushes the bright band up toward the horizon.');
range(sky, 'sun x', 'sun.x', 0, 234, 1, value => value);
range(sky, 'sun y', 'sun.y', 60, 380, 1, value => value);

const mill = controls.section('MILL');
range(mill, 'vertical', 'mill.offY', -90, 90, 1, value => `${value > 0 ? '+' : ''}${value}`);
range(mill, 'spin', 'rotor.spin', -0.6, 0.6, 0.005, value => Math.abs(value) < .004 ? 'stopped' : `${(1 / Math.abs(value)).toFixed(1)}s ${value < 0 ? '↺' : '↻'}`);
mill.note('Signed turns per second. 0 stops the rotor.');
range(mill, 'yaw', 'rotor.yawDeg', 0, 55, 0.5, value => `${value.toFixed(1)}°`);

const wind = controls.section('WIND');
range(wind, 'strength', 'wind', -2.5, 2.5, 0.05, value => `${value.toFixed(2)}x`);
wind.note('Negative reverses every layer, the deck, the birds and the star.');
range(wind, 'slowest (back)', 'speedMin', 0.5, 40, 0.5, value => value.toFixed(1));
range(wind, 'fastest (front)', 'speedMax', 5, 140, 1, value => value.toFixed(0));
wind.diagnostic(() => `layer speed  ${scene.info().layerSpeeds.map(value => value.toFixed(0)).join(' · ')} px/s`);

const birds = controls.section('BIRDS');
range(birds, 'travel span', 'birds.span', 120, 620, 5, value => value);
range(birds, 'high flock speed', 'birds.flocks.0.speed', 2, 70, 1, value => value);
range(birds, 'middle flock speed', 'birds.flocks.1.speed', 2, 70, 1, value => value);
range(birds, 'low flock speed', 'birds.flocks.2.speed', 2, 70, 1, value => value);
birds.note('Flocks share the wind direction but retain separate speeds.');

const star = controls.section('STAR');
range(star, 'every', 'star.every', 3, 45, 1, value => `${value}-${value + cfg.star.vary}s`);
range(star, 'timing variation', 'star.vary', 0, 45, 1, value => `${value}s`);
range(star, 'tail', 'star.tail', 4, 100, 1, value => value);
star.action('TRIGGER STAR', () => scene.triggerStar(), 'render');

const layers = controls.section('LAYER HEIGHT');
const bankIndex = [0, 1, 3];
[0, 1, 2, 3].forEach(depth => {
  const bank = bankIndex.indexOf(depth);
  layers.range({
    label: `L${4 - depth} ${depth === 0 ? 'back' : depth === 3 ? 'front' : depth === 2 ? 'deck' : 'mid'}`,
    get: () => depth === 2 ? cfg.deck.offY : cfg.banks[bank].offY,
    set: value => { if (depth === 2) cfg.deck.offY = value; else cfg.banks[bank].offY = value; },
    min: -90, max: 90, step: 1,
    format: value => `${value > 0 ? '+' : ''}${value}`
  });
});

const deck = controls.section('CLOUD DECK (inert)');
range(deck, 'tone', 'deck.toneBias', -0.14, 0.14, 0.005, value => `${value > 0 ? '+' : ''}${value.toFixed(3)}`);
range(deck, 'shading', 'deck.shade', 0, 0.14, 0.005, value => value.toFixed(3));
range(deck, 'edge', 'deck.soft', 1, 12, 0.5, value => value.toFixed(1));
deck.note('Flat fill like the other banks. Everything the mill does to cloud happens in the 5th cloud.');
deck.number({ label: 'seed', path: 'deck.surfSeed', step: 1, update: 'rebuild' });
deck.action('RE-ROLL SHAPES', () => {
  const seed = (Math.random() * 1e6) | 0;
  cfg.deck.surfSeed = seed;
  cfg.banks.forEach((bank, index) => { bank.seed = (seed * (index + 3) + 101) | 0; });
  controls.notify('reshaped');
}, 'rebuild');

const particles = controls.section('5th CLOUD');
range(particles, 'density', 'emit.density', 0.1, 12, 0.1, value => `${value.toFixed(1)}/px²`, 'rebuild');
range(particles, 'emitter output', 'emit.output', 0.1, 6, 0.1, value => `${value.toFixed(1)}x`, 'rebuild');
particles.diagnostic(() => { const info = scene.info(); return `feeding   ${info.emitRate}/s\nin frame  ${info.particles} · ${info.lit} lit`; });
particles.note('Nothing is drawn until a sail touches this invisible particle cloud.');
range(particles, 'launch', 'emit.fling', 0, 2.5, 0.05, value => value.toFixed(2));
range(particles, 'drag', 'emit.drag', 0, 6, 0.1, value => value.toFixed(1));
range(particles, 'sink', 'emit.sink', -40, 80, 1, value => value);
particles.range({
  label: 'fade', get: () => cfg.emit.life[1], set: value => { cfg.emit.life = [value * .45, value]; },
  min: .3, max: 8, step: .1, format: value => `${value.toFixed(1)}s`
});
range(particles, 'clearance', 'emit.pad', .6, 6, .1, value => `${value.toFixed(1)}px`);
particles.note('Launch is the kick off the blade face; fade is how long a revealed grain lasts.');

scene.start();
controls.sync();
setInterval(() => controls.sync(), 500);
