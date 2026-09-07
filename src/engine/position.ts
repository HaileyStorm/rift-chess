import type { Action, Position, Promotion, Side } from './types';

const PAWN = 1;
const KNIGHT = 2;
const BISHOP = 3;
const ROOK = 4;
const QUEEN = 5;
const KING = 6;
const VIRGIN_PAWN = 7;

const W_K = 1;
const W_Q = 2;
const B_K = 4;
const B_Q = 8;

const KNIGHT_DELTAS: ReadonlyArray<readonly [number, number]> = [
  [-1, -2], [1, -2], [-2, -1], [2, -1], [-2, 1], [2, 1], [-1, 2], [1, 2],
];
const KING_DELTAS: ReadonlyArray<readonly [number, number]> = [
  [-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1],
];
const BISHOP_DIRS: ReadonlyArray<readonly [number, number]> = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
const ROOK_DIRS: ReadonlyArray<readonly [number, number]> = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const QUEEN_DIRS = [...BISHOP_DIRS, ...ROOK_DIRS];
const PROMOTIONS: readonly Promotion[] = ['Q', 'R', 'B', 'N'];
const BACK_RANK = [ROOK, KNIGHT, BISHOP, QUEEN, KING, BISHOP, KNIGHT, ROOK];

function square(file: number, rank: number): number { return rank * 8 + file; }
function fileOf(squareIndex: number): number { return squareIndex & 7; }
function rankOf(squareIndex: number): number { return squareIndex >> 3; }
function within(file: number, rank: number): boolean { return file >= 0 && file < 8 && rank >= 0 && rank < 8; }
function opposite(side: Side): Side { return side === 1 ? -1 : 1; }
function isInteger(value: unknown): value is number { return typeof value === 'number' && Number.isSafeInteger(value); }
function promotionIndex(promotion: Promotion): number {
  return promotion === null ? 0 : promotion === 'Q' ? 1 : promotion === 'R' ? 2 : promotion === 'B' ? 3 : 4;
}
function promotionPiece(promotion: Promotion): number {
  if (promotion === 'Q') return QUEEN;
  if (promotion === 'R') return ROOK;
  if (promotion === 'B') return BISHOP;
  if (promotion === 'N') return KNIGHT;
  throw new Error('promotion choice is required');
}
function bitCount(value: number): number {
  let count = 0;
  while (value) { count += value & 1; value >>>= 1; }
  return count;
}
function actionId(type: Action['type'], source: number, destination: number, promotion: Promotion): number {
  const offset = type === 'move' ? 5 * (64 * source + destination) : 20480 + 5 * (16 * source + destination);
  return offset + promotionIndex(promotion);
}

export function squareName(index: number): string {
  if (!isInteger(index) || index < 0 || index >= 64) throw new Error('square index must be 0..63');
  return String.fromCharCode(97 + fileOf(index)) + String(rankOf(index) + 1);
}

export function squareIndex(name: string): number {
  if (!/^[a-h][1-8]$/.test(name)) throw new Error('square name must be a1..h8');
  return square(name.charCodeAt(0) - 97, Number(name[1]) - 1);
}

export function macroName(index: number): string {
  if (!isInteger(index) || index < 0 || index >= 16) throw new Error('macro index must be 0..15');
  return String.fromCharCode(65 + index % 4) + String(Math.floor(index / 4) + 1);
}

export function macroIndex(name: string): number {
  if (!/^[A-D][1-4]$/.test(name)) throw new Error('macro name must be A1..D4');
  return (Number(name[1]) - 1) * 4 + name.charCodeAt(0) - 65;
}

export function macroOfSquare(index: number): number {
  if (!isInteger(index) || index < 0 || index >= 64) throw new Error('square index must be 0..63');
  return Math.floor(rankOf(index) / 2) * 4 + Math.floor(fileOf(index) / 2);
}

export function macroSquares(macro: number): number[] {
  if (!isInteger(macro) || macro < 0 || macro >= 16) throw new Error('macro index must be 0..15');
  const file = (macro % 4) * 2;
  const rank = Math.floor(macro / 4) * 2;
  return [square(file, rank), square(file + 1, rank), square(file, rank + 1), square(file + 1, rank + 1)];
}

export function present(position: Position, index: number): boolean {
  return isInteger(index) && index >= 0 && index < 64 && (position.holes & (1 << macroOfSquare(index))) === 0;
}

export function pieceType(code: number): number {
  const type = Math.abs(code);
  return type === VIRGIN_PAWN ? PAWN : type;
}

export function clonePosition(position: Position): Position {
  return { ...position, board: [...position.board] };
}

export function initialPosition(layout: 'B' | 'C' = 'B'): Position {
  const board = Array<number>(64).fill(0);
  for (let file = 0; file < 8; file += 1) {
    board[square(file, 0)] = BACK_RANK[file];
    board[square(file, 1)] = VIRGIN_PAWN;
    board[square(file, 6)] = -VIRGIN_PAWN;
    board[square(file, 7)] = -BACK_RANK[file];
  }
  const holes = layout === 'B' ? (1 << 5) | (1 << 9) : (1 << 6) | (1 << 10);
  return { board, holes, side: 1, castling: 15, ep_target: -1, ep_pawn: -1, halfmove: 0, fullmove: 1 };
}

function findKing(position: Position, side: Side): number {
  return position.board.findIndex((piece) => piece === side * KING);
}

export function isAttacked(position: Position, target: number, bySide: Side): boolean {
  if (!present(position, target)) return false;
  const targetFile = fileOf(target);
  const targetRank = rankOf(target);
  const pawnSourceRank = targetRank - (bySide === 1 ? 1 : -1);
  if (pawnSourceRank >= 0 && pawnSourceRank < 8) {
    for (const sourceFile of [targetFile - 1, targetFile + 1]) {
      if (sourceFile >= 0 && sourceFile < 8) {
        const source = square(sourceFile, pawnSourceRank);
        if (present(position, source) && position.board[source] * bySide > 0 && pieceType(position.board[source]) === PAWN) return true;
      }
    }
  }
  for (const [deltaFile, deltaRank] of KNIGHT_DELTAS) {
    const sourceFile = targetFile + deltaFile;
    const sourceRank = targetRank + deltaRank;
    if (within(sourceFile, sourceRank) && present(position, square(sourceFile, sourceRank))
      && position.board[square(sourceFile, sourceRank)] === bySide * KNIGHT) return true;
  }
  for (const [deltaFile, deltaRank] of KING_DELTAS) {
    const sourceFile = targetFile + deltaFile;
    const sourceRank = targetRank + deltaRank;
    if (within(sourceFile, sourceRank) && present(position, square(sourceFile, sourceRank))
      && position.board[square(sourceFile, sourceRank)] === bySide * KING) return true;
  }
  for (const [directions, types] of [
    [BISHOP_DIRS, [BISHOP, QUEEN]],
    [ROOK_DIRS, [ROOK, QUEEN]],
  ] as const) {
    for (const [deltaFile, deltaRank] of directions) {
      let sourceFile = targetFile + deltaFile;
      let sourceRank = targetRank + deltaRank;
      while (within(sourceFile, sourceRank)) {
        const source = square(sourceFile, sourceRank);
        if (!present(position, source)) break;
        const piece = position.board[source];
        if (piece !== 0) {
          if (piece * bySide > 0 && types.includes(pieceType(piece) as never)) return true;
          break;
        }
        sourceFile += deltaFile;
        sourceRank += deltaRank;
      }
    }
  }
  return false;
}

export function inCheck(position: Position, side: Side): boolean {
  const king = findKing(position, side);
  return king < 0 || isAttacked(position, king, opposite(side));
}

function moveAction(source: number, destination: number, promotion: Promotion = null, enPassant = false, castle = 0): Action {
  return {
    id: actionId('move', source, destination, promotion), type: 'move', from: squareName(source), to: squareName(destination), promotion,
    en_passant: enPassant, castle,
  };
}

function shiftAction(source: number, destination: number, promotion: Promotion = null): Action {
  return {
    id: actionId('shift', source, destination, promotion), type: 'shift', from: macroName(source), to: macroName(destination), promotion,
  };
}

function* pseudoCastles(position: Position, source: number): Generator<Action> {
  const side = position.side;
  const homeRank = side === 1 ? 0 : 7;
  if (source !== square(4, homeRank) || position.board[source] !== side * KING || inCheck(position, side)) return;
  const kingRight = side === 1 ? W_K : B_K;
  const queenRight = side === 1 ? W_Q : B_Q;
  const enemy = opposite(side);
  const kingSidePath = [square(5, homeRank), square(6, homeRank)];
  if ((position.castling & kingRight) !== 0
    && present(position, square(7, homeRank)) && position.board[square(7, homeRank)] === side * ROOK
    && kingSidePath.every((index) => present(position, index) && position.board[index] === 0)
    && !isAttacked(position, kingSidePath[0], enemy) && !isAttacked(position, kingSidePath[1], enemy)) {
    yield moveAction(source, kingSidePath[1], null, false, 1);
  }
  const queenSideEmpties = [square(1, homeRank), square(2, homeRank), square(3, homeRank)];
  const queenKingPath = [square(3, homeRank), square(2, homeRank)];
  if ((position.castling & queenRight) !== 0
    && present(position, square(0, homeRank)) && position.board[square(0, homeRank)] === side * ROOK
    && queenSideEmpties.every((index) => present(position, index) && position.board[index] === 0)
    && !isAttacked(position, queenKingPath[0], enemy) && !isAttacked(position, queenKingPath[1], enemy)) {
    yield moveAction(source, queenKingPath[1], null, false, -1);
  }
}

function* pseudoMoves(position: Position): Generator<Action> {
  const side = position.side;
  for (let source = 0; source < 64; source += 1) {
    const piece = position.board[source];
    if (piece * side <= 0 || !present(position, source)) continue;
    const type = pieceType(piece);
    const file = fileOf(source);
    const rank = rankOf(source);
    if (type === PAWN) {
      const deltaRank = side === 1 ? 1 : -1;
      const promotionRank = side === 1 ? 7 : 0;
      const nextRank = rank + deltaRank;
      if (nextRank >= 0 && nextRank < 8) {
        const destination = square(file, nextRank);
        if (present(position, destination) && position.board[destination] === 0) {
          if (nextRank === promotionRank) for (const promotion of PROMOTIONS) yield moveAction(source, destination, promotion);
          else {
            yield moveAction(source, destination);
            const secondRank = rank + 2 * deltaRank;
            if (Math.abs(piece) === VIRGIN_PAWN && rank === (side === 1 ? 1 : 6)
              && secondRank >= 0 && secondRank < 8) {
              const secondDestination = square(file, secondRank);
              if (present(position, secondDestination) && position.board[secondDestination] === 0) yield moveAction(source, secondDestination);
            }
          }
        }
      }
      for (const deltaFile of [-1, 1]) {
        const destinationFile = file + deltaFile;
        const destinationRank = rank + deltaRank;
        if (!within(destinationFile, destinationRank)) continue;
        const destination = square(destinationFile, destinationRank);
        if (!present(position, destination)) continue;
        const target = position.board[destination];
        if (target * side < 0 && pieceType(target) !== KING) {
          if (destinationRank === promotionRank) for (const promotion of PROMOTIONS) yield moveAction(source, destination, promotion);
          else yield moveAction(source, destination);
        } else if (destination === position.ep_target && position.ep_pawn >= 0
          && position.board[position.ep_pawn] * side < 0 && pieceType(position.board[position.ep_pawn]) === PAWN) {
          yield moveAction(source, destination, null, true);
        }
      }
    } else if (type === KNIGHT || type === KING) {
      const deltas = type === KNIGHT ? KNIGHT_DELTAS : KING_DELTAS;
      for (const [deltaFile, deltaRank] of deltas) {
        const destinationFile = file + deltaFile;
        const destinationRank = rank + deltaRank;
        if (!within(destinationFile, destinationRank)) continue;
        const destination = square(destinationFile, destinationRank);
        const target = position.board[destination];
        if (present(position, destination) && target * side <= 0 && pieceType(target) !== KING) yield moveAction(source, destination);
      }
      if (type === KING) yield* pseudoCastles(position, source);
    } else {
      const directions = type === BISHOP ? BISHOP_DIRS : type === ROOK ? ROOK_DIRS : QUEEN_DIRS;
      for (const [deltaFile, deltaRank] of directions) {
        let destinationFile = file + deltaFile;
        let destinationRank = rank + deltaRank;
        while (within(destinationFile, destinationRank)) {
          const destination = square(destinationFile, destinationRank);
          if (!present(position, destination)) break;
          const target = position.board[destination];
          if (target === 0) yield moveAction(source, destination);
          else {
            if (target * side < 0 && pieceType(target) !== KING) yield moveAction(source, destination);
            break;
          }
          destinationFile += deltaFile;
          destinationRank += deltaRank;
        }
      }
    }
  }
}

function clearRookRight(rights: number, index: number): number {
  if (index === square(0, 0)) return rights & ~W_Q;
  if (index === square(7, 0)) return rights & ~W_K;
  if (index === square(0, 7)) return rights & ~B_Q;
  if (index === square(7, 7)) return rights & ~B_K;
  return rights;
}

function applyMove(position: Position, action: Action): Position {
  const source = squareIndex(action.from);
  const destination = squareIndex(action.to);
  const board = [...position.board];
  const side = position.side;
  const piece = board[source];
  const type = pieceType(piece);
  const target = board[destination];
  const enPassant = action.en_passant === true;
  const castle = action.castle ?? 0;
  board[source] = 0;
  if (enPassant) board[position.ep_pawn] = 0;
  if (castle !== 0) {
    const homeRank = side === 1 ? 0 : 7;
    const rookSource = square(castle === 1 ? 7 : 0, homeRank);
    const rookDestination = square(castle === 1 ? 5 : 3, homeRank);
    board[rookDestination] = board[rookSource];
    board[rookSource] = 0;
  }
  board[destination] = action.promotion === null ? (type === PAWN ? side * PAWN : piece) : side * promotionPiece(action.promotion);
  let castling = position.castling;
  if (type === KING) castling &= side === 1 ? ~(W_K | W_Q) : ~(B_K | B_Q);
  if (type === ROOK) castling = clearRookRight(castling, source);
  if (target !== 0 && pieceType(target) === ROOK) castling = clearRookRight(castling, destination);
  const doublePawnMove = type === PAWN && Math.abs(rankOf(destination) - rankOf(source)) === 2;
  return {
    board,
    holes: position.holes,
    side: opposite(side),
    castling,
    ep_target: doublePawnMove ? square(fileOf(source), (rankOf(source) + rankOf(destination)) / 2) : -1,
    ep_pawn: doublePawnMove ? destination : -1,
    halfmove: type === PAWN || target !== 0 || enPassant ? 0 : position.halfmove + 1,
    fullmove: position.fullmove + (side === -1 ? 1 : 0),
  };
}

function applyShift(position: Position, action: Action): Position {
  const sourceMacro = macroIndex(action.from);
  const destinationMacro = macroIndex(action.to);
  const sourceFile = (sourceMacro % 4) * 2;
  const sourceRank = Math.floor(sourceMacro / 4) * 2;
  const destinationFile = (destinationMacro % 4) * 2;
  const destinationRank = Math.floor(destinationMacro / 4) * 2;
  const deltaFile = destinationFile - sourceFile;
  const deltaRank = destinationRank - sourceRank;
  const board = [...position.board];
  const moved: Array<readonly [number, number, number]> = [];
  for (const source of macroSquares(sourceMacro)) {
    const piece = board[source];
    if (piece !== 0) moved.push([source, square(fileOf(source) + deltaFile, rankOf(source) + deltaRank), piece]);
    board[source] = 0;
  }
  for (const [, destination, originalPiece] of moved) {
    let piece = originalPiece;
    if (Math.abs(piece) === VIRGIN_PAWN) piece = piece > 0 ? PAWN : -PAWN;
    if (pieceType(piece) === PAWN && rankOf(destination) === (piece > 0 ? 7 : 0)) {
      piece = (piece > 0 ? 1 : -1) * promotionPiece(action.promotion);
    }
    board[destination] = piece;
  }
  let castling = position.castling;
  for (const [source, , piece] of moved) {
    if (pieceType(piece) === ROOK) castling = clearRookRight(castling, source);
  }
  const holes = (position.holes & ~(1 << destinationMacro)) | (1 << sourceMacro);
  return {
    board,
    holes,
    side: opposite(position.side),
    castling,
    ep_target: -1,
    ep_pawn: -1,
    halfmove: action.promotion === null ? position.halfmove + 1 : 0,
    fullmove: position.fullmove + (position.side === -1 ? 1 : 0),
  };
}

/** Internal reducer for a member of the current generated legal-action list. */
export function applyGeneratedAction(position: Position, action: Action): Position {
  return action.type === 'move' ? applyMove(position, action) : applyShift(position, action);
}

function shiftBaseAllowed(position: Position, macro: number): boolean {
  let occupant: number | null = null;
  for (const index of macroSquares(macro)) {
    const piece = position.board[index];
    if (piece === 0) continue;
    if (pieceType(piece) === KING || piece * position.side <= 0 || occupant !== null) return false;
    occupant = piece;
  }
  return true;
}

function* pseudoShifts(position: Position): Generator<Action> {
  for (let destination = 0; destination < 16; destination += 1) {
    if ((position.holes & (1 << destination)) === 0) continue;
    const destinationFile = destination % 4;
    const destinationRank = Math.floor(destination / 4);
    for (const [sourceFile, sourceRank] of [
      [destinationFile - 1, destinationRank], [destinationFile + 1, destinationRank],
      [destinationFile, destinationRank - 1], [destinationFile, destinationRank + 1],
    ]) {
      if (sourceFile < 0 || sourceFile >= 4 || sourceRank < 0 || sourceRank >= 4) continue;
      const source = sourceRank * 4 + sourceFile;
      if ((position.holes & (1 << source)) !== 0 || !shiftBaseAllowed(position, source)) continue;
      const deltaRank = (destinationRank - sourceRank) * 2;
      const promoting = macroSquares(source).some((index) => position.board[index] * position.side > 0
        && pieceType(position.board[index]) === PAWN && rankOf(index) + deltaRank === (position.side === 1 ? 7 : 0));
      if (promoting) for (const promotion of PROMOTIONS) yield shiftAction(source, destination, promotion);
      else yield shiftAction(source, destination);
    }
  }
}

export function legalActions(position: Position): Action[] {
  const side = position.side;
  const actions: Action[] = [];
  for (const action of pseudoMoves(position)) {
    if (!inCheck(applyGeneratedAction(position, action), side)) actions.push(action);
  }
  for (const action of pseudoShifts(position)) {
    if (!inCheck(applyGeneratedAction(position, action), side)) actions.push(action);
  }
  return actions.sort((left, right) => left.id - right.id);
}

export function shiftReason(position: Position, macro: number): string | null {
  if (!isInteger(macro) || macro < 0 || macro >= 16) return 'invalid_tile';
  if ((position.holes & (1 << macro)) !== 0) return 'hole';
  if (!shiftBaseAllowed(position, macro)) return 'occupancy';
  const macroFile = macro % 4;
  const macroRank = Math.floor(macro / 4);
  const destinations = [
    [macroFile - 1, macroRank], [macroFile + 1, macroRank], [macroFile, macroRank - 1], [macroFile, macroRank + 1],
  ].filter(([file, rank]) => file >= 0 && file < 4 && rank >= 0 && rank < 4)
    .map(([file, rank]) => rank * 4 + file)
    .filter((destination) => (position.holes & (1 << destination)) !== 0);
  if (destinations.length === 0) return 'not_adjacent';
  return legalActions(position).some((action) => action.type === 'shift' && macroIndex(action.from) === macro) ? null : 'king_safety';
}

/** Validate an importable Rift Chess 1.0 position. Generation also supports zero-hole orthodox tests. */
export function validatePosition(input: unknown): asserts input is Position {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) throw new Error('position must be an object');
  const record = input as Record<string, unknown>;
  const required = ['board', 'holes', 'side', 'castling', 'ep_target', 'ep_pawn', 'halfmove', 'fullmove'];
  if (Object.keys(record).length !== required.length || required.some((key) => !Object.prototype.hasOwnProperty.call(record, key))) {
    throw new Error('invalid position schema');
  }
  if (!Array.isArray(record.board) || record.board.length !== 64 || record.board.some((piece) => !isInteger(piece) || Math.abs(piece) > VIRGIN_PAWN)) {
    throw new Error('board must contain 64 integer piece codes in [-7, 7]');
  }
  if (!isInteger(record.holes) || record.holes < 0 || record.holes >= 65536 || bitCount(record.holes) !== 2) {
    throw new Error('holes must be a 16-bit mask with exactly two set bits');
  }
  if (record.side !== 1 && record.side !== -1) throw new Error('side must be +1 or -1');
  if (!isInteger(record.castling) || record.castling < 0 || record.castling > 15) throw new Error('castling must be a four-bit mask');
  if (!isInteger(record.halfmove) || record.halfmove < 0 || record.halfmove > 1_000_000_000) throw new Error('progress counter is invalid');
  if (!isInteger(record.fullmove) || record.fullmove < 1 || record.fullmove > 1_000_000_000) throw new Error('fullmove is invalid');
  const position = input as Position;
  if (position.board.filter((piece) => piece === KING).length !== 1 || position.board.filter((piece) => piece === -KING).length !== 1) {
    throw new Error('exactly one king of each colour is required');
  }
  for (let index = 0; index < 64; index += 1) {
    const piece = position.board[index];
    if (piece !== 0 && !present(position, index)) throw new Error('a piece occupies an absent square');
    if (pieceType(piece) === PAWN) {
      if (rankOf(index) === (piece > 0 ? 7 : 0)) throw new Error('a pawn on its promotion rank must already be promoted');
      if (Math.abs(piece) === VIRGIN_PAWN && rankOf(index) !== (piece > 0 ? 1 : 6)) throw new Error('an unmoved pawn must remain on its starting rank');
    }
  }
  for (const [right, kingSquare, rookSquare, side] of [
    [W_K, square(4, 0), square(7, 0), 1], [W_Q, square(4, 0), square(0, 0), 1],
    [B_K, square(4, 7), square(7, 7), -1], [B_Q, square(4, 7), square(0, 7), -1],
  ] as const) {
    if ((position.castling & right) !== 0 && (position.board[kingSquare] !== side * KING || position.board[rookSquare] !== side * ROOK)) {
      throw new Error('castling rights require the king and original rook on home squares');
    }
  }
  if (!isInteger(position.ep_target) || !isInteger(position.ep_pawn)) throw new Error('en-passant fields must be integers');
  if ((position.ep_target === -1) !== (position.ep_pawn === -1)) throw new Error('en-passant fields must both be absent or present');
  if (position.ep_target !== -1) {
    const target = position.ep_target;
    const pawn = position.ep_pawn;
    const targetRank = position.side === 1 ? 5 : 2;
    const pawnRank = position.side === 1 ? 4 : 3;
    const sourceRank = position.side === 1 ? 6 : 1;
    if (target < 0 || target >= 64 || pawn < 0 || pawn >= 64
      || rankOf(target) !== targetRank || rankOf(pawn) !== pawnRank || fileOf(target) !== fileOf(pawn)) {
      throw new Error('en-passant geometry is inconsistent with the side to move');
    }
    const source = square(fileOf(pawn), sourceRank);
    if (!present(position, target) || !present(position, source) || position.board[target] !== 0 || position.board[source] !== 0
      || position.board[pawn] !== -position.side * PAWN || position.halfmove !== 0) {
      throw new Error('en-passant metadata does not follow an ordinary double pawn move');
    }
  }
  if (inCheck(position, opposite(position.side))) throw new Error("the previous mover's king is in check");
}
