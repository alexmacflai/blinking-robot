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
/* ---------- cloud material -------------------------------------------
   Value noise, three octaves. This is the CLOUD, and it is why the scene is
   not just a shaded spiral: a drain drawn as tonal rings has flow but no
   material, so it reads as a gradient. Cloud needs a lumpy silhouette, so
   the field is a DENSITY that gets thresholded into mass and gaps —
   hard-edged lobes, per the house rendering discipline — rather than a
   smooth ramp painted across the bowl. */
function hash2(ix,iy){
  let h=Math.imul(ix,374761393)+Math.imul(iy,668265263);
  h=Math.imul(h^(h>>>13),1274126177);
  return ((h^(h>>>16))>>>0)/4294967296;
}
function vnoise(x,y){
  const ix=Math.floor(x), iy=Math.floor(y);
  const fx=x-ix, fy=y-iy;
  const ux=fx*fx*(3-2*fx), uy=fy*fy*(3-2*fy);
  const a=hash2(ix,iy), b=hash2(ix+1,iy), c=hash2(ix,iy+1), d=hash2(ix+1,iy+1);
  return lerp(lerp(a,b,ux),lerp(c,d,ux),uy);
}
function fbm(x,y){
  return vnoise(x,y)*0.5+vnoise(x*2.03,y*2.03)*0.32+vnoise(x*4.07,y*4.07)*0.18;
}

/* ======================================================================
   CLOUD SEA + DRAIN — one continuous mass, warped by an inverse flow map
   ==================================================================== */
function fieldTone(bx,by,t){
  const p=CFG.pool, sea=CFG.sea;

  /* Above the horizon is sky; everything below it is one continuous cloud
     sea. The whirlpool is a depression INSIDE that sea, not an object
     floating in the air — the brief's "sea of clouds", not a cloud. */
  const horizon=sea.horizonY;
  if(by<horizon-sea.horizonSoft) return clamp(CFG.bg.tone+grain(bx,by)*CFG.bg.grain,0,1);

  const dx=bx-p.cx, dy=(by-p.cy)/Math.max(0.05,p.squashY);
  const r=Math.sqrt(dx*dx+dy*dy);
  const rn=r/p.radius;
  const angle=Math.atan2(dy,dx);

  /* INVERSE FLOW MAP. Instead of moving cloud shapes around, ask where the
     material at this point came from and sample the cloud there. Winding
     the source radius OUTWARD by exp(+drain*t) means what is here now was
     further out before, so material reads as travelling inward — and since
     a wide annulus is being squeezed onto a narrow one, the lobes genuinely
     SHRINK on the way in, which is what the brief asks for.

     Differential rotation supplies the spiral: the inner cloud turns faster
     than the outer cloud, so a lobe is sheared into an arm over time rather
     than a spiral being drawn as a pattern. */
  const swirl=clamp(rn,0.09,1);
  const omega=p.spin*(1+p.shear*(1/swirl-1));
  const rs=rn*Math.exp(p.drain*t);
  const as=angle-omega*t;

  /* Sample back in Cartesian so the noise stays continuous across the 2*pi
     seam; sampling on the angle directly leaves a hard radial join. */
  const sx=rs*Math.cos(as)*p.cloudScale;
  const sy=rs*Math.sin(as)*p.cloudScale;

  /* Outside the drain the sea is still cloud and still the SAME mass, so it
     is the same noise with the warp faded out — not a second field laid
     alongside, which would show as a seam at the rim. */
  const outside=smooth(clamp((rn-1)/Math.max(0.001,p.outerBlend),0,1));
  const fx=lerp(sx,dx/p.radius*p.cloudScale,outside);
  const fy=lerp(sy,dy/p.radius*p.cloudScale,outside);

  const density=fbm(fx+p.seed,fy-p.seed);

  /* The centre empties by RAISING the cutoff, not by fading tone: lobes
     shrink and run out of material, so there is no last shape left to pop
     and nothing drawn at the middle to catch the eye. */
  const coreFade=smooth(clamp(rn/Math.max(0.001,p.coreFade),0,1));
  const cutoff=lerp(1.2,p.cutoff,coreFade);
  const cover=smooth((density-cutoff)/Math.max(0.001,p.edgeSoft)+0.5);

  /* Depth is carried BY the cloud rather than painted over it: radius sets
     the bowl's fall-off into the drain, screen Y separates the near (lower)
     rim from the far (upper) rim. That is what keeps the twisting form
     legible in monochrome instead of flattening to one shade. */
  const bowl=lerp(p.edgeTone,p.innerTone,smooth(1-clamp(rn,0,1)));
  const nearFar=clamp((p.cy-by)/(p.radius*p.squashY),-1,1);
  const lit=clamp(bowl+nearFar*p.farNearShade,0,1);
  const seaLit=clamp(sea.tone+((by-horizon)/Math.max(1,BASE_H-horizon))*sea.depthShade,0,1);

  let tone=lerp(p.gapTone,lerp(lit,seaLit,outside),cover);
  tone+=grain(bx*3.1,by*3.1)*p.grain;

  /* Soften the sea into the sky across the horizon band, so the mass has a
     top edge without a drawn line. */
  if(by<horizon){
    const fade=smooth(clamp((horizon-by)/Math.max(1,sea.horizonSoft),0,1));
    tone=lerp(tone,CFG.bg.tone,fade);
  }
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
