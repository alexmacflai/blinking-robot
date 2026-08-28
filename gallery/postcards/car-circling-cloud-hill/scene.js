import { createPlaybackState } from '../../shared/playback.js';

(function(){
"use strict";

/* ========================================================================
   BLINKING ROBOT — car circling a cloud-covered hill

   A rounded hill standing between two layers of cloud. One road wraps it:
   up out of the hidden rear, past a small house, over the summit, and down
   the front face toward the viewer. Cars travel that road, appear over the
   shoulder, cross the top, come down the front, and are gone into the near
   cloud. Nothing else moves.

   OCCLUSION IS THE SUBJECT, so it is geometry rather than draw order. The
   hill, the road, the house and the cars are real world-space forms put
   through ONE perspective camera and resolved by a DEPTH BUFFER. A car on
   the far side of the hill is hidden because the hill is genuinely in front
   of it, and the far stretch of road is hidden for exactly the same reason:
   the road is a strip offset outward along the hill's own surface normal,
   not a curve drawn onto a finished silhouette. Every acceptance criterion
   about what covers what is satisfied by construction.

   THE HILL IS A FLAT MASS. It is a surface of revolution, but it is not
   shaded as a dome: tone is near-constant with the fall-off pushed out to
   the silhouette. The road is the only mark on the hill, and a dome
   gradient banded by the dither would compete with it. This is the coffee
   postcard's "flat mass so a mark can only mean one thing", reused under
   its own conditions.

   THE CLOUDS ARE FIELDS, not objects — four two-dimensional lobed banks in
   the windmill's manner: exactly two behind the hill and exactly two in
   front. Each front bank has its own hard group-level transparency mask across
   the upper part of the cloud group, so the hill and cars remain visible
   through it. Back banks are drawn
   before the hill; front banks are drawn after the cars. Their drift is
   interpolated from the global minimum wind at the rear to the maximum wind
   at the front.

   NOTHING ACCUMULATES. The hill, road, house and smoke are static and are
   baked once at build time into a luminance/depth/coverage layer. Only the
   cars and cloud drift are evaluated per frame, and the
   cars' position is a phase wrapped into a fixed span, so the scene at an
   hour is the scene at ten seconds.

   RENDER PIPELINE — the house discipline: compose the whole scene as
   CONTINUOUS luminance in a Float32 buffer, then threshold the finished
   composite once through an ordered Bayer 8x8 matrix, so hill, cars and
   cloud are quantised on one lattice and read as a single screen-print.

   RESOLUTION INDEPENDENCE — authored against a BASE 234x416 grid and
   multiplied by S at build time, matching the other postcards. World
   quantities are in hill units and are converted by the projection.
   ===================================================================== */

const BASE_W=234, BASE_H=416;

const CFG=window.HILL_VALUES;

/* ---------- helpers --------------------------------------------------- */
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
const lerp=(a,b,t)=>a+(b-a)*t;
function smooth(x){ const t=clamp(x,0,1); return t*t*(3-2*t); }

function grain(x,y){
  const n=Math.sin(x*12.9898+y*78.233)*43758.5453;
  return (n-Math.floor(n))-0.5;
}

function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;
  var t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;
  return((t^t>>>14)>>>0)/4294967296}}

/* Car identity is hashed from a WRAP COUNT, so the procession keeps
   producing different cars without anything growing without bound: the
   index is reduced modulo PERIOD before it is hashed. */
const PERIOD=512;
function hash1(i,salt){
  const w=((i%PERIOD)+PERIOD)%PERIOD;
  let h=Math.imul(w,374761393)+Math.imul(salt,668265263);
  h=Math.imul(h^(h>>>13),1274126177);
  return ((h^(h>>>16))>>>0)/4294967296;
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
let lum,dep,twoBitSlot,img,buf32,CINK,CMID,CPAP,CACC;
let frontCloudLayers=[];
let HL,HD,HC,HS;          // baked static layer: lum, depth, coverage, slot
let bankA;                // scratch coverage for a puff bank
let BANKS=[];
let CAM_X,CAM_Y,CAM_Z;    // camera position in world, for facing ratios
let CHIMNEY_TOP=null;     // world-space chimney mouth, set by bakeHouse, read by drawSmoke

const cv=document.getElementById('c');
const ctx=cv.getContext('2d',{alpha:false});

function build(){
  const K=CFG.gridK;
  W=9*K; H=16*K; S=W/BASE_W;
  cv.width=W; cv.height=H;
  img=ctx.createImageData(W,H);
  buf32=new Uint32Array(img.data.buffer);
  lum=new Float32Array(W*H);
  dep=new Float32Array(W*H);
  twoBitSlot=new Int8Array(W*H);
  frontCloudLayers=CFG.banks.filter(b=>b.front).map(()=>({
    pixels:new Float32Array(W*H), mask:new Float32Array(W*H)
  }));
  HL=new Float32Array(W*H);
  HD=new Float32Array(W*H);
  HC=new Uint8Array(W*H);
  HS=new Int8Array(W*H);
  bankA=new Float32Array(W*H);
  const palette=CFG.render||{paletteMode:'1-bit',dark:CFG.ink,middle:CFG.paper,light:CFG.paper,accent:CFG.paper};
  CINK=packColor(palette.dark); CMID=packColor(palette.middle); CPAP=packColor(palette.light); CACC=packColor(palette.accent);
  buildBanks();
  bakeStatic();
}

/* ======================================================================
   CAMERA — in front of the hill and a little above its foot
   ==================================================================== */
function project(x,y,z){
  const cam=CFG.cam;
  /* The camera sits `up` above the hill's base plane and `back` in front of
     its axis, pitched to look at the base centre. Pitch is derived from the
     position rather than authored separately, so the two controls cannot
     contradict each other and the hill can never drift out of the frame. */
  const px=x, py=y-cam.up, pz=z+cam.back;
  const pitch=Math.atan2(cam.up,Math.max(1,cam.back));
  const cp=Math.cos(pitch), sp=Math.sin(pitch);
  const yv=py*cp+pz*sp;
  const zv=-py*sp+pz*cp;
  if(zv<=1) return null;
  const k=cam.focal/zv;
  return { sx:(BASE_W*0.5+cam.offX+px*k)*S, sy:(cam.horizon-yv*k)*S, k:k, dep:zv };
}
function cameraPos(){
  /* The camera looks along its own pitched axis from (0, up, -back).
     Only its position is needed here, for facing ratios. */
  CAM_X=0; CAM_Y=CFG.cam.up; CAM_Z=-CFG.cam.back;
}

/* ======================================================================
   THE HILL — a surface of revolution, y = f(r)
   ==================================================================== */
/* `flank` steepens the sides, `crown` rounds the top. Together they give
   the sketch's shape: a soft dome sitting on near-vertical flanks that go
   straight into the cloud, with no visible ground anywhere. */
function hillY(rho){
  const h=CFG.hill;
  const u=clamp(rho,0,1);
  const inner=Math.max(0,1-Math.pow(u,Math.max(0.2,h.flank)));
  return h.height*Math.pow(inner,Math.max(0.05,h.crown));
}
/* dy/drho, clamped — the analytic slope is infinite at the foot. */
function hillSlope(rho){
  const e=0.002;
  const a=hillY(clamp(rho-e,0,1)), b=hillY(clamp(rho+e,0,1));
  return clamp((b-a)/(2*e),-4000,4000);
}
/* World point and outward surface normal at (rho, theta).
   theta 0 faces the camera; theta PI is the hidden rear. */
function surface(rho,theta){
  const R=CFG.hill.radius;
  const r=rho*R, y=hillY(rho);
  const sn=Math.sin(theta), cs=Math.cos(theta);
  const x=r*sn, z=-r*cs;
  /* n = (-df/dr * radial) + up, normalised. df/dr = (dy/drho)/R. */
  const dfdr=hillSlope(rho)/R;
  let nx=-dfdr*sn, ny=1, nz=dfdr*cs;
  if(rho<1e-4){ nx=0; ny=1; nz=0; }
  const len=Math.hypot(nx,ny,nz)||1;
  return { x:x, y:y, z:z, nx:nx/len, ny:ny/len, nz:nz/len };
}

/* ======================================================================
   THE ROAD — one continuous path over the hill

   Parameter s runs -1 (foot, rear) .. 0 (summit) .. +1 (foot, front).
   Distance from the axis is a SMOOTHED |s|, so the crossing at the summit
   is a rounded arc rather than a hairpin; azimuth is swept between the
   rear and front bearings with an easing that spends most of its turn on
   the hidden half. That is what leaves the front descent running nearly
   straight down toward the viewer while the climb wraps out of sight.
   ==================================================================== */
function roadRho(s){
  const rd=CFG.road;
  /* At summitRound 0 this is exactly |s| — rho advances at a constant
     rate, so a car moving at constant ds/dt covers the road at a steady
     pace with NO stall anywhere, including at the crest. Any positive
     summitRound rounds the crest crossing by flattening rho near s=0,
     and that flattening is precisely a stall: d(rho)/ds falls to zero
     there, so the car creeps for a long real-time stretch either side of
     the top however fast `car.speed` is set. Rounding the crest and
     moving at a constant pace are the same knob pulling opposite ways;
     0 is the setting that keeps the motion honest.

     The apex needs no rounding anyway. Both halves pass through rho=0 on
     opposite bearings, so the world path runs straight through the axis
     with a continuous tangent, and hillY'(0)=0 makes the vertical
     component continuous too — the cusp is in rho only, not in space. */
  const e=Math.max(0,rd.summitRound);
  const soft=e>0 ? (Math.sqrt(s*s+e*e)-e)/(Math.sqrt(1+e*e)-e) : Math.abs(s);
  return rd.summitRho+(1-rd.summitRho)*clamp(soft,0,1);
}
function roadTheta(s){
  /* Exactly two constants. No easing, no sweep, no interpolation of any
     kind — that is the whole fix. The road is ONE straight line laid
     across the hill's central axis: the front half sits at `frontBearing`,
     the back half sits at the diametrically opposite bearing (+180°), and
     the two meet at the crest where rho is smallest. Because rho shrinks
     to (almost) zero there, the two halves converge to (almost) the same
     point despite the bearing itself stepping discontinuously — there is
     no turn to see because there is no turn: a car on either half holds
     one fixed heading for the entire half, and the two halves are mirror
     images of each other through the hill's axis, not a curve joining
     them. This is also the only shape consistent with "wraps the surface
     from one bottom to the other, no turns" — anything that eases between
     two different bearings, however briefly, is a turn.

     Two earlier shapes were wrong. Sweeping azimuth across the whole
     path put a real bend in the one stretch that stays on screen the
     whole time. Finishing that sweep early, on the climb, before the
     crest, was also wrong on inspection — the swept arc travels at
     close to the hill's own base radius, where the hill has ~zero
     height, so large parts of ANY swept path are simply not behind the
     hill's bulk, regardless of where the sweep is timed to finish. Two
     fixed bearings sidesteps that entirely: there is no arc to expose. */
  const rd=CFG.road;
  return s>=0 ? rd.frontBearing : rd.frontBearing+Math.PI;
}
function roadPoint(s){
  const P=surface(roadRho(s),roadTheta(s));
  const lift=CFG.road.lift;
  return { x:P.x+P.nx*lift, y:P.y+P.ny*lift, z:P.z+P.nz*lift,
           nx:P.nx, ny:P.ny, nz:P.nz };
}
/* Frame at s: position, unit tangent, unit normal, unit side. */
function roadFrame(s){
  const e=0.004;
  const P=roadPoint(s);
  const A=roadPoint(Math.max(-1.6,s-e)), B=roadPoint(Math.min(1.6,s+e));
  let tx=B.x-A.x, ty=B.y-A.y, tz=B.z-A.z;
  const tl=Math.hypot(tx,ty,tz)||1; tx/=tl; ty/=tl; tz/=tl;
  /* side = tangent x normal, so it stays in the hill's surface. */
  let bx=ty*P.nz-tz*P.ny, by=tz*P.nx-tx*P.nz, bz=tx*P.ny-ty*P.nx;
  const bl=Math.hypot(bx,by,bz)||1; bx/=bl; by/=bl; bz/=bl;
  return { p:P, tx:tx,ty:ty,tz:tz, nx:P.nx,ny:P.ny,nz:P.nz, bx:bx,by:by,bz:bz };
}

/* ======================================================================
   RASTERISER — depth-buffered triangles into whichever layer is current
   ==================================================================== */
let RT_LUM=null, RT_DEP=null, RT_COV=null, RT_SLOT=null, RT_TEST=true, RT_WRITE=true;
function target(l,d,c,sl,test,write){ RT_LUM=l; RT_DEP=d; RT_COV=c; RT_SLOT=sl; RT_TEST=test; RT_WRITE=write; }

function tri(A,B,C,tone,slot){
  if(!A||!B||!C) return;
  const d=(B.sy-C.sy)*(A.sx-C.sx)+(C.sx-B.sx)*(A.sy-C.sy);
  if(Math.abs(d)<1e-7) return;
  const inv=1/d;
  const minX=Math.max(0,Math.floor(Math.min(A.sx,B.sx,C.sx)));
  const maxX=Math.min(W-1,Math.ceil(Math.max(A.sx,B.sx,C.sx)));
  const minY=Math.max(0,Math.floor(Math.min(A.sy,B.sy,C.sy)));
  const maxY=Math.min(H-1,Math.ceil(Math.max(A.sy,B.sy,C.sy)));
  for(let y=minY;y<=maxY;y++){
    const py=y+0.5, o=y*W;
    for(let x=minX;x<=maxX;x++){
      const px=x+0.5;
      const l0=((B.sy-C.sy)*(px-C.sx)+(C.sx-B.sx)*(py-C.sy))*inv;
      if(l0<-0.0001) continue;
      const l1=((C.sy-A.sy)*(px-C.sx)+(A.sx-C.sx)*(py-C.sy))*inv;
      if(l1<-0.0001) continue;
      const l2=1-l0-l1;
      if(l2<-0.0001) continue;
      const z=l0*A.dep+l1*B.dep+l2*C.dep;
      const i=o+x;
      if(RT_TEST&&z>=RT_DEP[i]) continue;
      RT_LUM[i]=tone;
      if(RT_SLOT) RT_SLOT[i]=slot;
      if(RT_COV) RT_COV[i]=1;
      if(RT_WRITE) RT_DEP[i]=z;
    }
  }
}
function quad(A,B,C,D,tone,slot){ tri(A,B,C,tone,slot); tri(A,C,D,tone,slot); }
/* A world-space disc, flattened to screen — used for the still smoke and
   for a car's wheels, both of which are marks rather than solids. */
function discAt(p,rpx,tone,slot){
  if(!p) return;
  const minX=Math.max(0,Math.floor(p.sx-rpx)), maxX=Math.min(W-1,Math.ceil(p.sx+rpx));
  const minY=Math.max(0,Math.floor(p.sy-rpx)), maxY=Math.min(H-1,Math.ceil(p.sy+rpx));
  const r2=rpx*rpx;
  for(let y=minY;y<=maxY;y++){
    const o=y*W, dy=y+0.5-p.sy;
    for(let x=minX;x<=maxX;x++){
      const dx=x+0.5-p.sx;
      if(dx*dx+dy*dy>r2) continue;
      const i=o+x;
      if(RT_TEST&&p.dep>=RT_DEP[i]) continue;
      RT_LUM[i]=tone;
      if(RT_SLOT) RT_SLOT[i]=slot;
      if(RT_COV) RT_COV[i]=1;
      if(RT_WRITE) RT_DEP[i]=p.dep;
    }
  }
}

/* A box given a centre, three half-extents and three unit axes. Returns
   its six faces as world-space quads, each with its own facing normal. */
function boxFaces(c,ax,ay,az,hx,hy,hz){
  const V=(i,j,k)=>({
    x:c.x+ax.x*hx*i+ay.x*hy*j+az.x*hz*k,
    y:c.y+ax.y*hx*i+ay.y*hy*j+az.y*hz*k,
    z:c.z+ax.z*hx*i+ay.z*hy*j+az.z*hz*k });
  const v=[V(-1,-1,-1),V(1,-1,-1),V(1,1,-1),V(-1,1,-1),
           V(-1,-1, 1),V(1,-1, 1),V(1,1, 1),V(-1,1, 1)];
  return [
    {i:[4,5,6,7],n:az,sign: 1},{i:[1,0,3,2],n:az,sign:-1},
    {i:[5,1,2,6],n:ax,sign: 1},{i:[0,4,7,3],n:ax,sign:-1},
    {i:[3,2,6,7],n:ay,sign: 1},{i:[0,1,5,4],n:ay,sign:-1}
  ].map(f=>({ v:f.i.map(n=>v[n]), nx:f.n.x*f.sign, ny:f.n.y*f.sign, nz:f.n.z*f.sign }));
}
function faceFromVertices(v){
  const a=v[1], b=v[0], c=v[2];
  let nx=(a.y-b.y)*(c.z-b.z)-(a.z-b.z)*(c.y-b.y);
  let ny=(a.z-b.z)*(c.x-b.x)-(a.x-b.x)*(c.z-b.z);
  let nz=(a.x-b.x)*(c.y-b.y)-(a.y-b.y)*(c.x-b.x);
  const n=Math.hypot(nx,ny,nz)||1;
  return { v:v, nx:nx/n, ny:ny/n, nz:nz/n };
}

function offsetPoint(c,ax,a,ay,b,az,d){
  return {x:c.x+ax.x*a+ay.x*b+az.x*d,
          y:c.y+ax.y*a+ay.y*b+az.y*d,
          z:c.z+ax.z*a+ay.z*b+az.z*d};
}

/* A tapered prism with a narrower front and slightly inset roof. The front
   is +az, which is the direction in which a car travels on each road half. */
function taperedBodyFaces(c,ax,ay,az,hx,hy,hz,frontRatio,topRatio){
  const V=(side,y,z,ratio)=>({
    x:c.x+ax.x*hx*side*ratio+ay.x*hy*y+az.x*hz*z,
    y:c.y+ax.y*hx*side*ratio+ay.y*hy*y+az.y*hz*z,
    z:c.z+ax.z*hx*side*ratio+ay.z*hy*y+az.z*hz*z
  });
  const bl=V(-1,-1,-1,1), br=V(1,-1,-1,1),
        fl=V(-1,-1,1,frontRatio), fr=V(1,-1,1,frontRatio),
        tl=V(-1,1,1,frontRatio*topRatio), tr=V(1,1,1,frontRatio*topRatio),
        rl=V(-1,1,-1,topRatio), rr=V(1,1,-1,topRatio);
  return [
    faceFromVertices([fl,fr,tr,tl]),
    faceFromVertices([br,bl,rl,rr]),
    faceFromVertices([fr,br,rr,tr]),
    faceFromVertices([bl,fl,tl,rl]),
    faceFromVertices([tl,tr,rr,rl]),
    faceFromVertices([bl,br,fr,fl])
  ];
}

/* The cabin is a shallow trapezoid: its roof is narrower and its windscreen
   leans back. Keeping the vertices explicit lets the window panes share the
   same sloped surfaces instead of becoming screen-space stickers. */
function cabinGeometry(c,ax,ay,az,w,h,front,rear,topRatio,frontSlope){
  const topFront=front*frontSlope, topRear=rear*0.92;
  const V=(side,y,z)=>({
    x:c.x+ax.x*w*side*lerp(1,topRatio,(y+1)*0.5)+ay.x*h*y+az.x*z,
    y:c.y+ax.y*w*side*lerp(1,topRatio,(y+1)*0.5)+ay.y*h*y+az.y*z,
    z:c.z+ax.z*w*side*lerp(1,topRatio,(y+1)*0.5)+ay.z*h*y+az.z*z
  });
  const bfl=V(-1,-1,front), bfr=V(1,-1,front),
        bbl=V(-1,-1,rear),  bbr=V(1,-1,rear),
        tfl=V(-1,1,topFront), tfr=V(1,1,topFront),
        trl=V(-1,1,topRear),  trr=V(1,1,topRear);
  return {
    faces:[
      faceFromVertices([bfl,bfr,tfr,tfl]),
      faceFromVertices([bbr,bbl,trl,trr]),
      faceFromVertices([bfr,bbr,trr,tfr]),
      faceFromVertices([bbl,bfl,tfl,trl]),
      faceFromVertices([tfl,tfr,trr,trl]),
      faceFromVertices([bbl,bbr,bfr,bfl])
    ],
    structuralFaces:[
      faceFromVertices([bbr,bbl,trl,trr]),
      faceFromVertices([tfl,tfr,trr,trl]),
      faceFromVertices([bbl,bbr,bfr,bfl])
    ],
    point:(side,y,z)=>V(side,y,z),
    edge:(y,which)=>lerp(which==='front'?front:rear,which==='front'?topFront:topRear,(y+1)*0.5),
    widthAt:y=>w*lerp(1,topRatio,(y+1)*0.5)
  };
}

/* Window openings are framed by the cabin surface. The pale panes sit just
   inside those openings; they are not screen-space stickers or surfaces
   nudged proud of the cabin. */
function cabinWindowFaces(cabin,ax,ay,az,inset){
  const out=[];
  const sideWindow=(side,y,z)=>{
    const p=cabin.point(side,y,z);
    p.x-=ax.x*inset*side; p.y-=ax.y*inset*side; p.z-=ax.z*inset*side;
    return p;
  };
  const sidePane=(side)=>{
    const y0=-0.24, y1=0.48;
    const mid=y=> (cabin.edge(y,'front')+cabin.edge(y,'rear'))*0.5;
    const fr0=y=>lerp(mid(y),cabin.edge(y,'front'),0.86);
    const re0=y=>lerp(cabin.edge(y,'rear'),mid(y),0.14);
    const re1=y=>lerp(cabin.edge(y,'rear'),mid(y),0.14);
    const p00=sideWindow(side,y0,re0(y0)), p10=sideWindow(side,y0,fr0(y0));
    const p11=sideWindow(side,y1,fr0(y1)), p01=sideWindow(side,y1,re1(y1));
    const s00=cabin.point(side,y0,cabin.edge(y0,'rear'));
    const s10=cabin.point(side,y0,cabin.edge(y0,'front'));
    const s11=cabin.point(side,y1,cabin.edge(y1,'front'));
    const s01=cabin.point(side,y1,cabin.edge(y1,'rear'));
    out.push(faceFromVertices([s00,s10,p10,p00]));
    out.push(faceFromVertices([p01,p11,s11,s01]));
    out.push(faceFromVertices([s10,s11,p11,p10]));
    out.push(faceFromVertices([s01,p01,p00,s00]));
    out.push({pane:faceFromVertices([p00,p10,p11,p01])});
  };
  sidePane(-1); sidePane(1);

  const frontPoint=(side,y,inside=false)=>{
    const p=cabin.point(side,y,cabin.edge(y,'front'));
    if(inside){ p.x-=az.x*inset; p.y-=az.y*inset; p.z-=az.z*inset; }
    return p;
  };
  const fy0=-0.22, fy1=0.44;
  const a=frontPoint(-0.72,fy0,true), b=frontPoint(0.72,fy0,true),
        c=frontPoint(0.62,fy1,true), d=frontPoint(-0.62,fy1,true);
  const a0=frontPoint(-1,-1), b0=frontPoint(1,-1),
        a1=frontPoint(-1,1), b1=frontPoint(1,1);
  out.push(faceFromVertices([a0,b0,b,a]));
  out.push(faceFromVertices([d,c,b1,a1]));
  out.push(faceFromVertices([b0,b1,c,b]));
  out.push(faceFromVertices([a0,a1,d,a]));
  out.push(faceFromVertices([a,d,c,b]));
  return out;
}

/* An extruded cylinder whose axis runs across the car. The cap sectors are
   deliberately retained: at large screen sizes the wheel reads as a solid
   object, while the depth test still hides the far side naturally. */
function cylinderFaces(c,axis,radialA,radialB,radius,halfDepth,segments=8){
  const ring=(end,i)=>{
    const a=i/segments*Math.PI*2;
    return {x:c.x+axis.x*end*halfDepth+radialA.x*Math.cos(a)*radius+radialB.x*Math.sin(a)*radius,
            y:c.y+axis.y*end*halfDepth+radialA.y*Math.cos(a)*radius+radialB.y*Math.sin(a)*radius,
            z:c.z+axis.z*end*halfDepth+radialA.z*Math.cos(a)*radius+radialB.z*Math.sin(a)*radius};
  };
  const out=[];
  for(let i=0;i<segments;i++){
    const j=(i+1)%segments;
    const a=i/segments*Math.PI*2, nx=radialA.x*Math.cos(a)+radialB.x*Math.sin(a),
          ny=radialA.y*Math.cos(a)+radialB.y*Math.sin(a), nz=radialA.z*Math.cos(a)+radialB.z*Math.sin(a);
    out.push({v:[ring(-1,i),ring(-1,j),ring(1,j),ring(1,i)],nx,ny,nz});
    const lo={x:c.x-axis.x*halfDepth,y:c.y-axis.y*halfDepth,z:c.z-axis.z*halfDepth};
    const hi={x:c.x+axis.x*halfDepth,y:c.y+axis.y*halfDepth,z:c.z+axis.z*halfDepth};
    out.push({v:[lo,ring(-1,j),ring(-1,i),lo],nx:-axis.x,ny:-axis.y,nz:-axis.z});
    out.push({v:[hi,ring(1,i),ring(1,j),hi],nx:axis.x,ny:axis.y,nz:axis.z});
  }
  return out;
}
/* Graphic light, not a lighting model: how much a face turns away from a
   fixed direction decides which of three flat tones it takes. */
function faceTone(f,base,spread){
  const l=CFG.light;
  const dot=f.nx*l.x+f.ny*l.y+f.nz*l.z;
  return clamp(base+dot*spread,0,1);
}
function faceCentre(f){
  let x=0,y=0,z=0;
  for(const p of f.v){ x+=p.x; y+=p.y; z+=p.z; }
  return {x:x/4,y:y/4,z:z/4};
}

/* ======================================================================
   BAKING THE STILL WORLD — hill, road, dashes, house, smoke
   ==================================================================== */
function bakeStatic(){
  cameraPos();
  HL.fill(0); HC.fill(0); HS.fill(-1);
  HD.fill(Infinity);
  target(HL,HD,HC,HS,true,true);
  bakeHill();
  bakeRoad();
  bakeHouse();
}

function bakeHill(){
  const h=CFG.hill;
  const nR=Math.max(8,Math.round(h.rings)), nM=Math.max(12,Math.round(h.meridians));
  /* Rings are spaced by a power so they crowd toward the foot, where the
     flank is steepest and a coarse ring would show as a facet. */
  /* DEPTH BIAS. The rasteriser's depth across a mesh quad is a plain
     screen-space interpolation between its four vertices' exact depths,
     not the true curved surface between them — a flat-mass approximation
     of a convex dome. A vertex-space inset (pushing each vertex inward
     along its own normal) was tried first and was NOT reliable: at a
     grazing angle the surface normal points nearly ACROSS the camera's
     view rather than along it, so the same inward push barely changes
     camera-space depth right where the error is often largest, and the
     road/car depth-test still failed intermittently partway down the
     slope. Biasing depth directly, in the same units the depth test
     itself compares, sidesteps the angle entirely: every hill pixel is
     guaranteed at least `meshInset` FARTHER from the camera than its true
     depth, full stop, so `road.lift` only has to clear the mesh's own
     interpolation error, not the geometry. */
  const bias=Math.max(0,h.meshInset);
  const rowA=[], rowB=[];
  for(let j=0;j<nR;j++){
    const rho0=Math.pow(j/nR,h.ringBias), rho1=Math.pow((j+1)/nR,h.ringBias);
    for(let i=0;i<=nM;i++){
      const th=i/nM*Math.PI*2;
      const a=surface(rho0,th), b=surface(rho1,th);
      const pa=project(a.x,a.y,a.z), pb=project(b.x,b.y,b.z);
      if(pa) pa.dep+=bias;
      if(pb) pb.dep+=bias;
      rowA[i]={s:pa,p:a};
      rowB[i]={s:pb,p:b};
    }
    for(let i=0;i<nM;i++){
      const a=rowA[i], b=rowA[i+1], c=rowB[i+1], d=rowB[i];
      const tone=hillTone(c.p);
      quad(a.s,b.s,c.s,d.s,tone,-2);
    }
  }
}
/* FLAT MASS. The hill takes one tone almost everywhere; darkening is a
   function of how far the surface has turned away from the camera, raised
   to a power so the change is pushed right out to the silhouette. A dome
   gradient here would band under the dither along the same axis as the
   road, and the road is the only mark this shape is meant to carry. */
function hillTone(p){
  const h=CFG.hill;
  let vx=CAM_X-p.x, vy=CAM_Y-p.y, vz=CAM_Z-p.z;
  const vl=Math.hypot(vx,vy,vz)||1; vx/=vl; vy/=vl; vz/=vl;
  const facing=clamp(p.nx*vx+p.ny*vy+p.nz*vz,0,1);
  const rim=Math.pow(1-facing,Math.max(0.2,h.rimCurve));
  return clamp(h.tone-rim*h.rimDark,0,1);
}

function bakeRoad(){
  const rd=CFG.road;
  const n=Math.max(24,Math.round(rd.samples));
  let prev=null;
  for(let i=0;i<=n;i++){
    const s=-1+2*i/n;
    const F=roadFrame(s);
    const hw=rd.width*0.5;
    const L=project(F.p.x-F.bx*hw,F.p.y-F.by*hw,F.p.z-F.bz*hw);
    const R=project(F.p.x+F.bx*hw,F.p.y+F.by*hw,F.p.z+F.bz*hw);
    const cur={L:L,R:R};
    if(prev) quad(prev.L,prev.R,cur.R,cur.L,rd.tone,-2);
    prev=cur;
  }
  /* Centre dashes. Lifted a little further out than the road so they are
     never lost to depth ties, and skipped where the road is too small on
     screen for a dash to be more than a stray pixel. */
  if(rd.dashTone!==rd.tone&&rd.dashLength>0){
    const period=Math.max(0.004,rd.dashPeriod);
    for(let s=-1+period*0.5;s<1;s+=period){
      const a=s, b=Math.min(1,s+period*clamp(rd.dashLength,0,1));
      const FA=roadFrame(a), FB=roadFrame(b);
      const hw=rd.dashWidth*0.5, up=rd.dashLift;
      const A1=project(FA.p.x-FA.bx*hw+FA.nx*up,FA.p.y-FA.by*hw+FA.ny*up,FA.p.z-FA.bz*hw+FA.nz*up);
      const A2=project(FA.p.x+FA.bx*hw+FA.nx*up,FA.p.y+FA.by*hw+FA.ny*up,FA.p.z+FA.bz*hw+FA.nz*up);
      const B1=project(FB.p.x-FB.bx*hw+FB.nx*up,FB.p.y-FB.by*hw+FB.ny*up,FB.p.z-FB.bz*hw+FB.nz*up);
      const B2=project(FB.p.x+FB.bx*hw+FB.nx*up,FB.p.y+FB.by*hw+FB.ny*up,FB.p.z+FB.bz*hw+FB.nz*up);
      if(A1&&A2&&Math.hypot(A2.sx-A1.sx,A2.sy-A1.sy)<0.9) continue;
      quad(A1,A2,B2,B1,rd.dashTone,-2);
    }
  }
}

/* ---------- the house: small, still, beside the road ------------------ */
function bakeHouse(){
  const ho=CFG.house;
  if(ho.size<=0) return;
  /* Placed by the road, not by eye: its foot is the road frame at `atS`,
     stepped `beside` world units along that frame's own SIDE vector (and
     `along` along its tangent), so it always sits clear of the carriageway
     rather than straddling it, and moving the road carries the house with
     it. The side vector lies in the hill's own tangent plane, so the
     offset point stays on the surface without a second surface lookup. */
  const F=roadFrame(ho.atS);
  /* The tangent-plane offset gives the right DIRECTION but drifts off the
     true dome near the crown, where curvature is highest — a flat plane
     laid across a fast-curving surface floats above it. So the offset is
     used only to pick a direction and distance, then snapped back onto
     the analytic surface by converting to (rho,theta) and re-evaluating
     it exactly, which is what keeps the house seated at every atS. */
  const off={ x:F.p.x+F.bx*ho.beside+F.tx*ho.along,
              y:F.p.y+F.by*ho.beside+F.ty*ho.along,
              z:F.p.z+F.bz*ho.beside+F.tz*ho.along };
  const R=CFG.hill.radius;
  const offRho=Math.hypot(off.x,off.z)/R, offTheta=Math.atan2(off.x,-off.z);
  const base=surface(offRho,offTheta);
  const up={x:0,y:1,z:0};
  const yaw=ho.yaw;
  const ax={x:Math.cos(yaw),y:0,z:Math.sin(yaw)};
  const az={x:-Math.sin(yaw),y:0,z:Math.cos(yaw)};
  const w=ho.size*ho.width*0.5, d=ho.size*ho.depth*0.5, wallH=ho.size*ho.wall;
  const c={x:base.x,y:base.y+wallH*0.5-ho.sink*ho.size,z:base.z};

  const faces=boxFaces(c,ax,up,az,w,wallH*0.5,d);
  drawFaces(faces,ho.tone,ho.shade,-2);

  /* ROOF — a prism: two pitched planes and two gables. Built from the
     wall box's own top corners so it cannot drift off the walls. */
  const topY=c.y+wallH*0.5;
  const rise=ho.size*ho.roof;
  const P=(i,k,y)=>({x:base.x+ax.x*w*i+az.x*d*k, y:y, z:base.z+ax.z*w*i+az.z*d*k});
  const ridgeA={x:base.x+az.x*d*-1,y:topY+rise,z:base.z+az.z*d*-1};
  const ridgeB={x:base.x+az.x*d* 1,y:topY+rise,z:base.z+az.z*d* 1};
  const c00=P(-1,-1,topY), c10=P(1,-1,topY), c11=P(1,1,topY), c01=P(-1,1,topY);
  const slopeA={v:[c00,c01,ridgeB,ridgeA],nx:-ax.x*0.7,ny:0.7,nz:-ax.z*0.7};
  const slopeB={v:[c10,c11,ridgeB,ridgeA],nx: ax.x*0.7,ny:0.7,nz: ax.z*0.7};
  const gableA={v:[c00,c10,ridgeA,ridgeA],nx:-az.x,ny:0,nz:-az.z};
  const gableB={v:[c01,c11,ridgeB,ridgeB],nx: az.x,ny:0,nz: az.z};
  drawFaces([gableA,gableB,slopeA,slopeB],ho.roofTone,ho.shade,-2);

  /* CHIMNEY. The plume itself is drawn per-frame (see drawSmoke) — it is
     the scene's second moving thing, so it is not part of the baked
     still world. The chimney's mouth is saved in world space so the
     smoke has somewhere to originate from without repeating this
     placement math. */
  const chW=ho.size*ho.chimney*0.5;
  const chH=ho.size*ho.chimneyAt;
  const ch={x:lerp(ridgeA.x,ridgeB.x,0.28),y:topY+rise*0.55,z:lerp(ridgeA.z,ridgeB.z,0.28)};
  const chc={x:ch.x,y:ch.y+chH*0.5,z:ch.z};
  drawFaces(boxFaces(chc,ax,up,az,chW,chH*0.5,chW),ho.tone,ho.shade,-2);
  CHIMNEY_TOP={x:chc.x,y:chc.y+chH*0.5,z:chc.z};
}

/* ======================================================================
   SMOKE — a continuous rising stream, the scene's second moving thing

   Puffs are identified by a phase offset spread evenly along the stream,
   the same wrapped-phase trick the traffic uses: each puff's position is
   (identity + flow*t) mod 1, so it cycles from the chimney mouth to full
   dispersal and back to the mouth forever, with nothing accumulating and
   no puff ever seen to pop in or out of existence — size and tone both
   ramp from the same wrapped progress, so a puff is born at zero radius
   at the chimney and fades as it reaches the top of the stream, exactly
   where the next lap already hides the seam.
   ==================================================================== */
function drawSmoke(t){
  const ho=CFG.house;
  if(ho.size<=0||ho.smokeHeight<=0||!CHIMNEY_TOP) return;
  const top=CHIMNEY_TOP;
  const steps=Math.max(4,Math.round(ho.smokePuffs));
  const flow=Math.max(0,ho.smokeSpeed);
  for(let i=0;i<=steps;i++){
    const id=i/steps;
    const u=((id+t*flow)%1+1)%1;
    /* Each SLOT (i, not the wrapping identity) gets its own fixed random
       offset and size, hashed the same way a car's shape is — so a given
       puff keeps its own character every time it cycles through, rather
       than every puff being a perfect clone stamped along one curve.
       Deviation is scaled by u itself: zero at the chimney mouth, full
       size by full dispersal, so smoke still reads as coming from one
       point and only loses its shape as it rises, the way real smoke
       does — jitter present from u=0 would just look like a wobbly pipe. */
    const jx=(hash1(i,401)-0.5)*2*ho.smokeJitter*ho.size*u;
    const jz=(hash1(i,613)-0.5)*2*ho.smokeJitter*ho.size*u;
    const jSize=1+(hash1(i,821)-0.5)*2*ho.smokeSizeVary;
    const y=top.y+ho.smokeHeight*ho.size*u;
    const x=top.x+Math.sin(u*Math.PI*ho.smokeCoils)*ho.smokeDrift*ho.size*u+jx;
    const z=top.z+jz;
    const p=project(x,y,z);
    if(!p) continue;
    const r=Math.max(0.5,(ho.smokeR0+(ho.smokeR1-ho.smokeR0)*u)*ho.size*p.k*S*jSize);
    target(lum,dep,null,twoBitSlot,true,false);
    discAt(p,r,ho.smokeTone,-2);
  }
}

function drawFaces(faces,base,spread,slot){
  const order=faces.map(f=>({f:f,c:faceCentre(f)}));
  /* Faces of one small solid: sort back to front and let the depth buffer
     do the rest, so a solid never shows its own far side. */
  order.sort((a,b)=>{
    const pa=project(a.c.x,a.c.y,a.c.z), pb=project(b.c.x,b.c.y,b.c.z);
    return (pb?pb.dep:0)-(pa?pa.dep:0);
  });
  for(const {f} of order){
    const v=f.v.map(p=>project(p.x,p.y,p.z));
    quad(v[0],v[1],v[2],v[3],faceTone(f,base,spread),slot);
  }
}

/* ======================================================================
   CLOUD BANKS — two-dimensional lobed fields, in the windmill's manner

         PUFF: clusters of hard-edged ellipses max-composited into a cumulus
         silhouette, rounded on every side, for open sky.
   SEA:  a lobed upper surface filling to the bottom of the frame. The
         floor keeps the mass continuous at a height while its lobes
         billow above it — without it you have to pack the lobes tight,
         and tightly packed lobes make the surface a ruled line.
   A bank marked `front` is drawn after the cars and is what they vanish
   into; the rest are drawn before the hill. Each front bank owns a separate
   group-level mask with values from 0.7 to 1. Neither mask is a per-lobe
   hole or a shared foreground mask. The field follows one broad shallow
   arc; the individual lobes stay upright and hard-edged while the group
   envelope, wall, floor, and front masks follow the same profile.
   ==================================================================== */
function buildBanks(){
  const gl=v=>v*S, gy=v=>v*S;
  const motion=CFG.cloudMotion||{windMin:0,windMax:0};
  let frontIndex=0;
  BANKS=CFG.banks.map((b,index)=>{
    const rnd=mulberry32(b.seed);
    const depth=clamp(b.depth!=null?b.depth:index/Math.max(1,CFG.banks.length-1),0,1);
    const common={ id:b.id, front:!!b.front, depth, val:b.tone, Wp:gl(b.tile),
                   frontIndex:b.front?frontIndex++:-1,
                   speed:gl(lerp(motion.windMin||0,motion.windMax||0,depth)),
                   arc:gl(motion.arc||0),
                   maskMin:clamp(b.maskMin==null?0.7:b.maskMin,0,1),
                   maskMax:clamp(b.maskMax==null?1:b.maskMax,0,1),
                   maskSize:b.maskSize==null?null:Math.max(0,b.maskSize) };
    if(b.kind==='puff'){
      const lobes=[]; let mnY=1e9,mxY=-1e9;
      for(let k=0;k<b.clusters;k++){
        const ccx=(k+0.15+rnd()*0.7)*(common.Wp/b.clusters);
        const n=b.per+((rnd()*2)|0);
        for(let i=0;i<n;i++){
          const rx=gl(b.rx[0]+rnd()*(b.rx[1]-b.rx[0]));
          const ry=gl(b.ry[0]+rnd()*(b.ry[1]-b.ry[0]));
          const cx=ccx+(rnd()-0.5)*gl(b.rx[1])*2.1;
          const cy=gy(b.y)-ry*(0.30+rnd()*0.5);      // bottoms align, tops billow
          lobes.push({cx,cy,rx,ry});
          if(cy-ry<mnY)mnY=cy-ry; if(cy+ry>mxY)mxY=cy+ry;
        }
      }
      const maskTop=mnY;
      const groupBaseline=gy(b.y);
      const maskSpan=common.maskSize==null?groupBaseline-maskTop:common.maskSize*S;
      const maskBottom=maskTop+Math.max(1,maskSpan);
      const arcPad=Math.abs(common.arc);
      return Object.assign(common,{kind:'puff',lobes,
        yA:Math.max(0,Math.floor(mnY-arcPad)-1), yB:Math.min(H,Math.ceil(mxY+arcPad)+2),
        maskTop, maskBottom});
    }
    const lobes=[];
    for(let i=0;i<b.lobes;i++) lobes.push({
      cx:(i+rnd()*0.9)*(common.Wp/b.lobes),
      rx:gl(b.rx[0]+rnd()*(b.rx[1]-b.rx[0])),
      ry:gl(b.ry[0]+rnd()*(b.ry[1]-b.ry[0])),
      dy:(rnd()-0.5)*7*S});
    const y0=gy(b.y);
    const maskTop=y0-Math.max(1,Math.max(...lobes.map(lo=>lo.ry)));
    const maskBottom=maskTop+Math.max(1,(common.maskSize==null?Math.max(...lobes.map(lo=>lo.ry)):common.maskSize*S));
    return Object.assign(common,{kind:'sea',y0,
      lobes,floor:b.floorUp!=null?gy(b.y-b.floorUp):0,top:new Float32Array(W),
      maskTop,maskBottom});
  });
}

/* The broad curve belongs to the moving bank. `off` is subtracted before
   sampling it, so a lobe and the mask attached to it keep the same vertical
   relationship while wind carries the bank across the frame. The profile is
   deliberately broad and parabolic: this is the group envelope, not a new
   shape carved into every individual lobe. */
function cloudArcOffset(L,x,off){
  if(!L.arc) return 0;
  const span=W||1;
  const local=((x-off)%span+span)%span;
  const u=local/Math.max(1,span-1)*2-1;
  return L.arc*Math.max(0,1-u*u);
}
function groupMaskValue(L,y,x,off){
  const span=Math.max(1,L.maskBottom-L.maskTop);
  const curve=cloudArcOffset(L,x,off);
  return lerp(L.maskMin,L.maskMax,clamp((y-curve-L.maskTop)/span,0,1));
}

function drawPuff(L,t){
  const off=(L.speed*t)%(L.Wp||1);
  const yA=L.yA, yB=L.yB;
  if(yB<=yA) return;
  bankA.fill(0,yA*W,yB*W);
  for(const lo of L.lobes){
    const cy=lo.cy+cloudArcOffset(L,lo.cx+off,off);
    for(let k=-1;k<=1;k++){
      const cx=lo.cx+off+k*L.Wp;
      if(cx+lo.rx<0||cx-lo.rx>=W) continue;
      const x0=Math.max(0,Math.floor(cx-lo.rx)), x1=Math.min(W-1,Math.ceil(cx+lo.rx));
      const y0=Math.max(yA,Math.floor(cy-lo.ry)), y1=Math.min(yB-1,Math.ceil(cy+lo.ry));
      const irx=1/lo.rx, iry=1/lo.ry;
      for(let y=y0;y<=y1;y++){
        const dy=(y-cy)*iry, dy2=dy*dy, row=y*W;
        if(dy2>=1) continue;
        for(let x=x0;x<=x1;x++){
          const dx=(x-cx)*irx, q=dx*dx+dy2;
          if(q>=1) continue;
          /* The silhouette is binary. No ellipse falloff, blur, or feathering. */
          const v=1;
          const i=row+x;
          if(v>bankA[i]) bankA[i]=v;
        }
      }
    }
  }
  for(let y=yA;y<yB;y++){
    for(let x=0;x<W;x++){
      const i=y*W+x, a=bankA[i];
      if(a<=0) continue;
      if(L.front){
        const layer=frontCloudLayers[L.frontIndex];
        layer.pixels[i]=L.val;
        layer.mask[i]=Math.max(layer.mask[i],groupMaskValue(L,y,x,off));
      }else{
        lum[i]=lum[i]*(1-a)+L.val*a;
        twoBitSlot[i]=-2;
      }
    }
  }
}
function drawSea(L,t){
  const off=(L.speed*t)%(L.Wp||1);
  const lb=L.lobes, top=L.top;
  for(let x=0;x<W;x++){
    let wx=(x-off)%L.Wp; if(wx<0)wx+=L.Wp;
    let m=H+8;
    for(const lo of lb){
      for(let k=-1;k<=1;k++){
        const dx=wx-(lo.cx+k*L.Wp);
        if(dx>-lo.rx&&dx<lo.rx){
          const q=dx/lo.rx;
          const yc=L.y0+lo.dy+cloudArcOffset(L,lo.cx+off,off)-lo.ry*Math.sqrt(1-q*q);
          if(yc<m)m=yc;
        }
      }
    }
    const floor=L.floor?L.floor+cloudArcOffset(L,x,off):0;
    top[x]=L.floor&&m>floor?floor:m;
  }
  const val=L.val;
  const layer=L.front?frontCloudLayers[L.frontIndex]:null;
  for(let x=0;x<W;x++){
    const tp=top[x];
    for(let y=tp<0?0:Math.floor(tp);y<H;y++){
      /* Each front bank owns this mask. Its ramp uses the bank's own group
         envelope, never an individual lobe boundary. The authored endpoints
         are 0.7 at the upper edge and 1 at the group boundary and below. */
      const alpha=L.front ? groupMaskValue(L,y,x,off) : 1;
      const i=y*W+x;
      if(L.front){
        layer.pixels[i]=val;
        layer.mask[i]=Math.max(layer.mask[i],alpha);
      }else{
        lum[i]=val;
        twoBitSlot[i]=-2;
      }
    }
  }
}
function drawBanks(t,front){
  if(front){
    for(const layer of frontCloudLayers){ layer.pixels.fill(0); layer.mask.fill(0); }
  }
  for(const L of BANKS){
    if(!!L.front!==front) continue;
    if(L.kind==='puff') drawPuff(L,t); else drawSea(L,t);
  }
  if(front){
    for(const L of BANKS){
      if(!L.front) continue;
      const layer=frontCloudLayers[L.frontIndex];
      for(let i=0;i<lum.length;i++){
        const a=layer.mask[i];
        if(a<=0) continue;
        lum[i]=lum[i]*(1-a)+layer.pixels[i]*a;
        if(a>=0.999) twoBitSlot[i]=-2;
      }
    }
  }
}

/* ======================================================================
   THE TRAFFIC

   Cars are slots on the road, evenly spaced along a parameter span that
   is LONGER than the road itself. The extra length is the gap: a slot
   inside it has already left the front of the frame and has not yet
   reached the rear, so nothing is on the road during the handover and no
   car is ever seen to appear or turn round. The phase is wrapped, so this
   is bounded for any t and the postcard cannot drift.

   Identity is hashed from how many times a slot has wrapped, so a car is
   a different car each time round without any state being kept.
   ==================================================================== */
function carsAt(t){
  const c=CFG.car;
  const span=2+Math.max(0,c.gap);
  const slots=Math.max(1,Math.round(c.slots));
  const travel=t*c.speed;
  const out=[];
  for(let j=0;j<slots;j++){
    const base=j*span/slots;
    const raw=base+travel;
    const u=((raw%span)+span)%span;
    if(u>2) continue;                       // in the gap: off the road
    const wraps=Math.floor(raw/span);
    const id=(j*7919+wraps*104729)|0;
    out.push({ s:-1+u, id:id });
  }
  return out;
}
/* In 2-bit mode every mass in this postcard is quantised through the
   three-level slot -2 (dark, middle, light). Palette slot 2 — the accent —
   is reserved for a car body and is issued to every nth car only, so the
   colour cannot spread into the hill, the cloud, or the sky. */
function carShape(id){
  const c=CFG.car;
  const r=k=>hash1(id,k);
  const scale=Math.max(0.1,c.scale==null?1:c.scale);
  const base=c.size*scale;
  const size=base*lerp(1-c.sizeVary,1+c.sizeVary,r(3));
  const bodyLengthMin=Math.max(0.1,Math.min(c.bodyLengthMin==null?0.9:c.bodyLengthMin,c.bodyLengthMax==null?1.1:c.bodyLengthMax));
  const bodyLengthMax=Math.max(bodyLengthMin,c.bodyLengthMax==null?1.1:c.bodyLengthMax);
  const bodyHeightMin=Math.max(0.1,Math.min(c.bodyHeightMin==null?0.9:c.bodyHeightMin,c.bodyHeightMax==null?1.1:c.bodyHeightMax));
  const bodyHeightMax=Math.max(bodyHeightMin,c.bodyHeightMax==null?1.1:c.bodyHeightMax);
  const bodyLen=size*lerp(bodyLengthMin,bodyLengthMax,r(11));
  const bodyHeight=size*c.heightRatio*lerp(bodyHeightMin,bodyHeightMax,r(23));
  const bodyWidth=size*c.widthRatio*lerp(0.9,1.1,r(17));
  const cabinLengthMin=clamp(c.cabinLengthMin==null?0.30:c.cabinLengthMin,0.1,0.79);
  const cabinLengthMax=Math.min(0.79,Math.max(cabinLengthMin,c.cabinLengthMax==null?0.46:c.cabinLengthMax));
  const cabinHeightMin=Math.max(0.1,Math.min(c.cabinHeightMin==null?0.55:c.cabinHeightMin,c.cabinHeightMax==null?0.82:c.cabinHeightMax));
  const cabinHeightMax=Math.max(cabinHeightMin,c.cabinHeightMax==null?0.82:c.cabinHeightMax);
  /* Body and cabin length/height are independent draws from the same base
     size.  Attachment is handled by the placement below, not by making the
     cabin dimensions a hidden multiple of the body dimensions. */
  const cabinLen=Math.min(size*lerp(cabinLengthMin,cabinLengthMax,r(29)),bodyLen*0.72);
  const cabinHeight=size*c.heightRatio*lerp(cabinHeightMin,cabinHeightMax,r(37));
  return {
    scale:scale,
    len:bodyLen,
    wide:bodyWidth,
    tall:bodyHeight,
    cabinLen:cabinLen/bodyLen,
    cabinLength:cabinLen,
    /* This is a ratio along the body.  It must not be stored in world units:
       drawCars multiplies it by exactly one body length when attaching the
       cabin. */
    cabinBack:lerp(-0.24,-0.10,r(31)),
    cabinTall:cabinHeight/bodyHeight,
    cabinHeight:cabinHeight,
    wheelRadius:size*(c.wheelRadius==null?0.14:c.wheelRadius),
    lampRadius:size*(c.lampRadius==null?0.06:c.lampRadius),
    tone:clamp(c.tone+(r(41)-0.5)*2*c.toneVary,0,1),
    accent:c.accentEvery>0&&(((id%c.accentEvery)+c.accentEvery)%c.accentEvery)===0
  };
}

/* The headlight field is projected from the same front-lamp pose used by the
   car mesh. It is kept in a separate pass so the light can brighten the
   baked road/hill before the car itself is drawn over it. */
function lightTriangle(A,B,C,strength,tone,maxDepth){
  if(!A||!B||!C) return;
  const d=(B.sy-C.sy)*(A.sx-C.sx)+(C.sx-B.sx)*(A.sy-C.sy);
  if(Math.abs(d)<1e-7) return;
  const inv=1/d;
  const minX=Math.max(0,Math.floor(Math.min(A.sx,B.sx,C.sx)));
  const maxX=Math.min(W-1,Math.ceil(Math.max(A.sx,B.sx,C.sx)));
  const minY=Math.max(0,Math.floor(Math.min(A.sy,B.sy,C.sy)));
  const maxY=Math.min(H-1,Math.ceil(Math.max(A.sy,B.sy,C.sy)));
  for(let y=minY;y<=maxY;y++){
    const py=y+0.5, o=y*W;
    for(let x=minX;x<=maxX;x++){
      const px=x+0.5;
      const l0=((B.sy-C.sy)*(px-C.sx)+(C.sx-B.sx)*(py-C.sy))*inv;
      if(l0<-0.0001) continue;
      const l1=((C.sy-A.sy)*(px-C.sx)+(A.sx-C.sx)*(py-C.sy))*inv;
      if(l1<-0.0001) continue;
      const l2=1-l0-l1;
      if(l2<-0.0001) continue;
      const i=o+x;
      /* Only the first baked solid surface receives projected light. The
         open sky and clouds cannot be brightened by a car beam. */
      if(!HC[i]||HD[i]>maxDepth+0.001) continue;
      const edgeDistance=clamp(Math.min(l1,l2)*2,0,1);
      const amount=strength*(0.35+0.65*edgeDistance);
      lum[i]=lerp(lum[i],tone,amount);
    }
  }
}

function drawHeadlights(t){
  const c=CFG.car;
  if((c.headlightStrength==null?0:c.headlightStrength)<=0) return;
  for(const car of carsAt(t)){
    const sh=carShape(car.id), F=roadFrame(car.s);
    const ax={x:F.bx,y:F.by,z:F.bz}, ay={x:F.nx,y:F.ny,z:F.nz}, az={x:F.tx,y:F.ty,z:F.tz};
    const phase=hash1(car.id,97)*Math.PI*2;
    const bob=Math.sin(t*(c.bobSpeed==null?0:c.bobSpeed)*Math.PI*2+phase)*(c.bobAmplitude==null?0:c.bobAmplitude)*sh.scale;
    const sway=Math.sin(t*(c.swaySpeed==null?0:c.swaySpeed)*Math.PI*2+phase)*(c.swayAmplitude==null?0:c.swayAmplitude)*sh.scale;
    const base={x:F.p.x+ay.x*bob+ax.x*sway,y:F.p.y+ay.y*bob+ax.y*sway,z:F.p.z+ay.z*bob+ax.z*sway};
    const body={x:base.x+ay.x*sh.tall*0.5,y:base.y+ay.y*sh.tall*0.5,z:base.z+ay.z*sh.tall*0.5};
    const lampHalfX=Math.min(sh.wide*0.25,sh.wide*0.5*(c.bodyFrontRatio==null?0.72:c.bodyFrontRatio)*0.62);
    const reach=Math.max(0.05,c.headlightReach==null?0.35:c.headlightReach);
    const endS=Math.min(1,car.s+reach);
    const T=roadPoint(endS), TF=roadFrame(endS), targetDepth=project(T.x,T.y,T.z);
    const halfWidth=Math.max(0.1,CFG.road.width*0.45);
    const tone=c.headlightTone==null?0.72:c.headlightTone;
    const strength=clamp(c.headlightStrength,0,1);
    for(const sx of [-1,1]){
      const origin=offsetPoint(body,ax,lampHalfX*sx,ay,sh.tall*(-0.30),az,
        sh.len*0.5+Math.max(0.02,sh.len*0.01));
      const left=offsetPoint(T,TF.bx,-halfWidth,TF.nx,0,TF.tx,0);
      const right=offsetPoint(T,TF.bx,halfWidth,TF.nx,0,TF.tx,0);
      const beamOrigin=offsetPoint(origin,ax,0,ay,0,az,0.03);
      const o=project(beamOrigin.x,beamOrigin.y,beamOrigin.z);
      const l=project(left.x,left.y,left.z), r=project(right.x,right.y,right.z);
      lightTriangle(o,l,r,strength,tone,targetDepth?targetDepth.dep:Infinity);
    }
  }
}
function drawCars(t){
  const c=CFG.car;
  const faces=[];
  for(const car of carsAt(t)){
    /* ALWAYS depth-tested. The scene is real 3D: the car rides the road,
       the road is offset along the hill's own surface normal, and the
       depth buffer alone decides what covers what — front and back half
       are the same code path, with no special case for either.

       An earlier version skipped the test on the front half, on the
       claim that the margin there was too small to be reliable. That
       claim came from a bad measurement: the probe lifted its test point
       straight up in Y instead of along the surface normal the way
       roadPoint does, so it compared the wrong point and reported the
       car behind the hill. Measured correctly, the car clears the hill
       by 0.6-2.6 world units all the way down the front face, and
       `hill.meshInset` biases the hill farther still, so the ordinary
       test has room to spare and needs no help. */
    const hide=true;
    const F=roadFrame(car.s);
    const sh=carShape(car.id);
    const ax={x:F.bx,y:F.by,z:F.bz};          // across the road
    const ay={x:F.nx,y:F.ny,z:F.nz};          // up off the road surface
    const az={x:F.tx,y:F.ty,z:F.tz};          // along the road
    const phase=hash1(car.id,97)*Math.PI*2;
    const bob=Math.sin(t*(c.bobSpeed==null?0:c.bobSpeed)*Math.PI*2+phase)*(c.bobAmplitude==null?0:c.bobAmplitude)*sh.scale;
    const sway=Math.sin(t*(c.swaySpeed==null?0:c.swaySpeed)*Math.PI*2+phase)*(c.swayAmplitude==null?0:c.swayAmplitude)*sh.scale;
    const base={x:F.p.x+ay.x*bob+ax.x*sway,y:F.p.y+ay.y*bob+ax.y*sway,z:F.p.z+ay.z*bob+ax.z*sway};
    const body={x:base.x+ay.x*sh.tall*0.5,y:base.y+ay.y*sh.tall*0.5,z:base.z+ay.z*sh.tall*0.5};
    const slot=sh.accent?2:-2;
    const bodyFaces=taperedBodyFaces(body,ax,ay,az,sh.wide*0.5,sh.tall*0.5,sh.len*0.5,
      c.bodyFrontRatio==null?0.72:c.bodyFrontRatio,
      c.bodyTopRatio==null?0.86:c.bodyTopRatio);
    for(const f of bodyFaces)
      faces.push({f:f,tone:faceTone(f,sh.tone,c.shade),slot:slot,c:faceCentre(f),test:hide});
    /* CABIN — a smaller trapezoid sitting on the body, offset toward the
       rear so the sloped front remains visible. */
    const cabH=sh.tall*sh.cabinTall;
    const cab={x:body.x+ay.x*(sh.tall*0.5+cabH*0.5)+az.x*sh.len*sh.cabinBack,
               y:body.y+ay.y*(sh.tall*0.5+cabH*0.5)+az.y*sh.len*sh.cabinBack,
               z:body.z+ay.z*(sh.tall*0.5+cabH*0.5)+az.z*sh.len*sh.cabinBack};
    const cabW=sh.wide*0.42, cabFront=sh.len*sh.cabinLen*0.5, cabRear=-cabFront;
    const cabin=cabinGeometry(cab,ax,ay,az,cabW,cabH*0.5,cabFront,cabRear,
      c.cabinTopRatio==null?0.76:c.cabinTopRatio,
      c.cabinFrontSlope==null?0.64:c.cabinFrontSlope);
    for(const f of cabin.structuralFaces)
      faces.push({f:f,tone:faceTone(f,sh.tone,c.shade),slot:slot,c:faceCentre(f),test:hide});
    for(const wf of cabinWindowFaces(cabin,ax,ay,az,Math.max(0.02,sh.wide*0.018))){
      const f=wf.pane||wf;
      faces.push({f:f,tone:wf.pane?c.windowTone:faceTone(f,sh.tone,c.shade),slot:wf.pane?-2:slot,c:faceCentre(f),test:hide});
    }
    /* LAMPS — small circular caps on the front face. Projected headlight
       cones are a separate requirement and are intentionally not added here. */
    const lampRadius=sh.lampRadius;
    const lampY=-0.30, lampHalfX=Math.min(sh.wide*0.25,sh.wide*0.5*(c.bodyFrontRatio==null?0.72:c.bodyFrontRatio)*0.62);
    for(const sx of [-1,1]){
      const lc=offsetPoint(body,ax,lampHalfX*sx,ay,sh.tall*lampY,
        az,sh.len*0.5+Math.max(0.02,sh.len*0.01));
      for(const f of cylinderFaces(lc,az,ax,ay,lampRadius,Math.max(0.01,sh.len*0.012),8))
        faces.push({f:f,tone:c.lampTone==null?1:c.lampTone,slot:-2,c:faceCentre(f),test:hide});
    }
    /* WHEELS earn their place only once the car is large enough on screen
       for them to be more than a stray pixel. */
    const wheelProbe=project(body.x,body.y,body.z);
    if(wheelProbe&&sh.len*wheelProbe.k*S>=c.wheelAt){
      const radius=sh.wheelRadius;
      /* Wheels are side-mounted axles inside the body's footprint. They use
         the road contact point, not the bobbed body base, so the body can
         move above them without making the wheels leave the road. */
      const wheelBase=F.p;
      const axleOffset=sh.len*0.31;
      for(const sx of [-1,1]) for(const sz of [-1,1]){
        const wc=offsetPoint(wheelBase,ax,sh.wide*0.5*sx,ay,radius*0.82,az,axleOffset*sz);
        for(const f of cylinderFaces(wc,ax,ay,az,radius,Math.max(0.02,sh.wide*0.10),8))
          faces.push({f:f,tone:faceTone(f,c.wheelTone,c.shade),slot:slot,c:faceCentre(f),test:hide});
      }
    }
  }
  /* One global back-to-front sort over every face of every car. Car faces
     write the shared depth buffer, so near faces hide far faces and the
     baked hill/road still win wherever they are genuinely in front. */
  for(const f of faces){ const p=project(f.c.x,f.c.y,f.c.z); f.z=p?p.dep:Infinity; }
  faces.sort((a,b)=>b.z-a.z);
  for(const f of faces){
    target(lum,dep,null,twoBitSlot,f.test,true);
    const v=f.f.v.map(p=>project(p.x,p.y,p.z));
    quad(v[0],v[1],v[2],v[3],f.tone,f.slot);
  }
}

/* ======================================================================
   SKY
   ==================================================================== */
function drawSky(){
  const bg=CFG.bg;
  const endY=Math.max(1,bg.endY);
  for(let y=0;y<H;y++){
    const o=y*W, by=y/S;
    const tone=lerp(bg.topTone,bg.bottomTone,clamp(by/endY,0,1));
    for(let x=0;x<W;x++){ lum[o+x]=clamp(tone+grain(x/S,by)*bg.grain,0,1); twoBitSlot[o+x]=-2; }
  }
}

/* ======================================================================
   FRAME
   ==================================================================== */
function renderFrame(t){
  const time=t??elapsed;
  drawSky();
  drawBanks(time,false);
  /* Composite the baked still world. Where it covers a pixel it replaces
     the sky and the clouds behind it and hands over its depth; everywhere
     else the depth buffer is open so a car may draw freely. */
  for(let i=0;i<HC.length;i++){
    if(HC[i]){ lum[i]=HL[i]; twoBitSlot[i]=HS[i]; dep[i]=HD[i]; }
    else dep[i]=Infinity;
  }
  drawHeadlights(time);
  drawCars(time);
  drawSmoke(time);
  drawBanks(time,true);
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
function png(){ const a=document.createElement('a'); a.download='car-circling-cloud-hill-'+W+'x'+H+'.png'; a.href=cv.toDataURL('image/png'); a.click(); }

build();
fitCanvas(); renderFrame(elapsed);
const loadEl=document.getElementById('load');
if(loadEl) loadEl.remove();
startDriver();

window.__hill={ CFG:CFG,
  fit:fitCanvas, render:()=>renderFrame(elapsed),
  refresh(){const p=CFG.render||{dark:CFG.ink,middle:CFG.paper,light:CFG.paper,accent:CFG.paper};CINK=packColor(p.dark);CMID=packColor(p.middle);CPAP=packColor(p.light);CACC=packColor(p.accent);renderFrame(elapsed);},
  /* The still world is baked, so any change to hill, road, house, camera
     or cloud geometry has to re-bake before it can be seen. */
  update:rebuild, rebuild, png,
  toggle:function(){
    const shouldRun=playback.toggleManual();
    if(shouldRun) startDriver(); else driverActive=false;
    return !shouldRun;
  },
  pause:function(){ playback.pauseManual(); driverActive=false; },
  play:function(){ if(playback.playManual()) startDriver(); },
  /* `run(sec)` jumps the clock without drawing the frames between — the
     way to check that the scene at an hour is the scene at ten seconds. */
  run:function(sec){ elapsed+=sec; renderFrame(elapsed); return elapsed; },
  cars:function(){ return carsAt(elapsed); },
  state:function(){ return { elapsed:+elapsed.toFixed(2), onRoad:carsAt(elapsed).length }; } };
})();
