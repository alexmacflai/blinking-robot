/* Shared authoring-panel foundation. A postcard declares controls through this
   module; the module owns their markup, binding, sync, shell, and footer. */

const getPath = (object, path) => path.split('.').reduce((value, key) => value[key], object);
const setPath = (object, path, value) => {
  const keys = path.split('.');
  const last = keys.pop();
  const target = keys.reduce((item, key) => item[key], object);
  target[last] = value;
};

export function applySceneUpdate(scene, kind = 'update') {
  if (kind === 'fit') return scene.fit();
  if (kind === 'render') return scene.render();
  if (kind === 'refresh') return scene.refresh();
  if (kind === 'update') return scene.update();
  return scene.rebuild(true);
}

export async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    try { await navigator.clipboard.writeText(text); return; }
    catch (_) { /* Local preview servers can deny clipboard permission. */ }
  }
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
  document.body.append(textarea);
  textarea.select();
  const copied = document.execCommand('copy');
  textarea.remove();
  if (!copied) throw new Error('Copy is unavailable in this browser.');
}

export function downloadJson(name, value) {
  const url = URL.createObjectURL(new Blob([`${JSON.stringify(value, null, 2)}\n`], { type: 'application/json' }));
  const link = Object.assign(document.createElement('a'), { href: url, download: name });
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function installStyles() {
  if (document.getElementById('postcard-controls-style')) return;
  const style = document.createElement('style');
  style.id = 'postcard-controls-style';
  style.textContent = `
    :root{--pc-bg:#0a0a0c;--pc-panel:#0d0d10;--pc-ink:#e8e6df;--pc-dim:#6f6d66;--pc-line:#22232a;--pc-accent:#c8b98a}
    *{box-sizing:border-box} html,body{margin:0;width:100%;height:100%;background:var(--pc-bg);color:var(--pc-dim);font:11px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace}
    body.postcard-authoring{display:flex;overflow:hidden}.postcard-stage{flex:1;min-width:0;position:relative;display:flex;align-items:center;justify-content:center}.postcard-stage canvas{display:block;image-rendering:pixelated;image-rendering:crisp-edges}
    .postcard-panel{--pc-panel-width:280px;width:var(--pc-panel-width);height:100vh;flex:none;overflow-y:auto;background:var(--pc-panel);border-left:1px solid var(--pc-line);padding:16px 16px 108px}
    .postcard-controls-head{border-bottom:1px solid var(--pc-line);padding-bottom:14px}.postcard-controls-head h1{margin:0;color:var(--pc-ink);font-size:11px;letter-spacing:.2em;font-weight:600}.postcard-controls-head p{margin:3px 0 0;color:#4b4a45;font-size:10px}
    .postcard-section{border-top:1px solid var(--pc-line);padding:14px 0 12px}.postcard-controls-head+.postcard-section{border-top:0}.postcard-section h2{margin:0 0 6px;color:var(--pc-ink);font-size:9.5px;letter-spacing:.2em;font-weight:500}.postcard-section .note{margin:6px 0;color:#5c5a54;font-size:9.5px;line-height:1.45}
    .postcard-row{display:flex;align-items:center;gap:8px;margin:9px 0}.postcard-row label{color:var(--pc-dim);flex:none}.postcard-row input[type=range]{-webkit-appearance:none;appearance:none;flex:1;min-width:0;height:2px;background:#2a2b33;outline:0}.postcard-row input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:11px;height:11px;border-radius:50%;background:var(--pc-accent);cursor:pointer}.postcard-row input[type=range]::-moz-range-thumb{width:11px;height:11px;border:0;border-radius:50%;background:var(--pc-accent);cursor:pointer}
    .postcard-value{color:var(--pc-accent);font-variant-numeric:tabular-nums;min-width:52px;text-align:right}.postcard-row input[type=color]{margin-left:auto;width:46px;height:22px;padding:2px;border:1px solid var(--pc-line);background:none;cursor:pointer;border-radius:2px}.postcard-row input[type=number],.postcard-row select{margin-left:auto;width:92px;background:#141519;border:1px solid var(--pc-line);color:var(--pc-ink);padding:3px 6px;font:inherit;border-radius:2px}
    .postcard-choice{display:flex;flex-wrap:wrap;gap:4px;margin:7px 0}.postcard-chip,.postcard-button{border:1px solid var(--pc-line);background:#141519;color:var(--pc-dim);border-radius:2px;font:inherit;cursor:pointer}.postcard-chip{padding:4px 7px}.postcard-chip:hover,.postcard-button:hover{border-color:var(--pc-accent);color:var(--pc-accent)}.postcard-chip[aria-pressed=true]{background:var(--pc-accent);border-color:var(--pc-accent);color:#15140f}
    .postcard-button{width:100%;padding:8px;letter-spacing:.1em;margin-top:8px}.postcard-diagnostic{margin:8px 0 0;padding:8px;background:#08080a;border:1px solid var(--pc-line);color:var(--pc-dim);font:10px/1.45 ui-monospace,SFMono-Regular,Menlo,monospace;white-space:pre-wrap}.postcard-actions{position:fixed;right:0;bottom:0;z-index:30;width:var(--pc-panel-width,280px);display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px;padding:8px 16px;background:var(--pc-panel);border-top:1px solid var(--pc-line);box-shadow:0 -8px 24px #0008}.postcard-actions .postcard-button{margin:0;padding:7px 6px}.postcard-actions .postcard-button:first-child{grid-column:span 2}.postcard-actions .primary{background:var(--pc-accent);border-color:var(--pc-accent);color:#15140f}
    .postcard-toast{position:fixed;right:296px;bottom:18px;z-index:40;background:#141519;border:1px solid var(--pc-accent);color:var(--pc-accent);padding:7px 11px;border-radius:2px;opacity:0;transition:opacity .2s;pointer-events:none}.postcard-toast.on{opacity:1}.postcard-hud{position:absolute;left:10px;bottom:8px;opacity:.4;pointer-events:none;white-space:pre}.postcard-load{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:var(--pc-bg);letter-spacing:.2em;z-index:20;color:var(--pc-dim)}
  `;
  document.head.append(style);
}

function note(text) { const element = document.createElement('p'); element.className = 'note'; element.textContent = text; return element; }
function button(label, callback, className = '') { const element = document.createElement('button'); element.type = 'button'; element.className = `postcard-button ${className}`.trim(); element.textContent = label; element.addEventListener('click', callback); return element; }

export function createPostcardControls({ panel, title, description, scene, config, valuesFile = 'values.json', gridValues = [] }) {
  installStyles();
  panel.className = 'postcard-panel';
  panel.replaceChildren();
  const header = document.createElement('header');
  header.className = 'postcard-controls-head';
  header.append(Object.assign(document.createElement('h1'), { textContent: title }), Object.assign(document.createElement('p'), { textContent: description }));
  panel.append(header);

  const toast = document.createElement('div'); toast.className = 'postcard-toast'; document.body.append(toast);
  const notify = message => { toast.textContent = message; toast.classList.add('on'); clearTimeout(notify.timer); notify.timer = setTimeout(() => toast.classList.remove('on'), 1400); };
  const syncers = [], diagnostics = [];
  const sync = () => { syncers.forEach(syncer => syncer()); diagnostics.forEach(refresh => refresh()); };
  const update = kind => { applySceneUpdate(scene, kind); sync(); };
  const resolve = ({ path, get }) => get || (() => getPath(config, path));
  const assign = ({ path, set }) => set || (value => setPath(config, path, value));
  let controlId = 0;
  const labelInput = (label, input, text) => {
    const id = `postcard-control-${++controlId}`;
    input.id = id;
    label.htmlFor = id;
    label.textContent = text;
  };

  function section(title, description = '') {
    const element = document.createElement('section'); element.className = 'postcard-section';
    element.append(Object.assign(document.createElement('h2'), { textContent: title })); if (description) element.append(note(description)); panel.append(element);
    const api = {
      note(text) { element.append(note(text)); return api; },
      range(options) {
        const get = resolve(options), set = assign(options), row = document.createElement('div'), label = document.createElement('label'), input = document.createElement('input'), value = document.createElement('span');
        row.className = 'postcard-row'; input.type = 'range'; input.min = options.min; input.max = options.max; input.step = options.step; input.dataset.update = options.update || 'update'; labelInput(label, input, options.label); value.className = 'postcard-value';
        const show = () => { input.value = get(); value.textContent = (options.format || (item => String(item)))(get()); };
        input.addEventListener('input', () => { set(Number(input.value)); update(options.update || 'update'); }); row.append(label, input, value); element.append(row); syncers.push(show); show(); return api;
      },
      color(options) {
        const get = resolve(options), set = assign(options), row = document.createElement('div'), label = document.createElement('label'), input = document.createElement('input');
        row.className = 'postcard-row'; input.type = 'color'; input.dataset.update = options.update || 'refresh'; labelInput(label, input, options.label); const show = () => { input.value = get(); };
        input.addEventListener('input', () => { set(input.value); update(options.update || 'refresh'); }); row.append(label, input); element.append(row); syncers.push(show); show(); return api;
      },
      number(options) {
        const get = resolve(options), set = assign(options), row = document.createElement('div'), label = document.createElement('label'), input = document.createElement('input');
        row.className = 'postcard-row'; input.type = 'number'; input.step = options.step || 1; input.dataset.update = options.update || 'rebuild'; labelInput(label, input, options.label); const show = () => { input.value = get(); };
        input.addEventListener('change', () => { set(Number(input.value)); update(options.update || 'rebuild'); }); row.append(label, input); element.append(row); syncers.push(show); show(); return api;
      },
      choice(options) {
        const get = resolve(options), set = assign(options), host = document.createElement('div'); host.className = 'postcard-choice';
        const choices = options.values.map(value => typeof value === 'object' ? value : { value, label: String(value) });
        const buttons = choices.map(choice => { const control = document.createElement('button'); control.type = 'button'; control.className = 'postcard-chip'; control.textContent = choice.label; control.dataset.update = options.update || 'update'; control.addEventListener('click', () => { set(choice.value); update(options.update || 'update'); }); host.append(control); return control; });
        const show = () => buttons.forEach((control, index) => control.setAttribute('aria-pressed', String(choices[index].value === get()))); element.append(host); syncers.push(show); show(); return api;
      },
      select(options) {
        const get = resolve(options), set = assign(options), row = document.createElement('div'), label = document.createElement('label'), input = document.createElement('select');
        row.className = 'postcard-row'; input.dataset.update = options.update || 'update'; labelInput(label, input, options.label); options.values.forEach(value => input.append(Object.assign(document.createElement('option'), { value: typeof value === 'object' ? value.value : value, textContent: typeof value === 'object' ? value.label : value })));
        const show = () => { input.value = get(); }; input.addEventListener('change', () => { set(input.value); update(options.update || 'update'); }); row.append(label, input); element.append(row); syncers.push(show); show(); return api;
      },
      toggle(options) {
        const get = resolve(options), set = assign(options), row = document.createElement('div'), label = document.createElement('label'), input = document.createElement('input');
        row.className = 'postcard-row'; input.type = 'checkbox'; input.dataset.update = options.update || 'render'; labelInput(label, input, options.label); const show = () => { input.checked = Boolean(get()); };
        input.addEventListener('input', () => { set(input.checked); update(options.update || 'render'); }); row.append(label, input); element.append(row); syncers.push(show); show(); return api;
      },
      action(label, callback, updateKind = null) { const control = button(label, () => { callback(); if (updateKind) update(updateKind); else sync(); }); if (updateKind) control.dataset.update = updateKind; element.append(control); return api; },
      diagnostic(render) { const output = document.createElement('pre'); output.className = 'postcard-diagnostic'; const refresh = () => { output.textContent = render(); }; diagnostics.push(refresh); refresh(); element.append(output); return api; }
    };
    return api;
  }

  const basics = section('POSTCARD BASICS');
  basics.choice({ values: gridValues.map(value => ({ value, label: `${9 * value}×${16 * value}` })), path: 'gridK', update: 'rebuild' });
  basics.diagnostic(() => { const info = scene.info(); return `grid  ${info.W}×${info.H}`; });
  basics.note('Only 9:16 grids (9k × 16k) tile into whole internal pixels.');
  basics.choice({ values: [{ value: 'fill', label: 'FILL' }, { value: 'crisp', label: 'CRISP' }], path: 'fit', update: 'fit' });
  basics.color({ label: 'darkest', path: 'ink', update: 'refresh' }); basics.color({ label: 'brightest', path: 'paper', update: 'refresh' });
  basics.action('SWAP TONES', () => { [config.ink, config.paper] = [config.paper, config.ink]; }, 'refresh');

  const actions = document.createElement('nav'); actions.className = 'postcard-actions'; actions.setAttribute('aria-label', 'Postcard actions');
  actions.append(button('play / pause', () => scene.togglePaused()), button('save PNG', () => scene.savePng()), button('save values', () => { downloadJson(valuesFile, config); notify('values downloaded'); }, 'primary'), button('copy values', () => copyText(JSON.stringify(config, null, 2)).then(() => notify('values copied')).catch(() => notify('copy unavailable'))), button('reset', () => location.reload()));
  panel.append(actions);
  return { section, sync, update, notify };
}
