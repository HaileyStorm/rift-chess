/** Full-frame scalar F32 reference for geometric union before source-over. */
import Stroke from '../../Stroke.bend';
import {assert,image,flat,pix,box,over,equalPixels,rng} from './support.mjs';
const f=Math.fround,add=(a,b)=>f(a+b),sub=(a,b)=>f(a-b),mul=(a,b)=>f(a*b),div=(a,b)=>f(a/b),point=(x,y)=>({$:'Point',x:f(x),y:f(y)});let pixels=0,joins=0;
/** Flat scalar capsule distance, with no quadtree/bounds implementation reused. */
function hit(a,b,r,x,y){const dx=sub(b.x,a.x),dy=sub(b.y,a.y),den=add(mul(dx,dx),mul(dy,dy)),t=den===0?0:Math.min(1,Math.max(0,div(add(mul(sub(x,a.x),dx),mul(sub(y,a.y),dy)),den))),ex=sub(x,add(a.x,mul(dx,t))),ey=sub(y,add(a.y,mul(dy,t)));return add(mul(ex,ex),mul(ey,ey))<=mul(r,r);}
/** Independent flat de Casteljau subdivision rather than a prepared tree. */
function flatten(points,levels){if(!levels)return [[points[0],points.at(-1)]];const rows=[points],left=[points[0]],right=[points.at(-1)];while(rows.at(-1).length>1){const p=rows.at(-1),q=p.slice(1).map((b,i)=>point(mul(add(p[i].x,b.x),.5),mul(add(p[i].y,b.y),.5)));rows.push(q);left.push(q[0]);right.push(q.at(-1));}return [...flatten(left,levels-1),...flatten(right.reverse(),levels-1)];}
const cases=[{p:[point(5,8),point(52,37)],r:f(2.7),level:0},{p:[point(-8,23),point(29,-12),point(69,54)],r:f(1.8),level:4},{p:[point(3,56),point(8,-10),point(58,80),point(60,8)],r:f(2.25),level:5},{p:[point(20,20),point(20,20)],r:f(5),level:0}];
for(const c of cases)for(const opacity of [0,71,170,255]){
 const side=64,background=image(side,(x,y)=>(0x162132+x*257+y*13)&0xffffff),want=flat(background,side),clip=box(3,2,61,60),segments=flatten(c.p,c.level),path=c.p.length===2?Stroke.line(...c.p,c.r):c.p.length===3?Stroke.quadratic(BigInt(c.level),...c.p,c.r):Stroke.cubic(BigInt(c.level),...c.p,c.r);
 for(let y=clip.top;y<clip.bottom;y++)for(let x=clip.left;x<clip.right;x++){let count=0;for(const dy of [.25,.75])for(const dx of [.25,.75])if(segments.some(([a,b])=>hit(a,b,c.r,x+dx,y+dy)))count++;want[y*side+x]=over(0xe3b94e,want[y*side+x],Math.floor(opacity*count/4));}
 pixels+=equalPixels(flat(Stroke.draw(6n,side,path,0xe3b94e,opacity,clip,background),side),want,'stroke');
 // Repeated geometry must not darken: union is before the one blend.
 const joined=Stroke.join(path,path);pixels+=equalPixels(flat(Stroke.draw(6n,side,joined,0xe3b94e,opacity,clip,background),side),want,'join once');joins++;
}
assert.deepEqual(Stroke.line(point(0,0),point(20,20),0),{$:'Empty'});
console.log(JSON.stringify({ok:true,pixels,joins,scope:'actual emitted JS; independent flat F32 quarter-sample capsule/Bezier reference; clipped/offscreen/degenerate segments and idempotent geometric union; no boundary exclusions'}));
