# Rift Chess 1.2.1

This release makes piece selection clear, makes captures visible and audible, and
adapts graphics detail automatically. Direct piece clicks select the piece even
when Tile intent was active. The Observatory and planted Stone Court are visible
from normal play cameras; Gallery retains its established composition.

- Piece outlines and square halos, clear selected-piece names, wrapped instructions.
- Attack/contact/victim fall animations and six original procedural sound cues.
- Automatic detail by default, with persistent manual overrides and legacy-save migration.
- Revised menus, phone layout, observatory domes/telescopes, planted courts and fountains.
- Rules, saved games and offline/local play remain compatible.

Application changes are in source revision `0571a06` and its preceding experience
commit. The versioned wrapper is 1.2.1; all published runtime assets are bound by
the release verification manifest. The Windows ZIP is unsigned and requires full
folder extraction.

Publication status: published and verified on September 22, 2026.
[Browser](https://haileystorm.github.io/rift-chess/) and
[Windows release](https://github.com/HaileyStorm/rift-chess/releases/tag/v1.2.1).
The public build is `3b3f310653b2b9e98962`; Pages commit is
`f4de8d5e7f75a26cac0aa6e8d332786a9360827e`. The source tag is `v1.2.1`.
All 62 tests pass with two test workers, the extracted ZIP passed native offline
play/restart/export/worker checks, and the preserved public profile passed upgrade,
all 25 static hashes, all 23 cached assets, save preservation and cold-offline play.
[Verification receipt](evidence/release-1.2.1/verification.json) records exact hashes,
public asset digests and successful download routes. The 1.2.0 cache defect and
failed receipts are preserved below; no published tag was moved.

## Preserved publication candidate

The 1.2.0 tag and draft ZIP are preserved as a pre-publication candidate. The live
upgrade gate found a real cache-installation bug: a new CacheStorage version could
contain old HTML from the browser HTTP cache. The 1.2.1 worker revalidates every
asset during install, including unhashed HTML and reflection metadata. A new cache
version repairs the already-affected profile without clearing the user's save.
The original failed receipts remain under `.artifacts/current-upgrade/`.
