Review disposition: accepted
v1 SHA256: 3eda1736f2f72aa67f218748ae9bd4d3d8080aa54952ee27393d455838faa532
v2 SHA256: 6c0c42c22eadad6075f590d6e96292232124d009351683bbe7f1bc4abc453e5b
mutations SHA256: f1efac82d9fa610f15d88e623c2538e14535e9baa08425dd73e6281f58df774a
library SHA256: 67df3f4821b7e087b09a05e503e19334728c018ec7c9ad14f78b37f02b98e4ad
build SHA256: 55b7e15754bf6c430e7107437b912372ece3b479b686e5e76862d936a41814fd

The exact frozen drift is loader.ts and mutate-v2.mjs, both substitutable
tool inputs named in the spec. The loader relocates only simple pinned Base
effect twins; project foreign imports remain untouched. The mutator change
adds every file in the immutable v2 manifest to its hash snapshot. Its six
mutation cases, positive checks, rejection predicate and proof sources are
unchanged; all six positive/negative controls passed with current hashes.
This closes the omitted-loader receipt gap without weakening a law.

Current v1/v2/mutation hashes match source bytes, the library checks passed,
and the draft build assets match its receipt. The previous bounded Base effect
and project-collision checks remain applicable. This is tooling evidence; the
dirty draft build and these receipts do not prove hosted or native execution,
GPU performance, or owner visual acceptance.
