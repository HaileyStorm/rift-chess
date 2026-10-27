# Ordering witness successor, version 1

This successor preserves the exact v2 law declarations and prepared-match
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

The complete Windows CHECK/Safe pass and the original Linux full62 proof both
passed: 1,587 definitions, zero holes/taint and identical exclusive Safe output.
The unchanged official kernel printed `ALL PROOFS CHECK` and exited 0. See the
[accepted native review](NATIVE_PROOF_20261026.md) and immutable linked
[witness manifest](../../../laws/ordering-transport-v1.json).

Original Windows controls and failed Linux receipts retain their original scope.
The old failed lease survives at its retained sidecar; the new successful
consumer released its own lease. Both one-shot intents remain consumed.
This witness freeze does not replace the protected compiler pin or production
entry; the full migration/adoption and native application duties remain open.
