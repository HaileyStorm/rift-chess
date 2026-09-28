# Bend-decoded plate sharing: browser draft, 2026-09-28

The published `c7056b49df1aa08b4048` browser had two Bend workers decode
the same selected 512² observatory RGA plate: the main worker before its first
playable frame, then the sprite helper before detailed pieces. A disposable
timing draft measured main-worker selected-plate loading at 0.94–2.18 s in
three starts; one split sample spent 259.2 ms fetching and 1,138.7 ms in
`BoardScene.load_plates`. Its ignored summary
`.artifacts/bend2/playtest-stage2/plate-split-phase-20260928/summary.json`
is SHA-256 `e802aa14a9a7e966b3b69bf9d389c188534ce622712bea3c736d0e3a90df7ec2`.
That timing-only code was removed before the candidate; `worker-v2.ts` was
rehash-matched to its original SHA-256
`c5b8b4144973215c297b0105bf9e97f0d532b140686ea91bfcff289c0b7d5e7e`.

The candidate shares the already decoded, Bend-produced selected-theme plate
with the sprite helper once per helper/theme transition. It accepts only a
`Ready` depth-9 `Pix`/`Qua` root; an absent or decode-rejected plate follows
the existing independent request/decode/fallback route. The helper retains
the validated immutable plate on message receipt, before a superseded job
can yield during sprite-page IO, and keeps at most one shared theme. Its
source token binds the two compiled modules but is not authentication for an
arbitrary caller. The main worker still owns the first frame and Bend still
owns asset selection, decoding and final pixels. Frozen Laws and the native
entry point are untouched.

On disposable draft `7548c8e73bf31b751a6c`, three local Chrome
`desktop-start` runs had proxy-to-detail spans of 4,006.4, 3,259.8 and
3,458.7 ms. Their ignored summary SHA-256 values are
`e9894604c22d9e26ef5aa8b942345235cd36d3124d00099cc31641b6979ae9dd`,
`d6eabbc689ed06eba4d4aca32e7d467aef60947b9196c2f55d40540b37073e02`,
and `d7a8cde5acc65eb80f93bac61bbca83576929b9b98091690df48c17bf8700486`.
The clean published build served from a separate local port in three runs
measured 4,761.9, 4,975.8 and 4,756.8 ms, summary SHA-256
`1de0a880582caae9235bdf039abd35b480cb43ea054ba0f92dbc40b53baead40`,
`3c8fbac6ee07d9e6d6e6eecafb6c404d0a5565967cc319277665a5305e3e2c94`,
and `cbc867edee1caacf1397e90d3b7b6f8fe7796f0c2bbbc578632e661bddda5dd5`.
The helper's initial shared job avoided the second plate fetch/decode but
paid a synchronous 349–426 ms clone dispatch. These small variable-load
samples suggest about a one-second detailed-art improvement, not a guaranteed
latency bound or first-frame speedup.

Independent review found two P2 edge cases, then re-reviewed the repairs
with no remaining actionable P1/P2 finding. A successfully fetched but
malformed RGA must produce Bend's normal `Missing` fallback, not a helper
fault. Real Chrome HTTP-200 corrupt-plate runs passed on candidate and clean
baseline, and their refined L1 PNG SHA-256 matched exactly at
`345f3fd7251cf19f02e39942b9094454705d9780dc70e609b35ada568dc6e0f2`.
Their summaries are SHA-256
`18b9be7ea8b8f4dbcc71c524318928c58b27058779def2e320a3409c1a2bfc49`
and `e83b3aa571a43557013548dc961c3ae2990899d132b7a97f5a3164afe8d5e7e9`.
The second edge was a first job superseded while sprite-page IO awaited:
the replacement same-theme job must find the shared plate at receipt time,
not re-fetch/decode RGA. The dedicated real Node-worker control now passes
that condition and a wrong-theme rejection; the old fetch/decode branch is
retained intentionally for malformed/missing or unsupplied assets.

On repaired draft `b5251c45ce22760635b0`, all 13 extended real-Chrome
groups passed with no errors (ignored receipt SHA-256
`ec315d078d85161d93e10386a17b6f62284f5b3c57db834d635b75bcbdbe4297`).
Eight sampled PNGs, including both themes, selected pieces, promotion and
portrait, matched the clean hosted build byte-for-byte. A six-click camera
burst also passed with a final detailed refinement. Eight alternating
candidate/clean `startup-response` runs each passed; candidate first
selection reply median/max were 250.0/302.1 ms versus 275.1/456.5 ms for
clean, while proxy-to-detail medians were 4,036.6 versus 5,470.1 ms.
These are small load-variable samples, not a p95 guarantee; the one-time
clone's transient memory peak is unmeasured. Neither first-frame responsiveness
nor rapid detailed-art acceptance is closed by this candidate alone.

The source is still a local draft at this point. Clean build, hosted
publication, native closure comparison and owner visual acceptance remain
separate gates.

## Clean build and hosted preview

The reviewed implementation was committed and pushed at
`b9566067122e8d268881b586591dcfeeaaeb247a`. A non-draft build on the
unchanged pristine Bend 2.0.27 pin has `sourceDirty: false`, browser content
version `b5251c45ce22760635b0` and `build.json` SHA-256
`ce9a29f5067a9eca746502862aa8835193493dbf2ed1356d8988df80451d3c72`.
The local clean exact-bound 13-group Chrome suite passed with zero errors
(receipt SHA-256
`7289295c61eb5ebbfdba9da4c94156d098ce0b43286b8aabe45f6b477a239b66`),
as did `desktop-start`, HTTP-200 corrupt-RGA fallback and immediate startup
selection together (summary SHA-256
`e3bd6302ecc66385c7b0743e55fb70778ef13e7315128a4e69dcffc440d04c8e`).
The original TypeScript application passed 62 tests and its production build;
its source and published assets were not changed.

The [Bend-only shareable preview](https://haileystorm.github.io/rift-chess-bend2/)
advanced to Pages commit `53c96bccc7bb37193671fe5bba4f59865c1da9f9`,
which reported `built`. The live byte verifier matched 22 Bend files and the
two unchanged original-game baselines. Its ignored publication receipt is
`.artifacts/bend2/publication/2026-09-28T16-11-39-977Z-d38557e6/receipt.json`,
SHA-256 `39e2b30fb9d5522ce543ae1da17b82ae4e4a17335bc8cf6fe722986d992ba9ee`.
The hosted exact-manifest-bound 13-group Chrome suite passed with zero errors
(receipt SHA-256
`d103f9fdb633383170cba0a6a2f70c217d71f0c12cfbf75b042e930b9cba9d46`),
as did the three focused rendered scenarios (summary SHA-256
`65a78eccb5c5a92f13d23b2865d0b320aca1898f87e650238c868cc292e71de2`).
One hosted start took 2,536.8 ms for its first proxy request/reply, then
3,330.0 ms from that frame to ornate detail; this is a sample, not a bound.

`git diff --name-only cafc934..b956606` contains only browser transport,
tests and documentation. It contains no `.bend`, native entry, compiler or
asset change, so the previously reported Linux CPU C/ELF/GUI/PCM/restart
input closure was not modified; that is a source comparison, not a new Linux
execution on this commit. Native GPU-on original-cadence parity, rapid
first-frame response, transient clone-memory peaks, a reviewed 2.0.28 pin,
and owner visual acceptance remain open.

The later [uninterrupted hosted 24-scenario matrix](../v2-playtest-recovery/README.md#uninterrupted-24-scenario-hosted-matrix-on-shared-plate-release)
passed all 685 checks with zero defects on this exact clean published build,
including the long draws, both natural bot games and two mobile imports.
Its move/menu reply sample still misses a rapid response budget; this result
does not turn the optimization into a universal speed or GPU claim.
