import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {root,digest} from './freeze.mjs';
import {requiredV2Inputs} from './freeze-v2.mjs';
const out=path.join(root,'.artifacts/bend2/v2-mutations',new Date().toISOString().replace(/[:.]/g,'-'));
fs.mkdirSync(out,{recursive:true});
const hashes=Object.fromEntries(requiredV2Inputs().map(file=>[file,digest(fs.readFileSync(path.join(root,file)))]));
const results=[];
function check(file,log) {
  const r=spawnSync(process.execPath,['bend2/core/v2/node-check.mjs',file],{cwd:root,env:{...process.env,BEND_TIMEOUT_MS:'600000'},encoding:'utf8',timeout:610000,maxBuffer:4e6});
  const output=(r.stdout||'')+(r.stderr||'');fs.writeFileSync(log,output);
  return {clean:r.status===0&&output.trim()==='All terms check.',rejected:r.status!==0&&!r.error&&!/timed out|RangeError|stack size|heap|out of memory/i.test(output)&&/ERROR|Error|error|mismatch|check|equal/i.test(output),exit:r.status,error:r.error?.message??null,outputSha256:digest(output)};
}
const cases=[
  {name:'reject_all',proof:'PROOF.bend',from:'case True{}: Accepted{id, proposed(p, id)}',to:'case True{}: Rejected{p}'},
  {name:'wrong_successor',proof:'PROOF.bend',from:'case True{}: Accepted{id, proposed(p, id)}',to:'case True{}: Accepted{id, M.start(True{})}'},
  {name:'hide_all_moves',proof:'CanonicalProof.bend',from:'legal_tree(5n, p, 0, 21760)',to:'[]'},
  {name:'omit_repetition_key',proof:'MatchControlProof.bend',targetFile:'MatchKernel.bend',from:'append_position(states, next), append_key(keys, key)',to:'append_position(states, next), keys'},
  {name:'wrong_resignation',proof:'MatchControlProof.bend',targetFile:'MatchKernel.bend',from:'policy, Types.NoOffer{}, Types.WhiteResigned{}',to:'policy, Types.NoOffer{}, Types.BlackResigned{}'},
  {name:'ignore_draw_agreement',proof:'AdjudicationProof.bend',targetFile:'MatchKernel.bend',from:'Some{Types.Agreed{}}',to:'None{}'},
];
for(const c of cases) {
  const target=path.join(out,c.name);fs.cpSync(path.join(root,'bend2/core'),path.join(target,'core'),{recursive:true});
  const proof=path.join(target,'core/v2',c.proof);
  const positive=check(proof,path.join(target,'positive.txt'));
  const kernel=path.join(target,'core/v2',c.targetFile||'RuleKernel.bend');const source=fs.readFileSync(kernel,'utf8');
  if(source.split(c.from).length!==2)throw new Error(`Mutation anchor not unique: ${c.name}`);
  fs.writeFileSync(kernel,source.replace(c.from,c.to));
  const negative=positive.clean?check(proof,path.join(target,'negative.txt')):{rejected:false,error:'Positive control failed'};
  results.push({name:c.name,positive:positive.clean,rejected:negative.rejected,positiveCheck:positive,negativeCheck:negative});
  console.log(`${c.name}: ${positive.clean&&negative.rejected?'PASS':'FAIL'}`);
  if(!positive.clean||!negative.rejected)break;
}
const unchanged=Object.entries(hashes).every(([file,hash])=>digest(fs.readFileSync(path.join(root,file)))===hash);
const receipt={schema:'rift-v2-mutations/1',at:new Date().toISOString(),passed:unchanged&&results.length===cases.length&&results.every(r=>r.positive&&r.rejected),unchanged,hashes,results};
fs.writeFileSync(path.join(out,'receipt.json'),JSON.stringify(receipt,null,2)+'\n');console.log(path.join(out,'receipt.json'));if(!receipt.passed)process.exitCode=1;
