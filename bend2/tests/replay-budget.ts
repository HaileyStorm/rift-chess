import assert from 'node:assert/strict';
import P from '../ui/Program.bend';
import Layout from '../ui/Layout.bend';
const list=(xs:any[])=>xs.reduceRight((tail,head)=>({$: 'Con',head,tail}),{$:'Nil'});
const array=(xs:any)=>{const out=[];while(xs.$==='Con'){out.push(xs.head);xs=xs.tail;}return out;};
const event=(s:any,...es:any[])=>P.update(list(es),s);
const act=(s:any,id:number)=>event(s,{$:'Activate',id});
const tick=(s:any,ms=240)=>event(s,{$:'Tick',ms});
const drain=(u:any)=>{let remaining=100;while(P.replaying(u.state)){assert.ok(remaining-->0,'bounded fixture replay completes');u=tick(u.state,16);}return u;};

const initial=P.start('','',1024,768).state;
const accepted=P.record_text(P.request_move(initial,array(P.legal(initial))[0]).state);
const pending=event(initial,{$:'FileText',text:accepted});
const corruptUnframed=event(pending.state,{$:'PortError',kind:9002});
assert.equal(P.raw(corruptUnframed.state),accepted,'unframed but valid JSON is retained exactly during forced recovery');
assert.equal(P.replaying(corruptUnframed.state),false);
let almostDone=tick(pending.state,16);
assert.equal(P.replay_state(almostDone.state).value.remaining.$,'Nil');
const picker=act(almostDone.state,21);
assert.equal(P.replaying(picker.state),false,'opening picker cancels candidate even one tick before installation');
assert.equal(P.record_text(tick(picker.state,16).state),P.record_text(initial),'candidate cannot install while picker is open');
const emptyCorrupt=event(initial,{$:'PortError',kind:9002});
assert.ok(P.snapshot(emptyCorrupt.state).meta.recovery,'empty existing native snapshot cannot become a clean playable game');
assert.equal(P.record_text(P.request_move(emptyCorrupt.state,array(P.legal(initial))[0]).state),P.record_text(initial));
const unreadable=event(pending.state,{$:'PortError',kind:9003});
assert.ok(P.snapshot(unreadable.state).meta.recovery);assert.equal(P.replaying(unreadable.state),false);
assert.equal(P.raw(unreadable.state),accepted,'readable backup retained when a newer snapshot is unreadable');
assert.equal(array(unreadable.effects).some(e=>e.$==='Store'),false,'unreadable storage does not create an error/write loop');
const preferenceBoot=P.start(accepted,'',1024,768);
const badPrefs=drain(event(preferenceBoot.state,{$:'PortError',kind:9004}));
assert.equal(P.record_text(badPrefs.state),accepted,'preference failure cannot cancel a valid saved-game replay');
assert.equal(P.snapshot(badPrefs.state).meta.recovery,false);
assert.match(P.snapshot(badPrefs.state).panels.notice,/Preferences.*defaults/,'successful install retains preference fallback warning');
const cycle=JSON.stringify({...JSON.parse(accepted),commands:Array.from({length:4},(_,expected)=>expected%2===0?{$:'MoveCommand',expected,action:array(P.legal(initial))[0]}:{$:'UndoCommand',expected})});
let warningReplay=event(P.start(cycle,'',1024,768).state,{$:'PortError',kind:9004});
for(let done=1;done<=4;done++){
  warningReplay=tick(warningReplay.state,16);
  assert.equal(P.replay_state(warningReplay.state).value.done,done);
  assert.match(P.snapshot(warningReplay.state).panels.notice,/Preferences.*defaults/,'warning survives every progress update');
}
warningReplay=tick(warningReplay.state,16);
assert.deepEqual(JSON.parse(P.record_text(warningReplay.state)),JSON.parse(cycle));
assert.equal(P.snapshot(warningReplay.state).meta.recovery,false);
assert.match(P.snapshot(warningReplay.state).panels.notice,/Preferences.*defaults/);
const replacement=drain(event(event(preferenceBoot.state,{$:'PortError',kind:9004}).state,{$:'FileText',text:accepted}));
assert.doesNotMatch(P.snapshot(replacement.state).panels.notice,/Preferences/,'new Import starts a fresh warning context');
assert.ok(P.replaying(pending.state));
assert.ok(P.snapshot(pending.state).checking);
assert.equal(Layout.enabled(6,P.snapshot(pending.state),false),false,'draw controls visibly disabled during validation');
assert.equal(Layout.enabled(21,P.snapshot(pending.state),false),true,'Import remains available to replace pending validation');
const cancelled=act(pending.state,2);
assert.equal(P.replaying(cancelled.state),false,'opening New Match immediately cancels pending validation');
assert.equal(P.record_text(cancelled.state),P.record_text(initial),'cancellation keeps last good game');
for(const code of [83,85,78,77,72]) {
  const ignored=event(initial,{$:'KeyInput',code,down:true,alt:false,ctrl:true,shift:false});
  assert.equal(ignored.redraw,0,'Ctrl/Cmd game shortcut is ignored');
}
const prefs={mode:'bot',humanWhite:true,botPaused:true};

const pausedTurn=drain(P.start(accepted,JSON.stringify({...prefs,humanWhite:true}),1024,768));
assert.equal(P.bot_turn(pausedTurn.state),true);
assert.equal(P.snapshot(pausedTurn.state).meta.botPaused,true);
assert.ok(Layout.enabled(3,P.snapshot(pausedTurn.state),false),'Undo remains available on paused bot turn with history');
assert.equal(P.snapshot(act(pausedTurn.state,3).state).meta.revision,2);
assert.equal(array(P.labels(list(Array.from({length:20000},(_,expected)=>({$:'UndoCommand',expected:BigInt(expected)}))))).length,20000,'full-capacity labels avoid recursive stack growth');

console.log('replay-budget: paused bot Undo and 20000-command labels passed');
