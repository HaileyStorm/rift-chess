# Shared knight material rendering — October 11, 2026

Orbit preview now computes the ivory and navy knight textures together. The two
materials share face projection, centroid sorting, clipping, quarter-sample
ownership, marks and alpha coverage. Each retains its original palette, RGB
accumulation and rounding. Textures remain 64px, and the balanced four-way
sampling tree, mesh, presentation camera and board placement are unchanged.
BoardScene consumes the paired result through a parameter-matching helper.
The obsolete single-material renderer has no active caller and was removed.

The first emission stopped during source loading and exited 1. Its original
process handle, streams and nonkill Job closed with known state. The source was
corrected for Bend's definition-before-use and parameter-only match rules; the
original failed sample remains immutable. A fresh corrected emission passed
whole-book checking with zero holes for Scene and Controller. Controller output
is byte-identical to the previous emission. Unchanged Menu output was reused.
No upstream compiler, frozen Laws, proof dependencies or toolchain pin changed.

One actual package build passed using the production helper, retained host,
assets, bot library and BPG1/packed512 transport. The package contains 24 files,
4,989,954 bytes; version `b37784e2a82c4402bf8d`. Its build manifest SHA256 is
`4700da0a7cb780389a8ddebafe53968f80839bc2ca19434b58b50b1ac2aa54d0`.
The builder performed no compiler execution or ground render.

One real application journey then passed: startup, held right-button orbit,
release, primary selection at a visually reviewed g1 knight neck edge, and
settled helper replacement. Input events were trusted, the primary press used
the displayed preview mask, g1 was selected, and the settled replacement retained
the same camera with a new mask. Initial, held-orbit and settled-selected PNGs
are byte-identical to the previous prepared-orbit journey captures. This is
finite displayed evidence for that journey, not proof of all camera/material
states. No unit/integration test, hidden matrix or timing gate was added.

Held-orbit timings in the new run were 27.5ms pose, 3.0ms support, 53.0ms paint
and 86.0ms total tree. The earlier independent run observed 34.1ms pose, 3.2ms
support, 50.2ms paint and 89.1ms tree. These are two finite observations with no
paired timing control. They do not establish a stable speedup, pacing, tail
latency, physical-device performance or memory acceptance. Preview painting
remains the larger observed cost. Release and selection reused the cached
preview with zero preview-paint work, but their total tree timings were 21.6ms
and 28.8ms in this run; no claim of universal latency improvement is made.

Both compiler emissions, the package build and the browser journey have original
successful exits, closed original handles/streams and closed nonkill Jobs with
no unknown state or changed inputs. The browser's single owned Chrome child
exited and closed successfully with no forced cleanup; the loopback server closed.

Private receipts remain under
`.artifacts/bend2/2035-preview/stationary-motion-20261006/`:

- `paired-knight-emission-supervisor-r2/terminal.json`: original failed load,
  SHA256 `8f5ff5d4bcdea0ba273590463ad4985ae6bf28134d3a932a22857fc377468ba0`.
- `paired-knight-emission-supervisor-r2-corrected/terminal.json`: fresh successful
  Scene/Controller closure, SHA256
  `39352b20b6baa5f739d186daf8e2c0742779bece823e9ff6020ec2c48881447c`.
- `paired-knight-build-supervisor-r1/terminal.json`: package build closure,
  SHA256 `d2f7beda0a1bf9906100c196774436a14ce38b92848f63934fe6bf94b543da74`.
- `paired-knight-journey-r1/result.json`: actual journey observations and captures,
  SHA256 `45a8e5634c3d917b69a60117805f72fc2ab88e094d1d3321e86dfd344a7a65aa`.
- `paired-knight-supervisor-r1/terminal.json`: actual browser/server closure,
  SHA256 `542d41b32b0dab84f34fa618a4a4beb158cfb91bd421decc35837a0db10cbfe5`.

FullSafe/BendTT/kernel, native CPU/GUI/PCM/restart, original GPU, compiler adoption,
Linux admission, wider graphics quality and stable responsiveness requirements
remain open under their original evidence limits. This package is a local draft.

Shared-memory disposition: reasoned skip. This is transient implementation and
finite execution evidence under the existing durable policy, with no new user
decision or correction. The imported historical source and its canonical memory
entry remain unchanged; no memory change was dispatched for this optimization.
