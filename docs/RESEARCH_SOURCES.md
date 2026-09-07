# Research sources and how they were used

Accessed/rechecked while preparing this handoff on **2026-09-06**. These are primary design papers, official documentation and original project pages. Their role is to inform design and implementation; none certifies Rift Chess as balanced or fun. The documents paraphrase rather than reproduce source material.

## S1. Mechanics, dynamics and experience

Hunicke, LeBlanc and Zubek, **MDA: A Formal Approach to Game Design and Game Research** (2004).

- [Author-hosted paper](https://www.cs.northwestern.edu/~hunicke/pubs/MDA.pdf)
- [AAAI publication page](https://aaai.org/papers/ws04-04-001-mda-a-formal-approach-to-game-design-and-game-research/)

Use: separate a mechanical rule from its emergent behavior and intended experience; combine qualitative judgment with iterative testing. This motivated treating “how often agents Shift” as a diagnostic, not a direct enjoyment score.

## S2. Restricted play

Jaffe and collaborators, **Evaluating Competitive Game Balance with Restricted Play** (2012).

- [Author-hosted paper](https://homes.cs.washington.edu/~zoran/jaffe2012ecg.pdf)
- [AAAI publication page](https://ojs.aaai.org/index.php/AIIDE/article/view/12513)

Use: compare policies that avoid, require or favor an action to expose its strategic role. Rift's new audit follows this idea with deliberately shallow policies; it does not reproduce a published balance metric or claim that the agents cover the full strategy space.

## S3. Orthodox chess

FIDE, **Laws of Chess**, effective 1 January 2023, as listed in its handbook.

- [Official laws](https://handbook.fide.com/chapter/e012023)

Use: ordinary piece geometry, attacked-square semantics, castling and en passant. Rift's automatic threefold and configurable quiet-action-100 policies are deliberate variant rules, not a statement of full FIDE compliance.

## S4. Teaching and observation

Andersen and collaborators, **The Impact of Tutorials on Games of Varying Complexity** (CHI 2012).

- [Author-hosted paper](https://grail.cs.washington.edu/projects/game-abtesting/chi2012/chi2012.pdf)

Andersen and collaborators, **Gameplay Analysis through State Projection** (FDG 2010).

- [Author-hosted paper](https://grail.cs.washington.edu/projects/playtracer/fdg2010/fdg2010.pdf)

Use: motivate a short optional contextual tutorial and observation of actual player behavior. They do not establish this game's optimal tutorial duration, retention rate or target audience.

## S5. Three-dimensional rendering

Three.js official documentation:

- [Installation and local development](https://threejs.org/manual/en/installation.html)
- [Color management](https://threejs.org/manual/en/color-management.html)
- [OrbitControls](https://threejs.org/docs/pages/OrbitControls.html)
- [Renderer documentation](https://threejs.org/docs/)

Use: a local bundled development/build workflow, consistent linear/sRGB handling, controllable orbit behavior and explicit renderer selection. Pin the actual selected versions at implementation time; this handoff does not mandate that an arbitrary future latest release preserves all APIs.

## S6. Graphics resource lifecycle

Three.js, **How to dispose of objects**.

- [Official guidance](https://threejs.org/manual/en/how-to-dispose-of-objects.html)

Use: explicitly dispose replaced geometry, materials, textures and render targets during style changes/restarts. GPU lifecycle needs tests beyond ordinary garbage-collection assumptions.

## S7. Accessibility and motion

W3C WAI:

- [Understanding Animation from Interactions](https://www.w3.org/WAI/WCAG21/Understanding/animation-from-interactions)
- [CSS reduced-motion technique C39](https://www.w3.org/WAI/WCAG22/Techniques/css/C39)
- [JavaScript reduced-motion technique SCR40](https://www.w3.org/WAI/WCAG22/Techniques/client-side-script/SCR40)
- [WCAG 2.2](https://www.w3.org/TR/WCAG22/)

Use: optional nonessential motion, honoring system preference in both DOM and 3D animations, keyboard access, and signals that do not rely on color alone. This is design guidance, not a claim that an unbuilt client has achieved WCAG conformance.

## S8. Desktop packaging

Tauri official documentation:

- [Frontend integration](https://v2.tauri.app/start/frontend/)
- [Platform webviews](https://v2.tauri.app/reference/webview-versions/)
- [Windows installers and offline WebView2 choices](https://v2.tauri.app/distribute/windows-installer/)
- [Security capabilities](https://v2.tauri.app/security/capabilities/)
- [macOS code signing](https://v2.tauri.app/distribute/sign/macos/)

Electron official documentation:

- [Introduction](https://electronjs.org/docs/latest)
- [Security](https://electronjs.org/docs/latest/tutorial/security)

Use: distinguish a system-webview package from a bundled Chromium runtime; explicitly test offline installation and actual platform artifacts. Signing and distribution constraints should be reported, not hidden behind a blanket “free and cross-platform” promise. This package gives no legal advice about platform or asset licensing.

## S9. GitHub distribution and donations

GitHub official documentation:

- [About releases](https://docs.github.com/en/repositories/releasing-projects-on-github/about-releases)
- [Displaying a sponsor button](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/displaying-a-sponsor-button-in-your-repository)

Use: repository/release distribution rather than a gameplay backend, and a funding link using an actual confirmed destination. No GitHub account, repo, release or funding configuration was created in this handoff step.

## S10. Training termination and truncation

Farama/Gymnasium:

- [Handling time limits](https://gymnasium.farama.org/tutorials/gymnasium_basics/handling_time_limits/)
- [Terminated/Truncated step API explanation](https://farama.org/Gymnasium-Terminated-Truncated-Step-API)
- [Environment API](https://gymnasium.farama.org/api/env/)

Use: preserve the distinction between a real game ending and a training/simulation budget cutoff. The supplied reference is a custom local game API, not an implemented Gymnasium environment; the architecture leaves room for one.

## S11. Browser playtesting

OpenAI official resources:

- [Browser-game workflow](https://learn.chatgpt.com/use-cases/browser-games)
- [Browser tooling guidance](https://learn.chatgpt.com/docs/browser)
- [Introducing the Codex app](https://openai.com/index/introducing-the-codex-app/)

Playwright:

- [Visual comparisons](https://playwright.dev/docs/test-snapshots)

Use: require interaction with the real rendered application, screenshot inspection and iterative testing, while checking which tools actually exist in the implementing agent's environment. Tool availability is not a guarantee that any particular test has run. Snapshot differences depend on environment and need inspection.

## S12. Origin and related implementations

- [xkcd #3139, “Chess Variant”](https://xkcd.com/3139/)
- [xkcd license](https://xkcd.com/license.html)
- [Tommy Malcolm Pickles — Sliding Number Puzzle Chess](https://tommymalcolmpickles.github.io/Sliding-Number-Puzzle-Chess/)
- [Brian Makes Stuff — Sliding Chess](https://brianmakesstuff.ca/slidingchess/)

Use: acknowledge the original cartoon and prior implementations, inspect how differently the same premise can handle special rules, and avoid claims of exclusive originality. No artwork or implementation code from these sites is included in this package. The user-provided cartoon is intentionally not copied into a future code/asset license bundle.

## Internal evidence sources

- `research/legacy/*_summary.csv`: original supplied aggregates; 19 rows × 240 reported games. Raw old game traces were not supplied.
- `reference/legacy/`: original experiment runners, preserved for audit. They are not the final-policy runner.
- `reference/sliding_chess_sim.py`: original supplied generator, preserved unchanged.
- `research/fresh/games.json`: 120 newly run, complete final-rules action histories.
- `research/fresh/summary.json` and `.csv`: separate win/draw/truncation summaries.
- `research/fresh/metadata.json`: execution command, environment and source hashes.
- `research/fresh/test_receipt.txt`: actual test result.
- `research/fresh/verification.json`: replay/fixture/perft verification result.
- `fixtures/conformance.json`: fourteen named positions and 223 generated successor expectations.

These distinguish actual evidence from recommendations. Generated fixtures establish reference parity, not independent proof of the reference itself. Automated matches and browser-agent play must never be described as completed human studies.
