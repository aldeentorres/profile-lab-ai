FROM python:3.10-slim

ARG CODEFORMER_COMMIT=b33cc7d639d6545bfcccc7e0bc6ae51f24e79c2b
ARG TORCH_INDEX_URL=https://download.pytorch.org/whl/cpu

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    CODEFORMER_ROOT=/opt/CodeFormer

RUN apt-get update && apt-get install -y --no-install-recommends git libgl1 libglib2.0-0 && rm -rf /var/lib/apt/lists/*
RUN python -m pip install --no-cache-dir "setuptools<66" wheel cython
RUN python -m pip install --no-cache-dir torch==2.1.2 torchvision==0.16.2 --index-url ${TORCH_INDEX_URL}

WORKDIR /opt
RUN git clone https://github.com/sczhou/CodeFormer.git CodeFormer && cd CodeFormer && git checkout ${CODEFORMER_COMMIT}
WORKDIR /opt/CodeFormer
RUN grep -Ev '^(torch|torchvision|tb-nightly)' requirements.txt > /tmp/codeformer-requirements.txt && \
    python -m pip install --no-cache-dir -r /tmp/codeformer-requirements.txt fastapi "uvicorn[standard]" && \
    python basicsr/setup.py develop
RUN python scripts/download_pretrained_models.py CodeFormer && \
    python scripts/download_pretrained_models.py facelib && \
    python -c "from basicsr.utils.download_util import load_file_from_url; load_file_from_url('https://github.com/sczhou/CodeFormer/releases/download/v0.1.0/RealESRGAN_x2plus.pth', model_dir='weights/realesrgan', progress=True)"

COPY app.py /opt/service/app.py
WORKDIR /opt/service
EXPOSE 7861
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:7861/health', timeout=3)"
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "7861", "--workers", "1"]
