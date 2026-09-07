/** Fixed-coordinate rules state. Mesh identities are intentionally absent. */
export interface Position {
  board: number[]; holes: number; side: Side; castling: number;
  ep_target: number; ep_pawn: number; halfmove: number; fullmove: number;
}
export type Side = 1 | -1;
export type DrawPolicy = 'prompt' | 'auto100' | 'off';
export type Promotion = 'Q' | 'R' | 'B' | 'N' | null;
/** Public intent metadata matches rift-action/1 fixtures. */
export interface Action {
  id: number; type: 'move' | 'shift'; from: string; to: string;
  promotion: Promotion; en_passant?: boolean; castle?: number;
}
export interface Outcome { result: 'white_win' | 'black_win' | 'draw'; reason: string; winner: Side | 0 }
export interface GameRecord {
  schema: 'rift-record/1'; rules_version: 'rift-chess/1.0'; action_encoding: 'rift-action/1';
  draw_policy: DrawPolicy; initial: Position; actions: number[];
  draw_offer: Side | null; override: Outcome | null; final_position_hash: string;
}
export interface Observation {
  rules_version: string; action_encoding: string; game_id: string; revision: number;
  position: Position; position_hash: string; outcome: Outcome | null; in_check: boolean;
  draw_policy: DrawPolicy; draw_offer: Side | null; draw_prompt_available: boolean;
  repetition_count: number; legal_action_count: number;
}
