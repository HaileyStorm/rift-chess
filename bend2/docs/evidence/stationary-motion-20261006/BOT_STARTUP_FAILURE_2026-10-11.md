# Bot startup failure disposition

The browser consumer previously classified every bot initialization failure as
unavailability. A genuine Worker protocol/build mismatch could therefore invoke
the serial bot fallback instead of exposing the scheduler's fatal error.

`worker-v2.ts` now separates library import failure from session creation and
warmup. Import failure and the scheduler's `workers_unavailable` error preserve
the existing fallback. Other session/warmup failures mark pending work failed
and reach the host's visible runtime error. Candidate sessions still close, stale
generations cannot change the current position, and a boot may reset fatal
capability state. The browser tag boundary binds the new exact consumer bytes.
No Bend rules, choice function, proof definitions or scheduler code changed.

One real application journey passed using the rebuilt production browser port
and retained current Scene, Controller, Menu, ground and sprite helper. There were
no compiler executions, repeated proof checks or ground renders. No unit or
integration test, synthetic message or scenario matrix was added.

The controlled loopback deployment served an unchanged genuine alternate-program
Worker at the bot helper's nested URL, with its original dependencies. After the
human played e2–e4 through the rendered controls, the app displayed
`worker protocol/build mismatch`; its journal contained only that human move at
revision 1, with no applied bot execution. Navigating to the correctly hosted
package booted from the same saved journal. The real bot Worker then applied
choice 20065 at revision 2. A service-worker-backed offline reload retained both
commands and the exact build. This was a same-context reload, not a cold process
restart. Browser, loopback server, original process handles, streams and Job
closed normally, with no forced cleanup or uncertain current execution.

Private evidence stays under
`.artifacts/bend2/2035-preview/stationary-motion-20261006/`:

- `bot-startup-host-r1/build.json`: SHA256
  `c7cd2b6932ad80535124b7403baa83fae378a2bdecc2475f140303ee95dcacda`.
- `bot-startup-build-supervisor-r1/terminal.json`: SHA256
  `1a0fade774b461e09b0e1199c984f693feda2ce60311f33f2bec001de3ccdc40`.
- `bot-startup-supervisor-r1/terminal.json`: SHA256
  `e7f61187e270c6ea2e633c28d5d0528f2264556d1b787dbc1138b7fa8a40a4b0`.
- `bot-startup-journey-r3/result.json` and `visible-startup-fault.png` record
  the actual fault, persisted commands, correlated Worker reply and reload.

This establishes the specific application startup classification and recovery
behavior. It does not establish general Worker semantics, cancellation,
device/native audio or GPU acceptance, stable performance, kernel verdicts or
compiler adoption. The full sprint and held native prerequisites remain open.
