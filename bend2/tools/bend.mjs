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
const dirty = spawnSync('git', ['-C', path.dirname(compiler), 'status', '--porcelain', '--untracked-files=no'], { encoding: 'utf8' });
if (dirty.status !== 0 || dirty.stdout.trim()) throw new Error('Pinned Bend compiler has tracked modifications.');
const runtime = spawnSync(bun, ['--version'], { encoding: 'utf8' });
if (runtime.status !== 0 || runtime.stdout.trim() !== pin.bunVersion) throw new Error('Bun runtime version differs from TOOLCHAIN.json.');
const args = process.argv.slice(2).map((arg, index, all) => /\.(bend|html)$/.test(arg) || all[index - 1] === '-o' ? path.resolve(arg).replaceAll('\\', '/') : arg);
const isRun = args[0] === '--run';
const childArgs = isRun ? ['--preload', path.join(root, 'bend2/tools/loader.ts'), path.resolve(args[1]), ...args.slice(2)]
  : [path.join(compiler, 'main.ts'), ...args];
const timeout = Number(process.env.BEND_TIMEOUT_MS || (isRun ? 300000 : 120000));
if (!Number.isSafeInteger(timeout) || timeout < 1000) throw new Error('Invalid BEND_TIMEOUT_MS.');
const result = spawnSync(bun, childArgs, { cwd: isRun ? root : compiler, env: { ...process.env, BEND_NO_TELEMETRY: '1' }, stdio: 'inherit', timeout });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
