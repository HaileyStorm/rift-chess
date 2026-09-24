Review disposition: accepted
v1 SHA256: 1319d357af2ef8816206403712263be97fe1e4b1d7710e3ab57f212a16171b87
v2 SHA256: b7d1f7da9b9bb3a2154d6cde5812ee10b2c7ef3c602219522743d556be6bff33
mutations SHA256: 26b26156e235ff71c02153052d85ce430f3c0a688792af34a803b16ccebe435e
library SHA256: 38725a749d7075138696af290882090a7b2f79c5c36bc7a0cd9ea5840c3e630e
build SHA256: a2591f1066db7f6254a45f3ef87b2e7f2a9a8049d168b0d23e9c0ccdff23a861

The tracked upstream checkout is clean at d37909174ebd664338ae3194799a9e0899dedd51. The reviewed diff changes the checker, Base declaration order, CLI publishing and bundled-executable packaging; comp.ts and the existing effect files remain byte-identical. Safe live forward references still fail, while unsafe forward references are outside the proof guarantee. The project's source-based Bun wrapper does not inherit the bundled executable's protection against a project bunfig.toml or .env. Its CLI checks use the pinned compiler working directory; its --run path uses the trusted project root.

The only drift against the frozen semantic manifests is bend2/TOOLCHAIN.json, and the spec lists exactly that substitutable file. Its new SHA256 is 17419db1617fece38c72dba9136463a313db43bf2c61f657334d9fdce0ae51a6. V1 readiness checks cover the frozen v1 files; v2 readiness and all six positive/negative mutation controls cover the 87 frozen v2 inputs with current hashes. The v1 graphics library's separate verifier now excludes the new sibling v2 namespace from its immutable source sweep, without changing its required files, copy provenance, frozen hashes or four checks. The v2 graphics library requires its own reviewed laws, tests and verification before a claim of v2 acceptance.

The library check reports two Bend term checks and 121 font plus 6,588 finite raster checks. The draft browser build uses the new pin and all seven recorded assets still match their SHA256 values; its sourceDirty flag is true. These receipts establish a tooling-pin amendment, not a clean release, a hosted browser acceptance, native execution, GPU acceleration, or visual quality. The inherited frozen loader comment naming 2.0.26 describes an effect-path behavior that remains true at 2.0.27; update that comment only through a separate reviewed tooling amendment if needed.
