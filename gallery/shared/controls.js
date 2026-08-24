/* Shared building blocks for postcard authoring panels. Scene-specific
   controls stay in the postcard; this file owns their common shell. */

export function toast(element, message) {
  element.textContent = message;
  element.classList.add('on');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => element.classList.remove('on'), 1400);
}

export function buildChips(host, values, get, set, label, { apply = 'rebuild' } = {}) {
  host.replaceChildren(...values.map(value => {
    const button = document.createElement('button');
    button.className = 'chip postcard-choice';
    button.type = 'button';
    button.textContent = label(value);
    button.dataset.update = apply;
    button.setAttribute('aria-pressed', String(get() === value));
    button.onclick = () => {
      set(value);
      [...host.children].forEach(child => child.setAttribute('aria-pressed', 'false'));
      button.setAttribute('aria-pressed', 'true');
    };
    return button;
  }));
}

export function bindRange(input, get, set, { apply = 'rebuild' } = {}) {
  input.value = get();
  input.dataset.update = apply;
  input.oninput = event => set(Number(event.target.value));
}

/* Every panel uses the same small vocabulary for applying a creative change.
   A renderer may implement only the operations it can make cheaper; the
   fallback remains a safe retained-time rebuild. */
export function applySceneUpdate(scene, kind = 'rebuild') {
  if (kind === 'fit') return scene.fit();
  if (kind === 'render' && scene.render) return scene.render();
  if (kind === 'refresh' && scene.refresh) return scene.refresh();
  if (kind === 'update' && scene.update) return scene.update();
  return scene.rebuild(true);
}

export async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch (_) {
      /* Local preview servers can deny Clipboard permission. Fall through. */
    }
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

function download(name, text, type) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function downloadJson(name, value) {
  download(name, `${JSON.stringify(value, null, 2)}\n`, 'application/json');
}

export function downloadValuesModule(name, globalName, value) {
  download(name, `window.${globalName} = ${JSON.stringify(value, null, 2)};\n`, 'text/javascript');
}

export function makeSection(title, note = '') {
  const section = document.createElement('section');
  section.className = 'postcard-control-section';
  section.innerHTML = `<h2>${title}</h2>${note ? `<p class="note">${note}</p>` : ''}`;
  return section;
}

export function makeRange({ label, value, min, max, step, onInput, format = item => String(item), apply = 'rebuild' }) {
  const row = document.createElement('div');
  row.className = 'row postcard-range-control';
  const input = document.createElement('input');
  const readout = document.createElement('span');
  input.type = 'range';
  input.min = min;
  input.max = max;
  input.step = step;
  input.dataset.update = apply;
  readout.className = 'val';
  const sync = nextValue => {
    input.value = nextValue;
    readout.textContent = format(nextValue);
  };
  sync(value);
  input.oninput = () => {
    const nextValue = Number(input.value);
    onInput(nextValue);
    sync(nextValue);
  };
  row.append(Object.assign(document.createElement('label'), { textContent: label }), input, readout);
  return { element: row, sync };
}

export function makeColor({ label, value, onInput, apply = 'rebuild' }) {
  const row = document.createElement('div');
  row.className = 'row postcard-color-control';
  const input = document.createElement('input');
  input.type = 'color';
  input.value = value;
  input.dataset.update = apply;
  input.oninput = () => onInput(input.value);
  row.append(Object.assign(document.createElement('label'), { textContent: label }), input);
  return { element: row, sync: nextValue => { input.value = nextValue; } };
}

export function makeChoice({ label, values, value, onInput, apply = 'rebuild' }) {
  const row = document.createElement('div');
  row.className = 'row postcard-choice-control';
  const host = document.createElement('div');
  host.className = 'chips';
  const choices = values.map(item => typeof item === 'object' ? item : { label: item, value: item });
  const sync = nextValue => {
    [...host.children].forEach((button, index) => button.setAttribute('aria-pressed', String(choices[index].value === nextValue)));
  };
  choices.forEach(item => {
    const button = document.createElement('button');
    button.className = 'chip postcard-choice';
    button.type = 'button';
    button.textContent = item.label;
    button.dataset.update = apply;
    button.onclick = () => {
      onInput(item.value);
      sync(item.value);
    };
    host.append(button);
  });
  sync(value);
  row.append(Object.assign(document.createElement('label'), { textContent: label }), host);
  return { element: row, sync };
}

export function makeNumber({ label, value, onInput, step = 1, apply = 'rebuild' }) {
  const row = document.createElement('div');
  row.className = 'row postcard-number-control';
  const input = document.createElement('input');
  input.type = 'number';
  input.step = step;
  input.value = value;
  input.dataset.update = apply;
  input.oninput = () => onInput(Number(input.value));
  row.append(Object.assign(document.createElement('label'), { textContent: label }), input);
  return { element: row, sync: nextValue => { input.value = nextValue; } };
}

export function makeToggle({ label, value, onInput, apply = 'render' }) {
  const row = document.createElement('div');
  row.className = 'row postcard-toggle-control';
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.checked = value;
  input.dataset.update = apply;
  input.oninput = () => onInput(input.checked);
  row.append(Object.assign(document.createElement('label'), { textContent: label }), input);
  return { element: row, sync: nextValue => { input.checked = nextValue; } };
}

export function makeAction(label, onClick) {
  const button = document.createElement('button');
  button.className = 'btn postcard-action';
  button.type = 'button';
  button.textContent = label;
  button.onclick = onClick;
  return button;
}

export function makeDiagnostic(text = '') {
  const element = document.createElement('pre');
  element.className = 'readout postcard-diagnostic';
  element.textContent = text;
  return element;
}

function ensureSharedStyles() {
  if (document.getElementById('shared-controls-style')) return;
  const style = document.createElement('style');
  style.id = 'shared-controls-style';
  style.textContent = `
    #panel[data-shared-controls=true]{--postcard-panel-width:280px;padding-bottom:104px}
    .postcard-controls-head{border-bottom:1px solid var(--line);margin:0 0 4px;padding:0 0 14px}
    .postcard-controls-head h1{color:var(--ink);font-size:11px;letter-spacing:.2em;margin:0;font-weight:600}
    .postcard-controls-head p{font-size:10px;color:var(--dim);margin:3px 0 0}
    #panel[data-shared-controls=true] fieldset:first-of-type legend,
    #panel[data-shared-controls=true] section:first-of-type h2{color:var(--acc,var(--accent))}
    .postcard-control-section{border-top:1px solid var(--line);padding:14px 0 12px}
    .postcard-control-section h2{margin:0 0 6px;color:var(--ink);font-size:9.5px;letter-spacing:.2em;font-weight:500}
    .postcard-control-section .note{margin:6px 0;color:var(--dim);font-size:9.5px}
    .postcard-range-control input[type=range]{flex:1;min-width:0}
    .postcard-choice-control .chips{margin:0}
    .postcard-number-control input{width:74px}
    .postcard-toggle-control input{accent-color:var(--acc,var(--accent))}
    .postcard-diagnostic{white-space:pre-wrap}
    .postcard-actions{position:fixed;right:0;bottom:0;z-index:30;width:var(--postcard-panel-width,280px);display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px;padding:8px 16px;background:#0d0d10;border-top:1px solid #22232a;box-shadow:0 -8px 24px #0008}
    .postcard-actions button{border:1px solid #22232a;background:#141519;color:#e8e6df;padding:7px 6px;font:10px ui-monospace,monospace;cursor:pointer}
    .postcard-actions button[data-primary=true]{background:#c8b98a;border-color:#c8b98a;color:#15140f}
    .postcard-actions button:hover{filter:brightness(1.14)}
    .postcard-actions button:first-child{grid-column:span 2}
  `;
  document.head.append(style);
}

export function mountPanelFrame({ panel, title, description }) {
  ensureSharedStyles();
  panel.dataset.sharedControls = 'true';
  let head = panel.querySelector('.postcard-controls-head');
  if (!head) {
    head = document.createElement('header');
    head.className = 'postcard-controls-head';
    panel.prepend(head);
  }
  head.replaceChildren(
    Object.assign(document.createElement('h1'), { textContent: title }),
    Object.assign(document.createElement('p'), { textContent: description })
  );
  return head;
}

export function mountActionBar({ panel, onSavePng, onSaveValues, onCopy, onReset, onToggle } = {}) {
  ensureSharedStyles();
  const bar = document.createElement('nav');
  bar.className = 'postcard-actions';
  bar.setAttribute('aria-label', 'Postcard actions');
  const add = (label, callback, primary = false) => {
    if (!callback) return;
    const button = makeAction(label, callback);
    if (primary) button.dataset.primary = 'true';
    bar.append(button);
  };
  add('play / pause', onToggle);
  add('save PNG', onSavePng);
  add('save values', onSaveValues, true);
  add('copy values', onCopy);
  add('reset', onReset);
  (panel ?? document.body).append(bar);
  return bar;
}

export function standardizePanel({ panel, basicsSelector }) {
  const basics = panel.querySelector(basicsSelector);
  if (basics) {
    const legend = basics.querySelector('legend');
    const heading = basics.querySelector('h2');
    if (legend) legend.textContent = 'POSTCARD BASICS';
    if (heading) heading.textContent = 'POSTCARD BASICS';
    basics.dataset.controlRole = 'basics';
  }
  panel.querySelectorAll('input[type=range]').forEach(input => {
    input.classList.add('postcard-range');
    if (!input.dataset.update) input.dataset.update = 'rebuild';
  });
  panel.querySelectorAll('input[type=color]').forEach(input => {
    input.classList.add('postcard-color');
    if (!input.dataset.update) input.dataset.update = 'rebuild';
  });
  panel.querySelectorAll('button').forEach(button => button.classList.add('postcard-action'));
  return basics;
}
