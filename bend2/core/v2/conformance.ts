import fs from 'node:fs';
import R from './RuleContracts.bend';
import K from './RuleKernel.bend';
import {applyGeneratedAction,legalActions} from '../../../src/engine/position.ts';
import {positionToBend, assertPosition, unwrapStep, functionFrom, bendBool, assertIds} from '../../tests/interop.ts';
const fixtures=JSON.parse(fs.readFileSync('fixtures/conformance.json','utf8')).fixtures;
const contract=functionFrom([['R',R]],['contract']);
const step=functionFrom([['K',K]],['step']);
const legalIds=functionFrom([['K',K]],['legal_ids']);
let n=0;
for(const f of fixtures){
 let position=f.record.initial;
 for(const id of f.record.actions){const a=legalActions(position).find(x=>x.id===id);if(!a)throw Error('illegal fixture replay');position=applyGeneratedAction(position,a);}
 const p=positionToBend(position);
 assertIds(f.legal_action_ids,legalIds(p),`${f.name}.v2.fullLegalIds`);
 for(const child of f.children){
  if(!bendBool(contract(p,child.action.id,positionToBend(child.position)),f.name))throw Error(`contract rejects ${f.name} ${child.action.id}`);
  const result=unwrapStep(step(p,child.action.id),p);
  if(!result.accepted)throw Error(`v2 rejects ${f.name} ${child.action.id}`);
  assertPosition(child.position,result.position,`${f.name}.${child.action.id}`);n++;
 }
}
console.log(JSON.stringify({ok:true,fixtures:fixtures.length,acceptedSuccessors:n,scope:'All canonical IDs at 14 fixture positions, 223 successor comparisons; finite evidence, not universal proof'}));
