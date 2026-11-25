"""gea-photo build/serve/predict/export. Run --help for explicit artifact/cache paths."""

import argparse
import json
import logging
import os
import shutil
from pathlib import Path

import torch
import uvicorn

from gea_photo.build import build
from gea_photo.service import PhotoVerifier, create_app


def main() -> None:
    parser: argparse.ArgumentParser = argparse.ArgumentParser(description=__doc__)
    commands: argparse._SubParsersAction[argparse.ArgumentParser] = parser.add_subparsers(
        dest="command", required=True
    )
    for name in ("build", "predict", "serve", "export"):
        command: argparse.ArgumentParser = commands.add_parser(name)
        command.add_argument("--artifacts", type=Path, required=True)
        if name != "export":
            command.add_argument("--cache", type=Path, required=True)
        if name == "build":
            command.add_argument("--assets", type=Path, required=True)
        if name == "predict":
            command.add_argument("--photo", type=Path, required=True)
            command.add_argument("--quest-id", required=True)
        if name == "serve":
            command.add_argument("--host", required=True)
            command.add_argument("--port", type=int, required=True)
        if name == "export":
            command.add_argument("--cache", type=Path, required=True)
            command.add_argument("--destination", type=Path, required=True)
    args: argparse.Namespace = parser.parse_args()
    logging.basicConfig(level=logging.INFO)
    torch.set_num_threads(4)
    if args.command == "build":
        index = build(args.assets.resolve(), args.artifacts.resolve(), args.cache.resolve())
        print(
            json.dumps(
                {
                    "event": "index_ready",
                    "version": index.version,
                    "references": len(index.samples),
                    "scope": index.validation_scope,
                }
            )
        )
    elif args.command == "predict":
        verifier: PhotoVerifier = PhotoVerifier(args.artifacts.resolve(), args.cache.resolve())
        print(verifier.verify(args.photo.read_bytes(), args.quest_id).model_dump_json(indent=2))
    elif args.command == "serve":
        token: str = os.environ["GEA_PHOTO_MODEL_TOKEN"]
        uvicorn.run(
            create_app(args.artifacts.resolve(), args.cache.resolve(), token),
            host=args.host,
            port=args.port,
            workers=1,
        )
    elif args.command == "export":
        export(args.artifacts.resolve(), args.cache.resolve(), args.destination.resolve())


def export(artifacts: Path, cache: Path, destination: Path) -> None:
    """Package a self-contained Docker Space; refuse overwriting an existing release directory."""
    if destination.exists():
        raise FileExistsError(f"Pilih direktori rilis baru: {destination}")
    source: Path = Path(__file__).resolve().parent.parent
    destination.mkdir(parents=True)
    for name in ("pyproject.toml", "Dockerfile"):
        shutil.copy2(source / name, destination / name)
    (destination / "README.md").write_text(
        "---\ntitle: GEA Photo Hunt\nsdk: docker\napp_port: 7860\n---\n",
        encoding="utf-8",
    )
    shutil.copytree(
        source / "gea_photo",
        destination / "gea_photo",
        ignore=shutil.ignore_patterns("__pycache__"),
    )
    (destination / "artifacts").mkdir()
    for name in ("index.json", "features.npy", "validation.json"):
        shutil.copy2(artifacts / name, destination / "artifacts" / name)
    shutil.copytree(cache, destination / "cache")
    print(json.dumps({"event": "release_exported", "destination": str(destination)}))


if __name__ == "__main__":
    main()
