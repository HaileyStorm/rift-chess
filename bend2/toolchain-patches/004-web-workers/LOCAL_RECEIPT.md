# September 25 local worker variant receipt

Base: Bend 2.0.27 `d37909174ebd664338ae3194799a9e0899dedd51`.
Order: tracked 001 arity, 002 layout, then `004-after-001-002.patch`.
The latter's SHA-256 is `57ec91c6c66e859c3febc55b19f7a7c8d4a319c03350ea4a7176f99b4aef3a9b`.
Canonical (CRLF-to-LF) compiler source-tree SHA-256 is
`3f1d320584740feb30fe6ddcdb71f316327b554c76d0a92a3796c9e82e6fc871`.
The original pin stayed at the base commit without tracked edits. A fresh
Windows worktree replayed all three patches with `git apply --check` and
`git apply`, and reproduced that source-tree hash. Optional patch 003 was
excluded.

| Gate | Local result | What it proves |
| --- | --- | --- |
| Patched source and fresh replay, `node --experimental-strip-types gates/workers.mjs test` | 107/107 each | Worker semantics, Node real helpers, parser/policy/transport controls, legacy pins, and pinned-Bun HTML plus Chrome module-worker test. |
| `tests/workers/regression_matrix.mjs` against clean pin, after HTML integration | 639 compared fixture outcomes, zero differences | Parse/check/proof/emission comparison, not execution of all fixtures. |
| Static demo under `/nested/build/` via `browser-module-runner.mjs` | Chrome 153.0.8010.53, Edge 153.0.4234.48, Firefox 155.0, WebKit 26.6: each 19/19 functional checks and negative matrix | Real static ESM module workers, including page and existing-worker callers, source require witnesses, packed/F32 and lifecycle. |
| Negative assets | CSP, missing/corrupt module, mixed build, cancellation/disposal reject or recover; Chrome/Edge/Firefox reject `text/plain` worker | WebKit 26.6 executes byte-correct JS with `text/plain`; its corrupt module and mixed build still reject. No universal MIME rejection claim. |
| Relocated portable compiler resources | 91 copied files, `web_runtime.js` present, required worker library emitted successfully | Locally installed compiler resources work outside the source worktree; does not verify the separate upstream installer or native binary. |
| Chrome 153 coarse browser sample, nine interleaved calls after warmup | Integer median legacy 37.3 ms, auto 21.2, required 19.4 (auto 12 jobs); image median legacy 23.9, auto 25.9 (0 jobs), required 14.5 | Required helper can reduce desktop median. Chrome integer auto p95 44.9 ms versus legacy 42.3; no blanket auto acceptance. |
| Firefox 155 / WebKit 26.6 coarse browser samples | Firefox required medians 28→16 ms integer, 17→11 image; WebKit 42→31, 42→32 | Browser/device-specific medians only; WebKit required p95 regressed on both families. |
| Bend `BotAdapter.choose` on 30 legal Rift positions, Chrome 153, 90 warmed calls | All 90 IDs match serial; serial median/p90 23.6/35.7 ms, two-helper required 17.1/23.5 ms; 90 witnesses, 270 remote jobs | This is the measured game boundary selected for worker use. Warmup 23.1 ms is separate. It is not a full browser interaction or device-wide guarantee. |
| Source-bound game package, draft v2 build `bc2e4efb741f6cc791af` | Exactly five bot files in 16-file hashed build manifest; 3/3 package/offline tests; 11 browser scenario groups | Nested static hosting and service-worker cold-offline bot reply passed in Chrome 153, with two module helpers, hello/ready and real job/result messages, no page/console errors or HTTP failures. This is local draft acceptance, not public deployment. |

The packet's automatic-policy CPU criterion remains open: some coarse windows
stay local or oscillate, and cheap operations on large immutable inputs pay a
large snapshot cost before an auto decision. An experiment using a validated
copy followed by `structuredClone` had variable direct gains but no supported
end-to-end win, and was reverted. The original Stage2 runtime is retained.
The application result above is separate from the compiler fixtures and the
isolated bot benchmark. Other browser engines for the full Rift game,
constrained-device performance, the graphics overhaul, and public deployment
remain distinct gates.

Local detailed receipts are in ignored `.artifacts/intake-20260925/`:
`worker-final-test.log`, `worker-replay-test.log`, `worker-regression-final.json`,
`worker-browser-*-receipt.json`, and `browser-worker-perf-*.json`. This tracked
record gives their gates and limits; the exact build/source binding stays in
`VARIANT.json` and emitted game sidecars.
The bot measurement is `.artifacts/bend2/bot-required-benchmark.json`.
