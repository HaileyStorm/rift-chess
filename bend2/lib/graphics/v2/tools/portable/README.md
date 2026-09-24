# Portable source-subset execution harness — NOT Bend

`lower.py` is review tooling only. It lowers a deliberately small pure syntax
subset from the supplied source into serial JS with explicit U32/F32/Nat
shims. It is neither the pinned compiler nor a replacement runtime. Production
modules never import this directory. Nothing here changes the compiler pin.

The purpose is to run the existing independent pixel assertions, additional
integer/codec/glyph tests, mutation controls and diagnostic renders when the
real toolchain is unavailable. Reachable unsupported syntax is rejected or
traps; there is no fallback that silently invents a result. Constructors,
pattern matches, calls, typed arithmetic scopes and immutable tree values in
the exercised subset are handled. Parallel lets are intentionally serial.
Pattern scrutinees are captured before fields bind/shadow names. Source bytes,
harness/runtime bytes and generated JS bytes are SHA-256 recorded.

**It does not validate types, ownership, termination, quantity erasure, proof
witnesses, dependent matching, native fork arity, GPU lowering, actual exported
ABI, Base effects, or compiler optimization.** Nat here is host BigInt and
does not enforce the pinned runtime's 48-bit ceiling. General String matching,
arrays, templates, effects, unsafe/GPU calls and proofs are not supported.
The generated native-font `glyph` lookup is exercised; its String line helpers
are not. The masks/glyphs are already small bounded data, not a font renderer.

The harness itself can be wrong. A probe of unchanged RGA1 exposed a JS
shadowing error (`Rows{rows}`); that was fixed in the harness, not in RGA1, and
all recorded final runs were regenerated. Shared bugs remain possible despite
independent references and negative controls. Emission success means only that
this subset was generated, not that the Bend checker will accept the source.

Timing samples and source-function counters measure THIS execution model on
THIS container. They cannot be compared with historical Bend-emitted timings,
used as native/GPU speed claims, or converted into device FPS. The source
work-elimination rationale is reviewable; performance must be confirmed after
real emission. Shader prototypes which look faster here can be slower under
reference counting, boxed values, another JIT or a native task scheduler.

Run the same test source through the pinned project wrapper before promotion.
`../run_review.py --pinned` fails closed on missing tools and never falls back
to this harness; it also surfaces warning/unsafe/foreign text for review rather
than accepting an exit-zero warning as a pure proof. No law is frozen by it.
