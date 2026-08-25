(function(){
"use strict";

/* ========================================================================
   BLINKING ROBOT — coffee that never empties

   An espresso machine pours into a cup that is already full. The stream
   ripples the surface and pushes coffee over the rim; the spill runs down the
   cup, spreads on the tray, and leaves the frame. Then the pour stops, the
   surface settles, the cup is full and still again, and it starts over.

   RENDER PIPELINE — same discipline as the windmill postcard: compose the
   whole scene as CONTINUOUS luminance in a Float32 buffer, then threshold the
   finished composite once through an ordered Bayer 8x8 matrix. One dither pass
   means every surface is quantized on the same lattice and the frame reads as
   a single screen-print instead of a stack of pre-dithered parts. Luminance is
   the authoring space; the two-colour palette is applied only at the end.
   >= 1.0 is immune to the dither (solid paper), <= 0 is always ink.

   GEOMETRY is a symmetric dimetric projection — no perspective, no vanishing
   point. World +x runs right-and-down the frame, +y left-and-down, +z straight
   up. A horizontal circle therefore always projects to an ellipse of the same
   fixed ratio (ELL), which is what lets cup, rim, coffee, ripples and the tray
   pool all be drawn as plain ellipses and still agree about the ground plane.

   RESOLUTION INDEPENDENCE — every number in CFG is authored against a BASE
   234x416 grid and multiplied by S = W/234 at build time. Lengths, positions
   and velocities scale by S; rates (1/s) and unitless ratios must NOT be
   touched.
   ===================================================================== */

const BASE_W=234, BASE_H=416;

const DEFAULT_CFG=window.COFFEE_VALUES;
let CFG=DEFAULT_CFG;

/* ---------- helpers --------------------------------------------------- */
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
const lerp=(a,b,t)=>a+(b-a)*t;
function smooth(e0,e1,x){ const t=clamp((x-e0)/(e1-e0),0,1); return t*t*(3-2*t); }

/* A smooth luminance ramp thresholded through an ordered matrix produces long
   straight bands — on a curved form they read as streaks running down it, not
   as shading. A tiny deterministic jitter added to the TONE (never to the
   palette or the lattice) breaks the bands into grain. */
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
  return ((255<<24)|(b<<16)|(g<<8)|r)>>>0;   // little-endian AABBGGRR
}

/* ======================================================================
   DERIVED STATE — rebuilt by build()
   ==================================================================== */
let W,H,S;
let lum,accent,img,buf32,CINK,CMID,CPAP,CACC;
let EX,EY,OX,OY;            // projection, in grid pixels
let ELLX,ELLY;              // world radius -> ellipse radii
let CUPX,RIMY,BASEY,RTOP,RBOT,SURFY;
let SPOUTX,SPOUTY;
let TRAYTOP;                // projected y of the tray top at the cup axis

const cv=document.getElementById('c');
const ctx=cv.getContext('2d',{alpha:false});

/* World -> grid. z is up, so it subtracts. */
function px(x,y){ return OX+(x-y)*EX; }
function py(x,y,z){ return OY+(x+y)*EY-z; }

function build(){
  const K=CFG.gridK;
  W=9*K; H=16*K; S=W/BASE_W;

  cv.width=W; cv.height=H;
  img=ctx.createImageData(W,H);
  buf32=new Uint32Array(img.data.buffer);
  lum=new Float32Array(W*H); accent=new Float32Array(W*H);
  const palette=CFG.render||{paletteMode:'1-bit',dark:CFG.ink,middle:CFG.paper,light:CFG.paper,accent:CFG.paper};
  CINK=packColor(palette.dark); CMID=packColor(palette.middle); CPAP=packColor(palette.light); CACC=packColor(palette.accent);

  const p=CFG.proj;
  EX=p.ex*S; EY=p.ey*S; OX=p.ox*S; OY=p.oy*S;

  /* A horizontal circle of world radius r projects to an ellipse of these
     radii — derived from the projection itself, never guessed, so ground-plane
     ellipses and box faces cannot disagree about the same plane. */
  ELLX=Math.SQRT2*EX; ELLY=Math.SQRT2*EY;

  const c=CFG.cup;
  CUPX = px(c.wx,c.wy);
  RIMY = py(c.wx,c.wy,c.top);
  BASEY= py(c.wx,c.wy,c.base);
  TRAYTOP = py(c.wx,c.wy,CFG.tray.z1);
  RTOP = c.rTop*S; RBOT = c.rBot*S;
  SURFY = RIMY + 1.4*S;               // the coffee sits just under the rim

  const m=CFG.mach;
  SPOUTX = px(c.wx,c.wy);
  SPOUTY = py(c.wx,c.wy,m.spoutZ0);
}

/* ======================================================================
   PRIMITIVES — everything writes coverage-weighted luminance
   ==================================================================== */
function span(y,xa,xb,tone,alpha){
  if(y<0||y>=H||xb<=xa) return;
  if(xa<0)xa=0; if(xb>W)xb=W; if(xb<=xa) return;
  const o=y*W, i0=Math.floor(xa), i1=Math.ceil(xb)-1;
  for(let x=i0;x<=i1;x++){
    const cov=Math.min(x+1,xb)-Math.max(x,xa); if(cov<=0) continue;
    const a=alpha*cov, i=o+x;
    lum[i]+=(tone-lum[i])*a;
  }
}
function accentSpan(y,xa,xb,alpha=1){
  if(y<0||y>=H||xb<=xa) return;
  const o=y*W, i0=Math.max(0,Math.floor(xa)), i1=Math.min(W-1,Math.ceil(xb)-1);
  for(let x=i0;x<=i1;x++){
    const cov=Math.min(x+1,xb)-Math.max(x,xa);
    if(cov>0) accent[o+x]=Math.max(accent[o+x],alpha*cov);
  }
}
function accentEllipse(cx,cy,rx,ry,alpha=1){
  const y0=Math.max(0,Math.floor(cy-ry)),y1=Math.min(H-1,Math.ceil(cy+ry));
  for(let y=y0;y<=y1;y++){
    const u=(y+.5-cy)/ry;if(u<=-1||u>=1)continue;
    const dx=rx*Math.sqrt(1-u*u);accentSpan(y,cx-dx,cx+dx,alpha);
  }
}
/* Shaded variant: fn(x,y) -> tone, sampled at the pixel centre. */
function spanF(y,xa,xb,fn,alpha){
  if(y<0||y>=H||xb<=xa) return;
  if(xa<0)xa=0; if(xb>W)xb=W; if(xb<=xa) return;
  const o=y*W, i0=Math.floor(xa), i1=Math.ceil(xb)-1, cy=y+0.5;
  for(let x=i0;x<=i1;x++){
    const cov=Math.min(x+1,xb)-Math.max(x,xa); if(cov<=0) continue;
    const a=alpha*cov, i=o+x;
    lum[i]+=(fn(x+0.5,cy)-lum[i])*a;
  }
}

/* Simple polygon scanline. Works for the convex quads every box face is. */
function poly(pts,tone,alpha){
  if(alpha===undefined) alpha=1;
  let ymin=1e9,ymax=-1e9;
  for(const p of pts){ if(p[1]<ymin)ymin=p[1]; if(p[1]>ymax)ymax=p[1]; }
  const y0=Math.max(0,Math.floor(ymin)), y1=Math.min(H-1,Math.ceil(ymax));
  const xs=[];
  const shaded=typeof tone==='function';
  for(let y=y0;y<=y1;y++){
    const cy=y+0.5; xs.length=0;
    for(let i=0,n=pts.length;i<n;i++){
      const a=pts[i], b=pts[(i+1)%n];
      if((a[1]<=cy)===(b[1]<=cy)) continue;
      xs.push(a[0]+(cy-a[1])*(b[0]-a[0])/(b[1]-a[1]));
    }
    if(xs.length<2) continue;
    xs.sort((p,q)=>p-q);
    for(let i=0;i+1<xs.length;i+=2){
      if(shaded) spanF(y,xs[i],xs[i+1],tone,alpha);
      else span(y,xs[i],xs[i+1],tone,alpha);
    }
  }
}

function ellipse(cx,cy,rx,ry,tone,alpha){
  if(alpha===undefined) alpha=1;
  if(rx<=0||ry<=0) return;
  const shaded=typeof tone==='function';
  const y0=Math.max(0,Math.floor(cy-ry)), y1=Math.min(H-1,Math.ceil(cy+ry));
  for(let y=y0;y<=y1;y++){
    const u=(y+0.5-cy)/ry; if(u<=-1||u>=1) continue;
    const dx=rx*Math.sqrt(1-u*u);
    if(shaded) spanF(y,cx-dx,cx+dx,tone,alpha);
    else span(y,cx-dx,cx+dx,tone,alpha);
  }
}

/* Elliptical ring, drawn as the two side spans of the outer ellipse minus the
   inner one. Used for the rim band and the cup handle. */
function ring(cx,cy,rx,ry,rx2,ry2,tone,alpha){
  if(alpha===undefined) alpha=1;
  const y0=Math.max(0,Math.floor(cy-ry)), y1=Math.min(H-1,Math.ceil(cy+ry));
  for(let y=y0;y<=y1;y++){
    const u=(y+0.5-cy)/ry; if(u<=-1||u>=1) continue;
    const dx=rx*Math.sqrt(1-u*u);
    const v=(y+0.5-cy)/ry2;
    if(v>-1&&v<1){
      const dx2=rx2*Math.sqrt(1-v*v);
      span(y,cx-dx,cx-dx2,tone,alpha);
      span(y,cx+dx2,cx+dx,tone,alpha);
    }else{
      span(y,cx-dx,cx+dx,tone,alpha);
    }
  }
}

/* Capsule: a thick segment with round ends, shaded across its own normal so a
   cylinder reads as a cylinder rather than a flat bar. */
function capsule(ax,ay,bx,by,r,fn,alpha){
  if(alpha===undefined) alpha=1;
  const x0=Math.max(0,Math.floor(Math.min(ax,bx)-r-1));
  const x1=Math.min(W-1,Math.ceil(Math.max(ax,bx)+r+1));
  const y0=Math.max(0,Math.floor(Math.min(ay,by)-r-1));
  const y1=Math.min(H-1,Math.ceil(Math.max(ay,by)+r+1));
  const dx=bx-ax, dy=by-ay, L2=dx*dx+dy*dy||1;
  for(let y=y0;y<=y1;y++){
    const o=y*W, cy=y+0.5;
    for(let x=x0;x<=x1;x++){
      const cx=x+0.5;
      let t=((cx-ax)*dx+(cy-ay)*dy)/L2; t=clamp(t,0,1);
      const qx=cx-(ax+dx*t), qy=cy-(ay+dy*t);
      const d=Math.sqrt(qx*qx+qy*qy);
      const cov=clamp(r+0.5-d,0,1); if(cov<=0) continue;
      /* signed distance across the capsule, -1 (upper-left) .. 1 */
      const nrm=(qx*dy-qy*dx)/Math.sqrt(L2)/r;
      const i=o+x, a=alpha*cov;
      lum[i]+=(fn(clamp(nrm,-1,1),t)-lum[i])*a;
    }
  }
}

/* ======================================================================
   BOXES — three visible faces, back-to-front is implicit
   ==================================================================== */
function box(x0,x1,y0,y1,z0,z1,tones){
  const T=tones||CFG.tone;
  const P=(x,y,z)=>[px(x,y),py(x,y,z)];
  /* +y face (front-left, lit) */
  poly([P(x0,y1,z1),P(x1,y1,z1),P(x1,y1,z0),P(x0,y1,z0)],T.left);
  /* +x face (right, shaded) */
  poly([P(x1,y0,z1),P(x1,y1,z1),P(x1,y1,z0),P(x1,y0,z0)],T.right);
  /* top */
  poly([P(x0,y0,z1),P(x1,y0,z1),P(x1,y1,z1),P(x0,y1,z1)],T.top);
  /* the vertical corner where the two side faces meet needs a stroke: they are
     different tones, but at this resolution the seam still closes up unless it
     is drawn */
  const a=P(x1,y1,z1), b=P(x1,y1,z0);
  capsule(a[0],a[1],b[0],b[1],0.6,()=>CFG.tone.edge);
}

/* Vertical cylinder seen from above: the side wall plus its top ellipse. */
function cylinder(wx,wy,r,z0,z1,shade){
  const cx=px(wx,wy), cyTop=py(wx,wy,z1), cyBot=py(wx,wy,z0);
  const RX=r*ELLX, ry=r*ELLY;
  /* side wall: the lower half of the top ellipse swept down to the bottom one */
  for(let y=Math.floor(cyTop);y<=Math.ceil(cyBot+ry);y++){
    const dyT=(y+0.5-cyTop)/ry, dyB=(y+0.5-cyBot)/ry;
    let half=RX;
    if(dyB>0){ if(dyB>=1) continue; half=RX*Math.sqrt(1-dyB*dyB); }
    else if(dyT<0){ if(dyT<=-1) continue; half=RX*Math.sqrt(1-dyT*dyT); }
    spanF(y,cx-half,cx+half,(x)=>shade((x-cx)/RX),1);
  }
  ellipse(cx,cyTop,RX,ry,CFG.tone.top,1);
  return {cx:cx,rx:RX,ry:ry,top:cyTop,bot:cyBot};
}

/* Shading law shared by every round vertical form: lit from the upper left,
   with a bright edge on the lit side and a dark terminator on the right. */
function roundShade(n){
  const t=clamp((n+1)/2,0,1);
  return 0.98-0.86*t*t;
}

/* The cup gets its own law: solid across most of its width, with the fall-off
   pushed into the last third. A full round gradient dithers into vertical
   bands, and the overflow running down the cup is ALSO vertical bands — the
   two become the same mark and the cup just reads as striped. Keeping the body
   a flat mass leaves the stripes to mean one thing only: coffee. */
function cupShade(n){
  const t=smooth(0.18,1.0,n);
  return 1.0-0.94*t*t;
}

/* ======================================================================
   CYCLE STATE
   ==================================================================== */
let t=0;
let waveAmp=0;            // ripple amplitude, 0..1
let wavePhase=0;
let spills=[];            // rivulets down the outside of the cup
let pool=0;               // radius of the spill pool on the tray, world units
let drips=[];             // drops falling off the tray, out of frame
let drops=[];             // residual drops from the spout after the pour stops
let lastDrip=0, lastDrop=0;

function resetCycle(){
  spills=[];
  const n=CFG.spill.n;
  for(let i=0;i<n;i++){
    /* Rivulets sit on the FRONT arc of the rim only. On the back arc they
       would run down a face the camera cannot see and read as nothing. */
    const u=(i+0.5)/n-0.5;
    spills.push({ ang:Math.PI/2+u*Math.PI*CFG.spill.spread,
                  t0:CFG.spill.start+i*CFG.spill.stagger*(i%2?1:0.6),
                  head:0, tail:0, v:CFG.spill.speed*(0.85+0.3*((i*7)%5)/5) });
  }
  drops=[]; lastDrop=0;
}
resetCycle();

/* phase within one cycle, and the pour envelope */
function phase(){ return t%CFG.cyc.period; }
function pourAmount(){
  const p=phase(), c=CFG.cyc;
  if(p>c.pour) return 0;
  return smooth(0,c.onRamp,p);
}

function step(dt){
  const c=CFG.cyc, w=CFG.wave, s=CFG.spill;
  const prev=phase();
  t+=dt;
  const p=phase();
  if(p<prev) resetCycle();          // wrapped: a fresh, clean cup

  /* Ripples answer to the stream LANDING, not to the pour starting: the tip
     needs its fall time first, or the surface reacts to nothing. */
  const pouring=pourAmount()>0.01 && p>=c.onRamp*0.85 && p<=c.pour;

  /* Ripples: driven up while the stream lands, then decaying. The phase keeps
     advancing either way so rings keep travelling outward as they die. */
  wavePhase+=w.w*dt;
  const target=pouring?1:0;
  const rate=pouring?w.rise:w.fall;
  waveAmp+=(target-waveAmp)*clamp(rate*dt,0,1);

  /* Rivulets. The head runs down the outside while the pour is on; once it
     stops, the streak dries from the top down, which is what returns the cup
     to a clean, still state before the cycle repeats. */
  const runLen=(BASEY+RBOT*ELLY)-RIMY;
  for(const sp of spills){
    if(p>=sp.t0 && p<=c.pour) sp.head=Math.min(runLen,sp.head+sp.v*S*dt);
    if(p>c.pour+s.dryDelay){
      sp.tail=Math.min(sp.head,sp.tail+s.drySpeed*S*dt);
    }
  }
  /* Pool on the tray: fed while any rivulet has reached the bottom of the cup,
     draining off the tray the rest of the time. */
  let feeding=false;
  for(const sp of spills) if(sp.head>=runLen*0.98 && sp.tail<sp.head) feeding=true;
  pool += (feeding? s.poolGrow : -s.poolDrain)*dt;
  pool = clamp(pool,0,s.poolMax);

  /* Drips off the tray's front edge — the spill leaving the frame rather than
     becoming a second subject. */
  if(pool>CFG.tray.y1*0.16 && t-lastDrip>s.dripEvery){
    lastDrip=t;
    const u=0.25+0.5*((drips.length*13)%7)/7;
    const wx=lerp(CFG.tray.x0,CFG.tray.x1,u), wy=CFG.tray.y1;
    drips.push({x:px(wx,wy), y:py(wx,wy,0), v:0, len:2.2*S});
  }
  for(const d of drips){ d.v+=CFG.spill.dripSpeed*S*dt; d.y+=d.v*dt; d.len+=6*S*dt; }
  drips=drips.filter(d=>d.y-d.len<H);

  /* Residual drops after the stream breaks. */
  const off=p-c.pour;
  if(off>c.breakDur && off<c.breakDur+c.dropEvery*c.dropN && t-lastDrop>c.dropEvery){
    lastDrop=t; drops.push({y:SPOUTY,v:0,r:0.9*S});
  }
  for(const d of drops){ d.v+=190*S*dt; d.y+=d.v*dt; }
  drops=drops.filter(d=>d.y<SURFY);
}

/* ======================================================================
   SCENE
   ==================================================================== */
function drawTray(){
  const T=CFG.tray, P=(x,y,z)=>[px(x,y),py(x,y,z)];
  box(T.x0,T.x1,T.y0,T.y1,T.z0,T.z1);
  /* Drain slots, an axo lattice on the top face. They are the only fine detail
     in the frame, and they earn it: they establish the ground plane the cup,
     the pool and the ripples all share. */
  for(let x=T.x0+T.lipInset;x<=T.x1-T.lipInset-T.slotW;x+=T.slotX){
    for(let y=T.y0+T.lipInset;y<=T.y1-T.lipInset-T.slotH;y+=T.slotY){
      poly([P(x,y,T.z1),P(x+T.slotW,y,T.z1),P(x+T.slotW,y+T.slotH,T.z1),
            P(x,y+T.slotH,T.z1)],0.18);
    }
  }
}

function drawPool(){
  if(pool<=0.5) return;
  const c=CFG.cup;
  const cx=px(c.wx,c.wy), cy=py(c.wx,c.wy,CFG.tray.z1);
  /* Irregular by construction: two offset ellipses read as spread liquid, a
     single one reads as a drawn disc. */
  ellipse(cx,cy,pool*ELLX,pool*ELLY,CFG.tone.spill,1);
  ellipse(cx-pool*0.45*ELLX,cy+pool*0.42*ELLY,pool*0.72*ELLX,pool*0.66*ELLY,CFG.tone.spill,1);
  ellipse(cx+pool*0.30*ELLX,cy+pool*0.30*ELLY,pool*0.55*ELLX,pool*0.52*ELLY,CFG.tone.spill,1);
  /* wet edge */
  ring(cx,cy,pool*ELLX,pool*ELLY,pool*ELLX-0.9*S,pool*ELLY-0.9*S,0.42,0.7);
}

function cupHalf(y){
  /* Half-width of the cup silhouette at grid row y. Above the rim centre it is
     the rim ellipse; below the base centre the base ellipse; between, a
     slightly bellied taper. */
  const rimRy=RTOP*ELLY, baseRy=RBOT*ELLY;
  if(y<RIMY){
    const u=(y-RIMY)/rimRy; if(u<=-1) return -1;
    return RTOP*ELLX*Math.sqrt(1-u*u);
  }
  if(y>BASEY){
    const u=(y-BASEY)/baseRy; if(u>=1) return -1;
    return RBOT*ELLX*Math.sqrt(1-u*u);
  }
  const p=(y-RIMY)/(BASEY-RIMY);
  const k=p+CFG.cup.belly*p*(1-p);
  return lerp(RTOP,RBOT,k)*ELLX;
}

function drawCup(){
  const c=CFG.cup;
  const rimRy=RTOP*ELLY, baseRy=RBOT*ELLY;
  const y0=Math.floor(RIMY-rimRy), y1=Math.ceil(BASEY+baseRy);
  /* Outside of the cup, shaded round. Drawn as one silhouette so the rim,
     wall and base cap cannot separate along a seam. */
  for(let y=y0;y<=y1;y++){
    const h=cupHalf(y+0.5); if(h<=0) continue;
    spanF(y,CUPX-h,CUPX+h,(x,yy)=>{
      const n=(x-CUPX)/h;
      return cupShade(n)+grain(x,yy)*0.03;
    },1);
    /* The shaded side of the cup sits against a background of the same value,
       so the silhouette needs a lighter stroke or the cup loses its edge. */
    span(y,CUPX+h-1.0*S,CUPX+h,0.62,0.9);
  }
  /* Handle: a ring on the shaded side, drawn after the body so it reads as
     attached rather than embedded. */
  const hx=CUPX+RTOP*ELLX*0.82, hy=lerp(RIMY,BASEY,0.42);
  const hr=c.handleR*S, ht=c.handleT*S;
  ring(hx,hy,hr,hr*1.05,hr-ht,hr*1.05-ht,0.52,1);
  ring(hx,hy,hr,hr*1.05,hr-0.8*S,hr*1.05-0.8*S,0.92,0.8);
}

function drawInside(){
  /* Inner wall, then the coffee just below it. The cup is FULL: the gap
     between the two is a single dark line, not a well. */
  const irx=RTOP*ELLX-CFG.cup.wall*S, iry=RTOP*ELLY-CFG.cup.wall*S*ELLY/ELLX;
  ellipse(CUPX,RIMY,irx,iry,CFG.tone.wall,1);
  const srx=irx*0.985, sry=iry*0.985;
  ellipse(CUPX,SURFY,srx,sry,(x,y)=>surfaceTone(x,y,srx,sry),1);
  accentEllipse(CUPX,SURFY,srx,sry,.78);
  /* Meniscus: coffee climbing the wall keeps the full read at the rim. */
  ring(CUPX,SURFY,srx,sry,srx-0.9*S,sry-0.9*S,0.34,0.55);
  /* The rim itself, drawn as a solid line all the way round. It is the single
     most load-bearing edge in the frame: the coffee and the background are the
     same value, and this is what says the cup is full to the top rather than
     open onto nothing. */
  ring(CUPX,RIMY,irx+1.1*S,iry+1.1*S*ELLY/ELLX,irx,iry,1.0,1);
}

/* Radial ripple field. The amplitude envelope is animated; the shading is the
   wave's SLOPE, not its height, because a 1-bit surface can only show a
   gradient as where the light catches it. */
function surfaceTone(x,y,rx,ry){
  const dx=(x-CUPX)/rx, dy=(y-SURFY)/ry;
  const r=Math.sqrt(dx*dx+dy*dy)*RTOP;
  const w=CFG.wave;
  const env=waveAmp*Math.exp(-r/(w.decay*0.5+1e-6));
  const slope=Math.cos(w.k*r-wavePhase)*env;
  /* A ring only catches light on the face turned toward the light: the near
     side of each crest. */
  const lit=clamp(slope,0,1);
  return CFG.tone.coffee + w.gain*lit*lit;
}

function drawStream(){
  const c=CFG.cyc, p=phase();
  const amt=pourAmount();
  let top=SPOUTY, bot=SURFY;
  if(p>c.pour){
    /* The stream breaks at the spout and the tail keeps falling, so the last
       thing seen is a length of coffee in mid-air with nothing feeding it. */
    const k=clamp((p-c.pour)/c.breakDur,0,1);
    top=lerp(SPOUTY,SURFY,k*k);
    if(k>=1) return;
  }else if(amt<=0.01){
    return;
  }else{
    /* Leaving the head at the surface would make the pour switch on as a
       finished column. It falls: the tip travels from the spout down to the
       coffee, and only then does anything happen to the surface. */
    bot=lerp(SPOUTY,SURFY,smooth(0,c.onRamp*0.85,p));
  }
  const st=CFG.strm;
  const wTop=st.wTop*S*(0.65+0.35*amt), wBot=st.wBot*S;
  const y0=Math.floor(top), y1=Math.ceil(bot);
  for(let y=y0;y<=y1;y++){
    const u=clamp((y-SPOUTY)/(SURFY-SPOUTY),0,1);
    const wid=lerp(wTop,wBot,u);
    /* A slight wander keeps the stream from reading as a ruled line. */
    const x=SPOUTX + Math.sin(u*7.0+t*5.2)*st.wander*S*u;
    spanF(y,x-wid,x+wid,(sx)=>{
      const n=(sx-x)/wid;
      return 1.0-0.62*n*n*n*n;
    },1);
    accentSpan(y,x-wid,x+wid,.78);
  }
  /* Where it lands: a small bright collar, the only place the coffee is lit
     from inside. */
  if(p<=c.pour && bot>=SURFY-0.5){
    ellipse(SPOUTX,SURFY,3.4*S,1.5*S,0.85,0.8*amt);
    ellipse(SPOUTX,SURFY,1.6*S,0.8*S,1.0,amt);
  }
}

function drawDrops(){
  for(const d of drops){
    ellipse(SPOUTX,d.y,d.r,d.r*1.7,0.95,1);
  }
}

function drawSpill(){
  const runLen=(BASEY+RBOT*ELLY)-RIMY;
  for(const sp of spills){
    if(sp.head<=sp.tail) continue;
    const nx=Math.cos(sp.ang);          // -1..1 across the visible front arc
    const yTop=RIMY+sp.tail, yBot=RIMY+sp.head;
    for(let y=Math.floor(yTop);y<=Math.ceil(yBot);y++){
      const h=cupHalf(y+0.5); if(h<=0) continue;
      /* The rivulet clings to the wall, so its x follows the taper rather
         than falling straight. */
      const x=CUPX+nx*h*0.92;
      const wid=CFG.spill.w*S*(0.7+0.3*(1-(y-yTop)/Math.max(1,yBot-yTop)));
      span(y,x-wid,x+wid,CFG.tone.spill,1);
      accentSpan(y,x-wid,x+wid,.78);
      span(y,x-wid-0.7*S,x-wid,0.55,0.5);   // wet highlight on the lit side
    }
    /* pendant drop at the head while it is still running */
    if(sp.head<runLen*0.99){
      const y=RIMY+sp.head, h=cupHalf(y);
      if(h>0) ellipse(CUPX+nx*h*0.92,y,1.1*S,1.5*S,CFG.tone.spill,1);
    }
  }
  /* The crest: a continuous band of coffee lying over the front of the rim.
     Without it the rivulets start out of nowhere below a clean bright rim, and
     the cup reads as striped rather than as overflowing. This is the moment
     the postcard is about, so it is drawn as one connected thing. */
  const amt=pourAmount(), p=phase();
  let over=0;
  for(const sp of spills) if(p>=sp.t0) over=Math.max(over,smooth(0,0.5,p-sp.t0));
  over*=amt;
  if(over>0.01){
    const a0=Math.PI/2-Math.PI*CFG.spill.spread/2-0.25;
    const a1=Math.PI/2+Math.PI*CFG.spill.spread/2+0.25;
    const rx=RTOP*ELLX, ry=RTOP*ELLY;
    for(let a=a0;a<=a1;a+=0.05){
      const x=CUPX+Math.cos(a)*rx, y=SURFY+Math.sin(a)*ry;
      /* thicker in the middle of the front arc, thinning to nothing at the
         sides, so the band has a shape instead of a cut end */
      const k=1-Math.abs((a-Math.PI/2)/((a1-a0)/2));
      ellipse(x,y,(1.0+1.7*k)*S*over,(0.8+1.2*k)*S*over,CFG.tone.spill,1);
      accentEllipse(x,y,(1.0+1.7*k)*S*over,(0.8+1.2*k)*S*over,.78);
    }
  }
}

/* Coffee is dark ON a surface and bright IN the air. That is not a lighting
   model, it is a legibility rule the whole postcard obeys: the stream, the
   residual drops and these drips all fall against the dark background, and
   drawn in the spill's own value they would simply not exist. */
function drawDrips(){
  for(const d of drips){
    const y0=Math.max(0,d.y-d.len);
    for(let y=Math.floor(y0);y<=Math.ceil(d.y);y++){
      const u=(y-y0)/Math.max(1,d.y-y0);
      span(y,d.x-0.55*S,d.x+0.55*S,0.35+0.6*u,1);
    }
    ellipse(d.x,d.y,1.0*S,1.5*S,0.98,1);
  }
}

function drawMachine(){
  const m=CFG.mach;
  box(m.bx0,m.bx1,m.by0,m.by1,m.bz0,m.bz1);
  /* group head, portafilter collar, spout — three stacked cylinders on the
     cup's own axis, which is what makes the pour land where it must */
  cylinder(CFG.cup.wx,CFG.cup.wy,m.headR,m.headZ0,m.headZ1,roundShade);
  cylinder(CFG.cup.wx,CFG.cup.wy,m.collarR,m.collarZ0,m.collarZ1,roundShade);
  cylinder(CFG.cup.wx,CFG.cup.wy,m.spoutR,m.spoutZ0,m.spoutZ1,roundShade);
  /* the handle: one long capsule out to the left, with a rounded end. It is
     the only diagonal in a frame of verticals and ellipses, and it is what
     tells you this is a machine somebody uses. */
  const A=m.handA,B=m.handB;
  const ax=px(A[0],A[1]), ay=py(A[0],A[1],A[2]);
  const bx=px(B[0],B[1]), by=py(B[0],B[1],B[2]);
  capsule(ax,ay,bx,by,m.handR*S,(n)=>roundShade(n));
  capsule(bx,by,bx,by,m.handCap*S*0.5,(n)=>roundShade(n)*0.9+0.06);
}

/* ======================================================================
   DITHER + BLIT
   ==================================================================== */
function dither(){
  const palette=CFG.render||{paletteMode:'1-bit'};
  for(let y=0;y<H;y++){
    const row=(y&7)<<3, o=y*W;
    for(let x=0;x<W;x++){
      const i=o+x;
      const threshold=BAYER[row|(x&7)];
      let colour;
      if(palette.paletteMode==='2-bit'){
        const scaled=clamp(lum[i],0,1)*2,base=Math.floor(scaled),fraction=scaled-base;
        colour=[CINK,CMID,CPAP][Math.min(2,base+(fraction*64>threshold+.5?1:0))];
      }else colour=lum[i]*64>threshold+.5?CPAP:CINK;
      if(palette.paletteMode==='2-bit'&&accent[i]*64>threshold) colour=CACC;
      buf32[i]=colour;
    }
  }
  ctx.putImageData(img,0,0);
}

/* ======================================================================
   FRAME — strictly back to front
   ==================================================================== */
function renderFrame(){
  lum.fill(0);
  accent.fill(0);
  drawMachine();      // behind and above everything
  drawTray();
  drawPool();         // spill spreads on the tray, under the cup's silhouette
  drawDrips();
  drawCup();          // outside of the cup, including the whole rim band
  drawInside();       // inner wall + coffee, punched into the silhouette
  drawStream();       // lands on the coffee, in front of the far rim
  drawDrops();
  drawSpill();        // over the rim and down the front — nearest surface
  dither();
}

/* ======================================================================
   DRIVER
   ==================================================================== */
const DT=1/60;
let acc=0,last=0,galleryPaused=false,manualPaused=false,driverActive=false,rafSeen=false;
const loadEl=document.getElementById('load');

/* Warm up off-screen so the first visible frame is a still, full cup rather
   than the middle of whatever the clock happened to start on. */
function warmup(){ for(let i=0;i<120;i++) step(DT); }

function fitCanvas(){
  const st=document.getElementById('stage');
  const availW=st.clientWidth, availH=st.clientHeight;
  let w,h;
  if(CFG.fit==='crisp'){
    const cell=Math.max(1,Math.floor(Math.min(availW/W, availH/H)));
    w=W*cell; h=H*cell;
  }else{
    h=Math.floor(Math.min(availH, availW*16/9));
    h-=h%16; if(h<16) h=16;
    w=h*9/16;
  }
  cv.style.width=w+'px'; cv.style.height=h+'px';
}

function tick(now){
  if(galleryPaused) return;
  const n=(now===undefined)?performance.now():now;
  let dtr=(n-last)/1000; last=n;
  if(dtr>0.25) dtr=0.25;
  if(!manualPaused){ acc+=dtr; while(acc>=DT){ step(DT); acc-=DT; } }
  renderFrame();
}
function rafLoop(now){
  if(galleryPaused){ driverActive=false; return; }
  rafSeen=true; tick(now); requestAnimationFrame(rafLoop);
}
function startDriver(){
  if(driverActive||galleryPaused) return;
  driverActive=true; last=performance.now();
  requestAnimationFrame(rafLoop);
  setTimeout(()=>{ if(!rafSeen) setInterval(()=>tick(),16); },400);
}
addEventListener('message',e=>{
  const d=e.data;
  if(!d||d.type!=='blinking-robot:preview-pause') return;
  galleryPaused=Boolean(d.paused);
  if(!galleryPaused) startDriver();
});
addEventListener('resize',fitCanvas);


/* ======================================================================
   REBUILD — every control writes CFG and comes back through here, so a
   control can never leave a derived value stale.
   ==================================================================== */
function rebuild(keepTime){
  const t0=keepTime?t:0;
  build();
  t=t0;
  if(!keepTime){ waveAmp=0; wavePhase=0; pool=0; drips=[]; drops=[]; resetCycle(); warmup(); }
  fitCanvas(); renderFrame();
}


function boot(){build();t=0;resetCycle();warmup();fitCanvas();renderFrame();if(loadEl)loadEl.remove();startDriver();}
window.__coffee={CFG,rebuild,fit:fitCanvas,render:renderFrame,refresh(){const p=CFG.render||{dark:CFG.ink,middle:CFG.paper,light:CFG.paper,accent:CFG.paper};CINK=packColor(p.dark);CMID=packColor(p.middle);CPAP=packColor(p.light);CACC=packColor(p.accent);renderFrame();},boot,png(){const a=document.createElement('a');a.download='coffee-'+W+'x'+H+'.png';a.href=cv.toDataURL('image/png');a.click();},seek(sec){manualPaused=true;t=0;waveAmp=0;wavePhase=0;pool=0;drips=[];drops=[];resetCycle();for(let i=0;i<Math.round(sec*60);i++)step(DT);renderFrame();},toggle(){manualPaused=!manualPaused;return manualPaused;}};
})();
