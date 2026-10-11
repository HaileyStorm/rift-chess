# Sprite helper test support retirement — October 11, 2026

The production helper now binds directly to its actual Bend scene, asset loader,
clock, prepared ground and plate digest. Its installer is private. Eight optional
runtime injections, used only by the obsolete synthetic Node runner, were removed.
The browser tag adapter no longer rewrites the deleted injected-loader type; it
still applies the distinct production sprite response tag. Generation checks,
queueing, prepared-ground fallback, transfers and worker bootstrap are unchanged.

The former `bend2/tests/sprite-helper-node.mjs` contained three isolated integration
tests. It substituted an empty scene import, injected synthetic scene/assets/time
and hashes, and requested protocol 1 while the current application uses protocol 2.
No routine package or script caller was found. It is retired rather than repaired
or replaced with a hidden scenario matrix.

Its exact original 23,422 bytes were copied and independently read back before
removing the former test path. They remain in `sprite-helper-node.retired.mjs.txt`,
SHA256 `db3f7861b45e20a9c67ce3b951885445586cdb7fac37cdaa45e04687b7db17b1`.
This text file is historical provenance, outside the routine run list. The frozen
`bend2/core/v3/2035/bendtt-gate/lineage-review-20261006.json` and its original Git
blob references remain unchanged. Frozen Laws and formal proof obligations were
not edited.

Validation was limited to the changed production boundary: the helper/Worker/pose
TypeScript check passed, followed by one actual browser package build using the
unchanged retained Scene, Controller and Menu emissions. The package build passed,
produced 24 files totaling 4,988,719 bytes, and performed no compiler execution or
ground render. Its original Bun process exited successfully; original handles,
streams and the nonkill Job closed with no unknown state or changed input.

Private receipts are under
`.artifacts/bend2/2035-preview/stationary-motion-20261006/`:

- `helper-retirement-typescript-r1.json`: narrow static TypeScript result.
- `helper-runtime-host-r1/build.json`: package version `30a9969bc5a37eb3f51d`,
  SHA256 `2345e87d4400e0e2c7e988a0d65e0c784b01fcbd29c20057e89f5583eb8af395`.
- `helper-runtime-build-supervisor-r1/terminal.json`: original build closure,
  SHA256 `419bca3ccf02bbbab1f098a236ce11198f20cccf1c934f671be80e5ac041a892`.

The prior real startup/orbit/release/pick/settled-helper journey is documented in
`PREPARED_ORBIT_2026-10-10.md`. It is retained compatible evidence for the actual
production defaults, not a new execution of this cleanup or proof of every
retired synthetic delay predicate. No browser scenario campaign was repeated.
Kernel, native/device, compiler adoption and broader responsiveness acceptance
remain open under their existing evidence requirements.

Shared-memory disposition: reasoned skip. This is transient implementation and
retirement evidence implementing the already captured zero-component-test policy;
it adds no new durable user decision or correction. Historical receipts and
canonical memory entries remain unchanged.
