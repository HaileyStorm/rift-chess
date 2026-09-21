# Asset ledger

## Procedural chess pieces

`src/render/pieces.ts` contains the original Three.js geometry for the Classic and
Faceted families: capped revolutions, volumetric horse lofts, closed mitres with
recessed diagonal slots, beveled components and connected crown details. Component audits remain available
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

## Bundled world reflections

`public/assets/reflections/` contains nine precomputed CubeUV maps, one per world
and quality setting. They are generated from the same original world geometry,
stone texture, lights and PMREM recipe used by the prior runtime. World time and
rift reaction are fixed at zero during generation. Exposure and environment
intensity remain controlled by the live world.

The PNGs are lossless data containers: three opaque RGB pixels carry each RGBA
half-float texel's eight bytes and one zero padding byte. They are not pictures to
display directly. The nine files total 7,812,491 encoded bytes and reconstruct
27 MiB of texels. The loader verifies each raw checksum before creating its
HalfFloat CubeUV texture; all nine maps decode on the CPU before the first useful
frame. GPU upload occurs on first binding. First selection of each world/quality
still includes shader preparation and upload; synchronous lookup does not mean
instantaneous configuration.

The standalone manifest is retained for independently retrievable asset and
source verification in browser and Windows distributions. Runtime embeds the
same manifest because the native content policy forbids renderer fetches.
The manifest records source hashes, Three version, producer parameters, renderer,
encoded/raw hashes and the frozen tool build. The initial producer ran on Windows
build 26200, Iris Xe driver 32.0.101.7026. All nine maintained-producer outputs
match the previous runtime texels exactly; all 27 material comparison pairs were
byte-identical on that renderer. This does not claim cross-driver pixel identity.

To regenerate after a recipe input changes, use an empty output directory:

```text
node scripts/bake-reflections.mjs --output .artifacts/reflections-regenerated
```

The build tool requires the project's Node dependencies, installed Chrome, and
Python with Pillow. It builds and owns a temporary local preview server, checks
the served module and stone bytes, and produces a fresh receipt. Inspect and
verify the output before replacing the public PNGs and manifest. Normal
`npm run build` verifies source, encoded asset and decoded texel hashes without running a GPU
bake. Never edit hashes to waive a stale or corrupt asset.

Runtime Room PMREM generation and its render-target cache are removed. The
build-time producer retains RoomEnvironment as the recipe's reference light;
the isolated piece inspector retains its separate neutral diagnostic lighting.
The original producer, raw maps and failed/successful comparison receipts remain
historical evidence under `.artifacts/reflection-bake/`.

## September 21 experience assets

The three worlds and all nine reflection maps were regenerated for the new
experience pass. The adopted immutable local bake is
`.artifacts/reflection-bakes/experience-v2-horizontal-rim-20260921/`.
Its receipt records nine captures; the shipped manifest binds the final world
source, producer, dependencies and both packed and decoded pixel hashes. Prior
comparison/bake evidence above describes the earlier release, not these new rooms.

`src/audio.ts` synthesizes six original cues from oscillators and deterministic
noise: selection, move, capture, tile Shift, promotion and check. No audio file,
sample library, external service or runtime download is required. The review WAV
is an output for listening, not a runtime dependency.

## Inspiration boundary

Rift Chess acknowledges [xkcd #3139, “Chess Variant”](https://xkcd.com/3139/) as
the premise's source, subject to the [xkcd license](https://xkcd.com/license.html).
The comic is not bundled, traced, embedded, used as a texture, or redistributed by
this project. These procedural chess assets are original and are not derived from
the comic artwork.
