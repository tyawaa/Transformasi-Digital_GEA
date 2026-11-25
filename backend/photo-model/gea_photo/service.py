"""Authenticated, stateless inference API: photo bytes are never written to disk."""

import hashlib
import hmac
from email.message import Message
from email.parser import BytesParser
from email.policy import default
from pathlib import Path
from threading import Lock
from typing import Annotated

import numpy as np
from fastapi import FastAPI, Header, HTTPException, Request
from fastapi.responses import HTMLResponse
from PIL import Image, UnidentifiedImageError
from starlette.concurrency import run_in_threadpool

from gea_photo.connectors import LabelReader, VisualEncoder
from gea_photo.core import (
    ACCEPTANCE_POLICY,
    OcrLine,
    PhotoIndex,
    Target,
    Vector,
    Verdict,
    class_scores,
    decide,
    decode_photo,
    quality,
)


def load_index(artifacts: Path) -> tuple[PhotoIndex, Vector]:
    index: PhotoIndex = PhotoIndex.model_validate_json(
        (artifacts / "index.json").read_text("utf-8")
    )
    features: Vector = np.asarray(
        np.load(artifacts / "features.npy", allow_pickle=False), dtype=np.float32
    )
    if features.shape != (len(index.samples), 384) or not np.isfinite(features).all():
        raise ValueError("features.npy tidak sesuai index.json atau berisi nilai tidak valid.")
    if not np.allclose(np.linalg.norm(features, axis=1), 1, atol=0.001):
        raise ValueError("Vektor referensi harus ternormalisasi.")
    return index, features


class PhotoVerifier:
    """Connector combining the encoder and OCR with the immutable reference artifact."""

    def __init__(self, artifacts: Path, cache: Path) -> None:
        self.index, self.features = load_index(artifacts)
        self.encoder: VisualEncoder = VisualEncoder(
            self.index.model_id, self.index.revision, cache / "huggingface"
        )
        self.reader: LabelReader = LabelReader(cache / "ocr" / "FZYTK.TTF")
        self.lock: Lock = Lock()

    def verify(self, data: bytes, quest_id: str) -> Verdict:
        target: Target | None = next(
            (target for target in self.index.targets if target.quest_id == quest_id), None
        )
        if target is None:
            raise ValueError(f"Quest foto tidak terdaftar: {quest_id}")
        image: Image.Image = decode_photo(data)
        with self.lock:
            scores: dict[str, float] = class_scores(
                self.encoder.encode((image,))[0],
                self.features,
                self.index.samples,
                self.index.targets,
            )
            lines: tuple[OcrLine, ...] = self.reader.read(image)
        return decide(
            target,
            scores,
            self.index.thresholds[target.poi],
            lines,
            quality(image),
            f"{self.index.version}:{ACCEPTANCE_POLICY}",
            hashlib.sha256(data).hexdigest(),
        )


def create_app(artifacts: Path, cache: Path, token: str) -> FastAPI:
    """Run behind GEA's authenticated gateway; bearer secret never reaches the mobile app."""
    if len(token) < 32:
        raise ValueError("GEA_PHOTO_MODEL_TOKEN harus minimal 32 karakter.")
    verifier: PhotoVerifier = PhotoVerifier(artifacts, cache)
    app: FastAPI = FastAPI(title="GEA Photo Hunt", docs_url=None, redoc_url=None)

    @app.get("/", response_class=HTMLResponse)
    def demo() -> str:
        options: str = "".join(
            f'<option value="{target.quest_id}">{target.poi} — {target.name}</option>'
            for target in verifier.index.targets
        )
        return (
            """<!doctype html><html lang="id"><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>GEA · Uji Foto</title>
<style>body{font:17px system-ui;max-width:640px;margin:40px auto;padding:20px;background:#f7f4e9;color:#173d36}
label{display:block;margin:18px 0}input,select,button{box-sizing:border-box;width:100%;padding:12px;font:inherit}
button{background:#205b4e;color:white;border:0;border-radius:10px}img{max-width:100%;max-height:420px}
#result{padding:18px;background:white;border-radius:10px;white-space:pre-wrap}</style>
<h1>Cari &amp; Foto</h1><p>Foto objek koleksi dengan jelas. Label nama boleh ikut terlihat sebagai bukti tambahan, tetapi tidak wajib.
Hasil ini belum mengukur akurasi pada pengunjung baru.</p><form id="form">
<label>Target koleksi<select name="quest_id">"""
            + options
            + """</select></label>
<label>Kunci akses pengujian<input id="token" type="password" required autocomplete="off"></label>
<label>Foto koleksi<input name="photo" id="photo" type="file" accept="image/jpeg,image/png" required></label>
<img id="preview" alt=""><button id="submit">Periksa Foto</button></form><p id="result" role="status"></p>
<script>const form=document.querySelector('#form'),result=document.querySelector('#result'),button=document.querySelector('#submit');
let previewUrl=null;document.querySelector('#photo').onchange=e=>{if(previewUrl)URL.revokeObjectURL(previewUrl);
previewUrl=URL.createObjectURL(e.target.files[0]);document.querySelector('#preview').src=previewUrl};
form.onsubmit=async e=>{e.preventDefault();button.disabled=true;result.textContent='Memeriksa foto…';
try{const file=document.querySelector('#photo').files[0],bitmap=await createImageBitmap(file);
const scale=Math.min(1,2048/Math.max(bitmap.width,bitmap.height)),canvas=document.createElement('canvas');
canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);
const ctx=canvas.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,canvas.width,canvas.height);
ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',0.85));
if(!blob)throw Error('Foto tidak dapat diproses. Pilih JPEG atau PNG yang valid.');
const payload=new FormData();payload.set('quest_id',form.elements.quest_id.value);payload.set('photo',blob,'capture.jpg');
const response=await fetch('/verify',{method:'POST',body:payload,headers:{Authorization:'Bearer '+document.querySelector('#token').value}});
const data=await response.json();if(!response.ok)throw Error(typeof data.detail==='string'?data.detail:JSON.stringify(data.detail));
result.textContent=(data.decision==='accepted'?'Foto sesuai. ':'Ambil ulang. ')+data.reason;
}catch(error){result.textContent=error.message}finally{button.disabled=false}};</script></html>"""
        )

    @app.get("/health")
    def health() -> dict[str, str]:
        return {
            "status": "ready",
            "model_version": f"{verifier.index.version}:{ACCEPTANCE_POLICY}",
            "validation_scope": verifier.index.validation_scope,
        }

    @app.post("/verify", response_model=Verdict)
    async def verify(
        request: Request,
        authorization: Annotated[str, Header()],
    ) -> Verdict:
        if not hmac.compare_digest(authorization, f"Bearer {token}"):
            raise HTTPException(status_code=401, detail="Invalid model access token")
        chunks: list[bytes] = []
        size: int = 0
        async for chunk in request.stream():
            size += len(chunk)
            if size > 6 * 1024 * 1024 + 65536:
                raise HTTPException(status_code=413, detail="Foto maksimal 6 MiB.")
            chunks.append(chunk)
        quest_id: str
        data: bytes
        try:
            quest_id, data = parse_upload(b"".join(chunks), request.headers.get("content-type", ""))
            return await run_in_threadpool(verifier.verify, data, quest_id)
        except (ValueError, UnidentifiedImageError, Image.DecompressionBombError) as error:
            raise HTTPException(status_code=422, detail=str(error)) from error

    return app


def parse_upload(body: bytes, content_type: str) -> tuple[str, bytes]:
    """Parse bounded multipart in memory, avoiding UploadFile's implicit disk spooling."""
    if (
        not content_type.lower().startswith("multipart/form-data;")
        or "\r" in content_type
        or "\n" in content_type
    ):
        raise ValueError("Kirim multipart/form-data dengan boundary.")
    message: Message = BytesParser(policy=default).parsebytes(
        f"Content-Type: {content_type}\r\nMIME-Version: 1.0\r\n\r\n".encode() + body
    )
    if not message.is_multipart() or message.defects:
        raise ValueError("Multipart foto tidak valid.")
    fields: dict[str, bytes] = {}
    photo_type: str = ""
    for part in message.walk():
        if part.is_multipart():
            continue
        name = part.get_param("name", header="content-disposition")
        payload = part.get_payload(decode=True)
        if name not in ("quest_id", "photo") or name in fields or not isinstance(payload, bytes):
            raise ValueError("Kirim tepat satu quest_id dan satu photo.")
        fields[str(name)] = payload
        if name == "photo":
            photo_type = part.get_content_type()
    if set(fields) != {"quest_id", "photo"} or photo_type not in ("image/jpeg", "image/png"):
        raise ValueError("Kirim quest_id dan foto JPEG/PNG.")
    return fields["quest_id"].decode("utf-8"), fields["photo"]
