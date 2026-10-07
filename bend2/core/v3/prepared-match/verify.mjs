// Additive prepared-match freeze. This never selects a browser/controller or
// replaces the accepted compiler. UI integration has separate acceptance.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {digest, root} from '../../../tools/freeze.mjs';
import {verifyV2} from '../../../tools/freeze-v2.mjs';

const directory='bend2/core/v3/prepared-match/';
const destination=path.join(root,'bend2/laws/semantic-prepared-v3.json');
const evidenceDirectory='bend2/docs/evidence/prepared-match-20261007/';
export const requiredFiles=['CHECK.bend','LAWS.bend','Match.bend','PROOF.bend','verify.mjs'].map(n=>directory+n);
const requiredEvidence=['proof.json','emission.json','differential.json','differential-result.json',
  ...['oldids','oldkey'].flatMap(n=>[n+'.json',n+'-result.json',n+'-diagnostic.txt',n+'-mutant.bend']),
  'probe.bend','emitter.mjs','differential.mjs','review.md'].map(n=>evidenceDirectory+n);
const claims=['apply_exact','carried_canonical','erased_step'];
const privateDirectory='.artifacts/bend2/2035-preview/stationary-motion-20261006/';
const bytes=name=>fs.readFileSync(path.join(root,name));
const json=name=>JSON.parse(bytes(evidenceDirectory+name));
const sameKeys=(value,keys)=>assert.deepEqual(Object.keys(value).sort(),[...keys].sort());
export const inventoryDigest=value=>digest(Buffer.from(JSON.stringify(Object.entries(value).sort(([a],[b])=>a.localeCompare(b)))));
function input(record,file,hash) {
  const suffix='/'+file;
  const matches=Object.entries(record.before).filter(([name])=>name.replaceAll('\\','/').endsWith(suffix));
  assert.equal(matches.length,1,`Receipt must bind exactly one ${file}`);
  assert.equal(matches[0][1],hash,`Receipt source differs: ${file}`);
}
function settled(record,code) {
  assert.equal(record.exitCode,code);
  assert.equal(record.passed,code===0);
  for(const name of ['samePopenExitObserved','checkedExitedHandleClosed','postBindingJobSelfOnly','checkedJobClosed'])assert.equal(record[name],true,`Missing settlement: ${name}`);
  assert.equal(record.timeout,false);assert.equal(record.signaling,false);
  assert.deepEqual(record.before,record.after);
}
function coreInputs(record,files,mutant=null) {
  for(const file of requiredFiles.filter(f=>f.endsWith('.bend')))
    input(record,file,file===directory+'Match.bend'&&mutant?mutant:files[file]);
}
function closure(file,found=new Set()) {
  if(found.has(file))return found;
  found.add(file);
  for(const match of bytes(file).toString('utf8').matchAll(/^\s*import\s+(Base|\.[^\s]+)(?:\s+as\s+\w+)?\s*$/gm)) {
    const target=match[1]==='Base'?'.artifacts/toolchains/bend/bend2/base.bend':
      path.posix.normalize(path.posix.join(path.posix.dirname(file),match[1]));
    assert.ok(!target.startsWith('../')&&!path.posix.isAbsolute(target),'Import escapes project');
    closure(target,found);
  }
  return found;
}

export function verifyPrepared(value) {
  const parent=verifyV2();
  sameKeys(value,['schema','version','semanticMeaning','parent','files','compiler','evidence']);
  assert.equal(value.schema,'rift-bend-prepared-match/3');assert.equal(value.version,3);
  assert.equal(value.semanticMeaning,'unchanged');
  assert.deepEqual(value.parent,{path:'bend2/laws/semantic-v2.json',sha256:parent.sha256});
  sameKeys(value.files,requiredFiles);sameKeys(value.evidence,requiredEvidence);
  for(const [file,hash]of [...Object.entries(value.files),...Object.entries(value.evidence)]) {
    assert.match(hash,/^[0-9a-f]{64}$/);assert.equal(digest(bytes(file)),hash,`Frozen prepared input differs: ${file}`);
  }
  sameKeys(value.compiler,['version','commit','inputs','proofInputs','emissionInputs']);
  assert.equal(value.compiler.version,'2.0.27');
  assert.equal(value.compiler.commit,'d37909174ebd664338ae3194799a9e0899dedd51');
  sameKeys(value.compiler.inputs,['.artifacts/toolchains/bend/bend2/bend.ts','.artifacts/toolchains/bend/bend2/comp.ts',
    '.artifacts/toolchains/bend/bend2/base.bend','bend2/TOOLCHAIN.json']);
  sameKeys(value.compiler.proofInputs,['bend2/core/v2/node-check.mjs','bend2/core/v2/proof-runtime.json']);
  sameKeys(value.compiler.emissionInputs,['bend2/tools/bend.mjs','bend2/tools/loader.ts','bend2/tools/loader-v2.ts','bend2/tools/selected-modules.mjs']);
  for(const group of ['inputs','proofInputs','emissionInputs'])for(const [file,hash]of Object.entries(value.compiler[group]))
    assert.equal(digest(bytes(file)),hash,`Current compiler/loader input changed: ${file}`);
  const cone=new Set();for(const file of requiredFiles.filter(f=>f.endsWith('.bend')))closure(file,cone);
  const inherited=[...cone].filter(f=>!requiredFiles.includes(f)&&!f.startsWith('.artifacts/'));
  assert.ok(inherited.every(f=>Object.hasOwn(parent.manifest.files,f)),'Imported source outside frozen parent');
  const inheritedInputs=record=>{for(const file of inherited)input(record,file,digest(bytes(file)));};
  const proof=json('proof.json');settled(proof,0);coreInputs(proof,value.files);
  assert.deepEqual(proof.result.claims,claims);assert.equal(proof.result.entry,directory+'CHECK.bend');
  assert.equal(proof.result.verdict,'All terms check.');
  for(const [file,hash]of Object.entries(value.compiler.inputs))input(proof,file,hash);
  for(const [file,hash]of Object.entries(value.compiler.proofInputs))input(proof,file,hash);
  inheritedInputs(proof);

  const original=bytes(directory+'Match.bend').toString('utf8');
  for(const [name,claim]of [['oldids','carried_canonical'],['oldkey','apply_exact']]) {
    const negative=json(name+'.json'),control=json(name+'-result.json');settled(negative,1);
    assert.equal(control.ok,true);assert.equal(control.claim,claim);
    assert.equal(control.terminalSHA256,value.evidence[evidenceDirectory+name+'.json']);
    assert.equal(control.originalSHA256,value.files[directory+'Match.bend']);
    assert.equal(control.restoredSHA256,control.originalSHA256);
    const mutant=bytes(evidenceDirectory+name+'-mutant.bend');
    assert.equal(digest(mutant),control.mutantSHA256);coreInputs(negative,value.files,control.mutantSHA256);
    let expected=original.replace('case T.Match{initial, state, actions,','case T.Match{initial, +state, actions,');
    expected=name==='oldids'?expected.replace('Nat.add(1n, revision), policy, T.NoOffer{}, T.NoOverride{}}, ids}',
      'Nat.add(1n, revision), policy, T.NoOffer{}, T.NoOverride{}}, S.legal_ids(state)}'):
      expected.replace('M.repetition_key(next, ids)','M.repetition_key(state, S.legal_ids(state))');
    assert.notEqual(expected,original);assert.equal(mutant.toString('utf8'),expected,'Unexpected mutation');
    const diagnostic=bytes(evidenceDirectory+name+'-diagnostic.txt');
    assert.equal(digest(diagnostic),control.diagnosticSHA256);
    const message=diagnostic.toString('utf8');
    assert.match(message,new RegExp('Location:[\\s\\S]*'+claim));
    assert.ok(message.includes('- expected :')&&message.includes('- observed :')&&!message.includes('consumed more than once'));
    for(const [file,hash]of Object.entries(value.compiler.inputs))input(negative,file,hash);
    for(const [file,hash]of Object.entries(value.compiler.proofInputs))input(negative,file,hash);
    inheritedInputs(negative);
  }
  const emission=json('emission.json');settled(emission,0);coreInputs(emission,value.files);
  for(const group of ['inputs','emissionInputs'])for(const [file,hash]of Object.entries(value.compiler[group]))input(emission,file,hash);
  inheritedInputs(emission);
  const probe=privateDirectory+'PreparedV3ProbeR1.bend',emitter=privateDirectory+'emit-prepared-v3-r1.mjs';
  input(emission,probe,value.evidence[evidenceDirectory+'probe.bend']);
  input(emission,emitter,value.evidence[evidenceDirectory+'emitter.mjs']);
  const expected=[...cone,probe].sort();
  const loaded=emission.result.loadedFiles.map(({file})=>{
    const matches=expected.filter(f=>file.replaceAll('\\','/').endsWith('/'+f));
    assert.equal(matches.length,1,'Emission loaded an unbound source');return matches[0];
  }).sort();
  assert.deepEqual(loaded,expected,'Emission did not load the exact proof cone plus probe');
  assert.equal(emission.result.compilerVersion,'2.0.27');assert.equal(emission.result.unfilled,0);
  assert.equal(emission.result.networkCalls,0);
  const differential=json('differential.json');settled(differential,0);
  input(differential,privateDirectory+'prepared-v3-diff-r1.mjs',value.evidence[evidenceDirectory+'differential.mjs']);
  const result=json('differential-result.json');
  assert.equal(result.ok,true);assert.equal(result.rows.length,61);assert.equal(result.controls.length,5);
  assert.ok(result.controls.every(c=>c.oldIdsMismatch&&c.oldIdsSHA256!==c.newIdsSHA256));
  assert.equal(result.emissionTerminalSHA256,value.evidence[evidenceDirectory+'emission.json']);
  assert.equal(result.moduleSHA256,emission.result.outputSHA256);
  input(differential,'.artifacts/bend2/2035-preview/stationary-motion-20261006/'+emission.result.output,result.moduleSHA256);
  assert.equal(differential.result.resultSHA256,value.evidence[evidenceDirectory+'differential-result.json']);
  assert.equal(differential.result.cases,61);assert.equal(differential.result.controls,5);
  const review=bytes(evidenceDirectory+'review.md').toString('utf8').replaceAll('\r','').split('\n');
  const evidence=Object.fromEntries(Object.entries(value.evidence).filter(([f])=>!f.endsWith('/review.md')));
  for(const line of ['Review disposition: accepted',`Source files SHA256: ${inventoryDigest(value.files)}`,
    `Evidence SHA256: ${inventoryDigest(evidence)}`,
    'Scope: accepted2.0.27 bridge proof and finite whole-match differential; no UI activation, browser performance or2.0.35adoption'])assert.ok(review.includes(line),`Review lacks ${line}`);
  return {verified:true,scope:'Frozen meaning-preserving core extension only; UI/browser activation and compiler migration remain separate',canonicalContentSHA256:digest(Buffer.from(JSON.stringify(value)))};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const args=process.argv.slice(2);
  if(args.length===2&&args[0]==='--candidate')console.log(JSON.stringify(verifyPrepared(JSON.parse(fs.readFileSync(path.resolve(args[1]))))));
  else if(args.length===2&&args[0]==='--create') {
    assert.ok(!fs.existsSync(destination),'Existing prepared freeze is immutable');
    const value=JSON.parse(fs.readFileSync(path.resolve(args[1])));verifyPrepared(value);
    fs.writeFileSync(destination,JSON.stringify(value,null,2)+'\n',{flag:'wx'});
    console.log(JSON.stringify({...verifyPrepared(JSON.parse(fs.readFileSync(destination))),manifestSHA256:digest(fs.readFileSync(destination))}));
  }else {
    assert.equal(args.length,0,'Use no arguments, --candidate file, or --create file');
    console.log(JSON.stringify({...verifyPrepared(JSON.parse(fs.readFileSync(destination))),manifestSHA256:digest(fs.readFileSync(destination))}));
  }
}
