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
  if (!document.getElementById('postcard-controls-theme')) {
    const theme = document.createElement('link');
    theme.id = 'postcard-controls-theme'; theme.rel = 'stylesheet'; theme.href = new URL('./controls-theme.css', import.meta.url).href;
    document.head.append(theme);
  }
  if (document.getElementById('postcard-controls-style')) return;
  const style = document.createElement('style');
  style.id = 'postcard-controls-style';
  style.textContent = `
    *{box-sizing:border-box}
    body.postcard-authoring{display:flex;overflow:hidden}.postcard-stage{flex:1;min-width:0;position:relative;display:flex;align-items:center;justify-content:center}.postcard-stage canvas{display:block;image-rendering:pixelated;image-rendering:crisp-edges}
    .postcard-panel{width:var(--pc-panel-width);height:100vh;flex:none;display:flex;flex-direction:column;overflow:hidden;background:var(--pc-black);border-left:var(--pc-border) solid var(--pc-white-15)}
    .postcard-panel-content{position:relative;flex:1 1 auto;min-height:0;overflow:hidden}.postcard-panel-scrollable{height:100%;overflow-y:auto;scrollbar-width:none}.postcard-panel-scrollable::-webkit-scrollbar{display:none}.postcard-scrollbar{position:absolute;top:0;right:0;bottom:0;width:var(--pc-scrollbar);pointer-events:none}.postcard-scrollbar-thumb{position:absolute;right:2px;width:4px;min-height:var(--pc-scrollbar);background:var(--pc-accent);pointer-events:auto;cursor:grab}.postcard-scrollbar-thumb:active{cursor:grabbing}
    .postcard-controls-head{padding:var(--pc-space-3) var(--pc-space-4);border-bottom:var(--pc-border) solid var(--pc-white-15)}.postcard-controls-head h1{margin:0;color:var(--pc-white);font:700 14px/1.2 var(--pc-font-mono);letter-spacing:.04em;text-transform:uppercase}.postcard-controls-head p{margin:4px 0 0;color:var(--pc-white-50);font:400 14px/1.3 var(--pc-font-sans)}
    .postcard-section{padding:var(--pc-space-3) var(--pc-space-4);border-bottom:var(--pc-border) solid var(--pc-white-15)}.postcard-section h2{margin:0 0 var(--pc-space-3);color:var(--pc-accent);font:400 12px/1.2 var(--pc-font-mono);letter-spacing:.04em;text-transform:uppercase}.postcard-section .note{margin:var(--pc-space-2) 0 0;color:var(--pc-white-50);font:400 12px/1.35 var(--pc-font-sans)}
    .postcard-row{display:flex;align-items:center;gap:var(--pc-space-2);margin:var(--pc-space-2) 0}.postcard-row label{color:var(--pc-white);font:400 12px/1.25 var(--pc-font-sans)}.postcard-range{display:block}.postcard-range label{display:block;margin-bottom:var(--pc-space-1)}.postcard-range-field{display:flex;align-items:center;gap:var(--pc-space-4)}.postcard-row input[type=range]{-webkit-appearance:none;appearance:none;flex:1;min-width:0;height:14px;background:linear-gradient(to right,var(--pc-accent) 0 var(--pc-progress),var(--pc-white-50) var(--pc-progress) 100%) center/100% 2px no-repeat;outline:0}.postcard-row input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:4px;height:14px;border-radius:0;background:var(--pc-accent);cursor:pointer}.postcard-row input[type=range]::-moz-range-thumb{width:4px;height:14px;border:0;border-radius:0;background:var(--pc-accent);cursor:pointer}
    .postcard-value{min-width:64px;padding:2px var(--pc-space-1);border:var(--pc-border) solid var(--pc-white-15);background:var(--pc-white-08);color:var(--pc-accent);font:400 12px/1.3 var(--pc-font-mono);font-variant-numeric:tabular-nums}.postcard-range-value{margin:0;width:64px;appearance:textfield}.postcard-range-value::-webkit-inner-spin-button,.postcard-range-value::-webkit-outer-spin-button{appearance:none;margin:0}.postcard-row input[type=color]{margin-left:auto;width:46px;height:24px;padding:2px;border:var(--pc-border) solid var(--pc-white-15);background:var(--pc-white-08);cursor:pointer;border-radius:0}.postcard-row input[type=number],.postcard-row select{margin-left:auto;width:92px;background:var(--pc-white-08);border:var(--pc-border) solid var(--pc-white-15);color:var(--pc-accent);padding:3px var(--pc-space-1);font:400 12px/1.3 var(--pc-font-mono);border-radius:0}
    .postcard-choice-label{display:block;margin:var(--pc-space-2) 0 0;color:var(--pc-white-50);font:400 12px/1.25 var(--pc-font-sans)}.postcard-choice{display:flex;flex-wrap:wrap;gap:var(--pc-space-1);margin:var(--pc-space-2) 0}.postcard-chip,.postcard-button{border:var(--pc-border) solid var(--pc-white);background:transparent;color:var(--pc-white);border-radius:0;font:500 12px/1.2 var(--pc-font-sans);text-transform:uppercase;cursor:pointer}.postcard-chip{padding:6px var(--pc-space-2);font-family:var(--pc-font-mono);text-transform:none}.postcard-chip:hover,.postcard-button:hover{border-color:var(--pc-accent);color:var(--pc-accent)}.postcard-chip[aria-pressed=true]{background:var(--pc-accent);border-color:var(--pc-accent);color:var(--pc-black)}
    .postcard-button{width:100%;padding:8px;letter-spacing:.01em;margin-top:var(--pc-space-2)}.postcard-diagnostic{margin:var(--pc-space-2) 0 0;padding:var(--pc-space-2);background:var(--pc-white-08);border:var(--pc-border) solid var(--pc-white-15);color:var(--pc-white-50);font:400 11px/1.4 var(--pc-font-mono);white-space:pre-wrap}.postcard-actions{flex:none;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:var(--pc-space-1);padding:var(--pc-space-3) var(--pc-space-4);background:var(--pc-black);border-top:var(--pc-border) solid var(--pc-white-15)}.postcard-actions .postcard-button{margin:0;padding:8px}.postcard-actions .primary{background:var(--pc-accent);border-color:var(--pc-accent);color:var(--pc-black)}
    .postcard-toast{position:fixed;right:calc(var(--pc-panel-width) + var(--pc-space-2));bottom:var(--pc-space-2);z-index:40;background:var(--pc-black);border:var(--pc-border) solid var(--pc-accent);color:var(--pc-accent);padding:var(--pc-space-2);font:12px var(--pc-font-mono);opacity:0;transition:opacity .2s;pointer-events:none}.postcard-toast.on{opacity:1}.postcard-hud{position:absolute;left:10px;bottom:8px;opacity:.5;pointer-events:none;white-space:pre;font-family:var(--pc-font-mono)}
  `;
  document.head.append(style);
}

function note(text) { const element = document.createElement('p'); element.className = 'note'; element.textContent = text; return element; }
function button(label, callback, className = '') { const element = document.createElement('button'); element.type = 'button'; element.className = `postcard-button ${className}`.trim(); element.textContent = label; element.addEventListener('click', callback); return element; }

export function createPostcardControls({ panel, title, description, scene, config, valuesFile = 'values.json', gridValues = [] }) {
  installStyles();
  panel.className = 'postcard-panel';
  panel.replaceChildren();
  const content = document.createElement('div');
  content.className = 'postcard-panel-content';
  const scrollable = document.createElement('div');
  scrollable.className = 'postcard-panel-scrollable';
  const scrollbar = document.createElement('div');
  scrollbar.className = 'postcard-scrollbar';
  const scrollbarThumb = document.createElement('div');
  scrollbarThumb.className = 'postcard-scrollbar-thumb';
  scrollbar.append(scrollbarThumb); content.append(scrollable, scrollbar); panel.append(content);
  const syncScrollbar = () => {
    const visible = scrollable.scrollHeight > scrollable.clientHeight;
    const thumbHeight = visible ? Math.max(8, (scrollable.clientHeight / scrollable.scrollHeight) * scrollable.clientHeight) : 0;
    const travel = Math.max(0, scrollable.clientHeight - thumbHeight);
    const progress = scrollable.scrollHeight === scrollable.clientHeight ? 0 : scrollable.scrollTop / (scrollable.scrollHeight - scrollable.clientHeight);
    scrollbar.hidden = !visible; scrollbarThumb.style.height = `${thumbHeight}px`; scrollbarThumb.style.transform = `translateY(${travel * progress}px)`;
  };
  scrollable.addEventListener('scroll', syncScrollbar, { passive: true });
  new ResizeObserver(syncScrollbar).observe(scrollable);
  scrollbarThumb.addEventListener('pointerdown', event => {
    event.preventDefault(); const startY = event.clientY, startTop = scrollable.scrollTop;
    const move = moveEvent => { scrollable.scrollTop = startTop + (moveEvent.clientY - startY) * (scrollable.scrollHeight / scrollable.clientHeight); };
    const end = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', end); };
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', end);
  });
  const header = document.createElement('header');
  header.className = 'postcard-controls-head';
  header.append(Object.assign(document.createElement('h1'), { textContent: title }), Object.assign(document.createElement('p'), { textContent: description }));
  scrollable.append(header);

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
    element.append(Object.assign(document.createElement('h2'), { textContent: title })); if (description) element.append(note(description)); scrollable.append(element);
    const api = {
      note(text) { element.append(note(text)); return api; },
      range(options) {
        const get = resolve(options), set = assign(options), row = document.createElement('div'), label = document.createElement('label'), input = document.createElement('input'), value = document.createElement('input');
        row.className = 'postcard-row postcard-range'; input.type = 'range'; input.min = options.min; input.max = options.max; input.step = options.step; input.dataset.update = options.update || 'update'; labelInput(label, input, options.label); value.className = 'postcard-value postcard-range-value'; value.type = 'number'; value.min = options.min; value.max = options.max; value.step = options.step; value.setAttribute('aria-label', `${options.label} value`);
        const field = document.createElement('div'); field.className = 'postcard-range-field';
        const show = () => { const current = get(); input.value = current; input.style.setProperty('--pc-progress', `${((current - Number(input.min)) / (Number(input.max) - Number(input.min))) * 100}%`); if (document.activeElement !== value) value.value = current; };
        const applyValue = raw => { const next = Number(raw); if (!Number.isFinite(next)) return show(); const bounded = Math.min(Number(input.max), Math.max(Number(input.min), next)); set(bounded); update(options.update || 'update'); };
        input.addEventListener('input', () => { set(Number(input.value)); update(options.update || 'update'); }); value.addEventListener('change', () => applyValue(value.value)); value.addEventListener('keydown', event => { if (event.key === 'Enter') { applyValue(value.value); value.blur(); } }); field.append(input, value); row.append(label, field); element.append(row); syncers.push(show); show(); return api;
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
      readout(options) {
        const row = document.createElement('div'), label = document.createElement('span'), value = document.createElement('span');
        row.className = 'postcard-row'; label.textContent = options.label; value.className = 'postcard-value';
        const show = () => { value.textContent = options.render(); };
        row.append(label, value); element.append(row); syncers.push(show); show(); return api;
      },
      choice(options) {
        const get = resolve(options), set = assign(options), host = document.createElement('div'); host.className = 'postcard-choice';
        const choices = options.values.map(value => typeof value === 'object' ? value : { value, label: String(value) });
        const buttons = choices.map(choice => { const control = document.createElement('button'); control.type = 'button'; control.className = 'postcard-chip'; control.textContent = choice.label; control.dataset.update = options.update || 'update'; control.addEventListener('click', () => { set(choice.value); update(options.update || 'update'); }); host.append(control); return control; });
        const show = () => buttons.forEach((control, index) => control.setAttribute('aria-pressed', String(choices[index].value === get())));
        if (options.label) element.append(Object.assign(document.createElement('span'), { className: 'postcard-choice-label', textContent: options.label }));
        element.append(host); syncers.push(show); show(); return api;
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
  basics.readout({ label: 'grid', render: () => { const info = scene.info(); return `${info.W}×${info.H}`; } });
  basics.choice({ label: 'pixelation', values: gridValues.map(value => ({ value, label: `${9 * value}×${16 * value}` })), path: 'gridK', update: 'rebuild' });
  basics.note('Only 9:16 grids (9k × 16k) tile into whole internal pixels.');
  basics.choice({ label: 'display fit', values: [{ value: 'fill', label: 'FILL' }, { value: 'crisp', label: 'CRISP' }], path: 'fit', update: 'fit' });
  basics.color({ label: 'darkest', path: 'ink', update: 'refresh' }); basics.color({ label: 'brightest', path: 'paper', update: 'refresh' });
  basics.action('SWAP TONES', () => { [config.ink, config.paper] = [config.paper, config.ink]; }, 'refresh');

  const actions = document.createElement('nav'); actions.className = 'postcard-actions'; actions.setAttribute('aria-label', 'Postcard actions');
  actions.append(button('play / pause', () => scene.togglePaused()), button('reset', () => location.reload()), button('save frame', () => scene.savePng()), button('save video', () => {
    if(!scene.saveVideo){notify('video export is unavailable');return;}
    notify('recording 30s video');scene.saveVideo().then(()=>notify('video downloaded')).catch(error=>notify(error.message));
  }), button('copy values', () => copyText(JSON.stringify(config, null, 2)).then(() => notify('values copied')).catch(() => notify('copy unavailable'))), button('save values', () => { downloadJson(valuesFile, config); notify('values downloaded'); }, 'primary'));
  panel.append(actions); syncScrollbar();
  return { section, sync, update, notify };
}
