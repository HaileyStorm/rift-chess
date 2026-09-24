/** Ordered input queue for a single-threaded Bend worker.
 *
 * PointerMove carries an absolute point, so only adjacent moves against the
 * same immutable presentation can be coalesced. Every other input remains in
 * place; in particular, moves never cross a down/up, wheel, key, activation,
 * tick, or presentation boundary.
 */
export type BendEvent = { $: string };
export type PresentedEvent<T extends BendEvent> = { input: T; presentation: unknown };
export type PresentedBatch<T extends BendEvent> = { presentation: unknown; events: T[] };

export class PresentedInputQueue<T extends BendEvent> {
  private readonly pending: PresentedEvent<T>[] = [];

  get length(): number { return this.pending.length; }

  enqueue(input: T, presentation: unknown): void {
    const previous = this.pending[this.pending.length - 1];
    if (input.$ === 'PointerMove' && previous?.input.$ === 'PointerMove' && previous.presentation === presentation) {
      previous.input = input;
    } else {
      this.pending.push({ input, presentation });
    }
  }

  takeBatch(): PresentedBatch<T> | undefined {
    if (!this.pending.length) return undefined;
    const presentation = this.pending[0].presentation;
    const events: T[] = [];
    while (this.pending.length && this.pending[0].presentation === presentation) {
      events.push(this.pending.shift()!.input);
    }
    return { presentation, events };
  }
}
