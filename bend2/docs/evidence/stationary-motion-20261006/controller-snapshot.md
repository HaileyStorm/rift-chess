# Remove the discarded controller snapshot — 2026-10-07

`ApplicationControl.apply` previously constructed a complete `Program.snapshot`
only to read its mobile-layout field. It now reads `State.mobile(state)` directly.
`Program.snapshot` assigns that identical expression to `Snapshot.mobile`.
The actual packet snapshot is still constructed by `finish`/`finish.dirty`.
This removes eager selection filtering, target lists and Shift deduplication
whose result was discarded, without adding a cache or changing the packet ABI.

The authoritative frozen move validation, legal enumeration, effects,
persistence, animation and bot scheduling remain unchanged. Independent
read-only source/emitted-code review found no blocking issue. The larger move
dispatch bottleneck includes repeated legal enumeration in frozen kernel
functions; this change does not bypass those checks or claim to resolve it.

## Verification

| Check | Result | Terminal SHA256 |
| --- | --- | --- |
| Current controller whole-book check and selected emission | PASS; 64 loaded Bend modules, unchanged selected exports, zero network calls; 75.523s | `8354175231209b897176581527c480dd9da1a425cbae1683824f8c59b63db4c8` |
| Complete old/new emitted-controller differential | PASS; 46 cases, complete packet/session/effects/quality/presentation/release metadata equal and retained inputs unchanged; 3.638s | `5bea089df356946f3720ff6d3e7217da501f2f48b22dd1d2ab30fa1347352680` |
| Integrated current-source browser build | PASS; 39.032s | `a515bfabf0a584a114ddea75524b42fce49f4f0b77a7e1034aaab6e6640e276f` |
| Narrow installed-Chrome headless paired flow | PASS; two fresh browser contexts, 20 native canvas actions, identical final settled PNGs, no page errors/external requests; 24.348s | `7ab7857e201a00dbabdd005588f938a9fdc02603e6ffbfd4ab427f6c14571d71` |

All four actual supervisors checked exit zero on their retained process,
closed its handle, observed the qualified Job return to self-only, closed the
Job and compared monitored input hashes before/after.

The controller differential covers boot, staged/committed e2e4/e7e5, animation
Ticks, g1/b1 selections, preferences open/close, fast/slow quality probes, resize
and idle under 1280×800 and 400×800 profiles. It compares against the unchanged
previous emitted controller, verifying terminal/manifest/module hashes before
import. The browser pair uses the previous current package and the new package
for the same ten-action move/menu/orbit flow. Its selection observer requires
the matched request to contain PointerDown and to have been sent after the
armed input, avoiding the earlier cohort's hover-attribution defect.

## Exact retained package

The fresh controller is `controller-Mn82fG/controller.js`, SHA256
`e8451f9817ed187876cda4d9710a92c10a98d7124c5f341ca3a92be1927c07da`.
Its manifest SHA256 is
`56a1c3586c9333c8db9326995a012763600d9236ce0b32d17d97d68b8aa71032`;
`build-preview.mjs` selects that exact manifest. Scene/menu/Worker selection
remains compatible with the prior moving-atlas package.

The new package is
`.artifacts/bend2/2035-preview/stationary-motion-20261006/browser-vTJpXf`,
version `b03ff12669bb8946bc1e`, build manifest SHA256
`da7670f0fb170ba3c8c0c2293113f37efec8e5b9ced1998ca334e324360509be`.
Its actual metadata records parent `4b39f9c`, dirty draft and `adopted:false`;
publication does not retag it.

Private receipts and raw observations are retained under that same
`stationary-motion-20261006` directory. Differential result SHA256 is
`312c7edcaf83c9a0924fd633c2ece1bb532038238c7347858b6a7488106d0274`;
paired-browser result SHA256 is
`615066d845a18f59bdfd506d924f72fd895531a94df868a5b2053e8c563d9629`.

The single browser pair and Node call costs are diagnostic, not a stable
latency improvement, 30% acceptance or physical-device result. The
[five-pair responsiveness baseline](responsiveness-paired-r3.md) still shows
unmet targets. Current full proof/consumer binding, native CPU/GUI/PCM/restart,
original GPU, constrained-device, owner visual approval and reviewed toolchain
adoption retain their separate acceptance requirements.
