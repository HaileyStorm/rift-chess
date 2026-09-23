# Browser-independent Bend command-line game

`NativeCLI.bend` is a second Bend 2 entry point over the same frozen v2 chess
kernel and portable `rift-bend-record/1` codec as the pixel game. It accepts
native command-line arguments through Base `IO.args`, uses Base `File` for
records, and has no browser, DOM, Canvas, JavaScript game logic or server.
It is an ASCII interface; the complete Bend pixel UI remains in the browser
application. The graphical `Native.bend` source uses Base Window/Audio/File,
but its C emitter exceeded a bounded 600-second, roughly 3.1 GiB run on this
Windows host. That failed attempt remains evidence, not a native GUI release.

From the repository root, the pinned Bun compiler checks and exports the CLI C
source with source hashes and the frozen v1/v2 and graphics manifests:

```powershell
node bend2/tools/export-native-cli.mjs
```

The command prints its timestamped `.artifacts/bend2/native-cli/` directory.
Inside are `rift-chess-native-cli.c`, `manifest.json`, SHA-256 checksums and
the exact source-check/emission logs. Keep the manifest, `TOOLCHAIN.json`,
`THIRD_PARTY_NOTICES.txt` and Bend Apache-2.0 license beside the C artifact.
Emitted C is browser-independent; it is **not** a built or executed binary on
this Windows machine. The pinned upstream Bend toolchain does not support a
Windows native target. On a supported host with the required system headers,
the upstream CPU link shape is:

```sh
# Linux, clang 14+
clang -std=c11 -O3 rift-chess-native-cli.c -lpthread -lm -o rift-chess-native-cli

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

This CLI does not open a native Audio device; the browser game synthesizes and
plays its Bend-generated sounds, while the experimental graphical Native source
has separate Base Audio code. Source checks, a C source export and simulated
host runs are separate from a Linux/macOS binary launch, CPU/GPU speed and
owner visual acceptance. The browser game's rendered playtest covers its pixel
presentation; this CLI does not claim a native graphical renderer.

The pinned Base JavaScript File/IO effect implementation assumes POSIX
`libc.so.6`, so invoking this CLI's File effects through the JS target on
Windows fails before a game can run. The Windows source checker and C emitter
remain useful independent evidence; a supported-host binary run has its own
acceptance step.
