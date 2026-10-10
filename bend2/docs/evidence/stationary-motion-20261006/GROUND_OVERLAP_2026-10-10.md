# Prepared-ground loading overlap — rejected candidate

The current sprite helper authenticates the plate while loading sprite pages,
then loads prepared ground. A private candidate started prepared-ground loading
as soon as that plate digest matched, overlapping it with sprite loading. It
retained the existing source, generation, frame, cache and picking guards and
released speculative loader state on stale jobs or asset failure.

The candidate was not adopted. In one actual startup and e2–e4 journey per
package, it removed the separate ground wait but did not improve first atlas
display. No additional timing campaign is required to keep the simpler current
implementation.

| Observed span, milliseconds | Current helper | Overlap candidate |
| --- | ---: | ---: |
| First canvas from navigation | 1630.1 | 1403.2 |
| First atlas from navigation | 4032.1 | 4220.1 |
| Helper asset fetch | 35.8 | 319.1 |
| Helper asset decode | 137.6 | 126.3 |
| Prepared-ground wait | 241.1 | 0.1 |
| Helper total | 1194.3 | 1317.6 |
| Dispatch to helper start | 539.2 | 733.1 |
| Helper send to acceptance | 563.5 | 627.6 |
| First real input to canvas | 70.8 | 59.8 |

Both packages displayed the same initial canvas pixels: SHA256
`1811c823aa38e3ac3854ad71e47e46fc0b5e0caf9a21a3241e25212f92153740`.
Both selected and moved e2–e4 through real trusted pointer input, with the
expected saved command and resulting board. Both used prepared ground. These
finite observations do not establish causality, stable performance, cold OS
startup, constrained devices, subjective graphics quality, native acceptance,
formal proof or compiler adoption. The transport spans include scheduling and
receiver work as well as structured cloning.

The package reused the exact retained current99 Scene emission and existing
ground, assets, bot and host logic. It rebuilt only the helper and relocated its
hashed URI through the existing worker and host. Eighteen package files remained
byte-identical. No compiler or ground render ran.

The original first build failed import resolution and settled with exit 1.
The corrected build succeeded; its first launcher hit Node asynchronous
`realpath` `EPERM`. A focused read confirmed synchronous native `realpath`
resolved and read the same file. The private launcher retained canonical-path
checks using that call. A sandboxed loopback attempt then failed its first fetch,
before any server request. The final authorized execution with loopback access
completed both journeys in headless Chrome 154.0.8037.98. Every original attempt
has known process/Job closure; none required forced cleanup or ambiguous replay.

Exact private identities:

- Candidate helper: `75a17d3759826ef385f2c3a530b0adbbd9f531b3250e6a638d26d3e2270f8b60`.
- Current package: `2cd24213c97830203eb28e0fdc4d116b085a90a6c60ba8ba7b3bc0db8bcc1d69`.
- Candidate package: `fed47c52acfe486bc9c71b7c26508b237a74e2d4e5838e40580ff4a5ecc9141a`.
- Journey result: `7ce7d85f56f473fde17215a379d5a2aedf5f390a1b63517f6f13707700275521`.
- Original final supervisor terminal: `ed8208220b1d2ebd7864d0d98ad9a1bb5837c5a14f489fd6a444042e451f29c5`.

These build-specific results remain Git/private evidence. Memory disposition:
reasoned skip; no new durable user policy or cross-task correction. The full
sprint, proof, native and adoption obligations remain open.
