// Opt-in host-side learned bot client. The enclosing application authenticates
// the script/package before execution and remains the authority for lifecycle,
// current revision/readiness and final Bend action validation.
import { BotContractError, validateBotReply } from './contract.mjs';
import { makeBotRequest } from './context.mjs';

const failure = (code, message) => new BotContractError(code, message);
const digest = (value, length) => typeof value === 'string' &&
  new RegExp(`^[0-9a-f]{${length}}$`).test(value);

export class LearnedBotClient {
  constructor({ workerUrl, bundleSha256, gameCommit, modelDigest, botId = 'learned' }) {
    const url = new URL(workerUrl, globalThis.location.href);
    if (url.origin !== globalThis.location.origin || !digest(bundleSha256, 64) ||
        !digest(gameCommit, 40) || !digest(modelDigest, 64) ||
        typeof botId !== 'string' || !/^[A-Za-z0-9._:-]{1,128}$/.test(botId))
      throw failure('incompatible_protocol', 'invalid local learned bot bundle identity');
    this.url = url.href;
    this.bundle = bundleSha256;
    this.gameCommit = gameCommit;
    this.modelDigest = modelDigest;
    this.botId = botId;
    this.epoch = crypto.randomUUID();
    this.generation = 0;
    this.worker = null;
    this.pending = null;
    this.lastRequest = null;
    this.closed = false;
  }

  // The host calls invalidate before applying reset, undo, import, mode/model
  // changes or shutdown, even if the new match reuses the same revision.
  invalidate() {
    this.generation++;
    this.epoch = crypto.randomUUID();
    this.lastRequest = null;
    const pending = this.pending;
    this.pending = null;
    if (pending) { clearTimeout(pending.timer); pending.reject(failure('cancelled', 'bot work invalidated')); }
    const worker = this.worker;
    this.worker = null;
    if (worker) {
      try { worker.postMessage({ type: 'cancel' }); } catch { /* terminating below */ }
      worker.terminate();
    }
  }

  isCurrent(request) {
    return !this.closed && !!this.lastRequest && request === this.lastRequest &&
      request.game_epoch === this.epoch;
  }

  decide(context, job, search) {
    if (this.closed) throw failure('internal_failure', 'bot client is closed');
    if (this.pending) throw failure('internal_failure', 'bot request already pending');
    const request = makeBotRequest(context, job, {
      protocol: 'rift-bot/1', rules_id: 'rift-chess/1.0', game_commit: this.gameCommit,
      game_epoch: this.epoch, request_id: crypto.randomUUID(), bot_id: this.botId,
      model_digest: this.modelDigest,
    }, search);
    if (!this.worker) this.worker = new Worker(this.url, { type: 'module' });
    const worker = this.worker, generation = this.generation;
    this.lastRequest = request;
    return new Promise((resolve, reject) => {
      const fail = error => {
        if (this.worker !== worker || this.generation !== generation || !this.pending) return;
        clearTimeout(this.pending.timer); this.pending = null; this.lastRequest = null;
        this.worker = null; worker.terminate(); reject(error);
      };
      const timer = setTimeout(() => fail(failure('internal_failure', 'bot worker timed out')),
        request.time_budget_ms + 1000);
      this.pending = { reject, timer };
      worker.onmessage = event => {
        if (this.worker !== worker || this.generation !== generation || !this.pending) return;
        try {
          if (event.data?.type === 'rejected')
            throw failure('incompatible_protocol', 'worker rejected the bot request');
          const reply = validateBotReply(request, event.data);
          if ((reply.status === 'completed' || reply.status === 'deadline_fallback') && reply.backend !== 'cpu')
            throw failure('incompatible_protocol', 'unexpected learned worker backend');
          clearTimeout(this.pending.timer); this.pending = null;
          resolve({ request, reply });
        } catch (error) { fail(error); }
      };
      worker.onerror = () => fail(failure('internal_failure', 'bot worker failed'));
      worker.onmessageerror = () => fail(failure('incompatible_protocol', 'bot worker message could not be decoded'));
      try { worker.postMessage({ type: 'decide', bundle_sha256: this.bundle, request }); }
      catch (error) { fail(failure('internal_failure', `bot worker submission failed: ${String(error)}`)); }
    });
  }

  close() {
    if (!this.closed) { this.invalidate(); this.closed = true; }
  }
}
