import { downloadJson } from './shared/controls.js';
import { loadRenderSettings, normaliseSettings, paletteLabel } from './shared/render-settings.js';

const draft = await loadRenderSettings();
const panel = document.querySelector('#panel');
const previews = document.querySelector('#previews');
const cards = [
  ['Windmill', 'postcards/windmill/index.html'], ['Coffee', 'postcards/coffee/index.html'], ['Passing legs', 'postcards/passing-legs/index.html']
];
let paletteId = draft.defaults.palette, pixelId = draft.defaults.pixelPreset;
const field = (label, type, get, set, options = []) => {
  const row=document.createElement('label'), name=document.createElement('span'), input=document.createElement(type==='select'?'select':'input'); name.textContent=label;
  if(type!=='select') input.type=type; else options.forEach(option=>input.append(Object.assign(document.createElement('option'),{value:option.value,textContent:option.label})));
  const sync=()=>{if(type==='checkbox')input.checked=Boolean(get());else input.value=get();}; input.addEventListener('input',()=>{set(type==='checkbox'?input.checked:type==='number'?Number(input.value):input.value);render();broadcast();}); row.append(name,input);panel.append(row);sync();
};
const heading = text => panel.append(Object.assign(document.createElement('h2'),{textContent:text}));
const button = (label, callback, primary=false) => { const item=document.createElement('button');item.type='button';item.textContent=label;if(primary)item.className='primary';item.addEventListener('click',callback);return item; };
function broadcast(){
  const selection={palette:paletteId,pixelPreset:pixelId};
  document.querySelectorAll('iframe').forEach(frame=>frame.contentWindow?.postMessage({type:'blinking-robot:render-settings',selection,settings:draft},'*'));
}
function uniqueId(items, base){let n=1,id=base;while(items.some(item=>item.id===id))id=`${base}-${++n}`;return id;}
function render(){
  panel.replaceChildren();
  heading('DEFAULTS');
  field('palette', 'select', ()=>draft.defaults.palette, value=>{draft.defaults.palette=value;paletteId=value;}, draft.palettes.map(p=>({value:p.id,label:paletteLabel(p)})));
  field('pixel preset', 'select', ()=>draft.defaults.pixelPreset, value=>{draft.defaults.pixelPreset=value;pixelId=value;}, draft.pixelPresets.map(p=>({value:p.id,label:p.name})));
  heading('SAVED PALETTES');
  field('editing', 'select', ()=>paletteId, value=>{paletteId=value;}, draft.palettes.map(p=>({value:p.id,label:paletteLabel(p)})));
  const palette=draft.palettes.find(p=>p.id===paletteId);
  field('name','text',()=>palette.name,value=>{palette.name=value;}); field('mode','select',()=>palette.mode,value=>{palette.mode=value;},[{value:'1-bit',label:'1-bit'},{value:'2-bit',label:'2-bit'}]);
  field('dark','color',()=>palette.dark,value=>{palette.dark=value;}); field('middle','color',()=>palette.middle||palette.light,value=>{palette.middle=value;}); field('light','color',()=>palette.light,value=>{palette.light=value;}); field('accent','color',()=>palette.accent||palette.light,value=>{palette.accent=value;}); field('visitor exposed','checkbox',()=>palette.visitorExposed,value=>{palette.visitorExposed=value;});
  heading('SAVED PIXEL PRESETS');
  field('editing','select',()=>pixelId,value=>{pixelId=value;},draft.pixelPresets.map(p=>({value:p.id,label:p.name})));
  const pixel=draft.pixelPresets.find(p=>p.id===pixelId);
  field('name','text',()=>pixel.name,value=>{pixel.name=value;}); field('grid k','number',()=>pixel.gridK,value=>{pixel.gridK=Math.max(1,Math.round(value));}); field('visitor exposed','checkbox',()=>pixel.visitorExposed,value=>{pixel.visitorExposed=value;});
  const actions=document.createElement('div');actions.className='actions';
  actions.append(button('ADD PALETTE',()=>{const id=uniqueId(draft.palettes,'palette');draft.palettes.push({id,name:'Untitled palette',mode:'2-bit',dark:'#101014',middle:'#697077',light:'#efece2',accent:'#c5e714',visitorExposed:false});paletteId=id;render();broadcast();}),button('REMOVE PALETTE',()=>{if(draft.defaults.palette===paletteId)return alert('Choose another default palette before removing this one.');draft.palettes=draft.palettes.filter(p=>p.id!==paletteId);paletteId=draft.palettes[0].id;render();broadcast();}),button('ADD PIXELS',()=>{const id=uniqueId(draft.pixelPresets,'pixels');draft.pixelPresets.push({id,name:'Untitled pixels',gridK:26,visitorExposed:false});pixelId=id;render();broadcast();}),button('REMOVE PIXELS',()=>{if(draft.defaults.pixelPreset===pixelId)return alert('Choose another default pixel preset before removing this one.');draft.pixelPresets=draft.pixelPresets.filter(p=>p.id!==pixelId);pixelId=draft.pixelPresets[0].id;render();broadcast();}),button('DOWNLOAD SETTINGS',()=>downloadJson('render-settings.json',normaliseSettings(draft)),true));
  panel.append(actions,Object.assign(document.createElement('p'),{className:'note',textContent:'Default is what public pages load. Visitor exposed is the restricted gallery picker. This draft is author-only until downloaded and committed.'}));
}
for(const [title,src] of cards){const card=document.createElement('article'),label=document.createElement('p'),frame=document.createElement('iframe');label.textContent=title;frame.title=`${title} live preview`;frame.src=src;frame.addEventListener('load',broadcast);card.append(label,frame);previews.append(card);}
render();
