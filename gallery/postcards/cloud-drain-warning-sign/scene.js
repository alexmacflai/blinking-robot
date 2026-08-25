import { createPlaybackState } from '../../shared/playback.js';

(function(){
"use strict";

/* ========================================================================
   BLINKING ROBOT — cloud-drain warning sign

   ONE cloud. Not a cloud field, not a collection of clouds, and not a
   texture: a single continuous body whose SHAPE is a spiral, fed endlessly
   from outside the frame, flowing inward, shrinking as it goes, and gone at
   the centre. A warning sign stands above it and is completely indifferent
   to any of it.

   THE SPINE. The cloud has a centreline: a logarithmic helix in world
   space. Its radius falls as R(s) = R0 * exp(-k*s), so the coils pack
   tighter toward the middle, and it DESCENDS as it winds in, which is what
   makes the form a funnel rather than a flat swirl. The spine is fixed
   geometry — it never moves, wanders, or accumulates.

   THE BODY. The cloud is the volume around that spine, built from heavily
   overlapping lobes strung along it, each displaced and resized by noise so
   the union's silhouette bulges and scallops like cumulus instead of
   reading as a smooth tube.

   THE LOBES ARE NOT CLOUDS. They are the construction primitive of ONE
   body, exactly as the discs inside a thick line are not separate objects.
   They overlap far enough that there is a single silhouette; their count is
   an implementation detail and must never become visible as separate puffs.
   Lobe size scales with R(s), so the cloud genuinely gets smaller as it
   winds inward — the shrink is geometry, not a fade.

   MOTION is material flowing ALONG the spine. The spine stays put and the
   cloud travels through itself, so nothing is ever seen to spawn: material
   arrives from off-frame at the outer end and runs out at the centre.

   NOTHING ACCUMULATES. The flow phase is wrapped, so the scene at ten
   minutes is the scene at ten seconds. An earlier version of this postcard
   wound its sample coordinates outward by exp(rate*t) with no bound; after
   a couple of minutes those coordinates were large enough to destroy the
   noise's precision and the image decayed into static. Any change here must
   keep every time-dependent quantity bounded.

   DEPTH IS REAL, and it is what makes this read as a cloud in space rather
   than a pattern on a plane:
     - a perspective camera sits slightly above the drain and looks down;
     - lobes are sorted by camera depth and drawn BACK TO FRONT, so where
       the near arc of the spiral crosses the far arc it covers it. That
       self-occlusion — one object overlapping ITSELF — is the whole point;
     - the near arc projects larger than the far arc for free;
     - tone varies with depth, with height down the funnel, and within each
       lobe so tops read lighter and undersides darker. That is a graphic
       decision, not a lighting simulation.

   RENDER PIPELINE — the house discipline: compose the whole scene as
   CONTINUOUS luminance in a Float32 buffer, then threshold the finished
   composite once through an ordered Bayer 8x8 matrix, so cloud, sign and
   pole are quantised on one lattice and read as a single screen-print.

   RESOLUTION INDEPENDENCE — authored against a BASE 234x416 grid and
   multiplied by S at build time, matching the other postcards. World
   quantities are in spiral units and are converted by the projection.
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

/* PERIODIC value noise. The period is what keeps the postcard alive: the
   flow phase advances forever, but every index is reduced modulo PERIOD
   before it is hashed, so the noise agrees across the seam and the cloud
   can never drift, stretch, or lose precision however long it runs. */
const PERIOD=512;
function hash1(i,salt){
  const w=((i%PERIOD)+PERIOD)%PERIOD;
  let h=Math.imul(w,374761393)+Math.imul(salt,668265263);
  h=Math.imul(h^(h>>>13),1274126177);
  return ((h^(h>>>16))>>>0)/4294967296;
}
function pnoise(x,salt){
  const i=Math.floor(x), f=x-i;
  const u=f*f*(3-2*f);
  return lerp(hash1(i,salt),hash1(i+1,salt),u);
}
/* Two octaves is enough: the silhouette wants a few large bulges and a
   little irregularity, not the fine detail the art direction rejects. */
function fbm1(x,salt){
  return pnoise(x,salt)*0.65+pnoise(x*2.17+11.3,salt+7)*0.35;
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
let lum,twoBitSlot,img,buf32,CINK,CMID,CPAP,CACC;
let dep;                 // per-pixel cloud depth, for occluding the pole
let lobes=[];

const cv=document.getElementById('c');
const ctx=cv.getContext('2d',{alpha:false});

function build(){
  const K=CFG.gridK;
  W=9*K; H=16*K; S=W/BASE_W;
  cv.width=W; cv.height=H;
  img=ctx.createImageData(W,H);
  buf32=new Uint32Array(img.data.buffer);
  lum=new Float32Array(W*H);
  twoBitSlot=new Int8Array(W*H);
  twoBitSlot.fill(-1);
  dep=new Float32Array(W*H);
  const palette=CFG.render||{paletteMode:'1-bit',dark:CFG.ink,middle:CFG.paper,light:CFG.paper,accent:CFG.paper};
  CINK=packColor(palette.dark); CMID=packColor(palette.middle); CPAP=packColor(palette.light); CACC=packColor(palette.accent);
  lobes=[];
}

/* ======================================================================
   THE SPINE — one logarithmic helix, descending as it winds in
   ==================================================================== */
function spineAt(s){
  const sp=CFG.spiral;
  const decay=Math.exp(-sp.tighten*s);      // s counts turns inward
  const R=sp.outerR*decay;
  const theta=s*2*Math.PI*(sp.handed<0?-1:1)+sp.phase;
  /* Descent is tied to how far the radius has closed, but shaped by
     `dropCurve` so the cloud does NOT sink steadily from the moment it
     enters. Above 1 the body stays close to horizontal for most of its
     travel and only plunges as it nears the middle, which is how a drain
     actually behaves — a wide flat surface with a throat at the centre.
     At 1 the descent is linear in the closing radius. */
  const closed=1-decay;
  const drop=sp.depth*Math.pow(closed,Math.max(0.05,sp.dropCurve));
  return { R:R, x:R*Math.cos(theta), z:R*Math.sin(theta), y:sp.topY-drop, decay:decay };
}

/* ======================================================================
   CAMERA — slightly above the drain, looking down into it
   ==================================================================== */
function project(x,y,z){
  const cam=CFG.cam;
  /* The camera sits at height `up` above the spiral's rim plane and `back`
     behind it, pitched down to look into the funnel. Pitch is derived from
     the position rather than authored separately, so the camera always
     points at the drain and the two controls cannot contradict each other.

     Getting the sign of the pitch wrong here inverts the whole image: the
     FAR rim must project higher on screen than the near rim. If it does
     not, the scene reads as a bowl seen from below. */
  const px=x, py=y-cam.up, pz=z+cam.back;
  const pitch=Math.atan2(cam.up,Math.max(1,cam.back));
  const cp=Math.cos(pitch), sp=Math.sin(pitch);
  const yv=py*cp+pz*sp;
  const zv=-py*sp+pz*cp;
  if(zv<=1) return null;
  const k=cam.focal/zv;
  return { sx:(BASE_W*0.5+cam.offX+px*k)*S, sy:(cam.horizon-yv*k)*S, k:k, depth:zv };
}

/* ======================================================================
   BUILDING THE BODY — lobes strung densely along one spine
   ==================================================================== */
function buildLobes(t){
  const sp=CFG.spiral, cl=CFG.cloud;
  lobes.length=0;

  const span=sp.turns;
  const count=Math.max(8,Math.round(cl.lobes));
  /* Material flows inward. The phase is wrapped into one span, so this is
     bounded for any t. */
  const phase=((t*cl.flow)%span+span)%span;

  for(let i=0;i<count;i++){
    /* Identity of this piece of material, evenly spaced along the spiral
       parameter — so lobes crowd together in screen space as the coils
       tighten, which is how a drain should look. */
    const id=i/count*span;
    /* Where that material is now. Wrapping means a piece reaching the
       middle re-enters at the outer end, off frame: the cloud is endless
       and nothing is seen to appear or vanish. */
    const s=(id+phase)%span;

    /* RUNWAY. The spine is evaluated further out than the visible rim, so
       the body is born, and finishes swelling to full size, while still
       off frame. Without it the fade-in happens in view and material is
       seen growing into existence — the very pop the off-frame emitter
       exists to hide. */
    const P=spineAt(s-cl.runway);

    /* Silhouette. Position and radius are displaced by noise keyed to the
       piece's IDENTITY, not its screen position, so a bulge travels with
       its own material instead of shimmering in place. */
    const nk=id*cl.billowScale;
    const wob=fbm1(nk,3)-0.5;
    const wobV=fbm1(nk+31.7,9)-0.5;
    const wobR=fbm1(nk+77.1,17);

    /* Radius follows the coil, so the cloud shrinks as it winds in, and
       tapers to nothing before the centre so material runs out rather than
       popping out of existence. */
    /* Two scales of lump: a slow one that swells whole stretches of the
       body into cumulus heads, and the faster `wobR` that roughens their
       edges. One scale alone reads either as a lumpy sausage or as noise;
       the pair is what gives a cloud its big-mass-with-broken-edge look. */
    /* Pushing the head noise away from its middle makes the bulges
       distinct instead of a gentle swell — this is the lumpiness dial. */
    const raw=fbm1(nk*cl.headScale+5.5,23);
    const heads=clamp((raw-0.5)*cl.lumpContrast+0.5,0,1);

    const taper=smooth(clamp(P.decay/Math.max(0.001,cl.tipFade),0,1));
    /* Material also swells in over the first stretch of the spine. The
       outer end is meant to sit off frame, but a fade-in means nothing can
       pop into being even if the camera or the rim radius is changed. */
    const born=smooth(clamp(s/Math.max(0.001,cl.startFade),0,1));
    const rad=cl.thick*P.decay*(0.3+heads*cl.headSwell+wobR*cl.roughen)*taper*born;
    if(rad<=0) continue;

    const outward=1+wob*cl.billow;
    const x=P.x*outward, z=P.z*outward;
    const y=P.y+wobV*cl.billow*cl.thick*2.2;

    const p=project(x,y,z);
    if(!p) continue;

    /* LANE DEPTH. Tone and sort order must NOT read the wobbled lobe's own
       projected depth: neighbouring lobes share almost the same spine
       position but get independent billow noise, so their wobbled depth
       jitters lobe-to-lobe. Keying shading to that jitter is what made
       individual lobes visible as separate blobs, and keying the sort to
       it is what let a farther coil momentarily paint over a nearer one
       wherever two coils' true depths were close. Both read the smooth,
       UNWOBBLED spine depth instead, so a whole run of neighbouring lobes
       — a "lane" — shares one continuous tone and one stable order, while
       the wobbled position still decides where each lobe actually draws. */
    const lane=project(P.x,P.y,P.z);
    lobes.push({ p:p, r:rad, decay:P.decay, laneDepth:(lane||p).depth, laneSY:(lane||p).sy });
  }

  /* Painter's algorithm on the LANE depth: farthest first. This is where
     the self-occlusion comes from — the near arc of the SAME body covering
     its far arc — and it stays stable because lane depth has no per-lobe
     noise to tie or flip on. */
  lobes.sort((a,b)=>b.laneDepth-a.laneDepth);
}

/* ======================================================================
   DRAWING — every lobe writes coverage-weighted luminance
   ==================================================================== */
function drawLobe(L){
  const cl=CFG.cloud, sp=CFG.spiral;
  const p=L.p;
  const rpx=L.r*p.k*S;
  if(rpx<0.35) return;                    // ran out of material: nothing to pop

  /* Depth tone: far material sits in a different band from near material,
     and material low in the funnel is darker than material at the rim. */
  const depthT=clamp((L.laneDepth-(CFG.cam.back-sp.outerR))/(2*sp.outerR),0,1);
  const body=clamp(lerp(cl.nearTone,cl.farTone,depthT)-cl.depthShade*(1-L.decay),0,1);

  const minX=Math.max(0,Math.floor(p.sx-rpx)), maxX=Math.min(W-1,Math.ceil(p.sx+rpx));
  const minY=Math.max(0,Math.floor(p.sy-rpx)), maxY=Math.min(H-1,Math.ceil(p.sy+rpx));
  const inv=1/rpx;
  /* Top-lit/underside-dark shading is still normalised by THIS lobe's own
     screen radius `inv` — so a big, near, prominent puff gets a broad
     contrast band and a small, distant one gets a tight band, which is
     the scale-appropriate look the flat lane-wide gradient lost. The only
     change from the original is the CENTRE: it is `laneSY`, the smooth
     lane's own screen row, not this lobe's own wobbled `p.sy`. Neighbouring
     lobes on the same run of spine share nearly the same laneSY, so they
     agree on where "up" is inside the shared cluster and the seam between
     them disappears; lobes on a genuinely different, crossing part of the
     coil keep their own lane centre and are free to shade differently,
     which is correct — they are different surfaces. */
  for(let y=minY;y<=maxY;y++){
    const o=y*W, dy=(y+0.5-p.sy)*inv;
    const shadeRow=body-clamp((y+0.5-L.laneSY)*inv,-1,1)*cl.formShade;
    for(let x=minX;x<=maxX;x++){
      const dx=(x+0.5-p.sx)*inv;
      const d2=dx*dx+dy*dy;
      if(d2>1) continue;
      const shade=shadeRow;
      /* A rim hardened by `edge` keeps the silhouette graphic without
         turning into an outline. */
      const cov=smooth((1-Math.sqrt(d2))/Math.max(0.001,cl.edge));
      const i=o+x;
      lum[i]=lerp(lum[i],clamp(shade,0,1),cov);
      /* Clouds use a three-level gradient in 2-bit mode: dark, middle,
         light. Reserve slot 2 for explicit sign colour, never cloud tone. */
      twoBitSlot[i]=-2;
      /* Record where the cloud is, and how far away, so the pole can be
         occluded by material that is genuinely in front of it. */
      if(cov>0.5&&p.depth<dep[i]) dep[i]=p.depth;
    }
  }
}

/* ======================================================================
   PRIMITIVES — sign geometry
   ==================================================================== */
function fillTriangle(x0,y0,x1,y1,x2,y2,tone,slot=-1){
  const minY=Math.max(0,Math.floor(Math.min(y0,y1,y2)));
  const maxY=Math.min(H-1,Math.ceil(Math.max(y0,y1,y2)));
  for(let y=minY;y<=maxY;y++){
    const cy=y+0.5;
    const xs=[];
    const edges=[[x0,y0,x1,y1],[x1,y1,x2,y2],[x2,y2,x0,y0]];
    for(const [ax,ay,bx,by] of edges){
      if((ay<=cy&&by>cy)||(by<=cy&&ay>cy)) xs.push(ax+(cy-ay)/(by-ay)*(bx-ax));
    }
    if(xs.length<2) continue;
    xs.sort((a,b)=>a-b);
    const xa=Math.max(0,xs[0]), xb=Math.min(W,xs[xs.length-1]);
    const i0=Math.floor(xa), i1=Math.ceil(xb)-1, o=y*W;
    for(let x=i0;x<=i1;x++) { lum[o+x]=tone; twoBitSlot[o+x]=slot; }
  }
}
function stampDisc(cx,cy,r,tone,slot=-1){
  const minX=Math.max(0,Math.floor(cx-r)), maxX=Math.min(W-1,Math.ceil(cx+r));
  const minY=Math.max(0,Math.floor(cy-r)), maxY=Math.min(H-1,Math.ceil(cy+r));
  for(let y=minY;y<=maxY;y++){
    const o=y*W;
    for(let x=minX;x<=maxX;x++){
      const dx=x+0.5-cx, dy=y+0.5-cy;
      if(dx*dx+dy*dy<=r*r) { lum[o+x]=tone; twoBitSlot[o+x]=slot; }
    }
  }
}
/* Depth-tested disc: only writes where the cloud recorded at that pixel is
   FARTHER than this. That is what lets a near coil pass in front of the
   pole instead of the pole floating over the whole scene. */
function stampDiscDepth(cx,cy,r,tone,depth){
  const minX=Math.max(0,Math.floor(cx-r)), maxX=Math.min(W-1,Math.ceil(cx+r));
  const minY=Math.max(0,Math.floor(cy-r)), maxY=Math.min(H-1,Math.ceil(cy+r));
  for(let y=minY;y<=maxY;y++){
    const o=y*W;
    for(let x=minX;x<=maxX;x++){
      const dx=x+0.5-cx, dy=y+0.5-cy;
      if(dx*dx+dy*dy>r*r) continue;
      const i=o+x;
      if(dep[i]<depth) continue;
      lum[i]=tone;
    }
  }
}

function thickLine(x0,y0,x1,y1,width,tone,slot=-1){
  const len=Math.hypot(x1-x0,y1-y0);
  const steps=Math.max(1,Math.ceil(len/Math.max(0.4,width*0.5)));
  for(let i=0;i<=steps;i++){
    const t=i/steps;
    stampDisc(lerp(x0,x1,t),lerp(y0,y1,t),width*0.5,tone,slot);
  }
}

/* ======================================================================
   SKY
   ==================================================================== */
function drawSky(){
  dep.fill(Infinity);
  /* Slot assignments are frame-local. Without clearing them here, the
     2-bit sign outline leaves palette-slot trails when the pole sways. */
  twoBitSlot.fill(-1);
  const bg=CFG.bg;
  /* A vertical gradient from the top of the frame down to `endY`, below
     which the sky holds `bottomTone`. The ramp start is the top edge by
     definition, so only its end has to be authored. */
  const endY=Math.max(1,bg.endY);
  for(let y=0;y<H;y++){
    const o=y*W, by=y/S;
    const tone=lerp(bg.topTone,bg.bottomTone,clamp(by/endY,0,1));
    for(let x=0;x<W;x++) lum[o+x]=clamp(tone+grain(x/S,by)*bg.grain,0,1);
  }
}

/* ======================================================================
   SIGN + POLE — drawn last, untouched by the drain
   ==================================================================== */
function drawSign(t){
  const sg=CFG.sign, pl=CFG.pole;
  const sway=pl.swayAmp?Math.sin(t*pl.swaySpeed)*pl.swayAmp*(Math.PI/180):0;

  /* The pole's foot is the drain's own axis, projected — so the sign stands
     in the same space as the cloud instead of being placed by eye. */
  const foot=project(0,CFG.spiral.topY-CFG.spiral.depth*sg.footDepth,0);
  const footX=foot?foot.sx:BASE_W*0.5*S, footY=foot?foot.sy:BASE_H*0.7*S;

  const rot=(x,y)=>{
    const dx=x-footX, dy=y-footY;
    const cs=Math.cos(sway), sn=Math.sin(sway);
    return [footX+dx*cs-dy*sn, footY+dx*sn+dy*cs];
  };

  const halfBase=sg.size*0.56*S, height=sg.size*S;
  const apexY=sg.topY*S;
  const [ax,ay]=rot(footX,apexY);
  const [blx,bly]=rot(footX-halfBase,apexY+height);
  const [brx,bry]=rot(footX+halfBase,apexY+height);
  const [px,py]=rot(footX,footY);

  /* The pole is drawn in WORLD space, sampled down its length, so each
     step carries its own depth and the cloud can occlude the part of it
     that is genuinely behind material. The sign itself stays above the
     cloud and is drawn without a depth test. */
  const topWorldY=CFG.spiral.topY+sg.poleTop;
  const botWorldY=CFG.spiral.topY-CFG.spiral.depth*sg.footDepth;
  const steps=Math.max(8,Math.round(Math.abs(topWorldY-botWorldY)));
  for(let i=0;i<=steps;i++){
    const wy=lerp(topWorldY,botWorldY,i/steps);
    const q=project(0,wy,0);
    if(!q) continue;
    const [qx,qy]=rot(q.sx,q.sy);
    stampDiscDepth(qx,qy,Math.max(0.5,pl.width*S*0.5),pl.tone,q.depth);
  }
  /* Close the gap between the pole's top and the sign's base, which sits
     in screen space rather than in the world. */
  const topProj=project(0,topWorldY,0);
  if(topProj){ const [tx,ty]=rot(topProj.sx,topProj.sy); thickLine(tx,ty,(blx+brx)*0.5,bly,pl.width*S,pl.tone); }

  /* In 2-bit mode slot 2 is reserved for the sign's printed structure:
     the outer warning border and the pictogram. The face clears the slot
     again so only the outline remains assigned to it. */
  fillTriangle(ax,ay,blx,bly,brx,bry,sg.tone,2);

  const inset=sg.stroke*S/height;
  const cxA=(ax+blx+brx)/3, cyA=(ay+bly+bry)/3;
  const iax=lerp(ax,cxA,inset*2.1), iay=lerp(ay,cyA,inset*2.1);
  const iblx=lerp(blx,cxA,inset*1.6), ibly=lerp(bly,cyA,inset*1.6);
  const ibrx=lerp(brx,cxA,inset*1.6), ibry=lerp(bry,cyA,inset*1.6);
  fillTriangle(iax,iay,iblx,ibly,ibrx,ibry,sg.faceTone);

  /* PICTOGRAM — a hand reaching upward, printed on the face. Drawn in sign
     coordinates so a sway carries it along; never a real hand in the world.
     Proportions are relative to the face so it stays legible at every
     authoring grid. */
  const faceH=ibly-iay;
  const faceCX=(iax+iblx+ibrx)/3;
  const handH=faceH*sg.pictogramScale;
  const wristY=iay+faceH*0.86;
  const palmTopY=wristY-handH*0.42;
  const armW=Math.max(1.2,handH*0.17);
  thickLine(faceCX,wristY,faceCX,palmTopY,armW,sg.pictogramTone,2);
  const fingerLen=handH*0.42, fingerW=Math.max(1,armW*0.72);
  for(const [spread,rise] of [[-0.62,0.78],[-0.22,1],[0.22,1],[0.62,0.78]]){
    thickLine(faceCX,palmTopY,faceCX+fingerLen*spread,palmTopY-fingerLen*rise,fingerW,sg.pictogramTone,2);
  }
}

/* ======================================================================
   FRAME
   ==================================================================== */
function renderFrame(t){
  const time=t??elapsed;
  drawSky();
  buildLobes(time);
  for(const L of lobes) drawLobe(L);
  drawSign(time);
  dither();
}

function dither(){
  const palette=CFG.render||{paletteMode:'1-bit'};
  for(let y=0;y<H;y++){
    const row=(y&7)<<3, o=y*W;
    for(let x=0;x<W;x++){
      const i=o+x;
      const threshold=BAYER[row|(x&7)];
      if(palette.paletteMode==='2-bit'){
        const slot=twoBitSlot[i];
        if(slot>=0) buf32[i]=[CINK,CMID,CACC,CPAP][Math.min(3,slot)];
        else {
          const scaled=clamp(lum[i],0,1)*3, base=Math.floor(scaled), fraction=scaled-base;
          const index=slot===-2
            ? (() => { const levels=clamp(lum[i],0,1)*2, lower=Math.floor(levels), part=levels-lower;
                return [0,1,3][Math.min(2,lower+(part*64>threshold+.5?1:0))]; })()
            : Math.min(3,base+(fraction*64>threshold+.5?1:0));
          buf32[i]=[CINK,CMID,CACC,CPAP][index];
        }
      }else buf32[i]=lum[i]*64>threshold+.5?CPAP:CINK;
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
if(typeof ResizeObserver!=='undefined') new ResizeObserver(fitCanvas).observe(stage);

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
  refresh(){const p=CFG.render||{dark:CFG.ink,middle:CFG.paper,light:CFG.paper,accent:CFG.paper};CINK=packColor(p.dark);CMID=packColor(p.middle);CPAP=packColor(p.light);CACC=packColor(p.accent);renderFrame(elapsed);},
  update:rebuild, rebuild, png,
  toggle:function(){
    const shouldRun=playback.toggleManual();
    if(shouldRun) startDriver(); else driverActive=false;
    return !shouldRun;
  },
  pause:function(){ playback.pauseManual(); driverActive=false; },
  play:function(){ if(playback.playManual()) startDriver(); },
  /* `run(sec)` jumps the clock without drawing every frame between — the
     way to check that the scene at ten minutes is the scene at ten
     seconds, which is the failure the previous version had. */
  run:function(sec){ elapsed+=sec; renderFrame(elapsed); return elapsed; },
  state:function(){ return { elapsed:+elapsed.toFixed(2), lobes:lobes.length }; } };
})();
