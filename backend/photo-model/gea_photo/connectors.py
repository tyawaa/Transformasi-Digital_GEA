"""Local connectors to pinned Hugging Face weights and PaddleOCR through RapidOCR."""

import logging
import hashlib
import time
from pathlib import Path

import numpy as np
import torch
import requests
from huggingface_hub.errors import HfHubHTTPError, LocalEntryNotFoundError
from PIL import Image
from rapidocr import RapidOCR
from rapidocr.utils.output import RapidOCROutput
from transformers import Dinov2Model

from gea_photo.core import OcrLine, Vector, image_tensor_array

LOGGER: logging.Logger = logging.getLogger(__name__)


def prepare_ocr_font(cache: Path) -> Path:
    """Cache RapidOCR's pinned visualization font so inference has no implicit downloads."""
    font: Path = cache / "ocr" / "FZYTK.TTF"
    expected: str = "4065a23df6823c8e2b69a0e76d02f02a6470b8774a5e91086609701ad95cc33f"
    if font.exists():
        if hashlib.sha256(font.read_bytes()).hexdigest() != expected:
            raise ValueError(f"Checksum font OCR tidak sesuai: {font}")
        return font
    url: str = (
        "https://www.modelscope.cn/models/RapidAI/RapidOCR/resolve/v3.4.0/resources/fonts/FZYTK.TTF"
    )
    for attempt in range(3):
        try:
            response: requests.Response = requests.get(url, timeout=30)
            response.raise_for_status()
            if hashlib.sha256(response.content).hexdigest() != expected:
                raise ValueError(f"Checksum font OCR dari {url} tidak sesuai.")
            font.parent.mkdir(parents=True, exist_ok=True)
            font.write_bytes(response.content)
            return font
        except requests.RequestException as error:
            if attempt == 2:
                raise
            LOGGER.warning(
                "ocr_font_download_retry",
                extra={"url": url, "attempt": attempt + 1, "error": str(error)},
            )
            time.sleep(attempt + 1)
    raise RuntimeError("OCR font retry loop ended unexpectedly")


class VisualEncoder:
    """Frozen CPU encoder; cache directory is explicit and weights are revision-pinned."""

    def __init__(self, model_id: str, revision: str, cache: Path) -> None:
        for attempt in range(3):
            try:
                self.model: Dinov2Model = Dinov2Model.from_pretrained(
                    model_id,
                    revision=revision,
                    cache_dir=str(cache),
                    use_safetensors=True,
                ).eval()
                break
            except (OSError, HfHubHTTPError, LocalEntryNotFoundError) as error:
                if attempt == 2:
                    raise
                LOGGER.warning(
                    "model_download_retry",
                    extra={
                        "model_id": model_id,
                        "revision": revision,
                        "attempt": attempt + 1,
                        "error": str(error),
                    },
                )
                time.sleep(attempt + 1)

    def encode(self, images: tuple[Image.Image, ...]) -> Vector:
        with torch.inference_mode():
            pixels: torch.Tensor = torch.from_numpy(
                np.stack(tuple(image_tensor_array(image) for image in images))
            )
            features: torch.Tensor = self.model(pixel_values=pixels).last_hidden_state[:, 0, :]
            normalized: torch.Tensor = torch.nn.functional.normalize(features, dim=1)
            return np.asarray(normalized.cpu().numpy(), dtype=np.float32)


class LabelReader:
    """Paddle text detector/recognizer on ONNX CPU; no text-generation guesses."""

    def __init__(self, font: Path) -> None:
        if not font.is_file():
            raise FileNotFoundError(f"Font OCR belum tersedia; jalankan gea-photo build: {font}")
        self.engine: RapidOCR = RapidOCR(
            params={
                "Global.font_path": str(font),
                "Det.limit_side_len": 1536,
                "Det.limit_type": "max",
                "EngineConfig.onnxruntime.intra_op_num_threads": 2,
                "EngineConfig.onnxruntime.inter_op_num_threads": 2,
            }
        )

    def read(self, image: Image.Image) -> tuple[OcrLine, ...]:
        result: RapidOCROutput = self.engine(np.asarray(image)[:, :, ::-1].copy())
        if result.txts is None or result.scores is None:
            return ()
        return tuple(
            OcrLine(text=text, score=float(score))
            for text, score in zip(result.txts, result.scores, strict=True)
        )
