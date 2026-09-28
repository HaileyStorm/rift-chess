# Browser Import touch/resize repair

The browser host previously held a touch/pen Import press until release. It
checked the displayed presentation and Import bounds at release, but a resize
could be queued while the old presentation and controls were still displayed.
Releasing in that interval could open a provisional file chooser for a gesture
whose Bend input would be replanned against a different layout. The retained
normal Import/cancel and completed-replan checks did not cover that interval.

`platform/browser/host.ts` now captures a layout version with the held
presentation. The window resize handler invalidates that version before
queuing Resize. A release with a changed version/presentation or one outside
the current Import control opens no chooser and forwards neither a stale
`PointerDown` nor an unpaired `PointerUp`. Mouse and accessible-button Import
paths are unchanged. The modified host and new deterministic harness SHA-256
values are `5354d12fcd278393b546c51260b06db553ddf8ac7531b60293a39bd374321374`
and `2c37c5a127fd87d2fcbd31ac969614b865112e0e0d8a3739c92d0eb6d92aa2a9`.

The pinned wrapper ran the new `tests/browser-host-gesture.ts` fake-host
event-order harness, plus `browser-port-picker.ts` and
`browser-port-queue.ts`, with all checks passing. An independent read-only
review found no remaining actionable P1/P2 in this narrow fix. The original
TypeScript game passed 62/62 tests and `tsc --noEmit`.

A local **draft**, source-dirty Bend 2.0.27 v2-preview build had content version
`8a81a3c3311afc8dc308` and `build.json` SHA-256
`f349573e9086f5d38c6939a9c537985b4d4be986c147756011b65f2d1e35206d`.
With that exact local manifest served to real Chrome, the trusted
`touch-import-replan` scenario passed with zero defects (summary SHA-256
`05c9bd0fcee2dfc348419402428927e80b2e3ec0480fc06155b8582557181d9c`),
as did `import-gesture-guards` with real touch activation/cancellation
(summary SHA-256
`7a005b37fdac5e622f5482c3548e8d0b27a53b38db82907cf5190fcd1596f398`).
Their ignored receipts are under `.artifacts/bend2/playtest-stage2/` with run
names `import-resize-fix-20260928` and `import-touch-valid-20260928`.

The pending-resize-before-worker-reply timing is deterministic fake-host
evidence. The real-Chrome test covers a trusted gesture across a completed
new presentation, not that exact pending interval or a physical touchscreen.
This draft is not a clean published build, a broad reliability bound, GPU
parity, a compiler-pin amendment or owner acceptance. A clean-source build,
focused hosted checks and source-bound publication remain separate gates.
