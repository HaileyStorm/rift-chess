import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../..');
const folder=path.join(root,'bend2/core/v2');
const stamp=new Date().toISOString().replace(/[:.]/g,'-');
const out=path.join(root,'.artifacts/bend2/v2-laws',stamp);fs.mkdirSync(out,{recursive:true});
const sha=file=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex');
const files=[...fs.readdirSync(folder).filter(x=>/\.(bend|ts|mjs|json)$/.test(x)).map(x=>'bend2/core/v2/'+x),
 ...fs.readdirSync(path.join(root,'bend2/core')).filter(x=>x.endsWith('.bend')).map(x=>'bend2/core/'+x),
 'docs/01_RULES.md','reference/README.md','reference/rift_core.py','reference/sliding_chess_sim.py','reference/rift_cli.py','reference/verify_package.py',
 'bend2/docs/LAWS_V2.md','bend2/docs/RULE_LAW_AUDIT.md','bend2/docs/LAW_CHANGE_POLICY.md','bend2/laws/semantic-v1.json','bend2/TOOLCHAIN.json',
 'fixtures/conformance.json','bend2/tests/interop.ts','src/engine/position.ts','src/engine/types.ts','src/match/game.ts','package.json','package-lock.json','bend2/tools/bend.mjs','bend2/tools/loader.ts','bend2/tools/freeze-v2.mjs','bend2/tools/mutate-v2.mjs','bend2/tools/freeze.mjs'];
const hashes=Object.fromEntries(files.map(f=>[f,sha(f)]));
const requiredLaws=[['LAWS.bend','acceptance_complete'],['LAWS.bend','exact_independent_rules'],['DomainsLaws.bend','reachable_admissible'],['CanonicalLaws.bend','canonical_member_sound'],['CanonicalLaws.bend','canonical_member_complete'],['OrderingLaws.bend','canonical_ascending'],['OrderingLaws.bend','canonical_unique'],['AdjudicationLaws.bend','full_outcome_exact'],['AdjudicationLaws.bend','actual_live_exact'],['AdjudicationLaws.bend','actual_outcome_exact'],['AdjudicationLaws.bend','canonical_repetition_key_exact'],['AdjudicationLaws.bend','only_bare_kings_material'],['MatchControlLaws.bend','undo_step'],['MatchControlLaws.bend','offer_step'],['MatchControlLaws.bend','accept_step'],['MatchControlLaws.bend','decline_step'],['MatchControlLaws.bend','resign_step'],['MatchControlLaws.bend','accepted_move_exact_match'],['MatchControlLaws.bend','move_step'],['MatchControlLaws.bend','make_match_exact'],['MatchControlLaws.bend','from_position_exact'],['MatchControlLaws.bend','start_exact']];
const proofForLaw=file=>file==='LAWS.bend'?'PROOF.bend':file.replace('Laws.bend','Proof.bend');
const missingRequired=requiredLaws.filter(([file,name])=>{
 const lawPath=path.join(folder,file), proofPath=path.join(folder,proofForLaw(file));
 return !fs.existsSync(lawPath)||!fs.existsSync(proofPath)
  ||!new RegExp('^law '+name+':','m').test(fs.readFileSync(lawPath,'utf8'))
  ||!new RegExp('^def [A-Za-z0-9_.]+\\.'+name+'\\(','m').test(fs.readFileSync(proofPath,'utf8'));
});
const proofRuntime=JSON.parse(fs.readFileSync(path.join(folder,'proof-runtime.json'),'utf8'));
const results=[];
const proofFiles=fs.readdirSync(folder).filter(name=>name==='PROOF.bend'||name.endsWith('Proof.bend')||name==='Facade.bend').sort();
const declarationFiles=fs.readdirSync(folder).filter(name=>name==='LAWS.bend'||name.endsWith('Laws.bend')).sort();
const expectedEntry=[...new Set([...proofFiles,...declarationFiles])].sort();
const actualEntry=[...fs.readFileSync(path.join(folder,'CHECK.bend'),'utf8').matchAll(/^import \.\/([^ ]+) as /gm)].map(m=>m[1]).sort();
if(JSON.stringify(expectedEntry)!==JSON.stringify(actualEntry))throw Error('CHECK.bend does not import the exact current declarations/witnesses/API set.');
const checked=spawnSync(process.execPath,['bend2/core/v2/node-check.mjs','bend2/core/v2/CHECK.bend'],{cwd:root,encoding:'utf8',timeout:610000,env:{...process.env,BEND_TIMEOUT_MS:'600000'},maxBuffer:8e6});
const proofOutput=(checked.stdout||'')+(checked.stderr||'');fs.writeFileSync(path.join(out,'CHECK.bend.txt'),proofOutput);
const proofsPassed=checked.status===0&&proofOutput.trim()==='All terms check.';
results.push({file:'CHECK.bend',modules:proofFiles,declarations:declarationFiles,ok:proofsPassed,exit:checked.status,error:checked.error?.message??null});
console.log('complete proof entry: '+(proofsPassed?'PASS':'FAIL'));
if(proofsPassed){
 const r=spawnSync(process.execPath,['bend2/tools/bend.mjs','--run','bend2/core/v2/conformance.ts'],{cwd:root,encoding:'utf8',timeout:190000,env:{...process.env,BEND_TIMEOUT_MS:'180000'},maxBuffer:2e6});
 const output=(r.stdout||'')+(r.stderr||'');fs.writeFileSync(path.join(out,'conformance.txt'),output);
 results.push({file:'conformance.ts',ok:r.status===0,exit:r.status,error:r.error?.message??null});console.log('conformance: '+(r.status===0?'PASS':'FAIL'));
}
const unchanged=files.every(f=>hashes[f]===sha(f));
const passed=proofsPassed&&results.length===2&&results.every(x=>x.ok)&&unchanged&&missingRequired.length===0;
fs.writeFileSync(path.join(out,'receipt.json'),JSON.stringify({schema:'rift-v2-staged-check/1',at:stamp,passed,unchanged,hashes,results,requiredLaws,missingRequired,proofRuntime,scope:'Universal v2 source laws relative to the independent formal contracts, plus finite oracle conformance; semantic freeze, browser/native acceptance and independent English/Geometry validation are separate'},null,2)+'\n');
console.log(path.join(out,'receipt.json'));if(!passed)process.exitCode=1;
