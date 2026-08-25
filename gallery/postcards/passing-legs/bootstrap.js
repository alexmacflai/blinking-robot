import { loadRenderSettings, applyRenderSelection } from '../../shared/render-settings.js';
window.LEGS_VALUES = await fetch('./values.json', { cache: 'no-store' }).then(response => response.json());
window.LEGS_RENDER_SETTINGS = await loadRenderSettings();
applyRenderSelection(window.LEGS_VALUES, window.LEGS_RENDER_SETTINGS);
await import('./scene.js');
await import('./authoring.js');
