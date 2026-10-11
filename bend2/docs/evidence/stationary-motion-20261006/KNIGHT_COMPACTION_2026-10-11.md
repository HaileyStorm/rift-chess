# Compact knight texture trees

The actual production Worker profile showed costly RGBA sampling/tree walks and
substantial garbage collection during a real orbit. Knight rasterization kept
four identical child pixels as a quad, including uniform opaque alpha regions.
`KnightMesh.bend` now coalesces equal Pix children independently in each ivory,
navy and alpha channel as the raster tree is joined. Unequal or nonuniform
children retain the original quad. Geometry, lighting, quarter-sample coverage,
material colors, channel extent and four balanced raster branches are unchanged.
No frozen Law or normative source was changed; this DRAFT application file is
absent from the current freeze manifests.

This operation preserves image values by construction: a uniform quad and its
parent Pix denote the same constant color over the same region. That reasoning
is not a new kernel/formal proof receipt. The browser observation below confirms
actual rendering and selection at one current view transition.

One real portrait journey was profiled before the edit against the exact
`orbit-bevel-host-r1` package; one was profiled after against the exact rebuilt
`knight-compact-host-r1` package. Both used the same 1ms CPU sampler attached to
their owned production Worker, with no renderer/state injection, synthetic
component calls, unit/integration suites, case matrix or timing gate. Each
launched the application, selected g1 by its visible neck edge, held a genuine
right-button drag to yaw314/pitch70/zoom115 and released to the settled frame.
Both passed with no page errors or failed requests. Original Node, Chrome,
streams, server and nonkill Job closure were observed without forced cleanup.

Candidate observation: 2026-10-11T04:30:56.929Z. All four captured PNGs are byte-identical
before/after: portrait startup, selected knight, held orbit and settled orbit.
Unchanged bot/offline evidence was reused. The source/type whole books checked
with zero holes; fresh Scene emission is
`0f69899631171da31b0b527d0b305c1c6493be04c48521407f2a233736f9286d`.
Controller bytes remained unchanged. The actual 24-file package is 5,059,998
bytes and its fresh default ground retained the previous BPG1 pixel bytes.

Finite instrumented observations:

| Work | Before (ms) | After (ms) |
| --- | ---: | ---: |
| Held tree | 373.6 | 243.2 |
| Knight pose | 102.0 | 61.9 |
| Alpha support | 10.2 | 7.0 |
| Preview paint | 254.0 | 169.0 |
| Sampled garbage collection | 128.9 | 60.8 |

These rows are not independent durations to sum. They are two variable-load,
instrumented samples. Sampling affects runtime; GC cannot be assigned to one
source path. They support the small compaction change but do not establish a
stable speedup, latency tails, physical-device acceptance or responsiveness
completion. Orbit rendering remains slower than the full intended result.

Private immutable evidence, relative to `.artifacts/bend2/2035-preview/`:

- `stationary-motion-20261006/knight-compact-comparison-r1.json`:
  `b9a03ebab8a4eee447a13cbb7f7f2b79896005b1904f7c17fb17a3077410f37c`.
- Baseline `orbit-profile-journey-r1/result.json`:
  `6d420502ef00747fe7d4d6faa47bc26ffcdfc016153378a1c4f2a32323dd28a9`;
  original closure `846224b54178569f7bf1b2f27b449e9facf72daa7cc3a401c2b8e16a2866add7`.
- Candidate `knight-compact-journey-r1/result.json`:
  `6bb3f2384df723a4559305d18cd48948cf0db61375b226bbffc3daec4a031c9a`;
  original closure `86a40a48903f55e056e6b062185ec8d60845d91beb6f7d185ceff5a870d6ca06`.
- Exact package `knight-compact-host-r1/build.json`:
  `c6a7faf685e425c5ce2b4365daff8080bf90a25dd5ebb8f90a5b5021ef7982a3`.

The pristine accepted toolchain pin and all nine remaining full Goal groups
remain intact. No native/Linux/GPU dispatch or compiler adoption is established.
