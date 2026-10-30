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

This module is a building block only. It is not wired into the existing bot,
worker, native event loop or application build; no new bot or trained model is
shipped by its presence. The current heuristic remains active.
