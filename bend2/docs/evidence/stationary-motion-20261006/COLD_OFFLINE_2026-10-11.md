# Current artwork after a cold offline browser restart

One actual desktop journey passed on Windows. It launched the existing package,
moved the White knight from g1 to f3 through the painted board, closed Chrome,
then launched a new Chrome process with the same fresh profile and networking
disabled. The saved journal bytes and rendered position matched the online
position. Black then played e7-e5 through the offline board, and the journal
contained both moves. Root inspected the resulting canvas screenshot.

The successful observation began at `2026-10-11T10:20:27.363Z`. Service-worker
readback showed the actual worker activated and controlling the online page.
The offline cached `build.json` matched the online package digest. Both original
Chrome processes exited normally; original Node, streams, loopback server and
nonkill Job closure were observed. No page errors, failed requests or forced
cleanup occurred in this successful attempt.

This reused package `835eaa2703cd69db62c5`, with `build.json` digest
`af8259daed7ace18a3cbac2b197578dbe210fdce94a10e2203b5a38ed0a3ed9a`.
Its 24 files total 5,127,903 bytes. The individually bound current knight
optimization is committed in `715cd40`; subsequent changes through `167b2d5`
are documentation only. The original package's `sourceRevision` remains its
local base `04eb4e0`, and its original source/emission/build receipts are not
retagged. No compiler, bundle, prepared-ground or package copy was produced for
this journey. Unchanged proof and other browser evidence was reused; no unit or
integration suite, synthetic component call or scenario matrix was run.

The first attempt completed the online knight move but stalled in an unbounded
service-worker readiness evaluation. Root verified its exact Chrome parent,
fresh owned profile, creation time and captured native process handle before
terminating that disposable browser. Its original Node exited with failure and
its streams, handles, server and Job subsequently closed. The failed attempt
and intervention receipt remain retained. In particular, the original failed
supervisor's `outerSignaling: false` field is superseded by the intervention
receipt's actual `outerSignaling: true`; it is not normal-closure evidence.

The corrected attempt bounded the service-worker control wait, retained a stage
readback and awaited original browser close events. It used a fresh profile in
native temporary storage outside the synced checkout. That location change is
a possible explanation for the first stall, not an established cause. Both
profiles remain private retained evidence; the temporary profile consumes the
same C: capacity and is counted in the successful execution's output receipt.

Exact private receipts under
`.artifacts/bend2/2035-preview/stationary-motion-20261006/`:

- Successful `current-artwork-offline-r2/result.json`:
  `b171af4d9ce77a40d605a067aa29b6fc3f3dbb3232f519dff330137a36e2208d`.
- Original successful closure `current-artwork-offline-supervisor-r2/terminal.json`:
  `c0fc7d9b95d35bcb4f9913e00a9f871777fc1ff6b7c6a099f9defbb7184e1fdf`.
- Inspected `current-artwork-offline-r2/cold-offline-played.png`:
  `cf7d7f2a90b71a79ba867c1da52bf408a674c3928ab056c761370e002914f3aa`.
- Original failed closure `current-artwork-offline-supervisor-r1/terminal.json`:
  `a5ce20c154ea38928ee19da5578b8ebc6cf2e29cf28e4e0ae2065ec3e451f42f`.
- Exact intervention: `current-artwork-offline-intervention-r1.json`.

This is cold browser-process offline persistence and continued-play evidence
for one current-artwork position on this host. It does not establish native OS
restart, other devices, general rules equivalence, stable latency or memory,
formal/kernel acceptance, compiler adoption or full graphics acceptance. The
pristine 2.0.27 pin, frozen Laws and full remaining sprint stay unchanged.
