# Rift Chess observatory artwork

The two preserved PNG source plates were generated for this project from its
observatory art direction. They contain no board, pieces, lettering or UI.
`source/observatory-astral.png` depicts a night-sky observatory;
`source/observatory-stone.png` depicts a sunlit stone court. No third-party
image was incorporated. See `MANIFEST.json` for exact source/runtime hashes.

`tools/prepare.py` derives 512×512 opaque RGB plates and packages them through
the generic Bend library's RGA1 encoder. It preserves the PNG sources. The
game-specific code chooses a plate by theme; the reusable codec under
`../lib/graphics/v2/assets/` owns parsing and its own Laws/Proofs. A missing,
invalid or oversized asset must fall back to the Bend procedural background.

These plates are experimental until the actual browser/native decode,
offline-cache, hole-visibility and visual checks pass. The generated art is
project artwork, not a claim that the current page has reached visual
acceptance.

The two 1536×1024 RGBA chess-piece atlas sources under `source/` are preserved
as an unshipped 3D/turntable direction. The edited `chess-piece-atlas.png`
contains true transparent alpha around the 12 silhouettes; its SHA-256 is
`e7e4dd458e02d098c5daa3db2d6a4dc903f10d2f55da33684932ecc2b9dad923`.
The preceding `chess-piece-atlas-initial.png` SHA-256 is
`7eab6aea9fe62d7cfa4d98fb479bb667b3183f75d450f70a3d23d0153c4b972e`.
Neither is converted into a runtime asset until a reusable alpha/mesh route
and full-camera visual gate pass. See `../docs/PIECE_RENDERING_DIRECTION.md`.
