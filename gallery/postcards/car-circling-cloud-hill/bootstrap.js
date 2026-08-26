import { loadRenderSettings, applyRenderSelection } from '../../shared/render-settings.js';
window.HILL_VALUES = await fetch('./values.json', { cache: 'no-store' }).then(response => response.json());
window.HILL_RENDER_SETTINGS = await loadRenderSettings();
applyRenderSelection(window.HILL_VALUES, window.HILL_RENDER_SETTINGS);
await import('./scene.js');
await import('./authoring.js');
