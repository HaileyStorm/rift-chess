# Canonical Match state

`Match.bend` wraps the frozen v2 Match with canonical legal IDs and a dependent equality certificate. All commands erase to the frozen v2 result; rejected commands retain the exact Ready. Move, undo and initial construction enumerate once. Position-preserving commands retain their certified IDs.

The controller owns Ready values inside the trusted Worker. Certificates erase to null in JavaScript and do not authenticate objects supplied by a host. UI-visible legal IDs may be cleared after adjudication; they never construct a Ready. Replay retains a separate Ready until the entire record validates and installs that same value.

The relocated source passed general source/type/promise checks and a semantic stale-ID negative on accepted 2.0.27 and candidate 2.0.35. The actual controller passed 120 complete packet comparisons plus 16 bot-guard and captured-Store comparisons. Five paired Chrome runs measured faster opening moves with equal final canvases; the current build also passed cached offline play and saved-position reload. See [the source-bound evidence](../../docs/evidence/canonical-match-20261007/README.md) for costs, distributions and limits. These checks do not establish stable overall latency, BendTT/Safe/kernel acceptance or toolchain adoption. Frozen v2/v3, historical receipts and the accepted compiler pin remain unchanged.
