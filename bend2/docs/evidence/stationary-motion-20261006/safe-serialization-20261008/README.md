# Windows Safe serialization — 2026-10-08

The full frozen 62-file combined CHECK cone passed a fresh Windows check and
`Safe.safe_emit` produced 5,676,608 bytes with empty OOS. The actual run is bound
to clean source commit `6efc2719e81dc77b25814e302978c6bcd4fec384` and official
2.0.35 source commit `79df8d9c40722ee9507a1e253f283b51025f9d6c`.
Independent source, output and native readback accepted this execution.

The private evidence root is
`.artifacts/bend2/2035-preview/stationary-motion-20261006/`.

| Evidence under that root | SHA256 |
| --- | --- |
| `safe-serialize-r2/receipt.json` | `58093c2b9d79d1962bdc489f15ace094f7b214dc7fc78e5b7cd28491c058101b` |
| `safe-serialize-r2/PREPARED_CHECK.bendtt` | `41f91d9c7982ba092288f92352f177ba5dfce78469a5d081fcd0825c0e38666e` |
| `safe-serialize-r2/safe-output-observed.json` | `d7868fdf9471daadd6162c94af7e3a37879997f2a0d7db7dde047b431a9b30bf` |
| `safe-serialize-supervisor-r2/terminal.json` | `29d26191a7f2187fbaad1ed9bb79f391638d2e9f7a307f74f68589686d8987d2` |
| `safe-serialize-r2.mjs` | `64095b74544d5bf69950e2584cdcc44b9511b336d6f93c9a5cc649becc9abbf2` |
| `safe-serialize-inputs-r2.json` | `0d2e9f15009ca70444e0d76dcd51eded6e0b6923eb6ea2feb217f606117e8a12` |
| `run-safe-serialize-r2.py` | `4602cdd15d6940e621021576925f121edd1aea22fa6c9cf04f49f3b4e368ac52` |

The fresh check reports 1,586 definitions, zero holes and 965 owned definitions.
The loaded closure and frozen maps match the approved source receipt exactly.
The compiler-owned namespace guard and promise-authority path are unchanged.
Node 24.12.0 on Windows ran the Worker with the transform-types flag and an
actual 64 MiB stack; parent flags and `NODE_OPTIONS` were empty. Fetch count was
zero. The emitter was confined to one fresh private output, with a 64 MiB output
limit. The retained raw observation records empty OOS, hash and file identity.
Diagnostics were retained without truncation.

The original process exited successfully in 240,689 ms. Its retained Popen exit,
checked handle closure, self-only Job settlement and checked Job closure are
recorded; all 471 native input fences match before, after and independent
readback. No timeout, signaling or retry occurred in this execution. These
records do not establish a latency or memory acceptance bound.

Current input reconciliation is explicit: 312 historical inputs are unchanged,
three substitutions affect `ui/State.bend`, `ui/Commands.bend` and
`graphics/v2game/KnightMesh.bend`, and `core/canonical/Match.bend` is added.
Paths here are relative to `bend2/`. All four are outside the unchanged proof
cone. The complete current inventory has 316 inputs. Controller reachability
remains 145 inputs: prepared-match `Match.bend` leaves that controller inventory
but remains in the frozen combined inventory and proof cone. The original
approved receipt is preserved, rather than rewritten for this reconciliation.

The R1 attempt rejected the added source before creating a Worker or output.
Its exit 1 and native closure remain retained in
`safe-serialize-supervisor-r1/terminal.json`, SHA256
`9f6871384a3ca7fe1b423ed92d303c66f4ea42359723a40e910bae932e92cd44`.
R2 uses the reviewed complete inventory. The original nine-Worker source record
and eight negative controls remain historical provenance; this run does not
rerun those mutations.

This is checked serialization evidence. It does not execute `safe_check` or
establish a BendTT/kernel verdict, validate the added application carrier through
this cone, accept the existing `/2` consumer at the current global revision, or
prove Linux runtime, native/device/performance or adoption acceptance. Kernel
and Linux approvals remain null; the foreign kernel tree and claim are untouched.
The accepted 2.0.27 pin and frozen Laws remain unchanged. Full sprint acceptance
and a reviewed chained amendment remain required before adoption.
