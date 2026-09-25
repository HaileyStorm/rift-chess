/** Offline diagnostic: actual compiled Bend glyphs, layers and effects.
 * Host code supplies application layout and local-font coverage only. Every
 * canvas pixel, including native-resolution glyph ink, is composed by Bend.
 * Coverage input is temporary and must not be included in the delivery.
 */
import fs from 'node:fs';
import P from './compiled/Premul.mjs';
import S from './compiled/Surface.mjs';
import E from './compiled/Effects.mjs';
import Shape from './compiled/Shape.mjs';
import Paint from './compiled/Paint.mjs';
import G from './compiled/GlyphLayer.mjs';
import {ImageBuffer} from '../../host/ImageBuffer.mjs';
import {list,box,solid,linear,radial} from './scene.mjs';
const [input,output]=process.argv.slice(2);
if(!input||!output)throw Error('Usage: node effects-plate.mjs temporary-coverage.json pixels.rgba');
const baked=JSON.parse(fs.readFileSync(input,'utf8'));
/** Encode a signed integer in the existing graphics coordinate representation. */
function coord(n){return n<0?{$:'Neg',magnitude:-n}:{$:'Pos',value:n};}
/** Pack one native scalar coverage grid into an immutable red-mask Image. */
function mask(bytes,size,x=0,y=0,n=size){if(n===1)return {$:'Pix',color:bytes[y*size+x]<<16};const h=n/2,a=mask(bytes,size,x,y,h),b=mask(bytes,size,x+h,y,h),c=mask(bytes,size,x,y+h,h),d=mask(bytes,size,x+h,y+h,h);return a.$==='Pix'&&b.$==='Pix'&&c.$==='Pix'&&d.$==='Pix'&&a.color===b.color&&a.color===c.color&&a.color===d.color?a:{$:'Qua',tl:a,tr:b,bl:c,br:d};}
const glyphs=new Map(baked.glyphs.map(g=>[g.key,{$:'Mask',advance:g.advance,left:coord(g.left),top:coord(g.top),depth:BigInt(Math.log2(g.size)),size:g.size,coverage:mask(Buffer.from(g.coverage,'base64'),g.size)}]));
/** Prepare a native glyph run, preserving supplied signed bearings and order. */
function text(key,depth,color=0xf0f3ff){const spec=baked.runs[key];if(!spec)throw Error(`Missing native run ${key}`);return G.prepare(list(spec.map(g=>({$:'Placed',x:coord(g.x),y:coord(g.y),glyph:glyphs.get(g.key)}))),BigInt(depth),color,box(0,0,1<<depth,1<<depth));}
/** Explicit same-size isolated composition with no implicit resize. */
function over(source,dest,mode='Over'){const result=S.merge({$:mode},source,dest);if(result.$!=='Some')throw Error('Specimen extent mismatch');return result.value;}
/** Fill a shape on an isolated surface using fixed 4x4 coverage. */
function fill(surface,shape,brush,quality='Sixteen'){return Paint.fill(surface,shape,brush,{$:quality},0n,box(0,0,surface.size,surface.size));}
/** Local 448x244 card with transparent padding in its 512-square surface. */
function card(index){let s=fill(S.blank(9n),Shape.rounded(0,0,448,244,18),solid(0x354361));s=fill(s,Shape.rounded(1,1,447,243,17),linear(0,0,448,244,[[0,0x19243e],[65535,0x0d172b]]));return over(text(`label${index}`,9,0x9eabcc),s);}
/** Place a sparse 512-square source into the 1024-square composition. */
function place(source,x,y){const z={$:'Pix',color:0};return E.translate({$:'Surface',depth:10n,size:1024,pixels:{$:'Qua',tl:source.pixels,tr:z,bl:z,br:z}},coord(x),coord(y));}
/** Prepare an exact repeated-box halo; reject invalid parameters visibly. */
function halo(source,color,radius,passes,strength,x=0,y=0){const result=E.halo(source,color,radius,BigInt(passes),strength,coord(x),coord(y));if(result.$!=='Some')throw Error('Rejected halo');return result.value;}
/** Limit an alpha gradient to a native glyph group using source-in. */
function ink(letters,brush){return over(fill(S.blank(9n),Shape.rounded(15,55,430,177,0),brush,'Center'),letters,'SourceIn');}
const start=performance.now();
let page=fill(S.blank(10n),Shape.rounded(0,0,1024,1024,0),linear(0,0,1024,1024,[[0,0x111a30],[65535,0x060c18]]),'Center');
page=over(text('header',10),page);page=over(text('subhead',10,0x93a5c7),page);
let c=card(0);c=over(ink(text('native',9),linear(22,74,385,150,[[0,0xbffff6],[28000,0x60dcf5],[65535,0xa68eff]])),c);c=over(text('note0',9,0x97abc9),c);page=over(place(c,48,142),page);
c=card(1);let letters=text('shadow',9,0xf2edff);c=over(halo(letters,0x050716,6,3,240,4,9),c);c=over(letters,c);c=over(text('note1',9,0x97abc9),c);page=over(place(c,528,142),page);
c=card(2);letters=text('glow',9,0xffe5b1);c=over(halo(letters,0xbb61ff,9,3,235),c,'Plus');c=over(halo(letters,0xfc9d78,3,2,210),c,'Plus');c=over(letters,c);c=over(text('note2',9,0x97abc9),c);page=over(place(c,48,414),page);
c=card(3);let group=S.blank(9n);for(const [x,color] of [[150,0x60ebd4],[225,0x8781fa],[300,0xfaaf87]])group=fill(group,Shape.ellipse(x,119,65,58),solid(color,205));group=over(text('group',9,0xffffff),group);c=over(S.opacity(group,160),c);c=over(text('note3',9,0x97abc9),c);page=over(place(c,528,414),page);
c=card(4);for(const [i,mode] of ['Multiply','Screen','Plus'].entries()){const x=79+i*139;let a=fill(S.blank(9n),Shape.ellipse(x-13,125,41,41),solid(0x82e8f3,215)),b=fill(S.blank(9n),Shape.ellipse(x+17,125,41,41),solid(0xfb9fca,215));c=over(over(b,a,mode),c);}c=over(text('modes',9,0xb7c8e2),c);page=over(place(c,48,686),page);
c=card(5);letters=text('fill',9);let material=fill(S.blank(9n),Shape.rounded(20,65,428,171,0),linear(25,70,405,165,[[0,0x69f1d0],[24000,0x689df6],[47000,0xb995fa],[65535,0xfaba8c]]),'Center');for(let x=-180;x<500;x+=31){const a=Shape.rounded(Math.max(0,x),57,Math.max(1,x+12),180,0);material=fill(material,a,solid(0xffffff,60));}c=over(over(material,letters,'SourceIn'),c);c=over(text('note5',9,0x97abc9),c);page=over(place(c,528,686),page);
page=over(text('footer',10,0x637897),page);
const stage=new ImageBuffer(1024);stage.write(S.flatten(page,{$:'Pix',color:0}));fs.writeFileSync(output,stage.bytes);
console.log(JSON.stringify({ok:true,pixels:1048576,seconds:(performance.now()-start)/1000,scope:'All pixels composed by actual compiled Bend, including native glyph placement. Pillow supplied native 8-bit font coverage only. This one-shot visual duration is not a benchmark.'}));
