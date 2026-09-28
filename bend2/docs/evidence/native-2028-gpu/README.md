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
was requested after the queued new-source CPU package gate closes. It requires
a wrong-cookie negative and private-cookie XRes positive with locally scoped
authority, and explicitly forbids device use or an automatic timing retry.
Only after that result is reviewed can a new source-bound GPU diagnostic be
considered under a fresh claim and lease. This request itself is not a fix or
execution evidence.
