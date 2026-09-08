# September 8 overhaul release report

This report records the accepted v1.1.0 application and its evidence limits.
The public browser deployment, actual v1 upgrade and fresh cold-offline checks
have passed. GitHub release-asset verification is the remaining publication step.

## Candidate identity

- Application revision: `74b4870d5e854ab167334fa743fc94b6edae0402`
- Build identity: `3629cf6cc06a2acf3d93`
- Current harness revision: `067ce45260e2c00823cfd38e4b6de3f09e6329a2`
- ZIP SHA-256: `50d8ae067fbbb120e16b20d66f8993f74574b7505ed5fec380674f2ee61912cb`
- ZIP size: 168,860,090 bytes
- ZIP inventory: 74 runtime files; application archive: 31 allowlisted files;
  offline cache: 23 assets

The package inventory and build checks are recorded in the
[build receipt](evidence/overhaul/build-sha256.json). The packaged Windows
candidate has seven native checks and 15 native PNGs, represented in the
[native Windows receipt](evidence/overhaul/native-windows.json).

## Delivered application surface

The overhaul rebuilds three worlds, two sculpture families, and
three material treatments. A fresh opening is assembled from a seeded
48-slide shuffle over 8.5 seconds. Pieces remain fixed relative to their tiles.

Legal Shift direction is shown on the source edge rather than as a whole-tile
outline. Source selection, destination hover, source cancellation, legal source
reselection, and destination commit have matching mouse and keyboard paths.
There is no separate Confirm Shift button. A promotion choice remains visible
before its atomic move or Shift commit.

The visual record includes 66 current PNGs and two clips independently reviewed.
The [acceptance record](evidence/overhaul/acceptance.json) and
[gallery](evidence/overhaul/gallery.png) identify the current review set. The
pre-overhaul [hero image](evidence/hero.png) is retained as historical comparison.
The prior 216 overhauled composition rows are retained under unchanged
source/state inference, not presented as new captures. Earlier 96 asset views
and 16 baseline motion cases remain evidence where their implementation is
unchanged; updated opening and Shift footage covers the affected experiences.

## Functional evidence

Current verification comprises 54 unit checks and 58 real UI checks
(19 + 13 + 5 + 9 + 7 + 5), plus 18 complete mode rows. The complete-game record
contains six natural endings: 10, 17, 210, and 33-action mates, plus 76 and
83-action threefold draws. Across 429 actions, 428 observed prefix files and
six finals were independently API-verified. See the
[complete-games receipt](evidence/overhaul/complete-games.json).

Ten additional touch-emulation checks pass across phone and tablet viewports:
ordinary and Shift taps, source cancellation and two-finger camera movement.
They are [emulation evidence](evidence/overhaul/touch-emulation.json), not a
physical-device study.

The release candidate also passed a local-origin rehearsal using exact v1 and
current bytes, including a full cold offline path. Four asynchronous
`waitForFunction` harness sites were fixed
before that result. A Chrome 152 / Playwright resumed-download crash remains a
separate tooling limitation: persisted envelopes and live UI state were verified
instead, and native export works.

## Performance evidence and accepted limits

All 22 native performance checks are measured focused-visible runs. Typical
medians are about 16.7 ms. Notable tails include Balanced bot max 99.9 ms,
raw 95.4 ms, and a 102 ms long task; Daylight Balanced p95 is 33.5/33.4 ms;
Low Nocturne orbit raw max is 92.1 ms; Gallery Low loaded-Shift max is 49.9 ms.

Strict Balanced has 0/11 passes and Low has 4/11 under the strict threshold,
because the checks retain both real spikes and sub-millisecond boundary
granularity. First CPU feedback spans 3.8–27.2 ms; it is not display latency.
The owner accepted this performance for release without reclassifying those
targets as passes. [Follow-up #1](https://github.com/HaileyStorm/rift-chess/issues/1)
remains open. These results do not support a
universal FPS, display-latency, strong-play, or human-study claim. The measured
details are in the [performance receipt](evidence/overhaul/performance.json).

## Release boundary

The [public browser build](https://haileystorm.github.io/rift-chess/) matches all
26 expected files: 25 runtime files and publication metadata. Its original v1
profile survives the real upgrade and cold offline play; a fresh public profile
also passes offline restart. See [public hashes](evidence/overhaul/public-assets.json),
[upgrade](evidence/overhaul/public-upgrade.json), and
[offline restart](evidence/overhaul/public-offline.json). Pages commit is
`e6e8dc66e13e34242afdbacbd758b256b4be5e31`.

The tested Windows package is ready for GitHub release publication under the
accepted limits above. Its remote digest verification will be recorded after
upload, without changing the package bytes or the open performance follow-up.
