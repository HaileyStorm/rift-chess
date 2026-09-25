/** Application-owned visual specimens. All coverage, fill, gradients and compositing
 * below execute compiled Bend library code. This file chooses geometry and palette;
 * it is deliberately not part of the reusable library or a claimed mesh renderer.
 */
import P from './compiled/Premul.mjs';
import Brush from './compiled/Brush.mjs';
import Shape from './compiled/Shape.mjs';
import Path from './compiled/PathFill.mjs';
import Raster from './compiled/Raster.mjs';
import Surface from './compiled/Surface.mjs';
import Stroke from './compiled/Stroke.mjs';
export {Raster,Surface,P,Shape};
export const SIZE=1024;
/** Convert host scene descriptions to immutable Bend lists. */
export function list(items){let result={$:'Nil'};for(let i=items.length-1;i>=0;i--)result={$:'Con',head:items[i],tail:result};return result;}
/** F32 application coordinates; no real-arithmetic geometry claim. */
export function point(x,y){return {$:'Point',x:Math.fround(x),y:Math.fround(y)};}
/** Pixel-aligned explicit output scissor. */
export function box(left=0,top=0,right=SIZE,bottom=SIZE){return {$:'Box',left,top,right,bottom};}
/** Canonical encoded-space premultiplied color. */
export function solid(color,alpha=255){return {$:'Solid',pixel:P.straight(color,alpha)};}
/** Checked PMA gradient knots; transparent colors are canonicalized at preparation. */
function stops(values){const result=Brush.stops(list(values.map(([q,color,alpha=255])=>({$:'Stop',position:q,pixel:P.straight(color,alpha)}))));if(result.$!=='Some')throw Error('Invalid specimen gradient');return result.value;}
/** Prepare one application-space linear gradient. */
export function linear(x0,y0,x1,y1,values){const r=Brush.linear(point(x0,y0),point(x1,y1),stops(values),{$:'Pad'});if(r.$!=='Some')throw Error('Invalid specimen axis');return r.value;}
/** Prepare an elliptical glow/falloff without asserting it is a Gaussian. */
export function radial(x,y,rx,ry,values){const r=Brush.radial(x,y,rx,ry,stops(values),{$:'Pad'});if(r.$!=='Some')throw Error('Invalid specimen radius');return r.value;}
/** Capture a shape/brush/quality and explicit scissor in the reusable batch API. */
export function command(shape,brush,quality='Four',clip=box()){return Raster.command(shape,brush,{$:quality},clip);}
/** Application convenience for a rounded filled contour. */
export function round(x,y,w,h,r,brush,quality='Four'){return command(Shape.rounded(x,y,x+w,y+h,r),brush,quality);}
/** Prepare a stroked polyline through the existing reusable stroke engine. */
function stroke(points,radius){let path={$:'Empty'};for(let i=1;i<points.length;i++)path=Stroke.join(path,Stroke.line(points[i-1],points[i],radius));return Shape.stroked(path);}
/** An oriented compound polygon with a real hole, not an opaque painted center. */
function ring(cx,cy,rx,ry,width,angle,segments=64){const c=Math.cos(angle),s=Math.sin(angle),contour=(xx,yy)=>Array.from({length:segments},(_,i)=>{const t=i/segments*Math.PI*2,x=xx*Math.cos(t),y=yy*Math.sin(t);return point(cx+x*c-y*s,cy+x*s+y*c);});const outside=Path.polygon(list(contour(rx,ry))),inside=Path.polygon(list(contour(rx-width,ry-width).reverse()));if(outside.$!=='Some'||inside.$!=='Some')throw Error('Invalid ring');return Shape.closed(Path.join(outside.value,inside.value),{$:'NonZero'});}
/** Brightness variation uses deterministic application-owned pseudo-randomness. */
function rng(seed){let value=seed>>>0;return()=>{value^=value<<13;value^=value>>>17;value^=value<<5;return (value>>>0)/4294967296;};}
/** Common field gives antialiased objects a legible spatial reference. */
function field(){const commands=[round(0,0,1024,1024,0,linear(0,0,1024,1024,[[0,0x141b37],[34000,0x070e20],[65535,0x081928]]),'Center')];for(let x=32;x<1024;x+=48)for(let y=32;y<1024;y+=48)commands.push(command(Shape.ellipse(x,y,.75,.75),solid(0x7d9dd1,32),'Four'));return commands;}
/** Aurora uses compound contours, real transparent holes, gradients and coverage. */
function aurora(){const a=field();a.push(command(Shape.ellipse(430,450,480,430),radial(430,450,480,430,[[0,0x6c50ff,65],[29000,0x35307b,35],[65535,0x35307b,0]])));
 a.push(command(Shape.ellipse(700,680,300,260),radial(700,680,300,260,[[0,0x1cb3bc,48],[65535,0x1cb3bc,0]])));
 const ribbons=[{x:526,y:499,rx:340,ry:220,w:78,t:-.52,st:[[0,0x47dfff],[23000,0x568cff],[47000,0xa584ff],[65535,0xffc3d5]]},{x:475,y:490,rx:319,ry:178,w:61,t:.83,st:[[0,0xfef4d0],[18000,0xffb775],[42000,0xc562f4],[65535,0x7068ff]]},{x:556,y:532,rx:220,ry:100,w:24,t:-.51,st:[[0,0x96ffed],[30000,0x22d8d4],[65535,0x4d78ff]]}];
 for(const r of ribbons){a.push(command(ring(r.x+3,r.y+12,r.rx+7,r.ry+7,r.w+13,r.t),solid(0x050b1e,135)));a.push(command(ring(r.x,r.y,r.rx,r.ry,r.w,r.t),linear(r.x-r.rx,r.y-r.ry,r.x+r.rx,r.y+r.ry,r.st),'Sixteen'));a.push(command(ring(r.x,r.y,r.rx,r.ry,1.2,r.t),solid(0xf3f4ff,170),'Sixteen'));}
 const random=rng(319);for(let i=0;i<72;i++){const x=110+random()*800,y=105+random()*785,s=.6+random()*1.3;a.push(command(Shape.ellipse(x,y,s,s),solid(0xd4e5ff,60+Math.floor(random()*120))));}
 // Small radial beads are actual PMA gradients, not CSS shadows.
 for(const [x,y,r,color]of [[270,300,19,0x98f1ff],[795,470,27,0xffc9ba],[614,742,14,0xbca5ff]]){a.push(command(Shape.ellipse(x,y,r*3,r*3),radial(x,y,r*3,r*3,[[0,color,85],[65535,color,0]])));a.push(command(Shape.ellipse(x,y,r,r),radial(x-r*.35,y-r*.4,r*1.8,r*1.8,[[0,0xffffff],[15000,color],[65535,0x101c4a]]),'Sixteen'));}
 return list(a);}
/** A vector-design specimen makes holes, Boolean geometry and corner AA visible. */
function topology(){const a=field();a.push(round(72,88,880,850,30,linear(0,90,1024,950,[[0,0x263250,210],[65535,0x111a32,230]])));
 const colors=[0x9f94ff,0x42dbd2,0xffbc7c,0xff82af];for(let row=0;row<2;row++)for(let col=0;col<2;col++){
 const x=106+col*420,y=126+row*380,c=colors[row*2+col];a.push(round(x,y,392,350,18,solid(0x060f22,150)));
 const left=Shape.ellipse(x+142,y+140,92,92),right=Shape.rounded(x+143,y+73,x+311,y+240,30);const shape=row===0?(col===0?Shape.union(left,right):Shape.intersect(left,right)):(col===0?Shape.subtract(left,right):Shape.union(Shape.subtract(left,right),Shape.subtract(right,left)));
 a.push(command(shape,linear(x,y,x+390,y+300,[[0,0xe1edff],[28000,c],[65535,0x646edf]]),'Sixteen'));
 a.push(round(x+28,y+280,190,3,1.5,solid(c,210)));for(let i=0;i<3;i++)a.push(round(x+28+i*58,y+305,42,5,2,solid(c,50+i*35)));
 }
 return list(a);}
/** An app-neutral instrument panel: graph lines, rings, glass cards and ramp fills. */
function instrument(){const a=field();a.push(round(58,72,908,880,34,linear(0,0,1024,1024,[[0,0x1e2f50,243],[65535,0x101a31,245]])));a.push(round(90,118,844,398,22,solid(0x061020,210)));
 for(let i=0;i<6;i++)a.push(round(118,162+i*55,787,1,0,solid(0x7b9dcb,28),'Center'));
 const wave=(phase,scale)=>Array.from({length:97},(_,i)=>point(118+i*8.05,320+Math.sin(i*.115+phase)*scale+Math.cos(i*.061-phase)*scale*.45));
 a.push(command(stroke(wave(.4,77),5),solid(0x438cfd,32)));a.push(command(stroke(wave(.4,77),1.8),linear(120,0,900,0,[[0,0x697dff],[30000,0x43d9f0],[65535,0xb4ffe1]]),'Four'));
 a.push(command(stroke(wave(2.2,58),1.2),solid(0xc194ff,177),'Four'));
 for(const [x,c,val]of [[104,0x50e4d3,.72],[387,0xa18eff,.46],[670,0xffbc80,.83]]){a.push(round(x,555,249,331,20,solid(0x08132b,170)));a.push(command(Shape.subtract(Shape.ellipse(x+124,676,73,73),Shape.ellipse(x+124,676,63,63)),solid(c,42),'Sixteen'));let points=[];for(let i=0;i<=44;i++){const angle=-Math.PI*.5+i/44*2*Math.PI*val;points.push(point(x+124+68*Math.cos(angle),676+68*Math.sin(angle)));}a.push(command(stroke(points,5),linear(x,600,x+249,740,[[0,0xe9f5ff],[28000,c],[65535,c,90]]),'Four'));a.push(round(x+40,790,169,8,4,solid(c,40)));a.push(round(x+40,790,169*val,8,4,solid(c,210)));for(let i=0;i<3;i++)a.push(round(x+40,816+i*16,169-i*24,3,1,solid(0xb6c9e3,30)));}
 return list(a);}
/** Only the application's selected specimen determines layout and styling. */
export function scene(name){if(name==='topology')return topology();if(name==='instrument')return instrument();if(name==='aurora')return aurora();throw new RangeError('Unknown specimen');}
/** Small dynamic region, useful for testing damage and interactive worker updates. */
export function dynamic(name,phase,visible=true){if(!visible)return {$:'Nil'};const x=160+phase*700,y=900;return list([round(118,892,788,18,9,solid(0x627bb1,35)),round(118,897,Math.max(10,x-118),8,4,linear(118,0,900,0,[[0,0x766dff],[65535,0x59eadb]])),command(Shape.ellipse(x,y,18,18),radial(x-4,y-5,30,30,[[0,0xffffff],[16000,0xa7eeff],[65535,0x427ef2]]),'Sixteen')]);}
export const dynamicDamage=[{left:100,top:875,right:930,bottom:923}];
