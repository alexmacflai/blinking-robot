import { createPlaybackState } from '../../shared/playback.js';

(function(){
"use strict";

/* ========================================================================
   BLINKING ROBOT — passing legs

   The camera lies on the floor, looking along it. Legs walk past in formal
   trousers and shoes, in four depth ranks, and never stop. Nobody arrives,
   nobody is recognised, nothing happens.

   THERE IS NOTHING ABOVE THE KNEE. No torso, no coat, no hip — the frame is
   cropped so that every rank's hip is above the top edge, and what walks
   through is a pair of trousers and a shoe. That crop is not a look, it is the
   constraint the focal length is solved against: see `cam` below.

   RENDER PIPELINE — the house discipline: compose the whole scene as
   CONTINUOUS luminance in a Float32 buffer, then threshold the finished
   composite once through an ordered Bayer 8x8 matrix. One dither pass means
   every surface is quantised on the same lattice and the frame reads as a
   single screen-print rather than a stack of pre-dithered parts.

   GEOMETRY is a real one-point perspective, but only just. The camera sits at
   CAM.height above the floor with a horizontal axis, so the floor plane images
   as a single horizontal line — the horizon — and every walker at depth d is
   drawn at a uniform scale of focal/d pixels per metre. Within a rank there is
   no perspective at all; between ranks there is nothing but scale. That is the
   whole projection.

   THE FRAME DOES THE CROPPING. The focal length is not chosen for a look — it
   is solved, so that the HIP of the farthest and shortest walker still sits
   above the top edge:

       scale >= horizon / (hip * (1 - height variation) - camera height)

   Below that value a rank sprouts a waist, and a waist with nothing above it
   reads as an amputation rather than as a crop. If you change `cam.focal`, the
   rank depths, `fig.hip` or `fig.vary`, check that every rank's hip y is still
   negative — the controls page prints it.

   NO CYCLE. Unlike the windmill and the coffee, this postcard does not loop.
   Walkers are spawned at a randomised cadence, cross, and are destroyed. There
   is no period to return to and nothing accumulates, so there is nothing to
   drift. `warmup()` runs the traffic for half a minute before the first
   visible frame, or the postcard would open on an empty floor.

   RESOLUTION INDEPENDENCE — the only authored pixel quantities are `horizon`
   and `focal`, both against a BASE 234x416 grid and multiplied by S at build
   time. Everything else in CFG is in METRES and is converted by the projection,
   so the scene cannot drift out of agreement with itself at another grid size.
   ===================================================================== */

const BASE_W=234, BASE_H=416;

const CFG=window.LEGS_VALUES;

/* ---------- helpers --------------------------------------------------- */
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
const lerp=(a,b,t)=>a+(b-a)*t;
function smooth(x){ const t=clamp(x,0,1); return t*t*(3-2*t); }

/* Deterministic noise, added to TONE only — never to the palette or the
   lattice. A smooth ramp thresholded through an ordered matrix produces long
   straight bands, which on the floor read as scan lines rather than as a
   surface. */
function grain(x,y){
  const n=Math.sin(x*12.9898+y*78.233)*43758.5453;
  return (n-Math.floor(n))-0.5;
}

/* The traffic is random but not arbitrary: one seeded stream means a given
   build always produces the same crowd, which is what makes a change to the
   gait or the ranks observable rather than lost in the noise. */
let rngState=0x9e3779b9;
function rnd(){
  rngState|=0; rngState=(rngState+0x6D2B79F5)|0;
  let t=Math.imul(rngState^(rngState>>>15),1|rngState);
  t=(t+Math.imul(t^(t>>>7),61|t))^t;
  return ((t^(t>>>14))>>>0)/4294967296;
}
const rrange=(a,b)=>a+(b-a)*rnd();

/* Sentinel luminance for the hard floor band — always below every gate's
   `lim` and always below the dither threshold, so it reads as solid ink
   unconditionally and is immune to separation rims painted through the
   silhouette gate below (see capT/quad). */
const FLOOR=-1;

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
let lum,img,buf32,CINK,CPAP;
let HOR;                 // horizon, in grid pixels
let FLOORY;               // y where the nearest rank's soles touch — top of the hard floor band
let SEPW;                // separation width, in grid pixels
let ranks=[];            // { d, tone, sepTone, sc, halfW, gap, right, walkers, tNext }

const cv=document.getElementById('c');
const ctx=cv.getContext('2d',{alpha:false});

function build(){
  const K=CFG.gridK;
  W=9*K; H=16*K; S=W/BASE_W;

  cv.width=W; cv.height=H;
  img=ctx.createImageData(W,H);
  buf32=new Uint32Array(img.data.buffer);
  lum=new Float32Array(W*H);
  CINK=packColor(CFG.ink); CPAP=packColor(CFG.paper);

  HOR=CFG.cam.horizon*S;
  SEPW=CFG.sepW*S;

  ranks=CFG.ranks.map(r=>{
    const sc=CFG.cam.focal*S/r.d;      // pixels per metre at this depth
    return { d:r.d, tone:r.tone,
             sepTone:Math.min(0.92, r.tone+CFG.sep),
             sc:sc, halfW:(W*0.5)/sc,
             gap:r.gap, right:r.right,
             walkers:[], tNext:rrange(0,r.gap[1]) };
  });

  /* The floor band starts at the NEAREST rank's contact line, not the
     horizon — everything between the horizon and that line is still air
     (the background gradient), not ground. The nearest rank has the
     largest scale, so its contact point (z=0) sits lowest on screen; that
     is the max, not an arbitrary pick. */
  FLOORY=0;
  for(const R of ranks) FLOORY=Math.max(FLOORY,pyOf(R.sc,0));
}

/* World -> grid. x is lateral metres from the frame's centre line, z is height
   above the floor. Both divide by depth exactly once, in `sc`. */
function pxOf(sc,x){ return W*0.5+sc*x; }
function pyOf(sc,z){ return HOR+sc*(CFG.cam.height-z); }

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

function ellipse(cx,cy,rx,ry,tone,alpha){
  if(alpha===undefined) alpha=1;
  if(rx<=0||ry<=0) return;
  const y0=Math.max(0,Math.floor(cy-ry)), y1=Math.min(H-1,Math.ceil(cy+ry));
  for(let y=y0;y<=y1;y++){
    const u=(y+0.5-cy)/ry; if(u<=-1||u>=1) continue;
    const dx=rx*Math.sqrt(1-u*u);
    span(y,cx-dx,cx+dx,tone,alpha);
  }
}

/* Tapered capsule — the only limb primitive there is. A trouser leg is a
   capsule from hip to knee and another from knee to cuff; a dress shoe is a
   capsule from heel to toe that thins toward the toe.

   `only` is what makes same-rank separation work. When it is undefined the
   capsule simply paints. When it is a rank's tone, the capsule writes ONLY
   over pixels already at or below that tone — that is, over material of its
   own rank or nearer, and never over the background, the floor, or a farther
   rank. Painting a lighter value through that filter puts a rim exactly where
   two silhouettes of one value would otherwise have merged, and nowhere else.
   It costs no bookkeeping: the buffer already knows what is underneath. */
function capT(ax,ay,bx,by,ra,rb,tone,only){
  const rmax=Math.max(ra,rb)+1;
  const x0=Math.max(0,Math.floor(Math.min(ax,bx)-rmax));
  const x1=Math.min(W-1,Math.ceil(Math.max(ax,bx)+rmax));
  const y0=Math.max(0,Math.floor(Math.min(ay,by)-rmax));
  const y1=Math.min(H-1,Math.ceil(Math.max(ay,by)+rmax));
  const dx=bx-ax, dy=by-ay, L2=dx*dx+dy*dy||1;
  const gated=(only!==undefined), lim=gated?only+0.02:0;
  for(let y=y0;y<=y1;y++){
    const o=y*W, cy=y+0.5;
    for(let x=x0;x<=x1;x++){
      const cx=x+0.5;
      let t=((cx-ax)*dx+(cy-ay)*dy)/L2; t=clamp(t,0,1);
      const qx=cx-(ax+dx*t), qy=cy-(ay+dy*t);
      const r=ra+(rb-ra)*t;
      const cov=clamp(r+0.5-Math.sqrt(qx*qx+qy*qy),0,1); if(cov<=0) continue;
      const i=o+x;
      if(gated && (lum[i]>lim || lum[i]<0)) continue;
      lum[i]+=(tone-lum[i])*cov;
    }
  }
}

/* Convex quad, used for the coat column. Same gate as capT. */
function quad(pts,tone,only){
  let ymin=1e9,ymax=-1e9;
  for(const p of pts){ if(p[1]<ymin)ymin=p[1]; if(p[1]>ymax)ymax=p[1]; }
  const y0=Math.max(0,Math.floor(ymin)), y1=Math.min(H-1,Math.ceil(ymax));
  const gated=(only!==undefined), lim=gated?only+0.02:0;
  const xs=[];
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
      if(!gated){ span(y,xs[i],xs[i+1],tone,1); continue; }
      let xa=Math.max(0,xs[i]), xb=Math.min(W,xs[i+1]);
      const o=y*W;
      for(let x=Math.floor(xa);x<Math.ceil(xb);x++){
        const cov=Math.min(x+1,xb)-Math.max(x,xa); if(cov<=0) continue;
        const k=o+x; if(lum[k]>lim || lum[k]<0) continue;
        lum[k]+=(tone-lum[k])*cov;
      }
    }
  }
}

/* ======================================================================
   TRAFFIC
   ==================================================================== */
function spawn(R){
  const g=CFG.gait, f=CFG.fig;
  const dir = rnd()<R.right ? 1 : -1;
  const hs  = 1+f.vary*(rnd()*2-1);
  const phaseSpeed=g.speed*(1+g.vary*(rnd()*2-1));
  /* Each reach owns its own contact pose. Keep the beat fixed and let the
     walker cover the resulting stride at the appropriate horizontal speed. */
  const lead=(g.step*g.duty+g.leadReach)*hs;
  const trail=(g.step*g.duty+g.trailReach)*hs;
  const stride=(lead+trail)/g.duty;
  R.walkers.push({
    x   : -dir*(R.halfW+0.55),
    dir : dir,
    hs  : hs,
    speed: stride*phaseSpeed/(2*g.step),
    phaseSpeed: phaseSpeed,
    step : g.step*hs,
    lead : lead,
    trail : trail,
    stride : stride,
    p   : rnd()
  });
}

function stepWorld(dt){
  for(const R of ranks){
    R.tNext-=dt;
    if(R.tNext<=0){ spawn(R); R.tNext=rrange(R.gap[0],R.gap[1]); }
    for(let i=R.walkers.length-1;i>=0;i--){
      const w=R.walkers[i];
      w.x+=w.dir*w.speed*dt;
      /* One full cycle is two steps. Deriving the period from speed and step
         rather than setting it directly is what keeps the planted foot planted
         instead of skating along the floor. */
      w.p=(w.p+dt*w.phaseSpeed/(2*CFG.gait.step))%1;
      if(Math.abs(w.x)>R.halfW+0.7) R.walkers.splice(i,1);
    }
  }
}

/* ======================================================================
   GAIT

   One cycle is 2*step/speed seconds and the hip advances `stride` = 2*step in
   that time. A stance lasts `duty` of the cycle, during which the hip advances
   2*step*duty and the foot does not move at all.

   `plant(w,p)` returns A: the world x the SOLE occupies for the whole of the
   stance that phase p belongs to, defined so the hip is directly over it at
   mid-stance. Because the hip advances at exactly the rate that cancels the
   phase term, A is constant across a stance — that is the no-slip guarantee,
   and it is a property of the algebra rather than something to tune.
   ==================================================================== */
function rot(x,z,a){ const c=Math.cos(a), s=Math.sin(a); return [x*c-z*s, x*s+z*c]; }

function plant(w,u){ return w.x-w.dir*u*(w.lead+w.trail)+w.dir*w.lead; }

/* The foot as a rigid body: three points in its own frame, measured from the
   sole under the ankle. Heel and toe are SOLE points, which is what the roll
   pivots about; the shoe is drawn from the two raised centreline points. */
function footFrame(w){
  const f=CFG.fig, hs=w.hs;
  const hb=f.heelBack*f.shoeL*hs, tf=(1-f.heelBack)*f.shoeL*hs;
  /* `bl` is the BALL — the metatarsal heads — measured forward from the
     ankle along the sole, and it is the pivot of the forefoot rocker. It is
     derived from `seam2Frac` on purpose: that fraction is where the drawing
     puts the vamp/toe-cap seam, so the joint the shoe bends at and the joint
     the gait rotates about are the same joint by construction, not by two
     numbers that happen to agree. */
  return { hb:hb, tf:tf, bl:-hb+f.shoeL*hs*f.seam2Frac,
           ah:f.ankle*hs, sh:f.shoeH*hs };
}

/* Where the ankle is, and how the foot is tilted, at phase p.
   Returns { x, z, th } in world metres and radians, th>0 = toe up. */
function ankleAt(w,p){
  const g=CFG.gait, F=footFrame(w), dir=w.dir;
  const pushTilt=g.toeDown+g.trailBend;

  if(p<g.duty){
    const u=p/g.duty, A=plant(w,u);
    let th, px_, pz_, lx, lz;
    if(u<g.flat){
      /* Heel strike into foot flat: the heel is the pivot and the toe comes
         down. This is the beat a flat-footed walk cycle is missing. */
      th=g.heelUp*(1-smooth(u/g.flat));
      px_=A-dir*F.hb; pz_=0; lx=dir*F.hb; lz=F.ah;
    } else if(u<g.heelOff){
      th=0; px_=A; pz_=0; lx=0; lz=F.ah;
    } else {
      /* Heel off into toe off — the FOREFOOT ROCKER. The pivot is the BALL
         (F.bl), not the toe tip: a real foot rolls over the metatarsal
         heads while the toes stay flat on the floor in front of them, and
         the whole body of the foot rotates up and away from that line.
         Pivoting on the tip instead would swing the entire sole up about
         its own frontmost point, as one rigid plank with nothing left on
         the ground — which is the single thing that makes a coded walk
         look like a hinged board rather than a foot.

         What stays down in front of the ball is drawn, not simulated: the
         toe cap counter-rotates by exactly this `th` in drawLeg, so it
         lies flat on z=0 from the ball to the tip. */
      th=-pushTilt*smooth((u-g.heelOff)/(1-g.heelOff));
      px_=A+dir*F.bl; pz_=0; lx=-dir*F.bl; lz=F.ah;
    }
    const r=rot(lx,lz,dir*th);
    return { x:px_+r[0], z:pz_+r[1], th:th };
  }

  /* Swing. Both ends are the contact poses the foot must hit exactly, so it
     cannot slip on landing or take off. Their world positions come from the
     stance algebra, not from where the foot happens to be. */
  const s=(p-g.duty)/(1-g.duty);
  const Aprev=w.x-dir*w.stride*(p-g.duty)-dir*w.trail;
  const Anext=w.x+dir*w.stride*(1-p)+dir*w.lead;

  let r=rot(-dir*F.bl,F.ah,dir*(-pushTilt));
  const x0=Aprev+dir*F.bl+r[0], z0=r[1];
  r=rot(dir*F.hb,F.ah,dir*(g.heelUp));
  const x1=Anext-dir*F.hb+r[0], z1=r[1];

  const e=smooth(s);
  return { x:x0+(x1-x0)*e,
           z:z0+(z1-z0)*e + g.clear*w.hs*Math.sin(Math.PI*Math.pow(s,0.72)),
           th:-pushTilt+(g.heelUp+pushTilt)*smooth(Math.min(1,s/0.6)),
           tuck:g.tuck*Math.sin(Math.PI*Math.pow(s,0.6)),
           leadBend:g.leadBend*Math.sin(Math.PI*Math.pow(s,1.7)) };
}

/* ======================================================================
   FIGURE
   ==================================================================== */

/* Two-link solve for the knee. The knee is drawn ANTERIOR — on the side the
   walker is facing — because a leg that bends the other way stops being a leg
   and the whole rank reads as furniture. */
function knee(hx,hz,ax,az,L1,L2,dir){
  let vx=ax-hx, vz=az-hz;
  let d=Math.hypot(vx,vz);
  const dmax=L1+L2-0.004, dmin=Math.abs(L1-L2)+0.004;
  if(d>dmax){ const k=dmax/d; vx*=k; vz*=k; d=dmax; }
  if(d<dmin){ const k=dmin/(d||1e-6); vx*=k; vz*=k; d=dmin; }
  const a=(d*d+L1*L1-L2*L2)/(2*d), h=Math.sqrt(Math.max(0,L1*L1-a*a));
  const ux=vx/d, uz=vz/d;
  return { x:hx+ux*a + dir*h*(-uz), z:hz+uz*a + dir*h*(ux),
           ax:hx+vx, az:hz+vz };
}

/* One leg: thigh, shin, shoe. `only` gates every stroke, so the same function
   draws the silhouette and its separation rim. */
function drawLeg(w,sc,p,hipZ,tone,only,grow){
  const f=CFG.fig, hs=w.hs, dir=w.dir, F=footFrame(w);
  const A=ankleAt(w,p);

  let ax=A.x, az=A.z;
  if(A.tuck || A.leadBend){
    /* Pull the ankle toward the hip early in swing. It is zero at both ends,
       so the contact poses stay exact, and in between it forces the knee to
       flex hard just after toe-off — the beat that reads as walking rather
       than as a leg swinging on a hinge. */
    const bend=clamp(A.tuck+A.leadBend,0,0.45);
    ax=w.x+(ax-w.x)*(1-bend);
    az=hipZ+(az-hipZ)*(1-bend);
  }

  const K=knee(w.x,hipZ,ax,az,f.thigh*hs,f.shin*hs,dir);

  const hpx=pxOf(sc,w.x),  hpy=pyOf(sc,hipZ);
  const kpx=pxOf(sc,K.x),  kpy=pyOf(sc,K.z);
  const apx=pxOf(sc,K.ax), apy=pyOf(sc,K.az);

  const rT=f.rThigh*hs*sc+grow, rK=f.rKnee*hs*sc+grow, rC=f.rCuff*hs*sc+grow;
  capT(hpx,hpy,kpx,kpy,rT,rK,tone,only);

  /* ---- SHOE (computed first: the sock below needs its top-back / top-front
     corners to attach to). Three flat, sharp-edged quads — never a triangle,
     each one a rectangle with exactly one vertex dragged, same as the
     reference: a collar, a vamp, a toe cap. All three live in the FOOT's own
     local frame (x along the sole, z up from it, origin at the ankle) and
     are carried into world space by the exact rotation the roll math already
     computes — `th` — so this is the drawing, not a second physics.

     The load-bearing property: the collar's back-bottom corner (heelX,soleZ)
     and the vamp/toe-cap seam at the sole (seam2X,soleZ) are, after that
     rotation, ALGEBRAICALLY the same points `ankleAt`'s stance branches
     solve the ankle position from (worldHeel = ankleWorld + rot(-dir*hb,
     -ah,th), worldBall = ankleWorld + rot(dir*bl,-ah,th) — the same rot()
     with the same th, and seam2X == dir*F.bl by construction). Those two
     corners are the ones a "moved vertex" may never touch: move any other
     corner and the drawn foot still traces z=0 exactly through heel-strike
     and through the whole forefoot rocker. */
  const th=dir*A.th;
  const growM=grow/sc;
  const heelX=-dir*(F.hb+growM), toeX=dir*(F.tf+growM);
  const soleZ=-F.ah-growM, topZ=soleZ+F.sh+growM;
  const midZ=soleZ+F.sh*f.midFrac+growM, tipZ=soleZ+F.sh*f.tipFrac+growM;
  const seam1X=heelX+(toeX-heelX)*f.seam1Frac;
  const seam2X=heelX+(toeX-heelX)*f.seam2Frac;
  const insetX=(seam1X-heelX)*f.insetFrac;

  /* `EPS` — world metres, so it survives the per-rank projection scale —
     nudges each internal seam's two pieces past each other, the same
     hairline-gap fix as the cuff/sock seam below. */
  const EPS=0.006;
  const seam1A=seam1X+dir*EPS, seam1B=seam1X-dir*EPS;
  const seam2B=seam2X+dir*EPS, seam2C=seam2X-dir*EPS;

  const pt=(lx,lz)=>{ const r=rot(lx,lz,th); return [pxOf(sc,K.ax+r[0]),pyOf(sc,K.az+r[1])]; };

  /* Collar: back-bottom is the exact heel pivot (unmoved); back-top is the
     one moved vertex, inset toward the toe — the slanted back edge the
     reference draws, without touching the pivot. */
  const collarBack =pt(heelX+insetX,topZ), collarFront=pt(seam1A,topZ);
  quad([pt(heelX,soleZ),collarBack,collarFront,pt(seam1A,soleZ)], tone, only);

  /* Vamp: a proper four-cornered quad like the other two — back edge full
     collar height, front edge short but STILL VERTICAL, from soleZ up to
     `midZ`. The moved vertex is the front-top one (dropped to midZ); the
     front-bottom stays on the sole at the same x, so the front reads as a
     real edge. Do not run the bottom out past `seam2B` to meet the toe:
     that turns the front into one long diagonal and the piece stops being
     a quad and reads as a triangle. It is also unnecessary — the toe cap
     hinges about (seam2X,soleZ), a corner this quad already owns, so the
     two can never come apart there however far the toe flexes. */
  quad([pt(seam1B,soleZ),pt(seam1B,topZ),pt(seam2B,midZ),pt(seam2B,soleZ)], tone, only);

  /* Toe cap: continues the taper from `midZ` down to `tipZ` — short and
     blunt, not a point, so this stays a quad like the other two.

     ARTICULATION: this piece hinges at (seam2X,soleZ) — its back-bottom
     corner, the ball of the foot, the SAME point ankleAt rolls the forefoot
     about. Its recovery is a contact constraint, not a phase curve: while
     the unbent toe would penetrate the floor, take the most neutral angle
     that keeps the tip exactly on it. As the ball rises, the tip releases
     immediately at the maximum rate the floor permits; once the neutral toe
     clears, the cap is already straight. `toeHingeAmt` scales that exact
     contact bend (1.0 is full resistance). */
  const ballZ=K.az+rot(seam2X,soleZ,th)[1];
  const toeDX=toeX-seam2X;
  const toeRestZ=K.az+rot(toeX,soleZ,th)[1];
  const toeFloorAng=Math.asin(clamp(-ballZ/toeDX,-1,1));
  const toeWorldAng=toeRestZ>=0 ? th : toeFloorAng;
  const hingeAng=(toeWorldAng-th)*f.toeHingeAmt, hx=seam2X, hz=soleZ;
  const pth=(lx,lz)=>{ const r=rot(lx-hx,lz-hz,hingeAng); return pt(hx+r[0],hz+r[1]); };
  quad([pth(seam2C,soleZ),pth(seam2C,midZ),pth(toeX,tipZ),pth(toeX,soleZ)], tone, only);

  /* Cuff: the shin is a QUAD, not a capsule — straight sides, straight ends.
     The knee joint still reads as round because the thigh capsule above
     ends in its own circular cap at the same point; the shin's flat top
     edge just sits inside it. The shin stops short of the ankle, closed
     with a straight cut, and a second, narrower, constant-width quad — the
     sock — fills the remaining stretch down to the ankle. knee->ankle is
     one straight IK link, so both quads share a perpendicular and meet with
     no seam, only a hard step down in width at the cuff line. */
  const cuffT=clamp(1-f.sockLen/f.shin,0,1);
  const cx=K.x+(K.ax-K.x)*cuffT, cz=K.z+(K.az-K.z)*cuffT;
  const cpx=pxOf(sc,cx), cpy=pyOf(sc,cz);
  const ndx=apx-kpx, ndy=apy-kpy, nlen=Math.hypot(ndx,ndy)||1;
  const px_=-ndy/nlen, py_=ndx/nlen;
  const dux=ndx/nlen, duy=ndy/nlen;

  /* Two separately-rasterised quads that share an edge can leave a hairline
     gap where the scanline fill rounds each one's boundary differently.
     Overlap them by a fraction of a pixel along the leg instead of butting
     them exactly — same tone on both sides, so the overlap itself is
     invisible, but it kills the seam. */
  const OVERLAP=1.5*S;

  quad([[kpx-px_*rK,kpy-py_*rK],[kpx+px_*rK,kpy+py_*rK],
        [cpx+px_*rC+dux*OVERLAP,cpy+py_*rC+duy*OVERLAP],
        [cpx-px_*rC+dux*OVERLAP,cpy-py_*rC+duy*OVERLAP]], tone, only);

  /* Straight, constant width, same orientation as the shin above it — the
     sock does NOT rotate with the foot's roll (`th`); it is trouser, not
     foot. It runs from the cuff to the ankle point along the leg's own
     perpendicular (`px_,py_`, `dux,duy` — the same basis the cuff quad
     above uses).

     The collar it must meet DOES rotate with `th` and can sit a real
     distance from the ankle point (not a rasterisation hairline) once the
     foot rolls, so the ankle end reaches past the ankle by `f.sockReach`
     — a real margin, not the sub-pixel OVERLAP used for seams between two
     quads that share a frame. This end of the sock is the one place it is
     allowed to overlap the collar rather than butt against it exactly. */
  const rS=f.rSock*hs*sc+grow;
  const reach=f.sockReach*sc;
  quad([[cpx-px_*rS-dux*OVERLAP,cpy-py_*rS-duy*OVERLAP],
        [cpx+px_*rS-dux*OVERLAP,cpy+py_*rS-duy*OVERLAP],
        [apx+px_*rS+dux*reach,apy+py_*rS+duy*reach],
        [apx-px_*rS+dux*reach,apy-py_*rS+duy*reach]], tone, only);
}

function drawWalker(w,R){
  const sc=R.sc, g=CFG.gait;
  /* One hip for two legs. The bob is at twice the step frequency: lowest at
     each double support, highest at mid-stance. It is not decoration — without
     the drop the trailing leg cannot reach the end of its own stride. */
  const hipZ=CFG.fig.hip*w.hs - g.bob*w.hs*(0.5+0.5*Math.cos(4*Math.PI*w.p));
  const pA=w.p, pB=(w.p+0.5)%1;

  /* Order is load-bearing. The separation pass runs first, over both legs, so
     it can only touch walkers of this rank already drawn; then the far leg;
     then a second separation pass under the near leg alone, so a walker's own
     legs stay two legs. */
  drawLeg(w,sc,pA,hipZ,R.sepTone,R.tone,SEPW);
  drawLeg(w,sc,pB,hipZ,R.sepTone,R.tone,SEPW);

  drawLeg(w,sc,pA,hipZ,R.tone,undefined,0);

  drawLeg(w,sc,pB,hipZ,R.sepTone,R.tone,SEPW);
  drawLeg(w,sc,pB,hipZ,R.tone,undefined,0);
}

/* ======================================================================
   GROUND
   ==================================================================== */
function drawBackground(){
  const bg=CFG.bg;
  const y1=Math.floor(HOR);
  for(let y=0;y<y1;y++){
    const base=lerp(bg.top,bg.bottom,smooth(y/HOR));
    spanF(y,0,W,(x,cy)=>base+grain(x,cy)*bg.grain,1);
  }
}

/* Between the horizon and the nearest rank's contact line — both move
   independently, so this is just whatever gap they leave, filled flat. */
function drawGround(){
  const gr=CFG.ground;
  const y0=Math.max(0,Math.floor(HOR)), y1=Math.floor(FLOORY);
  for(let y=y0;y<y1;y++) spanF(y,0,W,(x,cy)=>gr.tone+grain(x,cy)*gr.grain,1);
}

function drawFloor(){
  for(let y=Math.floor(FLOORY);y<H;y++){
    const o=y*W;
    for(let x=0;x<W;x++) lum[o+x]=FLOOR;
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
      buf32[i] = lum[i]*64 > BAYER[row|(x&7)]+0.5 ? CPAP : CINK;
    }
  }
  ctx.putImageData(img,0,0);
}

/* ======================================================================
   FRAME — back to front, rank by rank
   ==================================================================== */
function renderFrame(){
  lum.fill(1.0);
  drawBackground();
  drawGround();
  drawFloor();
  for(let i=ranks.length-1;i>=0;i--){
    const R=ranks[i];
    for(const w of R.walkers) drawWalker(w,R);
  }
  dither();
}

/* ======================================================================
   DRIVER
   ==================================================================== */
const DT=1/60;
let acc=0,last=0,driverActive=false,rafSeen=false;
const playback=createPlaybackState();
const isPaused=()=>playback.isPaused();
const loadEl=document.getElementById('load');

/* There is no cycle to seek to, so the opening frame is simply the traffic
   half a minute in. Without this the postcard opens on an empty floor and
   fills up, which is a beginning — and this scene must not have one. */
function warmup(){ for(let i=0;i<30*60;i++) stepWorld(DT); }

/* The stage can measure zero for an arbitrarily long time — inside a gallery
   iframe, or a pane that has not been rendered yet — and neither `resize` nor
   ResizeObserver is guaranteed to fire when it finally has a size. So the fit
   is driven from the render loop instead of from an event, and this guard is
   what makes that cheap: everything below runs only when the stage has
   actually changed size. */
let fitW=-1, fitH=-1;
function fitCanvas(){
  const st=document.getElementById('stage');
  const availW=st.clientWidth, availH=st.clientHeight;
  if(availW===fitW && availH===fitH) return;
  fitW=availW; fitH=availH;
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
  if(isPaused()) return;
  fitCanvas();
  const n=(now===undefined)?performance.now():now;
  let dtr=(n-last)/1000; last=n;
  if(dtr>0.25) dtr=0.25;
  acc+=dtr; while(acc>=DT){ stepWorld(DT); acc-=DT; }
  renderFrame();
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
/* A plain resize listener is not enough. The stage can still have zero height
   when this script first runs — inside a gallery iframe, or a pane that lays
   out after load — and fitCanvas() would then lock the postcard to 9x16 CSS
   pixels with no later resize event to rescue it. */
if(typeof ResizeObserver!=='undefined') new ResizeObserver(fitCanvas).observe(document.getElementById('stage'));

build();
warmup();
fitCanvas(); renderFrame();
loadEl.remove();
startDriver();

/* Console handle. `run(sec)` advances the traffic without drawing, which is
   how you look for a crossing rather than waiting for one. */
function rebuild(){ build(); warmup(); fitCanvas(); renderFrame(); }
function png(){ const a=document.createElement('a'); a.download='passing-legs-'+W+'x'+H+'.png'; a.href=cv.toDataURL('image/png'); a.click(); }
window.__legs={ CFG:CFG,
  fit:fitCanvas, render:renderFrame, refresh:rebuild, update:renderFrame, rebuild, png,
  toggle:function(){
    const shouldRun=playback.toggleManual();
    if(shouldRun) startDriver(); else driverActive=false;
    return !shouldRun;
  },
  run:function(sec){ for(let i=0;i<Math.round(sec*60);i++) stepWorld(DT); renderFrame(); },
  pause:function(){ playback.pauseManual(); driverActive=false; },
  play:function(){ if(playback.playManual()) startDriver(); },
  state:function(){ return ranks.map(R=>({d:R.d,tone:R.tone,n:R.walkers.length,
                                          x:R.walkers.map(w=>+w.x.toFixed(2))})); } };
})();
