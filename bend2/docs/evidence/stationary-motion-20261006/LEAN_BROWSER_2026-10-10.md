# Lean browser acceptance — October 10, 2026

One actual UI journey passed against retained candidate package
`e08b681092d0c3d18ff9`: launch, ordinary moves, a Shift carrying a pawn,
human-versus-bot play, settings and view changes, saved-state reload, portrait
layout, and an offline human move. Two real bot Worker targets accompanied the
bot reply. Online and offline build bytes matched SHA256
`0fe7f363676d3c6833d8887576bc46bf8e1811bc2e1c52eded68c3946d445c27`.

The package records historical source revision `46ecd789`; the intervening
`f400e4e` test reduction changed tests, documentation and application test/build
configuration, with no Bend runtime source change. This receipt authenticates
the retained package. It does not establish compiler adoption or fresh admission
of every historical source fence.

The successful original native execution exited zero. Its original Node process
handle and output streams closed; Chrome exited zero without forced cleanup;
the Windows Job reached supervisor-only membership and closed. The loopback
server closed. There were no page errors, request failures or changed bound
inputs. Evidence before the terminal was 917,528 bytes, including two PNGs;
the terminal was 23,587 bytes. Both PNGs were inspected.

Private retained receipts:

- `current99-browser-journeys-r4/result.json`: SHA256
  `158af53ad7a47ddde085998530ea49fa64b744cbf5a4e54210431bcd200a1bd6`.
- `current99-journey-supervisor-r2/terminal.json`: SHA256
  `0774d5c65f3a6ac89aa33543aeb2bda681bd6ececfa30d3e81a1e3d6c5c997ec`.

The first original run stopped at the bot Worker check because the loopback
launcher served `.mjs` with an incorrect MIME type. It closed cleanly and remains
retained; the corrected launcher used fresh outputs for the successful run.

This follows the [validation policy](../../../../docs/VALIDATION.md). No unit or
integration suite ran. Offline evidence covers reload in the same browser
context. Worker target presence does not prove the computation branch,
cancellation or general Worker semantics. Formal Safe/BendTT/kernel obligations,
native CPU/GUI/PCM/restart, the original GPU acceptance, physical-device and
performance acceptance, and reviewed compiler adoption remain open.
