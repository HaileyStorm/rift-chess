/** Independent finite F32 crossing, sample-grid and layer-effect references. */
import Path from '../../third/PathFill.bend';
import Shape from '../../third/Shape.bend';
import Brush from '../../third/Brush.bend';
import Paint from '../../third/Paint.bend';
import Raster from '../../third/Raster.bend';
import Surface from '../../third/Surface.bend';
import P from '../../third/Premul.bend';
import Effects from '../../third/Effects.bend';
import Shift from '../../third/ImageShift.bend';
import {assert,image,flat,pix,list,box,coord,rng,equalPixels} from '../expansion/support.mjs';
const f=Math.fround,random=rng(0x410329);let points=0,coverageChecks=0,pixels=0,gradientChecks=0;
/** Create exact finite coordinate constructors. */
function pt(x,y){return {$:'Point',x:f(x),y:f(y)};}
/** Independent explicit F32 edge traversal, with separate signed winding. */
function inside(contours,x,y,nonzero){let winding=0,crossings=0;for(const contour of contours)for(let i=0;i<contour.length;i++){let a=contour[i],b=contour[(i+1)%contour.length],sign=1;if(a.y===b.y)continue;if(a.y>b.y){[a,b]=[b,a];sign=-1;}if(y<a.y||y>=b.y)continue;const cross=f(f(f(b.x-a.x)*f(y-a.y))-f(f(x-a.x)*f(b.y-a.y)));if(cross>0){crossings++;winding+=sign;}}return nonzero?winding!==0:crossings%2!==0;}
/** Independent PMA byte operations, not delegated to the library. */
function bytes(v){return [v>>>16&255,v>>>8&255,v&255,v>>>24];}
/** Assemble canonical premultiplied bytes. */
function pack(c){const a=c[3];return ((a<<24)|(Math.min(a,c[0])<<16)|(Math.min(a,c[1])<<8)|Math.min(a,c[2]))>>>0;}
/** Exact one-time coverage scaling and source-over for the new pixel type. */
function blend(s,d,a=255){const ss=bytes(s).map(v=>Math.floor((v*a+127)/255)),dd=bytes(d),inv=255-ss[3];return pack(ss.map((v,i)=>v+Math.floor((dd[i]*inv+127)/255)));}
const outer=[pt(1,1),pt(30,1),pt(30,29),pt(1,29)],hole=[pt(8,8),pt(23,8),pt(23,22),pt(8,22)],bow=[pt(0,0),pt(31,31),pt(0,31),pt(31,0)];
for(let trial=0;trial<50;trial++){
 const contours=trial===0?[outer,hole]:trial===1?[outer,[...hole].reverse()]:trial===2?[bow]:[Array.from({length:3+random(12)},()=>pt((random(161)-16)/4,(random(161)-16)/4))];
 let edges={$:'Empty'};for(const c of contours){const e=Path.polygon(list(c));assert.equal(e.$,'Some');edges=Path.join(edges,e.value);}
 for(const rule of ['EvenOdd','NonZero']){const sh=Shape.closed(edges,{$:rule});for(let y=0;y<32;y++)for(let x=0;x<32;x++){
  for(const [quality,n] of [['Center',1],['Four',2],['Sixteen',4]]){let hits=0;for(let j=0;j<n;j++)for(let i=0;i<n;i++){const xx=f(x+(i+.5)/n),yy=f(y+(j+.5)/n),want=inside(contours,xx,yy,rule==='NonZero');assert.equal(Path.hit(edges,{$:rule},xx,yy),want,`${trial}/${rule}/${xx},${yy}`);assert.equal(Shape.hit(sh,xx,yy),want);points++;hits+=Number(want);}assert.equal(Shape.coverage(sh,{$:quality},x,y),Math.floor(hits*255/(n*n)));coverageChecks++;}
 }
 }
}
assert.equal(Path.polygon(list([pt(1,1),pt(NaN,2)])).$,'None');assert.equal(Path.polygon(list(Array(1025).fill(pt(1,1)))).$,'None');assert.equal(Path.polygon(list([])).value.$,'Empty');
assert.equal(Path.checked_cubic(9n,pt(0,0),pt(1,2),pt(3,4),pt(5,6)).$,'None');assert.equal(Path.checked_quadratic(8n,pt(0,0),pt(8,16),pt(32,0)).$,'Some');
for(let level=0;level<=7;level++){
 /** Independent de Casteljau sequence in source order. */
 function curve(a,b,c,d,n){if(!n)return [a,d];const mid=(p,q)=>pt(f(f(p.x+q.x)*.5),f(f(p.y+q.y)*.5)),ab=mid(a,b),bc=mid(b,c),cd=mid(c,d),abc=mid(ab,bc),bcd=mid(bc,cd),m=mid(abc,bcd);return [...curve(a,ab,abc,m,n-1).slice(0,-1),...curve(m,bcd,cd,d,n-1)];}
 const a=pt(3,27),b=pt(-3,0),c=pt(34,1),d=pt(28,28),curvePoints=curve(a,b,c,d,level),edges=Path.join(Path.checked_cubic(BigInt(level),a,b,c,d).value,Path.edge(d,a));
 for(let y=0;y<32;y++)for(let x=0;x<32;x++){assert.equal(Path.hit(edges,{$:'NonZero'},x+.5,y+.5),inside([curvePoints],x+.5,y+.5,true));points++;}
}
const ra=Shape.rounded(3,4,27,30,4),el=Shape.ellipse(19,15,12,8);
/** Independent F32 primitive hit reference. */
function primitive(shape,x,y){if(shape==='r'){const dx=f(x-Math.max(7,Math.min(23,x))),dy=f(y-Math.max(8,Math.min(26,y)));return x>=3&&x<27&&y>=4&&y<30&&f(f(dx*dx)+f(dy*dy))<=16;}const dx=f(f(x-19)*f(1/12)),dy=f(f(y-15)*f(1/8));return f(f(dx*dx)+f(dy*dy))<=1;}
for(const [sh,op]of [[ra,'r'],[el,'e'],[Shape.union(ra,el),'u'],[Shape.intersect(ra,el),'i'],[Shape.subtract(ra,el),'d']])for(let y=0;y<32;y++)for(let x=0;x<32;x++){let h=0;for(let j=0;j<4;j++)for(let i=0;i<4;i++){const xx=x+(i+.5)/4,yy=y+(j+.5)/4,a=primitive('r',xx,yy),b=primitive('e',xx,yy);h+=Number(op==='r'?a:op==='e'?b:op==='u'?a||b:op==='i'?a&&b:a&&!b);}assert.equal(Shape.coverage(sh,{$:'Sixteen'},x,y),Math.floor(h*255/16));coverageChecks++;}
// Duplicate knots are right-continuous, and hidden RGB cannot bleed through alpha.
const stops=[{$:'Stop',position:0,pixel:P.straight(0x006eff,255)},{$:'Stop',position:30000,pixel:P.straight(0xff0000,0)},{$:'Stop',position:30000,pixel:P.straight(0x40ff80,160)},{$:'Stop',position:65535,pixel:P.straight(0xffffff,255)}],prepared=Brush.stops(list(stops)).value;
for(let q=0;q<65536;q++) {let a=stops[0],b=null;for(const s of stops){if(q>=s.position)a=s;else {b=s;break;}}const want=b?pack(bytes(a.pixel).map((c,i)=>Math.floor((c*(b.position-q)+bytes(b.pixel)[i]*(q-a.position)+Math.floor((b.position-a.position)/2))/(b.position-a.position)))):a.pixel;assert.equal(Brush.ramp(prepared,q),want);gradientChecks++;}
for(const bad of [[],[stops[3],stops[0]],Array(33).fill(stops[0]),[{$:'Stop',position:0,pixel:0x0000ff00}]])assert.equal(Brush.stops(list(bad)).$,'None');
for(const v of [-4,-3.75,-1,-.25,0,.125,1,1.75,4]){assert.equal(Brush.spread({$:'Repeat'},v),f(v-Math.floor(v)));const u=f(v-Math.floor(v/2)*2);assert.equal(Brush.spread({$:'Reflect'},v),f(1-Math.abs(u-1)));gradientChecks+=2;}
assert.equal(Brush.linear(pt(0,0),pt(1e-30,0),prepared,{$:'Pad'}).$,'None');assert.equal(Brush.linear(pt(0,0),pt(1/256,0),prepared,{$:'Pad'}).$,'Some');assert.equal(Brush.radial(0,0,0,1,prepared,{$:'Pad'}).$,'None');
const linear=Brush.linear(pt(0,0),pt(32,0),prepared,{$:'Pad'}).value,radial=Brush.radial(16,16,12,8,prepared,{$:'Reflect'}).value;
for(let y=0;y<32;y++)for(let x=0;x<32;x++){assert.equal(Brush.sample(linear,x+.5,y+.5),Brush.ramp(prepared,Math.floor(f(f((x+.5)/32)*65535))));gradientChecks++;}
const size=32,depth=5n,base=image(size,(x,y)=>pack([x*2,y*2,13,90])),source={$:'Surface',depth,size,pixels:base},clip=box(1,2,31,29),shapes=[ra,el,Shape.subtract(ra,el),Shape.closed(Path.polygon(list(bow)).value,{$:'EvenOdd'})];
for(const shape of shapes)for(const brush of [{$:'Solid',pixel:P.straight(0xb18aff,173)},linear,radial])for(const quality of ['Center','Four','Sixteen']){
 const want=flat(base,size);for(let y=2;y<29;y++)for(let x=1;x<31;x++){// Separate arithmetic reference; coverage/brush independently checked above.
  const a=Shape.coverage(shape,{$:quality},x,y);want[y*size+x]=blend(Brush.sample(brush,x+.5,y+.5),want[y*size+x],a);
 }
 const command=Raster.command(shape,brush,{$:quality},clip);
 for(const forks of [0n,2n]){pixels+=equalPixels(flat(Paint.fill(source,shape,brush,{$:quality},forks,clip).pixels,size),want,'fill/clip');pixels+=equalPixels(flat(Raster.render(source,list([command]),forks).pixels,size),want,'batch/fork');}
}
const commands=shapes.map((s,i)=>Raster.command(s,{$:'Solid',pixel:P.straight(0x7188ff+i*19000,150+i*20)},{$:'Four'},clip)),sequential=commands.reduce((s,c)=>Paint.fill(s,c.shape,c.brush,c.quality,0n,clip),source);
for(const forks of [0n,1n,2n,3n])pixels+=equalPixels(flat(Raster.render(source,list(commands),forks).pixels,size),flat(sequential.pixels,size),'painter order');
// Exact arbitrary word translation, including PMA alpha/high bits and negative shifts.
for(let trial=0;trial<150;trial++){const dx=random(90)-45,dy=random(90)-45,src=image(size,()=>random(0xffffffff)),a=flat(src,size),want=new Uint32Array(size*size);for(let y=0;y<size;y++)for(let x=0;x<size;x++)if(x-dx>=0&&x-dx<size&&y-dy>=0&&y-dy<size)want[y*size+x]=a[(y-dy)*size+x-dx];pixels+=equalPixels(flat(Shift.shift(depth,size,src,coord(dx),coord(dy)),size),want,'word shift');}
// Halo composed from an independent naive two-pass blur and exact shifted words.
const haloSource={$:'Surface',depth:4n,size:16,pixels:image(16,(x,y)=>P.straight(0x8833ff,x>=3&&x<12&&y>=2&&y<11?180:0))},r=3,k=7;
/** Independent fixed-denominator transparent-border filter. */
function naive(a,horizontal){const out=new Uint32Array(256);for(let y=0;y<16;y++)for(let x=0;x<16;x++){const c=[0,0,0,0];for(let j=-r;j<=r;j++){const xx=x+(horizontal?j:0),yy=y+(horizontal?0:j);if(xx>=0&&xx<16&&yy>=0&&yy<16)bytes(a[yy*16+xx]).forEach((v,i)=>c[i]+=v);}out[y*16+x]=pack(c.map(v=>Math.floor((v+3)/k)));}return out;}
let expected=flat(haloSource.pixels,16).map(v=>{const a=v>>>24;return pack([Math.floor((0x33*a+127)/255),Math.floor((0xaa*a+127)/255),a,a]);});for(let i=0;i<2;i++)expected=naive(naive(expected,true),false);expected=expected.map(v=>pack(bytes(v).map(c=>Math.floor((c*137+127)/255))));const shifted=new Uint32Array(256);for(let y=0;y<16;y++)for(let x=0;x<16;x++)if(x>=2&&y<15)shifted[y*16+x]=expected[(y+1)*16+x-2];
pixels+=equalPixels(flat(Effects.halo(haloSource,0x33aaff,3,2n,137,coord(2),coord(-1)).value.pixels,16),shifted,'halo');assert.equal(Effects.soften(haloSource,4n,1,{$:'Clamp'}).$,'None');assert.equal(Effects.soften(haloSource,0n,1,{$:'Clamp'}).value,haloSource);
console.log(JSON.stringify({ok:true,pointQueries:points,coverageChecks,gradientChecks,pixelComparisons:pixels,scope:'Actual emitted Bend; independent finite F32 crossing and integer effect references. Radial sampler parity only, not a real-number proof.'}));
