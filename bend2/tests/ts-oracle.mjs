// Loads the published TypeScript rules engine as an independent playtest oracle.
// Node strips types natively; this hook only adds the `.ts` extension that the
// bundler-style imports under src/ omit.
import { registerHooks } from 'node:module';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const source = pathToFileURL(path.resolve('src') + path.sep).href;
registerHooks({
  resolve(specifier, context, next) {
    if (context.parentURL?.startsWith(source) && specifier.startsWith('.') && !path.extname(specifier))
      return next(`${specifier}.ts`, context);
    return next(specifier, context);
  },
});

const { Game } = await import(new URL('match/game.ts', source).href);
const { legalActions, squareName } = await import(new URL('engine/position.ts', source).href);
export { Game, legalActions, squareName };

/** Replays a Bend `rift-bend-record/1` journal on the reference match model. */
export function replayRecord(record) {
  const game = new Game(record.layout === 'C' ? 'C' : 'B', ['prompt', 'auto100', 'off'][record.policy ?? 0]);
  for (const command of record.commands) {
    const side = command.side ? 1 : -1;
    if (command.$ === 'MoveCommand') game.step(command.action, command.expected);
    else if (command.$ === 'UndoCommand') game.undo(command.expected);
    else if (command.$ === 'OfferCommand') game.offerDraw(side, command.expected);
    else if (command.$ === 'AcceptCommand') game.acceptDraw(side, command.expected);
    else if (command.$ === 'DeclineCommand') game.declineDraw(side, command.expected);
    else if (command.$ === 'ResignCommand') game.resign(side, command.expected);
    else throw new Error(`unknown command ${JSON.stringify(command)}`);
  }
  return game;
}
