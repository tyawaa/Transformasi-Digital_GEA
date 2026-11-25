"""Immutable dataset contracts and pure image preparation/decision functions."""

import hashlib
import io
import re
import unicodedata
from typing import Literal

import numpy as np
from numpy.typing import NDArray
from PIL import Image, ImageOps
from pydantic import BaseModel, ConfigDict, Field

Vector = NDArray[np.float32]
Decision = Literal["accepted", "retake"]
ACCEPTANCE_POLICY: str = "object-match-v2"


class FrozenModel(BaseModel):
    model_config = ConfigDict(frozen=True, extra="forbid")


class Target(FrozenModel):
    poi: str
    quest_id: str
    name: str
    aliases: tuple[str, ...]
    view_groups: tuple[str, ...]


class Sample(FrozenModel):
    source: str
    cleaned: str
    poi: str
    view_group: str
    session: str
    source_sha256: str
    pixel_sha256: str
    width: int
    height: int
    brightness: float
    sharpness: float
    ocr: tuple[str, ...]
    label_visible: bool


class Threshold(FrozenModel):
    similarity: float
    margin: float


class PhotoIndex(FrozenModel):
    schema_version: Literal[1]
    model_id: str
    revision: str
    version: str
    targets: tuple[Target, ...]
    samples: tuple[Sample, ...]
    thresholds: dict[str, Threshold]
    validation_scope: str


class Quality(FrozenModel):
    brightness: float
    sharpness: float


class OcrLine(FrozenModel):
    text: str
    score: float


class Verdict(FrozenModel):
    quest_id: str
    decision: Decision
    reason: str
    target: str
    matched: str
    similarity: float = Field(ge=-1, le=1.001)
    margin: float
    label_matched: bool
    label_text: tuple[str, ...]
    model_version: str
    image_sha256: str


def normalized_text(text: str) -> str:
    """Normalize OCR without fuzzy matching that could turn another label into a target."""
    ascii_text: str = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", " ", ascii_text.lower()).strip()


def label_matches(lines: tuple[OcrLine, ...], aliases: tuple[str, ...]) -> bool:
    return any(
        f" {normalized_text(alias)} " in f" {normalized_text(line.text)} "
        for line in lines
        if line.score >= 0.75
        for alias in aliases
    )


def decode_photo(data: bytes) -> Image.Image:
    """Decode bounded JPEG/PNG input, apply EXIF orientation, and remove metadata on save."""
    if len(data) > 6 * 1024 * 1024:
        raise ValueError("Foto maksimal 6 MiB; ambil ulang dengan resolusi lebih kecil.")
    with Image.open(io.BytesIO(data)) as image:
        if image.format not in ("JPEG", "PNG"):
            raise ValueError("Foto harus JPEG atau PNG.")
        if image.width * image.height > 24_000_000 or min(image.size) < 224:
            raise ValueError("Foto harus minimal 224 piksel per sisi dan maksimal 24 megapiksel.")
        oriented: Image.Image = ImageOps.exif_transpose(image).convert("RGB")
        return ImageOps.contain(oriented, (2048, 2048), Image.Resampling.LANCZOS)


def quality(image: Image.Image) -> Quality:
    small: Image.Image = ImageOps.contain(image.convert("L"), (512, 512))
    pixels: Vector = np.asarray(small, dtype=np.float32)
    laplacian: Vector = (
        pixels[1:-1, :-2]
        + pixels[1:-1, 2:]
        + pixels[:-2, 1:-1]
        + pixels[2:, 1:-1]
        - 4 * pixels[1:-1, 1:-1]
    )
    return Quality(brightness=float(pixels.mean()), sharpness=float(laplacian.var()))


def pixel_hash(image: Image.Image) -> str:
    return hashlib.sha256(f"{image.size}".encode() + image.tobytes()).hexdigest()


def image_tensor_array(image: Image.Image) -> Vector:
    """Letterbox rather than center-crop: preserve the entire object in portrait captures."""
    square: Image.Image = ImageOps.pad(
        image, (224, 224), Image.Resampling.BICUBIC, color=(124, 116, 104)
    )
    values: Vector = np.asarray(square, dtype=np.float32) / np.float32(255)
    mean: Vector = np.asarray([0.485, 0.456, 0.406], dtype=np.float32)
    std: Vector = np.asarray([0.229, 0.224, 0.225], dtype=np.float32)
    return np.asarray(((values - mean) / std).transpose(2, 0, 1), dtype=np.float32)


def class_scores(
    query: Vector, references: Vector, samples: tuple[Sample, ...], targets: tuple[Target, ...]
) -> dict[str, float]:
    """Average two nearest views to reduce dependence on one lucky reference match."""
    similarities: Vector = references @ query
    return {
        target.poi: float(
            np.mean(
                sorted(
                    float(similarities[i])
                    for i, sample in enumerate(samples)
                    if sample.poi == target.poi
                )[-2:]
            )
        )
        for target in targets
    }


def decide(
    target: Target,
    scores: dict[str, float],
    threshold: Threshold,
    lines: tuple[OcrLine, ...],
    image_quality: Quality,
    model_version: str,
    image_sha256: str,
) -> Verdict:
    matched: str = max(scores, key=lambda key: scores[key])
    similarity: float = scores[target.poi]
    margin: float = similarity - max(score for poi, score in scores.items() if poi != target.poi)
    decision: Decision
    reason: str
    label_matched: bool = label_matches(lines, target.aliases)
    if image_quality.brightness < 20 or image_quality.sharpness < 12:
        decision, reason = (
            "retake",
            "Foto kurang jelas. Tambah cahaya dan tahan kamera tetap stabil.",
        )
    elif similarity < threshold.similarity or margin < threshold.margin:
        decision, reason = (
            "retake",
            "Objek belum dapat dipastikan. Posisikan objek di tengah dan foto lebih dekat dari depan.",
        )
    elif label_matched:
        decision, reason = (
            "accepted",
            "Objek sesuai dengan target quest; label nama juga terbaca.",
        )
    else:
        decision, reason = (
            "accepted",
            "Objek sesuai dengan target quest. Label nama tidak wajib terlihat.",
        )
    return Verdict(
        quest_id=target.quest_id,
        decision=decision,
        reason=reason,
        target=target.poi,
        matched=matched,
        similarity=similarity,
        margin=margin,
        label_matched=label_matched,
        label_text=tuple(line.text for line in lines if line.score >= 0.75),
        model_version=model_version,
        image_sha256=image_sha256,
    )
