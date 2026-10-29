# Current35 successor adoption

Current35/effective99 remains a candidate. Installing these adapters or preparing
an amendment declaration does not activate it. Production selection requires the
existing descriptor, adoption record and independently trusted owning review in
[`active-toolchain.mjs`](../tools/active-toolchain.mjs). Preserve the unarmed r6
records and all original evidence; prepare a fresh reviewed successor record.

The transition selects current35 explicitly for the v2 production purposes. It
does **not** rewrite `bend2/TOOLCHAIN.json` or the pristine physical upstream
checkout at `.artifacts/toolchains/bend`. Those retain the original 2.0.27
creation pin, commit `d37909174ebd664338ae3194799a9e0899dedd51`. The selected
current35 directory is the separately bound effective99 source profile at
`.artifacts/bend2/toolchain-patches/workers-2035-cli-r2/bend2`, derived from
official35 commit `79df8d9c40722ee9507a1e253f283b51025f9d6c` with its retained
lineage. Effective99 has 99 exact files totaling 1,208,629 bytes; it is not a
claim that the pristine official checkout contains those derived bytes.

## Amendment within the existing reviewed record

The `rift-toolchain-adoption/2` record must contain `successorAmendment` with
this exact structure. Placeholder references below must be replaced with the
existing descriptor's actual four-field references. This is a shape example,
not an approval or a populated adoption record.

```json
{
  "schema": "rift-toolchain-successor-amendment/1",
  "semanticMeaning": "unchanged",
  "predecessor": {
    "sequence": 5,
    "amendment": {
      "base": "repository",
      "path": "bend2/laws/amendments/005-bend-2-0-27.json",
      "bytes": 3591,
      "sha256": "bc1ada63e4af9ae88c3e956f635657bffddc9f6a31cd604b42a602c8eb6c795c"
    }
  },
  "preserved": {
    "legacyCreationInputs": "<descriptor.legacyCreationInputs reference>",
    "toolchain": {
      "base": "repository",
      "path": "bend2/TOOLCHAIN.json",
      "bytes": 334,
      "sha256": "17419db1617fece38c72dba9136463a313db43bf2c61f657334d9fdce0ae51a6"
    }
  },
  "transition": {
    "kind": "explicit-current35-v2-production-selection",
    "descriptor": "<exact descriptorRef reference>"
  }
}
```

This names the unchanged original 005 head and preserved creation inputs while
binding the new selection to one exact current35 descriptor, including its
compiler inventory/lineage, production adapters and host runtime bindings. It
does not add an incompatible 006 record to the old registry. Frozen manifests,
old amendment tools and their recorded receipt schemas remain unchanged.

`inspectAdoptionInputs()` deliberately checks the existing five-record chain,
then compares the declaration's predecessor with that actual head. It checks
the preserved pin reference and its 2.0.27 version/commit, the legacy identity
record, permitted nonsemantic substitutions and the existing assurance bindings.
Its result remains identity/linkage inspection, not semantic approval or a proof
execution. Review must assess the actual outcomes and their applicability.

`resolveActive()` requires the typed declaration within the trusted adoption
record subject. It validates the exact predecessor/pin references, preservation
reference and descriptor transition without traversing historical records on
each build. `reviewSubjectSha256(record)` excludes only `activationReview`, so
the successor declaration is covered by the existing owning review digest.

## Review and activation procedure

1. Preserve the old five-record chain, 2.0.27 pin/checkout, frozen laws, creation
   inputs, failed attempts and consumed execution records. Bind the exact
   current35 descriptor and current application inputs/products in a fresh
   adoption record, including the declaration above.
2. Complete the existing assurance applicability review from original receipts
   and exact source bindings. Keep source/type/promise/Safe checking, independent
   kernel results, mutation controls, rendered application acceptance and device
   measurements distinct. Reuse unchanged evidence at its demonstrated scope.
3. Perform the deliberate input/linkage inspection and the existing independent
   owning activation review. The review retains schema
   `rift-active-toolchain-review/2`, disposition
   `accepted-for-current35-v2-production`, Root's reviewer identity, descriptor
   digest and record-subject digest. No additional approval stage is introduced.
4. Selection may use only the exact reviewed bytes: descriptor state
   `proposed-active`, record state `submitted-for-owning-review`, and its exact
   `activationReview` reference. Fix those proposed states before computing the
   review subject; changing them afterwards invalidates the review. The owning
   caller must independently authenticate
   `trustedReviewSha256`; self-supplied states or digests confer no authority.
5. Bind the actual original runtime executable/version, full argv and cwd, the
   executing purpose adapter and every consumed current input. Dispatch through
   the existing purpose API with fresh owned output and original-handle
   settlement. These records supply no live access, resource, claim or retry
   authority. Root npm commands continue to select the TypeScript application.

The candidate-native API remains separate: `resolveCandidateNativeBuild()` and
`buildCandidateNative2035()` can authorize one reviewed, source-bound CPU package
before adoption. Their candidate record/review and nonadopted result do not
satisfy or promote production adoption. The 72 GiB/no-swap/OOM-group resource
policy, full-ancestry growth admissions, exact Event overlay and original process
settlement remain required. Building a package does not execute its ELF or CUDA.

## Remaining applicability and trust obligations

Current-source browser evidence must bind the actual shipped controller, scene,
menu, host/Worker, displayed-pixel picking, assets and offline product. New adaptive
resolution output needs its own applicable real acceptance; an earlier package
is not silently relabeled. The declared motion target still needs its actual
measurement and owning disposition before its assurance slot can be closed.

The Linux owner completed metadata-only preparation; its original READBACK is
retained. The requested shared-UI source was not imported or built in that step.
The fresh affected native build and UI acceptance remain pending. Bind and
review their actual source/package/tool/runtime/settlement records when they
exist. This document supplies no replacement receipt.
Earlier native GUI, routed PCM, same-save restart and GPU records retain their
original scope and limitations. Preserve the original GPU full-window contract:
1024x640, 60 ms press, capture 250 ms after release, unchanged balanced
parallelism and `selection_diff > 0 && deselect_restore_diff < selection_diff`.
Scope reuse does not make old images or device timings current-source evidence.

Changes to this resolver change its consumed source hash. Refresh future native
candidate metadata and its owning review with the new bytes after integration;
never silently patch a consumed packet, original receipt or historical review.

The [legacy toolchain-update guide](LOCAL_BEND_GUIDE.md#updating-the-bend-toolchain)
describes the original frozen creation/amendment workflow. Its old creator,
receipt shapes and test commands are historical obligations, not a command list
for this successor. Follow the current [validation policy](../../docs/VALIDATION.md):
zero active unit/integration tests, minimal necessary real E2E, unchanged formal
obligations and reuse of applicable evidence. Root `npm test` and pytest remain
retired; they must not be replayed or fabricated to populate old receipt fields.
