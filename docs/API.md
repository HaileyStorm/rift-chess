# Local engine and opponent API

The same pure engine powers browser play, Electron and the headless build. It has no renderer, DOM, network or model-download dependency. Run `npm ci` and `npm run build` for the source-development workflow; players need only a browser or the packaged executable.

## In process

```js
import { HeadlessApi } from './dist/api.js';

const api = new HeadlessApi('B', 'prompt');
const state = api.observe();
const legal = api.legalActions();
console.assert(legal.mask.length === 21760);
const reply = api.dispatch({
  id: 1, version: 'rift-api/1', command: 'step',
  game_id: state.game_id, revision: state.revision,
  actor: state.position.side, action_id: 20825
});
if (!reply.ok) throw new Error(reply.error.message);
const record = api.exportRecord();
```

`20825` is the legal opening Shift A2 → B2 in B-rift. An action ID conveys intent, not permission. The checked step accepts only a current legal action.

The position is an integer board **[64]**, indexed a1=0 through h8=63, plus the 16-bit hole mask, side, castling rights, en-passant fields, quiet counter and fullmove number. Piece codes match the supplied Python reference, including ±7 for an unmoved pawn. The legal mask is **[21760]**, with numeric 0/1 entries, alongside readable action metadata.

## Local process

```powershell
node scripts/headless.mjs
```

Send UTF-8 newline-delimited JSON. Each line produces one response; lines are bounded to 1 MiB and invalid requests leave the current match intact.

```json
{"id":1,"command":"new","layout":"B","draw_policy":"prompt"}
{"id":2,"command":"observe"}
{"id":3,"command":"legal"}
{"id":4,"command":"export"}
```

| Command | Required additional fields |
| --- | --- |
| `new` | Optional B/C layout and prompt/auto100/off policy |
| `observe`, `legal`, `result`, `export` | None |
| `step` | Current `game_id`, `revision`, `actor`, `action_id` |
| `reset` | Current identity/revision; optional new layout/policy |
| `load` | Current identity/revision and `record` |
| `undo` | Current identity/revision and `actor`; caller owns consent policy |
| `offer_draw`, `accept_draw`, `decline_draw`, `resign` | Current identity/revision and `actor` |
| `suggest` | Current identity/revision; optional `depth`, `max_nodes`, `seed` |

The UI preserves `rift-record/1` inside a `rift-ui-save/1` envelope containing preferences and mode. It also accepts a raw v1 replay through an explicit adapter. Imports replay all actions and validate the final position hash. Repetition history is rebuilt, not approximated from the last board.

## Shipped local bot

The worker runs iterative-deepening alpha-beta with all legal moves, Shifts and promotions, material/positional heuristics, a node bound and a legal fallback if an iteration is interrupted. The UI uses depth 2 and 4,000 nodes. Its seeded tie-breaking is reproducible in this implementation; Python and JavaScript RNG traces are not claimed identical. The bot declines draw offers. There are no weights, API keys, downloads, paid inference or claimed Elo.

Every returned suggestion is checked against both game identity and revision before commitment. Search retains progress policy/counter and the full path repetition ledger. The geometric position SHA-256 alone is not a complete search-state key.

## Future online and training adapters

Online multiplayer is not implemented at launch. The versioned command boundary can be carried by WebRTC or a small relay without moving rules into the renderer. A network adapter must authenticate seat ownership, deduplicate session creation, negotiate the initial record, synchronize reconnects, arbitrate undo consent and validate every remote action. Signaling and potentially TURN are still necessary; universal serverless connectivity is not promised.

For training, use independent API instances and retain the full record/history. No neural observation tensor, neural inference or Gymnasium wrapper is claimed. Draws and genuine terminal outcomes remain distinct from a caller's time/action-budget truncation.
