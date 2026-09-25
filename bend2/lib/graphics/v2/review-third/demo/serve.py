#!/usr/bin/env python3
"""Serve this portable checkpoint locally; module workers require HTTP, not file://."""
from pathlib import Path
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
import argparse,functools


class ModuleHandler(SimpleHTTPRequestHandler):
    """Serve ESM with a JavaScript MIME type for strict module-worker browsers."""
    extensions_map = {**SimpleHTTPRequestHandler.extensions_map, '.mjs': 'text/javascript', '.js': 'text/javascript'}

def main() -> None:
    """Serve only the delivered checkpoint on loopback and print the demo address."""
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--port',type=int,default=8765);args=parser.parse_args()
    root=Path(__file__).resolve().parents[2];handler=functools.partial(ModuleHandler,directory=str(root));server=ThreadingHTTPServer(('127.0.0.1',args.port),handler)
    print(f'Open http://127.0.0.1:{args.port}/review-third/demo/ in a browser.',flush=True)
    try:server.serve_forever()
    except KeyboardInterrupt:pass
    finally:server.server_close()

if __name__=='__main__':main()
