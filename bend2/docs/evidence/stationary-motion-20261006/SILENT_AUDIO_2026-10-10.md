# Silent audio routing candidate, 2026-10-10

Disposition: rejected; the product source and accepted compiler are unchanged.
No unit/integration tests or compiler/proof campaigns were added or executed.

The existing host opens an AudioContext synchronously inside the first input
handler. A private candidate constructed a silent sink during the genuine
pointer gesture, then asynchronously selected the default device. It rebundled
only the host and reused the authenticated current99 compiled workers/assets.
The [official Chrome sink API documentation](https://developer.chrome.com/blog/audiocontext-setsinkid?hl=en)
motivated the candidate; the API does not promise that its constructor avoids
synchronous device work.

One real e2-e4 journey per build in isolated contexts within one Chrome process
observed 379 ms baseline input-to-dispatch versus 88 ms for the first candidate.
Both scheduled the exact generated 3,192 mono Float32 samples at 24,000 Hz on the
default sink. Switching from the silent sink suspended the native context.
A revised candidate waited for native resume before allowing Sound scheduling.

One real e2-e4 journey in a fresh Chrome process then observed 376.6 ms
input-to-dispatch and a 355.4 ms silent constructor. The same context resumed and
scheduled exact PCM, but the earlier reduced input cost did not persist.
These finite observations have uncontrolled host load and cache effects;
there is no stable performance, physical audibility or cross-browser claim.
The earlier startup-preparation candidate remains rejected on its own evidence.

Private original receipts remain under the owned stationary-motion artifact tree:

| Receipt | SHA256 |
| --- | --- |
| current99-audio-journey-r1/result.json | 4ee4d783a6a770f9035bbdebb6c32179e8f9d43e59e6f6d738a6eb312b1aac5b |
| current99-audio-journey-r2/result.json | b52d7ae3955896e6f389fd40158fe6b00e74a92054e26f7ae82c35b38619ffa1 |
| current99-audio-supervisor-r1/terminal.json | cc4ba766bf47ee85e254f1ba8dfc53e097d63c2edad5ae3d704772740de26cc8 |
| current99-audio-supervisor-r2/terminal.json | 6b08776df0392826caf5078bd053732638fbd3bf423c97c15d6d90d6ec4084dd |

Both original Bun and Node processes exited zero; their retained native handles
closed, streams reached EOF, Chrome closed normally, and the enclosing Job
settled to its owner alone and closed. No forced cleanup or unknown closure
remains. Both private candidates stay unselected and unadopted.

The next implementation should move device setup off the critical input/frame
path or remove its synchronous cost using a supported host capability. Repeating
these unchanged runs does not answer that question. Full Rift proof, native and
compiler adoption obligations remain open; this experiment does not weaken them.
