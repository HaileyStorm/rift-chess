# Experimental browser publication — 2026-10-28

The retained held-orbit package is published at
<https://haileystorm.github.io/rift-chess-bend2/preview-20261028/> in deployment
commit `5032979ecfa641590044ed059efa4b39945468ea`. Public version
`76da587c69226d72a726` remains **draft and unadopted**. Accepted Bend 2.0.27,
the historical root preview, and the original TypeScript game remain unchanged.

The executable JS and artwork are the exact retained package described in
[HELD_ORBIT_20261027.md](HELD_ORBIT_20261027.md). Its original manifest remains
private and unchanged at SHA256
`4622ae575e996d687a82705c43deccd8374db0e76f10c6ab60664602bb3f05dd`.
The publication manifest distinguishes original base `a7eef47` from the later
worker source commit `8687c6f`; neither is relabeled as current-source execution.
Controller, Scene and Menu emissions were reused without another compiler run.

Publication changes are limited to a separate URL and offline-cache namespace,
sanitized public metadata and corrected candidate-runtime license attribution.
The public manifest SHA256 is
`a962b52a2f23e65dfed25b67f1b362a8b9985373a37520d11e3040acb4167c8c`.
All 23 manifest-listed public payloads were independently fetched and matched
their staged hashes. The original root manifest still matches its prior hash.

The separate directory is necessary for returning-client compatibility: an old
worker lazily imports the stable bot loader and uses the old `Pos` constructor;
the candidate bot uses `core/Model.Pos` and a different Nat representation.
Keeping old hashed workers alone would not make overwriting that loader safe.
The candidate service worker changes both its cache name and deletion prefix,
preserving the historical root cache. Both previews still share same-origin
saved-match and preference keys; the deployment README documents this behavior.

## Actual acceptance

One real e2–e4 and offline saved-position continuation ran locally before push,
then against the actual hosted candidate in Windows Chrome 156.0.8078.48,
headless, 1280×800, scale 1, each with fresh browser storage. Both passed:
White changed to Black to move, and offline reload retained the exact saved
record and displayed position. Neither run reported a page/console error or
failed request. The hosted offline image was identical to the inspected local
offline image, SHA256
`a92204e8adf1e881d3bf2fde680249242206d6768295a1563a362abb26e3b885`.

Original Chrome and parent handles returned exit 0. Both owning Windows Jobs
settled to their supervisors before normal closure; no signal or forced cleanup
occurred. These results establish this browser publication and offline journey,
not physical audio, device/GPU performance, native gameplay or compiler adoption.
No unit/integration matrix, compiler emission or proof replay was added.

## Retained private evidence

Records are under the owning task's `public-preview-20261028-r1/` directory;
private records and images were not published.

| Record | SHA256 |
| --- | --- |
| Local journey | `6160c4a41a19cd7431eedbb371d2c40a2b5d902bde3a61ec6796ae22cf84fbc7` |
| Local original-handle settlement | `8939bbc35309f73e4a26fb9d62f539f49e3fdfa2a425d479f20352037c02f425` |
| Hosted journey | `0d0a6524f6440d9353240259a7017a157b756d74a378078bb2f8ac405c4ba30b` |
| Hosted original-handle settlement | `89327815668851a171aca6cf4bb5afdc5dc46d6c359238ecfac9324e3ebed25b` |
| Hosted payload readback | `dd177020eb7331f120944c1caf469bc39f0fcccc0e993fc65c38f289c54ba629` |

The first deployment push lost its connection before updating the remote.
Independent remote readback confirmed the old tip; the same payload then pushed
successfully using per-command HTTP/1.1. Final remote main was independently
verified at the deployment commit above. No ambiguous push was blindly replayed.
