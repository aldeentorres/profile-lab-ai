# CodeFormer restoration service

This service runs the official CodeFormer repository pinned to commit `b33cc7d639d6545bfcccc7e0bc6ae51f24e79c2b`, with Real-ESRGAN enabled for the non-face regions. Studio+ sends the original image to this service before applying its local background, relighting, and export stages.

## Start locally

```bash
cd services/codeformer
docker compose up --build
```

Then configure the web app server with:

```bash
CODEFORMER_SERVICE_URL=http://127.0.0.1:7861
CODEFORMER_SERVICE_TOKEN=local-codeformer-demo
```

The CPU image works everywhere but is slow. On an NVIDIA host, build with `TORCH_INDEX_URL=https://download.pytorch.org/whl/cu121` and give the container GPU access through the NVIDIA container runtime.

## API

- `GET /health` reports whether all four model weights are present.
- `POST /restore?fidelity=0.8&upscale=2` accepts a raw JPG, PNG, or WebP body and returns a restored PNG.
- Requests are capped at 12 MB and serialized so one model process cannot exhaust the machine.
- Set `CODEFORMER_SERVICE_TOKEN` and send it as a bearer token outside local development.

## License boundary

CodeFormer uses the S-Lab License 1.0, which permits non-commercial redistribution and use. Commercial use requires contacting the CodeFormer contributors. This service is therefore an experimental, non-commercial integration until the appropriate rights are obtained. Real-ESRGAN and other dependencies retain their own licenses.
