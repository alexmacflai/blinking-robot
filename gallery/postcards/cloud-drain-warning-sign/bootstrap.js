import { loadRenderSettings, applyRenderSelection } from '../../shared/render-settings.js';
window.DRAIN_VALUES = await fetch('./values.json', { cache: 'no-store' }).then(response => response.json());
window.DRAIN_RENDER_SETTINGS = await loadRenderSettings();
applyRenderSelection(window.DRAIN_VALUES, window.DRAIN_RENDER_SETTINGS);
await import('./scene.js');
await import('./authoring.js');
