export function toast(el,message){el.textContent=message;el.classList.add('on');clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove('on'),1400);}
export function buildChips(host,values,get,set,label){host.replaceChildren(...values.map(value=>{const b=document.createElement('button');b.className='chip';b.type='button';b.textContent=label(value);b.setAttribute('aria-pressed',String(get()===value));b.onclick=()=>{set(value);[...host.children].forEach(c=>c.setAttribute('aria-pressed','false'));b.setAttribute('aria-pressed','true');};return b;}));}
export function bindRange(input,get,set){input.value=get();input.oninput=e=>set(Number(e.target.value));}
export async function copyText(text){await navigator.clipboard.writeText(text);}
export function downloadJson(name,value){const blob=new Blob([JSON.stringify(value,null,2)+'\n'],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),0);}

