"""Export a self-contained Android model and verify its real ONNX decisions before packaging."""

import argparse
import hashlib
import json
from pathlib import Path
from typing import TypedDict

import numpy as np
import onnx
import onnxruntime as ort
import torch
from PIL import Image, ImageOps
from transformers import Dinov2Model

from gea_photo.connectors import VisualEncoder
from gea_photo.core import PhotoIndex, Target, Vector, class_scores, decide, quality
from gea_photo.fixtures import write_android_fixtures

MOBILE_POLICY: str = "object-match-android-v1"


class MobileTarget(TypedDict):
    questId: str
    poi: str
    name: str
    similarity: float
    margin: float


class MobileManifest(TypedDict):
    schemaVersion: int
    modelVersion: str
    sourceModel: str
    sourceRevision: str
    modelSha256: str
    featuresSha256: str
    dimensions: int
    referenceTargets: list[str]
    targets: list[MobileTarget]
    validationScope: str
    labelRequired: bool


class EmbeddingExport(torch.nn.Module):  # type: ignore[misc]  # Torch imports use skipped third-party stubs.
    """Torch export interface exposing only the normalized DINOv2 CLS vector."""

    def __init__(self, backbone: Dinov2Model) -> None:
        super().__init__()
        self.backbone: Dinov2Model = backbone

    def forward(self, pixels: torch.Tensor) -> torch.Tensor:
        features: torch.Tensor = self.backbone(pixel_values=pixels).last_hidden_state[:, 0, :]
        return torch.nn.functional.normalize(features, dim=1)


def mobile_pixels(image: Image.Image) -> Vector:
    """Prepare bilinear letterboxed RGB tensors for mobile reference generation."""
    ratio: float = min(224 / image.width, 224 / image.height)
    width: int = max(1, int(image.width * ratio + 0.5))
    height: int = max(1, int(image.height * ratio + 0.5))
    resized: Image.Image = image.resize((width, height), Image.Resampling.BILINEAR)
    square: Image.Image = Image.new("RGB", (224, 224), (124, 116, 104))
    square.paste(resized, ((224 - width) // 2, (224 - height) // 2))
    pixels: Vector = np.asarray(square, dtype=np.float32) / np.float32(255)
    mean: Vector = np.asarray([0.485, 0.456, 0.406], dtype=np.float32)
    std: Vector = np.asarray([0.229, 0.224, 0.225], dtype=np.float32)
    return np.asarray(((pixels - mean) / std).transpose(2, 0, 1), dtype=np.float32)


def infer(session: ort.InferenceSession, image: Image.Image) -> Vector:
    pixels: Vector = mobile_pixels(image)[None, :]
    return np.asarray(session.run(["embedding"], {"pixels": pixels})[0][0], dtype=np.float32)


def read_rgb(path: Path) -> Image.Image:
    with Image.open(path) as source:
        return ImageOps.exif_transpose(source).convert("RGB")


def export_mobile(
    artifacts: Path, cache: Path, destination: Path, test_assets: Path, assets: Path
) -> None:
    index: PhotoIndex = PhotoIndex.model_validate_json(
        (artifacts / "index.json").read_text("utf-8")
    )
    encoder: VisualEncoder = VisualEncoder(index.model_id, index.revision, cache / "huggingface")
    encoder.model.set_attn_implementation("eager")
    wrapper: EmbeddingExport = EmbeddingExport(encoder.model).eval()
    staging: Path = artifacts / "mobile"
    staging.mkdir(parents=True, exist_ok=True)
    model_path: Path = staging / "model.onnx"
    torch.onnx.export(
        wrapper,
        (torch.zeros(1, 3, 224, 224),),
        str(model_path),
        input_names=["pixels"],
        output_names=["embedding"],
        opset_version=17,
        dynamo=False,
        external_data=False,
    )
    onnx.checker.check_model(str(model_path))
    options: ort.SessionOptions = ort.SessionOptions()
    options.intra_op_num_threads = 2
    options.inter_op_num_threads = 1
    session: ort.InferenceSession = ort.InferenceSession(
        str(model_path), options, providers=["CPUExecutionProvider"]
    )
    images: tuple[Image.Image, ...] = tuple(
        read_rgb(artifacts / sample.cleaned) for sample in index.samples
    )
    features: Vector = np.stack(tuple(infer(session, image) for image in images))
    if features.shape != (len(index.samples), 384) or not np.isfinite(features).all():
        raise ValueError("Invalid mobile feature matrix.")
    largest_error: float = 0
    for position in range(0, len(images), 8):
        batch: torch.Tensor = torch.from_numpy(
            np.stack(tuple(mobile_pixels(image) for image in images[position : position + 8]))
        )
        with torch.inference_mode():
            expected: Vector = np.asarray(wrapper(batch).numpy(), dtype=np.float32)
        error: float = float(np.max(np.abs(expected - features[position : position + 8])))
        largest_error = max(largest_error, error)
    if largest_error > 0.0001:
        raise ValueError(f"ONNX export differs from Torch: maximum feature error {largest_error}.")
    checks: list[dict[str, str]] = []
    for sample, image, query in zip(index.samples, images, features, strict=True):
        target: Target = next(target for target in index.targets if target.poi == sample.poi)
        scores: dict[str, float] = class_scores(query, features, index.samples, index.targets)
        verdict = decide(
            target, scores, index.thresholds[target.poi], (), quality(image), MOBILE_POLICY, ""
        )
        if verdict.decision != "accepted":
            raise ValueError(
                f"Mobile reference regression: {sample.source}: {verdict.model_dump_json()}"
            )
        wrong: Target = next(
            candidate for candidate in index.targets if candidate.poi != target.poi
        )
        rejected = decide(
            wrong, scores, index.thresholds[wrong.poi], (), quality(image), MOBILE_POLICY, ""
        )
        if rejected.decision != "retake":
            raise ValueError(f"Mobile wrong-quest regression: {sample.source}")
        checks.append(
            {"source": sample.source, "known_reference": "accepted", "wrong_quest": "retake"}
        )
    feature_bytes: bytes = np.asarray(features, dtype="<f4").tobytes()
    model_bytes: bytes = model_path.read_bytes()
    manifest: MobileManifest = {
        "schemaVersion": 1,
        "modelVersion": f"{index.version}:{MOBILE_POLICY}",
        "sourceModel": index.model_id,
        "sourceRevision": index.revision,
        "modelSha256": hashlib.sha256(model_bytes).hexdigest(),
        "featuresSha256": hashlib.sha256(feature_bytes).hexdigest(),
        "dimensions": 384,
        "referenceTargets": [sample.poi for sample in index.samples],
        "targets": [
            {
                "questId": target.quest_id,
                "poi": target.poi,
                "name": target.name,
                "similarity": index.thresholds[target.poi].similarity,
                "margin": index.thresholds[target.poi].margin,
            }
            for target in index.targets
        ],
        "validationScope": index.validation_scope,
        "labelRequired": False,
    }
    destination.mkdir(parents=True, exist_ok=True)
    (destination / "model.onnx").write_bytes(model_bytes)
    (destination / "features.bin").write_bytes(feature_bytes)
    (destination / "DINOV2_LICENSE.txt").write_text(
        (Path(__file__).parent / "licenses" / "dinov2.txt").read_text("utf-8"), encoding="utf-8"
    )
    (destination / "NOTICE.txt").write_text(
        "DINOv2 pretrained visual encoder by Meta Platforms, Inc. and affiliates.\n"
        "Source: https://github.com/facebookresearch/dinov2\n"
        f"Weights: {index.model_id}, revision {index.revision}.\n"
        "License: Apache License 2.0; see DINOV2_LICENSE.txt.\n",
        encoding="utf-8",
    )
    (destination / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    write_android_fixtures(index, artifacts, assets, test_assets)
    report: dict[str, object] = {
        "passed": True,
        "maximumFeatureError": largest_error,
        "knownReferences": len(checks),
        "wrongQuestRejected": len(checks),
        "scope": "Known references and wrong-quest regressions; not independent field accuracy.",
        "modelBytes": len(model_bytes),
        "featureBytes": len(feature_bytes),
        "checks": checks,
    }
    (staging / "validation.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps({key: value for key, value in report.items() if key != "checks"}))


def main() -> None:
    parser: argparse.ArgumentParser = argparse.ArgumentParser(description=__doc__)
    for name in ("artifacts", "cache", "destination", "test-assets", "assets"):
        parser.add_argument(f"--{name}", type=Path, required=True)
    args: argparse.Namespace = parser.parse_args()
    torch.set_num_threads(4)
    export_mobile(
        args.artifacts.resolve(),
        args.cache.resolve(),
        args.destination.resolve(),
        args.test_assets.resolve(),
        args.assets.resolve(),
    )


if __name__ == "__main__":
    main()
