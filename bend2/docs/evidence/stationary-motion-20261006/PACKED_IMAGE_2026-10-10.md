# Lossless helper-image transport

The sprite helper now sends its final depth-9 Bend image through the existing
bounded `encodeGround`/`decodeGround` format, transferring a fresh Uint32Array
instead of cloning the full JavaScript image tree. The receiver decodes only
after its existing source/generation/current-frame checks and before publishing
the image or atlas mask. Pose, ground-cache and picking identities retain their
existing meaning. The helper's outer wire protocol advances to 2; packed
pose/ground protocol 1 is unchanged.

Exact enumerable-field validation now compares key count and membership instead
of sorting and joining two arrays at every node. It retains rejection of unknown
or missing fields and all existing depth, token, node, texture and U32 bounds.
Each transferred final-image buffer is fresh; cached ground buffers stay intact.
Packing reconstructs shared subtrees independently, so lower memory usage is not
claimed.

Two source revisions each received one actual startup and e2–e4 journey per
baseline/candidate package. Both pairs displayed identical initial and settled
e4 pixels and saved the expected move through trusted pointer input. The first
revision exposed expensive encoding. The second changed that encoder, without
adding scenarios or replaying formal proofs.

| Observed milliseconds | Pair 1 current | Pair 1 candidate | Pair 2 current | Pair 2 adopted candidate |
| --- | ---: | ---: | ---: | ---: |
| First canvas | 1084.3 | 1105.0 | 859.8 | 1391.0 |
| First atlas | 2525.0 | 2973.5 | 2970.9 | 3387.0 |
| Helper total | 694.9 | 1305.4 | 871.6 | 1196.1 |
| Final-image packing | — | 213.9 | — | 56.6 |
| Final-image unpacking | — | 25.2 | — | 33.4 |
| Helper send to acceptance | 337.9 | 52.2 | 714.2 | 67.5 |
| Helper round trip | 1501.0 | 1805.7 | 1925.5 | 1897.6 |
| First real input to canvas | 40.1 | 44.5 | 90.2 | 71.4 |

This is a local transport improvement, not overall startup acceptance. Neither
fixed-order pair established faster first atlas display. The transport spans
also include scheduling and receiver work; they are not isolated cloning
measurements. Headless Chrome 154.0.8037.98, two finite pairs and aggregate Job
memory cannot establish causality, stable/tail performance, constrained devices,
physical audio, subjective graphics quality, native/GPU acceptance, formal proof
or compiler adoption.

Actual displayed pixel digests in both pairs:

- Initial: `1811c823aa38e3ac3854ad71e47e46fc0b5e0caf9a21a3241e25212f92153740`.
- Settled e4: `02483635eda9332651ddbb8a3141478afae26559017b1e7e9d14b0e0a4854a2b`.

Both private builds reused exact retained current99 Controller, Scene and Menu
emissions and existing prepared ground, assets, bot and host logic. Only the
helper and main worker were bundled; the host URI was relocated. Eighteen
package files stayed byte-identical. No compiler or ground render ran. Both
original Bun/Node/Chrome process chains, streams, loopback servers and Jobs
closed with known exit 0 and no forced cleanup or changed input.

Pair 2 source bytes were adopted locally. A subsequent TypeScript-only
`MessageEvent` assertion fixes the existing main-listener type error. Bun 1.4.2
transpiles the executed and annotated worker sources to identical 27,074-byte
JavaScript, SHA256 `60a19cd96cf172791f33794106557f54e2b47582dbb4758aaea17539c80cbb34`.
The narrow TypeScript check of the three worker/transport files passes. No
duplicate browser run follows that erased annotation. The canonical tag
boundary records the new exact source digests and reduced raw-image literal
counts; constructor mappings remain unchanged.

Private receipts:

- Pair 1 package: `8a6d26b3cafea7e8fdfa85df23b210df157bd5050222d39ef91e5a7698ebd7cc`.
- Pair 1 journey: `f24527775888f8b47369feaf2afad1d3d3163ee32fd9f2fe8a77e9861a193c4b`.
- Pair 1 original terminal: `360940c31b2aa1bf27cda80975056d2840cb708eca30eda731a2bc316092f2bd`.
- Pair 2 package: `8ec7ff42e1fc2b4e181f59cd78a0a7bf261bd1d124ae1496f28c0f8890663d8b`.
- Pair 2 journey: `80d621283cc53d34d527ebb725704a82d67bfdde6f8864630acbbfde94e9530e`.
- Pair 2 original terminal: `337cf20bcd8801cd12377db47fbde0e37dd2f5c22796faa26e5b83ff2efc3de4`.

Source memory disposition: reasoned skip. These implementation snapshots and
build-specific finite measurements remain in Git/private evidence. They add no
durable user policy or cross-task correction. Frozen proofs, pristine accepted
2.0.27, unadopted compiler status and all full-sprint obligations remain intact.
