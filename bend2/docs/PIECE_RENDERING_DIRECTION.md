# Piece rendering direction (design draft, not a Law)

The first observatory-plate composites show a mismatch: detailed architecture
behind a flat board with small vector tokens. The game now has a preserved
two-row, six-column ivory/obsidian concept atlas with actual transparent alpha
and recognizable chess silhouettes. It is **not** in the runtime. The original
and edited ImageGen PNGs are preserved under `bend2/assets/source/` with their
hashes and provenance in the asset README; promotion must derive runtime data
reproducibly from the edited source. A single frontal
sprite is not acceptable at arbitrary camera yaw.

## Near-term options

| Route | Orbit behavior | Cost and evidence needed | Current decision |
| --- | --- | --- | --- |
| One camera-facing sprite | Stable screen silhouette but its sculpted face never turns | Smallest decoder/blit; visibly wrong at side and rear angles | Reference only |
| Baked turntable frames | Choose the nearest or blended view from one coherent mesh, with Bend owning camera-to-view selection and occlusion | Asset count, memory, transition quality and drag cost measured at yaw 0/25/45/90 and overhead | Preferred sprint candidate if a mesh can be made |
| Runtime mesh | Correct continuous projection, shadows, and per-piece depth | Generic model/texture import, clipping, lighting, depth and GPU/CPU renderer must be designed and proved; JS fallback budget unknown | Future reusable graphics-library capability, not a prerequisite for the current browser build |

For a small object, a manually or procedurally constructed lathe/extrusion
model may give more consistent turntable frames than reconstructing hidden
surfaces from one image. Most pieces are rotational; the knight can use an
extruded silhouette with sculpted front/back. The source atlas can guide
materials and proportions. This is an inference about a practical workflow,
not a claim that any mesh has been built.

An image-to-3D experiment can run offline under a Linux GPU grant and produce
one candidate GLB/mesh per type, then render color+alpha turntable frames at a
fixed lighting/camera rig. The browser would serve static derived images; it
would not run the generator. Primary-source capacity choices as of this note:

- [TripoSR](https://github.com/VAST-AI-Research/TripoSR) is MIT and its
  default single-image inference states about **6 GB VRAM**, with mesh and
  optional baked texture output.
- [TRELLIS](https://github.com/microsoft/TRELLIS/blob/main/README.md)
  supports image/multi-image conditioning and mesh export, but its official
  Linux setup calls for NVIDIA **16 GB VRAM**. The multi-image method is
  experimental and does not guarantee consistent views.
- [TRELLIS.2](https://github.com/microsoft/TRELLIS.2/blob/main/README.md)
  targets detailed textured meshes and states NVIDIA **24 GB VRAM** on Linux.

The Linux device and grant have not been verified for any of these models. A
generated backside, crown, or knight profile must be inspected at multiple
angles; one beautiful front render does not establish a usable 3D asset. Do
not install/download weights or run GPU work before the host's grant and
separate trust gate. Licensing and output provenance must be checked again
against the exact version selected before including derived assets.

## Library boundary

A generic alpha-image codec and clipped sprite compositor belong under
`lib/graphics/v2` with their own DRAFT Laws and Proofs. Game-owned code maps
piece type/color/camera to asset IDs and projected board anchors. It does not
put chess semantics or the observatory palette into the library. A later
mesh module can define immutable vertices, triangles, UVs, material and
camera/light inputs, with deterministic depth/alpha order and a CPU fallback;
GPU acceleration is a separate backend and evidence class. Do not force a
mesh API into the current sprite contract merely to promise future support.

Before promotion, compare actual Bend-browser frames in both themes at yaw
0/25/45/90 and overhead, including piece hover/selection, captures and shifts.
The visual gate includes coherent sizing, open rift visibility, piece identity,
frame cost and cold/offline asset loading. Native output needs its own actual
window and input test. Owner visual acceptance remains separate.
