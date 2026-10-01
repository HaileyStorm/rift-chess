# Bend 2.0.32 cross-library constructor tags

The [Linux first-frame diagnostic](https://github.com/HaileyStorm/Coordination/issues/1#issuecomment-5922751823)
reached the Worker and then faulted on a value tagged `../Scene.Frame` where
its consumer expected `graphics/Scene.Frame`. This is the same class as
upstream [Bend issue #1105](https://github.com/bendlang/bend/issues/1105):
constructor tags in separate emitted JS libraries depend on the root file's
namespace. The 16-file static package and browser launch were byte-bound;
neither was a rendered pass.

`test.mjs` is a small source-bound reproduction on the exact 2.0.32 derived
compiler. Two roots at different directory depths import one shared
Nat-bearing `Frame`. Loading both as namespace `""` emits incompatible
`../shared/Frame.Frame` versus `../../shared/Frame.Frame` tags and the
consumer rejects the producer's value. `preload-root.mjs` instead loads each
entry's direct dependencies under namespaces relative to one common Bend
project root, then loads the selected entry itself with namespace `""`.
The two books now agree on `shared/Frame.Frame`, their public keys remain
bare (`make`, `plus_one`), and the cross-library call returns `42n`.
No broad `book_load` or compiler change is implied.

```powershell
$env:BEND_NO_TELEMETRY = '1'
node --max-old-space-size=512 bend2/toolchain-patches/2032/tag-identity/test.mjs
```

This test passed on Windows with CRLF derived compiler bytes. The separate
selected-cache emitter now invokes this helper and binds its bytes in a new
cache manifest; that change has **not** emitted the four real caches. It does
not serve a page, test other transported types, prove native semantics, or
authorize a toolchain-pin amendment. Exact same-source four-cache validation
and real browser interaction are required before closing the first-frame fault.
