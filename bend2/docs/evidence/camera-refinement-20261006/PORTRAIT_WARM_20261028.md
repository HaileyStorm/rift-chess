# Hosted portrait and Warm journey — October 28, 2026

The published experimental version `e53a618a096cd55e091c` completed one real
390×844 portrait journey in Windows Chrome 156, headless, scale 1, with touch and
mobile emulation. This is desktop Chrome layout/input evidence, not a physical
phone or constrained-device performance result. No CPU throttling was applied.

Actual canvas taps opened Settings, selected Warm, closed Settings and played
e2–e4. The mobile plan rendered a 512×1024 canvas at 390×780 CSS pixels, centered
32 pixels below the viewport top, entirely within the viewport. Warm artwork,
piece silhouettes, controls and the saved Black-to-move position were visually
inspected. No clipping or unreachable control was observed in this journey.

The exact current service-worker cache and cached manifest matched public
manifest `f773225a8e4024e63b42064a08309ca6ba178d49658a1d8bcb0d57ae6adaa88c`.
An offline reload retained the exact saved record and preference text, the Warm
theme and displayed position. Page/console errors and failed requests were zero.
Original Chrome and parent processes exited 0; the owning Job settled and closed
without signals or forced cleanup.

| Original record | SHA256 |
| --- | --- |
| Successful portrait journey | `4ca0212fed231f07e0f9a04bd1f9b9b79d40e2a7c6d90e135637e81f9c8f2060` |
| Original-handle settlement | `7597052cbbc51c8b008f1a526d22cf9b1f6846e0665ae297307845c60d397843` |
| Offline position PNG | `cb0a8dcc12b713b16c1aa928cfa579e3eebd15d131c36adf79af638f375c9c8d` |

Private originals are retained under `portrait-warm-r2/` in the owning task's
artifact directory. The first run's observer failed to serialize a BigInt in
its layout metadata after writing its image. Its original exit 1, streams,
image and settled Job remain retained under `portrait-warm-r1/`; no successful
receipt was reconstructed. The successor changed only the JSON writer to
preserve BigInt explicitly, used fresh browser storage and completed normally.

No application, compiler, proof, native or GPU change occurred for this portrait
journey. It extends the [hosted browser evidence](PUBLIC_PREVIEW_20261028.md),
without a unit/integration suite or cross-device matrix. Stable latency,
memory-pressure behavior and physical-device acceptance remain open.
