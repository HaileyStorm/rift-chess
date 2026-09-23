// Regenerates positional record getters/setters between accessor markers.
//   # BEGIN GENERATED ACCESSORS: State replay=replay_state
//   # END GENERATED ACCESSORS
// Options: `prefix=meta_` names getters meta_<field> and setters
// set_meta_<field>; `getters` omits setters; `field=name` renames one getter.
// The record type must be declared in the same file as `type T is Data:` with a
// single constructor line. `--check` fails when a block is out of date.
import fs from 'node:fs';

const check = process.argv.includes('--check');
const files = process.argv.slice(2).filter(arg => arg !== '--check');
if (!files.length) throw new Error('Usage: node bend2/tools/accessors.mjs [--check] file.bend...');

function fields(text, type) {
  const line = text.match(new RegExp(`^type ${type} is Data:\\r?\\n\\s+${type}\\{(.*)\\}\\s*$`, 'm'));
  if (!line) throw new Error(`Record ${type} is not declared on one constructor line`);
  const out = [];
  let depth = 0, start = 0;
  const body = line[1];
  for (let i = 0; i <= body.length; i++) {
    const c = body[i];
    if (c === '<' || c === '(') depth++;
    if (c === '>' || c === ')') depth--;
    if ((c === ',' && depth === 0) || i === body.length) {
      const [name, ...rest] = body.slice(start, i).split(':');
      out.push({ name: name.trim(), type: rest.join(':').trim() });
      start = i + 1;
    }
  }
  return out;
}

function block(text, type, options) {
  const { prefix = '', getters, ...renames } = options;
  const onlyGetters = 'getters' in options;
  const all = fields(text, type);
  const names = all.map(f => f.name);
  const defs = [];
  all.forEach((field, index) => {
    const getter = renames[field.name] ?? `${prefix}${field.name}`;
    const pattern = names.map((name, i) => (i === index ? name : '_')).join(', ');
    defs.push(`def ${getter}(s: ${type}) -> ${field.type}:\n  match s:\n    case ${type}{${pattern}}: ${field.name}\n`);
    if (onlyGetters) return;
    const rebuilt = names.map((name, i) => (i === index ? 'v' : name)).join(', ');
    defs.push(`def set_${prefix}${field.name}(s: ${type}, v: ${field.type}) -> ${type}:\n  match s:\n    case ${type}{${names.join(', ')}}: ${type}{${rebuilt}}\n`);
  });
  return defs.join('\n');
}

let stale = false;
for (const file of files) {
  const text = fs.readFileSync(file, 'utf8');
  const eol = text.includes('\r\n') ? '\r\n' : '\n';
  const next = text.replace(/# BEGIN GENERATED ACCESSORS: (\w+)([^\r\n]*)\r?\n[\s\S]*?# END GENERATED ACCESSORS/g, (_, type, options) => {
    const parsed = Object.fromEntries(options.trim().split(/\s+/).filter(Boolean).map(pair => pair.split('=')));
    const generated = block(text, type, parsed).replaceAll('\n', eol);
    return `# BEGIN GENERATED ACCESSORS: ${type}${options}${eol}${generated}# END GENERATED ACCESSORS`;
  });
  if (next === text) continue;
  if (check) { console.error(`${file}: generated accessors are stale`); stale = true; }
  else { fs.writeFileSync(file, next); console.log(`${file}: accessors regenerated`); }
}
if (stale) process.exitCode = 1;
