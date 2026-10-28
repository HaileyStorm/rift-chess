# Experimental browser publication — 2026-10-28

## Current Settings reopening follow-up

The same isolated URL now serves version `dbab7a213fbef5794afa`, deployment
commit `cb821e599ea0c51109a446c708b391426ab0865f`. It adds the
[Settings reopening improvement](MENU_REOPEN_20261028.md) from source commit
`a2606b9d2ee71538c1c1a96c67a3bfbf24250b72`, retaining the Menu emission below.
The public manifest SHA256 is
`930832694bddf822781b99581677556710397645d3ddb5157a0d77bb042b7c17`.
The successful push was independently verified through the remote ref. Actual
HTTPS readback matched the new manifest and four changed payloads; unchanged
payload verification, previous hashed files and the historical root remain intact.

One hosted Chrome 156 journey verified the exact current service-worker cache,
Settings toggles, a real background-cache hit after closing and reopening,
e2–e4, and background invalidation when opening Settings on the changed board.
Offline reload retained the exact saved record and displayed position. No
page/console errors or failed requests occurred. The inspected offline PNG still
matches `a92204e8adf1e881d3bf2fde680249242206d6768295a1563a362abb26e3b885`.
Original Chrome 40952 and parent exited 0; the owning Job settled and closed
normally without signals. This validates delivery and browser behavior, without
extending the scoped timing evidence to native, device, GPU or stable performance.
Publication required no new Bend emission or proof run.

Private originals are retained under `public-preview-20261028-r3/`; hashes are
recorded in the current private checkpoint. The dated prior publications below
retain their original evidence and limits.

## Prior menu-panel publication

The same isolated URL now serves version `e53a618a096cd55e091c`, deployment
commit `607835aab58636964d6e3c7c507c5437a76d5b32`. It includes the scoped
[menu-panel reuse improvement](../stationary-motion-20261006/MENU_PANEL_20261028.md)
from source commit `838ece28d2d10d879a638ad9634dbb75e3f0032a`. Its public manifest
SHA256 is `f773225a8e4024e63b42064a08309ca6ba178d49658a1d8bcb0d57ae6adaa88c`.
The fresh Menu emission replaces only that module; Controller, Scene, helper,
bot and artwork retain their exact accepted browser bindings. Private producer
paths are excluded from the public derivative. Previous hashed files remain
available for returning clients; the historical root payload is unchanged.

Actual HTTPS readback matched the new manifest and all four changed payloads;
unchanged payloads reuse the original verification below. One hosted Chrome 156
journey verified the exact current service-worker cache and its cached manifest,
opened Settings, observed Move Hints on and off, closed Settings, played e2–e4,
and reloaded offline with the exact same saved record and displayed position.
There were no page/console errors or failed requests. The inspected offline PNG
still matches `a92204e8adf1e881d3bf2fde680249242206d6768295a1563a362abb26e3b885`.
Original Chrome and parent exits were 0; the Job settled and closed normally.

Private originals are retained under `public-preview-20261028-r2/`:

| Record | SHA256 |
| --- | --- |
| Hosted journey | `60f52d35ffdb13b63c82e26a5d4a7f91b635b79ca2698041980d2acd79bd9b15` |
| Original-handle settlement | `ca6e29caa877a20818e27bd2402c0388839d8318d1e8f8ec9cda8e8ff1933391` |
| Changed hosted payload readback | `8229ef2b90fa6bc51f5a9bab34752c747242fa96a55bd0a8f8b411ee722fa641` |

This verifies the updated hosted browser/offline path, with the same shared
saved-game keys and experimental status. It does not extend native, GPU, stable
performance or compiler-adoption evidence. No new compiler or proof run occurred
during publication. The initial publication records below retain their scope.

## Initial publication

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
