import assert from 'node:assert/strict';
import BoardScene from '../../graphics/v2game/BoardScene.bend';
import Camera from '../../graphics/Camera.bend';
import Model from '../../core/Model.bend';
import Color from '../../lib/graphics/v2/Color.bend';
import Ortho from '../../lib/graphics/Ortho.bend';
import Pixel from '../../lib/graphics/pixels/Pixel.bend';
import {list,pix,sample,type Image} from '../../lib/graphics/v2/tests/review/helpers.ts';

const size=512,depth=9n,theme=0,underlayColor=0x142536;
const renderSize=256,renderDepth=8n;
const underlay:Image=pix(underlayColor);
const yes={$:'True'},emptyList=list([]);
const view=Camera.default_view();
const camera=Camera.basis(view);
const neighbors=Model.macro_mask(5);
const material=(square:number)=>BoardScene.surface(square,theme);
const imageDiffers=(a:Image,b:Image):boolean=>{
  for(let y=0;y<size;y++)for(let x=0;x<size;x++)
    if(sample(a,size,x,y)!==sample(b,size,x,y))return true;
  return false;
};
function hasColorNear(image:Image,x:number,y:number,color:number,radius=2,
  canvasSize=size):boolean {
  for(let yy=y-radius;yy<=y+radius;yy++)for(let xx=x-radius;xx<=x+radius;xx++)
    if(xx>=0&&yy>=0&&xx<canvasSize&&yy<canvasSize&&
       sample(image,canvasSize,xx,yy)===color)return true;
  return false;
}
function wallPoint(a:any,b:any,drop:number):[number,number] {
  return [Math.round((a.x+b.x)/2),Math.round((a.y+b.y)/2+drop*0.58)];
}
function rimPoint(a:any,b:any,center:any):[number,number] {
  const ia=BoardScene.rim_inset(a,center),ib=BoardScene.rim_inset(b,center);
  return [Math.round(((a.x+b.x)/2+(ia.x+ib.x)/2)/2),
    Math.round(((a.y+b.y)/2+(ia.y+ib.y)/2)/2)];
}
function corners(square:number,basis:any=camera,canvasSize=size):any {
  return BoardScene.square_corners(canvasSize,basis,
    Model.file_of(square),Model.rank_of(square));
}
function frame(holes:number,viewArg:any=view):any {
  const board=list(Array(64).fill(0));
  const position={$:'Pos',board,holes,side:yes,rights:0,ep:64,epPawn:64,quiet:0n,full:1n};
  return {$:'Frame',position,previous:position,selected:64,hovered:64,
    targets:emptyList,tile:64,tileTargets:emptyList,lastAction:21760,
    progress:16,theme,view:viewArg,shifts:emptyList,check:64};
}
function insideQuad(x:number,y:number,points:any[]):boolean {
  let positive=false,negative=false;
  for(let i=0;i<4;i++) {
    const a=points[i],b=points[(i+1)%4];
    const cross=(b.x-a.x)*(y-a.y)-(b.y-a.y)*(x-a.x);
    if(cross>0)positive=true;if(cross<0)negative=true;
  }
  return !(positive&&negative);
}
function visibleWallChange(open:Image,closed:Image,quad:any[],topQuad:any[],
  canvasSize:number):number {
  const left=Math.max(0,Math.floor(Math.min(...quad.map(p=>p.x)))),
    right=Math.min(canvasSize,Math.ceil(Math.max(...quad.map(p=>p.x)))),
    top=Math.max(0,Math.floor(Math.min(...quad.map(p=>p.y)))),
    bottom=Math.min(canvasSize,Math.ceil(Math.max(...quad.map(p=>p.y))));
  let changed=0;
  for(let y=top;y<bottom;y++)for(let x=left;x<right;x++) {
    const center={x:x+0.5,y:y+0.5};
    if(insideQuad(center.x,center.y,quad)&&!insideQuad(center.x,center.y,topQuad)&&
       sample(open,canvasSize,x,y)!==sample(closed,canvasSize,x,y))changed++;
  }
  return changed;
}
function wallColorPixels(image:Image,closed:Image,quad:any[],topQuad:any[],colors:number[],
  canvasSize:number):number {
  const left=Math.max(0,Math.floor(Math.min(...quad.map(p=>p.x)))),
    right=Math.min(canvasSize,Math.ceil(Math.max(...quad.map(p=>p.x)))),
    top=Math.max(0,Math.floor(Math.min(...quad.map(p=>p.y)))),
    bottom=Math.min(canvasSize,Math.ceil(Math.max(...quad.map(p=>p.y))));
  const accepted=new Set(colors);let found=0;
  for(let y=top;y<bottom;y++)for(let x=left;x<right;x++) {
    const center={x:x+0.5,y:y+0.5};
    if(insideQuad(center.x,center.y,quad)&&!insideQuad(center.x,center.y,topQuad)) {
      const visible=sample(image,canvasSize,x,y);
      if(visible!==sample(closed,canvasSize,x,y)&&accepted.has(visible))found++;
    }
  }
  return found;
}
function predictedWallColors(square:number,edge:string,yaw:number):number[] {
  const style=material(square),raw=edge==='rank-up'||edge==='rank-down'?style.side:style.shadow;
  // BoardScene inserts the edge wall before RaisedFacet's cast-shadow pass.
  // Where that translated shadow overlaps, it computes Color.over(shadow,wall,92).
  const colors=[raw,Color.over(style.shadow,raw,92)];
  // At the yaw-270/file-left overlap, the settled painter also blends the
  // retained side material over the shadow band at opacity 160 before the
  // optional cast-shadow pass. Restrict acceptance to those exact compositions.
  if(yaw===270&&edge==='file-left') {
    const sideOverShadow=Color.over(style.side,style.shadow,160);
    colors.push(sideOverShadow,Color.over(style.shadow,sideOverShadow,92));
  }
  return [...new Set(colors)];
}
function insideInsetQuad(x:number,y:number,points:any[],margin:number):boolean {
  let area=0;
  for(let i=0;i<4;i++) {
    const a=points[i],b=points[(i+1)%4];area+=a.x*b.y-b.x*a.y;
  }
  const orientation=area>=0?1:-1;
  for(let i=0;i<4;i++) {
    const a=points[i],b=points[(i+1)%4],dx=b.x-a.x,dy=b.y-a.y;
    const signed=orientation*(dx*(y-a.y)-dy*(x-a.x))/Math.hypot(dx,dy);
    if(signed<margin)return false;
  }
  return true;
}
function maskPixels(image:Image,points:any[],margin:number,
  check:(color:number,x:number,y:number)=>void,canvasSize:number):number {
  const left=Math.max(0,Math.floor(Math.min(...points.map(p=>p.x)))),
    right=Math.min(canvasSize,Math.ceil(Math.max(...points.map(p=>p.x)))),
    top=Math.max(0,Math.floor(Math.min(...points.map(p=>p.y)))),
    bottom=Math.min(canvasSize,Math.ceil(Math.max(...points.map(p=>p.y))));
  let count=0;
  for(let y=top;y<bottom;y++)for(let x=left;x<right;x++)
    if(insideInsetQuad(x+0.5,y+0.5,points,margin)) {
      check(sample(image,canvasSize,x,y),x,y);count++;
    }
  return count;
}

// Outside-board and in-range missing-neighbor cases share one edge predicate.
assert.equal(BoardScene.missing_file_left(0,3,0),true,'outer file-left edge');
assert.equal(BoardScene.missing_file_right(7,3,0),true,'outer file-right edge');
assert.equal(BoardScene.missing_rank_down(3,0,0),true,'outer rank-down edge');
assert.equal(BoardScene.missing_rank_up(3,7,0),true,'outer rank-up edge');
assert.equal(BoardScene.missing_file_right(1,1,0),false,'shared present neighbor');
assert.equal(BoardScene.missing_rank_up(2,1,0),false,'present rift-facing neighbor');
assert.equal(BoardScene.missing_rank_up(2,1,neighbors),true,'missing rift-facing neighbor');
const facingEdges=[
  {yaw:0,edge:'rank-down',square:Model.sq(2,4),neighbor:Model.sq(2,3)},
  {yaw:90,edge:'file-right',square:Model.sq(1,2),neighbor:Model.sq(2,2)},
  {yaw:180,edge:'rank-up',square:Model.sq(2,1),neighbor:Model.sq(2,2)},
  {yaw:270,edge:'file-left',square:Model.sq(4,2),neighbor:Model.sq(3,2)},
];
for(const testCase of facingEdges) {
  const file=Model.file_of(testCase.square),rank=Model.rank_of(testCase.square);
  const exposed=()=>testCase.edge==='rank-up'?BoardScene.missing_rank_up(file,rank,neighbors):
    testCase.edge==='rank-down'?BoardScene.missing_rank_down(file,rank,neighbors):
    testCase.edge==='file-right'?BoardScene.missing_file_right(file,rank,neighbors):
    BoardScene.missing_file_left(file,rank,neighbors);
  const shared=()=>testCase.edge==='rank-up'?BoardScene.missing_rank_up(file,rank,0):
    testCase.edge==='rank-down'?BoardScene.missing_rank_down(file,rank,0):
    testCase.edge==='file-right'?BoardScene.missing_file_right(file,rank,0):
    BoardScene.missing_file_left(file,rank,0);
  assert.equal(exposed(),true,`${testCase.edge} neighbor is absent at yaw ${testCase.yaw}`);
  assert.equal(shared(),false,`${testCase.edge} neighbor is present at yaw ${testCase.yaw}`);
  assert.equal(Model.present(neighbors,testCase.neighbor),false,
    `${testCase.edge} test points into the missing macro`);
}

// A fully surrounded tile adds neither walls nor the exposed-only lip.
const sharedSquare=Model.sq(1,1),sharedCorners=corners(sharedSquare);
const sharedWalls=BoardScene.cutout_walls(sharedSquare,depth,size,0,theme,
  sharedCorners,camera,underlay) as Image;
const sharedLip=BoardScene.cutout_rim(sharedSquare,depth,size,0,theme,
  sharedCorners,underlay) as Image;
assert.deepEqual(sharedWalls,underlay,'no wall across four shared present edges');
assert.deepEqual(sharedLip,underlay,'no exposed lip across four shared present edges');

// Outer-board wall and lip use the existing camera extrusion and tile material.
const outerSquare=Model.sq(3,7),outerCorners=corners(outerSquare);
const drop=BoardScene.extrusion(size,camera);
const outerWalls=BoardScene.cutout_walls(outerSquare,depth,size,0,theme,
  outerCorners,camera,underlay) as Image;
const outerSide=material(outerSquare).side;
const [outerX,outerY]=wallPoint(outerCorners.p00,outerCorners.p10,drop);
assert.ok(hasColorNear(outerWalls,outerX,outerY,outerSide),
  'outer exposed edge has a solid vertical wall facet');
const outerLip=BoardScene.cutout_rim(outerSquare,depth,size,0,theme,
  outerCorners,underlay) as Image;
const outerLipCenter={x:(outerCorners.p00.x+outerCorners.p11.x)/2,
  y:(outerCorners.p00.y+outerCorners.p11.y)/2};
const [lipX,lipY]=rimPoint(outerCorners.p00,outerCorners.p10,outerLipCenter);
assert.ok(imageDiffers(outerLip,underlay),'outer exposed edge gets a top lip');
assert.notEqual(sample(outerLip,size,lipX,lipY),underlayColor,
  'outer top-lip sample is visibly distinct from the underlay');

// Macro 5 removes squares (2,2),(3,2),(2,3),(3,3). Square (2,1) faces that
// opening on rank-up, which is not one of RaisedFacet's unconditional sides.
const riftSquare=Model.sq(2,1),riftCorners=corners(riftSquare);
const riftWalls=BoardScene.cutout_walls(riftSquare,depth,size,neighbors,theme,
  riftCorners,camera,underlay) as Image;
const riftBaseline=BoardScene.cutout_walls(riftSquare,depth,size,0,theme,
  riftCorners,camera,underlay) as Image;
const riftSide=material(riftSquare).side;
const [riftX,riftY]=wallPoint(riftCorners.p00,riftCorners.p10,drop);
assert.ok(hasColorNear(riftWalls,riftX,riftY,riftSide),
  'rift-facing exposed edge has a vertical wall in the existing side material');
assert.deepEqual(riftBaseline,underlay,'present shared edge does not acquire a wall');
const riftLip=BoardScene.cutout_rim(riftSquare,depth,size,neighbors,theme,
  riftCorners,underlay) as Image;
const riftClosedLip=BoardScene.cutout_rim(riftSquare,depth,size,0,theme,
  riftCorners,underlay) as Image;
assert.ok(imageDiffers(riftLip,riftClosedLip),'rift-facing edge gets an exposed-only top lip');

// Scan each exposed edge around macro 5 in each cardinal settled view. A wall
// must both change pixels outside the tile top versus a filled-board reference
// and retain its exact side/shadow material in that exposed region.
const edgePixels:Array<{yaw:number;edge:string;changed:number;colorPixels:number;predictedColors:string[]}>=[];
const byEdge={
  'rank-up':{a:'p00',b:'p10'},'file-right':{a:'p10',b:'p11'},
  'rank-down':{a:'p11',b:'p01'},'file-left':{a:'p01',b:'p00'},
} as const;
for(const yaw of [0,90,180,270]) {
  const orbitView={$:'View',yaw,pitch:52,zoom:115},
    orbitCamera=Camera.basis(orbitView),
    opened=BoardScene.ground_prepared(
      BoardScene.context_for(renderDepth,renderSize,frame(neighbors,orbitView)),underlay) as Image,
    closed=BoardScene.ground_prepared(
      BoardScene.context_for(renderDepth,renderSize,frame(0,orbitView)),underlay) as Image;
  for(const testCase of facingEdges) {
    const orbitCorners=corners(testCase.square,orbitCamera,renderSize),
      orbitDrop=BoardScene.extrusion(renderSize,orbitCamera),
      points=byEdge[testCase.edge as keyof typeof byEdge],
      a=orbitCorners[points.a as keyof typeof orbitCorners],
      b=orbitCorners[points.b as keyof typeof orbitCorners],
      down=(p:any)=>({x:p.x,y:p.y+orbitDrop});
    const wallQuad=[a,b,down(b),down(a)],topQuad=[orbitCorners.p00,
      orbitCorners.p10,orbitCorners.p11,orbitCorners.p01];
    const changed=visibleWallChange(opened,closed,wallQuad,topQuad,renderSize);
    const predicted=predictedWallColors(testCase.square,testCase.edge,yaw);
    const colorPixels=wallColorPixels(opened,closed,wallQuad,topQuad,predicted,renderSize);
    edgePixels.push({yaw,edge:testCase.edge,changed,colorPixels,
      predictedColors:predicted.map(color=>`#${color.toString(16).padStart(6,'0')}`)});
  }
}
console.log(JSON.stringify({edgePixels}));

// Mask the full projected 2x2 missing aperture. The intentional side/rim band
// may occupy its perimeter; the core, inset beyond extrusion and cast shadow,
// must remain the caller's underlay at every sampled pixel.
const apertureView={$:'View',yaw:0,pitch:52,zoom:115};
const apertureCamera=Camera.basis(apertureView);
const apertureGround=BoardScene.ground_prepared(
  BoardScene.context_for(depth,size,frame(neighbors,apertureView)),underlay) as Image;
const apertureQuad=[
  BoardScene.point(apertureCamera,size,1.5,3.5),
  BoardScene.point(apertureCamera,size,3.5,3.5),
  BoardScene.point(apertureCamera,size,3.5,5.5),
  BoardScene.point(apertureCamera,size,1.5,5.5),
];
let aperturePixels=0;
aperturePixels=maskPixels(apertureGround,apertureQuad,0,()=>{},size);
const apertureMargin=BoardScene.extrusion(size,apertureCamera)+7+3;
const apertureCorePixels=maskPixels(apertureGround,apertureQuad,apertureMargin,
  color=>assert.equal(color,underlayColor,'aperture core retains underlay'),size);
assert.ok(aperturePixels>0&&apertureCorePixels>0,'full aperture and safe core masks are nonempty');

// The eight present tiles surrounding the missing macro retain their exact top
// material throughout an inset mask, so wall facets cannot spill across their
// shared/present top surfaces in the composed settled ground.
const adjacentSquares=[
  Model.sq(2,1),Model.sq(3,1),Model.sq(2,4),Model.sq(3,4),
  Model.sq(1,2),Model.sq(1,3),Model.sq(4,2),Model.sq(4,3),
];
let adjacentTopPixels=0;
for(const square of adjacentSquares) {
  assert.equal(Model.present(neighbors,square),true,`adjacent square ${square} is present`);
  const tileCorners=corners(square,apertureCamera,size),quad=[tileCorners.p00,
    tileCorners.p10,tileCorners.p11,tileCorners.p01],expected=material(square).top;
  const pixels=maskPixels(apertureGround,quad,5,
    (color,x,y)=>assert.equal(color,expected,
      `no wall spill onto present tile ${square} at ${x},${y}`),size);
  assert.ok(pixels>0,`present tile ${square} mask is nonempty`);
  adjacentTopPixels+=pixels;
}

// Exactly one of the four exposed sides faces the camera at each cardinal
// yaw; it must both alter the masked region and retain its side/shadow color.
// The other three wall quads are naturally hidden behind the top/board plane.
console.log(JSON.stringify({edgePixels,aperturePixels,apertureCorePixels,adjacentTopPixels}));
for(const yaw of [0,90,180,270]) {
  const facing=facingEdges.find(edge=>edge.yaw===yaw)!;
  for(const edge of ['rank-up','file-right','rank-down','file-left']) {
    const result=edgePixels.find(pixel=>pixel.yaw===yaw&&pixel.edge===edge)!;
    if(edge===facing.edge) {
      assert.ok(result.changed>0,`${edge} exposed wall changes pixels at yaw ${yaw}`);
      assert.ok(result.colorPixels>0,`${edge} exposed wall retains its material at yaw ${yaw}`);
    } else {
      assert.equal(result.changed,0,`${edge} back-facing wall stays occluded at yaw ${yaw}`);
      assert.equal(result.colorPixels,0,`${edge} back-facing material stays absent at yaw ${yaw}`);
    }
  }
}

console.log(JSON.stringify({ok:true,topologyChecks:19,edgePixels,
  aperturePixels,apertureCorePixels,adjacentTopPixels,
  scope:'Per-facing-edge settled wall checks at four cardinal yaw; full aperture core underlay and adjacent present-tile top masks; fast orbit pass remains flat and unchanged.'}));
