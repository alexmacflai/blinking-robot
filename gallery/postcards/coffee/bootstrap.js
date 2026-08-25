import { loadRenderSettings, applyRenderSelection } from '../../shared/render-settings.js';
window.COFFEE_VALUES = await fetch('./values.json', { cache: 'no-store' }).then(response => response.json());
window.COFFEE_RENDER_SETTINGS = await loadRenderSettings();
applyRenderSelection(window.COFFEE_VALUES, window.COFFEE_RENDER_SETTINGS);
await import('./scene.js');
await import('./authoring.js');
