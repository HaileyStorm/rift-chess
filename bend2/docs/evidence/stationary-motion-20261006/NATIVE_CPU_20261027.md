# Current99 Linux CPU build — 2026-10-27

The original capped native build succeeded. Its aggregate service/cgroup memory
peak was **8,081,985,536 bytes (7.527 GiB)**, with no recorded OOM events. This
measures this build; it establishes neither an 88 GiB requirement nor game runtime
memory. The one-shot containment allowance was 72 GiB, swap disabled, with an
8 GiB outside reserve. It was a ceiling, not measured consumption.

## Accepted build scope

The owning review verified the returned archive and all 110 indexed originals
(111 archive members). The native source is commit
`a7eef47b5578d7e61445eb20b327c701b4c7db92`, tree
`dc2033b512ff8289e2a660188655716e8065a274`. Its 86 project inputs match the later
Windows `230cd781` checkout: 85 exact files and the existing reviewed NativeV2
Look/Scroll event overlay. Later browser-worker changes did not alter this cone.

Native source load and `book_valid` covered 3,275 definitions with zero holes.
The Worker exited 0, used a 64 MiB stack and performed no fetches. C emission,
the three Clang commands and asset packaging succeeded. The Clang process groups
were observed quiescent. The emitted ELF was **not invoked**.

| Original artifact | Bytes | SHA256 |
| --- | ---: | --- |
| Returned records archive | 103,507 | `f3197dad597b2b14b072e24e267a1e7979e5f175f61f315363dc86d99cd0952d` |
| Native package receipt | 197,903 | `b5bd1ef2df87ca5020eb17d44f1c4a836ec0e8cc8518f266683cef8aa9d70031` |
| Generated C | 15,259,521 | `ef8ba25299fea4327204f9ac6c9cef84f0ea528fb6b48136eb40d9412ef9d8a9` |
| Packaged ELF | 6,216,184 | `e56f267e25437756d5206bf2ec4139dab8d8e8276b3c8c6c6117dc94c1fd2606` |

The C and ELF identities come from the original Linux receipt; those payloads
were excluded from the returned records archive and were not rehashed on Windows.
Original records are retained privately under
`native-cap-result-review-20261027-r1/original-records/` in the successor's
visualization workspace. No compiler or asset copies were made for this review.

## Process settlement and observer limits

The outer execution session reported exit 143. The original Python outer and
observer exit codes remain **unavailable**, with no completion records invented.
The producer's build success is independently supported by its original receipt
and raw command streams.

The read-only reconciliation held a verified descriptor for the original cgroup.
Three raw manager samples at 13:50:17–13:50:27 UTC preserve invocation
`bae844afbfa44f7e8886dab5d3842005`, original main PID 3448359 and its start
identity. They report main exit 0, `Result=success`, `SubState=exited` and an empty
`ControlGroup`, followed by `FileNotFoundError` when sampling the removed path.
The reconciliation assigned its final summary only after that failed read,
leaving a stale running state there. The raw samples remain unchanged.

The owning review accepts historical service-group settlement as an explicit
inference from these identity-bound observations and the reviewed producer:
[systemd 255 releases its cgroup association after recursive emptiness](https://github.com/systemd/systemd/blob/v255/src/core/cgroup.c#L2827-L2885),
and [Linux requires no children or live processes before cgroup removal](https://www.kernel.org/doc/html/latest/admin-guide/cgroup-v2.html#processes).
Path disappearance alone would be insufficient. The unchanged invocation,
manager release, observed Worker exit and separately settled Clang groups supply
the additional evidence here. No additional build or diagnostic run is needed.

This accepts the native CPU build and historical service settlement with the
stated observer limitation. It does not establish successful original observer
closure, current claim ownership, GUI/input/audio/save-restart acceptance, GPU
performance, a new formal verdict or compiler adoption. The old admission STOP,
retained lock sidecar, permanent intents and original failure records remain.
The next native step uses this existing package for one actual gameplay journey;
the consumed build is not repeated. The accepted compiler pin remains 2.0.27.
