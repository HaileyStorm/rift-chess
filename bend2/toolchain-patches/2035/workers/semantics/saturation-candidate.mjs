import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {root,derived,sha} from '../prepare.mjs';

const candidate=path.join(root,'.artifacts/bend2/2035-preview/stationary-motion-20261006/worker-saturation-candidate-r2');
const anchor='      const xs = ts.concat(parse_term_args(p, ")"));\n';
const guard='      if (out.$ === "Ref" && out.web !== undefined\n        && (hd?.$ !== "Def" || xs.length !== hd.n)) {\n        parse_fail(p, "a named saturated call for @/~ (include every explicit argument)");\n      }\n';

// An isolated parser correction. Canonical preparation and adoption stay separate.
export function verifySaturationCandidate(parent){
 assert.equal(parent.derived,derived);
 const original=fs.readFileSync(path.join(derived,'bend2/bend.ts'),'utf8');
 assert.equal(sha(original),'1d5608feb493495fa0a1c3ba0d1b95c4b3666f1a3fdf2e82dc9a924417a33a77');
 const accepted=fs.readFileSync(path.join(root,'.artifacts/bend2/toolchain-patches/workers-stage2-20260925/bend2/bend.ts'),'utf8').replaceAll('\r\n','\n');
 assert.equal(sha(accepted),'ed606c2b98529b99302c52c38f01ade411cefb03f37b1f0de905db472222019b');
 assert.ok(accepted.includes(anchor+guard));
 assert.equal(original.split(anchor).length,2);
 const start='    case "%": {\n',end='    case "{": {\n';
 function branch(text){const a=text.indexOf(start),b=text.indexOf(end,a);assert.ok(a>=0&&b>a);assert.equal(text.split(start).length,2);return text.slice(a,b);}
 const rewrite=branch(accepted).replaceAll('p.sc.','p.');
 const expected=original.replace(anchor,anchor+guard).replace(branch(original),rewrite),hashes={};
 function walk(dir){
  assert.equal(fs.realpathSync(dir),dir);
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
   const file=path.join(dir,entry.name);assert.ok(!entry.isSymbolicLink());
   if(entry.isDirectory())walk(file);
   else {assert.ok(entry.isFile());hashes[path.relative(path.join(candidate,'bend2'),file).replaceAll('\\','/')]=sha(fs.readFileSync(file));}
  }
 }
 walk(path.join(candidate,'bend2'));
 assert.deepEqual(hashes,{...parent.hashes,'bend.ts':sha(expected)});
 assert.equal(fs.readFileSync(path.join(candidate,'bend2/bend.ts'),'utf8'),expected);
 return {derived:candidate,hashes,parentCompiler:parent.hashes,changedFiles:['bend.ts'],guardSha256:sha(guard),rewriteSha256:sha(rewrite)};
}
