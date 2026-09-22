/** Shared browser-side shapes.  Bend values stay tagged at this boundary. */

export type BendRecord = Record<string, unknown>;
export type BendValue = BendRecord | unknown[] | string | number | bigint | boolean | null;
export type BendList = BendRecord | unknown[];

export interface PositionValue extends BendRecord {
  $?: 'Pos';
  board?: BendList;
  holes?: unknown;
  side?: unknown;
  rights?: unknown;
  ep?: unknown;
  epPawn?: unknown;
  quiet?: unknown;
  full?: unknown;
}

export interface FrameValue extends BendRecord {
  $: 'Frame';
  position: PositionValue;
  previous: PositionValue;
  selected: number;
  hovered: number;
  targets: BendList;
  tile: number;
  tileTargets: BendList;
  lastAction: number;
  progress: number;
  theme: 0 | 1;
}

export interface ObservationView {
  position: PositionValue;
  revision: number;
  legalIds: number[];
  outcome: string | null;
  offerSide: boolean | null;
  inCheck: boolean;
  canUndo: boolean;
}

export type CommandKind = 'MoveCommand' | 'UndoCommand' | 'OfferCommand' | 'AcceptCommand' | 'DeclineCommand' | 'ResignCommand';

export interface BrowserCommand {
  $: CommandKind;
  expected: number;
  action?: number;
  side?: boolean;
}

export type StoredCommand = BrowserCommand;

export interface BendRecordFile {
  schema: 'rift-bend-record/1';
  layout: 'B' | 'C';
  policy: 0 | 1 | 2;
  commands: StoredCommand[];
}

export interface PixImage extends BendRecord {
  $: 'Pix';
  color: number;
}

export interface QuaImage extends BendRecord {
  $: 'Qua';
  tl: BendImage;
  tr: BendImage;
  bl: BendImage;
  br: BendImage;
}

export type BendImage = PixImage | QuaImage;

export type WorkerRequestPayload =
  | { kind: 'new'; id: number; layout: boolean; policy: 0 | 1 | 2; theme: 0 | 1 }
  | { kind: 'replay'; id: number; layout: boolean; policy: 0 | 1 | 2; commands: BrowserCommand[]; theme: 0 | 1 }
  | { kind: 'command'; id: number; command: BrowserCommand }
  | { kind: 'bot'; id: number }
  | { kind: 'pick'; id: number; x: number; y: number; version: number }
  | { kind: 'render'; id: number; frame: FrameValue; version: number };

export type WorkerRequest = WorkerRequestPayload & { epoch: number };

export type WorkerResponsePayload =
  | { kind: 'state'; id: number; accepted: boolean; command?: BrowserCommand; observation: ObservationView; frame: FrameValue }
  | { kind: 'picked'; id: number; version: number; square: number }
  | { kind: 'image'; id: number; version: number; image: BendImage; renderMs: number }
  | { kind: 'error'; id: number; message: string };

export type WorkerResponse = WorkerResponsePayload & { epoch: number };

export function isRecord(value: unknown): value is BendRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function tag(value: unknown): string | null {
  return isRecord(value) && typeof value.$ === 'string' ? value.$ : null;
}

export function field<T = unknown>(value: unknown, name: string, fallback?: T): T | undefined {
  return isRecord(value) && name in value ? value[name] as T : fallback;
}

export function bendBool(value: unknown, fallback = false): boolean {
  if (typeof value === 'boolean') return value;
  const name = tag(value);
  if (name === 'True') return true;
  if (name === 'False') return false;
  return fallback;
}

export function bendNatNumber(value: unknown, fallback = 0): number {
  const n = typeof value === 'bigint' ? Number(value) : value;
  return typeof n === 'number' && Number.isSafeInteger(n) && n >= 0 ? n : fallback;
}

export function bendNatBigInt(value: unknown, fallback = 0n): bigint {
  if (typeof value === 'bigint' && value >= 0n) return value;
  if (typeof value === 'number' && Number.isSafeInteger(value) && value >= 0) return BigInt(value);
  return fallback;
}

export function linkedList(values: readonly unknown[]): BendList {
  let cursor: BendList = { $: 'Nil' };
  for (let i = values.length - 1; i >= 0; i -= 1) cursor = { $: 'Con', head: values[i], tail: cursor };
  return cursor;
}

export function listValues(value: unknown, limit = 256): unknown[] {
  if (Array.isArray(value)) return value.slice(0, limit);
  const result: unknown[] = [];
  const seen = new Set<unknown>();
  let cursor: unknown = value;
  while (result.length < limit && isRecord(cursor) && !seen.has(cursor)) {
    seen.add(cursor);
    if (cursor.$ === 'Nil') break;
    if (cursor.$ !== 'Con' || !('head' in cursor) || !('tail' in cursor)) break;
    result.push(cursor.head);
    cursor = cursor.tail;
  }
  return result;
}

export function u32(value: unknown, fallback = 0): number {
  const n = bendNatNumber(value, fallback);
  return n >= 0 && n <= 0xffff_ffff ? n >>> 0 : fallback;
}

export function positionBoard(position: PositionValue): number[] {
  return listValues(position.board, 64).map(value => u32(value));
}

export function positionHoles(position: PositionValue): number {
  return u32(position.holes);
}

export function positionSide(position: PositionValue): boolean {
  return bendBool(position.side, true);
}

export function positionRevision(value: unknown): number {
  return Math.min(20_000, bendNatNumber(value));
}

export function normalizeOutcome(value: unknown): string | null {
  if (value === null || value === undefined || tag(value) === 'None') return null;
  if (tag(value) === 'Some') return normalizeOutcome(field(value, 'value'));
  return tag(value) ?? (typeof value === 'string' ? value : null);
}

export function normalizeOffer(value: unknown): boolean | null {
  if (value === null || value === undefined || tag(value) === 'NoOffer') return null;
  if (tag(value) === 'Offered') return bendBool(field(value, 'side'));
  return typeof value === 'boolean' ? value : null;
}

export function exactCommand(value: unknown): BrowserCommand | null {
  if (!isRecord(value) || typeof value.$ !== 'string') return null;
  const kind = value.$ as CommandKind;
  if (!['MoveCommand', 'UndoCommand', 'OfferCommand', 'AcceptCommand', 'DeclineCommand', 'ResignCommand'].includes(kind)) return null;
  const expected = value.expected;
  if (typeof expected !== 'number' || !Number.isSafeInteger(expected) || expected < 0 || expected > 20_000) return null;
  const keys = Object.keys(value).sort();
  const common = ['$','expected'];
  const needed = kind === 'MoveCommand' ? [...common, 'action'] : kind === 'UndoCommand' ? common : [...common, 'side'];
  if (keys.length !== needed.length || keys.some((key, index) => key !== [...needed].sort()[index])) return null;
  if (kind === 'MoveCommand') {
    if (typeof value.action !== 'number' || !Number.isSafeInteger(value.action) || value.action < 0 || value.action >= 21_760) return null;
    return { $: kind, expected, action: value.action };
  }
  if (kind === 'UndoCommand') return { $: kind, expected };
  if (typeof value.side !== 'boolean') return null;
  return { $: kind, expected, side: value.side };
}
