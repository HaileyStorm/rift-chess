# Clean v2 sprite checkpoint: separate hosted preview

The separate free browser preview at
<https://haileystorm.github.io/rift-chess-bend2/> serves the clean,
non-draft build `ad9b34c4ac0da2d7cd32` from source
`44dc9640929c37d119fabc3980d6d51631257d25`, with the unchanged
2.0.27 Bend pin. Its manifest records `sourceDirty: false` and
`draft: false`. The separate public Pages repository's `main` is
`f5025970948ec097073c0d209f232bfd48026059`; remote `main` was
checked against that checkout. The original TypeScript application's
repository and public URL remain separate.

`node bend2/tools/verify-hosted-v2.mjs` compared all 21 manifest-listed
static files plus `build.json` from both clean local build and Pages checkout
against the publicly fetched bytes. All 22 matched; the host, main worker,
sprite helper and bot module files had JavaScript MIME types. The two
baseline files at the original TypeScript site retained their recorded
hashes. Source-bound immutable local receipt:
`.artifacts/bend2/publication/2026-09-27T13-51-34-710Z-3871e094/receipt.json`
(SHA-256 `79dede0e1a1b2159a7ae0e204d939a7c6eab0a21d8256cc3c05647410ad5c429`).
An earlier successful receipt before the remote-main check was added remains
in the ignored artifact store and is not the promoted publication receipt.

The extended real Chrome scenario against the public URL passed 13 groups
and recorded zero browser errors. It exercised canvas selection and two
moves, Undo agreement, both themes, preferences, help and new match,
record import and knight underpromotion, finite PCM through browser audio,
service-worker-controlled offline reload/refinement/move, Shift, portrait
controls, and an immediate settled Shift Undo refinement
(`quietWindowMs: 0`). It captured 16 rendered states, including a desktop
initial state inspected by the controller. Receipt:
`.artifacts/bend2/v2-preview/scenarios/hosted-ad9b-f502597-20260927/receipt.json`
(SHA-256 `29c98c93709a3b289e27991f6a04def5126aeb770bf088369a69dde3e87865d5`).

This is a source-bound hosted browser preview, not a release or owner WOW
acceptance. The fixed-facing piece sprites remain visually weak at broad
camera yaw. The generated knight and 3D turntable studies are neither
integrated nor shipped. No new-source Linux CPU/GUI/PCM/restart result,
native parallel or GPU benchmark, or 2.0.28 full-browser/native migration
is established by this publication. No upstream Bend artifact was published.
