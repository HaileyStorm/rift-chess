import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { root, digest, verifyFreeze } from './freeze.mjs';
import { matchesFrozen } from './amendments.mjs';

const destination=path.join(root,'bend2/laws/semantic-v2.json');
export const requiredProofs=fs.readdirSync(path.join(root,'bend2/core/v2')).filter(n=>n==='PROOF.bend'||n.endsWith('Proof.bend')||n==='Facade.bend').sort();
export const requiredMutations=['reject_all','wrong_successor','hide_all_moves','omit_repetition_key','wrong_resignation','ignore_draw_agreement'];
const authorities=['docs/01_RULES.md','reference/README.md','reference/rift_core.py','reference/sliding_chess_sim.py','reference/rift_cli.py','reference/verify_package.py','fixtures/conformance.json','bend2/docs/LAWS_V2.md','bend2/docs/RULE_LAW_AUDIT.md','bend2/docs/LAW_CHANGE_POLICY.md','bend2/TOOLCHAIN.json','bend2/core/v2/node-check.mjs','bend2/core/v2/proof-runtime.json','bend2/core/v2/check.mjs'];
function closure(file,found=new Set()) {
  if(found.has(file))return found;
  found.add(file);
  const source=fs.readFileSync(path.join(root,file),'utf8');
  if(/@unsafe|\bTODO\b|^\s*foreign\b/m.test(source))throw new Error(`Untrusted declaration in v2 proof cone: ${file}`);
  for(const match of source.matchAll(/^\s*import\s+(\.[^\s]+)\s+as\b/gm)) {
    const imported=path.relative(root,path.resolve(root,path.dirname(file),match[1])).replaceAll('\\','/');
    if(imported.startsWith('../'))throw new Error(`Import escapes source tree: ${file}`);
    closure(imported,found);
  }
  return found;
}
export function requiredV2Inputs() {
  const files=new Set([...authorities,'bend2/tools/freeze-v2.mjs','bend2/tools/mutate-v2.mjs','bend2/tools/freeze.mjs']);
  for(const name of fs.readdirSync(path.join(root,'bend2/core/v2')).filter(n=>n.endsWith('.bend'))) {
    for(const file of closure(`bend2/core/v2/${name}`)) files.add(file);
  }
  return [...files].sort();
}
function unchanged(hashes) {
  for(const [file,hash]of Object.entries(hashes))if(digest(fs.readFileSync(path.join(root,file)))!==hash)throw new Error(`V2 verification is stale: ${file}`);
}
export function verifyV2() {
  const bytes=fs.readFileSync(destination), value=JSON.parse(bytes);
  if(value.schema!=='rift-bend-semantic/2'||value.parentSha256!==verifyFreeze().sha256)throw new Error('Invalid v2 semantic lineage');
  for(const file of requiredV2Inputs())if(!value.files[file])throw new Error(`V2 manifest omits ${file}`);
  for(const [file,hash]of Object.entries(value.files))if(!matchesFrozen(file,hash))throw new Error(`V2 verification is stale: ${file}`);
  for(const [file,hash]of Object.entries(value.evidence))if(digest(fs.readFileSync(path.join(root,file)))!==hash)throw new Error(`V2 evidence changed: ${file}`);
  return {manifest:value,sha256:digest(bytes)};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  if(process.argv.includes('--create')) {
    if(fs.existsSync(destination))throw new Error('The v2 freeze is immutable. Record a new reviewed version.');
    const args=process.argv.slice(2), arg=name=>{const i=args.indexOf(name);if(i<0||!args[i+1])throw new Error(`Missing ${name}`);return path.resolve(args[i+1]);};
    const receiptPath=arg('--receipt'), mutationPath=arg('--mutations'), reviewPath=arg('--review');
    const receipt=JSON.parse(fs.readFileSync(receiptPath)), mutations=JSON.parse(fs.readFileSync(mutationPath));
    const aggregate=receipt.results.find(r=>r.file==='CHECK.bend'&&r.ok);
    const requiredDeclarations=fs.readdirSync(path.join(root,'bend2/core/v2')).filter(n=>n==='LAWS.bend'||n.endsWith('Laws.bend')).sort();
    if(!receipt.passed||!receipt.unchanged||!aggregate||JSON.stringify(aggregate.modules)!==JSON.stringify(requiredProofs)||JSON.stringify(aggregate.declarations)!==JSON.stringify(requiredDeclarations)||!receipt.results.some(r=>r.file==='conformance.ts'&&r.ok))throw new Error('V2 proof/conformance gates incomplete');
    for(const [file,law] of [['CanonicalLaws.bend','canonical_member_sound'],['CanonicalLaws.bend','canonical_member_complete'],['OrderingLaws.bend','canonical_ascending'],['OrderingLaws.bend','canonical_unique']]) {
      if(!new RegExp(`^law ${law}:`,'m').test(fs.readFileSync(path.join(root,'bend2/core/v2',file),'utf8')))throw new Error(`Required enumeration law is missing: ${law}`);
    }
    if(!mutations.passed||!requiredMutations.every(name=>mutations.results.some(r=>r.name===name&&r.rejected&&r.positive)))throw new Error('V2 mutation controls incomplete');
    unchanged(receipt.hashes); unchanged(mutations.hashes);
    for(const file of requiredV2Inputs())if(!receipt.hashes[file])throw new Error(`Readiness omits proof/authority dependency: ${file}`);
    const review=fs.readFileSync(reviewPath,'utf8');
    if(!/^Review disposition: accepted\r?$/m.test(review))throw new Error('Independent review disposition missing');
    for(const [label,source] of [['Readiness SHA256',receiptPath],['Mutations SHA256',mutationPath]]) {
      if(!new RegExp(`^${label}: ${digest(fs.readFileSync(source))}\\r?$`,'m').test(review))throw new Error(`Independent review does not bind current ${label}`);
    }
    const evidenceDir=path.join(root,'bend2/docs/evidence/laws-v2');fs.mkdirSync(evidenceDir,{recursive:true});
    const evidence={};
    for(const [name,source]of [['readiness.json',receiptPath],['mutations.json',mutationPath],['review.md',reviewPath]]) {
      const target=path.join(evidenceDir,name), bytes=fs.readFileSync(source);fs.writeFileSync(target,bytes,{flag:'wx'});
      evidence[path.relative(root,target).replaceAll('\\','/')]=digest(bytes);
    }
    fs.writeFileSync(destination,JSON.stringify({schema:'rift-bend-semantic/2',version:2,frozenAt:new Date().toISOString(),parentSha256:verifyFreeze().sha256,files:receipt.hashes,evidence},null,2)+'\n',{flag:'wx'});
  }
  console.log(JSON.stringify(verifyV2()));
}
