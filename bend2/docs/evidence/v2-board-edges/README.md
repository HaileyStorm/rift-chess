# Exposed board and rift edges: local visual checkpoint

The owner noticed that the platform top and near slab wall were visible, but
exposed tile edges around the outer board and rift openings looked flat. This
checkpoint changes only `graphics/v2game/BoardScene.bend`, not chess rules or
the reusable/frozen graphics v1 library. A present tile gets a vertical facet
and top lip only when the neighbor is outside the board or absent in a rift.
The wall uses the current camera extrusion and tile material; the
shadow-facing material is brightened by a bounded side/shadow blend. Missing
tiles remain transparent onto the observatory. The fast 256px motion path
remains intentionally flat; detailed walls appear with settled refinement.

The pinned 2.0.27 checker reports `All terms check.` The focused regression
command is:

```powershell
$env:BEND_NO_TELEMETRY='1'
node bend2/tools/bend.mjs --run bend2/tests/board-edges/BoardEdgesTest.ts
```

The test passed 19 topology assertions, plus one camera-facing rift wall at
each of yaw 0/90/180/270. Changed pixels outside the top with exact raw or
cast-shadow-composited wall colors numbered 310/300/250/300 respectively;
the other 12 edge/yaw pairings remained occluded. A projected 2×2 opening
covered 8,528 tested pixels; 504 inset pixels preserved the underlay and
10,332 adjacent present-tile top pixels retained their exact materials.
The test hashes at this checkpoint are BoardScene SHA-256
`2de6785ef25e04405601db0e5098680d53825accfa0868c55f5af10eac9912a6`
and BoardEdgesTest SHA-256
`02d02282a70fedc1af9653e85d0b4b5dddfa802a7a7c6db1671f1dda3a9349dd`.
These finite pixel checks do not prove all projections or subjective quality.

Local draft browser content version `85397955504c1bb54d3a` was rendered in
installed Chrome at desktop, orbit and portrait sizes. The four-yaw inspection
receipt is `.artifacts/bend2/v2-preview/board-angles-8539-20260927/receipt.json`
(SHA-256 `90f50392e171b39fde488569c22167e40557956d28a9690e2c2bacb7285ba6a5`).
Representative inspected captures are
`board-edges-shade-8539-20260927/browser-v2-desktop.png`
(SHA-256 `70af479e01001b2277cda0d22f222abf04aad8568250f208110879bbf94bb021`),
`board-edges-shade-8539-20260927/browser-v2-orbit.png`
(SHA-256 `9b9247affdf9e1c89c3437337b22e86f308d549e8bf2e4731376cf4cb73e2401`),
and `scenarios/board-edges-shade-8539-20260927/12-portrait.png`
(SHA-256 `b19be9cc221ffd8286bd6514c4a377a889d7e1e08de040cb9fb21d5104ce9aa7`).
The extended rendered scenario passed all 13 groups, including offline play,
PCM, Shift/Undo and portrait interaction, with zero page errors. Its local
receipt SHA-256 is `707a48c0a5457029330e3e6cd30459a9dec4c5741712b848aab80d7d910def7a`.

Four sequential six-click orbit samples alternated old clean build
`ad9b34c4ac0da2d7cd32` and this draft (old/new/new/old). Helper work was
3.28/3.77 s old versus 3.74/3.63 s edited; last-input-to-refinement was
5.46/6.16 s old versus 6.27/5.78 s edited. Both builds' motion frames
visited 154,769 nodes. Receipts are under
`.artifacts/bend2/v2-preview/edge-ab-{old,new}-r{1,2}-20260927/`.
These few variable-load samples overlap and do not establish a throughput
improvement or a stable latency regression; an earlier edited run under
concurrent work was much slower and remains preserved separately.

After the source commit, the non-draft build from clean revision
`f8a7fbf911271cc297055f03656c9c790b307670` repeated the same content
version `85397955504c1bb54d3a`. The separate Pages repository published it
at commit `27cee629933dae456af95c5ace1f37a834a309ea`. All 21 manifest files
plus `build.json` matched local, staged and live bytes; JavaScript module MIME
was valid and the two original TypeScript-site baseline files retained their
hashes. The public verification receipt is
`.artifacts/bend2/publication/2026-09-27T16-55-59-064Z-c5dfa3f6/receipt.json`
(SHA-256 `63317c1ab2fb1d0e02ab40211e9d621ca7f65aa0c9426cafc418a4205587cb53`).
The first verification immediately after push saw the old deployment and
failed; its receipt is preserved, not silently promoted.

The extended real Chrome scenario then ran against
<https://haileystorm.github.io/rift-chess-bend2/>. It bound the served
`build.json` bytes to the clean local manifest and passed all 13 groups with
zero browser errors, including cold offline play, PCM, Shift/Undo and portrait.
Hosted receipt:
`.artifacts/bend2/v2-preview/scenarios/hosted-board-edges-8539-27cee62-20260927/receipt.json`
(SHA-256 `08fa40d85edbdd7c665428a40628f45e32f1250a31bc9214c43c0bf64c4895a7`).
The inspected hosted initial PNG is byte-identical to the local draft capture
(SHA-256 `70af479e01001b2277cda0d22f222abf04aad8568250f208110879bbf94bb021`).
This is a playable browser preview, not owner WOW acceptance, native/GPU
parity, or a 2.0.28 pin change. The original TypeScript game is unchanged.
