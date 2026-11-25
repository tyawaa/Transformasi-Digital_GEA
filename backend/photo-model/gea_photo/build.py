"""Clean originals non-destructively, build references, and report same-session diagnostics."""

import hashlib
import json
from pathlib import Path
from typing import TypedDict

import numpy as np
from PIL import Image, ImageOps

from gea_photo.catalog import MODEL_ID, MODEL_REVISION, TARGETS
from gea_photo.connectors import LabelReader, VisualEncoder, prepare_ocr_font
from gea_photo.core import (
    OcrLine,
    PhotoIndex,
    Quality,
    Sample,
    Threshold,
    Vector,
    class_scores,
    label_matches,
    pixel_hash,
    quality,
)


class Probe(TypedDict):
    source: str
    poi: str
    group: str
    predicted: str
    scores: dict[str, float]


def build(assets: Path, output: Path, cache: Path) -> PhotoIndex:
    """Originals stay intact; JPEGs have orientation normalized and EXIF removed.

    Every source is explicitly audited. Pixel-identical duplicates are excluded, not silently
    relabeled. No synthetic views are counted as independent validation samples.
    """
    output.mkdir(parents=True, exist_ok=True)
    encoder: VisualEncoder = VisualEncoder(MODEL_ID, MODEL_REVISION, cache / "huggingface")
    reader: LabelReader = LabelReader(prepare_ocr_font(cache))
    samples: list[Sample] = []
    vectors: list[Vector] = []
    seen: dict[str, str] = {}
    duplicates: list[dict[str, str]] = []
    expected_folders: set[str] = {f"{target.poi}_PhotoHunt" for target in TARGETS}
    actual_folders: set[str] = {path.name for path in assets.glob("*_PhotoHunt") if path.is_dir()}
    if actual_folders != expected_folders:
        raise ValueError(
            f"Folder PhotoHunt tidak sesuai katalog: {actual_folders ^ expected_folders}"
        )
    for target in TARGETS:
        folder: Path = assets / f"{target.poi}_PhotoHunt"
        sources: tuple[Path, ...] = tuple(sorted(folder.iterdir()))
        if len(sources) != len(target.view_groups):
            raise ValueError(f"Jumlah foto {folder} berubah; tinjau ulang anotasi kelompok sudut.")
        for source, group in zip(sources, target.view_groups, strict=True):
            with Image.open(source) as original:
                original.verify()
            with Image.open(source) as original:
                image: Image.Image = ImageOps.contain(
                    ImageOps.exif_transpose(original).convert("RGB"),
                    (2048, 2048),
                    Image.Resampling.LANCZOS,
                )
            digest: str = pixel_hash(image)
            if digest in seen:
                duplicates.append(
                    {"source": str(source.relative_to(assets)), "same_as": seen[digest]}
                )
                continue
            seen[digest] = str(source.relative_to(assets))
            cleaned: Path = Path("cleaned") / target.poi / f"{digest[:16]}.jpg"
            (output / cleaned).parent.mkdir(parents=True, exist_ok=True)
            image.save(output / cleaned, quality=92, optimize=True)
            # Reopen the actual artifact so build and serving preprocess exactly the same pixels.
            with Image.open(output / cleaned) as saved:
                cleaned_image: Image.Image = saved.convert("RGB")
            lines: tuple[OcrLine, ...] = reader.read(cleaned_image)
            image_quality: Quality = quality(cleaned_image)
            sample: Sample = Sample(
                source=source.relative_to(assets).as_posix(),
                cleaned=cleaned.as_posix(),
                poi=target.poi,
                view_group=group,
                session="survey-20261123",
                source_sha256=hashlib.sha256(source.read_bytes()).hexdigest(),
                pixel_sha256=digest,
                width=cleaned_image.width,
                height=cleaned_image.height,
                brightness=image_quality.brightness,
                sharpness=image_quality.sharpness,
                ocr=tuple(line.text for line in lines),
                label_visible=label_matches(lines, target.aliases),
            )
            samples.append(sample)
            vectors.append(encoder.encode((cleaned_image,))[0])
            print(
                json.dumps(
                    {
                        "event": "reference_prepared",
                        "source": sample.source,
                        "label_readable": sample.label_visible,
                    }
                ),
                flush=True,
            )
    references: Vector = np.stack(vectors).astype(np.float32)
    sample_tuple: tuple[Sample, ...] = tuple(samples)
    probes: tuple[Probe, ...] = angle_probes(references, sample_tuple)
    thresholds: dict[str, Threshold] = calibrate_thresholds(probes)
    version: str = hashlib.sha256(
        references.tobytes()
        + json.dumps(
            {key: value.model_dump() for key, value in thresholds.items()}, sort_keys=True
        ).encode()
        + MODEL_REVISION.encode()
    ).hexdigest()[:16]
    index: PhotoIndex = PhotoIndex(
        schema_version=1,
        model_id=MODEL_ID,
        revision=MODEL_REVISION,
        version=version,
        targets=TARGETS,
        samples=sample_tuple,
        thresholds=thresholds,
        validation_scope="PROVISIONAL: same-session angle holdouts used for threshold calibration; these scores are not independent test accuracy. Unknown-object performance is unmeasured.",
    )
    np.save(output / "features.npy", references, allow_pickle=False)
    (output / "index.json").write_text(index.model_dump_json(indent=2), encoding="utf-8")
    report: dict[str, object] = {
        "scope": index.validation_scope,
        "model_version": version,
        "original_count": sum(len(target.view_groups) for target in TARGETS),
        "reference_count": len(samples),
        "duplicates_excluded": duplicates,
        "angle_top1_correct": sum(probe["predicted"] == probe["poi"] for probe in probes),
        "angle_probe_count": len(probes),
        "per_target": {
            target.poi: {
                "references": sum(sample.poi == target.poi for sample in samples),
                "readable_labels": sum(
                    sample.poi == target.poi and sample.label_visible for sample in samples
                ),
                "visual_gate_passed": sum(
                    probe["poi"] == target.poi
                    and passes_visual_gate(probe["scores"], target.poi, thresholds[target.poi])
                    for probe in probes
                ),
                "cross_target_false_accepts": sum(
                    probe["poi"] != target.poi
                    and passes_visual_gate(probe["scores"], target.poi, thresholds[target.poi])
                    for probe in probes
                ),
                "threshold": thresholds[target.poi].model_dump(),
            }
            for target in TARGETS
        },
        "probes": probes,
    }
    (output / "validation.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    return index


def calibrate_thresholds(probes: tuple[Probe, ...]) -> dict[str, Threshold]:
    """Calibrate the JOINT similarity/margin gate, never similarity in isolation.

    Similar-looking rocks can have high similarity to several targets. Their scores only
    constrain a target's similarity threshold when they also pass its winning margin.
    OCR supplies additional evidence; the visual gate also applies when no label is readable.
    """
    margin: float = 0.04
    return {
        target.poi: Threshold(
            similarity=min(
                0.99,
                max(
                    (
                        0.60,
                        *(
                            probe["scores"][target.poi] + 0.01
                            for probe in probes
                            if probe["poi"] != target.poi
                            and probe["scores"][target.poi]
                            - max(
                                score for poi, score in probe["scores"].items() if poi != target.poi
                            )
                            >= margin
                        ),
                    )
                ),
            ),
            margin=margin,
        )
        for target in TARGETS
    }


def angle_probes(references: Vector, samples: tuple[Sample, ...]) -> tuple[Probe, ...]:
    """Exclude ALL photographs in the query's target/angle group, not just the query itself."""
    probes: list[Probe] = []
    for i, sample in enumerate(samples):
        included: tuple[int, ...] = tuple(
            j
            for j, other in enumerate(samples)
            if (other.poi, other.view_group) != (sample.poi, sample.view_group)
        )
        scores: dict[str, float] = class_scores(
            references[i],
            references[list(included)],
            tuple(samples[j] for j in included),
            TARGETS,
        )
        probes.append(
            Probe(
                source=sample.source,
                poi=sample.poi,
                group=sample.view_group,
                predicted=max(scores, key=lambda key: scores[key]),
                scores=scores,
            )
        )
    return tuple(probes)


def passes_visual_gate(scores: dict[str, float], poi: str, threshold: Threshold) -> bool:
    return (
        scores[poi] >= threshold.similarity
        and (scores[poi] - max(value for key, value in scores.items() if key != poi))
        >= threshold.margin
    )
