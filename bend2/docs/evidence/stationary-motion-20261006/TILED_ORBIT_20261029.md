# Spatial orbit renderer: retained experiment

The four-worker orbit renderer is shelved. The active renderer and packaging
sources were restored byte-for-byte to `744b2e9`. No new runtime path, test runner
or proof obligation was activated by this experiment.

The candidate rendered four nonoverlapping 256px tiles of the 512px board.
Bend retained full-view coordinates, ancestor classifications, painter order,
nearest sampling and feedback. Existing generic module workers assembled RGBA
tiles atomically; the host copied them into Bend's authored chrome rectangle.
Unsupported backgrounds, cold workers and failed pools used the established
renderer. Acceptance required all four workers, preserving balanced execution.

The new pure Bend entry passed actual current99 whole-book checking with zero
holes and emitted JavaScript. Original parser/binder diagnostics and their
corrections remain retained. This is source/emission evidence, not a new formal
kernel verdict.

The same actual Chrome 156 application journey rotated, released and selected
g1 in fresh baseline/candidate contexts. Completed comparisons preserved exact
motion and settled PNG bytes, selection and saved history. The passive capture
observer was corrected to recognize complete tiled frames after an earlier
timeout on the old renderer's timing field; product bytes were unchanged for
that correction. A separate sandbox attempt failed loopback fetch before loading
the application. All original browser, Node and Python handles/readers settled.

Cold tile execution remained expensive. Earlier module initialization did not
remove the first-render cost. A final variant prepared one actual current-view
frame offscreen while the established renderer continued serving input:

| Final variant measurement | Baseline | Tiled candidate |
| --- | ---: | ---: |
| Presented motion frames | 5 | 3 |
| Inter-draw p95 | 239.5 ms | 296.6 ms |
| Consumed input to draw p95 | 267.3 ms | 323.1 ms |
| Release to detailed frame | 1477.8 ms | 1704.6 ms |

These are small sequential samples under variable desktop load. They do not
establish a universal regression or its cause. They provide no reason to adopt
the extra workers, storage and source complexity in this implementation.

Final build SHA256:
`7c2c39123be47f440a6a2488a5244002755f8fe139f2d56c0ef27d8b5d7cc1bd`.
Original result SHA256:
`2668db28eb9488c9f9caa663caf0352a06b48f2866d3b76d1411015fb58b647e`.
Original supervisor terminal SHA256:
`ffec37cbc46bdc11c2c4053679292af532edafd1333bc6778724e7420c2dbada`.

All seven candidate source files, emitted modules, packages, original failures
and successful journeys remain private recoverable evidence. The verified
retention manifest SHA256 is
`aa8d692fbc308259703e12f621910e2cd31ccee6aab0fa8ea7eaca84add6d1da`.
The new draft sources were removed from the active tree only after exact
retention readback. Frozen laws, native source, accepted compiler pin and public
preview remain unchanged. Responsiveness, native acceptance and compiler adoption
remain open.
