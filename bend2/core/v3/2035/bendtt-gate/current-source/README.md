# Current Windows source admission

This separately versioned, unarmed successor authenticates the reviewed current
source inventory at `e739679eaf9da366cfde24b3a2b445848a6bf030` and exactly its
three successor files. It preserves the historical `/2` approval, receipt,
lineage validator and consumer. That consumer continues to reject this revision.

The reviewed packet is private local evidence, SHA-256
`31e07114e10c872355ae9cba3b13980f9b9cfef9a022ee409eaef5b8b2a85bdb`.
It binds 316 current inputs, 145 controller inputs, both 97-file compiler source
inventories, the unchanged 62-file proof cone and eight original controls.
The historical 315 inputs have three application substitutions outside the
proof cone; one canonical carrier is added. Since the accepted Windows Safe
serialization, only KnightMesh differs. This does not establish a proof for
the added application carrier or a current native application.

Initial execution requires an independently reviewed, root-owned bootstrap
that pins the complete `lineage.json` digest and packet digest, verifies regular
unredirected successor files and every executable project dependency **before
import**, then invokes `captureCurrentSourceAdmission()` without overrides.
The validator cannot authenticate its own initial evaluation. There is no
direct CLI, draft mode, digest normalization or caller acceptance flag.
The manifest hashes the complete admission and README bytes; the bootstrap
authenticates the manifest separately, so there is no hashing cycle.

Admission repeats input authentication before project imports, passes only
the original records to `sourceEvidence(originalApproval)`, and reuses the
unchanged independent `capturePreparedInputs` reconstruction with a separate
current inventory expectation. That expectation has no success, execution or
approval fields and never enters the historical approval validator. It checks
the complete Git lineage: the 59 reviewed creation-to-packet changes plus
exactly the three committed successor additions. Unknown paths, modes, blobs,
raw bytes, dirty/uncommitted inputs, changed HEAD or changed inventories fail.
It repeats capture and authentication before returning.

The existing frozen maps remain historical maps. Six raw historical hashes
refer to earlier amended authority/tool versions; the accepted amendment chain
resolves them. This range adds no amendment, and map equality does not mean
direct current-byte equality to every old raw hash.

This raw-byte capture is Windows-only, using the observed Node 24.12.0 x64
executable with no parent flags or `NODE_OPTIONS` and `BEND_NO_TELEMETRY=1`.
Linux EOL/runtime and host admission require their own reviewed evidence.
The result reports zero fresh proof executions, null kernel/Linux approvals
and `executionAllowed: false`. It performs no compiler import, Worker launch,
CHECK, mutation, Safe serialization, kernel, C emission, GUI/PCM/restart,
device/performance/GPU acceptance, pin movement or adoption. Linux STOP,
the two 12 GiB admissions and foreign kernel ownership remain unresolved.

Retain the historical consumer and menu application capture for their named
provenance. Do not invoke their draft paths or edit them to admit current work.
