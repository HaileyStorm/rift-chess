/** Independent imperative text-flow/caret oracle, plus existing-atlas pixel parity. */
import Text from '../../TextLayout.bend';
import Hit from '../../TextHit.bend';
import Paragraph from '../../AtlasParagraph.bend';
import Atlas from '../../AtlasText.bend';
import {assert,list,array,coord,pix,flat,equalPixels,rng} from './support.mjs';
const random=rng(291918);let flows=0,carets=0,selections=0,pixels=0;
/** Signed spacing with a line-start reset and bounded presentation arithmetic. */
function origin(x,k){return x===0?0:k.$==='Neg'?Math.max(0,x-k.magnitude):Math.min(8192,x+Math.min(k.value,4096));}
/** Scan only the next word; each word is scanned at most once from a separator. */
function word(items){let x=0;for(const i of items){if(i.$!=='Glyph')break;x=Math.min(4097,origin(x,i.kern)+Math.min(i.advance,4096));}return x;}
/** Explicit imperative layout is independent of the Bend recursive state machine. */
function reference(items,raw){const cfg={...raw,width:Math.min(raw.width,4096),line_height:Math.max(1,Math.min(raw.line_height,4096)),tab_size:Math.max(1,Math.min(raw.tab_size,4096))};cfg.max_lines=Math.min(raw.max_lines,Math.floor(4096/cfg.line_height));let x=0,line=0,width=0,consumed=0,truncated=false;const gs=[],cs=[];const caret=(source,xx,ll,leading)=>{const c={$:'Caret',source,x:xx,y:ll*cfg.line_height,line:ll,leading};if(JSON.stringify(cs.at(-1))!==JSON.stringify(c))cs.push(c);};for(let n=0;n<items.length;n++){const i=items[n];let advance=Math.min(i.advance??0,4096),wrap=false,breakItem=i.$==='Break';if(i.$==='Space'){const w=word(items.slice(n+1));breakItem=x!==0&&(x+advance>cfg.width||(cfg.word_wrap&&w<=cfg.width&&x+advance+w>cfg.width));}else if(i.$==='Tab'){advance=cfg.tab_size-x%cfg.tab_size;breakItem=x!==0&&x+advance>cfg.width;}else if(i.$==='Glyph'){wrap=x!==0&&origin(x,i.kern)+advance>cfg.width;}
 if(breakItem){if(line+1>=cfg.max_lines){truncated=true;break;}caret(i.source,x,line,true);line++;caret(i.end,0,line,true);width=Math.max(width,x);x=0;consumed++;continue;}
 const nextLine=line+(wrap?1:0);if(nextLine>=cfg.max_lines){truncated=true;break;}if(wrap){caret(i.source,x,line,false);x=0;line++;}const start=i.$==='Glyph'?origin(x,i.kern):x;caret(i.source,start,line,true);x=start+advance;caret(i.end,x,line,false);if(i.$==='Glyph')gs.push({$:'Placement',source:i.source,end:i.end,key:i.key,x:start,y:line*cfg.line_height,line});width=Math.max(width,x);consumed++;}
 const lines=consumed?line+1:0;return {$:'Layout',glyphs:list(gs),carets:list(cs),metrics:{$:'Metrics',width,height:lines*cfg.line_height,lines,consumed,truncated}};}
/** Nearest logical line, then x; prefer leading affinity on exact ties. */
function nearest(cs,x,y,h){const line=Math.floor(y/Math.max(h,1));let best;for(const c of cs){if(!best){best=c;continue;}const a=[Math.abs(c.line-line),Math.abs(c.x-x)],b=[Math.abs(best.line-line),Math.abs(best.x-x)];if(a[0]<b[0]||(a[0]===b[0]&&(a[1]<b[1]||(a[1]===b[1]&&c.leading&&!best.leading))))best=c;}return best?{$:'Some',value:best}:{$:'None'};}
/** Union selected atomic cells per line, ignoring zero-area hard-break cells. */
function selection(cs,start,end,height){if(start>=end||!height)return [];height=Math.min(height,4096);const out=[];for(let i=0;i+1<cs.length;i++){const a=cs[i],b=cs[i+1];if(a.line!==b.line||a.x===b.x||a.source>=b.source||a.source>=end||b.source<=start)continue;const r={$:'Box',left:Math.min(a.x,b.x),top:a.y,right:Math.max(a.x,b.x),bottom:a.y+height},old=out.at(-1);if(old&&old.top===r.top&&old.bottom===r.bottom){old.left=Math.min(old.left,r.left);old.right=Math.max(old.right,r.right);}else out.push(r);}return out;}
for(let run=0;run<2000;run++){
 const items=[];let index=0;for(let i=0;i<random(80);i++){const source=index,end=index+1+random(3);index=end;const kind=random(10);items.push(kind<6?{$:'Glyph',source,end,key:32+random(90),advance:random(23),kern:coord(random(9)-6)}:kind<8?{$:'Space',source,end,advance:random(12)}:kind===8?{$:'Tab',source,end}:{$:'Break',source,end});}
 const cfg={$:'Settings',width:random(90),line_height:random(60),max_lines:random(15),tab_size:random(35),word_wrap:Boolean(random(2))},want=reference(items,cfg),got=Text.layout(list(items),cfg);assert.deepEqual(got,want);flows++;
 const cs=array(got.carets);for(let i=0;i<8;i++){const x=random(130),y=random(800);assert.deepEqual(Hit.hit(got.carets,x,y,cfg.line_height),nearest(cs,x,y,cfg.line_height));carets++;const a=random(index+5),b=random(index+5);assert.deepEqual(array(Hit.selection(got.carets,a,b,Math.max(1,cfg.line_height))),selection(cs,a,b,Math.max(1,cfg.line_height)));selections++;}
}
for(const text of ['AVATAR To Wa','Interfaces, not just games.','A😀B','first\r\nsecond\rthird\nlast']){const cfg={$:'Settings',width:4096,line_height:28,max_lines:100,tab_size:24,word_wrap:true},items=array(Paragraph.items(text,1,0,0)),g=Paragraph.prepare(text,1,cfg);assert.equal(g.$,'Some');assert.deepEqual(g.value,reference(items,cfg));flows++;if(!text.includes('\r')&&!text.includes('\n')){const size=512,a=Paragraph.draw(g.value,9n,size,16,12,1,0xd9e3ef,pix(0x142133)),b=Atlas.draw(9n,size,text,16,12,1,0xd9e3ef,pix(0x142133));pixels+=equalPixels(flat(a,size),flat(b,size),'atlas paragraph');}}
assert.equal(array(Paragraph.items('A😀B',1,0,0)).length,3);
assert.deepEqual(array(Paragraph.items('a\r\nb',1,0,0)).map(i=>[i.source,i.end]),[[0,1],[1,3],[3,4]]);
assert.deepEqual(Paragraph.prepare('x',0,{$:'Settings',width:10,line_height:28,max_lines:1,tab_size:24,word_wrap:true}),{$:'None'});
console.log(JSON.stringify({ok:true,flows,carets,selections,pixels,scope:'actual emitted JS; randomized independent metric flow, truncation, word wrap, tabs, affinity and selection; CRLF and astral source indices; exact existing-atlas parity'}));
