# GPT-6 Pro graphics v2 intake — local DRAFT checkpoint

The owner supplied `graphics-v2-library-review-436313f9.zip` on 2026-09-24.
Its SHA-256 is `ac83da0cc3ba13e9f60768e98dd7c53a81af89a68adcd654a5d1b4897594ab24`.
The delivery manifest verified all 214 files. The original `MANIFEST.json` is
historical input metadata with three reported discrepancies; it is not the
delivery manifest. The supplied archive and extracted diagnostics remain under
the local ignored `.artifacts/pro-review/` review area. Only its 35 candidate
paths under this library were applied. No game, grid8, frozen-v1, compiler or
production TypeScript source came from the Pro archive.

This intake keeps the v2 library **DRAFT**. It adds the immutable red-alpha
sprite kernel, explicit mask preparation, RGA2 straight-alpha decoder and
offline producer, explicit alpha-weighted mip reduction, native-size glyph
masks and font baker, finite tests, and 12 narrow extension laws/proofs. The
old core, RGA1, grid8 and frozen-v1 law/proof sources remain byte-identical.
The extension witnesses cover endpoints and examples; they do not prove the
general cursor refinement, mip formula, decoder or font layout. No Law was
weakened or frozen by this intake.

Local changes after the archive: the font baker writes the exact LF UTF-8 bytes
it hashes, fixing a Windows CRLF provenance failure; an all-caller search found
no consumers of the old `MaskedStamp.leaf/tree` helpers, so the dead duplicate
renderer and duplicated transparent predicate were removed. The original
two hot-path sources are retained under `tests/review/baseline/` for A/B and
rollback evidence, as well as in the supplied review archive.

## Verified here

- The exact clean Bend 2.0.27 pin and Bun 1.4.2 ran all four proof entrypoints:
  core v2, grid8, RGA1 and the 12 new extension witnesses. Each returned
  `All terms check.` with no warning, unsafe or foreign proof output.
- The 14-run pinned suite passed with no failure or warning after the local
  cleanup. It includes the existing library/Grain/Texture/Affine/RGA1 tests
  and new alpha, mip, glyph and RGA2 finite emitted-JS suites. The full
  source-bound summary is at `.artifacts/pro-review/main-pinned-final/summary.json`.
- Seven actual Python offline-tool tests passed without skips using a local,
  hash-pinned Segoe UI test font; no font binary was bundled. An independently
  generated 40px/four-bit four-glyph module passed the pinned Bend checker.
  These are different evidence classes from general formal proof.
- The source-subset A/B runner now reads its two original sources from this
  library's `tests/review/baseline/` and completed locally. Two deliberate
  source mutations were detected by assertions in that non-authoritative
  harness; neither is a real-compiler mutation proof.
- The four supplied diagnostic PNGs were inspected: alpha edges are clean,
  explicit mips reduce pattern aliasing, and native-size glyphs are visibly
  smoother than enlarged low-resolution glyphs. They are not game screenshots
  or an accepted WOW design.

The Pro archive's earlier source-subset A/B was non-authoritative. A local
comparison through **actual Bend-emitted JavaScript** used 32 prebuilt generic
sprites and exact full-frame packed-pixel equality in all eight tested cases.
The medians below are three alternating construction samples after warmup,
excluding decoding, preparation, blit and presentation; they compare the
archive's old source against the received cursor path before the small local
helper cleanup. The results are diagnostic, not browser/native/GPU FPS.

| Canvas / mask / offset | Old ms | New ms | Reading |
| --- | ---: | ---: | --- |
| 512 / opaque / aligned | 50.01 | 1.45 | aligned source reuse |
| 512 / opaque / +3 | 50.97 | 62.86 | regression |
| 512 / soft / aligned | 75.24 | 24.97 | useful retained layer |
| 512 / soft / +3 | 86.22 | 121.14 | regression |
| 1024 / opaque / aligned | 225.91 | 1.22 | aligned source reuse |
| 1024 / opaque / +3 | 212.43 | 282.20 | regression |
| 1024 / soft / aligned | 422.84 | 111.31 | useful retained layer |
| 1024 / soft / +3 | 479.26 | 381.61 | improvement but too slow for drag |

A side-4 cutoff trial worsened the unaligned cases; a side-16 trial reduced
some costs but was noisy and did not consistently beat the original. Neither
trial was adopted; the delivered side-8 cutoff remains. Cached settled art
may use the new path, while pointer/camera motion keeps cheaper previews.
Before changing the default, measure real decoded art and rendering on both
browser tiers, and compare native single/multicore/GPU paths under separate
device evidence. The library adds capabilities but does not itself solve the
game's visual composition, angle-dependent pieces, UI layout or responsiveness.
