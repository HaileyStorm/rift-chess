# Exact-source 2.0.28+006 CUDA-on pilot: failed 250 ms gate

The [one-attempt Linux result](https://github.com/HaileyStorm/Coordination/issues/1#issuecomment-5867314840)
answers the [bounded request](https://github.com/HaileyStorm/Coordination/issues/1#issuecomment-5866829749)
for clean public source `c30d312727a56f6b66b501dddf8038d317dfd946`
(tree `6b660ac8be75b05d04b1aa352057217486c25eab`) and the disposable
2.0.28+006 candidate. The host reused its previous CPU package receipt
`ed03b68168c2cce0e1c222a799c9df1d335cea71046ddddcbca41ce0f085b899`
and emitted C
`8e5ceff370d88b7c8aa6f31bc2abef2e7776a660ea2cb2f0c61f0573a17ff1ca`;
it did **not** re-emit Bend C. Its CUDA ELF SHA-256 is
`646b71c575ab6bfdf82ab5d545ba7d16af0bfe2024a139d0f0b2348750e7d42b`,
sidecar SHA-256
`e5cc0bcac1a4cab1b1c21c5ffa0944bc85cc96b87269f40b85443e9e7a1c3fda`.
The host observed the exact explicit `--gpu on` ELF processes on RTX 5090
UUID `GPU-dd25b066-7c00-77f0-2996-90516230c69d`.

CPU and explicit GPU-off passed the **unmodified original 250 ms** X.Org
second-click deselection. GPU-on failed: pointer selection succeeded, but
the deselection capture remained byte-identical to its selected frame
(`0def7c272d6cc0648fe84997cff73de3b67633032d029585c2ad03c7761ab84c`),
and that probe exited 1. CPU/off deselection was
`d88a3e2539f7b1e5ef28fb0bbd93d6e2069a827d66c313677c29a9c98ae8ca93`.
The host reports initial/selected, g1-h3 move, held/settled orbit, close and
routed PCM observations passing their scoped probes, with CPU/off/on orbit
frames matching. Those positives do not override the failed required input
gate, prove a speedup, or authorize default GPU-on.

The fresh lease `lease-rift-nativev2-cuda-5866829749-01` (authority epoch
`2eebf578-618c-493c-83b9-4ed6cfe7e97d`, decision generation 1) had 27
authorizing live validations, then was withdrawn; durable outbox denial,
ledger cancellation and post-withdraw nonauthorization were verified. The
disjoint host-local output claim was released. Host-local evidence manifest
SHA-256 is
`565b323a27df6fbefb820a45dd8d8942a1ee1acb9c71c6eb1bcff87cfbe2bca7`,
pilot result JSON
`c91a933b42c1440f4f6cfaa899513203dd98f77e29fa08fd4751d0bebe7f97be`,
lease closure
`d7199d7724d03a98e7bba63337828e250094373781881a01fbbcb864d91173c6`,
and exact claim release
`07b9f7e61b294d687c96283d3a9fae2413d00edf9e629f11a2eb2566965fc345`.
Those artifacts remain Linux-local; Windows has not independently transferred
or cross-hashed them. Tracked game source, frozen Laws and the clean pinned
2.0.27 compiler were not changed.

This is a terminal **failed GPU-on pilot**, not an intermittent pass. No
automatic retry or slower acceptance cadence was run. A separate
[observer-only timing diagnostic](https://github.com/HaileyStorm/Coordination/issues/1#issuecomment-5867368799)
was requested against those exact retained bytes under a *new* lease and
claim. It could not retroactively pass the 250 ms gate;
the previous 2.0.27 observer trace is a lead, not current-source causal
proof. A reviewed repair and fresh original-cadence GPU-on acceptance remain
necessary.

## Observer-only diagnostic stopped before GPU use

The [one-shot Linux reply](https://github.com/HaileyStorm/Coordination/issues/1#issuecomment-5868217172)
for that timing request stopped on its **first CPU-untraced episode**. Its
in-process XRes/ctypes window-ownership check used a different X authority
than the private one given to `xwininfo` and the child observer. The resulting
MIT-MAGIC-COOKIE rejection prevented opening the disposable X.Org display.
No ROI samples, CUDA-on episode or new timing attribution were produced. This
is a harness authentication failure, not an application or CUDA result.

The host reports a fresh initially authorizing lease was withdrawn and
post-withdraw validation denied; the exact output claim was released and its
owned display/process fixture was absent at close. Host-local blocker JSON
SHA-256 is `1ae671d15f9b54676e374d032e60314e319e487f4ee5cc3f0d37193fb029faa5`,
diagnostic result `b2bc44ffcf53eb8e636662998b9fff78d129d90041a5ee90b7fb822d5cc26a2a`,
lease closure `45c86167ed1531b64317c2e07e2a0886f6d99b7fd3bafc48e53849ba9fb048c2`,
and claim release `40188c6033434a397561ca6e4ccc978b204de0467eca617c1184b694a1b36399`.
Those bytes remain host-local and untransferred. The earlier 250 ms GPU-on
failure is unchanged.

A separate [CPU-only harness-auth preflight](https://github.com/HaileyStorm/Coordination/issues/1#issuecomment-5868415046)
was requested after the new-source CPU package gate. It required a
wrong-cookie negative and private-cookie XRes positive with locally scoped
authority, and explicitly forbade device use or an automatic timing retry.
Its actual stop is recorded below; no new source-bound GPU diagnostic is
authorized by that request.

## CPU-only auth preflight stopped at display readiness

The [Linux preflight reply](https://github.com/HaileyStorm/Coordination/issues/1#issuecomment-5868785033)
reports Xephyr starting, then readiness timing out before either XRes control.
The fixture expected `Width:` and `Height:` from `xwininfo -root -tree`, but
the installed command on an existing display omitted those fields;
`xwininfo -root` included them. The disposable display's own query output
and statuses were not retained, so a predicate error is plausible, but its
connectivity/authentication remains unproved. The static XRes repair was
not dynamically tested. There was no GPU lease, GPU-on process, application
build, or timing retry. The host reports clean fixture teardown and exact
claim release, SHA-256
`944fe740a046d128670da161678236dc476680a6773ff12674f82d1915c412d3`.
Host-local blocker/result SHA-256 values are
`9f47076c2d349c9bbd86ef684ee47405d4680090539881f4a728010b15b2cb44`
and `d1ebb95345086e638ea701e0496a79061f1e1d5cc1f2d7590e1051ca5482e214`.
The reported harness before/after/diff hashes are
`fd68db207305af24a213fc52f297830503524982efba4570d1d3bbd251886328`,
`6de50af134dbe5cf62dd56c8f108a0719a624b504a6f8fb8b99fc93e8ea04062`,
and `2539ba55445e532e42caeb4c576e16a7689f587e64f8624007971cf18aaae57c`.
None was transferred for local code review.

One [new CPU-only readiness/XRes request](https://github.com/HaileyStorm/Coordination/issues/1#issuecomment-5868830136)
requires `xwininfo -root` against the owned display with retained bounded
output and exit status before the wrong/private-cookie controls. It requires
a fresh narrow claim and grants no GPU authority; its result is pending. The
original c30 GPU-on 250 ms failure remains the only completed device
acceptance verdict; the later cafc visual source has no GPU result.

## Corrected readiness, inverted XRes status control

The [next CPU-only fixture reply](https://github.com/HaileyStorm/Coordination/issues/1#issuecomment-5869250290)
established owned-display readiness using `xwininfo -root` with a retained
startup exit 1 followed by exit 0 and 320×240 dimensions. Its uniquely owned
test window and wrong-cookie XRes denial passed. The private-cookie call
reached `XResQueryClientIds` but the copied helper rejected a returned status
of **0** before reading a PID. It had inverted the original correct
`status != 0` failure predicate. A preliminary disassembly interpretation
and reviewer approval of that inversion were explicitly corrected (host-local
correction receipt SHA-256
`07bd79184246373a90783b5dc86230f0ab4dc91ba714f8d0b2327b71aabe2b`).
The X server's [Success status](https://sources.debian.org/src/xorg-server/2%3A1.20.11-1%2Bdeb11u13/Xext/xres.c/)
and the host's installed libXRes observation both use 0 here; a successful
private-cookie PID ownership comparison was **not** observed.

Host-local blocker/result/readiness SHA-256 values are
`f815fb87c9311571b16ea458785ce4b7f2cc20337bbd56601998ef36cab9dc8e`,
`84ca1b82c21575fbe2dae559604e29cbe4fa790baa9029adef3ba30a1deff9e5`,
and `41069a0e9896a29af0982ca9108658813ee8a8942d493f09961ed7bc8e11271f`.
The original/copied harness hashes are
`fd68db207305af24a213fc52f297830503524982efba4570d1d3bbd251886328`
and `0483732cf1f65aa45236fdba01644192628ec2effb3f873236e86271d545b7bc`;
diff `ac9bde4b8eaba36c6a792fe1e8f186069d017cbb065a70523766c25974df9e32`.
The host reports owned fixture teardown and exact claim release (SHA-256
`63cb2843b44ff7b0bdc9f30f6d373b23c73cc53b8059ff41394caf8b1b73a785`).
There was no GPU lease/use, native app build, or timing attempt.

One [new CPU-only status/ownership control](https://github.com/HaileyStorm/Coordination/issues/1#issuecomment-5869916117)
requires restoring the original `status != 0` check, preserving the scoped
authority/readiness fixes, rechecking wrong-cookie denial and verifying a
private-cookie status-0 reply with a returned PID equal to the owned window
process. Its result is pending; it grants no GPU authority. The c30 original
250 ms GPU-on failure remains unchanged.

## CPU-only XRes positive control passed

The [one-shot Linux result](https://github.com/HaileyStorm/Coordination/issues/1#issuecomment-5870229954)
for the preceding request reports an owned Xephyr display with corrected
`xwininfo -root` readiness, wrong-cookie rejection, and private-cookie
`XResQueryClientIds` status 0, count 1 and returned PID exactly matching the
owned window process (3878284). The status check was the original
`status != 0`; no application gate or GPU process ran. The host reports owned
fixture teardown and exact claim release. Host-local evidence/result/claim
SHA-256 values are `486fadbd3692bda26df61ce1134aaecfdbbddf6fb41a4394c864c5fe7d1b435a`,
`c0001c304204959d9c37e29a76f6bebc1d1fee1ce882b3710a8029e9cd772c42`,
and `6fde09fe012d618dad3947c56b2c3b5ac1b57e063b00579893fe383ba5503e0a`.
Those bytes have not been cross-hashed on Windows. The pilot's GPU-on 250 ms
failure remains terminal, and the CPU-only request is consumed. A new device
diagnostic needs a separately reviewed fresh coherent lease and source-bound
one-shot scope; this preflight alone is not device permission.

A [new one-shot observer-only request](https://github.com/HaileyStorm/Coordination/issues/1#issuecomment-5872596195)
asks the Linux owner to rebind the retained c30 CUDA ELF/sidecar, repair only
the disposable observer's scoped authority/readiness/status predicate, obtain
an independently reviewed harness and *fresh* coherent lease/claim, then
separate untraced 25 ms ROI samples from an Xlib observer timeline. It grants
no automatic acceptance retry, compiler/source mutation, current a3a native
parity or 250 ms pass. Its result follows below; the earlier failure remains.

## C30 observer timing result: after pickup, before submission

The [one-shot Linux result](https://github.com/HaileyStorm/Coordination/issues/1#issuecomment-5873034200)
used the retained c30 CUDA ELF/sidecar and a disposable observer (SHA-256
`682e7b4598193a63c4c3fc5246fa5f6a5edc5b92475a733c137be43f0f980c75`)
after independent static review. Under a fresh exact lease, six CPU/off/on
episodes exited 0; GPU-on PIDs matched the owned windows. In the **untraced**
nested Xephyr ROI, GPU-on was still selected at an actual 250.163 ms
`XGetImage` capture and first changed at 275.156 ms. In a **separate traced**
GPU-on episode, second release was picked up at 8.371 ms; the first
deselected `XPutImage` and `XFlush` were at 250.197 and 250.212 ms. Traced
CPU and GPU-off changed submissions were at 172.671 and 180.844 ms, with
their release pickups at 11.822 and 2.217 ms respectively. These separate
episodes are not a paired per-frame elapsed-time decomposition, and tracing
can perturb timing.

The observed GPU-on delay lies after event pickup and before the changed
frame's X submission. The evidence does **not** isolate game dispatch,
CUDA kernel/copy, 60 Hz pacing or the compositor, and a later ROI is not
the original full-window 250 ms acceptance. The original gate remains
terminal FAIL; no current a3a GPU parity or speedup is established. Linux-local
evidence JSON SHA-256 is
`584c68d80970539a9f0036b720877fa1f896cb367b796e0588682c45892404a0`.
The fresh lease was withdrawn and validator denied further use (closure
SHA-256 `cfdd68b68a894cb4b8a52a83a11f922661c4212d3a16d69e87fd612fcd5c8078`);
the exact output claim was released and no diagnostic process remained.
The receipt bytes are host-local, not independently cross-hashed on Windows.

After independent read-only phase-probe review, a
[new one-shot request](https://github.com/HaileyStorm/Coordination/issues/1#issuecomment-5873174640)
requires Linux to inspect the exact retained 2.0.28+006 C and ELF ABI before
any process-local interception. If safe dynamic hooks exist, it asks for
per-frame second-release, identified `window_dev` versus generic CUDA kernel
calls, blocking DtoH copy, `nanosleep`, X submission and external ROI timing
under a fresh coherent lease/claim. The pinned 2.0.27 Windows foreign source
is **not** the authority for that candidate binary's call order. The request
was diagnostic only and its stopped result follows; a traced later frame
cannot close the original full-window 250 ms failure.

## C30 phase probe stopped at disposable output allowlist

The [one-shot Linux reply](https://github.com/HaileyStorm/Coordination/issues/1#issuecomment-5874095945)
to the phase request stopped after its first CPU-traced episode. It re-bound
the exact c30 source, C, CUDA ELF, sidecar and assets; its exact generated-C/
ELF ABI inspection and independent static preflight passed. Private-display
readiness, wrong-cookie denial and unique correct-cookie CPU-window PID
ownership passed. The CPU-traced episode exited 0 and wrote 371 bounded trace
rows. A strict disposable output allowlist then rejected one unexpected but
empty `data-DyFYed` directory. The retained observer source creates a
`data-*` directory with `mkdtemp` at lines 498–499; the allowlist had omitted
that fixture. This is a harness/output-inventory defect, not CUDA evidence.

No explicit CUDA-off or CUDA-on episode ran. The lease was withdrawn and
post-withdraw validator denied use; exact claim released, no unstopped PIDs.
Host-local ABI review SHA-256 is
`454faa63fcc7be54bbedf9237f7a86eba965812276e4a4ccb51f8e56c84657d9`,
static preflight `3256f29d761067a29a03ca7dee99e650b907ac50e9052a98f1ab7b074f7b7473`,
diagnostic result `d2cc15b060f72b8a2899972d3c26d3498f5d5b448608fa8082a1f8d472a92fe5`,
blocker `1a2620c3bfc2fe5f669a242f4b6911d32e2f9469036d11383b3cd0c7e88adf0f`,
and lease closure `fd9bb85355d9a5413dcf7aefa17f8864c5d07dd4f29510c57d8d4fc014cacfe5`.
Windows has not independently cross-hashed those host-local bytes. The prior
untraced nested-display result and original full-window 250 ms CUDA-on FAIL
remain unchanged. A later attempt needs a newly reviewed exact owned-fixture
allowlist, fresh claim/lease and one-shot authority; silence or a CPU exit 0
does not authorize continuing to GPU.

A [fresh one-shot allowlist-repair request](https://github.com/HaileyStorm/Coordination/issues/1#issuecomment-5874204027)
requires source review of the observer's `mkdtemp` fixture and 371-row CPU
trace, an exact owned-directory inventory rule (not a broad `data-*` bypass),
independent preflight, and a new coherent lease/claim before any CUDA-off/on
phase episode. It preserves the stopped result and original 250 ms failure;
the request itself is not device execution or an acceptance retry.

## Corrected allowlist phase diagnostic: completed, delay still unattributed

The [one-shot Linux result](https://github.com/HaileyStorm/Coordination/issues/1#issuecomment-5876259686)
for exact request `5874204027` reports that a newly reviewed allowlist
admitted only the observer-owned, empty `data-XXXXXX` directory, then
rechecked output inventory after the run. Its independent pre-GPU preflight
v5 SHA-256 was
`3b30c8eb3386e86629f7326aade9bdf78329ea126b134018f97b51026cb97f40`.
The previous attempt `5873174640` remains terminal; this was a fresh
one-shot diagnostic under a new lease, not a retry of its failed fixture.

The clean source was c30d312727a56f6b66b501dddf8038d317dfd946, generated
C SHA-256 `8e5ceff370d88b7c8aa6f31bc2abef2e7776a660ea2cb2f0c61f0573a17ff1ca`,
CUDA ELF `646b71c575ab6bfdf82ab5d545ba7d16af0bfe2024a139d0f0b2348750e7d42b`
and sidecar `e5cc0bcac1a4cab1b1c21c5ffa0944bc85cc96b87269f40b85443e9e7a1c3fda`.
Exactly one CPU-traced, explicit CUDA-off and CUDA-on episode exited 0;
the CUDA-on PID matched device observation. The Linux report calls the
CPU/off 250 ms nested-ROI images the “initial frame” and says CUDA-on
remained selected. That wording is not silently reclassified as a CPU/off
deselection verdict or the original full-window acceptance test.

In the **traced** CUDA-on episode, second release was consumed at 0.330 ms;
four `bend_dev` launches ended by 14.004 ms. The changed `window_dev` launch
began at 245.067 ms, leaving about 231.063 ms between those observed host
call boundaries without attribution. `cuMemcpyDtoH` took 9.080 ms; changed
XPutImage began at 254.378 ms, XFlush returned at 254.928 ms and the first
changed external sample was at 275.115 ms. Asynchronous launches, blocking
copy, 60 Hz pacing, CPU dispatch, X submission and visible presentation
are distinct; tracing perturbs timing. This does not prove the device
executed for 231 ms or identify a GPU optimization.

Four exact lease validations authorized that narrow episode. The lease
was withdrawn, outbox denied, post-withdraw validation exited 2, no target
or Xephyr remained and the exact claim was released. Host-local verdict,
evidence and lease-closure JSON SHA-256 values are respectively
`db3bf2d2a1ab696438bf3105644ea87ea7c5f670d75c83aaed8110eaff1540b7`,
`3f177934dd9fb7ff51fda927ed248d03db0fdbfece8da0d1f39b3abe46bfc447`,
and `f1b07f8de653b20da423fcaa359963b9176d5c6bdd876f011d095152ccfb1af7`.
Those private artifacts have not been cross-hashed on Windows. The original
full-window CUDA-on 250 ms deselection gate remains **terminal FAIL**;
no GPU default, parity, speedup or acceptance follows.

A [read-only retained-trace request](https://github.com/HaileyStorm/Coordination/issues/1#issuecomment-5876312618)
asks Linux to enumerate intervening frames, pacing and X/CUDA host calls
between release and the changed launch. It authorizes no new device or CPU
episode, lease, retry, source edit or acceptance claim. The gap remains
unattributed unless the exact retained rows actually account for it.
