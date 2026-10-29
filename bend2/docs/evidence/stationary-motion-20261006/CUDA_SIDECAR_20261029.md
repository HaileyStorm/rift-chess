# Historical CUDA sidecar build — 2026-10-29 review

One original `--gpu-build` invocation succeeded and produced a source-bound
CUDA sidecar. Its original child, service, observer and outer execution all
settled successfully. The lease was withdrawn and the original claims released.
This closes that historical build allowance; it provides no current GPU authority
or application/performance acceptance.

## Accepted historical scope

The build consumed the older generated C, 15259521 bytes with SHA256
`ef8ba25299fea4327204f9ac6c9cef84f0ea528fb6b48136eb40d9412ef9d8a9`,
from the accepted 86-project-input CPU lineage. It did not emit new C or repeat
the host link. The source-bound CUDA host ELF was
`c1613c0346c9f87d716cdd19a422410f5be9c761369ae0baec89cbd3a26d0417`.
All 63 bound inputs were unchanged before and after. There was one build dispatch,
no retry and no signals sent. The child took 12479 ms; the service took 14021 ms.
These are build durations, not game-frame or kernel-performance measurements.

The original build, service-main, service-start client, observer, outer and
static verification exits were 0. The child process group was observed quiescent
and the service's original processes empty. Terminal accounting retained the
held cgroup identity and separately recorded optional path ENOENT; it did not
invent zero usage or infer completion from disappearance alone. Direct kernel
peak 759255040 bytes and manager peak 480280576 bytes are separate observations,
not interchangeable measurements. The recorded OOM counters and swap usage were 0.

The new sidecar contains an 8-byte source-binding header and an ELF CUBIN. Static
review matched the header against the exact embedded C bytes followed by a zero
terminator; the hash excludes that terminator. The unique matched cube-log value
was 7. CUBIN metadata reports 64-bit little-endian ELF, machine 190, with bounded
program and section tables. Actual L2 size and concurrent-managed-access attribute
values were not independently reported. Header agreement is static provenance,
not proof that this sidecar loads or renders correctly with another program.

Five coherent lease validations were retained. Withdrawal exited 0 and the
post-withdrawal validation exited 2 with a denied response. Final original
claim-disposition records report all fresh sidecar claims and the completed old
watch claim released. The workload allowance is consumed; no replay or rebuild
is implied by the retained successful artifact.

## Original evidence identities

| Evidence | Bytes | SHA256 |
| --- | ---: | --- |
| Returned original records archive | 61882 | `52a82477bbc7141e41d18b4e3806b7b88ed145bb666fc9872ac9098ccf4604aa` |
| Original RETURN-INDEX.json | 28283 | `37de07103fcbc1f08dd611f765574425b021b89b3a958e6229a3ea699d4227e1` |
| Native handoff | 6426 | `d9b762bfd16fc46f5c05818ad2d76478370c868ad87c00c06b225235f1d516b0` |
| Returned original-text receipt bundle | 9239 | `0343c57de613235d449c5289b0699a1768fc8c0bae44dd5737d686daffc4c7a2` |
| Source-bound sidecar | 2682592 | `33d16942ddc791cfbc14d0519ccb63c070912266ff1cb82e233ea914223d1423` |
| CUBIN payload | 2682584 | `0ace9fde905a8acd7e8211468f0da1cce68653c21f15ec829644257bc75a1492` |

Owning review independently verified all 165 indexed original members in the
166-member archive. This note inspected their retained handoff/index metadata;
it performed no CUDA workload or new device query. Private authority and host
records are retained without publication here.

This sidecar does **not** establish compatibility with current87 source or the
later audio-ring proposal. It supplies no GUI, gameplay, native 250 ms target,
GPU performance, formal-proof or compiler-adoption result. The accepted compiler
pin and all historical failures remain unchanged.
