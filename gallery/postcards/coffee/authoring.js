import { createPostcardControls, saveCanvasPng, saveCanvasVideo } from '../../shared/controls.js';
import { applyRenderSelection, installRenderMessageHandler, paletteLabel } from '../../shared/render-settings.js';

const engine = window.__coffee;
const cfg = engine.CFG;
const galleryConfig = await fetch('./gallery.json', { cache: 'no-store' }).then(response => response.json());
const scene = {
  fit: () => engine.fit(), render: () => engine.render(), refresh: () => engine.refresh(), update: () => engine.rebuild(true), rebuild: () => engine.rebuild(true),
  togglePaused: () => engine.toggle(), savePng: () => saveCanvasPng(document.querySelector('#c'), 'coffee-frame-2160x3840.png'),
  saveVideo: options => saveCanvasVideo(document.querySelector('#c'), options),
  info: () => ({ W: cfg.gridK * 9, H: cfg.gridK * 16 })
};
const controls = createPostcardControls({
  panel: document.querySelector('#panel'), title: 'COFFEE', description: 'Coffee filling a cup that is already full.', scene, config: cfg,
  valuesFile: 'values.json', gridValues: [11, 13, 16, 20, 26, 32, 40, 48], galleryConfig, galleryFile: 'gallery.json'
});
const renderSettings=window.COFFEE_RENDER_SETTINGS; installRenderMessageHandler(scene,cfg,renderSettings);
const presets=controls.section('GLOBAL RENDER PRESETS','Saved global presets are shared with the gallery. Local experiments remain only in downloaded postcard values.');
presets.select({label:'global palette',get:()=>cfg.render.globalSelection.palette,set:id=>{applyRenderSelection(cfg,renderSettings,{...cfg.render.globalSelection,palette:id});},values:renderSettings.palettes.map(p=>({value:p.id,label:paletteLabel(p)})),update:'refresh'});
presets.select({label:'global pixel grid',get:()=>cfg.render.globalSelection.pixelPreset,set:id=>{applyRenderSelection(cfg,renderSettings,{...cfg.render.globalSelection,pixelPreset:id});},values:renderSettings.pixelPresets.map(p=>({value:p.id,label:p.name})),update:'rebuild'});
const range = (section, label, path, min, max, step, update = 'update') => section.range({ label, path, min, max, step, update });

const cycle = controls.section('CYCLE');
range(cycle, 'period', 'cyc.period', 4, 20, .1); range(cycle, 'pour', 'cyc.pour', .6, 14, .1); range(cycle, 'ramp on', 'cyc.onRamp', .05, 1.2, .01); range(cycle, 'break', 'cyc.breakDur', .05, 1.5, .01); range(cycle, 'after-drops', 'cyc.dropN', 0, 8, 1);
cycle.note('Pour should stay shorter than the period so the surface can settle.');

const composition = controls.section('COMPOSITION');
range(composition, 'scene x', 'proj.ox', 40, 190, 1, 'rebuild'); range(composition, 'scene y', 'proj.oy', 200, 380, 1, 'rebuild'); range(composition, 'cup x', 'cup.wx', 10, 80, 1, 'rebuild'); range(composition, 'cup y', 'cup.wy', 4, 70, 1, 'rebuild'); range(composition, 'cup radius', 'cup.rTop', 12, 42, .5, 'rebuild'); range(composition, 'cup rim z', 'cup.top', 20, 80, 1, 'rebuild'); range(composition, 'base radius', 'cup.rBot', 6, 34, .5, 'rebuild'); range(composition, 'tray width', 'tray.x1', 40, 140, 1, 'rebuild'); range(composition, 'tray depth', 'tray.y1', 30, 120, 1, 'rebuild');

const machine = controls.section('MACHINE');
range(machine, 'housing base', 'mach.bz0', 80, 200, 1, 'rebuild'); range(machine, 'spout z', 'mach.spoutZ0', 55, 150, 1, 'rebuild'); range(machine, 'portafilter', 'mach.collarR', 8, 30, .5, 'rebuild');
const stream = controls.section('STREAM');
range(stream, 'width at spout', 'strm.wTop', .6, 6, .05); range(stream, 'width at cup', 'strm.wBot', .4, 5, .05); range(stream, 'wander', 'strm.wander', 0, 3, .05);
const ripples = controls.section('RIPPLES');
range(ripples, 'ring spacing', 'wave.k', .1, 1.5, .01); range(ripples, 'ring width', 'wave.w', 1, 16, .1); range(ripples, 'decay', 'wave.decay', 10, 140, 1); range(ripples, 'gain', 'wave.gain', 0, 1.5, .01); range(ripples, 'fall', 'wave.fall', .1, 2, .01);
const overflow = controls.section('OVERFLOW');
range(overflow, 'streams', 'spill.n', 0, 10, 1); range(overflow, 'spread', 'spill.spread', 0, 1, .01); range(overflow, 'start', 'spill.start', 0, 3, .01); range(overflow, 'speed', 'spill.speed', 5, 100, 1); range(overflow, 'dry speed', 'spill.drySpeed', 5, 120, 1); range(overflow, 'width', 'spill.w', .2, 4, .05); range(overflow, 'pool grow', 'spill.poolGrow', 0, 30, .5); range(overflow, 'pool maximum', 'spill.poolMax', 0, 80, 1); range(overflow, 'pool drain', 'spill.poolDrain', 0, 30, .5); range(overflow, 'drip every', 'spill.dripEvery', .05, 3, .05);
const shades = controls.section('SHADES');
range(shades, 'lit face', 'tone.left', 0, 1, .01); range(shades, 'shaded face', 'tone.right', 0, 1, .01); range(shades, 'top face', 'tone.top', 0, 1, .01); range(shades, 'coffee', 'tone.coffee', 0, 1, .01); range(shades, 'inner wall', 'tone.wall', 0, 1, .01); range(shades, 'spill', 'tone.spill', 0, 1, .01);
engine.boot(); controls.sync(); setInterval(() => controls.sync(), 500);
