"""Shared regression images for the Python service and the real Android runtime."""

import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageOps

from gea_photo.core import PhotoIndex, Sample, Target

NEGATIVE_FILES: tuple[tuple[str, str], ...] = (
    ("P01", "P01/4-elephas_celebensis.JPG"),
    ("P02", "P02/3-plate_coral.JPG"),
    ("P03", "P03/4-batupasir.JPG"),
    ("P07", "P07/3-amethyst.JPG"),
    ("P09", "P09/3-meteorit_besi.JPG"),
    ("P10", "P10/3-peridotit.JPG"),
    ("P11", "P11/3-bijih_tembaga.JPG"),
)


def label_only_image(name: str) -> Image.Image:
    image: Image.Image = Image.new("RGB", (800, 800), "white")
    ImageDraw.Draw(image).text((100, 350), name, fill="black", font_size=65)
    return image


def write_android_fixtures(
    index: PhotoIndex, artifacts: Path, assets: Path, destination: Path
) -> None:
    """Generate debug-test-only photos; no visitor or survey photos enter the release assets."""
    destination.mkdir(parents=True, exist_ok=True)
    cases: list[dict[str, str]] = []
    for target in index.targets:
        sample: Sample = next(
            sample
            for sample in index.samples
            if sample.poi == target.poi and not sample.label_visible
        )
        filename: str = f"{target.poi}.jpg"
        with Image.open(artifacts / sample.cleaned) as image:
            image.save(destination / filename, quality=85)
        cases.append({"file": filename, "questId": target.quest_id, "expected": "accepted"})
        wrong: Target = next(
            candidate for candidate in index.targets if candidate.poi != target.poi
        )
        cases.append({"file": filename, "questId": wrong.quest_id, "expected": "retake"})
        label_filename: str = f"{target.poi}-label-only.jpg"
        label_only_image(target.aliases[0]).save(destination / label_filename, quality=90)
        cases.append({"file": label_filename, "questId": target.quest_id, "expected": "retake"})
    for poi, relative_path in NEGATIVE_FILES:
        target = next(target for target in index.targets if target.poi == poi)
        negative_filename: str = f"{poi}-other-object.jpg"
        with Image.open(assets / relative_path) as original:
            negative: Image.Image = ImageOps.contain(
                ImageOps.exif_transpose(original).convert("RGB"),
                (2048, 2048),
                Image.Resampling.LANCZOS,
            )
        negative.save(destination / negative_filename, quality=90)
        cases.append({"file": negative_filename, "questId": target.quest_id, "expected": "retake"})
    Image.new("RGB", (800, 800), "white").save(destination / "blank.jpg")
    cases.append({"file": "blank.jpg", "questId": index.targets[0].quest_id, "expected": "retake"})
    (destination / "cases.json").write_text(json.dumps(cases, indent=2), encoding="utf-8")
