"""Real-model HTTP smoke test. Run with explicit --artifacts and --cache paths.

Positive samples are known references: regression checks only, not an accuracy estimate.
Unreadable labels, wrong quest, blank frame, label-only images, authentication, and invalid input
are exercised. Missing labels must not block a sufficiently clear visual match.
"""

import argparse
import io
import json
from pathlib import Path

import torch
from fastapi.testclient import TestClient
from PIL import Image, ImageOps

from gea_photo.core import PhotoIndex, Target
from gea_photo.fixtures import NEGATIVE_FILES, label_only_image
from gea_photo.service import create_app, load_index


def jpeg_bytes(image: Image.Image) -> bytes:
    stream: io.BytesIO = io.BytesIO()
    image.save(stream, format="JPEG", quality=90)
    return stream.getvalue()


def main() -> None:
    parser: argparse.ArgumentParser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--artifacts", type=Path, required=True)
    parser.add_argument("--cache", type=Path, required=True)
    parser.add_argument("--assets", type=Path, required=True)
    args: argparse.Namespace = parser.parse_args()
    torch.set_num_threads(4)
    index: PhotoIndex = load_index(args.artifacts)[0]
    token: str = "local-real-model-smoke-token-000000000000"
    checks: list[dict[str, str]] = []
    with TestClient(create_app(args.artifacts, args.cache, token)) as client:
        headers: dict[str, str] = {"authorization": f"Bearer {token}"}
        assert client.get("/health").status_code == 200
        assert client.get("/").status_code == 200
        first: Target = index.targets[0]
        invalid = client.post(
            "/verify",
            data={"quest_id": first.quest_id},
            files={"photo": ("bad.jpg", b"not an image", "image/jpeg")},
            headers=headers,
        )
        assert invalid.status_code == 422, invalid.text
        unauthorized = client.post(
            "/verify",
            data={"quest_id": first.quest_id},
            files={"photo": ("bad.jpg", b"bad", "image/jpeg")},
            headers={"authorization": "Bearer invalid"},
        )
        assert unauthorized.status_code == 401, unauthorized.text
        for target in index.targets:
            positives = tuple(
                sample
                for sample in index.samples
                if sample.poi == target.poi and sample.label_visible
            )
            assert positives, f"Tidak ada label terbaca untuk {target.poi}"
            data: bytes = (args.artifacts / positives[0].cleaned).read_bytes()
            response = client.post(
                "/verify",
                data={"quest_id": target.quest_id},
                files={"photo": ("capture.jpg", data, "image/jpeg")},
                headers=headers,
            )
            assert response.status_code == 200, response.text
            assert response.json()["decision"] == "accepted", response.text
            unlabeled = next(
                sample
                for sample in index.samples
                if sample.poi == target.poi and not sample.label_visible
            )
            no_label = client.post(
                "/verify",
                data={"quest_id": target.quest_id},
                files={
                    "photo": (
                        "no-label.jpg",
                        (args.artifacts / unlabeled.cleaned).read_bytes(),
                        "image/jpeg",
                    )
                },
                headers=headers,
            )
            assert no_label.status_code == 200, no_label.text
            assert no_label.json()["label_matched"] is False, no_label.text
            assert no_label.json()["decision"] == "accepted", no_label.text
            other: Target = next(item for item in index.targets if item.poi != target.poi)
            wrong = client.post(
                "/verify",
                data={"quest_id": other.quest_id},
                files={"photo": ("wrong.jpg", data, "image/jpeg")},
                headers=headers,
            )
            assert wrong.status_code == 200 and wrong.json()["decision"] == "retake", wrong.text
            label_image: Image.Image = label_only_image(target.aliases[0])
            label_only = client.post(
                "/verify",
                data={"quest_id": target.quest_id},
                files={"photo": ("label.jpg", jpeg_bytes(label_image), "image/jpeg")},
                headers=headers,
            )
            assert label_only.status_code == 200 and label_only.json()["decision"] == "retake", (
                label_only.text
            )
            checks.append(
                {
                    "target": target.poi,
                    "known_reference": "accepted",
                    "unreadable_label": "accepted",
                    "wrong_quest": "retake",
                    "label_only": "retake",
                }
            )
        for poi, relative_path in NEGATIVE_FILES:
            target = next(item for item in index.targets if item.poi == poi)
            with Image.open(args.assets / relative_path) as original:
                negative: Image.Image = ImageOps.contain(
                    ImageOps.exif_transpose(original).convert("RGB"),
                    (2048, 2048),
                    Image.Resampling.LANCZOS,
                )
            other_object = client.post(
                "/verify",
                data={"quest_id": target.quest_id},
                files={"photo": ("other.jpg", jpeg_bytes(negative), "image/jpeg")},
                headers=headers,
            )
            assert (
                other_object.status_code == 200 and other_object.json()["decision"] == "retake"
            ), other_object.text
            checks.append({"target": poi, "other_object": relative_path, "decision": "retake"})
        blank = client.post(
            "/verify",
            data={"quest_id": first.quest_id},
            files={
                "photo": (
                    "blank.jpg",
                    jpeg_bytes(Image.new("RGB", (800, 800), "white")),
                    "image/jpeg",
                )
            },
            headers=headers,
        )
        assert blank.status_code == 200 and blank.json()["decision"] == "retake", blank.text
    report: dict[str, object] = {"scope": __doc__, "passed": True, "checks": checks}
    (args.artifacts / "smoke.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
