# Asset ledger

## Procedural chess pieces

`src/render/pieces.ts` contains the original, locally generated Three.js geometry for
the Classic and Faceted chess families. It uses lathed profiles, custom extruded
horse, bishop-mitre and king-cross outlines, and authored rook/queen crown parts.
No external model, font, image or texture file is needed. Wood grain, lighting,
coordinate textures and cavity falloff are generated locally. The source is
project code under this repository's MIT license.

The geometry is intentionally shared through in-module caches. Render instances do
not own their materials or geometries; `disposePieceAssets()` releases those shared
resources only after all instances have been removed.

## Inspiration boundary

Rift Chess acknowledges [xkcd #3139, “Chess Variant”](https://xkcd.com/3139/) as
the premise's source, subject to the [xkcd license](https://xkcd.com/license.html).
The comic is not bundled, traced, embedded, used as a texture, or redistributed by
this project. These procedural chess assets are original and are not derived from
the comic artwork.
