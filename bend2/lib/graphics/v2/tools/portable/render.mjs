// Render diagnostic fixtures through the actual selected Bend source subset.
// This is NOT pinned Bend output and not a browser/native/device screenshot.
import {readFileSync,writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
const cfg=JSON.parse(readFileSync(process.argv[2],'utf8'));
const load=async name=>(await import(pathToFileURL(cfg.modules[name]).href)).default;
const S=await load('stamp'),R=await load('rgba'),M=await load('mip'),T=await load('texture'),G=await load('glyph'),F=await load('font');
const p=color=>({$:'Pix',color}),coord=n=>n<0?{$:'Neg',magnitude:-n}:{$:'Pos',value:n},pt=(x,y)=>({$:'Point',x,y});
function list(xs){let out={$:'Nil'};for(let i=xs.length-1;i>=0;i--)out={$:'Con',head:xs[i],tail:out};return out;}
function quad(tl,tr,bl,br){return [tl,tr,bl,br].every(v=>v.$==='Pix'&&v.color===tl.color)?tl:{$:'Qua',tl,tr,bl,br};}
function build(side,fn,x=0,y=0){if(side===1)return p(fn(x,y));let h=side/2;return quad(build(h,fn,x,y),build(h,fn,x+h,y),build(h,fn,x,y+h),build(h,fn,x+h,y+h));}
function decode(file){const d=R.decode_bytes(list(readFileSync(file)));if(d.$!=='Decoded')throw new Error('Decode failed');return d;}
function raster(image,size){const out=Buffer.alloc(size*size*3);function visit(i,x,y,s){if(i.$==='Pix'){for(let yy=y;yy<y+s;yy++)for(let xx=x;xx<x+s;xx++){let j=(yy*size+xx)*3;out[j]=(i.color>>>16)&255;out[j+1]=(i.color>>>8)&255;out[j+2]=i.color&255;}return;}let h=s/2;visit(i.tl,x,y,h);visit(i.tr,x+h,y,h);visit(i.bl,x,y+h,h);visit(i.br,x+h,y+h,h);}visit(image,0,0,size);return out;}
const receipts=[];
function save(name,image,size=512){const b=raster(image,size);writeFileSync(cfg.out+'/'+name+'.ppm',Buffer.concat([Buffer.from(`P6\n${size} ${size}\n255\n`),b]));receipts.push({name,size,rgb_sha256:createHash('sha256').update(b).digest('hex')});}
const asset=decode(cfg.asset),d=BigInt(asset.depth),side=2**asset.depth;
for(const theme of ['dark','light']){
 let out=build(512,(x,y)=>theme==='dark'?((Math.floor(x/24)+Math.floor(y/24))%2?0x1e3446:0x172a3a):((Math.floor(x/24)+Math.floor(y/24))%2?0xe6dfd0:0xf1eadb));
 for(const [x,y,level,opacity] of [[-38,55,0,255],[176,35,0,255],[73,214,0,220],[334,310,1,255],[382,395,2,210]]){
   const l=M.level(BigInt(level),d,side,asset.colors,asset.mask);out=S.draw(9n,512,l.depth,l.size,coord(x),coord(y),l.colors,l.mask,opacity,out);
 }
 save('alpha-'+theme,out);
}
const stone=decode(cfg.stone),stress=decode(cfg.stress);
for(const mode of ['nearest','filtered']){
 let out=p(0x152536);
 for(const [index,a] of [stone,stress].entries()){
   const y=index*230;
   const shapes=[[pt(16,y+18),pt(222,y+37),pt(28,y+195),0],[pt(270,y+36),pt(357,y+26),pt(282,y+112),1],[pt(396,y+26),pt(446,y+43),pt(387,y+82),2],[pt(298,y+153),pt(343,y+149),pt(300,y+204),2],[pt(398,y+147),pt(427,y+157),pt(393,y+177),3]];
   for(const [p0,p1,p2,level] of shapes){const l=M.level(BigInt(mode==='filtered'?level:0),BigInt(a.depth),2**a.depth,a.colors,a.mask);out=T.draw(9n,512,p0,p1,p2,l.depth,l.size,l.colors,255,out);}
 }
 save('material-'+mode,out);
}
const old=JSON.parse(readFileSync(cfg.referenceGlyphs,'utf8'));
for(const mode of ['2bit-repeat','4bit-native']){
 let out=build(512,(x,y)=>y<252?0x162a3b:0xf0e8d9);
 for(const [text,y] of [['Sculpted & soft',80],['Minimum 012345',147],['Sphinx: Aa Bb 8g',214],['Readable 40px',331],['0123: () !? @',408],['Edges, not blocks',476]]){
   let x=14;const ink=y<252?0xf4ecdb:0x193243;
   for(const ch of text){const glyph=mode==='4bit-native'?F.glyph(ch.codePointAt(0)):old[ch.codePointAt(0)];out=G.draw(9n,512,coord(x),coord(y),{...glyph,depth:BigInt(glyph.depth)},ink,255,out);x+=glyph.advance;}
 }
 save('font-'+mode,out);
}
writeFileSync(cfg.out+'/render-receipts.json',JSON.stringify({scope:'Source-subset RGB buffers before PNG encoding/annotation. No pinned Bend/browser/native/GPU evidence.',outputs:receipts},null,2)+'\n');
