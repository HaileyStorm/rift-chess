# Artwork provenance

The two observatory background plates in `source/` were generated specifically
for Rift Chess using OpenAI image generation and edited into board-free variants
for this project. The preserved PNGs and deterministic derived RGA1 bitmaps are
project artwork. No third-party image asset was incorporated into these files.

The RGA1 decoder is separately reusable code under `../lib/graphics/v2/assets/`;
this artwork and its theme choices are not part of that library.

`source/chess-piece-atlas-initial.png` was generated specifically for this
project, and `source/chess-piece-atlas.png` was produced by an ImageGen edit of
that atlas to isolate the silhouettes with transparent alpha. Both originals
are preserved for provenance. They are concept artwork and are not in the
current runtime bundle; no third-party piece asset was incorporated.
