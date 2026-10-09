# Isolated current Worker CLI integration

This new preparation layers the historical explicit Worker-library and HTML
interfaces onto official 2.0.35 `main.ts`, using the corrected current 98-file
parser/compiler/runtime candidate. It creates a separate 99-file resource tree;
the existing loader, Worker candidates, preview selection, receipts and accepted
2.0.27 pin remain retained. No upstream or frozen file is edited.

`prepare.mjs` authenticates both source layers and carries only the Worker option
parser, explicit library routes and static HTML integration. The current
`book_read`, checker, promise verdict, TODO refusal, namespace and synchronous
loader are retained. Current `parse_def` already prefixes foreign effect paths
with the declaring resource directory; no historical Base-path rewrite or extra
Base load is carried forward. Base and project foreign imports retain the current
source-loader resolution.

The new output helper stages the five Worker files and HTML package in private
sibling directories. It rejects occupied destinations, filesystem roots and
redirected directory ancestors, rechecks the destination before publication,
and restores an original empty destination on an ordinary rename failure.
Failed stages and exceptional rollback paths remain available for ownership
review; this route performs no recursive cleanup.

Exact source review and bounded execution qualification completed on Windows.
All eleven original negative CLI fixtures matched their original output and exit
oracles: two TODO refusals and nine promise refusals. A relocated 99-file resource
tree emitted exactly five portable Worker files. Static HTML carried identical
Worker files; ordinary synchronous Bend imports built and returned 42 in Chrome.
Two module Worker sessions at nested localhost URLs returned 2345, each with two
remote jobs, one required witness, empty diagnostics and zero retained work after
closing. Installed headless Chrome was 154.0.8037.98.

Publication checks preserved occupied user output, refused a missing explicit
Worker import, and retained the failed HTML stage without changing the original
empty destination. This is composite evidence from preserved completed prefixes
and a browser continuation, rather than a fresh full rerun. All ten packaging
processes and their Jobs closed; the final 2,270 source fences, published files
and retained failure stages remained unchanged. It does not repeat the historical
107 tests or use compiler differential equality as a verdict oracle.

The original failed qualifications remain retained. The frozen local wrapper
rewrites an equals-option token ending in `.bend`; use split
`--web-library <absolute-file.bend>` tokens. Equals-form compatibility is open.
Bun's broken-page failure produced `AggregateError: Bundle failed`, so the
intended missing-import diagnostic is unproved; failure atomicity was reviewed
from the original process and post-settlement bytes. A Windows ESM launcher
mistake and sandbox Chrome `spawn EPERM` preceded the successful browser
continuation. Browser-context interception recorded no external requests; it is
not system-wide network monitoring. Relocated pure emission does not prove
foreign-effect execution.

Private receipts are `worker-cli-verdict-disposition-2035-20261008-r1.json`
(SHA-256 `9e0a9cdbcba2a3ad4a3445d2811f8b0585443a6e26645411e1b93cc1733214eb`)
and `worker-cli-packaging-disposition-2035-20261008-r1.json`
(SHA-256 `39a8ac5d74802fb3c312b8ce618bcc609a22efb4cd4715ec24bb86b4a4346b10`)
under `.artifacts/bend2/2035-preview/stationary-motion-20261006/`.

Diagnostic dispatch must use the local wrapper with telemetry disabled, denied
source-network fetches, exact source/argv/output bindings and original process
settlement. Only the reviewed local check and Worker emission/HTML commands are
in scope, together with the two stdout-only IO fixtures qualified below. Copied
installer, login, publishing, package, native build/run and kernel
commands remain unadmitted. This candidate does not move the toolchain pin or
prove native, kernel, device, GPU, performance or adoption acceptance.

The unexecuted R1 source tree and initial materialization failure remain private
review provenance. R2 carries the repaired publication helper and removes the
obsolete Base rewrite; it uses a new derived path and never overwrites R1.

## Original stdout-only IO

Two unchanged upstream fixtures at commit
`79df8d9c40722ee9507a1e253f283b51025f9d6c` now execute through both the current
99-file CLI's `io_run` path under Bun1.4.2 and its unmodified `js_book` output
under Node. `tests/compile/closure_cps.bend` prints exactly `55\n`, exercising
capturing CPS closures. `tests/import/respelled_first.bend` prints exactly
`14\n`, loading one module through two original path spellings. Their original
`#|` expectations are independent stdout oracles; all four fixture/dependency
files match their committed blobs and preserve their original paths.

Before either execution route, an emission-only unit checks the loaded source
closure, a filled nullary IO main, zero holes and the exact emitted foreign
initializer. Only canonical `effs/print.js` is admitted, with its two constructor
ID relocations. Additional foreign initializers are rejected. The qualified
local wrapper and its retained legacy preload remain in use; this does not
establish pristine unwrapped CLI execution.

All four runtime records match exact stdout bytes, empty stderr and exit0.
Fetch-denial counters record zero calls with telemetry disabled. Five original
Popen units, including emission/admission, close their streams and handles;
the zero-limit Windows Job returns to self-only and closes. All126 source/runtime
fences and both emitted-script hashes remain unchanged. The run adds no compiler
copy and does not repeat the pure interpreter or generated-JS campaigns.

The private disposition `upstream-print-io-disposition-r1.json` has SHA256
`947bbc8fe12b3df927b04c0ad1f58f597d7cf7ae7dfb35f10b05e4ee8ea5f509`.
Its original terminal `upstream-print-io-supervisor-r1/terminal.json` has SHA256
`b888848564b5ff95ac034708bc11e8f7d9ad88b8d71a87da462565ea77aa78b1`;
the emission/admission receipt has SHA256
`5a80e9ca6f80e2dfb2c9e989cca12449ef901a138267f82d32e8a26d9d65e75c`.
These files remain under the private artifact directory named above. A budget
helper timeout and an inherited-manifest preparation mistake occurred before IO
dispatch; their original failures are retained, and the completed budget/census
were reused after repair.

This covers two print-only IO fixtures through two execution routes. It does
not establish general IO/FFI, network isolation, file/process/device effects,
native CPU, kernel, GPU, performance or reviewed adoption. Those requirements
remain open, and the accepted pristine2.0.27 pin is unchanged.
