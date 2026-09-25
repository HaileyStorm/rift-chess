/** Native glyph-group placement versus independent PMA coverage composition. */
import Layer from '../../third/GlyphLayer.bend';
import Surface from '../../third/Surface.bend';
import P from '../../third/Premul.bend';
import {assert,flat,image,list,box,coord,rng,equalPixels} from '../expansion/support.mjs';
const random=rng(0xa67323);let pixels=0;
/** Independent canonical word construction from a glyph's coverage sample. */
function ink(rgb,a){let out=(a<<24)>>>0;for(const shift of [0,8,16])out|=Math.floor((((rgb>>>shift)&255)*a+127)/255)<<shift;return out>>>0;}
/** Independent PMA source-over, not the legacy RGB formula. */
function blend(s,d){let out=0;const a=s>>>24;for(const shift of [0,8,16,24])out|=(((s>>>shift)&255)+Math.floor((((d>>>shift)&255)*(255-a)+127)/255))<<shift;return out>>>0;}
for(let trial=0;trial<120;trial++){
 const size=64,clip=box(3,4,58,61),color=random(0xffffff),records=[],placed=[];
 for(let i=0;i<8;i++){const x=random(80)-10,y=random(80)-10,left=random(15)-7,top=random(15)-7,side=1<<random(5),coverage=image(side,()=>random(256)<<16);records.push({x:x+left,y:y+top,side,coverage:flat(coverage,side)});placed.push({$:'Placed',x:coord(x),y:coord(y),glyph:{$:'Mask',advance:side,left:coord(left),top:coord(top),depth:BigInt(Math.log2(side)),size:side,coverage}});}
 const want=new Uint32Array(size*size);for(const g of records)for(let y=4;y<61;y++)for(let x=3;x<58;x++)if(x>=g.x&&x<g.x+g.side&&y>=g.y&&y<g.y+g.side){const a=g.coverage[(y-g.y)*g.side+x-g.x]>>>16&255;want[y*size+x]=blend(ink(color,a),want[y*size+x]);}
 const layer=Layer.prepare(list(placed),6n,color,clip);pixels+=equalPixels(flat(layer.pixels,size),want,'native glyph group');assert.equal(Surface.opacity(layer,255),layer);
}
assert.equal(Layer.prepare(list([]),6n,0xffffff,box(0,0,64,64)).pixels.color,0);
console.log(JSON.stringify({ok:true,pixelComparisons:pixels,positionedGlyphs:960,scope:'Actual emitted Bend; independent scalar native-mask reference, signed bearings, clipping, overlap and PMA ink. Not shaping or font-quality proof.'}));
