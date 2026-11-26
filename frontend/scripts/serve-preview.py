"""Serve one exported web build without caching pages or lazy JavaScript chunks."""

import argparse
import sys
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


class PreviewHandler(SimpleHTTPRequestHandler):
    """Keep localhost clients on the build currently served by this process."""

    def end_headers(self) -> None:
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


def main(arguments: list[str]) -> None:
    """Serve an explicit build directory and fail if it has no entry page."""
    parser: argparse.ArgumentParser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--directory", required=True, type=Path)
    parser.add_argument("--bind", required=True)
    parser.add_argument("--port", required=True, type=int)
    options: argparse.Namespace = parser.parse_args(arguments)
    directory: Path = options.directory.resolve(strict=True)
    host: str = options.bind
    port: int = options.port
    if not (directory / "index.html").is_file():
        raise FileNotFoundError(f"Build web tidak lengkap: {directory / 'index.html'}")
    handler: partial[PreviewHandler] = partial(PreviewHandler, directory=str(directory))
    with ThreadingHTTPServer((host, port), handler) as server:
        print(f"Preview: http://{host}:{port}; directory={directory}; cache=no-store", flush=True)
        server.serve_forever()


if __name__ == "__main__":
    main(sys.argv[1:])
