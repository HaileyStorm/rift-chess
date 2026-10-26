# Ordering witness successor, version 1 (unfrozen candidate)

This candidate preserves the exact v2 law declarations and prepared-match
extension. It replaces only the ordering witness implementation in a separate
CHECK closure; it never imports the old v2 CHECK or OrderingProof alongside it.
The old sources, manifests, original failed full62 attempt and consumed
attribution diagnostic remain unchanged.

The attributed failure was `Ctx.need` while expecting
`RangeBridgeLaws.Plan(5n, U32.from_nat(0n), 21760)`. The original witness supplied
`canonical_plan()` with start literal `0`. The new generic `plan_start_transport`
uses constructive equality elimination to expose the expected start syntax
before this concrete application. Reflexivity checks `0 == U32.from_nat(0n)`;
no axiom, unchecked cast, fuel increase or theorem change is introduced.

All other proof bodies are preserved, with relative imports rebased to original
v2 modules. The declarations, enumerator, canonical window, compiler, evaluator
and kernel fuel remain unchanged. This is an implementation/witness successor
under `bend2/docs/LAW_CHANGE_POLICY.md`, not a tool-only amendment to frozen Bend.

Status: the complete Windows CHECK/Safe pass succeeded: 1,587 definitions,
zero holes/taint, and exclusive serialization. An actual unchanged-kernel
verdict remains required; a source/type pass cannot establish proof acceptance.
Freeze a new linked manifest only after genuine reviewed successor evidence.
Original Windows controls and failed Linux receipts retain their original scope.
This directory does not replace the protected compiler pin or production entry.
