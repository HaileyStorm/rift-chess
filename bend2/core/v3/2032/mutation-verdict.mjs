import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

// Only a completed Bend source typecheck with both sides of a mismatch and a
// source location may count as a semantic mutation rejection. Load, parse,
// resource, namespace and promise errors are different failure classes.
export function typeMismatchEvidence(error, show) {
  assert.equal(error?.$, 'Err', 'negative failed outside Bend typechecking');
  const rendered = String(show(error));
  assert.match(rendered, /expected\s*:/i,
    'semantic mutation did not report an expected type');
  assert.match(rendered, /observed\s*:/i,
    'semantic mutation did not report an observed type');
  const location = /^Location:\s*(.+)$/m.exec(rendered)?.[1] ?? null;
  assert.ok(location, 'semantic mutation type mismatch lacked a source location');
  return { rejection: rendered.slice(0, 1600),
    rejectionSha256: createHash('sha256').update(rendered).digest('hex'),
    location };
}
