# Commands liveness repair — 2026-10-08

The official 2.0.35 candidate checked the complete private NativeV2 application,
but pristine C emission rejected three Commands closures above its 247-word
arity limit. The diagnostic recorded 270, 268 and 263 words. The rejected
attempt and its original process-closure receipts remain historical evidence.

`command_result.record` now extracts the previous position, journal and history
before refreshing the certified successor. Its caller passes the accepted
`Prepared.Ready` directly. This removes simultaneous old/refreshed State
captures without changing command guards, effects, replay, State layout or the
authoritative Ready contract. The obsolete `record_refreshed` helper is removed.

The exact Commands postimage is
`caca461b163af37f884c355be5c1812c694bcea5c301901bc4fecb6c4803bab3`.
Before canonical integration, the private candidate passed:

- Full NativeV2 CHECK: 3,233 definitions, 88 loaded files, 45 Base foreign
  definitions and zero holes; pristine compiler C emission produced
  14,997,868 bytes, SHA256
  `ae4ebe0a386d2bd22e3f9c5d81ba9a3a23b5c35aca1b964407929a3d65987bc4`.
- Fresh baseline/candidate controller CHECK and selected JS emission:
  2,412 definitions, 65 loaded files and the same 14 exported APIs each.
- Finite compiled-JS parity: 136 cases over three selected layout/policy
  configurations. Complete Packet/WebPacket/Ready/effects and bot outputs
  matched. Independent frozen-reference legal-ID checks and immutable-input
  assertions passed. Cases include moves, animation and stale guards, draw
  replies, resignation, terminal Undo, replay rejection/cancellation/install,
  white/black bot guards and an actual Store-text reload through fresh boot
  and replay to the identical Match. Result SHA256:
  `bd8396f3ae731dd8f36ed8273463c28f1e4c869ee2b39222a83bcecfdeb73355`.

The successful runtime attempt recorded zero network calls, original process
and Job closure, and 418 unchanged input fences. A preceding sandbox attempt
failed at `spawnSync git EPERM` before importing either controller; that closed
failure is retained separately. Independent source and actual-result reviews
accepted the bounded evidence.

The private NativeV2 source also contains the separately retained five-line X11
event adapter. These results establish CHECK, C text emission and the stated
finite JS behaviors. Native executable, GUI, PCM, restart, browser/device,
performance, kernel and compiler-adoption acceptance remain open. Existing
source admission and frozen controls retain their exact earlier revision
bindings; this repair does not authorize execution or replace the accepted
2.0.27 toolchain pin. Private raw artifacts remain local.
