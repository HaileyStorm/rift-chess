"""Newline-delimited JSON adapter for the local Rift reference engine.

Run `python reference/rift_cli.py`; send one JSON object per input line. No ports,
network services, rendering dependencies, package installs or model downloads.
Responses echo the request's `id`; diagnostics never contaminate protocol stdout.
"""
from __future__ import annotations

import json
import sys
from typing import Any

from rift_core import Game, action_data, suggest

MAX_LINE_BYTES = 1024 * 1024


def dispatch(game: Game, request: dict[str, Any]) -> tuple[Game, Any]:
    """Execute one validated protocol command and return the current game + payload."""
    if not isinstance(request, dict) or not isinstance(request.get("command"), str):
        raise ValueError("request must contain a string command")
    command = request["command"]
    if command == "new":
        game = Game(layout=request.get("layout", "B"), draw_policy=request.get("draw_policy", "prompt"))
        return game, game.observe()
    if command == "load":
        loaded = Game.from_record(request["record"])
        return loaded, loaded.observe()
    if "game_id" in request and request["game_id"] != game.game_id:
        raise ValueError("stale game_id")
    if command == "observe":
        return game, game.observe()
    if command == "legal":
        return game, {"game_id": game.game_id, "revision": game.revision,
                      "actions": [action_data(action) for action in game.legal_actions()]}
    if command == "step":
        return game, game.step(request["action_id"], request.get("revision"))
    if command == "suggest":
        return game, suggest(game, depth=request.get("depth", 2),
                             max_nodes=request.get("max_nodes", 10000), seed=request.get("seed", 0))
    if command == "undo":
        if "revision" in request and (type(request["revision"]) is not int or request["revision"] != game.revision):
            raise ValueError("stale revision")
        return game, game.undo()
    if command == "export":
        return game, game.export_record()
    if command in ("offer_draw", "accept_draw", "decline_draw", "resign"):
        if "revision" in request and (type(request["revision"]) is not int or request["revision"] != game.revision):
            raise ValueError("stale revision")
        method = {"offer_draw": game.offer_draw, "accept_draw": game.accept_draw,
                  "decline_draw": game.decline_draw, "resign": game.resign}[command]
        return game, method(request["actor"])
    raise ValueError("unknown command")


def reject_constant(value: str) -> None:
    """Reject non-finite JavaScript numeric extensions; the wire format is strict JSON."""
    raise ValueError("non-finite numeric constant is not valid protocol JSON")


def main() -> None:
    """Serve bounded NDJSON records on stdin/stdout until EOF; reject malformed input."""
    game = Game()
    while True:
        line = sys.stdin.buffer.readline(MAX_LINE_BYTES + 1)
        if not line:
            return
        identifier = None
        try:
            if len(line) > MAX_LINE_BYTES:
                while line and not line.endswith(b"\n"):
                    line = sys.stdin.buffer.readline(MAX_LINE_BYTES + 1)
                raise ValueError("request exceeds 1 MiB")
            request = json.loads(line, parse_constant=reject_constant)
            if isinstance(request, dict):
                supplied_id = request.get("id")
                if supplied_id is not None and type(supplied_id) not in (str, int):
                    raise ValueError("request id must be a string, integer or null")
                identifier = supplied_id
            game, result = dispatch(game, request)
            response = {"id": identifier, "ok": True, "result": result}
        except (ValueError, TypeError, KeyError, IndexError, AttributeError) as error:
            response = {"id": identifier, "ok": False,
                        "error": {"code": "invalid_request", "message": str(error)}}
        sys.stdout.write(json.dumps(response, separators=(",", ":"), allow_nan=False) + "\n")
        sys.stdout.flush()


if __name__ == "__main__":
    main()
