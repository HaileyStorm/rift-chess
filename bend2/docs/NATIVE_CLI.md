# Browser-independent Bend command-line game

`NativeCLI.bend` is a second Bend 2 entry point over the same frozen v2 chess
kernel and portable `rift-bend-record/1` codec as the pixel game. It accepts
native command-line arguments through Base `IO.args`, uses Base `File` for
records, and has no browser, DOM, Canvas, JavaScript game logic or server.
It is an ASCII interface; the complete Bend pixel UI remains in the browser
application. The graphical `Native.bend` source uses Base Window/Audio/File,
but its 2.0.27 WSL C emitter encountered `an arity over 255` without C output.
That failed attempt remains evidence, not a native GUI release.

From the repository root, the pinned Bun compiler checks and exports the CLI C
source with source hashes and the frozen v1/v2 and graphics manifests:

```powershell
node bend2/tools/export-native-cli.mjs
```

The command prints its timestamped `.artifacts/bend2/native-cli/` directory.
Inside are `rift-chess-native-cli.c`, `manifest.json`, SHA-256 checksums and
the exact source-check/emission logs. Keep the manifest, `TOOLCHAIN.json`,
`THIRD_PARTY_NOTICES.txt` and Bend Apache-2.0 license beside the C artifact.
Emitted C is browser-independent. The pinned upstream Bend toolchain does not
support a Windows-native target. The 2.0.27 CLI was built and executed as an
x86-64 Linux ELF in WSL Ubuntu on this laptop, using Clang 18.1.3 and this CPU
link shape:

```sh
# Linux, clang 18 as tested (upstream supports clang 14+)
clang-18 -std=c11 -O2 rift-chess-native-cli.c -lpthread -lm -o rift-chess-native-cli

# macOS, Apple clang
clang -x objective-c -fobjc-arc -fmodules -std=c11 -O3 \
  rift-chess-native-cli.c -lpthread -lm -o rift-chess-native-cli
```

Use a dedicated working directory for each local game, or set
`RIFT_CHESS_SAVE_DIR` to a dedicated directory. The entry point takes one
command from `IO.args` per invocation; the pinned Base API has no terminal
line-input effect. Each invocation reads
the two rotating `rift-chess-cli-a.json` and `rift-chess-cli-b.json` snapshots,
validates and replays the accepted commands through v2, applies at most the
requested command, and writes the inactive slot with an incremented sequence.
An incomplete newer slot leaves the older valid record available. An unreadable
or invalid existing record is an error, never silently treated as a fresh game.
The embedded portable record uses the same layout/policy/action command format
as the browser; the enclosing slot format adds interruption recovery.

```text
rift-chess-native-cli new B prompt
rift-chess-native-cli show
rift-chess-native-cli moves
rift-chess-native-cli move <listed-legal-id>
rift-chess-native-cli shift <listed-legal-id>
rift-chess-native-cli undo confirm
rift-chess-native-cli offer
rift-chess-native-cli accept
rift-chess-native-cli decline
rift-chess-native-cli resign
rift-chess-native-cli help
```

`new` also accepts layout `C` and draw policies `auto` or `off`. `offer` and
`resign` accept an optional `white` or `black` actor even off-turn; without an
actor, the side to move is chosen. The opposite side responds to an offer.
The move list
contains ordinary moves, promotions and platform Shifts with IDs to enter;
the application checks the side, revision and full position before committing.
In shared-device hotseat play, `undo confirm` represents both players' consent;
it does not authenticate remote people. There is no network multiplayer or
trusted-server assumption in the rules boundary.

The verified [Linux native receipt](evidence/native-cli-linux-2-0-27/receipt.json)
binds the 18 exact Bend/tool inputs, C SHA-256, linked ELF hash, two rotating
snapshots and a real six-sequence playthrough. It exercised both colors' moves,
Undo, a White draw offer and Black acceptance. The final `moves` output says
**Draw by agreement** and lists no actions. The export was marked dirty because
this CLI display fix and unrelated graphics v2 drafts were present; the manifest
binds their exact input bytes. This is local WSL execution, not a packaged
release or a native graphical game.

This CLI does not open a native Audio device; the browser game synthesizes and
plays its Bend-generated sounds, while the experimental graphical Native source
has separate Base Audio code. Source checks, a C source export and this actual
Linux CPU launch are separate from a graphical binary, native CPU/GPU speed
benchmarks and owner visual acceptance. The browser game's rendered playtest
covers its pixel presentation; this CLI does not claim a native graphical renderer.

The pinned Base JavaScript File/IO effect implementation assumes POSIX
`libc.so.6`, so invoking this CLI's File effects through the JS target on
Windows fails before a game can run. The Windows source checker and C emitter
remain useful independent evidence; the supported-host CPU binary run above is
a separate, completed acceptance step for the CLI only.

The earlier 2.0.25 export from source `1a6d7d9c32dad19612327ac3eb3f1fd54a18ca07`
remains [available as C](https://haileystorm.github.io/rift-chess-bend2/rift-chess-native-cli-8fbb6fa79899.c)
(2,182,904 bytes; SHA-256
`8fbb6fa79899c1a31771ac62113d50cc3f3c99caa765a2ea658cf9ef201b4747`).
Its [source and compiler manifest](evidence/whole-app-v2/native-cli-export.json)
binds 18 inputs and the frozen v2 law hash. The Pages download matched that C
hash after deployment. WSL Ubuntu on the development laptop had no C compiler;
no native binary or file-effect playthrough was produced there.

The stage-two Bend 2.0.26 export from clean source
`78287a12b6b1098657096864b5193420789c249d` is
[available as C](https://haileystorm.github.io/rift-chess-bend2/rift-chess-native-cli-8b18ec876c91.c)
(2,176,663 bytes; SHA-256
`8b18ec876c91d2ac0794055ef1a44160a5eb9f91597f8fa3b81c0cdb26203e7b`).
Its [manifest](evidence/stage2-hosted/native-cli-export.json) binds the same
source and v2 law hash as the hosted browser build, and the live file matched
that C hash. This older export was not executed at that checkpoint; the newer
2.0.27 CLI receipt above records actual WSL binary execution.
