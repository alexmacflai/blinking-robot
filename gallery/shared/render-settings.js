const FALLBACK = {
  version: 1,
  pixelPresets: [{ id: 'standard', name: 'Standard', gridK: 26, visitorExposed: true }],
  palettes: [{ id: 'paper-ink', name: 'Paper / ink', mode: '1-bit', dark: '#101014', light: '#efece2', visitorExposed: true }],
  defaults: { pixelPreset: 'standard', palette: 'paper-ink' }
};

export const clone = value => JSON.parse(JSON.stringify(value));

export function normaliseSettings(value = {}) {
  const settings = { ...clone(FALLBACK), ...clone(value) };
  settings.pixelPresets = Array.isArray(value.pixelPresets) && value.pixelPresets.length ? value.pixelPresets : clone(FALLBACK.pixelPresets);
  settings.palettes = Array.isArray(value.palettes) && value.palettes.length ? value.palettes : clone(FALLBACK.palettes);
  settings.defaults = { ...FALLBACK.defaults, ...(value.defaults || {}) };
  if (!settings.pixelPresets.some(preset => preset.id === settings.defaults.pixelPreset)) settings.defaults.pixelPreset = settings.pixelPresets[0].id;
  if (!settings.palettes.some(palette => palette.id === settings.defaults.palette)) settings.defaults.palette = settings.palettes[0].id;
  return settings;
}

export async function loadRenderSettings(url = new URL('../render-settings.json', import.meta.url)) {
  try {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) throw new Error('settings unavailable');
    return normaliseSettings(await response.json());
  } catch (_) { return clone(FALLBACK); }
}

export function selectedSettings(settings, selection = settings.defaults) {
  const pixel = settings.pixelPresets.find(preset => preset.id === selection.pixelPreset) || settings.pixelPresets[0];
  const palette = settings.palettes.find(entry => entry.id === selection.palette) || settings.palettes[0];
  return { pixel, palette, selection: { pixelPreset: pixel.id, palette: palette.id } };
}

export function applyRenderSelection(config, settings, selection = settings.defaults) {
  const { pixel, palette, selection: next } = selectedSettings(settings, selection);
  config.gridK = pixel.gridK;
  config.render = { paletteMode: palette.mode, dark: palette.dark, middle: palette.middle || palette.light, light: palette.light, accent: palette.accent || palette.light, globalSelection: next };
  // Kept for older scene controls and local experiments. Renderers read render.*.
  config.ink = palette.dark;
  config.paper = palette.light;
  return next;
}

export function paletteLabel(palette) { return `${palette.name} · ${palette.mode}`; }

export function installRenderMessageHandler(scene, config, settings) {
  addEventListener('message', event => {
    const data = event.data;
    if (data?.type !== 'blinking-robot:render-settings') return;
    const before = config.gridK;
    // Global controls sends its in-memory draft so edits are visible before the
    // maker downloads the tracked replacement; visitor controls send only a
    // selection and therefore stay constrained to the tracked registry.
    applyRenderSelection(config, data.settings ? normaliseSettings(data.settings) : settings, data.selection);
    if (before === config.gridK) scene.refresh?.(); else scene.rebuild?.(true);
  });
}
