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
in scope. Copied installer, login, publishing, package, native build/run and kernel
commands remain unadmitted. This candidate does not move the toolchain pin or
prove native, kernel, device, GPU, performance or adoption acceptance.

The unexecuted R1 source tree and initial materialization failure remain private
review provenance. R2 carries the repaired publication helper and removes the
obsolete Base rewrite; it uses a new derived path and never overwrites R1.
