import './style.css';
import { BoardScene } from './render/scene';
import { Game } from './match/game';
import { inCheck, macroIndex, macroName, macroOfSquare, macroSquares, present, pieceType, shiftReason, squareName } from './engine/position';
import type { Action, DrawPolicy, GameRecord, Position } from './engine/types';
import { consumeLoadNotice, defaultPreferences, exportSave, importSave, loadSave, persistSave, type Preferences, type SaveEnvelope } from './persistence';
import conformance from '../fixtures/conformance.json';

type Mode = 'hotseat' | 'bot-white' | 'bot-black';
type Tutorial = 'ordinary' | 'emptyShift' | 'loadedShift' | 'cutCheck';
type Intent = 'move' | 'shift';
type HitKind = 'piece' | 'tile' | 'shift';
type Presentation = 'launch' | 'explore' | 'play';
const app = document.querySelector<HTMLElement>('#app')!;

app.innerHTML = [
  '<header class="topbar"><a class="brand" href="#home"><span>RIFT</span><b>CHESS</b><i>moving ground · local play</i></a><div class="match-pulse"><span id="match-kind">LOCAL MATCH</span><strong id="turn">White to move</strong></div><nav class="top-actions"><button id="new-game" class="brass">New match</button><button id="undo">Undo</button><button id="settings">Atelier</button><a class="text-link" href="./rules.html">Rules</a></nav></header>',
  '<main class="game-shell"><section class="board-area" aria-label="Rift Chess board"><div class="scene-frame"><div id="scene" tabindex="0" role="application" aria-label="3D Rift Chess board. Arrow keys move focus. Enter selects. S selects Shift."></div><section id="launch-surface" class="launch-surface"><p class="eyebrow">THE KINETIC CHESS TABLE</p><h1>A board that<br><em>moves beneath you.</em></h1><p>Rift Chess is a local game of ordinary moves and deliberate shifts. Explore the table, then take your turn.</p><div class="launch-actions"><button id="launch-resume" class="brass">Resume match</button><button id="launch-new">Set a new match</button><button id="launch-explore" class="subtle">Explore the table</button></div><button id="launch-skip" class="skip-link">Skip view</button></section></div>',
  '<div class="turn-strip"><span id="check" class="status" aria-live="polite">Opening position</span><span class="quiet-readout">Quiet <strong id="quiet">0 / 100</strong></span><span id="policy" class="muted">Prompted agreement</span><button id="bot-retry" hidden>Retry opponent</button></div>',
  '<div id="quiet-prompt" class="quiet-prompt response-bar" hidden><p id="quiet-message"></p><button id="quiet-offer-draw">Offer draw</button><button id="quiet-dismiss">Dismiss reminder</button></div><div id="draw-response" class="response-bar" hidden><p id="draw-offer" class="muted" hidden></p><button id="accept-draw" hidden>Accept draw</button><button id="decline-draw" hidden>Decline draw</button></div>',
  '<section class="action-dock"><div class="intent-control" role="group" aria-label="Action type"><button id="move-mode" class="active" aria-pressed="true">Move</button><button id="shift-mode" aria-pressed="false">Shift <kbd>S</kbd></button></div><div class="selection-copy"><strong id="selection" aria-live="polite">Select a piece to move, or a tile handle to Shift.</strong><span id="selection-detail">Shift handles remain visible while ordinary move hints are hidden.</span></div><div class="commit-actions"><button id="shift-passenger" hidden>Shift this tile</button><button id="confirm-shift" class="brass" hidden>Confirm Shift</button><button id="cancel-selection" class="subtle" hidden>Cancel <kbd>Esc</kbd></button></div><button id="show-moves" class="subtle" aria-pressed="false">Show moves <kbd>H</kbd></button><button id="skip" class="subtle">Skip animation</button></section></section>',
  '<aside class="utility-deck" aria-label="Match tools"><details class="drawer" open><summary><span>Record</span><small id="record-count">0 actions</small></summary><div class="drawer-body"><div class="history-head"><span>Move history</span><button id="replay" aria-pressed="false">Replay</button></div><ol id="history" class="history"></ol><div id="replay-controls" class="replay-controls" hidden><button id="replay-back">‹ Previous</button><span id="replay-position"></span><button id="replay-next">Next ›</button><button id="replay-exit">Return to live match</button></div></div></details>',
  '<details class="drawer"><summary><span>Learn the rift</span><small>4 guided tables</small></summary><div class="drawer-body tutorials"><button data-tutorial="ordinary"><b>01</b> Find an ordinary move</button><button data-tutorial="emptyShift"><b>02</b> Shift an empty tile</button><button data-tutorial="loadedShift"><b>03</b> Carry one passenger</button><button data-tutorial="cutCheck"><b>04</b> Cut a checking ray</button><div class="learn-links"><a href="./guide.html">How to play</a><a href="./rules.html">Full rules</a><button id="about" class="subtle">About & credits</button></div></div></details>',
  '<details class="drawer"><summary><span>Match & view</span><small>camera, draws, saves</small></summary><div class="drawer-body tool-grid"><div class="camera-grid"><button data-camera="white">1 White</button><button data-camera="black">2 Black</button><button data-camera="overview">3 Overview</button><button data-camera="top">4 Top</button><button id="orbit-left">Orbit left</button><button id="orbit-right">Orbit right</button><button id="explore-table">Explore table</button></div><div id="draw-area" class="draw-area"><button id="offer-draw">Offer draw</button></div><button id="resign" class="subtle">Resign match</button><div class="save-row"><button id="export">Export</button><label class="import" tabindex="0" role="button">Import<input id="import" type="file" accept="application/json,.json" /></label><a href="./support.html">Support</a></div></div></details>',
  '<details id="legal-panel" class="drawer"><summary><span>Action ledger</span><small>legal actions</small></summary><div id="legal-list" class="drawer-body legal-list"></div></details></aside></main>',
  '<footer><span>Rift Chess · offline, local, and fully playable without an account</span></footer>',
  '<dialog id="new-dialog" class="dialog"><form method="dialog"><div class="dialog-title"><p class="eyebrow">NEW MATCH</p><button value="cancel">×</button></div><h2>Set the table</h2><p class="muted">Choose who moves, the rift layout, and when a quiet game may end.</p><fieldset><legend>Players</legend><label><input type="radio" name="mode" value="hotseat" checked> Hotseat</label><label><input type="radio" name="mode" value="bot-black"> Play White vs local bot</label><label><input type="radio" name="mode" value="bot-white"> Play Black vs local bot</label></fieldset><fieldset><legend>Opening layout</legend><label><input type="radio" name="layout" value="B"> B-rift</label><label><input type="radio" name="layout" value="C"> C-rift</label><label><input type="radio" name="layout" value="random" checked> Random B / C</label></fieldset><fieldset><legend>Quiet-action policy</legend><label><input type="radio" name="draw" value="prompt" checked> Ask both players at 100</label><label><input type="radio" name="draw" value="auto100"> Draw automatically at 100</label><label><input type="radio" name="draw" value="off"> Continue without a reminder</label></fieldset><label class="checkline"><input id="practice" type="checkbox" checked> Practice match — allow undo</label><p class="muted">A local bot declines draw offers; hotseat opponents can accept or decline here.</p><button id="start-game" class="brass" value="start">Start match</button></form></dialog>',
  '<dialog id="promotion-dialog" class="dialog promotion"><form method="dialog"><p class="eyebrow">PROMOTION</p><h2>Choose the new piece</h2><p class="muted">This choice is made before the move or Shift is committed.</p><div><button value="Q">Queen</button><button value="R">Rook</button><button value="B">Bishop</button><button value="N">Knight</button></div><button value="cancel" class="subtle">Cancel</button></form></dialog>',
  '<dialog id="settings-dialog" class="dialog"><form method="dialog"><div class="dialog-title"><p class="eyebrow">ATELIER</p><button value="close">×</button></div><h2>Appearance & access</h2><label>Environment<select name="theme"><option value="gallery">Gallery</option><option value="nocturne">Observatory</option><option value="daylight">Stone court</option></select></label><label>Pieces<select name="family"><option value="classic">Classic sculpture</option><option value="faceted">Faceted architecture</option></select></label><label>Material<select name="material"><option value="ceramic">Ceramic</option><option value="metal">Metal</option><option value="wood">Wood</option></select></label><label>Quality<select name="quality"><option value="low">Low</option><option value="balanced">Balanced</option><option value="high">High</option></select></label><label class="checkline"><input name="motion" type="checkbox"> Reduced motion</label><label class="checkline"><input name="contrast" type="checkbox"> High contrast</label><button class="brass" value="apply">Apply</button></form></dialog>',
  '<dialog id="about-dialog" class="dialog"><form method="dialog"><div class="dialog-title"><p class="eyebrow">RIFT CHESS</p><button value="close">×</button></div><h2>Chess on moving ground.</h2><p>Designed and built as an offline, local game. The rules are Rift Chess 1.0.</p><p>The xkcd reference is credited as a link, not bundled artwork: <a href="https://xkcd.com/3139/" target="_blank" rel="noreferrer">xkcd #3139</a>. Built with original procedural geometry.</p><p><a href="./guide.html">How to play</a> · <a href="./support.html">Support</a> · <a href="./licenses.txt">Licenses</a></p><button class="brass" value="close">Close</button></form></dialog><div id="notice" role="status" aria-live="polite"></div>'
].join('');
app.insertAdjacentHTML('beforeend', '<dialog id="actor-dialog" class="dialog actor-dialog"><form method="dialog"><p class="eyebrow">MATCH ACTION</p><h2 id="actor-dialog-title">Choose a side</h2><p id="actor-dialog-detail" class="muted"></p><div><button id="actor-white" value="white">White</button><button id="actor-black" value="black">Black</button></div><button value="cancel" class="subtle">Cancel</button></form></dialog>');
app.insertAdjacentHTML('beforeend', '<dialog id="undo-dialog" class="dialog" aria-labelledby="undo-title" aria-describedby="undo-detail"><form method="dialog"><p class="eyebrow">PRACTICE MATCH</p><h2 id="undo-title">Undo the last action?</h2><p id="undo-detail">Both players need to agree. The last move or Shift will be removed and the previous position restored.</p><button id="undo-confirm" class="brass" value="approve">Both agree — undo</button><button class="subtle" value="cancel" autofocus>Keep playing</button></form></dialog>');
app.querySelector('#launch-surface')!.insertAdjacentHTML('beforeend', '<div class="explore-return"><p class="eyebrow">TABLE STUDY</p><strong>Explore the moving board</strong><button id="launch-return" class="brass">Return to play</button></div>');
app.querySelector('.action-dock')!.insertAdjacentHTML('beforebegin', '<div id="lesson-status" class="response-bar" hidden><p id="lesson-message"></p><button id="lesson-return">Return to match</button></div>');

const $ = <T extends HTMLElement>(id: string) => document.querySelector<T>('#' + id)!;
const sceneHost = $('scene'), turn = $('turn'), check = $('check'), quiet = $('quiet'), history = $('history');
const selection = $('selection'), selectionDetail = $('selection-detail'), notice = $('notice'), replayControls = $('replay-controls');
let preferences: Preferences = { ...defaultPreferences };
let mode: Mode = 'hotseat', practice = true, game = new Game(Math.random() < 0.5 ? 'B' : 'C', 'prompt');
let scene: BoardScene, selectedSquare: number | null = null, selectedTile: number | null = null, previewTile: number | null = null, passengerTile: number | null = null;
let intent: Intent = 'move', animating = false, replayIndex: number | null = null, promptEpisodes = { white: false, black: false }, bot: Worker | null = null;
let revealHeld = false, keyboardSquare = 0, tutorial: Tutorial | null = null, noticeTimer = 0, botFailed = false;
let actionCache: { gameId: string; revision: number; actions: Action[] } | null = null, historyKey = '', legalKey = '';
let actorDialogAction: ((side: 1 | -1) => void) | null = null;
let pendingUndo: { gameId: string; revision: number } | null = null;
let lessonReturn: SaveEnvelope | null = null;
let sceneEpoch = 0;
let presentation: Presentation = 'launch';
let restoredExistingGame = false;
let boardReady = false;

function say(message: string): void { notice.textContent = message; clearTimeout(noticeTimer); noticeTimer = window.setTimeout(() => { notice.textContent = ''; }, 5000); }
function label(action: Action): string { return (action.type === 'shift' ? 'Shift ' : '') + action.from + ' → ' + action.to + (action.promotion ? '=' + action.promotion : ''); }
function visiblePosition(): Position { return replayIndex === null ? game.state : game.states[replayIndex] ?? game.state; }
function isBotTurn(): boolean { return (mode === 'bot-white' && game.state.side === 1) || (mode === 'bot-black' && game.state.side === -1); }
function humanSide(): 1 | -1 { return mode === 'bot-white' ? -1 : 1; }
function boardLocked(): boolean { return !boardReady || presentation !== 'play' || animating || replayIndex !== null || game.observe().outcome !== null || isBotTurn(); }
function policyLabel(policy: DrawPolicy): string { return policy === 'prompt' ? 'Prompted agreement' : policy === 'auto100' ? 'Automatic at 100' : 'No quiet-action reminder'; }
function actions(): Action[] { if (replayIndex !== null) return []; if (!actionCache || actionCache.gameId !== game.game_id || actionCache.revision !== game.revision) actionCache = { gameId: game.game_id, revision: game.revision, actions: game.legalActions() }; return actionCache.actions; }
function invalidateActions(): void { actionCache = null; }
function setPresentation(next: Presentation): void { presentation = next; app.dataset.presentation = next; $('launch-surface').dataset.presentation = next; $('launch-surface').hidden = next === 'play'; }
function enterPlay(skip = false): void { scene.enterPlay(skip || preferences.reducedMotion ? 0 : undefined); setPresentation('play'); try { sessionStorage.setItem('rift-launch-seen', '1'); } catch {} }
function exploreTable(): void { setPresentation('explore'); scene.showcase(); }
function clearSelection(message = 'Select a piece to move, or a tile handle to Shift.'): void { selectedSquare = null; selectedTile = null; previewTile = null; passengerTile = null; intent = 'move'; selection.textContent = message; selectionDetail.textContent = 'Shift handles remain visible while ordinary move hints are hidden.'; }
function reasonText(reason: string | null, tile: number): string {
  if (reason === 'occupancy') {
    const passengers = macroSquares(tile).map(square => game.state.board[square]).filter(Boolean);
    if (passengers.some(piece => Math.abs(piece) === 6)) return 'Kings are anchored: their tile cannot Shift.';
    if (passengers.length > 1) return `This tile carries ${passengers.length} pieces. A Shift can carry at most one.`;
    if (passengers.some(piece => piece * game.state.side < 0)) return 'That passenger belongs to your opponent. Only your own piece can travel with a Shift.';
  }
  return reason === 'hole' ? 'That is a hole, so there is no tile to Shift.' : reason === 'not_adjacent' ? 'This tile has no adjacent hole to move into.' : reason === 'king_safety' ? 'Moving this tile would leave your king unsafe.' : 'This tile cannot Shift in the current position.';
}
function currentTableSave(): SaveEnvelope { return { schema: 'rift-ui-save/1', record: game.exportRecord(), preferences: { ...preferences }, mode, practice, promptEpisodes: { ...promptEpisodes } }; }
function save(): void {
  const issue = persistSave(lessonReturn ? { ...lessonReturn, preferences: { ...preferences } } : currentTableSave());
  if (issue) say(issue);
}
function chooseActor(title: string, detail: string, action: (side: 1 | -1) => void): void { actorDialogAction = action; $('actor-dialog-title').textContent = title; $('actor-dialog-detail').textContent = detail; ($('actor-dialog') as HTMLDialogElement).showModal(); }
function updateHighlights(): void { scene.setHighlights({ selectedSquare, selectedTile, legalActions: actions(), showMoves: preferences.showMoves || revealHeld, focusSquare: document.activeElement === sceneHost ? keyboardSquare : null }); }
function renderScene(): void {
  const epoch = ++sceneEpoch; updateHighlights(); animating = false;
  void scene.setPosition(visiblePosition()).finally(() => { if (sceneEpoch === epoch) refresh(); });
}
function refreshHistory(): void {
  const key = game.game_id + ':' + game.revision + ':' + (replayIndex ?? 'live');
  if (key === historyKey) return;
  historyKey = key; $('record-count').textContent = game.actionMetadata.length + (game.actionMetadata.length === 1 ? ' action' : ' actions');
  history.replaceChildren(...game.actionMetadata.map((action: Action, index: number) => { const item = document.createElement('li'); item.textContent = (index + 1) + '. ' + label(action); if (replayIndex === index + 1) item.className = 'current'; return item; }));
}
function refreshLegalPanel(): void {
  const panel = $('legal-panel') as HTMLDetailsElement;
  if (!panel.open) return;
  const key = game.game_id + ':' + game.revision + ':' + (replayIndex ?? 'live') + ':' + boardLocked();
  if (key === legalKey) return;
  legalKey = key;
  $('legal-list').replaceChildren(...actions().map(action => { const button = document.createElement('button'); button.textContent = label(action); button.disabled = boardLocked(); button.onclick = () => { void chooseAction([action]); }; return button; }));
}
function refreshDraw(offer: number | null, finished: boolean): void {
  const active = !finished && replayIndex === null, message = $('draw-offer'), offerButton = $('offer-draw'), accept = $('accept-draw'), decline = $('decline-draw');
  message.hidden = offer === null; message.textContent = offer === null ? '' : (offer === 1 ? 'White' : 'Black') + ' offers a draw.';
  $('draw-response').hidden = offer === null || !active;
  $('quiet-offer-draw').hidden = offer !== null; $('quiet-offer-draw').toggleAttribute('disabled', !active || offer !== null);
  offerButton.hidden = offer !== null; offerButton.toggleAttribute('disabled', !active);
  accept.hidden = offer === null || mode !== 'hotseat'; decline.hidden = offer === null || mode !== 'hotseat'; accept.toggleAttribute('disabled', !active); decline.toggleAttribute('disabled', !active);
}
function maybeQuietPrompt(side: number): void {
  const key = side === 1 ? 'white' : 'black';
  if (promptEpisodes[key]) return;
  promptEpisodes[key] = true; $('quiet-message').textContent = 'This match has reached 100 quiet actions. A draw still needs agreement.'; $('quiet-prompt').hidden = false; save();
}
function refresh(): void {
  const observation = game.observe(), position = visiblePosition(), finished = replayIndex === null || replayIndex === game.actions.length ? observation.outcome : null;
  sceneHost.setAttribute('aria-busy', String(animating || (replayIndex === null && isBotTurn() && !observation.outcome)));
  const side = position.side === 1 ? 'White' : 'Black', opening = game.initial.holes === 544 ? 'B-RIFT' : game.initial.holes === 1088 ? 'C-RIFT' : 'PRACTICE';
  $('match-kind').textContent = (mode === 'hotseat' ? 'HOTSEAT' : 'LOCAL BOT') + ' · ' + opening;
  turn.textContent = replayIndex !== null ? 'Replay · ' + replayIndex + ' / ' + game.actions.length : finished ? (finished.result === 'draw' ? 'Draw' : finished.winner === 1 ? 'White wins' : 'Black wins') : side + ' to move' + (isBotTurn() ? botFailed ? ' · bot paused' : ' · bot thinking' : '');
  const checked = inCheck(position, position.side); check.textContent = finished ? finished.reason.replaceAll('_', ' ') : checked ? side + ' is in check' : intent === 'shift' ? 'Shift intent: select a moving tile' : 'Position steady'; check.classList.toggle('danger', checked || Boolean(finished));
  quiet.textContent = position.halfmove + ' / 100'; document.querySelector('.quiet-readout')!.toggleAttribute('hidden', game.draw_policy === 'off'); $('policy').textContent = policyLabel(game.draw_policy);
  $('move-mode').setAttribute('aria-pressed', String(intent === 'move')); $('move-mode').classList.toggle('active', intent === 'move'); $('shift-mode').setAttribute('aria-pressed', String(intent === 'shift')); $('shift-mode').classList.toggle('active', intent === 'shift'); $('show-moves').setAttribute('aria-pressed', String(preferences.showMoves));
  $('undo').toggleAttribute('disabled', !(practice && !animating && replayIndex === null && game.actions.length)); $('bot-retry').hidden = !botFailed || !isBotTurn() || Boolean(finished);
  $('skip').hidden = !animating; $('show-moves').hidden = animating;
  $('lesson-status').hidden = lessonReturn === null;
  const lessonNames = { ordinary: 'Ordinary move', emptyShift: 'Empty tile Shift', loadedShift: 'Carry one passenger', cutCheck: 'Cut a checking ray' };
  $('lesson-message').textContent = (tutorial ? lessonNames[tutorial] : 'Practice table') + ' · Your match is on hold.';
  $('cancel-selection').hidden = selectedSquare === null && selectedTile === null && passengerTile === null; $('shift-passenger').hidden = passengerTile === null; $('confirm-shift').hidden = previewTile === null;
  refreshHistory(); refreshDraw(observation.draw_offer, observation.outcome !== null); replayControls.hidden = replayIndex === null; $('replay').setAttribute('aria-pressed', String(replayIndex !== null)); $('replay-position').textContent = replayIndex === null ? '' : replayIndex + ' / ' + game.actions.length;
  if (finished || position.halfmove < 100 || game.draw_policy !== 'prompt' || replayIndex !== null) $('quiet-prompt').hidden = true;
  if (!finished && replayIndex === null && game.draw_policy === 'prompt' && position.halfmove >= 100) maybeQuietPrompt(position.side);
  updateHighlights(); refreshLegalPanel();
}
function tutorialSolved(action: Action, previous: Position): boolean {
  if (!tutorial) return false;
  if (tutorial === 'ordinary') return action.type === 'move';
  if (action.type !== 'shift') return false;
  const occupied = macroSquares(macroIndex(action.from)).filter(square => previous.board[square] !== 0).length;
  if (tutorial === 'emptyShift') return occupied === 0;
  if (tutorial === 'loadedShift') return occupied === 1;
  return tutorial === 'cutCheck' && inCheck(previous, previous.side);
}
async function commit(action: Action, botAction = false): Promise<void> {
  if (animating || replayIndex !== null || game.observe().outcome !== null || (!botAction && isBotTurn())) return;
  const previous = game.state, expected = game.revision, gameId = game.game_id;
  try { game.step(action.id, expected, gameId); invalidateActions(); } catch (error) { say(error instanceof Error ? error.message : 'That action is no longer legal.'); refresh(); return; }
  const completed = tutorialSolved(action, previous); if (game.state.halfmove < 100) promptEpisodes = { white: false, black: false }; clearSelection(label(action) + '. ' + (game.state.side === 1 ? 'White' : 'Black') + ' to move.'); save(); animating = true; refresh();
  const epoch = ++sceneEpoch;
  try { await scene.setPosition(game.state, { previous, action }); } finally { if (sceneEpoch === epoch) animating = false; }
  if (game.game_id !== gameId || sceneEpoch !== epoch) return;
  if (completed) { say('Lesson complete — that legal solution works.'); tutorial = null; } refresh(); if (isBotTurn()) askBot();
}
async function chooseAction(candidates: Action[]): Promise<void> {
  if (!candidates.length) { say('That destination is not legal from the selected source.'); return; }
  if (candidates.length === 1) { await commit(candidates[0]); return; }
  const promotions = candidates.filter(action => action.promotion);
  if (!promotions.length) { await commit(candidates[0]); return; }
  const identity = game.game_id, revision = game.revision, dialog = $('promotion-dialog') as HTMLDialogElement;
  dialog.returnValue = ''; dialog.showModal();
  const choice = await new Promise<string>(resolve => dialog.addEventListener('close', () => resolve(dialog.returnValue), { once: true }));
  if (identity !== game.game_id || revision !== game.revision) return;
  const action = promotions.find(item => item.promotion === choice); if (action) await commit(action);
}
function chooseMove(square: number): void {
  if (selectedSquare !== null && game.state.board[square] * game.state.side > 0) {
    if (selectedSquare === square) { clearSelection('Selection cancelled.'); return; }
    selectedSquare = null;
  }
  if (selectedSquare === null) {
    const tile = macroOfSquare(square), canShift = actions().some(action => action.type === 'shift' && action.from === macroName(tile));
    if (!actions().some(action => action.type === 'move' && action.from === squareName(square))) {
      if (game.state.board[square] * game.state.side > 0 && canShift) { passengerTile = tile; selectedTile = previewTile = null; selection.textContent = squareName(square) + ' can travel with its platform.'; selectionDetail.textContent = 'There is no ordinary move here. Choose Shift this tile to move the platform and its passenger.'; return; }
      if (game.state.board[square] * game.state.side > 0) {
        selectedSquare = square; selectedTile = previewTile = passengerTile = null; intent = 'move';
        const reason = reasonText(shiftReason(game.state, tile), tile);
        selection.textContent = squareName(square) + ' selected; it has no legal ordinary move.';
        selectionDetail.textContent = reason;
        say(squareName(square) + ' has no legal ordinary move. ' + reason);
        return;
      }
      say('Select a friendly piece or a highlighted tile handle.'); return;
    }
    selectedSquare = square; selectedTile = null; previewTile = null; passengerTile = canShift ? tile : null; intent = 'move'; selection.textContent = squareName(square) + ' selected; choose an ordinary destination.'; selectionDetail.textContent = canShift ? 'You can also choose Shift this tile to transport its platform.' : 'Choose a destination, select another piece, or cancel.';
  } else { const source = selectedSquare; void chooseAction(actions().filter(action => action.type === 'move' && action.from === squareName(source) && action.to === squareName(square))); }
}
function chooseShiftSource(tile: number): void {
  const source = macroName(tile), available = actions().filter(action => action.type === 'shift' && action.from === source);
  if (!available.length) { const message = reasonText(shiftReason(game.state, tile), tile); say(message); selectionDetail.textContent = message; return; }
  selectedTile = tile; selectedSquare = null; previewTile = null; passengerTile = null; intent = 'shift'; selection.textContent = 'Shift ' + source + ': choose one highlighted adjacent hole.'; selectionDetail.textContent = 'Selecting a hole previews transport. Confirm Shift is the only commit.';
}
function chooseShiftTarget(tile: number): void {
  if (selectedTile === null) { chooseShiftSource(tile); return; }
  const choices = actions().filter(action => action.type === 'shift' && action.from === macroName(selectedTile!) && action.to === macroName(tile));
  if (!choices.length) { const message = macroName(tile) + ' is not an available adjacent hole for ' + macroName(selectedTile) + '.'; say(message); selectionDetail.textContent = message; return; }
  previewTile = tile; selection.textContent = 'Preview Shift ' + macroName(selectedTile) + ' → ' + macroName(tile) + '.'; selectionDetail.textContent = 'Passenger transport is staged. Confirm Shift to commit, or choose another hole.';
}
function pick(square: number, tile: number, hitKind?: HitKind): void {
  if (boardLocked()) return;
  keyboardSquare = square;
  if (selectedSquare !== null && hitKind !== 'shift') chooseMove(square);
  else if (hitKind === 'piece') {
    if (intent === 'shift') chooseShiftSource(tile);
    else chooseMove(square);
  } else if (hitKind === 'shift' || hitKind === 'tile' || intent === 'shift') { if (selectedTile === null || hitKind === 'shift') chooseShiftSource(tile); else chooseShiftTarget(tile); }
  else chooseMove(square);
  refresh();
}
function resetBot(): void { bot?.terminate(); bot = null; botFailed = false; }
function askBot(): void {
  if (!boardReady || replayIndex !== null || !isBotTurn() || game.observe().outcome) return;
  resetBot();
  try { bot = new Worker(new URL('./bot/worker.ts', import.meta.url), { type: 'module' }); } catch { botFailed = true; refresh(); say('The opponent could not start. Use Retry opponent.'); return; }
  const identity = { game_id: game.game_id, revision: game.revision };
  bot.onmessage = (event: MessageEvent<{ type?: string; action?: Action; game_id?: string; revision?: number; error?: string }>) => {
    const data = event.data;
    if (data.game_id !== game.game_id || data.revision !== game.revision) return;
    if (data.type === 'error') { resetBot(); botFailed = true; refresh(); say(data.error ?? 'The opponent paused. Use Retry opponent.'); return; }
    const action = data.action && actions().find(item => item.id === data.action!.id);
    if (action && data.game_id === identity.game_id && data.revision === identity.revision) void commit(action, true);
  };
  bot.onerror = event => { event.preventDefault(); if (identity.game_id !== game.game_id || identity.revision !== game.revision) return; resetBot(); botFailed = true; refresh(); say('The opponent paused. Use Retry opponent.'); };
  bot.postMessage({ type: 'suggest', record: game.exportRecord(), ...identity, depth: 2, max_nodes: 4000, seed: game.revision + 17 });
  refresh();
}
function startNew(layout: 'B' | 'C', draw: DrawPolicy, nextMode: Mode, nextPractice: boolean): void {
  resetBot(); game = new Game(layout, draw); invalidateActions(); mode = nextMode; practice = nextPractice; tutorial = null; lessonReturn = null; promptEpisodes = { white: false, black: false }; replayIndex = null; clearSelection(); save(); renderScene(); enterPlay(); refresh(); if (isBotTurn()) askBot();
}
function openTutorial(which: Tutorial): void {
  const fixtureNames: Record<Tutorial, string> = { ordinary: 'opening_B', emptyShift: 'opening_B', loadedShift: 'shift_promotion', cutCheck: 'cut_check_ray' };
  try {
    const fixture = conformance.fixtures.find(entry => entry.name === fixtureNames[which]);
    if (!fixture) throw new Error('Lesson fixture is missing.');
    const lesson = Game.fromRecord(fixture.record as GameRecord);
    if (!lessonReturn) lessonReturn = currentTableSave();
    resetBot(); game = lesson; invalidateActions(); mode = 'hotseat'; practice = true; tutorial = which; promptEpisodes = { white: false, black: false }; replayIndex = null; clearSelection(); save(); renderScene(); enterPlay(); refresh();
    selection.textContent = which === 'ordinary' ? 'Lesson: make any legal ordinary move.' : which === 'emptyShift' ? 'Lesson: Shift any legal empty tile.' : which === 'loadedShift' ? 'Lesson: make a legal Shift with a passenger.' : 'Lesson: Shift an empty tile to cut the checking ray.';
  } catch { say('The lesson fixture could not be loaded.'); }
}
function returnFromLesson(): void {
  if (!lessonReturn) return;
  const saved = lessonReturn, restored = Game.fromRecord(saved.record);
  resetBot(); game = restored; lessonReturn = null; tutorial = null; invalidateActions(); mode = saved.mode; practice = saved.practice;
  promptEpisodes = { ...saved.promptEpisodes }; replayIndex = null; clearSelection(); save(); renderScene(); enterPlay(); refresh();
  if (isBotTurn()) askBot();
}
function applyPreferences(): void {
  document.documentElement.dataset.contrast = String(preferences.highContrast);
  const { theme, family, material, quality, reducedMotion } = preferences;
  scene.configure({ theme, family, material, quality, reducedMotion });
}
function restore(): void {
  const saved = loadSave(), recoveryNotice = consumeLoadNotice();
  if (!saved) { if (!recoveryNotice) save(); renderScene(); refresh(); if (recoveryNotice) say(recoveryNotice); return; }
  try { game = Game.fromRecord(saved.record); restoredExistingGame = true; invalidateActions(); preferences = { ...defaultPreferences, ...saved.preferences }; mode = saved.mode; practice = saved.practice; promptEpisodes = saved.promptEpisodes; applyPreferences(); renderScene(); refresh(); if (recoveryNotice) say(recoveryNotice); if (isBotTurn()) askBot(); }
  catch { say('A saved game was rejected; the corrupt record was left untouched.'); renderScene(); refresh(); }
}

setPresentation('launch');
// Let the loading state paint before WebGL setup and initial shader compilation.
await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
scene = new BoardScene(sceneHost, pick); applyPreferences(); restore();
void scene.whenReady().then(() => { boardReady = true; $('startup').hidden = true; if (isBotTurn()) askBot(); }).catch(error => { $('startup').querySelector('span')!.textContent = error.message; say(error.message); });
$('launch-resume').textContent = restoredExistingGame ? 'Resume match' : 'Take your seat';
try { if (restoredExistingGame || sessionStorage.getItem('rift-launch-seen') === '1') setPresentation('play'); else { setPresentation('launch'); scene.showcase(true); } } catch { if (restoredExistingGame) setPresentation('play'); else { setPresentation('launch'); scene.showcase(true); } }
$('explore-table').onclick = exploreTable;
$('launch-resume').onclick = () => enterPlay(); $('launch-skip').onclick = () => enterPlay(true); $('launch-return').onclick = () => enterPlay(); $('launch-new').onclick = () => { ($('new-dialog') as HTMLDialogElement).showModal(); }; $('launch-explore').onclick = exploreTable;
$('lesson-return').onclick = returnFromLesson;
$('new-game').onclick = () => { const dialog = $('new-dialog') as HTMLDialogElement; dialog.returnValue = ''; dialog.showModal(); };
$('new-dialog').addEventListener('close', () => {
  const dialog = $('new-dialog') as HTMLDialogElement;
  if (dialog.returnValue !== 'start') return;
  const data = new FormData(dialog.querySelector('form')!), rawLayout = data.get('layout') as 'B' | 'C' | 'random', layout = rawLayout === 'random' ? (Math.random() < .5 ? 'B' : 'C') : rawLayout;
  startNew(layout, data.get('draw') as DrawPolicy, data.get('mode') as Mode, ($('practice') as HTMLInputElement).checked);
});
function undoLastAction(): void {
  if (!practice || animating || replayIndex !== null || !game.actions.length) return;
  resetBot();
  try { game.undo(); while (mode !== 'hotseat' && game.actions.length && isBotTurn()) game.undo(); invalidateActions(); if (game.state.halfmove < 100) promptEpisodes = { white: false, black: false }; clearSelection(); save(); renderScene(); refresh(); if (isBotTurn()) askBot(); }
  catch (error) { say(error instanceof Error ? error.message : 'Nothing to undo.'); }
}
$('undo').onclick = () => {
  if (!practice || animating || replayIndex !== null || !game.actions.length) return;
  if (mode !== 'hotseat') { undoLastAction(); return; }
  pendingUndo = { gameId: game.game_id, revision: game.revision };
  const dialog = $('undo-dialog') as HTMLDialogElement; dialog.returnValue = ''; dialog.showModal();
};
$('undo-dialog').addEventListener('close', () => {
  const request = pendingUndo; pendingUndo = null;
  if (($('undo-dialog') as HTMLDialogElement).returnValue !== 'approve' || !request) return;
  if (request.gameId !== game.game_id || request.revision !== game.revision) { say('The match changed. Request Undo again if needed.'); return; }
  undoLastAction();
});
$('resign').onclick = () => {
  if (replayIndex !== null || game.observe().outcome) return;
  const resign = (side: 1 | -1) => { game.resign(side); resetBot(); scene.skipAnimation(); save(); refresh(); say('Match resigned.'); };
  if (mode === 'hotseat') chooseActor('Who resigns?', 'Either seated player can resign a hotseat match.', resign); else resign(humanSide());
};
$('move-mode').onclick = () => { clearSelection('Move intent: select one of your pieces.'); refresh(); };
$('shift-mode').onclick = () => { clearSelection('Shift intent: select a legal tile or a visible Shift handle.'); intent = 'shift'; selectionDetail.textContent = 'A passenger click offers “Shift this tile”; it never starts a Shift itself.'; refresh(); };
$('shift-passenger').onclick = () => { if (passengerTile !== null) chooseShiftSource(passengerTile); refresh(); };
$('confirm-shift').onclick = () => { if (selectedTile !== null && previewTile !== null) void chooseAction(actions().filter(action => action.type === 'shift' && action.from === macroName(selectedTile!) && action.to === macroName(previewTile!))); };
$('cancel-selection').onclick = () => { clearSelection('Selection cancelled.'); refresh(); };
$('show-moves').onclick = () => { preferences.showMoves = !preferences.showMoves; save(); refresh(); };
document.querySelectorAll<HTMLButtonElement>('[data-camera]').forEach(button => button.onclick = () => scene.setCamera(button.dataset.camera as 'white' | 'black' | 'overview' | 'top'));
$('orbit-left').onclick = () => scene.orbit(-.15, 0); $('orbit-right').onclick = () => scene.orbit(.15, 0); $('skip').onclick = () => { scene.skipAnimation(); animating = false; refresh(); };
$('quiet-dismiss').onclick = () => { $('quiet-prompt').hidden = true; };
$('quiet-offer-draw').onclick = () => { $('offer-draw').click(); };
$('offer-draw').onclick = () => {
  if (game.draw_offer !== null || game.observe().outcome || replayIndex !== null) return;
  const offer = (side: 1 | -1) => { if (game.draw_offer !== null || game.observe().outcome || replayIndex !== null) return; game.offerDraw(side); if (mode !== 'hotseat') { game.declineDraw(game.draw_offer === 1 ? -1 : 1); say('The local bot declines draw offers.'); } save(); refresh(); if (isBotTurn()) askBot(); };
  if (mode === 'hotseat') chooseActor('Who offers the draw?', 'The other player will be able to accept or decline it.', offer); else offer(humanSide());
};
$('accept-draw').onclick = () => { if (game.draw_offer !== null) { game.acceptDraw(game.draw_offer === 1 ? -1 : 1); save(); refresh(); } };
$('decline-draw').onclick = () => { if (game.draw_offer !== null) { game.declineDraw(game.draw_offer === 1 ? -1 : 1); save(); refresh(); } };
$('replay').onclick = () => { resetBot(); replayIndex = replayIndex === null ? game.actions.length : null; clearSelection(); renderScene(); refresh(); if (replayIndex === null && isBotTurn()) askBot(); };
$('replay-back').onclick = () => { replayIndex = Math.max(0, (replayIndex ?? 0) - 1); renderScene(); refresh(); };
$('replay-next').onclick = () => { replayIndex = Math.min(game.actions.length, (replayIndex ?? 0) + 1); renderScene(); refresh(); };
$('replay-exit').onclick = () => { replayIndex = null; renderScene(); refresh(); if (isBotTurn()) askBot(); };
$('export').onclick = () => {
  try { const url = URL.createObjectURL(new Blob([exportSave(currentTableSave())], { type: 'application/json' })), link = document.createElement('a'); link.href = url; link.download = 'rift-chess-save.json'; link.click(); URL.revokeObjectURL(url); }
  catch (error) { say(error instanceof Error ? error.message : 'Could not export save.'); }
};
($('import') as HTMLInputElement).onchange = async event => {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file || file.size > 1_000_000) return say('Choose a Rift save under 1 MB.');
  try { const saved = importSave(await file.text()); game = Game.fromRecord(saved.record); invalidateActions(); resetBot(); clearSelection(); revealHeld = false; tutorial = null; lessonReturn = null; preferences = { ...defaultPreferences, ...saved.preferences }; mode = saved.mode; practice = saved.practice; promptEpisodes = saved.promptEpisodes; replayIndex = null; applyPreferences(); save(); renderScene(); enterPlay(); refresh(); if (isBotTurn()) askBot(); }
  catch { say('That file is not a valid Rift Chess save. Your current game was kept.'); }
};
$('about').onclick = () => ($('about-dialog') as HTMLDialogElement).showModal();
document.querySelectorAll<HTMLButtonElement>('[data-tutorial]').forEach(button => button.onclick = () => openTutorial(button.dataset.tutorial as Tutorial));
$('settings').onclick = () => {
  const dialog = $('settings-dialog') as HTMLDialogElement, form = dialog.querySelector('form')!;
  for (const [key, value] of Object.entries(preferences)) { const input = form.elements.namedItem(key === 'reducedMotion' ? 'motion' : key === 'highContrast' ? 'contrast' : key) as HTMLInputElement | null; if (input) input.type === 'checkbox' ? input.checked = Boolean(value) : input.value = String(value); }
  dialog.returnValue = ''; dialog.showModal();
};
$('settings-dialog').addEventListener('close', () => {
  const dialog = $('settings-dialog') as HTMLDialogElement;
  if (dialog.returnValue !== 'apply') return;
  const data = new FormData(dialog.querySelector('form')!);
  preferences = { ...preferences, theme: data.get('theme') as Preferences['theme'], family: data.get('family') as Preferences['family'], material: data.get('material') as Preferences['material'], quality: data.get('quality') as Preferences['quality'], reducedMotion: data.has('motion'), highContrast: data.has('contrast') };
  applyPreferences(); save(); refresh();
});
$('actor-white').onclick = () => { const action = actorDialogAction; actorDialogAction = null; action?.(1); };
$('actor-black').onclick = () => { const action = actorDialogAction; actorDialogAction = null; action?.(-1); };
$('legal-panel').addEventListener('toggle', refreshLegalPanel);
sceneHost.addEventListener('keydown', event => {
  const key = event.key.toLowerCase();
  if (key === 'h') { revealHeld = true; refresh(); return; }
  if (key === 's') { $('shift-mode').click(); return; }
  if (event.key === 'Home') { scene.setCamera('white'); return; }
  if (/^[1-4]$/.test(event.key)) { scene.setCamera((['white', 'black', 'overview', 'top'] as const)[Number(event.key) - 1]); return; }
  if (event.key === 'Escape') { clearSelection('Selection cancelled.'); refresh(); return; }
  if (event.key === 'Enter') { pick(keyboardSquare, macroOfSquare(keyboardSquare), intent === 'shift' ? 'tile' : 'piece'); return; }
  const delta: Record<string, number> = { arrowleft: -1, arrowright: 1, arrowup: 8, arrowdown: -8 };
  if (key in delta) {
    const next = keyboardSquare + delta[key];
    if (next >= 0 && next < 64 && (key !== 'arrowleft' || keyboardSquare % 8 !== 0) && (key !== 'arrowright' || keyboardSquare % 8 !== 7)) {
      keyboardSquare = next;
      const position = visiblePosition(), piece = position.board[keyboardSquare];
      selection.textContent = squareName(keyboardSquare) + ': ' + (!present(position, keyboardSquare) ? 'hole' : !piece ? 'empty' : (piece > 0 ? 'White ' : 'Black ') + ['', 'pawn', 'knight', 'bishop', 'rook', 'queen', 'king'][pieceType(piece)]) + (replayIndex === null ? '. Press Enter to select.' : '. Replay position.');
      refresh();
    }
    event.preventDefault();
  }
});
function releaseReveal(): void { if (revealHeld) { revealHeld = false; refresh(); } }
window.addEventListener('keyup', event => { if (event.key.toLowerCase() === 'h') releaseReveal(); });
sceneHost.addEventListener('focus', updateHighlights);
sceneHost.addEventListener('blur', () => { releaseReveal(); updateHighlights(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) releaseReveal(); });
window.addEventListener('beforeunload', save);
window.addEventListener('pagehide', event => { resetBot(); if (!event.persisted) scene.dispose(); });
window.addEventListener('pageshow', event => { if (event.persisted && isBotTurn()) askBot(); });
window.addEventListener('blur', releaseReveal);

function loadScenario(input: GameRecord | Position): void { resetBot(); game = 'schema' in input ? Game.fromRecord(input) : new Game('B', 'prompt', input); invalidateActions(); mode = 'hotseat'; practice = true; tutorial = null; lessonReturn = null; promptEpisodes = { white: false, black: false }; replayIndex = null; clearSelection(); renderScene(); enterPlay(true); refresh(); }
(window as Window & { rift?: unknown }).rift = {
  getObservation: () => game.observe(), getLegalActions: () => actions(), exportRecord: () => game.exportRecord(), loadScenario, loadTutorial: openTutorial,
  metrics: () => ({ ...scene.metrics(), revision: game.revision, actions: game.actions.length, animating, selectedSquare, selectedTile, keyboardSquare, revealHeld, shiftMode: intent === 'shift' }),
  squareScreenPosition: (square: number) => scene.squareScreenPosition(square), resetMetrics: () => scene.resetMetrics(),
  assetsReady: () => scene.whenReady(),
  orbit: (dx: number, dy: number, zoom?: number) => scene.orbit(dx, dy, zoom),
  setCamera: (preset: 'white' | 'black' | 'overview' | 'top') => scene.setCamera(preset),
  configureAppearance: (appearance: Partial<Preferences>) => { preferences = { ...preferences, ...appearance }; applyPreferences(); save(); refresh(); },
};

if (import.meta.env.PROD && location.protocol !== 'rift:' && 'serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => say('Offline browser caching is unavailable. Export your save before leaving.'));
document.querySelectorAll<HTMLAnchorElement>('a[href^="https:"]').forEach(link => link.addEventListener('click', event => {
  const bridge = (window as Window & { riftDesktop?: { openExternal(url: string): Promise<void> } }).riftDesktop;
  if (bridge) { event.preventDefault(); void bridge.openExternal(link.href).catch(() => say('This external link could not be opened.')); }
}));
document.querySelector('.import')!.addEventListener('keydown', event => { const key = (event as KeyboardEvent).key; if (key === 'Enter' || key === ' ') { event.preventDefault(); ($('import') as HTMLInputElement).click(); } });
app.inert = false;
