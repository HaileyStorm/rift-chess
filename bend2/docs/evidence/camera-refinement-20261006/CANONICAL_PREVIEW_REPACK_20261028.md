# Canonical preview repacker — October 28, 2026

This records the original `/1` reproduction at commit `947d87f`. The later
hover-pump change rebuilds the host as well through the explicit `/2` contract;
the `/1` source and original receipts below remain historical evidence.

The canonical `bend2/toolchain-patches/2035/build-preview.mjs` now packages the
current reviewed emissions through the same mechanism used for the accepted
[edge-feedback preview](../stationary-motion-20261006/EDGE_FEEDBACK_20261028.md).
The former entrypoint selected obsolete caches and entered the historical
prepared verifier, whose frozen selected-module hash differs from the current
registry. Its frozen expectations were not changed. Original creation manifests,
compiler sources, proof inputs and accepted 2.0.27 remain unchanged.

The repacker takes an explicit input file, its SHA256, an artifact root and a
new output directory. It verifies retained Controller/Scene/Menu receipts,
their current source bindings and emitted bytes, the canonical tag transform
and its consumed dependencies, the local Bun runtime, and exact base payloads.
It rebuilds the helper and Worker, patches the single host Worker URL and
index reference, and writes the current service-worker list. Bot files, assets
and prepared ground retain the base bytes. Required retained host/asset source
descriptors prevent silently calling changed unrebuilt inputs current; initial
descriptors were independently compared with the admitted base's Git source
`a7eef47b5578d7e61445eb20b327c701b4c7db92`.

Rebuilt ports may change under a newly reviewed input. Unrebuilt inputs require
a reviewed base with matching lineage. This is a repacker of retained inputs,
not an automatic compiler or cache-discovery command. It has no task/host/user
path constants. All consumed descriptors are checked before and after bundling;
output is exclusive and bounded to 8 MiB. Fetch and subprocess calls are denied
during bundling. See the [current command and input contract](../../../toolchain-patches/2035/README.md#current-source-browser-preview).

## Actual reproduction

Root executed the canonical builder with the retained local Bun 1.4.2. All 23
payload files, including helper, Worker, host, bot, assets, index and service
worker, were byte-identical to the already-accepted private edge-feedback
package. Both payload versions are `ab245df363425e1ad041`. The new `build.json`
has the repacker schema, builder/input provenance and timestamp; that metadata
is not represented as byte-identical to the older manifest.

The exact final builder SHA256 is
`3787648336d042c321738e58a695ae32623caff156a17b1c27182f9d92e0d56d`.
Original records are retained outside the repository's artifact budget under
`native-gameplay-20261027-r1/canonical-repack-20261028-r2/`:

| Record | SHA256 |
| --- | --- |
| Reviewed input | `beeef34dab46b22fc7a19a406d465568773bd93a2b431bce9e7a390291c89f17` |
| New package manifest | `57d42815a951b9271100573050cdf819f1f67fc8c4e1c994e2442ca7a293e462` |
| Actual supervisor terminal | `53a819a34945ee3468a9f350150faae3ecb800314f9a107303a7dc54b045777a` |
| Payload comparison | `e9622ec960ed1c7cee86f9fb4fc11c966dbaeefe651d664a6413918b1ab35135` |
| Accepted private base manifest | `b9ad3570d87bedcd83b4da59eed2c4cfebd8e4cb5403cf8e42b4192dace2fb73` |

Compiler executions, subprocess calls inside the builder and network calls were
zero. The original child exited 0; its original handle was joined and closed.
The Windows Job settled to the owning supervisor alone and closed without
signals. Total package size was 4,604,693 bytes.

The first successful reproduction is retained separately in `canonical-repack-20261028-r1/`.
Source review then removed an overly broad equality guard that also froze the
rebuilt browser ports to their old base. The final source was executed once in
the new r2 directory. Neither attempt re-emitted Bend modules or ran an app.

No duplicate browser journey or publication was needed for identical runtime
bytes. The [actual hosted Shift/offline acceptance](PUBLIC_PREVIEW_20261028.md)
still describes the published version and its own original execution. This
reproduction adds no fresh browser, native, GPU, performance, proof or compiler
adoption claim. The full sprint remains open.
