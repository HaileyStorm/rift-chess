# Current NativeV2 candidate closure: bounded Windows preflight

The public application source at `c30d312727a56f6b66b501dddf8038d317dfd946`
is unchanged through this documentation checkpoint for `NativeV2.bend`, its
application/UI/scene imports, assets, `build-native-v2.py`, and `TOOLCHAIN.json`.
The 2.0.28+006 browser candidate's isolated compiler copy is under the ignored
`run-1790581636033-9301fe54-319f-442c-b98e-5c83ce1dad4d/compiler/`.

On Windows, the tracked package builder's `source_closure(root, compiler)`
and `validate_assets(root)` functions were invoked read-only against that
copy. The recursive import closure visited 151 plain Bend/compiler source
files; 18 asset/manifest inputs validated into 10 package rows. The union
contained 169 input paths. SHA-256 of a UTF-8, key-sorted compact JSON map
of relative path to raw SHA-256 is
`36efc1fab190b02bdbb2d28b64033e386de0258911ad88fd5bc597c8955fa27f`.
Selected raw pins include `NativeV2.bend`
`29fc92d043aff032de13ceafad63ef4f101c72b08f93b7199c3ce40bd333cf6d`,
`ui/Actions.bend`
`9f7cd61c9d8458e95f098aa7ce7ea70e7841e082d27f4783ac6950e4340aa05b`,
`ui/v2/ChromeModel.bend`
`b709ebdbbd3173cd3c3afc7cb0b1a8cbad31ae69e4420b1b6a1a0a89cf934a64`,
art manifest `ae05d30f67b16883e6e19cc468de61191c71d429cfc5bc30dcd764cdf77e3c42`,
and font manifest `44d336e0509950edf6561efd52aab9e7e1b886bb5800443cb9be55b2fa79bc4e`.
This map covers the visited source and asset subset, not the package builder,
toolchain executable, every runtime tool, or a Linux byte-parity assertion.

The Windows host had approximately 5.085 GiB free of 15.675 GiB physical
memory at the preflight observation. No `NativeV2` checker, C emission, ELF,
GUI, PCM, restart or GPU work was attempted locally. Source/asset closure
validation is not Bend checking or native acceptance. The [separate Linux
request](https://github.com/HaileyStorm/Coordination/issues/1#issuecomment-5865910914)
and its [receipt-SHA correction](https://github.com/HaileyStorm/Coordination/issues/1#issuecomment-5865920136)
require independently bound Linux source/asset/compiler closure and two new
88 GiB admission samples before any one-attempt C emission.
