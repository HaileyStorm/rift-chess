// Translate only a current Bend-owned context and eligible job. The host remains
// responsible for invalidation and for applying replies through Bend.
import { BotContractError, MAX_HISTORY, prepareBotRequest } from './contract.mjs';

const invalid = message => { throw new BotContractError('incompatible_protocol', message); };
function list(value, limit, name) {
  const result = [];
  while (value && value.$ === 'Con') {
    if (result.length === limit) throw new BotContractError('resource_limit', `${name} exceeds transport limit`);
    result.push(value.head);
    value = value.tail;
  }
  if (!value || value.$ !== 'Nil') invalid(`invalid ${name}`);
  return result;
}
function natural(value, name) {
  if (typeof value === 'bigint' && value >= 0n) return value.toString();
  if (Number.isSafeInteger(value) && value >= 0) return String(value);
  invalid(`invalid ${name}`);
}
function position(value) {
  if (!value || value.$ !== 'Pos') invalid('invalid Bend position');
  return { board: list(value.board, 64, 'board'), holes: value.holes, side: value.side,
    rights: value.rights, ep: value.ep, epPawn: value.epPawn,
    quiet: natural(value.quiet, 'quiet'), full: natural(value.full, 'full') };
}

export function makeBotRequest(context, job, identity, search) {
  if (!context || context.$ !== 'Context' || !job || job.eligible !== true ||
      !identity || !search) invalid('invalid or ineligible Bend job');
  const current = position(context.position), jobPosition = position(job.position);
  if (JSON.stringify(current) !== JSON.stringify(jobPosition)) invalid('job position differs from context');
  const legal = list(context.legal, 21760, 'legal actions');
  const jobIds = list(job.ids, 21760, 'job legal actions');
  const jobSet = new Set(jobIds);
  if (legal.length !== jobIds.length || new Set(legal).size !== legal.length ||
      jobSet.size !== jobIds.length || legal.some(id => !jobSet.has(id)))
    invalid('job legal actions differ from context');
  const policies = { Prompt: 'prompt', Auto100: 'auto100', Off: 'off' };
  const drawPolicy = policies[context.policy?.$];
  if (!drawPolicy) invalid('invalid Bend draw policy');
  return prepareBotRequest({ ...identity, ...search, revision: natural(job.revision, 'revision'),
    position: current, history: { initial: position(context.initial),
      actions: list(context.actions, MAX_HISTORY, 'history') },
    draw_policy: drawPolicy, legal_action_ids: legal });
}
