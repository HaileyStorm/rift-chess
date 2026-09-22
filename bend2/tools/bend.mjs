import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const compiler = path.join(root, '.artifacts/toolchains/bend/bend2');
const bun = process.env.BUN_BIN || path.join(root, '.artifacts/toolchains/runtime/node_modules/@oven/bun-windows-x64/bin/bun.exe');
if (!fs.existsSync(bun)) throw new Error('Install the pinned local Bun runtime from bend2/TOOLCHAIN.json or set BUN_BIN.');
const pin = JSON.parse(fs.readFileSync(path.join(root, 'bend2/TOOLCHAIN.json')));
const head = spawnSync('git', ['-C', path.dirname(compiler), 'rev-parse', 'HEAD'], { encoding: 'utf8' });
if (head.status !== 0 || head.stdout.trim() !== pin.bendCommit) throw new Error('Bend compiler revision differs from TOOLCHAIN.json.');
const args = process.argv.slice(2).map((arg, index, all) => /\.(bend|html)$/.test(arg) || all[index - 1] === '-o' ? path.resolve(arg) : arg);
const result = spawnSync(bun, [path.join(compiler, 'main.ts'), ...args], { cwd: compiler, env: { ...process.env, BEND_NO_TELEMETRY: '1' }, stdio: 'inherit' });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
