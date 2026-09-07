# Asset ledger

## Procedural chess pieces

`src/render/pieces.ts` contains the original Three.js geometry for the Classic and
Faceted families: capped revolutions, volumetric horse lofts, capped half-space
cuts for solid bishop slots, beveled components and connected crown details. Component audits remain available
before the closed parts are merged into a shared render mesh. No external model
or font is needed. Wood grain, coordinate markings, world geometry, atmospheric
effects and the rift depth field are generated locally. Original source is under
the repository's MIT license.

The geometry is intentionally shared through in-module caches. Render instances do
not own their materials or geometries; `disposePieceAssets()` releases those shared
resources only after all instances have been removed.

## Bundled stone surface

`public/assets/marble-albedo.png` is an original AI-generated stone texture made
with the built-in image-generation tool on 2026-09-07. No reference image was
supplied. It is bundled with the game and requires no runtime image generation,
account, model or network call after installation/caching.

- SHA-256: `c00c5a61e6693e2ec5a0b4754225561c43d23275d48f2cae00ce51230244b9aa`
- Generation prompt and tool provenance: [marble-albedo-prompt.txt](assets/marble-albedo-prompt.txt)
- Consumer: `src/render/surfaces.ts`, shared by the actual 3D world and tile materials.

This material image is not a screenshot or evidence of the game's visual quality.
Rendered geometry, lighting, tiling and gameplay views remain subject to inspection.

## Inspiration boundary

Rift Chess acknowledges [xkcd #3139, “Chess Variant”](https://xkcd.com/3139/) as
the premise's source, subject to the [xkcd license](https://xkcd.com/license.html).
The comic is not bundled, traced, embedded, used as a texture, or redistributed by
this project. These procedural chess assets are original and are not derived from
the comic artwork.
