/** Retained revision/order/removal damage against complete independent redraws. */
import Retained from '../../third/Retained.bend';
import Plan from '../../RenderPlan.bend';
import Draw from '../../DrawList.bend';
import {assert,flat,image,pix,list,array,box,rng,equalPixels,reference} from '../expansion/support.mjs';
const random=rng(0x79ac11),size=64,depth=6n,bg=image(size,(x,y)=>(x*721+y*1883)&0xffffff);let pixels=0,changes=0;
/** Build a library item and separate scalar specification from application state. */
function item(state){const clip=box(state.x,state.y,state.x+state.w,state.y+state.h);return {$:'Item',id:state.id,revision:state.revision,interactive:state.interactive,command:Draw.fill(clip,state.color,state.alpha)};}
/** Full scalar reconstruction, independent of retained and render-plan code. */
function expected(states){return states.reduce((out,s)=>reference(out,size,{kind:'fill',color:s.color,opacity:s.alpha,clip:box(s.x,s.y,s.x+s.w,s.y+s.h)}),flat(bg,size));}
let states=Array.from({length:24},(_,i)=>({id:i===0?0xffffffff:i,revision:0,interactive:i%2===0,x:random(50),y:random(50),w:4+random(20),h:4+random(20),color:random(0xffffff),alpha:50+random(206)}));let snap=Retained.snapshot(list(states.map(item))).value,plan=Retained.prepare(snap,3n,depth,size),previous=Plan.render(plan,0n,bg);pixels+=equalPixels(flat(previous,size),expected(states),'initial');
for(let frame=0;frame<250;frame++){
 const i=random(Math.max(1,states.length)),mode=frame%7;states=states.map(s=>({...s}));
 if(mode===0&&states.length)states[i].x=random(54);if(mode===1&&states.length){states[i].alpha=random(256);states[i].revision++;}if(mode===2&&states.length)states.splice(i,1);if(mode===3)states.push({id:1000+frame,revision:0,interactive:true,x:random(54),y:random(54),w:10,h:12,color:random(0xffffff),alpha:160});if(mode===4)states.reverse();if(mode===5&&states.length){states[i].color=random(0xffffff);states[i].revision++;}
 const next=Retained.snapshot(list(states.map(item)));assert.equal(next.$,'Some');const damage=Retained.damage(snap,next.value),newPlan=Retained.prepare(next.value,3n,depth,size);previous=Plan.repaint(newPlan,damage,bg,previous);pixels+=equalPixels(flat(previous,size),expected(states),`damage frame ${frame}`);if(mode===6)assert.equal(damage.$,'Nil');
 for(let j=0;j<20;j++){const x=random(size),y=random(size);let want=null;for(const s of states)if(s.interactive&&x>=s.x&&x<s.x+s.w&&y>=s.y&&y<s.y+s.h)want=s.id;const got=Retained.pick(next.value,x,y);assert.equal(got.$,want===null?'None':'Some');if(want!==null)assert.equal(got.value,want);changes++;}snap=next.value;
}
const a={id:0,revision:1,interactive:true,x:0,y:0,w:64,h:64,color:0xff0000,alpha:255};assert.equal(Retained.snapshot(list([item(a),item(a)])).$,'None');assert.equal(Retained.snapshot(list(Array.from({length:1025},(_,id)=>item({...a,id})))).$,'None');const empty=Retained.snapshot(list([])).value;const erased=Plan.repaint(Retained.prepare(empty,3n,depth,size),Retained.damage(snap,empty),bg,previous);pixels+=equalPixels(flat(erased,size),flat(bg,size),'remove all');
// Explicit negative control: a missing caller revision is detectable, not magically fixed.
const old=Retained.snapshot(list([item(a)])).value,changed=Retained.snapshot(list([item({...a,color:0x0000ff})])).value;assert.equal(Retained.damage(old,changed).$,'Nil');assert.notDeepEqual(expected([a]),expected([{...a,color:0x0000ff}]));
console.log(JSON.stringify({ok:true,frames:250,pixelComparisons:pixels,pickQueries:changes,negativeControl:'Omitting a required revision leaves changed color unreported; documented caller obligation, not a semantic scene diff.'}));
