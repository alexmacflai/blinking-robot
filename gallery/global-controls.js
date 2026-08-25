import { createGlobalControls } from './shared/controls.js';
import { clone, loadRenderSettings, normaliseSettings, paletteLabel, pixelLabel, saveRenderSettings, seedTwoBitChannels } from './shared/render-settings.js';

const GRID_VALUES=[11,13,16,20,26,32,40,48];
const draft=clone(await loadRenderSettings());
const previews=document.querySelector('#previews');
const cards=[['Windmill','postcards/windmill/index.html'],['Coffee','postcards/coffee/index.html'],['Passing legs','postcards/passing-legs/index.html']];
let paletteId=draft.defaults.palette, pixelId=draft.defaults.pixelPreset;
const selection=()=>({palette:paletteId,pixelPreset:pixelId});
const chosenPalette=()=>draft.palettes.find(item=>item.id===paletteId);
const chosenPixel=()=>draft.pixelPresets.find(item=>item.id===pixelId);
const uniqueId=(items,base)=>{let id=base,n=1;while(items.some(item=>item.id===id))id=`${base}-${++n}`;return id;};
function broadcast(target=null){
  const message={type:'blinking-robot:render-settings',selection:selection(),settings:draft};
  (target?[target]:[...document.querySelectorAll('iframe')].map(frame=>frame.contentWindow)).filter(Boolean).forEach(window=>window.postMessage(message,'*'));
}
addEventListener('message',event=>{if(event.data?.type==='blinking-robot:render-ready')broadcast(event.source);});
function build(){
  const controls=createGlobalControls({panel:document.querySelector('#panel'),title:'GLOBAL RENDERING',description:'Shared defaults and visitor-exposed presets. Changes preview live; Save Global Settings writes the tracked source of truth.'});
  const refresh=()=>{build();broadcast();};
  const defaults=controls.section('DEFAULTS','Public postcards start with these saved selections.');
  defaults.select({label:'palette',get:()=>draft.defaults.palette,set:value=>{draft.defaults.palette=value;paletteId=value;},values:()=>draft.palettes.map(item=>({value:item.id,label:paletteLabel(item)})),onChange:refresh});
  defaults.select({label:'pixelation',get:()=>draft.defaults.pixelPreset,set:value=>{draft.defaults.pixelPreset=value;pixelId=value;},values:()=>draft.pixelPresets.map(item=>({value:item.id,label:pixelLabel(item)})),onChange:refresh});
  const palettes=controls.section('SAVED PALETTES','Saved global palettes are available to every postcard. Visitor exposed only controls the public picker.');
  palettes.select({label:'editing',get:()=>paletteId,set:value=>{paletteId=value;},values:()=>draft.palettes.map(item=>({value:item.id,label:paletteLabel(item)})),onChange:build});
  const palette=chosenPalette();
  palettes.text({label:'name',get:()=>palette.name,set:value=>{palette.name=value;},onChange:refresh});
  palettes.choice({label:'mode',get:()=>palette.mode,set:value=>{palette.mode=value;if(value==='2-bit')seedTwoBitChannels(palette);},values:['1-bit','2-bit'],onChange:refresh});
  palettes.color({label:'darkest',get:()=>palette.dark,set:value=>{palette.dark=value;},onChange:broadcast});
  palettes.color({label:'middle',get:()=>palette.middle||palette.light,set:value=>{palette.middle=value;},visible:()=>palette.mode==='2-bit',onChange:broadcast});
  palettes.color({label:'brightest',get:()=>palette.light,set:value=>{palette.light=value;},onChange:broadcast});
  palettes.color({label:'accent',get:()=>palette.accent||palette.light,set:value=>{palette.accent=value;},visible:()=>palette.mode==='2-bit',onChange:broadcast});
  palettes.toggle({label:'visitor exposed',get:()=>palette.visitorExposed,set:value=>{palette.visitorExposed=value;},onChange:broadcast});
  palettes.action('ADD PALETTE',()=>{const id=uniqueId(draft.palettes,'palette');draft.palettes.push({id,name:'Untitled palette',mode:'2-bit',dark:'#101014',middle:'#697077',light:'#efece2',accent:'#c5e714',visitorExposed:false});paletteId=id;refresh();});
  palettes.action('REMOVE PALETTE',()=>{if(draft.defaults.palette===paletteId){controls.notify('choose another default palette first');return;}draft.palettes=draft.palettes.filter(item=>item.id!==paletteId);paletteId=draft.palettes[0].id;refresh();});
  const pixels=controls.section('SAVED PIXEL PRESETS','Choose from the same portrait resolutions used by postcard controls; no internal grid number is exposed.');
  pixels.select({label:'editing',get:()=>pixelId,set:value=>{pixelId=value;},values:()=>draft.pixelPresets.map(item=>({value:item.id,label:pixelLabel(item)})),onChange:build});
  const pixel=chosenPixel();
  pixels.text({label:'name',get:()=>pixel.name,set:value=>{pixel.name=value;},onChange:refresh});
  pixels.choice({label:'pixelation',get:()=>pixel.gridK,set:value=>{pixel.gridK=Number(value);},values:GRID_VALUES.map(value=>({value,label:`${value*9}×${value*16}`})),onChange:broadcast});
  pixels.toggle({label:'visitor exposed',get:()=>pixel.visitorExposed,set:value=>{pixel.visitorExposed=value;},onChange:broadcast});
  pixels.action('ADD PIXEL PRESET',()=>{const id=uniqueId(draft.pixelPresets,'pixels');draft.pixelPresets.push({id,name:'Untitled pixel preset',gridK:26,visitorExposed:false});pixelId=id;refresh();});
  pixels.action('REMOVE PIXEL PRESET',()=>{if(draft.defaults.pixelPreset===pixelId){controls.notify('choose another default pixel preset first');return;}draft.pixelPresets=draft.pixelPresets.filter(item=>item.id!==pixelId);pixelId=draft.pixelPresets[0].id;refresh();});
  const save=controls.section('PUBLISH SETTINGS','Save uses the same loopback authoring flow as postcard Save Default.');
  save.action('SAVE GLOBAL SETTINGS',()=>saveRenderSettings(normaliseSettings(draft)).then(()=>controls.notify('global settings saved')).catch(error=>controls.notify(error.message)),'primary');
  controls.sync();
}
for(const [title,src] of cards){const card=document.createElement('article'),label=document.createElement('h2'),frame=document.createElement('iframe');card.className='global-preview';label.textContent=title;frame.className='global-preview-frame';frame.title=`${title} live preview`;frame.src=src;frame.addEventListener('load',()=>broadcast(frame.contentWindow));card.append(label,frame);previews.append(card);}
build();
