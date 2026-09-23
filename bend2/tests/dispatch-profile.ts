import Probe from './DispatchProbe.bend';
const list=(xs:any[])=>xs.reduceRight((tail,head)=>({$:'Con',head,tail}),{$:'Nil'});
const boot=Probe.boot();
const down=list([{$:'PointerDown',x:250,y:250,button:2,alt:false}]);
const p=Probe.dispatch(down,boot.session);
const events=list([{$:'PointerMove',x:290,y:290}]);
const updated=Probe.update(events,p.session.program);
const snapshot=Probe.snapshot(updated.state);
const ground=Probe.ground(p.session.background,snapshot.frame);
const board=Probe.scene(p.session.background,snapshot.frame);
const cases:any={programUpdate:()=>Probe.update(events,p.session.program),ground:()=>Probe.ground(p.session.background,snapshot.frame),pieces:()=>Probe.pieces(ground,snapshot.frame),scene:()=>Probe.scene(p.session.background,snapshot.frame),embed24_96:()=>Probe.embed(board,24,96,p.session.chrome),embed32_96:()=>Probe.embed(board,32,96,p.session.chrome),embed0_128:()=>Probe.embed(board,0,128,p.session.chrome),embed0_64:()=>Probe.embed(board,0,64,p.session.chrome),embed0_512:()=>Probe.embed(board,0,512,p.session.chrome),compose:()=>Probe.compose(snapshot,board,p.session.chrome),dispatch:()=>Probe.dispatch(events,p.session)};
const receipt:any={scope:'Same whole-application state; compiled JavaScript CPU profiling under concurrent jobs, not absolute browser/native acceptance',view:snapshot.frame.view};
for(const[name,run]of Object.entries(cases)){const times=[];for(let i=0;i<16;i++){const t=performance.now();(run as any)();if(i>=4)times.push(performance.now()-t);}times.sort((a,b)=>a-b);receipt[name]={median:times[6],p95:times[11]}; console.log(name,JSON.stringify(receipt[name]));}
console.log(JSON.stringify(receipt,null,2));

