# Bot transport boundary

`History.bend` projects the initial/current position, complete action list,
draw policy and legal IDs from a certified prepared match. `contract.mjs`
provides a versioned, host-neutral request/reply validator for the future AI
bridge. `context.mjs` converts a certified context and eligible bot job into
that request, rejecting disagreement between their positions or legal IDs. A request carries Bend piece codes and absolute a1-first board
coordinates, the checked match's initial position and **all** accepted board
IDs, current position, draw policy, current legal IDs, game epoch, revision and
model identity. Natural counters are decimal strings so JavaScript cannot silently
round them. Exceeding the declared history or counter bound returns
`resource_limit`; it never clips history.

The caller must obtain all game fields from the current certified Bend match and
must recheck the returned action through Bend. Transport validation cannot prove
reachability, an actual rules version, model integrity or freshness. Reset, undo,
import, mode/model changes and close must invalidate/cancel the current request;
matching identity alone is not a substitute for lifecycle handling. A separate
game epoch is required even when a new game reuses revision zero.

`learned-client.mjs` is an opt-in browser-side building block for the local CPU
WASM worker. It creates a fresh epoch when invalidated, cancels and terminates
the prior worker, validates a reply against its request and exposes `isCurrent`
for the host to check before asking Bend to apply the action. The host must call
`invalidate()` on every relevant lifecycle transition, check the current match
and readiness, and use `bot_apply_at` for final validation. Worker/model errors
are reported; this client does not silently choose a fallback. The enclosing
package must authenticate the executing script and bind its local bundle assets.
The worker's current protocol uses bare constructor tags and has only been
exercised with the separately emitted pinned-compiler Canvas facade; current35
needs an explicit compatible adapter and fresh reviewed build inputs.

`NativeDeferred.bend` exposes the existing deferred controller behavior under a
host-neutral facade for the future native effect bridge. It does not change
NativeV2's current dispatch or the operational heuristic bot. A native host must
provide the worker lifetime, identity, cancellation and final guarded apply.

This module is a building block only. It is not wired into the existing bot,
worker, native event loop or application build; no new bot or trained model is
shipped by its presence. The current heuristic remains active.
