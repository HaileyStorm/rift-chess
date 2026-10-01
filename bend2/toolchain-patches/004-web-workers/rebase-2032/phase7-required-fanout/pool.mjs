const PROTOCOL = 'rift-bend-required-fanout/2032-1';
const U32_MAX = 0xffff_ffff;

export class RequiredFanoutError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'RequiredFanoutError';
    this.code = code;
  }
}

const problem = (code, message) => new RequiredFanoutError(code, message);

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function hasExactKeys(value, keys) {
  if (!isRecord(value)) return false;
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
}

function boundedInteger(value, minimum, maximum, name) {
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
    throw problem('configuration', `${name} must be an integer in ${minimum}..${maximum}`);
  }
  return value;
}

function validateHelpers(helpers) {
  if (!isRecord(helpers) || Object.keys(helpers).length === 0 || Object.keys(helpers).length > 256) {
    throw problem('configuration', 'an explicit nonempty worker-helper allowlist is required');
  }
  const normalized = Object.create(null);
  for (const [name, descriptor] of Object.entries(helpers)) {
    if (!/^[A-Za-z_$][\w$.-]{0,127}$/.test(name) || !hasExactKeys(descriptor, ['arity'])
      || ![1, 2].includes(descriptor.arity)) {
      throw problem('configuration', `invalid worker helper descriptor: ${name}`);
    }
    normalized[name] = Object.freeze({ arity: descriptor.arity });
  }
  return Object.freeze(normalized);
}

function validateU32Args(args, arity, name) {
  if (!Array.isArray(args) || args.length !== arity) {
    throw problem('arguments', `${name} requires exactly ${arity} U32 argument(s)`);
  }
  for (let index = 0; index < arity; index += 1) {
    if (!Object.prototype.hasOwnProperty.call(args, index)
      || !Number.isInteger(args[index]) || args[index] < 0 || args[index] > U32_MAX) {
      throw problem('arguments', `${name} requires dense U32 arguments`);
    }
  }
  return args.slice();
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((ok, fail) => { resolve = ok; reject = fail; });
  return { promise, resolve, reject };
}

/**
 * Create one fixed-size, reusable pool for strict pure U32 helper calls.
 * There is deliberately no serial/local fallback when Worker creation,
 * startup, admission, computation, or protocol validation fails.
 */
export async function createRequiredPool({ workerFactory, helpers, size = 2,
  maxQueue = 16, maxJobsPerRegion = 128, maxActiveRegions = 64,
  startupTimeoutMs = 3000, taskTimeoutMs = 10000 } = {}) {
  if (typeof workerFactory !== 'function') {
    throw problem('workers_unavailable', 'required Worker factory is unavailable');
  }
  const options = {
    size: boundedInteger(size, 1, 16, 'size'),
    maxQueue: boundedInteger(maxQueue, 1, 4096, 'maxQueue'),
    maxJobsPerRegion: boundedInteger(maxJobsPerRegion, 1, 4096, 'maxJobsPerRegion'),
    maxActiveRegions: boundedInteger(maxActiveRegions, 1, 1024, 'maxActiveRegions'),
    startupTimeoutMs: boundedInteger(startupTimeoutMs, 1, 120000, 'startupTimeoutMs'),
    taskTimeoutMs: boundedInteger(taskTimeoutMs, 1, 600000, 'taskTimeoutMs'),
    helpers: validateHelpers(helpers),
    workerFactory,
  };
  const pool = new RequiredWorkerPool(options);
  await pool.start();
  return pool;
}

class RequiredWorkerPool {
  constructor(options) {
    this.options = options;
    this.slots = [];
    this.queue = [];
    this.regions = new Set();
    this.nextRequestId = 0;
    this.nextInvocationId = 0;
    this.closed = false;
    this.failed = null;
    this.staleResponses = 0;
    this.dispatched = 0;
  }

  async start() {
    const ready = [];
    try {
      for (let workerId = 0; workerId < this.options.size; workerId += 1) {
        const worker = this.options.workerFactory(workerId);
        if (!worker || typeof worker.postMessage !== 'function'
          || typeof worker.terminate !== 'function') {
          throw problem('workers_unavailable', 'Worker factory returned an invalid endpoint');
        }
        const gate = deferred();
        // A later factory/handshake failure can reject this gate before the
        // startup loop reaches Promise.all. Observe now to prevent an orphaned
        // startup rejection while retaining the original promise for that join.
        void gate.promise.catch(() => {});
        const slot = { workerId, worker, busy: false, job: null, startup: gate,
          startupTimer: null, taskTimer: null, terminated: false };
        this.slots.push(slot);
        worker.onmessage = ({ data }) => this.onMessage(slot, data);
        worker.onerror = (event) => this.failPool(problem('worker_error',
          String(event?.message ?? 'required Worker failed').slice(0, 512)));
        worker.onmessageerror = () => this.failPool(problem('worker_message',
          'required Worker message could not be cloned'));
        slot.startupTimer = setTimeout(() => this.failPool(problem('startup_timeout',
          `required Worker ${workerId} did not become ready`)), this.options.startupTimeoutMs);
        try {
          worker.postMessage({ type: 'hello', protocol: PROTOCOL, workerId });
        } catch (error) {
          throw problem('workers_unavailable', `required Worker ${workerId} startup failed: ${error?.message ?? error}`);
        }
        ready.push(gate.promise);
      }
      await Promise.all(ready);
      if (this.failed || this.closed) throw this.failed ?? problem('closed', 'required pool closed during startup');
      return this;
    } catch (error) {
      await this.terminateAll();
      throw error instanceof RequiredFanoutError ? error
        : problem('workers_unavailable', String(error?.message ?? error));
    }
  }

  onMessage(slot, data) {
    if (slot.startup) {
      if (!hasExactKeys(data, ['type', 'protocol', 'workerId', 'workerScope'])
        || data.type !== 'ready' || data.protocol !== PROTOCOL
        || data.workerId !== slot.workerId || data.workerScope !== true) {
        this.failPool(problem('worker_handshake', `required Worker ${slot.workerId} handshake mismatch`));
        return;
      }
      clearTimeout(slot.startupTimer);
      slot.startupTimer = null;
      const gate = slot.startup;
      slot.startup = null;
      gate.resolve(true);
      return;
    }

    const job = slot.job;
    if (!job || !isRecord(data) || data.requestId !== job.requestId) {
      this.staleResponses += 1;
      return;
    }
    if (data.type === 'result' && data.ok === false) {
      if (!hasExactKeys(data, ['type', 'protocol', 'requestId', 'invocationId', 'regionId',
        'sourceSlot', 'helperId', 'workerId', 'ok', 'error', 'workerScope', 'fetchCalls'])
        || !this.matchesJob(data, job, slot) || typeof data.error !== 'string'
        || data.error.length > 512 || data.workerScope !== true) {
        this.failPool(problem('worker_protocol', 'required Worker error reply mismatch'));
        return;
      }
      if (data.fetchCalls !== 0) {
        this.failPool(problem('network_denied', 'required Worker attempted fetch'));
        return;
      }
      this.finishSlot(slot, job, problem('worker_task', data.error || 'required helper failed'));
      return;
    }
    if (!hasExactKeys(data, ['type', 'protocol', 'requestId', 'invocationId', 'regionId',
      'sourceSlot', 'helperId', 'workerId', 'ok', 'value', 'workerScope', 'fetchCalls'])
      || !this.matchesJob(data, job, slot) || data.type !== 'result' || data.ok !== true
      || data.workerScope !== true || !Number.isInteger(data.value)
      || data.value < 0 || data.value > U32_MAX) {
      this.failPool(problem('worker_protocol', 'required Worker result mismatch'));
      return;
    }
    if (data.fetchCalls !== 0) {
      this.failPool(problem('network_denied', 'required Worker attempted fetch'));
      return;
    }
    this.finishSlot(slot, job, null, data.value);
  }

  matchesJob(data, job, slot) {
    return data.protocol === PROTOCOL && data.requestId === job.requestId
      && data.invocationId === job.region.invocationId && data.regionId === job.region.regionId
      && data.sourceSlot === job.task.slot && data.helperId === job.task.helperId
      && data.workerId === slot.workerId;
  }

  finishSlot(slot, job, error, value) {
    if (slot.job !== job) return;
    clearTimeout(slot.taskTimer);
    slot.taskTimer = null;
    slot.job = null;
    slot.busy = false;
    this.completeJob(job, error, value, slot.workerId);
    this.pump();
  }

  completeJob(job, error, value, workerId) {
    if (job.completed) return;
    job.completed = true;
    const region = job.region;
    region.remaining -= 1;
    if (!region.cancelled && error) this.cancelRegion(region, error);
    else if (!region.cancelled) {
      region.values[job.task.slot] = value;
      region.execution[job.task.slot] = Object.freeze({
        route: 'worker', workerId, helperId: job.task.helperId,
      });
    }
    this.finishRegionIfSettled(region);
  }

  finishRegionIfSettled(region) {
    if (region.remaining !== 0) return;
    this.regions.delete(region);
    if (region.signal && region.abortListener) {
      region.signal.removeEventListener('abort', region.abortListener);
    }
    if (!region.settled) {
      region.settled = true;
      region.resolve(Object.freeze({
        invocationId: region.invocationId,
        regionId: region.regionId,
        cap: region.cap,
        values: Object.freeze(region.values.slice()),
        execution: Object.freeze(region.execution.slice()),
        workerIds: Object.freeze([...region.participants].sort((a, b) => a - b)),
      }));
    }
  }

  cancelRegion(region, error) {
    if (region.cancelled) return;
    region.cancelled = true;
    if (!region.settled) {
      region.settled = true;
      region.reject(error);
    }
    if (region.signal && region.abortListener) {
      region.signal.removeEventListener('abort', region.abortListener);
    }
    for (const job of region.jobs) {
      if (job.completed) continue;
      if (job.state === 'queued') {
        const at = this.queue.indexOf(job);
        if (at >= 0) this.queue.splice(at, 1);
        this.completeJob(job, null, undefined, null);
      } else if (job.state === 'new') {
        this.completeJob(job, null, undefined, null);
      }
    }
    this.finishRegionIfSettled(region);
    this.pump();
  }

  failPool(error) {
    if (this.failed || this.closed) return;
    this.failed = error instanceof RequiredFanoutError ? error
      : problem('worker_error', String(error?.message ?? error));
    for (const slot of this.slots) {
      if (slot.startup) {
        const gate = slot.startup;
        slot.startup = null;
        clearTimeout(slot.startupTimer);
        slot.startupTimer = null;
        gate.reject(this.failed);
      }
    }
    for (const region of [...this.regions]) this.cancelRegion(region, this.failed);
    this.queue.length = 0;
    void this.terminateAll();
  }

  async terminateAll() {
    await Promise.allSettled(this.slots.map(async (slot) => {
      if (slot.terminated) return;
      slot.terminated = true;
      clearTimeout(slot.startupTimer);
      clearTimeout(slot.taskTimer);
      if (slot.startup) {
        const gate = slot.startup;
        slot.startup = null;
        gate.reject(this.failed ?? problem('closed', 'required Worker pool terminated'));
      }
      const job = slot.job;
      slot.job = null;
      slot.busy = false;
      slot.worker.onmessage = null;
      slot.worker.onerror = null;
      slot.worker.onmessageerror = null;
      try { await slot.worker.terminate(); } catch {}
      if (job) this.completeJob(job, null, undefined, null);
    }));
  }

  pump() {
    if (this.closed || this.failed) return;
    let advanced = true;
    while (advanced) {
      advanced = false;
      for (let at = 0; at < this.queue.length; at += 1) {
        const job = this.queue[at];
        const region = job.region;
        if (region.cancelled) {
          this.queue.splice(at--, 1);
          this.completeJob(job, null, undefined, null);
          advanced = true;
          continue;
        }
        const slot = this.slots.find((candidate) => !candidate.busy
          && (region.participants.has(candidate.workerId)
            || region.participants.size < region.cap));
        if (!slot) continue;
        if (!Number.isSafeInteger(this.nextRequestId + 1)) {
          this.failPool(problem('identifier_budget', 'required Worker request identifier exhausted'));
          return;
        }
        this.queue.splice(at, 1);
        region.participants.add(slot.workerId);
        job.state = 'inflight';
        job.requestId = ++this.nextRequestId;
        job.workerId = slot.workerId;
        slot.busy = true;
        slot.job = job;
        slot.taskTimer = setTimeout(() => this.failPool(problem('task_timeout',
          `required Worker task ${job.requestId} timed out`)), this.options.taskTimeoutMs);
        this.dispatched += 1;
        try {
          slot.worker.postMessage({ type: 'run', protocol: PROTOCOL,
            requestId: job.requestId, invocationId: region.invocationId,
            regionId: region.regionId, sourceSlot: job.task.slot,
            helperId: job.task.helperId, args: job.task.args });
        } catch (error) {
          this.failPool(problem('worker_post', `required Worker dispatch failed: ${error?.message ?? error}`));
          return;
        }
        advanced = true;
        break;
      }
    }
  }

  runRegion({ cap, regionId = 'required', tasks, signal } = {}) {
    if (this.closed) return Promise.reject(problem('closed', 'required Worker pool is closed'));
    if (this.failed) return Promise.reject(this.failed);
    if (!Array.isArray(tasks) || tasks.length < 1
      || tasks.length > this.options.maxJobsPerRegion) {
      return Promise.reject(problem('region_budget',
        `required region must contain 1..${this.options.maxJobsPerRegion} source slots`));
    }
    try {
      boundedInteger(cap, 1, 1024, 'region cap');
      if (typeof regionId !== 'string' || regionId.length < 1 || regionId.length > 128) {
        throw problem('configuration', 'regionId must be a nonempty string of at most 128 characters');
      }
      if (signal?.aborted) throw problem('aborted', 'required region aborted before dispatch');
      if (signal !== undefined && (typeof signal?.addEventListener !== 'function'
        || typeof signal?.removeEventListener !== 'function' || typeof signal?.aborted !== 'boolean')) {
        throw problem('configuration', 'signal must be an AbortSignal');
      }
      if (this.regions.size >= this.options.maxActiveRegions) {
        throw problem('region_budget', 'active required-region limit exceeded');
      }
      if (!Number.isSafeInteger(this.nextInvocationId + 1)) {
        throw problem('identifier_budget', 'required invocation identifier exhausted');
      }
      const slots = tasks.map((task) => task?.slot).sort((a, b) => a - b);
      if (slots.some((slot, index) => !Number.isSafeInteger(slot) || slot !== index)) {
        throw problem('source_slots', 'required sibling slots must be unique and contiguous from zero');
      }
      const normalized = tasks.map((task) => {
        if (task?.policy === 'never') {
          if (!hasExactKeys(task, ['slot', 'policy', 'local']) || typeof task.local !== 'function') {
            throw problem('local_task', 'a never sibling must provide an explicit local implementation');
          }
          return { slot: task.slot, policy: 'never', local: task.local };
        }
        if (task?.policy !== 'require' || typeof task.helperId !== 'string'
          || !hasExactKeys(task, ['slot', 'policy', 'helperId', 'args'])) {
          throw problem('task_policy', 'each sibling must be explicitly require or never/local');
        }
        const helper = this.options.helpers[task.helperId];
        if (!helper) throw problem('helper_not_allowed', `required helper is not in the checked allowlist: ${task.helperId}`);
        return { slot: task.slot, policy: 'require', helperId: task.helperId,
          args: validateU32Args(task.args, helper.arity, task.helperId) };
      });
      const region = { invocationId: ++this.nextInvocationId, regionId, cap: Math.min(cap, this.slots.length),
        signal, abortListener: null, values: Array(tasks.length), execution: Array(tasks.length),
        participants: new Set(), jobs: [], remaining: 0, cancelled: false, settled: false, ...deferred() };
      this.regions.add(region);

      try {
        for (const task of normalized) {
          if (task.policy === 'never') {
            const value = task.local();
            if (!Number.isInteger(value) || value < 0 || value > U32_MAX) {
              throw problem('local_result', 'never/local sibling returned a non-U32 value');
            }
            region.values[task.slot] = value;
            region.execution[task.slot] = Object.freeze({ route: 'local', workerId: null, helperId: null });
          } else {
            const job = { region, task, state: 'new', completed: false,
              requestId: null, workerId: null };
            region.jobs.push(job);
            region.remaining += 1;
          }
        }
      } catch (error) {
        this.regions.delete(region);
        region.settled = true;
        region.reject(error instanceof RequiredFanoutError ? error
          : problem('local_task', String(error?.message ?? error)));
        return region.promise;
      }

      if (signal) {
        region.abortListener = () => this.cancelRegion(region,
          problem('aborted', 'required region aborted'));
        signal.addEventListener('abort', region.abortListener, { once: true });
        if (signal.aborted) region.abortListener();
      }
      if (region.remaining === 0) {
        this.finishRegionIfSettled(region);
        return region.promise;
      }

      for (const job of region.jobs) {
        if (this.queue.length >= this.options.maxQueue) {
          this.cancelRegion(region, problem('queue_budget', 'required Worker queue is full'));
          break;
        }
        job.state = 'queued';
        this.queue.push(job);
        this.pump();
      }
      return region.promise;
    } catch (error) {
      return Promise.reject(error instanceof RequiredFanoutError ? error
        : problem('configuration', String(error?.message ?? error)));
    }
  }

  stats() {
    return Object.freeze({ size: this.slots.length,
      ready: this.slots.filter((slot) => slot.startup === null && !slot.terminated).length,
      busy: this.slots.filter((slot) => slot.busy).length,
      queued: this.queue.length, activeRegions: this.regions.size,
      staleResponses: this.staleResponses, dispatched: this.dispatched,
      failed: this.failed?.code ?? null, closed: this.closed });
  }

  async close() {
    if (this.closed) return;
    this.closed = true;
    const error = problem('closed', 'required Worker pool closed');
    for (const region of [...this.regions]) this.cancelRegion(region, error);
    this.queue.length = 0;
    await this.terminateAll();
  }
}

export const requiredFanoutProtocol = PROTOCOL;
