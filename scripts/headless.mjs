/** Bounded UTF-8 NDJSON adapter over the same built, renderer-free game API. */
import { HeadlessApi } from '../dist/api.js';
const api = new HeadlessApi();
const limit = 1024 * 1024;
let pending = Buffer.alloc(0);
let oversized = false;
const decoder = new TextDecoder('utf-8', { fatal: true });
function respond(line) {
  try { process.stdout.write(`${JSON.stringify(api.dispatch(JSON.parse(decoder.decode(line))))}\n`); }
  catch { process.stdout.write(`${JSON.stringify({ id: null, version: 'rift-api/1', ok: false, error: { code: 'invalid_request', message: 'Expected a UTF-8 JSON request of at most 1 MiB.' } })}\n`); }
}
for await (const chunk of process.stdin) {
  let start = 0;
  for (let i = 0; i < chunk.length; i++) {
    if (chunk[i] !== 10) continue;
    const fragment = chunk.subarray(start, i);
    if (!oversized && pending.length + fragment.length <= limit) respond(Buffer.concat([pending, fragment]));
    else respond(Buffer.from('invalid'));
    pending = Buffer.alloc(0); oversized = false; start = i + 1;
  }
  const tail = chunk.subarray(start);
  if (pending.length + tail.length > limit) { oversized = true; pending = Buffer.alloc(0); }
  else if (!oversized) pending = Buffer.concat([pending, tail]);
}
if (pending.length || oversized) respond(oversized ? Buffer.from('invalid') : pending);
