/** App-neutral visual specimens. Every shape, glyph, blend, sample and material
 * is rendered by the ACTUAL pinned Bend compiler's emitted modules. JavaScript
 * owns example scene policy and PNG/readback only; no Canvas drawing is used.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {pathToFileURL} from 'node:url';
import Draw from '../DrawList.bend';
import Plan from '../RenderPlan.bend';
import Clip from '../Clip.bend';
import Stroke from '../Stroke.bend';
import Rounded from '../Rounded.bend';
import Shapes from '../Shapes.bend';
import Sample from '../RgbaSample.bend';
import Affine from '../RgbaAffine.bend';
import Mip from '../Mip.bend';
import Ramp from '../Ramp.bend';
import Field from '../Field.bend';
import Fx from '../ColorFx.bend';
import Glyph from '../Glyph.bend';
import Text from '../TextLayout.bend';
import Hit from '../TextHit.bend';
import Atlas from '../AtlasParagraph.bend';
import Layout from '../Layout2D.bend';
import {ImageBuffer} from '../host/ImageBuffer.mjs';
import {writePng} from '../tools/png.mjs';
const output=process.env.VISUAL_OUTPUT,fonts=process.env.VISUAL_FONTS;
if(!output||!fonts)throw Error('Set VISUAL_OUTPUT and VISUAL_FONTS; see REPRODUCE.md. Font modules are temporary, not bundled.');
fs.mkdirSync(output,{recursive:true});
const Font=(await import(pathToFileURL(path.join(fonts,'Native24.bend')))).default;
const Title=(await import(pathToFileURL(path.join(fonts,'Native40.bend')))).default;
/** Host construction of immutable Bend lists, preserving painter order. */
function list(a){let r={$:'Nil'};for(let i=a.length-1;i>=0;i--)r={$:'Con',head:a[i],tail:r};return r;}
/** Read immutable lists for example layout/caret/selection presentation. */
function array(xs){const a=[];while(xs.$==='Con'){a.push(xs.head);xs=xs.tail;}return a;}
/** Opaque RGB uniform image and signed coordinate constructors. */
function pix(color){return {$:'Pix',color};}
/** Signed position uses the library's canonical coordinate constructors. */
function coord(n){return n<0?{$:'Neg',magnitude:-n}:{$:'Pos',value:n};}
/** Unbiased half-open rectangle for clipping and layout. */
function box(left,top,right,bottom){return {$:'Box',left,top,right,bottom};}
/** F32 geometric point; chosen scene values are finite and bounded. */
function point(x,y){return {$:'Point',x:Math.fround(x),y:Math.fround(y)};}
/** Prepared affine map from unit texture coordinates, not a camera policy. */
function geometry(x,y,w,h,angle=0){const c=Math.cos(angle),s=Math.sin(angle);return Affine.prepare({$:'Matrix',a:Math.fround(w*c),b:Math.fround(w*s),c:Math.fround(-h*s),d:Math.fround(h*c),tx:Math.fround(x),ty:Math.fround(y)});}
/** Produce one deterministic material entirely in Bend, with explicit baked ramp. */
function material(colors,seed=41,period=5,octaves=5n,depth=7n){const stops=colors.map((color,i)=>({$:'Stop',position:Math.floor(i*65535/(colors.length-1)),color})),gradient=Ramp.build(list(stops));if(gradient.$!=='Some')throw Error('Invalid example ramp');return Field.bake(depth,{$:'Recipe',seed,period,octaves},Ramp.bake(8n,gradient.value));}
/** Round-corner alpha skin: 32² preparation is reused across destination sizes. */
function skin(){const mask=Rounded.draw(5n,32,coord(0),coord(0),coord(32),coord(32),10,0xff0000,255,pix(0));let colors=Rounded.draw(5n,32,coord(0),coord(0),coord(32),coord(32),10,0x344965,255,pix(0));colors=Rounded.draw(5n,32,coord(1),coord(1),coord(31),coord(31),9,0x152337,255,colors);return {$:'Texture',depth:5n,size:32,colors,mask};}
const panel=skin(),insets={$:'Insets',left:11,top:11,right:11,bottom:11};
const palette={background:0x0c1421,ink:0xe8edf5,muted:0x9daec5,accent:0xa8b5ff,mint:0x75d5b7,gold:0xe6bc84};
/** One example-owned scene; all pixel composition is delegated to Bend. */
class Scene{
 /** Begin a 1024² square specimen. Scene dimensions are not library policy. */
 constructor(title,subtitle){this.size=1024;this.depth=10n;this.image=pix(palette.background);this.started=performance.now();this.text(32,65,title,palette.ink,Title);this.text(33,101,subtitle,palette.muted);}
 /** Add a painter-ordered command through the shared sequential command kernel. */
 command(command){this.image=Draw.draw_one(command,this.depth,this.size,0,0,this.image);}
 /** Fill a half-open rectangle with the library's encoded-channel alpha semantics. */
 fill(rect,color,opacity=255){this.command(Draw.fill(rect,color,opacity));}
 /** Stretch the same prepared nine-slice skin without changing its corner pixels. */
 panel(rect){this.command(Draw.skin(rect,panel,insets,255,box(0,0,1024,1024)));}
 /** Draw one prepared source under a selectable affine filter. */
 mapped(texture,x,y,w,h,angle=0,filter='Linear',opacity=255,clip=box(0,0,1024,1024)){this.command(Draw.mapped(geometry(x,y,w,h,angle),texture,{$:filter},opacity,clip));}
 /** Union quarter-sample stroke coverage before one alpha blend. */
 stroke(path,color,opacity=255,clip=box(0,0,1024,1024)){this.command(Draw.stroke(path,color,opacity,clip));}
 /** Draw a native-resolution, hash-pinned temporary font through Glyph masks. */
 text(x,y,text,color=palette.ink,font=Font){this.image=font.draw_line(this.depth,this.size,text,coord(x),coord(y),color,255,this.image);}
 /** Use native glyph metrics with generic text flow, selection and caret helpers. */
 paragraph(text,x,y,width,maxLines=10,selection=null){
  const chars=Array.from(text),items=chars.map((ch,i)=>ch==='\n'?{$:'Break',source:i,end:i+1}:ch===' '?{$:'Space',source:i,end:i+1,advance:Font.glyph(32).advance}:ch==='\t'?{$:'Tab',source:i,end:i+1}:{$:'Glyph',source:i,end:i+1,key:ch.codePointAt(0),advance:Font.glyph(ch.codePointAt(0)).advance,kern:coord(0)}),layout=Text.layout(list(items),{$:'Settings',width,line_height:33,max_lines:maxLines,tab_size:48,word_wrap:true});
  if(selection)for(const r of array(Hit.selection(layout.carets,...selection,33)))this.fill(box(x+r.left,y+r.top,x+r.right,y+r.bottom),0x687dc0,100);
  const run=array(layout.glyphs).map(p=>({$:'Placed',x:coord(x+p.x),y:coord(y+p.y+26),glyph:Font.glyph(p.key)}));this.image=Glyph.draw_run(list(run),this.depth,this.size,palette.ink,255,this.image);return layout;
 }
 /** Readback and PNG encoding are separately timed; the result is not a browser capture. */
 save(name){const constructionMs=performance.now()-this.started,buffer=new ImageBuffer(this.size),t=performance.now(),read=buffer.write(this.image),readbackMs=performance.now()-t,f=path.join(output,name+'.png'),start=performance.now();writePng(f,this.size,this.size,buffer.bytes);const pngMs=performance.now()-start;const rec={file:path.basename(f),width:this.size,height:this.size,constructionMs,readbackMs,pngMs,visited:read.visited,pixels:read.pixels,rgba_sha256:crypto.createHash('sha256').update(buffer.bytes).digest('hex'),png_sha256:crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex')};receipts.push(rec);console.log(JSON.stringify(rec));}
}
const receipts=[];
// 01: application-neutral workbench. The layout lives HERE, outside the library.
{
 const s=new Scene('Bend graphics / reusable workbench','Ordered composition  /  native-size type  /  cached procedural assets');
 s.panel(box(32,130,648,518));s.panel(box(672,130,992,710));s.panel(box(32,542,648,710));
 s.text(56,171,'Signal view');s.text(697,171,'Notes / selectable text');
 for(let i=0;i<5;i++)s.fill(box(66,209+i*60,615,210+i*60),0x30425a,150);
 for(let i=0;i<9;i++)s.fill(box(70+i*66,205,71+i*66,472),0x30425a,85);
 const path=Stroke.join(Stroke.cubic(5n,point(75,400),point(155,385),point(195,215),point(270,267),3),Stroke.cubic(5n,point(270,267),point(360,340),point(490,170),point(598,237),3));s.stroke(path,palette.mint,235,box(68,200,616,475));
 const path2=Stroke.cubic(6n,point(75,351),point(200,450),point(450,217),point(598,334),2);s.stroke(path2,palette.accent,210,box(68,200,616,475));
 s.text(70,498,'0');s.text(330,498,'Time / units');s.text(582,498,'60');
 const lay=s.paragraph('Reusable primitives for editors, dashboards, diagrams and games.\n\nWrap once. Cache static text. Preserve source positions for selection and hit testing.',696,197,269,14,[31,85]);
 const caret=Hit.hit(lay.carets,170,231,33);if(caret.$==='Some')s.fill(box(696+caret.value.x,197+caret.value.y,698+caret.value.x,230+caret.value.y),palette.gold);
 s.text(56,579,'Immutable scene / selective repaint');s.paragraph('Prepare spatial bins when the scene changes. Rebuild damaged tiles from the background; keep untouched output.',56,596,560,3);
 const mats=[[0x172c30,0x477665,0xc5bea0],[0x342846,0x8f6574,0xdec5ad],[0x253d58,0x7197ad,0xd5e0e0]];
 for(let i=0;i<3;i++){const r=Layout.grid_cell(box(32,734,992,990),3,1,24,0,i,0).value;s.panel(r);const colors=material(mats[i],81+i*61,4+i,5n);s.mapped({$:'Texture',depth:7n,size:128,colors,mask:pix(0xff0000)},r.left+16,756,r.right-r.left-32,162);s.text(r.left+18,954,['Moss / smooth field','Clay / warm ramp','Slate / cool ramp'][i]);}
 s.save('01-reusable-workbench');
}
// 02: alpha-safe transformed sprites with explicit mip selection.
{
 const s=new Scene('Alpha sprites / transformed sampling','Separate straight RGB and alpha  /  filtering without hidden-color fringes');
 for(let y=145;y<944;y+=24)for(let x=32;x<992;x+=24)s.fill(box(x,y,Math.min(x+24,992),Math.min(y+24,944)),((x-32)/24+(y-145)/24)%2?0x27364a:0x1d2c40);
 const colors=material([0x261e42,0xb36d95,0xf1d298],983,5,5n,6n),mask=Shapes.disk(6n,64,coord(32),coord(32),29,0xff0000,255,pix(0)),texture={$:'Texture',depth:6n,size:64,colors,mask};
 s.text(58,190,'Nearest');s.text(544,190,'Alpha-weighted linear');
 s.mapped(texture,135,213,245,245,.13,'Nearest');s.mapped(texture,615,213,245,245,.13,'Linear');
 s.fill(box(32,508,992,548),palette.background);s.text(58,537,'Ordered translucent overlaps / scissored to the checkerboard');
 for(let i=0;i<6;i++)s.mapped(texture,110+i*137,576+(i%2)*28,167,167,(i-3)*.09,'Linear',130+i*17,box(32,549,992,789));
 s.fill(box(32,791,992,838),palette.background);s.text(58,823,'Explicit mip levels; no automatic quality or camera policy');
 for(let i=0;i<6;i++){const m=Mip.level(BigInt(i),6n,64,colors,mask);s.mapped({...m,$:'Texture'},90+i*155,866,60,60,0,'Linear');s.text(83+i*155,975,'level '+i);}
 s.save('02-alpha-and-mips');
}
// 03: materials, color transforms, nine-slice shape preservation.
{
 const s=new Scene('Materials / reusable skins','Integer periodic fields  /  prepared palette lookup  /  fixed-size corners');
 const palettes=[[0x091d25,0x2c5961,0x89b4b2],[0x2b1d2e,0x78565a,0xd1b496],[0x151b2b,0x434766,0xc1b3d2],[0x132c1d,0x477248,0xb2bc82]];
 for(let i=0;i<4;i++){const r=Layout.grid_cell(box(32,142,992,454),4,1,20,0,i,0).value;s.panel(r);const colors=material(palettes[i],32+i*17,i+2,BigInt(i+2));s.mapped({$:'Texture',depth:7n,size:128,colors,mask:pix(0xff0000)},r.left+12,158,r.right-r.left-24,213);s.text(r.left+15,408,['Lagoon','Sandstone','Amethyst','Lichen'][i]);}
 s.text(35,505,'One 32 x 32 alpha skin / no scaled corner radii');
 for(const r of [box(32,535,219,622),box(245,535,599,622),box(625,535,992,708),box(32,648,599,708)])s.panel(r);
 s.text(60,587,'Compact');s.text(269,587,'Wide control surface');s.text(649,584,'Taller panel');s.text(59,690,'Single cached source / fixed margins');
 s.text(35,770,'Prepared color transforms / alpha stays separate');
 const colors=material(palettes[0],29,4,6n),effects=[null,{$:'Tint',rgb:0xe0b3ff},{$:'Grayscale'},{$:'Duotone',low:0x312044,high:0xf2dba2}];
 for(let i=0;i<4;i++){const transformed=effects[i]?Fx.map(7n,effects[i],colors):colors;s.mapped({$:'Texture',depth:7n,size:128,colors:transformed,mask:pix(0xff0000)},44+i*244,800,204,128);s.text(47+i*244,970,['Original','Tint','Grayscale','Duotone'][i]);}
 s.save('03-materials-and-skins');
}
// 04: legible native coverage + generic text selection. No Unicode-shaping claim.
{
 const s=new Scene('Text / metrics before pixels','Native-size coverage  /  source-aware wrapping  /  explicit selection affinity');
 s.panel(box(32,143,626,698));s.panel(box(650,143,992,698));
 s.text(58,185,'Generic flow + native glyph masks');
 const text='Typography should be legible before it is decorative.\n\nThis paragraph wraps by supplied metrics, not by guessing character widths.\n\nSelection uses source positions. Tabs\tadvance to explicit stops. Oversized words stay bounded by a line budget.';
 const lay=s.paragraph(text,58,207,539,13,[62,154]);
 s.text(676,185,'Hit testing');
 const carets=array(lay.carets),examples=[[80,44],[170,170],[200,301]];
 for(let i=0;i<examples.length;i++){const hit=Hit.hit(lay.carets,...examples[i],33).value;s.text(676,244+i*116,'Source '+hit.source);s.text(676,277+i*116,'Line '+hit.line+' / x '+hit.x);s.fill(box(58+hit.x,207+hit.y,60+hit.x,240+hit.y),palette.gold);}
 s.text(676,638,'Logical Latin example');s.text(676,669,'Not a shaping engine');
 s.text(34,760,'Old 24px atlas x2 / nearest repeated coverage');
 const a=Atlas.prepare('Ag  0123  Bend',2,{$:'Settings',width:950,line_height:58,max_lines:1,tab_size:48,word_wrap:false});s.image=Atlas.draw(a.value,10n,1024,36,779,2,palette.ink,s.image);
 s.text(35,885,'Native 40px / eight-bit coverage / no source-grid magnification');
 s.text(36,943,'Ag  0123  Bend',palette.ink,Title);
 s.save('04-text-and-native-type');
}
// 05: actual old/new scene and dirty reconstruction; raster-equal full redraw.
{
 const s=new Scene('Damage / restore before recomposing','Caller-owned old + new bounds  /  removal restores the background');
 const size=256,depth=8n,bg=material([0x172536,0x30435a,0x516278],301,3,4n,depth),sourceColors=material([0x402647,0xbc7586,0xf3d79e],63,4,4n,6n),mask=Shapes.disk(6n,64,coord(32),coord(32),29,0xff0000,255,pix(0)),clip=box(0,0,size,size);
 /** Build a small independent scene at one pose, with a foreground overlap. */
 function commands(x){return list([Draw.sprite(size,6n,64,coord(x),coord(92),sourceColors,mask,219,clip),Draw.fill(box(123,135,235,146),palette.mint,210)]);}
 const previous=Plan.render(Plan.prepare(3n,depth,size,commands(47)),0n,bg),nextPlan=Plan.prepare(3n,depth,size,commands(135)),damage=list([box(47,92,111,156),box(135,92,199,156)]),partial=Plan.repaint(nextPlan,damage,bg,previous),full=Plan.render(nextPlan,0n,bg);
 const a=new ImageBuffer(size),b=new ImageBuffer(size);a.write(partial);b.write(full);if(!Buffer.from(a.bytes).equals(Buffer.from(b.bytes)))throw Error('Visual damage frame differs from full redraw');
 for(const [i,img,label]of [[0,previous,'Previous pose'],[1,partial,'Damage repaint'],[2,full,'Full redraw reference']]){const x=38+i*324;s.mapped({$:'Texture',depth,size,colors:img,mask:pix(0xff0000)},x,180,300,300,0,'Nearest');s.text(x,527,label);}
 s.paragraph('The middle result was rebuilt only in tiles intersecting the old or new sprite bounds. The final pixels exactly match the complete redraw. The foreground line remains above the moving sprite.',40,570,918,5);
 const erased=Plan.repaint(Plan.prepare(3n,depth,size,list([])),list([box(0,0,size,size)]),bg,previous);
 s.mapped({$:'Texture',depth,size,colors:erased,mask:pix(0xff0000)},42,765,180,180,0,'Linear');s.paragraph('Removing the last command restores the background. Empty damage returns the previous image unchanged. The application still owns damage completeness.',251,786,711,5);
 s.save('05-damage-reconstruction');
}
fs.writeFileSync(path.join(output,'visual-receipts.json'),JSON.stringify({backend:'actual pinned compiler emitted JS under Node; not a browser screenshot or GPU execution',font_modules:'temporary hash-pinned local-font bakes; no font files bundled',timing:'single diagnostic captures, not benchmark medians; construction includes example preparation; readback and PNG encoding separate',receipts},null,2)+'\n');
