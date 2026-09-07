import './style.css';
import { BoardScene } from './render/scene';
import { Game } from './match/game';
import { inCheck, legalActions, macroName, macroOfSquare, present, pieceType, shiftReason, squareName } from './engine/position';
import type { Action, DrawPolicy, GameRecord, Position } from './engine/types';
import { consumeLoadNotice, defaultPreferences, exportSave, importSave, loadSave, persistSave, type Preferences, type SaveEnvelope } from './persistence';
import conformance from '../fixtures/conformance.json';

type Mode = 'hotseat' | 'bot-white' | 'bot-black';
type Tutorial = 'ordinary' | 'emptyShift' | 'loadedShift' | 'cutCheck';
const app = document.querySelector<HTMLElement>('#app')!;

app.innerHTML = `
  <header class="topbar"><a class="brand" href="#home" aria-label="Rift Chess home"><span>RIFT</span> CHESS</a>
    <div class="top-actions"><button id="new-game" class="brass">New game</button><button id="undo" title="Practice undo">Undo</button><a class="text-link" href="./rules.html">Rules</a><button id="settings" aria-haspopup="dialog">Settings</button></div></header>
  <main class="game-shell"><aside class="left-rail panel" aria-label="Match details">
    <p class="eyebrow">LOCAL MATCH</p><h1 id="turn">White to move</h1><p id="check" class="status" aria-live="polite">Opening position</p><button id="bot-retry" hidden>Retry opponent</button>
    <div class="counter"><span>Quiet actions</span><strong id="quiet">0 / 100</strong></div><p id="policy" class="muted">Prompted agreement</p>
    <div id="quiet-prompt" class="quiet-prompt" hidden><p id="quiet-message"></p><button id="quiet-dismiss">Dismiss reminder</button></div><div id="draw-area" class="draw-area"></div><button id="resign" class="subtle">Resign match</button>
    <div class="rule"></div><p class="eyebrow">CAMERA</p><div class="camera-grid"><button data-camera="white">1 White</button><button data-camera="black">2 Black</button><button data-camera="overview">3 Overview</button><button data-camera="top">4 Top</button><button id="camera-home">Home view</button><button id="orbit-left">◀ Orbit</button><button id="orbit-right">Orbit ▶</button></div>
    <div class="rule"></div><button id="show-moves" aria-pressed="false">◎ Show moves <kbd>H</kbd></button><button id="shift-mode" aria-pressed="false">↔ Shift mode <kbd>S</kbd></button><button id="reveal" class="subtle">Hold to reveal</button><details id="legal-panel"><summary>Legal actions · reveal</summary><div id="legal-list"></div></details>
  </aside>
  <section class="board-area" aria-label="Rift Chess board"><div id="scene" tabindex="0" role="application" aria-label="3D Rift Chess board. Arrow keys move focus, Enter selects, S enters Shift mode."></div><div class="board-meta"><span id="selection" aria-live="polite">Select a piece or a tile to Shift.</span><button id="skip" class="subtle">Skip animation</button></div></section>
  <aside class="right-rail panel"><div class="history-head"><div><p class="eyebrow">GAME RECORD</p><h2>Moves</h2></div><button id="replay" aria-pressed="false">Replay</button></div><ol id="history" class="history" aria-label="Move history"></ol><div id="replay-controls" class="replay-controls" hidden><button id="replay-back">‹ Previous</button><span id="replay-position"></span><button id="replay-next">Next ›</button><button id="replay-exit">Exit replay</button></div><div class="rule"></div><p class="eyebrow">LESSONS</p><div class="tutorials"><button data-tutorial="ordinary">01 · Find a move</button><button data-tutorial="emptyShift">02 · Shift an empty tile</button><button data-tutorial="loadedShift">03 · Carry one passenger</button><button data-tutorial="cutCheck">04 · Cut a checking ray</button></div><div class="footer-links"><button id="export">Export</button><label class="import" tabindex="0" role="button" aria-label="Import saved game">Import<input id="import" type="file" accept="application/json,.json" /></label><a href="./support.html">Support</a></div></aside>
  </main>
  <footer><span>Rift Chess · offline local play</span><button id="about">About & credits</button></footer>
  <dialog id="new-dialog" class="dialog"><form method="dialog"><div class="dialog-title"><p class="eyebrow">NEW MATCH</p><button value="cancel" aria-label="Close">×</button></div><h2>Set the table</h2><fieldset><legend>Players</legend><label><input type="radio" name="mode" value="hotseat" checked /> Hotseat</label><label><input type="radio" name="mode" value="bot-black" /> Play White vs bot</label><label><input type="radio" name="mode" value="bot-white" /> Play Black vs bot</label></fieldset><fieldset><legend>Opening layout</legend><label><input type="radio" name="layout" value="B" /> B-rift</label><label><input type="radio" name="layout" value="C" /> C-rift</label><label><input type="radio" name="layout" value="random" checked /> Random B / C</label></fieldset><fieldset><legend>Quiet-action policy</legend><label><input type="radio" name="draw" value="prompt" checked /> Prompted agreement</label><label><input type="radio" name="draw" value="auto100" /> Automatic at 100</label><label><input type="radio" name="draw" value="off" /> No reminder</label></fieldset><label class="checkline"><input id="practice" type="checkbox" checked /> Practice match — allow undo</label><p class="muted">Bot offers are declined in this first local version.</p><button id="start-game" class="brass" value="start">Start match</button></form></dialog>
  <dialog id="promotion-dialog" class="dialog promotion"><form method="dialog"><p class="eyebrow">PROMOTION</p><h2>Choose the new piece</h2><div><button value="Q">Queen</button><button value="R">Rook</button><button value="B">Bishop</button><button value="N">Knight</button></div></form></dialog>
  <dialog id="about-dialog" class="dialog"><form method="dialog"><div class="dialog-title"><p class="eyebrow">RIFT CHESS</p><button value="close">×</button></div><h2>Chess on moving ground.</h2><p>Designed and built as an offline, local game. The rules are Rift Chess 1.0.</p><p>The xkcd reference is credited as a link, not bundled artwork: <a href="https://xkcd.com/3139/" target="_blank" rel="noreferrer">xkcd #3139</a>. Built with Astra-assisted development and original procedural geometry.</p><p><a href="./guide.html">How to play</a> · <a href="./support.html">Support</a> · <a href="./licenses.txt">Licenses</a></p><button class="brass" value="close">Close</button></form></dialog>
  <div id="notice" role="status" aria-live="polite"></div>`;

const $ = <T extends HTMLElement>(id: string) => document.querySelector<T>(`#${id}`)!;
const sceneHost = $('scene'); const turn = $('turn'); const check = $('check'); const quiet = $('quiet'); const history = $('history');
const selection = $('selection'); const notice = $('notice'); const drawArea = $('draw-area'); const replayControls = $('replay-controls');
let preferences: Preferences = { ...defaultPreferences };
let mode: Mode = 'hotseat'; let practice = true; let game = new Game(Math.random() < 0.5 ? 'B' : 'C', 'prompt');
let scene: BoardScene; let selectedSquare: number | null = null; let selectedTile: number | null = null; let shiftMode = false; let animating = false;
let replayIndex: number | null = null; let promptEpisodes = { white: false, black: false }; let bot: Worker | null = null;
let revealHeld = false; let keyboardSquare = 0; let tutorial: Tutorial | null = null;
let noticeTimer = 0;
let controlActor: 1 | -1 | null = null;
let botFailed = false;

function say(message: string): void { notice.textContent = message; clearTimeout(noticeTimer); noticeTimer = window.setTimeout(() => { notice.textContent = ''; }, 5000); }
function labels(action: Action): string { return `${action.type === 'shift' ? 'Shift ' : ''}${action.from} → ${action.to}${action.promotion ? `=${action.promotion}` : ''}`; }
function visiblePosition(): Position { return replayIndex === null ? game.state : game.states[replayIndex] ?? game.state; }
function boardLocked(): boolean { return animating || replayIndex !== null || game.observe().outcome !== null || isBotTurn(); }
function isBotTurn(): boolean { return (mode === 'bot-white' && game.state.side === 1) || (mode === 'bot-black' && game.state.side === -1); }
function policyLabel(policy: DrawPolicy): string { return policy === 'prompt' ? 'Prompted agreement' : policy === 'auto100' ? 'Automatic at 100' : 'No quiet-action reminder'; }

function save(): void {
  const issue = persistSave({ schema: 'rift-ui-save/1', record: game.exportRecord(), preferences, mode, practice, promptEpisodes });
  if (issue) say(issue);
}
function renderScene(previous?: Position, action?: Action): void {
  const position = visiblePosition();
  scene.setHighlights({ selectedSquare, selectedTile, legalActions: replayIndex === null ? game.legalActions() : [], showMoves: preferences.showMoves || revealHeld, showShifts: preferences.showShifts, focusSquare: selectedSquare ?? (document.activeElement === sceneHost ? keyboardSquare : null) });
  const maybe = previous && action && replayIndex === null ? scene.setPosition(position, { previous, action }) : scene.setPosition(position);
  if (maybe && typeof (maybe as Promise<void>).then === 'function') {
    animating = true; maybe.finally(() => { animating = false; refresh(); });
  }
}
function refresh(): void {
  const observation = game.observe(); const position = visiblePosition();
  sceneHost.setAttribute('aria-busy', String(animating || (replayIndex === null && isBotTurn() && !observation.outcome)));
  const side = position.side === 1 ? 'White' : 'Black';
  const opening = game.initial.holes === 544 ? 'B-rift' : game.initial.holes === 1088 ? 'C-rift' : 'Practice';
  document.querySelector('.left-rail .eyebrow')!.textContent = `${mode === 'hotseat' ? 'HOTSEAT' : 'LOCAL BOT'} · ${opening}`;
  const finished = replayIndex === null || replayIndex === game.actions.length ? observation.outcome : null;
  turn.textContent = replayIndex !== null ? `Replay · ${replayIndex} of ${game.actions.length}` : finished ? (finished.result === 'draw' ? 'Draw' : finished.winner === 1 ? 'White wins' : 'Black wins') : `${side} to move${isBotTurn() ? botFailed ? ' · bot paused' : ' · bot thinking' : ''}`;
  const checked = inCheck(position, position.side); check.textContent = finished ? `${finished.reason.replaceAll('_', ' ')}` : checked ? `${side} is in check` : 'Position steady';
  check.classList.toggle('danger', checked || Boolean(finished)); quiet.textContent = `${position.halfmove} / 100`; quiet.closest('.counter')!.toggleAttribute('hidden', game.draw_policy === 'off'); $('policy').textContent = policyLabel(game.draw_policy);
  $('show-moves').setAttribute('aria-pressed', String(preferences.showMoves)); $('shift-mode').setAttribute('aria-pressed', String(shiftMode));
  $('undo').toggleAttribute('disabled', !(practice && !animating && replayIndex === null && game.actions.length));
  history.replaceChildren(...game.actionMetadata.map((action: Action, index: number) => { const li = document.createElement('li'); li.textContent = `${index + 1}. ${labels(action)}`; if (replayIndex === index + 1) li.className = 'current'; return li; }));
  $('bot-retry').hidden = !botFailed || !isBotTurn() || Boolean(finished);
  drawArea.replaceChildren(); renderDrawControls(observation.draw_offer, observation.outcome !== null);
  replayControls.hidden = replayIndex === null; $('replay').setAttribute('aria-pressed', String(replayIndex !== null)); $('replay-position').textContent = replayIndex === null ? '' : `${replayIndex} / ${game.actions.length}`;
  if (finished || position.halfmove < 100 || game.draw_policy !== 'prompt' || replayIndex !== null) $('quiet-prompt').hidden = true;
  if (!finished && replayIndex === null && game.draw_policy === 'prompt' && position.halfmove >= 100) maybeQuietPrompt(localActor());
  scene.setHighlights({ selectedSquare, selectedTile, legalActions: replayIndex === null ? game.legalActions() : [], showMoves: preferences.showMoves || revealHeld, showShifts: preferences.showShifts, focusSquare: selectedSquare ?? (document.activeElement === sceneHost ? keyboardSquare : null) });
  $('legal-list').replaceChildren(...(replayIndex === null ? game.legalActions() : []).map(action => { const button = document.createElement('button'); button.textContent = labels(action); button.disabled = boardLocked(); button.onclick = () => { void chooseAction([action]); }; return button; }));
}
function localActor(): 1 | -1 { return mode === 'bot-black' ? 1 : mode === 'bot-white' ? -1 : controlActor ?? game.state.side; }
function renderDrawControls(offer: number | null, finished: boolean): void {
  if (finished || replayIndex !== null) return;
  if (mode === 'hotseat') {
    const choice = document.createElement('select'); choice.setAttribute('aria-label', 'Match controls for');
    for (const side of [1, -1] as const) choice.add(new Option(side === 1 ? 'White' : 'Black', String(side)));
    choice.value = String(localActor()); choice.onchange = () => { controlActor = Number(choice.value) as 1 | -1; };
    const label = document.createElement('label'); label.textContent = 'Match controls for'; label.append(choice); drawArea.append(label);
  }
  if (offer === null) {
    const button = document.createElement('button'); button.textContent = 'Offer draw';
    button.onclick = () => { game.offerDraw(localActor()); if (mode !== 'hotseat') declineBotOffer(); else { save(); refresh(); } };
    drawArea.append(button); return;
  }
  const message = document.createElement('p'); message.className = 'muted'; message.textContent = `${offer === 1 ? 'White' : 'Black'} offers a draw.`; drawArea.append(message);
  if (mode === 'hotseat') {
    const actor = offer === 1 ? -1 : 1;
    for (const [text, action] of [['Accept', () => game.acceptDraw(actor)], ['Decline', () => game.declineDraw(actor)]] as const) {
      const button = document.createElement('button'); button.textContent = `${text} as ${actor === 1 ? 'White' : 'Black'}`;
      button.onclick = () => { action(); save(); refresh(); }; drawArea.append(button);
    }
  }
}
function declineBotOffer(): void { if (game.draw_offer !== null && mode !== 'hotseat') { game.declineDraw(game.draw_offer === 1 ? -1 : 1); save(); refresh(); say('The local bot declines draw offers.'); if (isBotTurn()) askBot(); } }
function maybeQuietPrompt(side: number): void { const key = side === 1 ? 'white' : 'black'; if (promptEpisodes[key]) return; promptEpisodes[key] = true; $('quiet-message').textContent = `${side === 1 ? 'White' : 'Black'}: 100 quiet actions. You may offer a draw; play continues without agreement.`; $('quiet-prompt').hidden = false; save(); }

function tutorialSolved(action: Action, previous: Position): boolean {
  if (tutorial === 'ordinary') return action.type === 'move';
  if (tutorial === 'emptyShift') return action.type === 'shift' && previous.board.filter((piece, square) => macroOfSquare(square) === Number((action.from.charCodeAt(0) - 65) + (Number(action.from[1]) - 1) * 4) && piece !== 0).length === 0;
  if (tutorial === 'loadedShift') return action.type === 'shift' && previous.board.filter((piece, square) => macroOfSquare(square) === Number((action.from.charCodeAt(0) - 65) + (Number(action.from[1]) - 1) * 4) && piece !== 0).length === 1;
  return tutorial === 'cutCheck' && inCheck(previous, previous.side);
}
async function commit(action: Action, botAction = false): Promise<void> {
  if (animating || replayIndex !== null || game.observe().outcome !== null || (!botAction && isBotTurn())) return;
  const previous = game.state; const expected = game.revision; const gameId = game.game_id;
  try { game.step(action.id, expected, gameId); } catch (error) { say(error instanceof Error ? error.message : 'That action is no longer legal.'); refresh(); return; }
  const completedLesson = tutorialSolved(action, previous); controlActor = null; if (game.state.halfmove < 100) promptEpisodes = { white: false, black: false };
  selectedSquare = null; selectedTile = null; shiftMode = false; save(); animating = true;
  scene.setHighlights({ selectedSquare, selectedTile, legalActions: game.legalActions(), showMoves: preferences.showMoves || revealHeld, showShifts: preferences.showShifts, focusSquare: document.activeElement === sceneHost ? keyboardSquare : null });
  selection.textContent = `${labels(action)}. ${game.state.side === 1 ? 'White' : 'Black'} to move.`;
  try { await scene.setPosition(game.state, { previous, action }); } finally { animating = false; }
  if (game.game_id !== gameId) return;
  refresh(); if (completedLesson) { say('Lesson complete — that legal solution works.'); tutorial = null; } if (isBotTurn()) askBot();
}
function candidateActions(): Action[] { return legalActions(visiblePosition()); }
async function chooseAction(actions: Action[]): Promise<void> {
  if (!actions.length) { say('That is not a legal action.'); return; }
  if (actions.length === 1) { await commit(actions[0]); return; }
  const promotions = actions.filter((action) => action.promotion); if (promotions.length) {
    const identity = game.game_id; const revision = game.revision;
    const dialog = $('promotion-dialog') as HTMLDialogElement; dialog.returnValue = ''; dialog.showModal(); const choice = await new Promise<string>((resolve) => dialog.addEventListener('close', () => resolve(dialog.returnValue), { once: true }));
    if (identity !== game.game_id || revision !== game.revision) return;
    const action = promotions.find((item) => item.promotion === choice); if (action) await commit(action); return;
  }
  await commit(actions[0]);
}
function pick(square: number, tile: number): void {
  if (boardLocked()) return;
  const actions = candidateActions();
  if (shiftMode) {
    if (tile >= 0) {
      if (selectedTile === null) { const available = actions.some((action) => action.type === 'shift' && macroName(tile) === action.from); if (available) { selectedTile = tile; selection.textContent = `Shift ${macroName(tile)}: choose an adjacent hole.`; } else say(shiftReason(game.state, tile) ?? 'This tile cannot Shift now.'); }
      else { const source = selectedTile; chooseAction(actions.filter((action) => action.type === 'shift' && action.from === macroName(source) && action.to === macroName(tile))); }
    }
  } else if (square >= 0) {
    if (selectedSquare === null) { const available = actions.some((action) => action.type === 'move' && action.from === squareName(square)); if (available) { selectedSquare = square; selection.textContent = `${squareName(square)} selected; choose a destination.`; } else say('Choose one of your movable pieces.'); }
    else { const source = selectedSquare; chooseAction(actions.filter((action) => action.type === 'move' && action.from === squareName(source) && action.to === squareName(square))); }
  }
  refresh();
}
function resetBot(): void { bot?.terminate(); bot = null; botFailed = false; }
function askBot(): void {
  if (replayIndex !== null || !isBotTurn() || game.observe().outcome) return; resetBot(); try { bot = new Worker(new URL('./bot/worker.ts', import.meta.url), { type: 'module' }); } catch { botFailed = true; refresh(); say('The opponent could not start. Use Retry opponent.'); return; } const identity = { game_id: game.game_id, revision: game.revision };
  bot.onmessage = (event: MessageEvent<{ type?: string; action?: Action; game_id?: string; revision?: number; error?: string }>) => {
    const data = event.data; if (data.game_id !== game.game_id || data.revision !== game.revision) return; if (data.type === 'error') { resetBot(); botFailed = true; refresh(); say(data.error ?? 'The opponent paused. Use Retry opponent.'); return; }
    if (data.game_id !== game.game_id || data.revision !== game.revision || data.game_id !== identity.game_id || data.revision !== identity.revision || !data.action) return;
    const action = game.legalActions().find((item: Action) => item.id === data.action!.id); if (action) void commit(action, true);
  };
  bot.onerror = event => { event.preventDefault(); if (identity.game_id !== game.game_id || identity.revision !== game.revision) return; resetBot(); botFailed = true; refresh(); say('The opponent paused. Use Retry opponent.'); };
  bot.postMessage({ type: 'suggest', record: game.exportRecord(), ...identity, depth: 2, max_nodes: 4000, seed: game.revision + 17 }); refresh();
}
function startNew(layout: 'B' | 'C', draw: DrawPolicy, nextMode: Mode, nextPractice: boolean): void {
  resetBot(); controlActor = null; game = new Game(layout, draw); mode = nextMode; practice = nextPractice; tutorial = null; promptEpisodes = { white: false, black: false }; selectedSquare = selectedTile = null; shiftMode = false; replayIndex = null; save(); renderScene(); refresh(); if (isBotTurn()) askBot();
}
function openTutorial(which: Tutorial): void {
  const fixtureNames: Record<Tutorial, string> = { ordinary: 'opening_B', emptyShift: 'opening_B', loadedShift: 'shift_promotion', cutCheck: 'cut_check_ray' };
  try {
    const fixture = conformance.fixtures.find((entry) => entry.name === fixtureNames[which]); if (!fixture) throw new Error('Lesson fixture is missing.');
    resetBot(); game = Game.fromRecord(fixture.record as GameRecord); mode = 'hotseat'; practice = true; tutorial = which; replayIndex = null; selectedSquare = selectedTile = null; shiftMode = which !== 'ordinary'; save(); renderScene(); refresh();
    selection.textContent = which === 'ordinary' ? 'Lesson: make any legal ordinary move.' : which === 'emptyShift' ? 'Lesson: Shift any legal empty tile.' : which === 'loadedShift' ? 'Lesson: make a legal Shift with a passenger.' : 'Lesson: answer the checking ray with any legal move.';
  } catch { say('The lesson fixture could not be loaded.'); }
}
function restore(): void {
  const saved = loadSave(); const recoveryNotice = consumeLoadNotice(); if (!saved) { if (!recoveryNotice) save(); renderScene(); refresh(); if (recoveryNotice) say(recoveryNotice); return; }
  try { const restored = Game.fromRecord(saved.record); game = restored; preferences = { ...defaultPreferences, ...saved.preferences }; mode = saved.mode; practice = saved.practice; promptEpisodes = saved.promptEpisodes; applyPreferences(); renderScene(); refresh(); if (recoveryNotice) say(recoveryNotice); if (isBotTurn()) askBot(); } catch { say('A saved game was rejected; the corrupt record was left untouched.'); renderScene(); refresh(); }
}
function applyPreferences(): void { document.documentElement.dataset.contrast = String(preferences.highContrast); scene.configure(preferences); }

scene = new BoardScene(sceneHost, pick); applyPreferences(); restore();
$('bot-retry').onclick = askBot;
$('new-game').onclick = () => { const dialog = $('new-dialog') as HTMLDialogElement; dialog.returnValue = ''; dialog.showModal(); };
$('new-dialog').addEventListener('close', () => { const dialog = $('new-dialog') as HTMLDialogElement; if (dialog.returnValue !== 'start') return; const modeChoice = new FormData(dialog.querySelector('form')!).get('mode') as Mode; const rawLayout = new FormData(dialog.querySelector('form')!).get('layout') as 'B' | 'C' | 'random'; const layout = rawLayout === 'random' ? (Math.random() < .5 ? 'B' : 'C') : rawLayout; startNew(layout, new FormData(dialog.querySelector('form')!).get('draw') as DrawPolicy, modeChoice, ($('practice') as HTMLInputElement).checked); });
$('undo').onclick = () => { if (!practice || animating || replayIndex !== null) return; if (mode === 'hotseat' && !window.confirm('Do both players agree to undo the last action?')) return; resetBot(); try { game.undo(); while (mode !== 'hotseat' && game.actions.length && isBotTurn()) game.undo(); if (game.state.halfmove < 100) promptEpisodes = { white: false, black: false }; save(); selectedSquare = selectedTile = null; renderScene(); refresh(); if (isBotTurn()) askBot(); } catch (error) { say(error instanceof Error ? error.message : 'Nothing to undo.'); } };
$('resign').onclick = () => { const actor = localActor(); if (replayIndex !== null || game.observe().outcome || !window.confirm(`Resign as ${actor === 1 ? 'White' : 'Black'}?`)) return; game.resign(actor); resetBot(); scene.skipAnimation(); save(); refresh(); say('Match resigned.'); };
$('show-moves').onclick = () => { preferences.showMoves = !preferences.showMoves; save(); refresh(); };
$('shift-mode').onclick = () => { shiftMode = !shiftMode; selectedSquare = selectedTile = null; selection.textContent = shiftMode ? 'Shift mode: select a legal tile.' : 'Select a piece or a tile to Shift.'; refresh(); };
$('reveal').onpointerdown = () => { revealHeld = true; refresh(); }; $('reveal').onpointerup = $('reveal').onpointerleave = () => { revealHeld = false; refresh(); };
document.querySelectorAll<HTMLButtonElement>('[data-camera]').forEach((button) => button.onclick = () => scene.setCamera(button.dataset.camera as 'white' | 'black' | 'overview' | 'top'));
$('camera-home').onclick = () => scene.setCamera('white'); $('orbit-left').onclick = () => scene.orbit(-.15, 0); $('orbit-right').onclick = () => scene.orbit(.15, 0); $('skip').onclick = () => { scene.skipAnimation(); animating = false; refresh(); };
$('quiet-dismiss').onclick = () => { $('quiet-prompt').hidden = true; };
$('replay').onclick = () => { resetBot(); replayIndex = replayIndex === null ? game.actions.length : null; selectedSquare = selectedTile = null; renderScene(); refresh(); if (replayIndex === null && isBotTurn()) askBot(); }; $('replay-back').onclick = () => { replayIndex = Math.max(0, (replayIndex ?? 0) - 1); renderScene(); refresh(); }; $('replay-next').onclick = () => { replayIndex = Math.min(game.actions.length, (replayIndex ?? 0) + 1); renderScene(); refresh(); }; $('replay-exit').onclick = () => { replayIndex = null; renderScene(); refresh(); if (isBotTurn()) askBot(); };
$('export').onclick = () => { try { const url = URL.createObjectURL(new Blob([exportSave({ schema: 'rift-ui-save/1', record: game.exportRecord(), preferences, mode, practice, promptEpisodes })], { type: 'application/json' })); const link = document.createElement('a'); link.href = url; link.download = 'rift-chess-save.json'; link.click(); URL.revokeObjectURL(url); } catch (error) { say(error instanceof Error ? error.message : 'Could not export save.'); } };
($('import') as HTMLInputElement).onchange = async (event) => { const file = (event.target as HTMLInputElement).files?.[0]; if (!file || file.size > 1_000_000) return say('Choose a Rift save under 1 MB.'); try { const saved = importSave(await file.text()); const loaded = Game.fromRecord(saved.record); resetBot(); selectedSquare = selectedTile = null; shiftMode = false; revealHeld = false; controlActor = null; tutorial = null; game = loaded; preferences = { ...defaultPreferences, ...saved.preferences }; mode = saved.mode; practice = saved.practice; promptEpisodes = saved.promptEpisodes; replayIndex = null; applyPreferences(); save(); renderScene(); refresh(); if (isBotTurn()) askBot(); } catch { say('That file is not a valid Rift Chess save. Your current game was kept.'); } };
$('about').onclick = () => ($('about-dialog') as HTMLDialogElement).showModal(); document.querySelectorAll<HTMLButtonElement>('[data-tutorial]').forEach((button) => button.onclick = () => openTutorial(button.dataset.tutorial as Tutorial));
$('settings').onclick = () => { const dialog = document.createElement('dialog'); dialog.className = 'dialog'; dialog.innerHTML = `<form method="dialog"><div class="dialog-title"><p class="eyebrow">ATELIER SETTINGS</p><button value="close">×</button></div><h2>Appearance & access</h2><label>Environment<select name="theme"><option value="gallery">Gallery</option><option value="nocturne">Nocturne</option><option value="daylight">Daylight</option></select></label><label>Pieces<select name="family"><option value="classic">Classic</option><option value="faceted">Faceted</option></select></label><label>Material<select name="material"><option value="ceramic">Ceramic</option><option value="metal">Metal</option><option value="wood">Wood</option></select></label><label>Quality<select name="quality"><option value="low">Low</option><option value="balanced">Balanced</option><option value="high">High</option></select></label><label class="checkline"><input name="motion" type="checkbox" /> Reduced motion</label><label class="checkline"><input name="contrast" type="checkbox" /> High contrast</label><button class="brass" value="apply">Apply</button></form>`; document.body.append(dialog); const form = dialog.querySelector('form')!; for (const [key, value] of Object.entries(preferences)) { const input = form.elements.namedItem(key === 'reducedMotion' ? 'motion' : key === 'highContrast' ? 'contrast' : key) as HTMLInputElement | null; if (input) input.type === 'checkbox' ? input.checked = Boolean(value) : input.value = String(value); } dialog.addEventListener('close', () => { if (dialog.returnValue === 'apply') { const data = new FormData(form); preferences = { ...preferences, theme: data.get('theme') as Preferences['theme'], family: data.get('family') as Preferences['family'], material: data.get('material') as Preferences['material'], quality: data.get('quality') as Preferences['quality'], reducedMotion: data.has('motion'), highContrast: data.has('contrast') }; applyPreferences(); save(); refresh(); } dialog.remove(); }); dialog.showModal(); };
sceneHost.addEventListener('keydown', (event) => { const key = event.key.toLowerCase(); if (key === 'h') { revealHeld = true; refresh(); return; } if (key === 's') { $('shift-mode').click(); return; } if (event.key === 'Home') { scene.setCamera('white'); return; } if (/^[1-4]$/.test(event.key)) { scene.setCamera((['white', 'black', 'overview', 'top'] as const)[Number(event.key) - 1]); return; } if (event.key === 'Escape') { selectedSquare = selectedTile = null; shiftMode = false; refresh(); return; } if (event.key === 'Enter') { pick(keyboardSquare, shiftMode ? macroOfSquare(keyboardSquare) : -1); return; } const delta: Record<string, number> = { arrowleft: -1, arrowright: 1, arrowup: 8, arrowdown: -8 }; if (key in delta) { const next = keyboardSquare + delta[key]; if (next >= 0 && next < 64 && (key !== 'arrowleft' || keyboardSquare % 8 !== 0) && (key !== 'arrowright' || keyboardSquare % 8 !== 7)) { keyboardSquare = next; selection.textContent = `${squareName(keyboardSquare)}: ${!present(game.state, keyboardSquare) ? 'hole' : !game.state.board[keyboardSquare] ? 'empty' : (game.state.board[keyboardSquare] > 0 ? 'White ' : 'Black ') + ['', 'pawn', 'knight', 'bishop', 'rook', 'queen', 'king'][pieceType(game.state.board[keyboardSquare])]}. Press Enter to select.`; refresh(); } event.preventDefault(); } });
sceneHost.addEventListener('keyup', (event) => { if (event.key.toLowerCase() === 'h') { revealHeld = false; refresh(); } });
window.addEventListener('beforeunload', save);
window.addEventListener('pagehide', event => { resetBot(); if (!event.persisted) scene.dispose(); });
window.addEventListener('pageshow', event => { if (event.persisted && isBotTurn()) askBot(); });
window.addEventListener('blur', () => { revealHeld = false; refresh(); });

// Deliberately diagnostic-only: it exposes observation and fixture loading without bypassing Game.step.
function loadScenario(input: GameRecord | Position): void { resetBot(); game = 'schema' in input ? Game.fromRecord(input) : new Game('B', 'prompt', input); mode = 'hotseat'; practice = true; tutorial = null; replayIndex = null; selectedSquare = selectedTile = null; renderScene(); refresh(); }
(window as Window & { rift?: unknown }).rift = { getObservation: () => game.observe(), getLegalActions: () => game.legalActions(), exportRecord: () => game.exportRecord(), loadScenario, loadTutorial: openTutorial, metrics: () => ({ ...scene.metrics(), revision: game.revision, actions: game.actions.length, animating, selectedSquare, selectedTile, shiftMode }), squareScreenPosition: (square: number) => scene.squareScreenPosition(square), resetMetrics: () => scene.resetMetrics() };

if (import.meta.env.PROD && location.protocol !== 'rift:' && 'serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(() => say('Offline browser caching is unavailable. Export your save before leaving.'));
}

document.querySelectorAll<HTMLAnchorElement>('a[href^="https:"]').forEach(link => link.addEventListener('click', event => { const bridge = (window as Window & { riftDesktop?: { openExternal(url: string): Promise<void> } }).riftDesktop; if (bridge) { event.preventDefault(); void bridge.openExternal(link.href).catch(() => say('This external link could not be opened.')); } }));

document.querySelector('.import')!.addEventListener('keydown', event => { const key = (event as KeyboardEvent).key; if (key === 'Enter' || key === ' ') { event.preventDefault(); ($('import') as HTMLInputElement).click(); } });
