# Draft graphics checker migration

`actual_compiler.mjs` is a staged versioned successor candidate for the v2
tool's compiler API boundary. The reviewed v2 tool and its
`review-third/input-hashes.json` provenance remain unchanged. This directory
is outside the frozen graphics library tree and is not a new library Law,
freeze, release or replacement for the v2 verifier.

The only intended compiler-authority change is replacing the removed public
`Comp.book_owned(book, Comp.SYNTH)` call with an empty selected
`Comp.js_lib(book, [], [], { internal: true })` before the existing TODO,
promise-list and selected export behavior. The new tool binds the clean
canonical `TOOLCHAIN.json` pin; it cannot be used to relabel the isolated
2.0.28+006 compiler as the pinned release. It also tightens operations relative
to v2: the `BEND_COMPILER` override is not accepted, network `fetch` is denied,
and outputs use exclusive creation (`wx`) rather than replacing existing files.

`node bend2/toolchain-patches/graphics-v3/test-actual-compiler.mjs` compares both
tools on a pinned local fixture and imported helper. Under clean Bend 2.0.27,
the checked closure and promise list matched, and selected C and JS outputs
were byte-identical. C was
73,879 bytes, SHA-256
`53f0c0db022244c6310f137e468022daff5b57a26b68f142a8699fe91cf48d82`.
JS was 2,819 bytes, SHA-256
`513b6f64176e983a3ec1c579a2aad5dd0c6f7449deeb5a4f1ce455af7e0077ef`.
The historical tool SHA-256 was
`ec53f6bada060e7140b840b9f0dec8e20bbfb5216504c47d0429ff9de5314f04`.
The staged successor SHA-256 is
`13b0d1c03542cf7eb57f79a4adf796cf7aeb0953a9020d8174260403fba5cb32`.
Generated comparison outputs are ignored under unique
`.artifacts/bend2/graphics-v3-compiler-*/` directories.

An initial draft placed these files under `lib/graphics/v3`, which made the
v1 library inventory fail because its verifier excludes only the v2
namespace. Before any commit, the draft was moved into this staging area;
`node bend2/tools/verify-library.mjs --check` then passed its frozen source
check and all four existing library checks. No verifier, v1/v2 library file,
historical hash manifest or immutable evidence was edited to accommodate it.

This small parity test is not a graphics proof, full library regression,
candidate-pin acceptance, native GUI execution, GPU result or new v3
manifest. Integrating this tool requires a reviewed versioned library gate
that preserves the v2 package and reruns its applicable proofs, finite tests
and real browser/native checks under the exact accepted pin.
