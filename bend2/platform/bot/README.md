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

The browser worker has an opt-in lifecycle route for this client. A reviewed
build may define `__BEND_LEARNED_BOT__` as an object with `workerUrl`,
`bundleSha256`, `gameCommit`, `modelDigest`, optional `botId`, and `search`
containing `search_preset`, `seed`, `time_budget_ms` and `node_budget`. The host
passes that build-selected configuration at boot; no URL parameter enables it.
The worker invalidates pending choices on match-capable input, rechecks the full
context before guarded Bend application, and reports model/protocol failures.
Resource or backend unavailability uses a visibly labelled heuristic fallback.
The ordinary heuristic route remains the default when no configuration is built
in. Component checks use CPU inference and an older checked Canvas facade; the
current35 package still needs compatible controller exports, constructor tags,
source and asset admission, review, and a real application lifecycle journey.

`NativeDeferred.bend` exposes deferred controller behavior under a host-neutral
facade. `NativeLoop.bend` and `NativeCpu` add an experimental opt-in NativeV2
CPU route with a bounded background dispatcher, lifecycle cancellation and
guarded application. Without a compiled model bundle, the original heuristic
dispatch remains the default. The opt-in C branch expects a build-generated
`RIFT_NATIVE_BOT_BUNDLE` header; a future authenticated package builder must
bind the exact model, header, CPU libraries, executable and notices. The C code
does not independently authenticate those bytes at runtime.

The source has passed a pinned 2.0.27 Bend check, and a small isolated CPU
dispatcher journey exercised completed inference, stale-token rejection and
cleanup. A whole NativeV2 C emission timed out before producing an executable;
no real window, audio, responsiveness or current35 acceptance follows. Complete
history is checked each frame, so long-game responsiveness also remains to be
measured. The existing production build and frozen receipts are unchanged.

No trained model is shipped by this source change. The native application and
production browser package remain to be built and qualified.
