import { createPlaybackState } from '../../shared/playback.js';

(function(){
"use strict";

/* ========================================================================
   BLINKING ROBOT — cloud-drain warning sign

   A standard European triangular warning sign stands on a pole above a sea
   of clouds that drains inward and downward around it, like a whirlpool
   emptying through a plughole. The sign and pole are structurally
   indifferent to the drain: only the cloud field moves.

   RENDER PIPELINE — the house discipline: compose the whole scene as
   CONTINUOUS luminance in a Float32 buffer, then threshold the finished
   composite once through an ordered Bayer 8x8 matrix. One dither pass keeps
   the spiral, the sign, and the pole on one lattice instead of reading as
   pre-dithered layers stacked on top of each other.

   THE WHIRLPOOL IS ONE FIELD, drawn per pixel in polar coordinates around a
   fixed centre below the sign, not as discrete cloud objects (reusing the
   windmill's field-not-objects treatment). The vertical axis is squashed
   (`pool.squashY`) so the circle reads as an ellipse seen from slightly
   above — the camera position the brief calls for.

   DEPTH READS THROUGH POSITION, never through a single flat fill:
     - radius sets a slow tone gradient (`pool.edgeTone` -> `pool.innerTone`)
       and also fades the spiral's banding amplitude toward the centre, so
       material quietly disappears rather than popping;
     - screen Y sets a near/far bias (`pool.farNearShade`) so the ellipse's
       far (upper) and near (lower) rims stay legible as different depths.

   THE DRAIN IS MOTION, NOT GEOMETRY. Each pixel's spiral phase combines its
   angle and radius; advancing that phase with time makes the pattern's
   apparent radius shrink continuously, which reads as material spiralling
   inward, with no particles spawned or destroyed and no period to return to
   (the same unbounded time driver as the windmill's rotor).

   THE SIGN NEVER PARTICIPATES IN THE DRAIN. It and its pole are drawn last,
   in their own polygon/line passes, with at most a slow independent wind
   sway around the pole's base — never phase-locked to the whirlpool.

   RESOLUTION INDEPENDENCE — everything is authored in a BASE 234x416 grid
   and multiplied by S = W/234 at build time, matching the other postcards.
   ===================================================================== */

const BASE_W=234, BASE_H=416;

const CFG=window.DRAIN_VALUES;

/* ---------- helpers --------------------------------------------------- */
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
const lerp=(a,b,t)=>a+(b-a)*t;
function smooth(x){ const t=clamp(x,0,1); return t*t*(3-2*t); }

function grain(x,y){
  const n=Math.sin(x*12.9898+y*78.233)*43758.5453;
  return (n-Math.floor(n))-0.5;
}

const BAYER = new Uint8Array([
   0,32, 8,40, 2,34,10,42,  48,16,56,24,50,18,58,26,
  12,44, 4,36,14,46, 6,38,  60,28,52,20,62,30,54,22,
   3,35,11,43, 1,33, 9,41,  51,19,59,27,49,17,57,25,
  15,47, 7,39,13,45, 5,37,  63,31,55,23,61,29,53,21]);

function packColor(hex){
  const n=parseInt(hex.slice(1),16);
  const r=(n>>16)&255, g=(n>>8)&255, b=n&255;
  return ((255<<24)|(b<<16)|(g<<8)|r)>>>0;
}

/* ======================================================================
   DERIVED STATE — rebuilt by build()
   ==================================================================== */
let W,H,S;
let lum,img,buf32,CINK,CPAP;

const cv=document.getElementById('c');
const ctx=cv.getContext('2d',{alpha:false});

function build(){
  const K=CFG.gridK;
  W=9*K; H=16*K; S=W/BASE_W;
  cv.width=W; cv.height=H;
  img=ctx.createImageData(W,H);
  buf32=new Uint32Array(img.data.buffer);
  lum=new Float32Array(W*H);
  const palette=CFG.render||{dark:CFG.ink,light:CFG.paper};
  CINK=packColor(palette.dark); CPAP=packColor(palette.light);
}

/* ======================================================================
   WHIRLPOOL FIELD — one continuous value per pixel
   ==================================================================== */
function fieldTone(bx,by,t){
  const p=CFG.pool, sea=CFG.sea;

  /* Above the horizon is sky; everything below it is one continuous cloud
     sea. The whirlpool is a depression INSIDE that sea, not an object
     floating in the air — the brief's "sea of clouds", not a cloud. */
  const horizon=sea.horizonY;
  if(by<horizon){
    const fade=smooth(clamp((horizon-by)/Math.max(1,sea.horizonSoft),0,1));
    const sky=CFG.bg.tone+grain(bx,by)*CFG.bg.grain;
    const seaTop=sea.tone+grain(bx*3.1,by*3.1)*sea.grain;
    return clamp(lerp(seaTop,sky,fade),0,1);
  }

  const seaBase=sea.tone+((by-horizon)/Math.max(1,BASE_H-horizon))*sea.depthShade;
  let tone=seaBase;

  const dx=bx-p.cx, dy=(by-p.cy)/Math.max(0.05,p.squashY);
  const r=Math.sqrt(dx*dx+dy*dy);
  const rn=r/p.radius;

  if(rn<=1){
    const angle=Math.atan2(dy,dx);

    /* One log-ish spiral phase per pixel. Advancing it with time makes a
       given band's radius shrink, which is the drain: material travels
       inward without anything being spawned or destroyed. */
    /* A LOG spiral, not an Archimedean one. Using ln(r) means the bands'
       radial spacing shrinks geometrically toward the centre, so a band
       visibly gets smaller as it travels inward — the brief's "material
       scales down as it follows the spiral" falls out of the geometry
       instead of needing a separate size term. */
    const rl=Math.log(Math.max(rn,0.02));
    const phase=(angle*p.arms)/(2*Math.PI)+rl*p.rings+t*p.rotSpeed;
    /* Hardening the sine into a plateau is what makes the arms read as
       graphic masses rather than as a soft airbrushed gradient. */
    const raw=Math.sin(2*Math.PI*phase);
    const hard=clamp(p.bandHard,0,0.99);
    const band=hard>0?clamp(raw/(1-hard),-1,1):raw;

    /* Depth reads through position: radius sets the bowl's fall-off, and
       screen Y separates the near (lower) rim from the far (upper) rim. */
    const bowl=lerp(p.edgeTone,p.innerTone,smooth(1-rn));
    const nearFar=clamp((p.cy-by)/(p.radius*p.squashY),-1,1);
    const bias=nearFar*p.farNearShade;

    /* Material diminishes across the inner fraction and is gone at the
       centre — no sharp pop, nothing drawn there to pop. */
    const coreFade=smooth(clamp(rn/Math.max(0.001,p.coreFade),0,1));
    const rim=p.edgeSoft>0?smooth(clamp((1-rn)/p.edgeSoft,0,1)):1;
    const presence=rim*coreFade;

    const spiral=bowl+bias+band*p.bandDepth*coreFade;
    tone=lerp(seaBase,spiral,presence);
    /* The quiet centre resolves to the drain's own tone, not to the sea. */
    tone=lerp(p.centreTone,tone,coreFade);
  }

  tone+=grain(bx*3.1,by*3.1)*p.grain;
  return clamp(tone,0,1);
}

/* ======================================================================
   PRIMITIVES
   ==================================================================== */
function fillTriangle(x0,y0,x1,y1,x2,y2,tone){
  const minY=Math.max(0,Math.floor(Math.min(y0,y1,y2)));
  const maxY=Math.min(H-1,Math.ceil(Math.max(y0,y1,y2)));
  for(let y=minY;y<=maxY;y++){
    const cy=y+0.5;
    const xs=[];
    const edges=[[x0,y0,x1,y1],[x1,y1,x2,y2],[x2,y2,x0,y0]];
    for(const [ax,ay,bx,by] of edges){
      if((ay<=cy&&by>cy)||(by<=cy&&ay>cy)){
        xs.push(ax+(cy-ay)/(by-ay)*(bx-ax));
      }
    }
    if(xs.length<2) continue;
    xs.sort((a,b)=>a-b);
    const xa=Math.max(0,xs[0]), xb=Math.min(W,xs[xs.length-1]);
    const i0=Math.floor(xa), i1=Math.ceil(xb)-1, o=y*W;
    for(let x=i0;x<=i1;x++) lum[o+x]=tone;
  }
}

function stampDisc(cx,cy,r,tone){
  const minX=Math.max(0,Math.floor(cx-r)), maxX=Math.min(W-1,Math.ceil(cx+r));
  const minY=Math.max(0,Math.floor(cy-r)), maxY=Math.min(H-1,Math.ceil(cy+r));
  for(let y=minY;y<=maxY;y++){
    const o=y*W;
    for(let x=minX;x<=maxX;x++){
      const dx=x+0.5-cx, dy=y+0.5-cy;
      const d=Math.sqrt(dx*dx+dy*dy);
      if(d<=r) lum[o+x]=tone;
    }
  }
}

function thickLine(x0,y0,x1,y1,width,tone){
  const len=Math.hypot(x1-x0,y1-y0);
  const steps=Math.max(1,Math.ceil(len/(width*0.5)));
  for(let i=0;i<=steps;i++){
    const t=i/steps;
    stampDisc(lerp(x0,x1,t),lerp(y0,y1,t),width*0.5,tone);
  }
}

/* ======================================================================
   SIGN + POLE — drawn last, untouched by the drain
   ==================================================================== */
function drawSign(t){
  const sg=CFG.sign, pl=CFG.pole;
  const sway=(pl.swayAmp*S)?Math.sin(t*pl.swaySpeed)*pl.swayAmp*(Math.PI/180):0;

  const poolTopY=CFG.pool.cy;
  const pivotX=sg.cx*S, pivotY=poolTopY*S;

  const rot=(x,y)=>{
    const dx=x-pivotX, dy=y-pivotY;
    const cs=Math.cos(sway), sn=Math.sin(sway);
    return [pivotX+dx*cs-dy*sn, pivotY+dx*sn+dy*cs];
  };

  const halfBase=sg.size*0.56*S, height=sg.size*S;
  const apex=[sg.cx*S, sg.topY*S];
  const baseL=[sg.cx*S-halfBase, sg.topY*S+height];
  const baseR=[sg.cx*S+halfBase, sg.topY*S+height];

  const [ax,ay]=rot(apex[0],apex[1]);
  const [blx,bly]=rot(baseL[0],baseL[1]);
  const [brx,bry]=rot(baseR[0],baseR[1]);
  const [px,py]=rot(sg.cx*S,pivotY);

  thickLine(px,py,blx*0.5+brx*0.5,bly,pl.width*S,pl.tone);

  fillTriangle(ax,ay,blx,bly,brx,bry,sg.tone);

  const inset=sg.stroke*S/height;
  const cxA=(ax+blx+brx)/3, cyA=(ay+bly+bry)/3;
  const iax=lerp(ax,cxA,inset*2.1), iay=lerp(ay,cyA,inset*2.1);
  const iblx=lerp(blx,cxA,inset*1.6), ibly=lerp(bly,cyA,inset*1.6);
  const ibrx=lerp(brx,cxA,inset*1.6), ibry=lerp(bry,cyA,inset*1.6);
  fillTriangle(iax,iay,iblx,ibly,ibrx,ibry,sg.faceTone);

  /* PICTOGRAM — a hand reaching upward, printed on the face. It is drawn
     with the sign, in sign coordinates, so a sway carries it along; it is
     never a separate object in the world and never becomes a real hand.
     Proportions are relative to the face height so the hand stays legible
     at every authoring grid, which a fixed pixel size would not. */
  const faceH=ibly-iay;
  const faceCX=(iax+iblx+ibrx)/3;
  const scale=sg.pictogramScale;

  const handH=faceH*scale;
  const wristY=iay+faceH*0.86;          // just above the face's lower edge
  const palmTopY=wristY-handH*0.42;
  const armW=Math.max(1.2,handH*0.17);

  thickLine(faceCX,wristY,faceCX,palmTopY,armW,sg.pictogramTone);

  /* Four fingers splayed off the palm. The outer pair lean further and end
     lower, which is what makes the shape read as a reaching hand rather
     than as a fork or an asterisk. */
  const fingerLen=handH*0.42;
  const fingerW=Math.max(1,armW*0.72);
  for(const [spread,rise] of [[-0.62,0.78],[-0.22,1],[0.22,1],[0.62,0.78]]){
    thickLine(faceCX,palmTopY,
              faceCX+fingerLen*spread,palmTopY-fingerLen*rise,
              fingerW,sg.pictogramTone);
  }
}

/* ======================================================================
   FRAME
   ==================================================================== */
function renderFrame(t){
  const time=t??elapsed;
  for(let y=0;y<H;y++){
    const by=y/S, o=y*W;
    for(let x=0;x<W;x++){
      const bx=x/S;
      lum[o+x]=fieldTone(bx,by,time);
    }
  }
  drawSign(time);
  dither();
}

function dither(){
  for(let y=0;y<H;y++){
    const row=(y&7)<<3, o=y*W;
    for(let x=0;x<W;x++){
      const i=o+x;
      const threshold=BAYER[row|(x&7)];
      buf32[i]=lum[i]*64>threshold+.5?CPAP:CINK;
    }
  }
  ctx.putImageData(img,0,0);
}

/* ======================================================================
   FIT / LOOP / HANDLE
   ==================================================================== */
const stage=document.getElementById('stage');
function fitCanvas(){
  const rect=stage.getBoundingClientRect();
  if(!rect.width||!rect.height) return;
  const scale=Math.min(rect.width/W,rect.height/H);
  cv.style.width=(W*scale)+'px';
  cv.style.height=(H*scale)+'px';
}

const playback=createPlaybackState();
function isPaused(){ return playback.isPaused(); }

let elapsed=0, last=0, driverActive=false, rafSeen=false;
function tick(now){
  if(isPaused()) return;
  fitCanvas();
  const n=(now===undefined)?performance.now():now;
  let dtr=(n-last)/1000; last=n;
  if(dtr>0.25) dtr=0.25;
  elapsed+=dtr;
  renderFrame(elapsed);
}
function rafLoop(now,generation){
  if(!playback.isCurrent(generation)) return;
  if(isPaused()){ driverActive=false; return; }
  rafSeen=true; tick(now); requestAnimationFrame(next=>rafLoop(next,generation));
}
function startDriver(){
  if(driverActive||isPaused()) return;
  driverActive=true; last=performance.now();
  const generation=playback.generation();
  requestAnimationFrame(now=>rafLoop(now,generation));
  setTimeout(()=>{ if(!rafSeen) setInterval(()=>tick(),16); },400);
}
addEventListener('message',e=>{
  const d=e.data;
  if(!d||d.type!=='blinking-robot:preview-pause') return;
  if(playback.setGalleryPaused(d.paused)) startDriver(); else driverActive=false;
});
addEventListener('resize',fitCanvas);
if(typeof ResizeObserver!=='undefined') new ResizeObserver(fitCanvas).observe(document.getElementById('stage'));

function rebuild(keepTime=true){
  if(!keepTime) elapsed=0;
  build();
  fitCanvas(); renderFrame(elapsed);
}
function png(){ const a=document.createElement('a'); a.download='cloud-drain-warning-sign-'+W+'x'+H+'.png'; a.href=cv.toDataURL('image/png'); a.click(); }

build();
fitCanvas(); renderFrame(elapsed);
const loadEl=document.getElementById('load');
if(loadEl) loadEl.remove();
startDriver();

window.__drain={ CFG:CFG,
  fit:fitCanvas, render:()=>renderFrame(elapsed),
  refresh(){const p=CFG.render||{dark:CFG.ink,light:CFG.paper};CINK=packColor(p.dark);CPAP=packColor(p.light);renderFrame(elapsed);},
  update:rebuild, rebuild, png,
  toggle:function(){
    const shouldRun=playback.toggleManual();
    if(shouldRun) startDriver(); else driverActive=false;
    return !shouldRun;
  },
  pause:function(){ playback.pauseManual(); driverActive=false; },
  play:function(){ if(playback.playManual()) startDriver(); },
  state:function(){ return { elapsed:+elapsed.toFixed(2) }; } };
})();
