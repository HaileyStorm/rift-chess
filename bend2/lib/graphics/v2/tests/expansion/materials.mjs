/** Independent integer references for prepared gradient and periodic materials. */
import Ramp from '../../Ramp.bend';
import Field from '../../Field.bend';
import Draw from '../../DrawList.bend';
import Plan from '../../RenderPlan.bend';
import Stroke from '../../Stroke.bend';
import Skin from '../../NineSlice.bend';
import {assert,pix,image,flat,list,box,rng,equalPixels} from './support.mjs';
const random=rng(0x72724),stop=(position,color)=>({$:'Stop',position,color});let ramps=0,luts=0,noise=0,periodic=0,pixels=0;
/** Piecewise linear encoded RGB reference, with right-continuous duplicate knots. */
function ramp(stops,q){q=Math.min(q,65535);let a=stops[0];if(q<a.position)return a.color;for(const b of stops.slice(1)){if(q<b.position){const n=q-a.position,d=b.position-a.position;let c=0;for(const s of [0,8,16])c|=Math.floor((((a.color>>>s)&255)*(d-n)+((b.color>>>s)&255)*n+Math.floor(d/2))/d)<<s;return c>>>0;}a=b;}return a.color;}
const stops=[stop(1000,0x14203a),stop(23000,0x735486),stop(23000,0xc57552),stop(55000,0xebdbb3),stop(65535,0xffffff)];
const g=Ramp.build(list(stops));assert.equal(g.$,'Some');
for(let q=0;q<=65535;q++){assert.equal(Ramp.sample(g.value,q),ramp(stops,q));ramps++;}
for(let n=0;n<100;n++){const ss=Array.from({length:1+random(16)},()=>stop(random(65536),random(1<<24))).sort((a,b)=>a.position-b.position),gg=Ramp.build(list(ss));assert.equal(gg.$,'Some');for(let k=0;k<100;k++){const q=random(100000);assert.equal(Ramp.sample(gg.value,q),ramp(ss,q));ramps++;}}
for(const ss of [[],[stop(1,0),stop(0,0)],[stop(65536,0)],[stop(0,0x1000000)],Array.from({length:17},()=>stop(0,0))])assert.equal(Ramp.build(list(ss)).$,'None');
for(let d=0;d<=10;d++){const lut=Ramp.bake(BigInt(d),g.value),size=2**d;assert.equal(lut.size,size);for(let q=0;q<=65535;q+=17){const i=Math.floor((q*(size-1)+32767)/65535),position=size===1?0:Math.floor(i*65535/(size-1));assert.equal(Ramp.lookup(lut,q),ramp(stops,position));luts++;}assert.equal(Ramp.lookup(lut,0),ramp(stops,0));assert.equal(Ramp.lookup(lut,65535),ramp(stops,size===1?0:65535));}
assert.equal(Ramp.bake(100n,g.value).size,1024);
/** BigInt wraparound oracle independently spells the 32-bit vertex hash. */
function hash(x,y,seed){const mask=0xffffffffn;let a=((BigInt(x)*374761393n+BigInt(y)*668265263n)&mask)^BigInt(seed),b=((a^(a>>13n))*1274126177n)&mask;return Number((b^(b>>16n))&65535n);}
/** Smooth q8 interpolation reference using exact JavaScript integers. */
function value(x,y,p,seed){const ix=Math.floor(x/256)%p,iy=Math.floor(y/256)%p,jx=(ix+1)%p,jy=(iy+1)%p,fade=t=>Math.floor((t*t*(768-2*t)+32768)/65536),fx=fade(x%256),fy=fade(y%256),mix=(a,b,w)=>Math.floor((a*(256-w)+b*w+128)/256);return mix(mix(hash(ix,iy,seed),hash(jx,iy,seed),fx),mix(hash(ix,jy,seed),hash(jx,jy,seed),fx),fy);}
/** Weighted fractal oracle, with wrapping before coordinate doubling. */
function sample(recipe,x,y){const p=Math.max(1,Math.min(256,recipe.period)),count=Number(recipe.octaves<1n?1n:recipe.octaves>8n?8n:recipe.octaves),mod=p*256;let w=128,total=0,sum=0,seed=recipe.seed;for(let i=0;i<count;i++){total+=value(x,y,p,seed)*w;sum+=w;x=(x%mod)*2%mod;y=(y%mod)*2%mod;seed=(seed+1013904223)>>>0;w=Math.floor(w/2);}return Math.floor((total+Math.floor(sum/2))/sum);}
for(let i=0;i<12000;i++){const recipe={$:'Recipe',seed:random(0xffffffff),period:random(300),octaves:BigInt(random(12))},x=random(0xffffffff),y=random(0xffffffff);assert.equal(Field.sample(recipe,x,y),sample(recipe,x,y));noise++;const p=Math.max(1,Math.min(256,recipe.period)),xx=x%1000000,yy=y%1000000;assert.equal(Field.sample(recipe,xx+p*256,yy),Field.sample(recipe,xx,yy));assert.equal(Field.sample(recipe,xx,yy+p*256),Field.sample(recipe,xx,yy));periodic+=2;}
const recipe={$:'Recipe',seed:417,period:5,octaves:5n},lut=Ramp.bake(8n,g.value),rendered=Field.bake(6n,recipe,lut),want=new Uint32Array(4096);
for(let y=0;y<64;y++)for(let x=0;x<64;x++){const q=sample(recipe,Math.floor((2*x+1)*5*256/128),Math.floor((2*y+1)*5*256/128)),i=Math.floor((q*255+32767)/65535);want[y*64+x]=ramp(stops,Math.floor(i*65535/255));}
pixels+=equalPixels(flat(rendered,64),want,'material bake');
// Cross-module planner integration: direct drawing is already independently
// scalar-tested in sampling.mjs and stroke.mjs; test every cut/order here.
const point=(x,y)=>({$:'Point',x,y}),path=Stroke.cubic(3n,point(3,52),point(12,4),point(50,64),point(58,9),2.5),texture={$:'Texture',depth:3n,size:8,colors:image(8,(x,y)=>(x*31<<16)|(y*31<<8)|31),mask:image(8,(x,y)=>((x*39+y*17)&255)<<16)},insets={$:'Insets',left:2,top:2,right:2,bottom:2},rect=box(4,6,57,47),clip=box(8,3,60,60),bg=pix(0x203040);
let direct=Skin.draw(6n,64,rect,texture,insets,193,clip,bg);direct=Stroke.draw(6n,64,path,0xe0af30,143,clip,direct);
const commands=list([Draw.skin(rect,texture,insets,193,clip),Draw.stroke(path,0xe0af30,143,clip)]);
for(const cut of [0n,1n,3n,6n])for(const forks of [0n,1n,3n])pixels+=equalPixels(flat(Plan.render(Plan.prepare(cut,6n,64,commands),forks,bg),64),flat(direct,64),'planned skin/stroke');
assert.equal(Draw.skin(box(0,0,1,1),texture,insets,255,clip).$,'Noop');assert.equal(Draw.stroke(path,0,0,clip).$,'Noop');
console.log(JSON.stringify({ok:true,ramps,luts,noise,periodic,pixels,scope:'actual pinned compiler emitted JS; independent exact integer and BigInt noise references; material and mixed-command planner comparisons'}));
