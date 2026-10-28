# Linux native gameplay and saved-state restart — 2026-10-28

Owning review accepts the retained current99 **CPU** package's actual rendered
gameplay, camera input, routed PCM capture and saved-state application restart.
The post-input and restarted 1024×640 images were inspected: the white pawn is
on e4, Black is to move, and the board/camera agree with the saved state.

This uses the [previously reviewed native build](NATIVE_CPU_20261027.md), source
`a7eef47b5578d7e61445eb20b327c701b4c7db92`, with the reviewed Look/Scroll event
overlay. The unchanged package receipt is
`b5bd1ef2df87ca5020eb17d44f1c4a836ec0e8cc8518f266683cef8aa9d70031`;
the 6,216,184-byte ELF is
`e56f267e25437756d5206bf2ec4139dab8d8e8276b3c8c6c6117dc94c1fd2606`.
The existing Linux owner ran that exact ELF with `--gpu off` on the actual X11
desktop. No rebuild, compiler change or proof rerun was needed.

## Completed gameplay prefix

The r5 journey committed `MoveCommand {expected: 0, action: 3980}` (e2–e4),
then one wheel event changed saved zoom from 115 to 117. Saved yaw/pitch remained
345/67. The actual post-input image shows the resulting position.

The existing playback route's monitor supplied 48 kHz stereo S16_LE PCM. The
two-second idle capture had normalized RMS 0.006991; the three-second move
capture had RMS 0.016510 and overlapped the actual move input. This establishes
a move-associated captured signal on that shared route. It does not establish
physical audibility or exclude every unrelated source on the monitor.

The first app exited normally with code 0. The same-data relaunch also exited
normally with code 0, but the observer timed out while redundantly requesting
the pointer's already parked location using `mousemove --sync`. That happened
before the restart screenshot/readback. The original observer/outer exit was 1;
all original process groups settled. The partial result remains a failure with
its completed prefix preserved, rather than being relabeled a successful run.

The earlier r4 capture-mode failure also remains preserved. Resolving `arecord`
to its `aplay` executable had selected playback; r5 added explicit `-C` to the
same executable and did not change the installed audio configuration or route.

## Restart-only completion

A separately authorized r6 suffix launched the same ELF once against the exact
retained r5 data directory. It validated and preserved all four original save
and preference slot preimages before normal application writes. It sent no
mouse, keyboard or wheel input and performed no audio recapture.

After scheduled save replay, it captured the restarted frame and confirmed the
newest semantic save and preferences match the retained values, including the
single move 3980 and zoom 117. The app received its normal WM_DELETE_WINDOW
message and exited 0; the original Node and Python observer/outer also exited 0.
All 11 recorded processes settled. Package inputs and immutable r5 evidence
were unchanged. Only ordinary saved-slot framing advanced; original before and
after bytes remain in the evidence. Fresh claims were released by their owner.

## Original evidence

Windows independently verified every indexed file in both returned archives:
116 r5 files and 74 r6 files. Original records include source, events, streams,
process identities, save slots and PNGs; r5 also contains the raw PCM. They are
retained privately, without compiler, ELF or asset duplication.

| Original artifact | Bytes | SHA256 |
| --- | ---: | --- |
| r5 partial records archive | 1,018,587 | `c7c1940bd3ead5918615c17fc2e6a687884534bc788f700ac5613cd641a791c0` |
| r5 original result | 84,268 | `049a484a357110f037ecfe28102a46dd85cfad4f93f23a570f37068abbdd5a8f` |
| r5 post-input PNG | 460,098 | `963188466a875f9168f98d6cae6e854c009e1137bfd6d510b1ebf4ce586bc639` |
| r6 restart records archive | 493,560 | `fddf797b6e7141eade6887eeb4743d1a01b18236113e8ca22e50e4101c0276c7` |
| r6 original result | 49,383 | `38eee7b5e01bf3c9c60077bb6a246f218cf1d825e5211059f0dfb238f7be4d23` |
| r6 original outer result | 1,006 | `e45b9f6ce7d0372976e19d263f7c78ba44548296f4690bdfd81d1f49bc41c573` |
| r6 restarted PNG | 459,074 | `0bff2d6f5256bd261d3e4e0e41dbc00640919860d18842c76db4f53d847af39f` |

Acceptance is limited to this package and these actual native interactions.
It does not establish OS reboot persistence, physical audio output, GPU or
performance acceptance, broader visual approval, a new formal proof verdict,
or compiler adoption. The original CUDA-on 250 ms failure and historical stops
remain unchanged. Accepted Bend 2.0.27 is still the pin; 2.0.35 remains a candidate.
