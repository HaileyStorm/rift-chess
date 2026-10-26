# Avoid unrelated control traversals

`Layout.enabled` previously scanned the legal list and counted history for
every control, then passed those answers to an ID-specific decision table.
It also calculated Undo agreement eligibility for every control. Only Shift
(5), Next history page (46), and Agree to Undo (48) consume those respective
answers. Small ID-dispatch helpers now defer each calculation to its consumer.
The existing predicates and decision table are retained; no persistent cache
or invalidation state is introduced.

The current move path already stores successor legal moves in canonical
`Prepared.Ready`; `State.refreshed` reads them through `Prepared.ids`. The
older review's duplicate legal-generation attribution is historical for this
path. This change concerns UI control construction, outside the frozen CHECK
closure and frozen files.

The affected Controller passed whole-book checking and JavaScript emission.
Unchanged Scene and Menu emissions, browser ports, artwork, atlas masks and
prepared ground were reused. The resulting package is version
`377b1cafefb8d4cca630`, build SHA256
`72e0fad0beea80f20c5a463be6812fbd8935ff4427a57e3fe345716212a564d7`.

One paired real Chrome journey moved g1-f3, opened history, requested and agreed
to Undo, restored the original position, and selected the knight again. The
observed control states, positions, journal bytes and rendered pixels matched
the previous build. Next history page and Shift were disabled in the observed
states; Agree was enabled and completed the real Undo. Original Chrome and
parent processes exited zero; streams, handles, Job and loopback server closed
without forced cleanup. No inputs changed during the journey.

Original ignored evidence beneath
`.artifacts/bend2/2035-preview/stationary-motion-20261006/layout-enable-traversals-20261025-r4/`:

- `supervisor-r1/terminal.json`, SHA256
  `462933fed3753d97f3dc8143410057707fd298cd213581194800f4aadc1ee550`.
- `journey-output-r2/result.json`, SHA256
  `e0ca37b214c1734881433a0f6568f06313d8fbdcd9d6496f8800d12820c515ff`.
- `journey-supervisor-r2/terminal.json`, SHA256
  `92b1e2fbe581564368c3f59ab9849208407e1bea718cb1768c23d74053373dbd`.

Earlier parse failures and the closed, pre-request localhost `EACCES` attempt
remain retained. No unit/integration tests, scenario matrix, timing threshold,
screenshots or fresh proof campaign were added. The emitted branches confirm
the traversal deferral; these observations do not quantify a stable speedup,
prove every UI state, or establish native/kernel/device/adoption acceptance.
