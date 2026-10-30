// Host-neutral transport checks for the future bot bridge. Bend remains the
// authority for positions, history and legal moves; these checks do not prove
// that a supplied history reaches the supplied position.
export const BOT_PROTOCOL = 'rift-bot/1';
export const MAX_HISTORY = 20000;
const ID_LIMIT = 21760;
const STATUS = new Set(['completed', 'cancelled', 'deadline_fallback', 'backend_unavailable',
  'invalid_model', 'incompatible_protocol', 'resource_limit', 'internal_failure']);
const BACKEND = new Set(['cpu', 'cuda', 'webgpu', 'none']);

export class BotContractError extends Error {
  constructor(code, message) { super(message); this.name = 'BotContractError'; this.code = code; }
}
const invalid = (message) => { throw new BotContractError('incompatible_protocol', message); };
const resource = (message) => { throw new BotContractError('resource_limit', message); };
function integer(value, min, max, name) {
  if (!Number.isSafeInteger(value) || value < min || value > max) invalid(`invalid ${name}`);
  return value;
}
function token(value, name) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9._:-]{1,128}$/.test(value)) invalid(`invalid ${name}`);
  return value;
}
function digest(value, size, name) {
  if (typeof value !== 'string' || !new RegExp(`^[0-9a-f]{${size}}$`).test(value)) invalid(`invalid ${name}`);
  return value;
}
function natural(value, name) {
  if (typeof value !== 'string' || !/^(0|[1-9][0-9]*)$/.test(value)) invalid(`invalid ${name}`);
  if (value.length > 128) resource(`${name} exceeds transport limit`);
  return value;
}
function position(value) {
  if (!value || typeof value !== 'object' || !Array.isArray(value.board) || value.board.length !== 64)
    invalid('invalid board');
  const board = value.board.map((piece) => {
    integer(piece, 0, 15, 'piece code');
    if (piece === 8) invalid('invalid piece code');
    return piece;
  });
  const holes = integer(value.holes, 0, 65535, 'holes');
  if (holes.toString(2).replaceAll('0', '').length !== 2) invalid('exactly two holes required');
  if (typeof value.side !== 'boolean') invalid('invalid side');
  const rights = integer(value.rights, 0, 15, 'rights');
  const ep = integer(value.ep, 0, 64, 'en passant target');
  const epPawn = integer(value.epPawn, 0, 64, 'en passant pawn');
  if ((ep === 64) !== (epPawn === 64)) invalid('incomplete en passant');
  const quiet = natural(value.quiet, 'quiet');
  const full = natural(value.full, 'full');
  if (full === '0') invalid('fullmove must be positive');
  return { board, holes, side: value.side, rights, ep, epPawn, quiet, full };
}
function actionIds(ids, name, limit) {
  if (!Array.isArray(ids)) invalid(`invalid ${name}`);
  if (ids.length > limit) resource(`${name} exceeds transport limit`);
  const result = ids.map((id) => integer(id, 0, ID_LIMIT - 1, name));
  return result;
}
function identity(value) {
  return {
    protocol: value.protocol === BOT_PROTOCOL ? BOT_PROTOCOL : invalid('unsupported protocol'),
    rules_id: value.rules_id === 'rift-chess/1.0' ? value.rules_id : invalid('unsupported rules'),
    game_commit: digest(value.game_commit, 40, 'game commit'),
    game_epoch: token(value.game_epoch, 'game epoch'),
    revision: natural(value.revision, 'revision'),
    request_id: token(value.request_id, 'request ID'),
    bot_id: token(value.bot_id, 'bot ID'),
    model_digest: digest(value.model_digest, 64, 'model digest'),
  };
}

// Input must come from the current Bend-owned match, including its original
// position and full accepted board-action history. Callers must not truncate it.
export function prepareBotRequest(value) {
  if (!value || typeof value !== 'object') invalid('invalid request');
  const ids = actionIds(value.legal_action_ids, 'legal actions', ID_LIMIT);
  if (new Set(ids).size !== ids.length) invalid('duplicate legal actions');
  const actions = actionIds(value.history?.actions, 'history', MAX_HISTORY);
  if (!['prompt', 'auto100', 'off'].includes(value.draw_policy)) invalid('invalid draw policy');
  return {
    ...identity(value), position: position(value.position),
    history: { initial: position(value.history.initial), actions },
    draw_policy: value.draw_policy, legal_action_ids: ids,
    search_preset: token(value.search_preset, 'search preset'),
    seed: natural(value.seed, 'seed'),
    time_budget_ms: integer(value.time_budget_ms, 1, 60000, 'time budget'),
    node_budget: integer(value.node_budget, 1, 1000000000, 'node budget'),
  };
}

// This protects identity and legal membership at the host boundary. The caller
// must still ask Bend to recheck current epoch, revision, readiness and legality.
export function validateBotReply(request, reply) {
  const expected = identity(request);
  if (!reply || typeof reply !== 'object') invalid('invalid reply');
  const actual = identity(reply);
  for (const key of Object.keys(expected)) if (actual[key] !== expected[key]) invalid(`mismatched ${key}`);
  if (!STATUS.has(reply.status) || !BACKEND.has(reply.backend)) invalid('invalid status or backend');
  integer(reply.elapsed_ms, 0, Number.MAX_SAFE_INTEGER, 'elapsed time');
  integer(reply.search_nodes, 0, Number.MAX_SAFE_INTEGER, 'search nodes');
  const hasAction = reply.status === 'completed' || reply.status === 'deadline_fallback';
  if (hasAction) {
    integer(reply.action_id, 0, ID_LIMIT - 1, 'action');
    if (!request.legal_action_ids.includes(reply.action_id)) invalid('reply action is not in request legal set');
  } else if (reply.action_id !== null) invalid('non-action status must have null action');
  return { ...actual, status: reply.status, action_id: reply.action_id, backend: reply.backend,
    elapsed_ms: reply.elapsed_ms, search_nodes: reply.search_nodes };
}
