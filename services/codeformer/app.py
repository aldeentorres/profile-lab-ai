from __future__ import annotations

import asyncio
import os
import re
import subprocess
import sys
import tempfile
from pathlib import Path

from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from PIL import Image


CODEFORMER_ROOT = Path(os.getenv("CODEFORMER_ROOT", "/opt/CodeFormer"))
SERVICE_TOKEN = os.getenv("CODEFORMER_SERVICE_TOKEN", "")
MAX_IMAGE_BYTES = 12 * 1024 * 1024
PROCESS_TIMEOUT_SECONDS = int(os.getenv("CODEFORMER_TIMEOUT_SECONDS", "300"))
FACE_COUNT_PATTERN = re.compile(r"detect\s+(\d+)\s+faces")
inference_lock = asyncio.Semaphore(1)

app = FastAPI(title="PhotoStudio+ CodeFormer service", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:3001").split(",") if origin.strip()],
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["authorization", "content-type"],
)


def require_service_token(request: Request) -> None:
    if not SERVICE_TOKEN:
        return
    if request.headers.get("authorization") != f"Bearer {SERVICE_TOKEN}":
        raise HTTPException(status_code=401, detail="Invalid service token")


def run_codeformer(input_path: Path, output_dir: Path, fidelity: float, upscale: int) -> tuple[bytes, int]:
    command = [
        sys.executable,
        "inference_codeformer.py",
        "--input_path",
        str(input_path),
        "--output_path",
        str(output_dir),
        "--fidelity_weight",
        str(fidelity),
        "--upscale",
        str(upscale),
        "--bg_upsampler",
        "realesrgan",
        "--face_upsample",
        "--bg_tile",
        "400",
        "--only_center_face",
    ]
    completed = subprocess.run(
        command,
        cwd=CODEFORMER_ROOT,
        capture_output=True,
        text=True,
        timeout=PROCESS_TIMEOUT_SECONDS,
        check=False,
    )
    if completed.returncode != 0:
        error = (completed.stderr or completed.stdout or "CodeFormer failed")[-2000:]
        raise RuntimeError(error)
    result_path = output_dir / "final_results" / f"{input_path.stem}.png"
    if not result_path.exists():
        raise RuntimeError("CodeFormer did not produce a final image")
    match = FACE_COUNT_PATTERN.search(completed.stdout)
    return result_path.read_bytes(), int(match.group(1)) if match else 0


@app.get("/health")
def health() -> dict[str, object]:
    weights = {
        "codeformer": CODEFORMER_ROOT / "weights/CodeFormer/codeformer.pth",
        "face_detection": CODEFORMER_ROOT / "weights/facelib/detection_Resnet50_Final.pth",
        "face_parsing": CODEFORMER_ROOT / "weights/facelib/parsing_parsenet.pth",
        "realesrgan": CODEFORMER_ROOT / "weights/realesrgan/RealESRGAN_x2plus.pth",
    }
    return {"ready": all(path.exists() for path in weights.values()), "engine": "CodeFormer + Real-ESRGAN", "weights": {name: path.exists() for name, path in weights.items()}}


@app.post("/restore")
async def restore(
    request: Request,
    fidelity: float = Query(default=0.8, ge=0.0, le=1.0),
    upscale: int = Query(default=2, ge=2, le=4),
) -> Response:
    require_service_token(request)
    content_type = request.headers.get("content-type", "").split(";", 1)[0].lower()
    if content_type not in {"image/jpeg", "image/png", "image/webp"}:
        raise HTTPException(status_code=415, detail="Upload a JPG, PNG, or WebP image")
    body = await request.body()
    if not body or len(body) > MAX_IMAGE_BYTES:
        raise HTTPException(status_code=413, detail="Image must be between 1 byte and 12 MB")
    async with inference_lock:
        with tempfile.TemporaryDirectory(prefix="codeformer-") as temporary:
            work_dir = Path(temporary)
            source_path = work_dir / "source.png"
            try:
                from io import BytesIO

                with Image.open(BytesIO(body)) as source:
                    source.convert("RGB").save(source_path, format="PNG")
            except Exception as error:
                raise HTTPException(status_code=400, detail="The uploaded image could not be decoded") from error
            try:
                restored, faces = await asyncio.to_thread(run_codeformer, source_path, work_dir / "result", fidelity, upscale)
            except subprocess.TimeoutExpired as error:
                raise HTTPException(status_code=504, detail="Restoration timed out") from error
            except RuntimeError as error:
                raise HTTPException(status_code=502, detail=str(error)) from error
    return Response(
        content=restored,
        media_type="image/png",
        headers={
            "Cache-Control": "no-store",
            "X-CodeFormer-Faces": str(faces),
            "X-Model-License": "S-Lab-1.0-non-commercial",
        },
    )
