import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
export const derived = path.join(root, '.artifacts/bend2/toolchain-patches/workers-2035-candidate');
const loader = path.join(root, '.artifacts/bend2/toolchain-patches/derived-2035-source-loader/bend2');
const accepted = path.join(root, '.artifacts/bend2/toolchain-patches/workers-stage2-20260925/bend2');
export const sha = x => crypto.createHash('sha256').update(x).digest('hex');
const read = (dir, name) => fs.readFileSync(path.join(dir, name), 'utf8').replaceAll('\r\n', '\n');
function once(s, a, b) { assert.equal(s.split(a).length, 2, `changed anchor: ${a.slice(0, 100)}`); return s.replace(a, b); }
function between(s, a, b) { const i=s.indexOf(a), j=s.indexOf(b,i); assert.ok(i>=0&&j>i); return s.slice(i,j); }

export function transformedSources() {
  const checked = spawnSync(process.execPath, [path.join(root, 'bend2/toolchain-patches/2035/windows-source-loader.mjs')], { encoding:'utf8', windowsHide:true, timeout:30000 });
  assert.equal(checked.status, 0, checked.stderr);
  let bend = read(loader, 'bend.ts');
  assert.equal(sha(bend), '250c5e2b02e64aff5656f6bea7368ff0a1bcb25e0c1b0fe7661c87e588a3c82e');
  const old = read(accepted, 'comp.ts');
  assert.equal(sha(old), '4204bbffa877af6daa2b835cea860efa34e8a589b320ac575ea7a9e133d71d4d');
  let comp = read(loader, 'comp.ts');
  assert.equal(sha(comp), '32fb66e09f608ce9e4b173384bcfeec453db8c5bc96650e26ad861bef815a8d9');
  bend=once(bend, '| { $: "Ref"; k: Name; b?: Bool }', '| { $: "Ref"; k: Name; b?: Bool; web?: "require" | "never"; webMax?: number }');
  bend=once(bend, 'export function Ref<X>(k: Name, s?: Span, b?: Bool): TermOf<X> {\n  return { $: "Ref", k, s, b };', 'export function Ref<X>(k: Name, s?: Span, b?: Bool, web?: "require" | "never", webMax?: number): TermOf<X> {\n  return { $: "Ref", k, s, b, ...(web === undefined ? {} : {web}), ...(webMax === undefined ? {} : {webMax}) };');
  bend=bend.replaceAll('Ref(tm.k, tm.s, tm.b)', 'Ref(tm.k, tm.s, tm.b, tm.web, tm.webMax)');
  bend=once(bend, 'Ref(k, tm.s, tm.b)', 'Ref(k, tm.s, tm.b, tm.web, tm.webMax)');
  bend=once(bend, '(tm.b === true ? "!" : "");', '(tm.b === true ? "!" : "") + (tm.web === "require" ? "@" + (tm.webMax ?? "") : tm.web === "never" ? "~" : "");');
  const oldBend=read(accepted,'bend.ts');
  assert.equal(sha(oldBend), 'ed606c2b98529b99302c52c38f01ade411cefb03f37b1f0de905db472222019b');
  let suffix=between(oldBend,'    const modifier = parse_at(p, "@")','      parse_bump(p);\n      const hd =');
  suffix=once(suffix, 'out.$ === "Var" && parse_lookup(p, out.k) === null', 'out.$ === "Var" && out.v !== undefined');
  suffix=once(suffix, 'out = Ref(parse_reso(p, out.k), out.s);', 'out = out.v as LTerm;');
  bend=once(bend, between(bend,'    if (parse_at(p, "(") || parse_at(p, "!(")) {','      parse_bump(p);\n      const hd ='), suffix);

  comp=once(comp, 'import * as fs from "node:fs";', 'import * as fs from "node:fs";\nimport * as path from "node:path";\nimport * as crypto from "node:crypto";');
  comp=once(comp, '  b?: boolean;\n};', '  b?: boolean;\n  web?: "require" | "never"; webMax?: number; span?: Bend.Span;\n};');
  comp=once(comp, 'type File = {\n', 'type File = {\n  web?: WebEmit;\n');
  comp=once(comp, 'const m = { h, t: c, all, args, tld, k: null, xs: args };', 'const m = { h, t: c, all, args, tld, k: null, xs: args, ...(c.$ === "Ref" ? {b:c.b, web:c.web, webMax:c.webMax, span:c.s} : {}) };');
  const span = s => s.replaceAll('.span.src', '.span.file.str').replaceAll('span.src', 'span.file.str').replaceAll('.s.src', '.s.file.str');
  let callHook=span(between(old,'  const web = fl.web;\n  if (web !== undefined && web.ids.has(k)','  if (k === CLO_APPLY) {'));
  callHook=callHook.replaceAll('fl.def', 'fl.seg.def').replaceAll('source?.bang', 'source?.b');
  comp=once(comp,'function js_call(fl: File, k: Name, args: HTerm[], tail: boolean): string {\n  if (tail)', 'function js_call(fl: File, k: Name, args: HTerm[], tail: boolean, source?: Spine): string {\n'+callHook.replaceAll('exprs.join', 'args.map((x) => js_expr(fl, x, null)).join')+'  if (tail)');
  let forkHook=span(between(old,'  if (fl.web !== undefined) {\n    const live =','  return x.f(x.v.map((v, j): HTerm => !on[j] ? v'));
  forkHook=forkHook.replaceAll('call_kind(fl, v)', 'web_call_kind(fl, v)').replaceAll('call!.bang', 'call!.b').replaceAll('fl.def', 'fl.seg.def');
  comp=once(comp,'function js_open(fl: File, x: Of<"Let">): HTerm {\n  const on = let_live(fl, x);', 'function js_open(fl: File, x: Of<"Let">): HTerm {\n  const on = let_live(fl, x);\n'+forkHook);
  comp=once(comp,'return js_call(fl, m.k, m.xs, false);', 'return js_call(fl, m.k, m.xs, false, m);');
  comp=once(comp,'return js_call(fl, k, m.args, false);', 'return js_call(fl, k, m.args, false, m);');
  comp=once(comp,'      const cl = { ...fl, seg: seg_new("", BOX, []) };', `      if (fl.web && term_any(fl, x, (t) => t.$ === "Ref" && (t.web === "require" || fl.web!.functions[fl.web!.ids.get(t.k) ?? -1]?.reachesRequire))) {
        if (fl.web.policy === "strict") throw new Error("required worker unsupported in runtime closure: " + fl.seg.def);
        fl.web.diagnostics.push({function:fl.seg.def, reason:"require_unfulfilled:runtime_closure", severity:"warning"});
      }
      const cl = { ...fl, web: undefined, seg: seg_new("", BOX, []) };`);
  comp=once(comp,'  const loop = loop_of(fl, fl.seg.def);', '  if (fl.web) {\n    const call = web_call_kind(fl, x);\n    return file_push(fl, "return " + (call === null ? js_expr(fl, x, ty) : js_call(fl, call.k!, call.args, true, call)) + ";");\n  }\n  const loop = loop_of(fl, fl.seg.def);');
  comp=once(comp,'export function js_lib(book: Bend.Book, mod = false): string {', 'export function js_lib(book: Bend.Book, mod: boolean | Name[] = false, options: {internal?: boolean; policy?: "strict" | "permissive"; onDiagnostic?: (message:string)=>void} = {}): string {');
  comp=once(comp,'  const outs = !mod ? null : [...new Set(book.order)]', '  const outs = Array.isArray(mod) ? mod : !mod ? null : [...new Set(book.order)]');
  comp=once(comp, '  const fl = file_book(book, outs ?? ["main"], true);', `  const fl = file_book(book, outs ?? ["main"], true);
  if (!options.internal) {
    const warned = new Set<string>();
    for (const [k] of done_defs(fl)) term_any(fl, fun_of(fl,k).h!, (t) => {
      if (t.$ === "Ref" && t.web === "require") {
        const line=t.s ? t.s.file.str.slice(0,t.s.beg).split("\\n").length : "?";
        const message="required worker disabled in synchronous JS at "+k+":"+line+" -> "+t.k;
        if (options.policy === "strict") throw new Error(message);
        if (!warned.has(message)) {warned.add(message);(options.onDiagnostic ?? console.warn)(message);}
      }
      return false;
    });
  }`);
  let web=between(old,'// Web Workers (downstream, opt-in)','// RuntimeC\n');
  web=span(web).replaceAll('cb: Carb', 'cb: File').replaceAll('def: Def', 'def: Bend.Def').replaceAll('sig_def(', 'fun_of(').replaceAll('def_body(cb, ', 'web_def(cb, ').replaceAll('call_kind(cb, ', 'web_call_kind(cb, ');
  web=web.replaceAll('const tag = name_own(ctr.k, def, " +");', 'const tag = Bend.name_key(ctr.k);').replaceAll('ctr_tail(cb.book, ctr, t.x).filter(live_dom)', 'ctr_live(cb.book, ctr, t.x)');
  web=once(web, 'const serial = js_lib(book, roots, null, { internal: true });\n  const cb = carb_book(book, roots);', 'const serial = js_lib(book, roots, {internal:true});\n  const cb = file_book(book, roots, true);');
  web=web.replaceAll('d.h!', 'fun_of(cb, k).h!');
  web=web.replaceAll('for (const [, d] of done_defs(cb))', 'for (const [k, d] of done_defs(cb))');
  web=once(web,'const span = def?.$ === "Def" ? def.h?.s : undefined;', 'const span = def?.$ === "Def" ? fun_of(cb, f.name).h?.s : undefined;');
  web=web.replaceAll('call?.bang', 'call?.b');
  web=web.replaceAll('eff_name(', 'op_name(');
  web=once(web, 'function web_signature(cb: File, def: Bend.Def,', 'function web_signature(cb: File, k: Name, def: Bend.Def,');
  web=once(web, 'for (let i = 0; i < def.n; i++) {', 'for (let i = 0; i < fun_of(cb, k).n; i++) {');
  web=once(web, '...web_signature(cb, d, schemas, keys)', '...web_signature(cb, k, d, schemas, keys)');
  web=once(web,'  const fl = file_new(cb, true);\n  fl.tab = 0;', '  const fl = cb;\n  fl.seg = seg_new("", BOX, []);\n  fl.tabs.clear();');
  web=once(web,'    fl.def = k;\n    fl.fuel = FOLD_FUEL;', '    fl.seg.def = k;\n    FUEL = FOLD_FUEL;');
  web=once(web, '  const emitted = fl.seg.lines.join("\\n").replace(/\\bTAB_(\\d+)\\b/g, "WEB_TAB_$1")', `  const publicInputs = defs.map(([k,d],i) => {
    if (functions[i].inputs !== null && functions[i].output !== null) return "null";
    const doms=tele_unbind(fl.book,d.T).doms.slice(0,fun_of(fl,k).n).filter(dom_live);
    return "(args) => [" + doms.map(([, , A],j) => js_marshal(fl,A,false)+"(args["+j+"])").join(", ")+"]";
  });
  const publicOutputs = defs.map(([k,d],i) => functions[i].inputs !== null && functions[i].output !== null ? "null"
    : "(value) => " + js_marshal(fl,Bend.tele_fill(fl.book,d.T,Array(fun_of(fl,k).n).fill(DUMMY),Bend.ctx_nil()),true)+"(value)");
  const marshalNames = (source: string) => source.replace(/\\$0m(\\d+)/g, "$webm$1");
  const emitted = marshalNames([fl.seg, ...fl.spins].flatMap((s) => seg_text(s.lines,0)).join("\\n"))
    .replace(/\\x01[^\\x02]*\\x02/g, "run_loop").replace(/\\bTAB_(\\d+)\\b/g, "WEB_TAB_$1")`);
  web=once(web, '"export const coordinators = Object.freeze(["', '"export const publicInputs = Object.freeze([" + marshalNames(publicInputs.join(", ")) + "]);\\n"\n    + "export const publicOutputs = Object.freeze([" + marshalNames(publicOutputs.join(", ")) + "]);\\n"\n    + "export const coordinators = Object.freeze(["');
  web=web.replaceAll('backend: "bend-web-workers-2"', 'backend: "bend-web-workers-2035", natRepresentation: "number48-host-bigint"');
  web=once(web,'"export const coordinators = Object.freeze([" + defs.map(([k]) => maySuspend.has(k) ? "$web" + ids.get(k) : "null")', '"export const coordinators = Object.freeze([" + defs.map(([k]) => maySuspend.has(k) && !intr_of(cb, k, true) ? "$web" + ids.get(k) : "null")');
  const helpers=`function web_def(fl: File, k: Name): Bend.TLD | undefined { return fl.book.tlds[k]; }
function web_call_kind(fl: File, t: HTerm): Spine | null {
  const s = term_spine(fl, t);
  if (s.k !== null) return {...s, args:s.xs};
  return s.t.$ === "Ref" && fun_runs(fl.book.tlds[s.t.k]) && s.args.length === fun_of(fl, s.t.k).lays.length && s.web !== undefined ? {...s, k:s.t.k} : null;
}
`;
  comp=once(comp,'// RuntimeC\n// ========', helpers+web+'// RuntimeC\n// ========');
  let runtime=read(accepted,'web_runtime.js');
  assert.equal(sha(runtime),'5def0b7c33be027416c869adbf16a26cc98a0008461b11c2e49453c955ad97d6');
  runtime=once(runtime,'const NAT_MAX = 281474976710655n;', 'const NAT_MAX = 281474976710655;');
  runtime=once(runtime,'options = {}, copy = true)', 'options = {}, copy = true, hostNat = false)');
  runtime=once(runtime,'if (typeof v !== "bigint" || v < 0n || v > NAT_MAX)', 'if (hostNat ? typeof v !== "bigint" || v < 0n || v > BigInt(NAT_MAX) : !integer(v, 0, NAT_MAX) || Object.is(v, -0))');
  runtime=once(runtime,'        break;\n      case "bool":', '        out = hostNat ? Number(v) : v;\n        break;\n      case "bool":');
  runtime=once(runtime,'(typeof v !== "bigint" || v < 0n || v > NAT_MAX)', '(!integer(v, 0, NAT_MAX) || Object.is(v, -0))');
  runtime=once(runtime,'view.setBigUint64(at, v, true)', 'view.setBigUint64(at, BigInt(v), true)');
  runtime=once(runtime,'if (value > NAT_MAX) fail("input_shape", "packed Nat exceeds runtime bound"); break;', 'if (value > BigInt(NAT_MAX)) fail("input_shape", "packed Nat exceeds runtime bound"); value = Number(value); break;');
  runtime=once(runtime,'const snap = snapshotArgs(args, fn.inputs, this.manifest.schemas, this.options.wire);', 'const snap = snapshotArgs(args, fn.inputs, this.manifest.schemas, this.options.wire, true, true);');
  runtime=once(runtime,'this._finish(inv, null, value);', 'this._finish(inv, null, hostResult(value, fn.output, this.manifest.schemas));');
  runtime=once(runtime, 'const value = runSerialRegion(this.program, root, args,', 'const value = runSerialRegion(this.program, root, this.program.publicInputs[root](cloneLocalArgs(args)),');
  runtime=once(runtime, '        d.resolve(value);', '        d.resolve(this.program.publicOutputs[root](value));');
  runtime += `
// The runtime owns numeric Nat values; only the validated public boundary exposes BigInt.
function hostResult(value, id, schemas) {
  const top = [null], seen = new WeakMap(), todo = [{v:value, id, parent:top, key:0}];
  const assign = (parent,key,value) => Object.defineProperty(parent,key,
    {value,enumerable:true,writable:true,configurable:true});
  while (todo.length) {
    const f=todo.pop(), s=schemas[f.id];
    if (s.kind === "nat") { assign(f.parent,f.key,BigInt(f.v)); continue; }
    if (s.kind !== "adt") { assign(f.parent,f.key,f.v); continue; }
    if (seen.has(f.v)) { assign(f.parent,f.key,seen.get(f.v)); continue; }
    const out={$:f.v.$}; seen.set(f.v,out); assign(f.parent,f.key,out);
    const arm=s.arms.find(a=>a.tag===f.v.$);
    for (const field of arm.fields) todo.push({v:f.v[field.name],id:field.schema,parent:out,key:field.name});
  }
  return top[0];
}
// Unsupported wire values stay local. Clone mutable data before upstream Nat
// marshaling so its array conversion cannot rewrite a caller-owned array.
function cloneLocalArgs(values) {
  const seen=new WeakMap(), top=[null], todo=[{v:values,parent:top,key:0}];
  while(todo.length) {
    const f=todo.pop(), v=f.v;
    const assign=value=>Object.defineProperty(f.parent,f.key,{value,enumerable:true,writable:true,configurable:true});
    if(!Array.isArray(v)&&!plain(v)) {assign(v);continue;}
    if(seen.has(v)) {assign(seen.get(v));continue;}
    const out=Array.isArray(v)?new Array(v.length):Object.create(Object.getPrototypeOf(v));
    seen.set(v,out);assign(out);
    for(const key of Reflect.ownKeys(v)) {
      if(Array.isArray(v)&&key==="length") continue;
      const d=Object.getOwnPropertyDescriptor(v,key);
      if(!("value" in d)) fail("input_shape","local boundary accessors are unsupported");
      todo.push({v:d.value,parent:out,key});
    }
  }
  return top[0];
}
`;
  return {bend,comp,runtime};
}

export function prepare({materialize=false}={}) {
  const {bend,comp,runtime}=transformedSources();
  const inventory=new Map();
  function walk(dir,prefix='') { for (const e of fs.readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))) {
    const file=path.join(dir,e.name); assert.equal(fs.realpathSync(file),path.resolve(file)); assert.ok(!e.isSymbolicLink());
    if(e.isDirectory()) walk(file,prefix+e.name+'/'); else inventory.set(prefix+e.name,fs.readFileSync(file));
  }}
  walk(loader); inventory.set('bend.ts',Buffer.from(bend)); inventory.set('comp.ts',Buffer.from(comp)); inventory.set('web_runtime.js',Buffer.from(runtime));
  if(materialize&&!fs.existsSync(derived)) {
    let ancestor=path.dirname(derived);while(!fs.existsSync(ancestor)) ancestor=path.dirname(ancestor);
    assert.equal(fs.realpathSync(ancestor),path.resolve(ancestor),'derived ancestor is redirected');
    for(const [file,bytes] of inventory) {const dest=path.join(derived,'bend2',file);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,bytes,{flag:'wx'});}
  }
  if(fs.existsSync(derived)) {
    assert.equal(fs.realpathSync(derived),derived,'derived target is redirected');
    const actual=new Map();
    function actualWalk(dir,prefix='') {for(const e of fs.readdirSync(dir,{withFileTypes:true})) {
      const file=path.join(dir,e.name);assert.equal(fs.realpathSync(file),path.resolve(file));assert.ok(!e.isSymbolicLink());
      if(e.isDirectory()) actualWalk(file,prefix+e.name+'/');else {assert.ok(e.isFile());actual.set(prefix+e.name,fs.readFileSync(file));}
    }}
    actualWalk(path.join(derived,'bend2'));
    assert.deepEqual([...actual.keys()].sort(),[...inventory.keys()].sort(),'derived compiler inventory changed');
    for(const [file,bytes] of inventory) assert.deepEqual(actual.get(file),bytes,`derived source changed: ${file}`);
  }
  return {derived, hashes:Object.fromEntries([...inventory].map(([file,bytes])=>[file,sha(bytes)]))};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  assert.ok(process.argv.slice(2).every(arg=>arg==='--materialize'),'only --materialize is supported');
  const result=prepare({materialize:process.argv.includes('--materialize')});
  console.log(JSON.stringify({derived:result.derived,files:Object.keys(result.hashes).length,hashes:Object.fromEntries(['bend.ts','comp.ts','web_runtime.js'].map(name=>[name,result.hashes[name]]))}));
}
