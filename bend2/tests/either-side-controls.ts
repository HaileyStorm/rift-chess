import assert from 'node:assert/strict';
import P from './program';
import Layout from '../ui/Layout.bend';

const list=(xs:any[])=>xs.reduceRight((tail,head)=>({$:'Con',head,tail}),{$:'Nil'});
const array=(xs:any)=>{const out=[];while(xs.$==='Con'){out.push(xs.head);xs=xs.tail;}return out;};
const act=(s:any,id:number)=>P.activate(id,s);
const controls=(s:any)=>array(Layout.menu_controls(P.snapshot(s)));
const control=(s:any,id:number)=>controls(s).find((c:any)=>c.id===id);
const commands=(s:any)=>JSON.parse(P.record_text(s)).commands;

function positionWithTurn(side:boolean, preferences=''){
  let s=P.start('',preferences,1024,800).state;
  const p={...P.pos(s),side};
  const g={...P.game(s),initial:p,state:p,actions:list([]),states:list([p]),keys:list([])};
  return P.refreshed(P.set_game(P.set_pos(s,p),g),g);
}

function offerActor(side:boolean, turn:boolean){
  const initial=positionWithTurn(turn);
  const opened=act(initial,6);
  assert.equal(P.snapshot(opened.state).panels.menu,9);
  assert.ok(control(opened.state,49).enabled);
  assert.ok(control(opened.state,50).enabled);
  const result=act(opened.state,side?49:50);
  return {initial,result};
}

for(const turn of [true,false]){
  for(const actor of [true,false]){
    const {initial,result}=offerActor(actor,turn);
    assert.equal(P.snapshot(initial).meta.turn,turn);
    assert.equal(P.snapshot(result.state).meta.offer,actor?1:2,
      'the selected side, not side-to-move, owns the offer');
    assert.deepEqual(P.pos(result.state),P.pos(initial),'a draw offer leaves every board field unchanged');
    assert.equal(commands(result.state).length,1);
    assert.deepEqual(commands(result.state)[0],{$:'OfferCommand',expected:0,side:actor});
    assert.equal(P.snapshot(result.state).meta.revision,1);
  }
}

for(const turn of [true,false]){
  for(const actor of [true,false]){
    const initial=positionWithTurn(turn);
    const opened=act(initial,7);
    assert.equal(P.snapshot(opened.state).panels.menu,5);
    assert.ok(control(opened.state,51).enabled&&control(opened.state,52).enabled);
    assert.equal(P.snapshot(opened.state).meta.revision,0);
    const chosen=act(opened.state,actor?51:52);
    assert.equal(P.snapshot(chosen.state).panels.page,actor?1:2);
    assert.equal(control(chosen.state,42).enabled,true);
    const resigned=act(chosen.state,42);
    assert.equal(P.snapshot(resigned.state).meta.outcome,actor?8:9);
    assert.deepEqual(P.pos(resigned.state),P.pos(initial),'resignation is not a board action');
    assert.deepEqual(commands(resigned.state).at(-1),{$:'ResignCommand',expected:0,side:actor});
  }
}

for(const mode of [1,2]){
  const humanWhite=mode===1;
  const preferences=JSON.stringify({mode:'bot',humanWhite,botPaused:false,sound:false});
  const botTurn=positionWithTurn(!humanWhite,preferences);
  assert.equal(P.mode(botTurn),mode);
  assert.equal(P.bot_turn(botTurn),true,'the tested control is available during a stable bot turn');
  assert.ok(P.after(botTurn)>0,'the bot was waiting to act before opening the chooser');

  const offered=act(botTurn,6);
  assert.equal(P.snapshot(offered.state).panels.menu,0,'single-human bot mode avoids a redundant actor chooser');
  assert.equal(P.snapshot(offered.state).meta.offer,humanWhite?1:2);
  assert.deepEqual(P.pos(offered.state),P.pos(botTurn));
  assert.ok(P.after(offered.state)>0,'the pending offer schedules the bot response before its move');
  const botOffer=humanWhite?50:49;
  const forged=act(offered.state,botOffer);
  assert.equal(P.snapshot(forged.state).meta.offer,humanWhite?1:2,'a bot-color choice cannot replace the human offer');
  assert.equal(P.record_text(forged.state),P.record_text(offered.state));
  const replied=P.update(list([{$:'Tick',ms:16}]),offered.state).state;
  assert.equal(P.snapshot(replied).meta.offer,0,'the bot handles a human offer before moving');
  assert.deepEqual(commands(replied).at(-1),{$:'DeclineCommand',expected:1,side:!humanWhite});

  const resign=act(botTurn,7);
  const botResign=humanWhite?52:51;
  assert.equal(P.snapshot(resign.state).panels.page,humanWhite?1:2,'bot mode preselects the only human actor');
  assert.deepEqual(controls(resign.state).map((c:any)=>c.id),[42,28],'bot mode shows confirmation without an actor choice');
  assert.equal(control(resign.state,42).enabled,true);
  const forgedChoice=act(resign.state,botResign);
  assert.equal(P.snapshot(forgedChoice.state).panels.page,humanWhite?1:2,'programmatic bot impersonation cannot change the actor');
  assert.equal(P.record_text(forgedChoice.state),P.record_text(resign.state));
  const ended=act(resign.state,42);
  assert.equal(P.snapshot(ended.state).meta.outcome,humanWhite?8:9);
  assert.deepEqual(commands(ended.state).at(-1),{$:'ResignCommand',expected:0,side:humanWhite});
}

let offered=act(act(positionWithTurn(true),6).state,50);
assert.equal(P.snapshot(offered.state).meta.offer,2);
const accepted=act(offered.state,8);
assert.equal(P.snapshot(accepted.state).meta.outcome,7);
assert.deepEqual(commands(accepted.state).at(-1),{$:'AcceptCommand',expected:1,side:true},
  'only the side opposite the offerer accepts');

offered=act(act(positionWithTurn(false),6).state,49);
assert.equal(P.snapshot(offered.state).meta.offer,1);
const declined=act(offered.state,9);
assert.equal(P.snapshot(declined.state).meta.offer,0);
assert.deepEqual(commands(declined.state).at(-1),{$:'DeclineCommand',expected:1,side:false},
  'only the side opposite the offerer declines');

const staleBase=positionWithTurn(true);
const stale=P.command(staleBase,{$:'OfferCommand',expected:99n,side:false});
assert.equal(P.snapshot(stale.state).meta.revision,0,'stale match-control revisions are rejected');
assert.equal(commands(stale.state).length,0);
const staleResign=P.command(staleBase,{$:'ResignCommand',expected:99n,side:false});
assert.equal(P.snapshot(staleResign.state).meta.outcome,0);
assert.equal(commands(staleResign.state).length,0);

const terminal=act(act(positionWithTurn(true),7).state,52);
const terminalState=act(terminal.state,42).state;
assert.equal(P.snapshot(terminalState).meta.outcome,9);
assert.equal(Layout.enabled(6,P.snapshot(terminalState),false),false);
assert.equal(P.snapshot(act(terminalState,6).state).panels.menu,0,'terminal matches cannot reopen match controls');

const moving=P.request_move(positionWithTurn(true),array(P.legal(positionWithTurn(true)))[0]);
assert.equal(P.snapshot(moving.state).moving,true);
assert.equal(Layout.enabled(7,P.snapshot(moving.state),false),false);
assert.equal(P.snapshot(act(moving.state,7).state).panels.menu,0,'match controls are inert during board animation');

const recovery=P.start('{broken','',1024,800).state;
assert.equal(Layout.enabled(6,P.snapshot(recovery),false),false);
assert.equal(P.snapshot(act(recovery,6).state).panels.menu,6,'recovery remains open when match controls are inert');
assert.equal(P.snapshot(act(positionWithTurn(true),49).state).panels.menu,0,
  'draw actor controls are inert outside the actor chooser');
assert.equal(P.snapshot(act(positionWithTurn(true),51).state).panels.menu,0,
  'resign actor controls are inert outside the resignation chooser');

for(const [width,height] of [[1024,800],[512,1024]]){
  for(const menu of [5,9]){
    let s=P.start('', '', width, height).state;
    s=act(s,menu===5?7:6).state;
    const listControls=controls(s);
    const required=menu===5?[51,52,42,28]:[49,50,28];
    assert.deepEqual(listControls.map((c:any)=>c.id),required);
    for(const c of listControls){
      assert.ok(c.bounds.x+c.bounds.width<=width&&c.bounds.y+c.bounds.height<=height,
        `control ${c.id} fits ${width}x${height}`);
    }
  }
}

console.log('either-side-controls: off-turn White/Black offers and resignations, opposite-side responses, bot identity, revision/terminal guards, and desktop/mobile control bounds passed');
