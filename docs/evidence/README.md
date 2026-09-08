# Release evidence

## v1.1.0 overhaul

The [current acceptance record](overhaul/acceptance.json) links curated actual
visual, complete-game, native, performance, touch-emulation and public-distribution
evidence. Complete replay records and raw receipt hashes are retained. Private
browser/native profile paths are omitted. The [current screenshot](overhaul/gallery.png)
is an unedited application capture. See the [overhaul report](../OVERHAUL_RELEASE.md)
for scope, owner-accepted performance limits and retained historical evidence.
The [published release-asset receipt](overhaul/release-assets.json) verifies the
source tag, GitHub-computed digests and public download routes.

## v1.0.0 historical evidence

These receipts are copied from actual local runs, with the private native profile path removed. Screenshots are actual rendered application captures. They are automated interaction and visual-inspection evidence, not human feedback or a strength study.

- `reference.json`: independently rerun original suite verifier; immutable fixture-byte checks.
- `quality-gates.json`: final type-check/build, 35 TypeScript tests, API example and dependency audit.
- `mechanics.json`, `lifecycle.json`: real UI special-rule and ending checks.
- `visual-matrix.json`: 26 captures and 20 style/restart cycles; selected captures are published here.
- `complete-games.json`: both full replay records, including one bot checkmate and one planned resignation.
- `offline-browser.json`: full browser process restart with network disabled before navigation, followed by local play.
- `stale-worker.json`: delayed real-worker cancellation on undo/new game and restarted search after draw decline.
- `performance.json`: final single-test-window measurements; normal desktop/background packaging activity was not suppressed.
- `native-windows.json`: final packaged executable, isolated profile, session offline emulation, save/restart/export/corrupt-import tests.
- `zip-verification.json`: every final ZIP member's SHA-256 matches the tested packaged directory. The prior candidate was separately expanded with Windows `Expand-Archive`.
- `build-sha256.json`: exact static assets used by the tested final package and published browser build.

Earlier failed harness attempts are described in [the playtest record](../PLAYTESTS.md). They were not relabeled as passes. Original private test-profile files and browser caches are excluded from publication.
