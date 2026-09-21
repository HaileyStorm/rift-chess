# Bend2 options for Rift Chess

Research snapshot: September 21, 2026. This is an architecture exploration, not an
implemented port or performance result. The current compiler identifies itself as
2.0.24. Bend2 is a new language/runtime; do not reuse Bend1/HVM assumptions.

## Free serving is compatible with the browser route

The compiler has an explicit HTML-page bundling path. A page can import pure Bend
definitions through the loader, which emits a browser-targeted bundle using Bun at
build time. The inference is straightforward: the resulting static HTML/JS/assets
can retain the existing static-host/offline deployment shape. The visitor does not
need a Bend server just because the source language is Bend.

GitHub Pages remains a concrete free option for a public repository: it serves static HTML/CSS/JS under GitHub Free. The language used to produce those files does not change that hosting model. [GitHub Pages documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages).

Use the browser bundle/module path, not an arbitrary CLI JS executable: the latter
has a different runtime and may depend on Node/Bun IO. Boundary representation also
matters: Nat becomes BigInt, so network/save encoding needs an explicit canonical
codec rather than blindly JSON-stringifying runtime objects.

Sources: [compiler/loader](https://github.com/bendlang/bend/blob/main/bend2/main.ts),
[JS emitter](https://github.com/bendlang/bend/blob/main/bend2/comp.ts).

The JS target is sequential. It does not bring native CUDA/Metal execution into a
web page. A Web Worker can isolate a compiled core from rendering; multiple workers
would need explicit orchestration rather than inheriting automatic GPU parallelism.
Native Windows is not currently supported by upstream. A browser-target bundle in
the current desktop shell is a different option from a native Bend Windows port.
Sources: [limitations](https://github.com/bendlang/bend/blob/main/README.md#limitations),
[guide](https://github.com/bendlang/bend/blob/main/guide/GUIDE.md).

## Options worth exploring

| Option | What Bend owns | Why it is interesting | Principal trade-off |
| --- | --- | --- | --- |
| Law-checked rules core | Legal actions, state transitions, replay, ending invariants | Small auditable foundation with the existing renderer/host API | Formal specifications and compiler trust still need review |
| Bend-authored game, thin browser host | Rules, presentation state, animation timelines, procedural descriptions | Most game behavior in Bend; JS only exposes browser capabilities | Larger migration; output/FFI boundaries and allocation must be measured |
| Two execution tiers | Shared rules in JS for everyone, native analysis tool for willing users | Free instant play plus optional heavier perft/search/tablebase workloads | Cross-target parity; native support and packaging are separate work |
| Portable match capsule | Rules hash, initial board, signed actions, deterministic replay | Send a self-contained game for play, review or correspondence | Versioned canonical serialization, identity and log validation required |

These are design proposals, not built-in Bend features. Lack of a Three.js-sized
library need not veto the project: a narrow host adapter can expose rendering and
audio while Bend generates scene descriptions and timelines. A full raw-pixel
renderer is another creative route, but software rasterization costs must be
measured independently of language enthusiasm.

## A more ambitious Bend identity

A full Bend-authored game can still have a narrow browser shell. Bend could emit a
scene-command stream (geometry, transforms, materials, animation tracks), while a
small JS adapter owns WebGL/WebGPU, pointer events and Web Audio. That puts the
interesting game logic and procedural art in Bend without making every browser API
part of the port. Keep floating-point animation out of deterministic rules state.

Another possibility is a Bend workshop that runs heavier native procedural art or
analysis offline and exports compact meshes, textures or verified lookup tables
for the free browser edition. Native parallelism would help the authoring workload;
it would not magically accelerate browser JS. This is a proposed toolchain, not a
claim that the current compiler ships a WebGPU backend.

A portable rules cartridge could bind an exact rules specification/encoding to a
match invitation. Both peers run their own verifier for that rules version. A
reported build hash alone does not attest to an opponent's executable. Signed
correspondence packets could travel by copy/paste, file or QR when real-time
connectivity fails, using the same replay validator as a live match.

## P2P and cheating: separate the guarantees

For this public-information game, each peer can independently recompute every
move. An opponent patching their client does not force the honest client to accept
an illegal transition. Bind packets to a rules/build hash, match ID, turn number,
previous state hash and canonical move; verify the resulting state independently.
Signed, hash-linked acknowledgements make contradictory histories detectable and
prevent one participant forging the other's messages when keys are correctly bound.

That does not stop legal engine-assisted moves, a peer refusing to continue,
disputed clocks, or selective disconnects. Even a trusted server cannot prove a
human found a move without outside help. Bend proofs establish specified source
properties within the trusted checker/compiler/foreign-code boundary; they are not
remote attestation. Keep source laws and hostile-peer protocol checks complementary.

WebRTC does not require a trusted rules server, but connectivity still needs
signaling and often STUN; some networks need TURN relay bandwidth. Manual invitation
exchange can remove a matchmaking service at the cost of convenience. Relay-only
fallback needs a sustainable hosting plan; zero game-server trust is not the same
claim as universal zero infrastructure cost.
Sources: [WebRTC](https://www.w3.org/TR/webrtc/#peer-to-peer-connections),
[TURN](https://www.rfc-editor.org/rfc/rfc5766.html#section-1),
[Ed25519](https://www.rfc-editor.org/rfc/rfc8032.html#section-5.1.7).

Blockchain is optional for public result anchoring or adversarial settlement. A
hash on a chain only records a claim unless the verifier checks the rules or an
appropriate execution proof. Fees, latency, wallet UX and clock/disconnect policy
remain. Bend laws are not automatically a succinct on-chain execution proof.
For ordinary free chess, signed portable match logs are a better first experiment.

## Recommendation and cheap decision test

Explore a Bend rules core first without committing to a rewrite. Port one loaded
Shift transition and a few precise laws: the kings survive, the passenger count
and local tile position are preserved, holes update correctly, rejected actions
do not mutate state. Test against existing immutable fixtures, including promotion
and castling-right loss. Bundle a tiny HTML entry, disconnect the network, and
exercise the same transition in two browsers. Feed one peer an illegal action,
an outdated turn and a mismatched rules hash; all must be rejected.

Measure startup, bundle bytes, transition/search time and serialization before
choosing the larger port. The current repository itself warns that the compiler is
young and its Lean formalization and implementation can disagree. Therefore keep
the independent reference and differential tests even when a proof checks.
Source: [upstream limitations](https://github.com/bendlang/bend/blob/main/README.md#limitations).

No compiler was installed and no converted executable was tested for this memo.
