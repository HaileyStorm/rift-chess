# Rift Chess implementation decisions

The user approved TypeScript, Three.js, Vite, accessible HTML controls, a worker-based local search opponent, and a sandboxed Electron Windows x64 ZIP. Original code is MIT. The public repository is HaileyStorm/rift-chess. The initial Forge packaging choice was replaced with Electron's documented app.asar packaging path after the development dependency audit exposed unnecessary native-rebuild/archive dependencies. This changes build tooling, not the approved player workflow.

The approval adds a day-one public click-and-play browser release with free hosting. GitHub Pages serves the static browser bundle; neither the game nor its bot requires a server. Browser assets are bundled, with local saves and an offline cache. The Electron package remains an independent offline player distribution. The supplied handoff's earlier no-public-hosting decision is superseded by this explicit user request; rules 1.0 and its full launch quality gates remain unchanged.

Future online play is not a launch feature. The pure fixed-coordinate engine and versioned checked command boundary permit WebRTC DataChannels or a small authoritative relay without renderer changes. Commands bind rules/encoding, game identity, revision and actor; duplicated/stale commands are rejected. A board hash alone cannot identify the full match. Future networking needs signaling, identity/consent, reconnect synchronization and possibly TURN; universally serverless or permanently free relay availability is not claimed.

The local API's actor is caller-asserted, not authenticated. A future network adapter must derive it from seat ownership, deduplicate session-creation requests, arbitrate undo consent, and bind a separately versioned full-record digest where transport integrity is needed. The v1 position hash deliberately excludes history, policy and counters; it is not a competition signature. These obligations belong in the transport layer and do not require changing fixed board coordinates or action IDs.

Original reference and research files retain their provenance. The supplied verification script rewrites goldens/receipts and must run in an isolated copy. Its results are reference consistency evidence, not independent rule proofs. New implementation findings and real rendered tests are recorded in PLAYTESTS.md and docs/evidence/.

## Initial evidence

- Windows 11 Pro x64, Intel Iris Xe, driver 32.0.101.7026. Node 24.12.0 and Python 3.14.2.
- All 45 original manifest hashes matched; fixtures contain 14 positions and 223 successors.
- Original Python suite: 67 passed in 69.52 seconds on this host.
- Initial in-app browser discovery/direct tab creation and native window inventory timed out. Subsequent isolated Playwright Chrome/D3D11 and packaged Electron interaction succeeded; installed browser binaries alone were not treated as proof.
- The first distribution is unsigned unless a separately authorized signing identity becomes available.

## Implementation acceptance

Full scope is defined by docs/01_RULES.md, docs/03_PRODUCT_DESIGN.md, docs/04_ENGINE_AND_DELIVERY.md and the user's original build request. Passing tests or producing screenshots alone does not complete it. Three recorded improvement passes, complete real-UI bot play, focused special-rule/ending scenarios, all environment/style/camera combinations, offline browser/package behavior, corruption rejection and measured frame pacing are required before a finished-release claim.
