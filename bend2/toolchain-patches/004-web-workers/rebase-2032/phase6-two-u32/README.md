# 2.0.32 phase 6: one required two-U32 leaf

This isolated follow-on to `phase5-percall` expands only the callee signature
accepted by the strict per-call builder: the existing unary U32 leaf remains
supported, and one direct required call may additionally target a closed,
filled, pure `(U32, U32) -> U32` leaf. The exported caller remains the phase-5
first-order `U32 -> U32` shape. The existing one-call, web-only, uncapped,
fail-closed policy is unchanged; this is not a scheduler, pool, nested-worker,
or automatic-parallelism change.

The callee ABI still transports an argument array. The emitted caller and
worker both bind the statically checked arity, require each numeric index to be
an own array element, validate every U32, and call the isolated callee with
those arguments. This rejects sparse arrays; `Array.prototype.every` is not
used for validation because it skips holes. The selected leaf is still checked
closed and call-free by the phase-5 source planner; native `!@`, explicit
`@N`, multiple/nested requirements, and unsupported arities or types remain
rejected. The build metadata schema is `bend-percall-build/2032-2`; the existing
worker request/witness protocol remains `2032-1` because its wire shape is
unchanged.

## Replay

From the repository root, with the clean 2.0.32 scout, local Node 24.12, and the
existing Playwright/Chrome installation:

```powershell
$env:BEND_NO_TELEMETRY = '1'
node --check bend2/toolchain-patches/004-web-workers/rebase-2032/phase6-two-u32/test.mjs
node --experimental-strip-types bend2/toolchain-patches/004-web-workers/rebase-2032/phase6-two-u32/test.mjs
```

The test replays the exact ordered source-bound stack through phase 5, applies
this patch only in a unique OS temporary checkout, validates the whole Bend
book, checks positive binary and unary builds plus strict negative shapes, and
requires byte-identical no-suffix JavaScript and C against the 2.0.32 phase-2
baseline both before and after planner/build calls. If local Playwright and
Chrome are available, it serves the generated modules from ephemeral loopback,
checks missing-index-0 and missing-index-1 arrays at both the dispatcher and
Worker boundaries, and runs binary and unary callers through real module
Workers. A test-only module export exposes the generated dispatcher to those
malformed-input checks; production bundle bytes are separately served and
hash-checked. Otherwise it reports browser evidence as unavailable; source
checks are not described as a browser pass.

This is a source/compiler-fixture experiment, not a general Worker scheduler or
proof. The browser probe covers one bounded local Chromium session only, when
available. It does not claim exhaustive hostile-message,
lifecycle, multi-engine, hosted/offline, game, native, GPU, performance,
toolchain-adoption, frozen-Law, or release acceptance. The clean 2.0.27 pin,
prior version receipts, upstream compiler checkout, gameplay source, and Laws
are untouched.

The phase-5 planner rejects a `match`-based binary selector with
`higher_order_or_dynamic_call`, and rejects a `U32.add` leaf with
`intrinsic_reachable`. This slice does not broaden planner eligibility. Its
call-free leaf returns its second formal: a real raw Worker request with
unequal `[40, 2]` operands returned `2`, so reversing the argument order would
have returned `40` instead. This second-formal leaf plus dense-U32 checks
does not independently prove unchanged first-argument value transport; a
separate accepted first-formal or two-operand-dependent leaf remains a
follow-on ABI coverage gate.

## Recorded local evidence

The bounded replay passed on Windows with Node `v24.12.0`, Chrome `154.0.8037.59`,
and the clean scout at `573002f01ec6c52416d44489543f69a9625facf8`:

- Phase-six patch SHA-256: `89da56c0062c07d2a14b580c0a363b053949eae76456697c7eed65bcdeedf468`.
- Fixture SHA-256: `c8a5bcf43624b9b35e7fdc853b62ab573aefe18def5b87bc665591df40581c98`.
- Derived `comp.ts` SHA-256: `0f2366677b546498b137b0d08684a36230a72f4df4cabca27293076fb78faa11`.
- No-suffix phase-2 and phase-6 JS SHA-256 remained
  `3c99dcd84414a057fce65edb45dd69d600e6b57bee49aec23e7333130a510a1d`; C
  remained `9cb68b124aa2865f21a3c1cdb633bf691d45d1f06a8eea496869d2585750a009`.
- The binary caller returned `3`; the unary phase-6 caller returned `41`.
  The raw Worker probe posted unequal `[40, 2]` operands and returned `2` from
  `second`; swapping them would return `40`. Missing index 0 and missing index 1
  each failed at both dispatcher and Worker boundaries; malformed Workers
  reported zero fetches. Five Workers were created and terminated across those
  checks and the two valid routes. Only loopback modules were requested; no
  outside-origin or Node-fetch calls were observed.

The result establishes this one local Chromium route and the deterministic
compiler fixture only. It is not evidence for other browser engines or the
deployed application.
