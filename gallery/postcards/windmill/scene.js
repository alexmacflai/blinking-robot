export function createWindmillScene({canvas,stage,hud=null,loadEl=null,config}){
if(!canvas||!stage||!config)throw new Error('Windmill needs canvas, stage, and values.');
"use strict";

/* ========================================================================
   BLINKING ROBOT — procedural 1-bit windmill
   No assets, no sprites, no images. Everything below is generated.

   RENDER PIPELINE
     1. compose the scene as CONTINUOUS luminance in a Float32 buffer
     2. threshold the whole composite through an ordered Bayer 8x8 matrix
   One dither pass over the finished composite, so every layer is quantized on
   the same lattice and the frame reads as a single screen-print rather than a
   stack of pre-dithered sprites. Each pixel also carries a lattice x-offset so
   a scrolling layer drags its dither texture along with it instead of letting
   the image "swim" underneath a screen-locked grid.

   Luminance is the authoring space; the palette is only applied at the very
   end. Anything >= 1.0 is immune to the dither (the Bayer threshold tops out
   just under 1), which is how the sun disc and the star's head stay solid
   while everything around them stipples. Anything <= 0 is always ink.

   DEPTH — four cloud layers, all running downwind, speed set by distance:
     L4 far bank -> L3 mid bank -> L2 PARTICLE DECK -> L1 near bank
   L1 is nearly solid and crosses the bottom IN FRONT of the mill and sails.

   GEOMETRY IS RESOLUTION-INDEPENDENT. Everything in CFG is authored against a
   BASE 234x416 grid and multiplied by S = W/234 at build time. Lengths and
   positions scale by S; velocities and accelerations by S; rate constants
   (1/s) and spring constants (1/s^2) are scale-invariant and must NOT be
   touched; spatial frequencies divide by S; particle count scales by S^2.
   ===================================================================== */

/* ======================================================================
   CFG — every tunable, in BASE units. This is the whole editing surface.
   ==================================================================== */
const clone=value=>JSON.parse(JSON.stringify(value));
let DEFAULT_CFG=clone(config);
let CFG=clone(config);

const BASE_W = 234, BASE_H = 416;      // 9:16 authoring grid (26 x 9x16)
const GRID_CHOICES = [11,13,16,20,26,32,40,48];
const FIT_CHOICES  = ['fill','crisp'];
const DT = 1/60;

/* ---------- helpers --------------------------------------------------- */
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;
  var t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;
  return((t^t>>>14)>>>0)/4294967296}}
const clamp=(v,a,b)=>v<a?a:v>b?b:v;

const SN=2048, SMASK=SN-1, STAB=new Float32Array(SN);
for(let i=0;i<SN;i++) STAB[i]=Math.sin(i*2*Math.PI/SN);
const K_S=SN/(2*Math.PI);
function fsin(x){ return STAB[(x*K_S|0)&SMASK]; }

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
   DERIVED STATE — everything below is rebuilt by build()
   ==================================================================== */
let W,H,S;
let bg,lum,dof,dens,bankA,pCol,iSCol;
let CINK,CPAP,img,buf32;
let SUN,HUB,TOWER_X,MILL;
let LA,LW,HW,INNER,CU,SLIT,FOC,YAW,CY_,SY_,OMEGA,ANG0;
let BANKS,FLOCKS;
let EMIT_TOP,EMIT_BOT,EMIT_TONE,EMIT_SPEED,EMIT_X0,EMIT_ROW,EMIT_COL,EMIT_PAD,EMIT_RATE;
let eX,eY,eVX,eVY,eLife,eVis,eMax,eN=0,eSpawnAcc=0,eRevealed=0,eLit=0,EMIT_OFF=false;
let VW;
let SS,SS_RND;

/* Depth index of each layer, back(0) -> front(3). The cloud deck is 2. */
const BANK_DEPTH=[0,1,3], DECK_DEPTH=2;
function layerSpeed(i){
  const a=Math.max(0.2,CFG.speedMin), b=Math.max(a,CFG.speedMax);
  return a*Math.pow(b/a, i/3);
}
function windSign(){ return CFG.wind<0?-1:1; }
/* Tone follows the same depth ladder as speed. Aerial perspective is roughly
   linear mixing toward the sky, so a straight ramp from the back tone to the
   front one keeps the four layers reading in depth order by construction. */
function layerTone(i){ return CFG.toneBack+(CFG.toneFront-CFG.toneBack)*(i/3); }

const cv=canvas;
const ctx=cv.getContext('2d',{alpha:false});

/* ======================================================================
   BUILD
   ==================================================================== */
function build(){
  const K=CFG.gridK;
  W=9*K; H=16*K; S=W/BASE_W;
  const gy = v => (v-CFG.lift)*S;          // base y -> grid y, lift applied
  const gl = v => v*S;                     // base length -> grid length

  cv.width=W; cv.height=H;
  img=ctx.createImageData(W,H);
  buf32=new Uint32Array(img.data.buffer);
  bg=new Float32Array(W*H); lum=new Float32Array(W*H);
  dof=new Int16Array(W*H); dens=new Float32Array(W*H); bankA=new Float32Array(W*H);
  pCol=new Float32Array(W); iSCol=new Float32Array(W);

  CINK=packColor(CFG.ink); CPAP=packColor(CFG.paper);

  SUN={x:gl(CFG.sun.x), y:gy(CFG.sun.y), r:gl(CFG.sun.r)};

  const m=CFG.mill;
  const my = v => gy(v+m.offY);          // mill y, carries the rotor with it
  TOWER_X=gl(m.towerX);
  HUB={x:TOWER_X+gl(5), y:my(232)};

  const R=CFG.rotor;
  LA=gl(R.len); LW=gl(R.wide); HW=LW/2; INNER=gl(R.inner);
  CU=gl(R.slitPitch); SLIT=Math.max(1,gl(R.slit)); FOC=gl(R.focal);
  YAW=R.yawDeg*Math.PI/180; CY_=Math.cos(YAW); SY_=Math.sin(YAW);
  OMEGA=-2*Math.PI*R.spin; ANG0=R.phase;      // signed: negative spin reverses

  MILL={ capTop:my(m.capTop), capCy:my(m.capCy), capRx:gl(m.capRx), capRy:gl(m.capRy),
         bodyBot:my(m.bodyBot), halfAtCy:gl(m.halfAtCy), taper:m.taper,
         galY:my(m.galleryY), galH:gl(m.galleryH), galOut:gl(m.galleryOut),
         hillTop:my(m.hillTop), hillHalf:gl(m.hillHalf), hillSlope:m.hillSlope,
         finialTop:my(m.finialTop),
         windows:m.windows.map(w=>({y0:my(w.y0),y1:my(w.y1),hw:gl(w.hw)})) };

  BANKS=CFG.banks.map((b,i)=>{
    const y0=gy(b.y+b.offY);
    const common={id:b.id, Wp:gl(b.tile),
                  val:layerTone(BANK_DEPTH[i])+(b.toneBias||0),
                  speed:gl(layerSpeed(BANK_DEPTH[i]))*CFG.wind};
    return b.kind==='puff'
      ? makePuff(common, b.seed, y0, b.clusters, b.per, b.rx.map(gl), b.ry.map(gl))
      : makeSea (common, b.seed, y0, gl(b.soft), b.lobes,
                 b.rx.map(gl), b.ry.map(gl),
                 b.floorUp!=null?gy(b.y+b.offY-b.floorUp):0);
  });

  buildFlocks(gy,gl);
  buildDeck(gy,gl);
  buildEmit();
  buildStar();
  buildBG();
}

/* ---------- sky + sun (static) ---------------------------------------- */
function buildBG(){
  const sk=CFG.sky, su=CFG.sun;
  const d1=su.d1*S, d2=su.d2*S;
  const span=sk.horizon-sk.top;
  for(let y=0;y<H;y++){
    // the ramp is evaluated in BASE space so it rides lift and rescales cleanly
    const base = sk.top + span*Math.pow((y/S+CFG.lift)/BASE_H, sk.curve);
    for(let x=0;x<W;x++){
      const dx=x-SUN.x, dy=y-SUN.y;
      const d=Math.sqrt(dx*dx+dy*dy);
      let v = base + Math.exp(-d/d1)*su.g1 + Math.exp(-d/d2)*su.g2;
      if(d<=SUN.r) v = 1.30;
      bg[y*W+x]=v;
    }
  }
}

/* ======================================================================
   CLOUD BANKS  (density fields, not particles)
     PUFF — clusters of soft ellipses max-composited into a cumulus
            silhouette, rounded on every side, for open sky.
     SEA  — a lobed upper surface filling to the bottom of the frame.
   `floor` keeps a sea continuous at that height while its lobes billow above.
   Without it you must pack lobes tightly to avoid gaps, and tightly packed
   lobes make the min() nearly constant — which is how a cloud sea ends up
   looking like a ruled line. Few big lobes + a floor gives real swell.
   ==================================================================== */
function makePuff(c, seed, y0, nClust, per, rxR, ryR){
  const rnd=mulberry32(seed), lobes=[];
  let mnY=1e9, mxY=-1e9;
  for(let k=0;k<nClust;k++){
    const ccx=(k+0.15+rnd()*0.7)*(c.Wp/nClust);
    const n=per+((rnd()*2)|0);
    for(let i=0;i<n;i++){
      const r0=rxR[0]+rnd()*(rxR[1]-rxR[0]), r1=ryR[0]+rnd()*(ryR[1]-ryR[0]);
      const cx=ccx+(rnd()-0.5)*rxR[1]*2.1;
      const cy=y0-r1*(0.30+rnd()*0.5);        // bottoms align, tops billow
      lobes.push({cx,cy,rx:r0,ry:r1});
      if(cy-r1<mnY)mnY=cy-r1; if(cy+r1>mxY)mxY=cy+r1;
    }
  }
  return Object.assign(c,{kind:'puff',lobes,
    yA:Math.max(0,Math.floor(mnY)-1), yB:Math.min(H,Math.ceil(mxY)+2)});
}

function makeSea(c, seed, y0, soft, n, rxR, ryR, floor){
  const rnd=mulberry32(seed), lobes=[];
  for(let i=0;i<n;i++) lobes.push({
    cx:(i+rnd()*0.9)*(c.Wp/n),
    rx:rxR[0]+rnd()*(rxR[1]-rxR[0]),
    ry:ryR[0]+rnd()*(ryR[1]-ryR[0]),
    dy:(rnd()-0.5)*7*S});
  return Object.assign(c,{kind:'sea',y0,soft,lobes,floor:floor||0,
    top:new Float32Array(W)});
}

const PUFF_EDGE=0.34;

function drawPuff(L,t){
  const off=(L.speed*t)%L.Wp;
  const yA=L.yA, yB=L.yB;
  bankA.fill(0, yA*W, yB*W);
  for(let n=0;n<L.lobes.length;n++){
    const lo=L.lobes[n];
    for(let k=-1;k<=1;k++){
      const cx=lo.cx+off+k*L.Wp;              // scrolls right, with the deck
      if(cx+lo.rx<0||cx-lo.rx>=W) continue;
      const x0=Math.max(0,Math.floor(cx-lo.rx)), x1=Math.min(W-1,Math.ceil(cx+lo.rx));
      const y0=Math.max(yA,Math.floor(lo.cy-lo.ry)), y1=Math.min(yB-1,Math.ceil(lo.cy+lo.ry));
      const irx=1/lo.rx, iry=1/lo.ry;
      for(let y=y0;y<=y1;y++){
        const dy=(y-lo.cy)*iry, dy2=dy*dy, row=y*W;
        if(dy2>=1) continue;
        for(let x=x0;x<=x1;x++){
          const dx=(x-cx)*irx, q=dx*dx+dy2;
          if(q>=1) continue;
          let v=(1-q)/PUFF_EDGE; if(v>1)v=1;
          const i=row+x;
          if(v>bankA[i]) bankA[i]=v;
        }
      }
    }
  }
  const dv=Math.round(-off)|0, val=L.val;
  for(let i=yA*W, n=yB*W; i<n; i++){
    const a=bankA[i];
    if(a<=0) continue;
    lum[i]=lum[i]*(1-a)+val*a;
    if(a>0.5) dof[i]=dv;
  }
}

function drawSea(L,t){
  const off=(L.speed*t)%L.Wp;
  const lb=L.lobes, nl=lb.length, top=L.top;
  for(let x=0;x<W;x++){
    let wx=(x-off)%L.Wp; if(wx<0)wx+=L.Wp;    // sample upwind => scrolls right
    let m=H+8;
    for(let i=0;i<nl;i++){
      const lo=lb[i];
      for(let k=-1;k<=1;k++){
        const dx=wx-(lo.cx+k*L.Wp);
        if(dx>-lo.rx&&dx<lo.rx){
          const q=dx/lo.rx;
          const yc=L.y0+lo.dy-lo.ry*Math.sqrt(1-q*q);
          if(yc<m)m=yc;
        }
      }
    }
    top[x]=L.floor&&m>L.floor?L.floor:m;
  }
  const dv=Math.round(-off)|0, val=L.val, soft=L.soft;
  for(let x=0;x<W;x++){
    const tp=top[x];
    let ys=tp<0?0:Math.floor(tp);
    for(let y=ys;y<H;y++){
      let a=(y-tp)/soft; if(a<=0)continue; if(a>1)a=1;
      const i=y*W+x;
      lum[i]=lum[i]*(1-a)+val*a;
      if(a>0.5) dof[i]=dv;
    }
  }
}

function drawBank(L,t){ if(L.kind==='puff') drawPuff(L,t); else drawSea(L,t); }

/* ======================================================================
   BIRDS
   ==================================================================== */
function buildFlocks(gy,gl){
  const rnd=mulberry32(CFG.birds.seed);
  FLOCKS=CFG.birds.flocks.map(d=>{
    const birds=[];
    for(let i=0;i<d.n;i++) birds.push({
      ox:(rnd()-0.5)*58*S, oy:(rnd()-0.5)*22*S,
      ph:rnd()*Math.PI*2, lag:rnd()*0.6});
    return {x0:rnd()*gl(CFG.birds.span), y0:gy(d.y), span:gl(CFG.birds.span),
            speed:gl(d.speed)*CFG.wind, amp:(5+rnd()*5)*S,
            sz:Math.max(1,Math.round(d.size*S)), birds, ph:rnd()*Math.PI*2};
  });
}

function px(x,y,v){ if(x<0||x>=W||y<0||y>=H) return; lum[y*W+x]=v; }

function drawBird(x,y,d,sz){
  // A 1px silhouette cannot win against an 8px dither lattice, so each bird
  // clears itself a small patch of open sky first.
  for(let j=-1;j<=2;j++) for(let i=-sz-1;i<=sz+1;i++){
    if((i<-sz||i>sz)&&j>1) continue;
    const xx=x+i, yy=y+j;
    if(xx<0||xx>=W||yy<0||yy>=H) continue;
    const k=yy*W+xx;
    if(lum[k]<0.96) lum[k]=0.96;
    dof[k]=0;
  }
  px(x,y,0); px(x,y+1,0);
  for(let w=1;w<=sz;w++){
    const dy=Math.round(d*(w/sz));
    px(x-w,y-dy,0); px(x+w,y-dy,0);
    if(w===1){ px(x-w,y-dy+1,0); px(x+w,y-dy+1,0); }
  }
}

function drawBirds(t){
  for(const f of FLOCKS){
    const ax=(f.x0+f.speed*t)%f.span - 33*S;
    const ay=f.y0+f.amp*fsin(0.31*t+f.ph);
    for(const b of f.birds){
      const x=Math.round(ax+b.ox);
      const y=Math.round(ay+b.oy+3*S*fsin(0.27*t+b.ph));
      const d=Math.round(fsin(12.6*(t-b.lag*0.08)+b.ph)*1.8*S);
      drawBird(x,y,d,f.sz);
    }
  }
}

/* ======================================================================
   SHOOTING STAR
   One at a time, rare, confined to the upper third where the sky is darkest
   and a bright streak actually reads.
   ==================================================================== */
function buildStar(){
  SS_RND=mulberry32(CFG.star.seed);
  SS={t0:-99,dur:0,x:0,y:0,vx:0,vy:0,next:4+SS_RND()*7};
}

function updateStar(t){
  if(t < SS.next) return;
  const c=CFG.star;
  const dir = (SS_RND()<0.72 ? 1 : -1)*windSign();   // usually with the wind
  SS.dur = c.dur[0]+SS_RND()*(c.dur[1]-c.dur[0]);
  SS.x   = dir>0 ? -14*S+SS_RND()*70*S : W+14*S-SS_RND()*70*S;
  SS.y   = (c.y[0]+SS_RND()*(c.y[1]-c.y[0]))*S;  // high, where sky is darkest
  SS.vx  = dir*(c.vx[0]+SS_RND()*(c.vx[1]-c.vx[0]))*S;
  SS.vy  = (c.vy[0]+SS_RND()*(c.vy[1]-c.vy[0]))*S;
  SS.t0  = t;
  SS.next= t+c.every+SS_RND()*c.vary;
}

function drawStar(t){
  const tau=t-SS.t0;
  if(tau<0||tau>SS.dur) return;
  const p=tau/SS.dur;
  // Plateau at full brightness. A fade that decays from p=0 leaves the head
  // hovering right at the dither threshold for most of the flight, which reads
  // as a faint scratch rather than a star.
  const fade = p<0.10 ? p/0.10 : (p>0.72 ? (1-p)/0.28 : 1);
  const hxp=SS.x+SS.vx*tau, hyp=SS.y+SS.vy*tau;
  const sp=Math.hypot(SS.vx,SS.vy);
  const ux=-SS.vx/sp, uy=-SS.vy/sp;              // back along the path
  const n=Math.round(CFG.star.tail*S*(0.35+0.65*Math.sin(Math.PI*p)));
  for(let i=n;i>=0;i--){
    const q=i/(n||1);
    // (1-q)^1.5 not squared: at 1 bit a steep falloff spends most of the tail
    // below the dither threshold, which reads as a smudge instead of a streak.
    const b=fade*Math.pow(1-q,1.5);
    if(b<=0.04) continue;
    const x=Math.round(hxp+ux*i), y=Math.round(hyp+uy*i);
    if(x<0||x>=W||y<0||y>=H) continue;
    const k=y*W+x;
    const v = i<=2 ? 1.40 : 0.35+1.15*b;         // head is always a hard point
    if(v>lum[k]){ lum[k]=v; dof[k]=0; }
    if(i===0){                                   // give the head a little body
      if(y>0){ const a=k-W; if(1.2>lum[a]){lum[a]=1.2; dof[a]=0;} }
      if(y<H-1){ const a=k+W; if(1.2>lum[a]){lum[a]=1.2; dof[a]=0;} }
    }
  }
}

/* ======================================================================
   THE MILL
   ==================================================================== */
function bodyHalf(y){
  if(y<MILL.capTop) return -1;
  if(y<MILL.capCy){
    const q=(MILL.capCy-y)/MILL.capRy;
    if(q>1) return -1;
    return MILL.capRx*Math.sqrt(1-q*q);
  }
  return MILL.halfAtCy+(y-MILL.capCy)*MILL.taper;
}

function drawMill(){
  for(let y=Math.round(MILL.hillTop);y<H;y++){        // narrow spire of hill
    const half=MILL.hillHalf+(y-MILL.hillTop)*MILL.hillSlope;
    for(let x=Math.round(TOWER_X-half);x<=Math.round(TOWER_X+half);x++) px(x,y,0.0);
  }
  for(let y=Math.round(MILL.capTop);y<=MILL.bodyBot;y++){
    let half=bodyHalf(y);
    if(half<0) continue;
    // the cap leans toward the hub, which sells the same yaw as the rotor
    const cx = y<MILL.capCy ? TOWER_X+3*S : TOWER_X;
    if(y>=MILL.galY&&y<MILL.galY+MILL.galH) half+=MILL.galOut;
    for(let x=Math.round(cx-half);x<=Math.round(cx+half);x++) px(x,y,0.0);
  }
  const fx=Math.round(TOWER_X+3*S);
  for(let y=Math.round(MILL.finialTop);y<MILL.capTop;y++) px(fx,y,0.0);
  px(fx-1,Math.round(MILL.finialTop)+1,0.0); px(fx+1,Math.round(MILL.finialTop)+1,0.0);
  for(const w of MILL.windows)
    for(let y=Math.round(w.y0);y<=w.y1;y++)
      for(let x=Math.round(TOWER_X-w.hw);x<=Math.round(TOWER_X+w.hw);x++) px(x,y,1.0);
}

/* --- rotor 3/4 view --------------------------------------------------
   The rotor plane is yawed about the vertical axis and projected with a real
   perspective divide, so the near arm reads longer and heavier than the far
   one — a plain horizontal squash only ever looks like a squashed cross.
     Forward:  z = p*sinY, s = F/(F+z), X = p*cosY*s, Y = q*s
     Inverse:  p = dx*F/(cosY*F - dx*sinY), then q = dy/s
   p depends only on the screen column, so p and 1/s are cached per column
   once a frame and the per-pixel cost is a single multiply.
   The rotor is NOT depth-split around the tower: on a real mill the sails hang
   off a shaft ahead of the cap, and splitting them pops hard anyway since an
   arm points straight down exactly where it overlaps tower and deck.        */
function updateRotorCols(){
  for(let x=0;x<W;x++){
    const dx=x-HUB.x;
    const p=dx*FOC/(CY_*FOC - dx*SY_);
    pCol[x]=p;
    iSCol[x]=(FOC+p*SY_)/FOC;          // = 1/s
  }
}
function fwd(p,q){
  const s=FOC/(FOC+p*SY_);
  return [HUB.x+p*CY_*s, HUB.y+q*s];
}

/* Solid ink, structured only by narrow light slits between the panels, so the
   arms read black as a mass. Widen CFG.rotor.slit to open them back up. */
function sailInk(u,v){
  const av=v<0?-v:v;
  if(u<-7*S||u>LA||av>HW) return 0;
  if(u<INNER) return av<=2.0*S ? 1 : 0;          // bare spine near the hub
  let half=HW;
  if(u>LA-12*S) half=HW*(0.45+0.55*(LA-u)/(12*S));  // tapered tip
  if(av>half) return 0;
  if(av<=1.5*S||av>half-1.2*S) return 1;         // spine and outer rails
  return ((u-INNER)%CU)<SLIT ? 2 : 1;            // slit : panel
}

function drawSails(t){
  const ang=ANG0+OMEGA*t;
  for(let k=0;k<4;k++){
    const a=ang+k*Math.PI/2, ca=Math.cos(a), sa=Math.sin(a);
    let mnx=1e9,mxx=-1e9,mny=1e9,mxy=-1e9;
    for(const uu of [-7*S,LA]) for(const vv of [-HW,HW]){
      const P=fwd(uu*ca-vv*sa, uu*sa+vv*ca);
      if(P[0]<mnx)mnx=P[0]; if(P[0]>mxx)mxx=P[0];
      if(P[1]<mny)mny=P[1]; if(P[1]>mxy)mxy=P[1];
    }
    const x0=Math.max(0,Math.floor(mnx)), x1=Math.min(W-1,Math.ceil(mxx));
    const y0=Math.max(0,Math.floor(mny)), y1=Math.min(H-1,Math.ceil(mxy));
    for(let y=y0;y<=y1;y++){
      const dy=y-HUB.y, row=y*W;
      for(let x=x0;x<=x1;x++){
        const p=pCol[x], q=dy*iSCol[x];
        const s=sailInk(p*ca+q*sa, -p*sa+q*ca);
        if(s){ const i=row+x; lum[i]=(s===1)?0.0:0.86; dof[i]=0; }
      }
    }
  }
}

function drawHub(){
  const r=5*S, r2=r*r;
  for(let y=-Math.ceil(r);y<=r;y++) for(let x=-Math.ceil(r);x<=r;x++)
    if(x*x*1.6+y*y<=r2) px(Math.round(HUB.x)+x,Math.round(HUB.y)+y,0.0);
  px(Math.round(HUB.x),Math.round(HUB.y),0.9);
  px(Math.round(HUB.x),Math.round(HUB.y)-1,0.9);
}

/* ======================================================================
   L2 — THE CLOUD DECK

   A lobed surface filled with one flat tone at full opacity — the same kind of
   object as the other three banks, just nearer and larger.

   This layer used to be 62k simulated particles, then a field with a carve
   mask the sails tore holes in. Both are gone. Modulating alpha and tone by
   local particle density was what made it read semi-transparent and blotchy
   while the other three read as solid cloud: grain in the BULK reads as sand,
   grain at the SILHOUETTE reads as cloud. So the bulk is flat, and all the
   structure lives in the surface shape.

   The deck no longer interacts with the sails at all. Having two independent
   "sails tear cloud" mechanisms meant the older one contributed a fraction of
   a percent of the airborne material while still carving the deck underneath
   the newer one. All sail-cloud interaction now lives in the 5th cloud.
   ==================================================================== */
let nearTop,WRAP,DECK_TONE,DECK_SOFT,DECK_SHADE;

function buildDeck(gy0,gl){
  const d=CFG.deck;
  const gy = v => gy0(v+d.offY);         // the whole deck rides its own offset
  WRAP=Math.round(gl(d.wrap));
  VW=gl(layerSpeed(DECK_DEPTH))*CFG.wind;
  DECK_TONE=layerTone(DECK_DEPTH)+d.toneBias;
  DECK_SOFT=Math.max(1,gl(d.soft));
  DECK_SHADE=d.shade;

  // surface: few big lobes, or the min() flattens into a ruled line
  nearTop=new Float32Array(WRAP);
  {
    const rnd=mulberry32(d.surfSeed), lobes=[], n=d.surfLobes;
    for(let i=0;i<n;i++) lobes.push({
      cx:(i+rnd()*0.9)*(WRAP/n),
      rx:gl(d.surfRx[0]+rnd()*(d.surfRx[1]-d.surfRx[0])),
      ry:gl(d.surfRy[0]+rnd()*(d.surfRy[1]-d.surfRy[0])),
      dy:(rnd()-0.5)*8*S});
    const floor=gy(d.surfFloor), base=gy(d.surfBase);
    for(let x=0;x<WRAP;x++){
      let top=floor;
      for(const lo of lobes) for(let k=-1;k<=1;k++){
        const dx=x-(lo.cx+k*WRAP);
        if(dx>-lo.rx&&dx<lo.rx){
          const q=dx/lo.rx;
          const yc=base+lo.dy-lo.ry*Math.sqrt(1-q*q);
          if(yc<top)top=yc;
        }
      }
      nearTop[x]=top;
    }
  }
}

const mod=(a,n)=>{ const r=a%n; return r<0?r+n:r; };
const gl_=v=>v*S;
function deckOff(t){ return mod(VW*t, WRAP); }

/* Surface height at a material column, linearly interpolated so the silhouette
   does not stair-step as the deck scrolls. */
function surfaceAt(wx){
  const i0=Math.floor(wx), f=wx-i0;
  const a=nearTop[mod(i0,WRAP)], b=nearTop[mod(i0+1,WRAP)];
  return a+(b-a)*f;
}

function stepDeck(dt,t){ stepEmit(dt); }

/* --- drawing ---------------------------------------------------------
   Flat tone at full opacity, exactly like the other three banks. The only
   tonal variation is a gentle darkening with depth below the surface — form
   shading at the scale of the lobes, not per-pixel noise. */
function drawDeck(t){
  const off=deckOff(t), dv=Math.round(-off)|0;
  const shade=DECK_SHADE, invD=1/(30*S), soft=DECK_SOFT;
  for(let x=0;x<W;x++){
    const wx=mod(x-off,WRAP);
    const top=surfaceAt(wx);
    const ci=Math.round(wx)%WRAP;
    let ys=top<0?0:Math.floor(top);
    for(let y=ys;y<H;y++){
      let a=(y-top)/soft; if(a<=0)continue; if(a>1)a=1;
      let dep=(y-top)*invD; if(dep>1)dep=1;
      const tone=DECK_TONE-shade*dep;
      const i=y*W+x;
      lum[i]=lum[i]*(1-a)+tone*a;
      if(a>0.5) dof[i]=dv;
    }
  }
}

/* ======================================================================
   THE 5th CLOUD — an invisible emitter deck between L3 and L2

   THE ONLY PLACE THE SAILS TOUCH CLOUD. The deck below is inert; if you are
   looking for where the mill affects the sky, it is here.

   An off-screen emitter at the left edge streams particles across L3's own
   height band (read straight off L3's lobes, so "the height of the second
   cloud" needs no separate tuning) at L3's own drift speed and tone. Nothing
   is drawn for a particle until a sail actually touches it. Contact and reveal
   are the same event: the particle is ejected onto the blade's face and
   launched from it. Once released it keeps drifting at L3's speed under drag
   and gravity, fading over its life, then despawns; the emitter keeps the pool
   topped up regardless of how many have been caught.
   ==================================================================== */
function buildEmit(){
  const L3=BANKS[1], E=CFG.emit;
  let mnY=1e9, mxY=-1e9;
  for(const lo of L3.lobes){
    const top=L3.y0+lo.dy-lo.ry, bot=L3.y0+lo.dy+lo.ry;
    if(top<mnY) mnY=top; if(bot>mxY) mxY=bot;
  }
  EMIT_TOP=mnY; EMIT_BOT=Math.max(mnY+4,mxY);
  EMIT_SPEED=L3.speed; EMIT_TONE=L3.val+E.lift;
  EMIT_X0=EMIT_SPEED>=0 ? -8*S : W+8*S;
  /* Spacings are in SCREEN pixels, so the medium is equally dense on every
     grid — which means the pool scales with S^2 on its own, the same way the
     deck's particle count always has. */
  EMIT_ROW=1/Math.sqrt(Math.max(0.02,E.density));
  EMIT_COL=EMIT_ROW/Math.max(0.05,E.output);
  EMIT_PAD=E.pad*S;

  let rows=Math.floor((EMIT_BOT-EMIT_TOP)/EMIT_ROW)+1;
  let cols=Math.ceil((W+96*S)/EMIT_COL)+2;
  eMax=Math.max(500,rows*cols);
  /* A runaway density setting would otherwise allocate hundreds of megabytes.
     Cap the pool and let the medium be thinner than asked rather than die. */
  const cap=Math.max(2000,E.maxPool|0);
  if(eMax>cap) eMax=cap;
  EMIT_RATE=rows*(Math.abs(EMIT_SPEED)/EMIT_COL);   // particles per second
  eX=new Float32Array(eMax); eY=new Float32Array(eMax);
  eVX=new Float32Array(eMax); eVY=new Float32Array(eMax);
  eLife=new Float32Array(eMax); eVis=new Uint8Array(eMax);
  eN=0; eSpawnAcc=0; eRevealed=0;

  /* Prefill the whole medium. Warming up by running the emitter would take as
     long as the layer needs to physically cross the frame (~14s), so the first
     seconds would show a mill turning in an empty band. The curtain is uniform
     by construction, so it can simply be laid down. */
  const dir=EMIT_SPEED<0?-1:1;
  for(let c=0;c<cols;c++){
    const x=EMIT_X0+dir*c*EMIT_COL;
    if(dir>0 ? x>W+8*S : x<-8*S) break;
    for(let y=EMIT_TOP;y<=EMIT_BOT;y+=EMIT_ROW){
      if(eN>=eMax) break;
      const i=eN++;
      eX[i]=x+(Math.random()-0.5)*EMIT_COL;
      eY[i]=y+(Math.random()-0.5)*EMIT_ROW;
      eVX[i]=EMIT_SPEED; eVY[i]=0;
      eLife[i]=0; eVis[i]=0;
    }
  }
}

/* Half-width of the DRAWN blade at blade-local u, or -1 beyond its span.
   This mirrors sailInk's silhouette exactly, with one deliberate difference:
   the light slits between panels are treated as SOLID. A slit is a 1px gap in
   the ink, not a gap in the sail — a particle must never be found sitting in
   one. Matching the drawn shape rather than using a plain bounding box is what
   keeps the exclusion from carving an empty halo around the hub, where the
   real blade is only a 2px spine. */
function bladeHalf(u){
  if(u<-7*S||u>LA) return -1;
  if(u<INNER) return 2.0*S;                        // bare spine near the hub
  let half=HW;
  if(u>LA-12*S) half=HW*(0.45+0.55*(LA-u)/(12*S)); // tapered tip
  return half;
}

/* The exclusion zone is the blade DILATED by `pad` — in u as well as in v.
   Padding only the sides leaves the zone chopped off flat at the tip and at
   the hub end, and that is a real hole: a particle whose continuous position
   projects to u just past LA is declared "outside" and left alone, but the
   ROUNDED pixel it gets drawn on can project to u just inside LA, landing on
   ink. Every escaped particle found in testing was at u within half a pixel of
   the tip. Clamping u into the blade's span before measuring the half-width
   extends the zone past both ends, closing it. */
function bladeLimit(u,pad){
  if(u<-7*S-pad||u>LA+pad) return -1;
  const uc = u<-7*S ? -7*S : (u>LA ? LA : u);
  return bladeHalf(uc)+pad;
}

/* --- THE HARD CONSTRAINT ---------------------------------------------
   A particle may NEVER be inside a blade. Not briefly, not while being pushed
   out, not at any rendered frame.

   Earlier attempts enforced this with a force, which cannot work: a force only
   expresses a preference, and the particle is inside the blade for the whole
   time the force is acting. This is a positional projection instead — if the
   point is inside, it is MOVED onto the blade's face this instant.

   Three details make it actually hold:
     - it runs in the PROJECTED rotor space (p,q), the same space sailInk
       rasterises in. The earlier version tested unprojected screen offsets,
       so at 35 degrees of yaw the exclusion zone and the drawn blade were
       simply different shapes;
     - it runs at RENDER time with the angle being drawn, not at physics time
       with the previous substep's angle, which was a whole frame stale;
     - the hub boss is resolved first. All four spines converge there and no
       sideways ejection can escape, so the boss is a disc nothing may enter.
   Up to three passes, because ejecting off one blade can land a particle on
   another where they cross near the hub. Whatever survives all three is
   refused at draw time by a direct sailInk test, so the guarantee is absolute
   even if the geometry ever defeats the projection. */
const EJ={x:0,y:0,u:0,v:0,ca:1,sa:0,sg:1};
function ejectFromBlades(x,y,CA,SA,pad){
  let dxh=x-HUB.x, dyh=y-HUB.y, hit=false;

  const hr=5*S+pad, d2=dxh*dxh+dyh*dyh;
  if(d2<hr*hr){
    const d=Math.sqrt(d2)||1e-4, k=hr/d;
    dxh*=k; dyh*=k; hit=true;
  }

  /* Six passes, deepest violation first. Ejecting off one blade can land a
     point on another where they cross near the hub, and picking the deepest
     each time is what makes that chain terminate instead of ping-ponging
     between two faces. */
  for(let pass=0;pass<6;pass++){
    const p=dxh*FOC/(CY_*FOC-dxh*SY_);
    const s=FOC/(FOC+p*SY_);
    const q=dyh/s;
    let bk=-1, bu=0, bv=0, blim=0, deep=0;
    for(let k=0;k<4;k++){
      const ca=CA[k], sa=SA[k];
      const u=p*ca+q*sa, v=-p*sa+q*ca;
      const lim=bladeLimit(u,pad);
      if(lim<0) continue;
      const av=v<0?-v:v;
      if(av>=lim) continue;
      const d=lim-av;
      if(d>deep){ deep=d; bk=k; bu=u; bv=v; blim=lim; }
    }
    if(bk<0) break;
    /* Nearest face. Exactly on the centreline there is no nearest face, so use
       the one the blade is sweeping toward: the blade's normal speed at radius
       u is OMEGA*u, so its leading side is sign(OMEGA*u). */
    const sg = bv>0?1:(bv<0?-1:(OMEGA*bu>=0?1:-1));
    const nv=sg*blim;
    const ca=CA[bk], sa=SA[bk];
    const np=bu*ca-nv*sa, nq=bu*sa+nv*ca;
    const ns=FOC/(FOC+np*SY_);
    dxh=np*CY_*ns; dyh=nq*ns;
    EJ.u=bu; EJ.v=nv; EJ.ca=ca; EJ.sa=sa; EJ.sg=sg; EJ.k=bk; EJ.lim=blim;
    hit=true;
  }

  /* Pixel-exact finish. The constraint above is continuous, but a particle is
     drawn at a ROUNDED pixel, and sail ink is rasterised from the per-column
     projection cache — so a point legitimately outside the padded blade can
     still round onto ink at sub-pixel margins. Walk it further off the same
     face, a pixel at a time, until the pixel it will actually be drawn on is
     clear. This is what makes the invariant hold exactly, not approximately. */
  if(hit){
    for(let s=1;s<=12;s++){
      const ix=Math.round(HUB.x+dxh), iy=Math.round(HUB.y+dyh);
      if(ix<0||ix>=W||iy<0||iy>=H) break;
      if(!onSail(ix,iy,CA,SA)) break;
      const nv=EJ.sg*(EJ.lim+s);
      const np=EJ.u*EJ.ca-nv*EJ.sa, nq=EJ.u*EJ.sa+nv*EJ.ca;
      const ns=FOC/(FOC+np*SY_);
      dxh=np*CY_*ns; dyh=nq*ns;
      EJ.v=nv;
    }
  }
  EJ.x=HUB.x+dxh; EJ.y=HUB.y+dyh;
  return hit;
}

/* Eject, then catch the one case ejection can miss: a point that sits legally
   outside the padded blade in continuous space but whose ROUNDED pixel still
   lands on ink. Widening the pad and retrying gives it a face to be pushed off.
   After this returns, the particle's drawn pixel is guaranteed clear. */
function enforceClear(x,y,CA,SA,pad){
  let hit=ejectFromBlades(x,y,CA,SA,pad);
  if(!hit){
    const ix=Math.round(EJ.x), iy=Math.round(EJ.y);
    if(ix>=0&&ix<W&&iy>=0&&iy<H&&onSail(ix,iy,CA,SA))
      hit=ejectFromBlades(x,y,CA,SA,pad+2*S);
  }
  return hit;
}

/* True if this screen point lands on drawn sail ink — the last-resort test.
   Mirrors drawSails exactly: same per-column projection cache, same sailInk. */
function onSail(x,y,CA,SA){
  const dxh=x-HUB.x, dyh=y-HUB.y;
  const p=pCol[x], q=dyh*iSCol[x];
  if(dxh*dxh+dyh*dyh>(LA+HW+6*S)*(LA+HW+6*S)) return false;
  for(let k=0;k<4;k++){
    const c=CA[k], s=SA[k];
    if(sailInk(p*c+q*s, -p*s+q*c)) return true;
  }
  return false;
}

function bladeAngles(t){
  const ang=ANG0+OMEGA*t, CA=[], SA=[];
  for(let k=0;k<4;k++){ const a=ang+k*Math.PI/2; CA.push(Math.cos(a)); SA.push(Math.sin(a)); }
  return [CA,SA];
}

/* --- the medium ------------------------------------------------------
   Unrevealed particles do nothing but drift with the layer: no drag, no
   gravity, no blade tests. That is what makes a pool this size affordable —
   an untouched grain costs two multiply-adds a frame. */
function stepEmit(dt){
  const E=CFG.emit;
  const adv=Math.abs(EMIT_SPEED)*dt;
  eSpawnAcc+=adv;
  while(eSpawnAcc>=EMIT_COL){
    eSpawnAcc-=EMIT_COL;
    // one full column: a particle per row across L3's height
    for(let y=EMIT_TOP;y<=EMIT_BOT;y+=EMIT_ROW){
      if(eN>=eMax) break;
      const i=eN++;
      // jitter both axes: a perfect lattice would surface as marching stripes
      // in the revealed ribbon once the spacing drops below a pixel
      eX[i]=EMIT_X0+(Math.random()-0.5)*EMIT_COL;
      eY[i]=y+(Math.random()-0.5)*EMIT_ROW;
      eVX[i]=EMIT_SPEED; eVY[i]=0;
      eLife[i]=0; eVis[i]=0;
    }
  }

  const drag=E.drag, sink=E.sink*S;
  for(let i=0;i<eN;i++){
    if(eVis[i]){
      eVX[i]+=(-drag*(eVX[i]-EMIT_SPEED))*dt;
      eVY[i]+=(-drag*eVY[i]+sink)*dt;
      eLife[i]-=dt;
    }
    eX[i]+=eVX[i]*dt; eY[i]+=eVY[i]*dt;

    const dead=(eVis[i]&&eLife[i]<=0)
            || eX[i]<-72*S || eX[i]>W+72*S || eY[i]>H+48*S || eY[i]<-48*S;
    if(dead){
      eN--;                                // swap-remove; the curtain refills
      eX[i]=eX[eN]; eY[i]=eY[eN]; eVX[i]=eVX[eN]; eVY[i]=eVY[eN];
      eLife[i]=eLife[eN]; eVis[i]=eVis[eN];
      i--;
    }
  }
}

/* Run at RENDER time, at the angle actually being drawn. Anything inside a
   blade is ejected onto its face and, if this is its first contact, revealed
   and launched. Contact and exclusion are the same event — which is why a
   particle can be revealed without ever having been inside anything. */
function resolveEmit(t){
  const E=CFG.emit, fling=E.fling;
  const [CA,SA]=bladeAngles(t);
  const reach=LA+HW+E.pad*S+8*S, reach2=reach*reach;

  for(let i=0;i<eN;i++){
    const dxh=eX[i]-HUB.x, dyh=eY[i]-HUB.y;
    if(dxh*dxh+dyh*dyh>reach2) continue;
    if(!enforceClear(eX[i],eY[i],CA,SA,EMIT_PAD)) continue;

    eX[i]=EJ.x; eY[i]=EJ.y;
    const u=EJ.u, v=EJ.v, ca=EJ.ca, sa=EJ.sa, sg=EJ.sg;
    // the blade's own material velocity at the contact point, plus a kick
    // straight off the face it was ejected onto
    const bvx=OMEGA*(-u*sa-v*ca), bvy=OMEGA*(u*ca-v*sa);
    const kick=Math.abs(OMEGA*u)*fling;
    eVX[i]=bvx+(-sa*sg)*kick;
    eVY[i]=bvy+( ca*sg)*kick;
    if(!eVis[i]){
      eVis[i]=1; eRevealed++;
      eLife[i]=E.life[0]+Math.random()*(E.life[1]-E.life[0]);
    }
  }
}

function drawEmit(t){
  const tone=EMIT_TONE;
  const [CA,SA]=bladeAngles(t);
  eLit=0;
  for(let i=0;i<eN;i++){
    if(!eVis[i]) continue;                 // untouched cloud stays invisible
    const x=Math.round(eX[i]), y=Math.round(eY[i]);
    if(x<0||x>=W||y<0||y>=H) continue;
    if(onSail(x,y,CA,SA)) continue;        // backstop: never drawn on the ink
    let a=eLife[i]*1.6; if(a>1)a=1; if(a<0)continue;
    /* Counted only once it is actually WRITTEN. Counting flagged-lit particles
       instead is what let an entirely invisible medium report 7,000 of them. */
    eLit++;
    const j=y*W+x;
    lum[j]=lum[j]*(1-a)+tone*a;
    if(a>0.5) dof[j]=0;
  }
}

/* ======================================================================
   DITHER + BLIT
   ==================================================================== */
function dither(){
  for(let y=0;y<H;y++){
    const row=(y&7)<<3, o=y*W;
    for(let x=0;x<W;x++){
      const i=o+x;
      buf32[i] = lum[i]*64 > BAYER[row|((x+dof[i])&7)]+0.5 ? CPAP : CINK;
    }
  }
  ctx.putImageData(img,0,0);
}

/* ======================================================================
   FRAME — back to front
   ==================================================================== */
function renderFrame(t){
  lum.set(bg);
  dof.fill(0);
  updateRotorCols();
  /* Enforce the no-overlap constraint HERE, against the exact blade angle this
     frame draws, before anything is rasterised. Doing it in the physics step
     left it a whole substep stale. */
  resolveEmit(t);
  updateStar(t);
  drawStar(t);
  drawBirds(t);
  drawBank(BANKS[0],t);         // L4
  drawBank(BANKS[1],t);         // L3
  drawMill();                   // tower, so the deck can bury its base
  drawDeck(t);                  // L2
  drawSails(t);                 // rotor rides ahead of the cap
  drawHub();
  drawBank(BANKS[2],t);         // L1 — in front of everything
  /* The 5th cloud draws LAST. This is thrown material in the air, so it is in
     front of the banks rather than between them, and that is forced as much as
     chosen: L3, the deck and L1 are all SEAS that fill from their surface to
     the bottom of the frame, so every slot behind them buries this band.
     Measured, drawing it in the 3rd slot changed ZERO pixels at any tone, and
     drawing it behind L1 alone left ~90% of it buried under the near bank.
     Being behind the SAILS is unnecessary: no particle is ever inside a blade,
     and drawEmit re-tests sail ink regardless. */
  if(!EMIT_OFF) drawEmit(t);
  dither();
}

/* ======================================================================
   DRIVER
   ==================================================================== */
let t=0, acc=0, last=0, paused=false, galleryPaused=false;

/* The 5th cloud must reach EQUILIBRIUM here, not on screen. Warming up without
   resolveEmit leaves a pristine, fully packed medium at t=0, so the first few
   sweeps harvest a whole frame's worth of area in one go — a huge opening
   burst that then collapses to the much lower rate the left edge can sustain.
   Running the reveal during warmup means the mill has already eaten its wake
   before frame one, and what you see is the steady state from the start. */
function warmup(n){
  updateRotorCols();                       // geometry only; safe to do once
  for(let i=0;i<(n||260);i++){ stepDeck(DT,t); t+=DT; resolveEmit(t); }
}

/* The postcard is always exactly 9:16 in whole CSS pixels. Snapping the height
   to a multiple of 16 makes width = h*9/16 land on an integer too, so the
   frame can never drift off-aspect by a stray pixel.

   FILL grows it into whatever space is left. A fixed row count stretched over
   an arbitrary height means cells cannot all be equal — at 416 rows in 900px
   each cell is 2.16px, so rows alternate 2px/3px. That is usually invisible,
   but it can beat against the 8x8 Bayer lattice as faint banding.
   CRISP letterboxes to an integer zoom instead: every cell identical, at the
   cost of leaving some space unused. */
function fitCanvas(){
  const st=document.getElementById('stage');
  const availW=st.clientWidth, availH=st.clientHeight;
  let w,h,cell;
  if(CFG.fit==='crisp'){
    cell=Math.max(1,Math.floor(Math.min(availW/W, availH/H)));
    w=W*cell; h=H*cell;
  }else{
    h=Math.floor(Math.min(availH, availW*16/9));
    h-=h%16; if(h<16) h=16;
    w=h*9/16;
    cell=h/H;
  }
  cv.style.width=w+'px'; cv.style.height=h+'px';
  const z=document.getElementById('vZoom');
  const p=document.getElementById('vPost');
  const c=document.getElementById('vCells');
  const even=Math.abs(cell-Math.round(cell))<1e-9;
  if(z) z.textContent = even ? cell+'px' : cell.toFixed(2)+'px';
  if(p) p.textContent = w+'×'+h;
  if(c) c.textContent = even ? 'even cells' : 'cells ±1px';
  return cell;
}

function rebuild(keepTime){
  const t0=keepTime?t:0;
  build(); t=t0; acc=0;
  warmup();
  fitCanvas();
  renderFrame(t);
}

function tick(now){
  if(galleryPaused) return;
  const n=(now===undefined)?performance.now():now;
  let dtr=(n-last)/1000; last=n;
  if(dtr>0.25) dtr=0.25;
  if(!paused){ acc+=dtr; while(acc>=DT){ stepDeck(DT,t); t+=DT; acc-=DT; } }
  renderFrame(t);
  if(hud) hud.textContent=t.toFixed(1)+'s  '+W+'x'+H+'  '+eN+'p '+eLit+' lit';
}

let rafSeen=false;
function rafLoop(now){ rafSeen=true; tick(now); requestAnimationFrame(rafLoop); }
function startDriver(){
  last=performance.now();
  requestAnimationFrame(rafLoop);
  setTimeout(()=>{ if(!rafSeen) setInterval(()=>tick(), 16); }, 400);
}

addEventListener('keydown',e=>{
  const tag=(e.target.tagName||'').toLowerCase();
  if(tag==='input'||tag==='textarea') return;
  if(e.code==='Space'){paused=!paused;e.preventDefault();}
  if(e.key==='h'&&hud){hud.style.display=hud.style.display==='none'?'':'none';}
});
addEventListener('resize',fitCanvas);


function start(){build();warmup();fitCanvas();renderFrame(t);if(loadEl)loadEl.style.display='none';startDriver();}
function reset(){CFG=clone(DEFAULT_CFG);rebuild(false);return CFG;}
function savePng(){const a=document.createElement('a');a.download='windmill-'+W+'x'+H+'.png';a.href=cv.toDataURL('image/png');a.click();}
function info(){return {W,H,particles:eN,lit:eLit,emitRate:Math.round(EMIT_RATE),layerSpeeds:[0,1,2,3].map(layerSpeed),config:CFG};}
addEventListener('message',e=>{if(e.data?.type==='blinking-robot:preview-pause')galleryPaused=Boolean(e.data.paused);});
return {start,config:CFG,rebuild,fit:fitCanvas,reset,savePng,info,triggerStar(){SS.next=t;},togglePaused(){paused=!paused;return paused;}};
}

