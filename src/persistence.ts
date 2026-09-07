import type { GameRecord } from './engine/types';
import { Game } from './match/game';

export type Theme = 'gallery' | 'nocturne' | 'daylight';
export type Family = 'classic' | 'faceted';
export type Material = 'ceramic' | 'metal' | 'wood';
export type Quality = 'low' | 'balanced' | 'high';

export interface Preferences {
  theme: Theme; family: Family; material: Material; quality: Quality;
  reducedMotion: boolean; highContrast: boolean; showMoves: boolean; showShifts: boolean;
}

export interface SaveEnvelope {
  schema: 'rift-ui-save/1'; record: GameRecord; preferences: Preferences;
  mode: 'hotseat' | 'bot-white' | 'bot-black'; practice: boolean; promptEpisodes: { white: boolean; black: boolean };
}

const SAVE_KEY = 'rift-chess.save.v1';
const RECOVERY_KEY = 'rift-chess.save.recovery.v1';
const MAX_SAVE_BYTES = 1_000_000;
export const defaultPreferences: Preferences = {
  theme: 'gallery', family: 'classic', material: 'ceramic', quality: 'balanced',
  reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
  highContrast: false, showMoves: false, showShifts: true,
};
let loadNotice = '';
let lastGoodSave: string | null = null;

function isOneOf<T extends string>(value: unknown, options: readonly T[]): value is T { return typeof value === 'string' && options.includes(value as T); }
function validPreferences(value: unknown): value is Preferences {
  if (!value || typeof value !== 'object') return false;
  const item = value as Record<string, unknown>;
  return isOneOf(item.theme, ['gallery', 'nocturne', 'daylight'] as const)
    && isOneOf(item.family, ['classic', 'faceted'] as const)
    && isOneOf(item.material, ['ceramic', 'metal', 'wood'] as const)
    && isOneOf(item.quality, ['low', 'balanced', 'high'] as const)
    && typeof item.reducedMotion === 'boolean' && typeof item.highContrast === 'boolean'
    && typeof item.showMoves === 'boolean' && typeof item.showShifts === 'boolean';
}

function parseEnvelope(text: string): SaveEnvelope {
  if (text.length > MAX_SAVE_BYTES) throw new Error('Save is too large.');
  const value: unknown = JSON.parse(text);
  if (!value || typeof value !== 'object') throw new Error('Save is not an object.');
  if ((value as { schema?: string }).schema === 'rift-record/1') { const game = Game.fromRecord(value); return { schema: 'rift-ui-save/1', record: game.exportRecord(), preferences: { ...defaultPreferences }, mode: 'hotseat', practice: true, promptEpisodes: { white: false, black: false } }; }
  const save = value as Partial<SaveEnvelope>;
  if (save.schema !== 'rift-ui-save/1' || !save.record || !validPreferences(save.preferences)) throw new Error('Unsupported save format.');
  if (!isOneOf(save.mode, ['hotseat', 'bot-white', 'bot-black'] as const) || typeof save.practice !== 'boolean') throw new Error('Invalid match preferences.');
  if (!save.promptEpisodes || typeof save.promptEpisodes !== 'object' || typeof save.promptEpisodes.white !== 'boolean' || typeof save.promptEpisodes.black !== 'boolean') throw new Error('Invalid draw prompt state.');
  Game.fromRecord(save.record);
  return save as SaveEnvelope;
}

export function loadSave(): SaveEnvelope | null {
  try {
    const value = localStorage.getItem(SAVE_KEY);
    if (!value) return null;
    const save = parseEnvelope(value); lastGoodSave = value; return save;
  } catch {
    try {
      const recovery = localStorage.getItem(RECOVERY_KEY);
      if (!recovery) { loadNotice = 'The saved game is corrupt and was not loaded.'; return null; }
      const save = parseEnvelope(recovery); lastGoodSave = recovery; loadNotice = 'The latest save was corrupt; the previous recovery copy was loaded.'; return save;
    } catch { loadNotice = 'Saved game and recovery copy were corrupt and were not loaded.'; return null; }
  }
}

export function consumeLoadNotice(): string { const value = loadNotice; loadNotice = ''; return value; }

export function persistSave(save: SaveEnvelope): string | null {
  try {
    const text = JSON.stringify(save);
    if (text.length > MAX_SAVE_BYTES) return 'Save is too large for browser storage.';
    if (lastGoodSave) localStorage.setItem(RECOVERY_KEY, lastGoodSave);
    localStorage.setItem(SAVE_KEY, text);
    lastGoodSave = text;
    return null;
  } catch { return 'Browser storage is unavailable; your game will not survive a refresh.'; }
}

export function importSave(text: string): SaveEnvelope {
  return parseEnvelope(text);
}

export function exportSave(save: SaveEnvelope): string {
  const text = JSON.stringify(save, null, 2);
  if (text.length > MAX_SAVE_BYTES) throw new Error('Save is too large to export.');
  return text;
}
