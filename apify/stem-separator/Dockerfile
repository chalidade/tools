# syntax=docker/dockerfile:1
# onnxruntime-node ships glibc binaries only, so this Actor uses a Debian
# Node image instead of apify/actor-node (Alpine/musl).
FROM node:22-bookworm-slim

# ffmpeg from Debian decodes any audio/video input and encodes the output.
RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg \
    && rm -rf /var/lib/apt/lists/*
# CPU only: skip the CUDA download; other platforms' binaries are dropped after install.
ENV ONNXRUNTIME_NODE_INSTALL=skip \
    NODE_ENV=production

WORKDIR /usr/src/app

# The model is the one the site's browser tool ships (src/tools/…), fetched
# from this repo at build time and checked against its SHA-256 — no copy in git.
ADD --checksum=sha256:ad1acd797fbb05a4b3f2dd9ceefdae1262ae728d31dc60c6958ea9e4e4d1b54a \
    https://raw.githubusercontent.com/chalidade/tools/main/src/tools/vocal-remover/scnet.fp16.onnx model/scnet.fp16.onnx

COPY package*.json ./
# Keep optional dependencies: sharp installs its prebuilt libvips through them.
RUN npm --quiet set progress=false \
    && npm install --omit=dev --no-audit --no-fund \
    && (cd node_modules/onnxruntime-node/bin/napi-v6 \
        && rm -rf darwin win32 linux/arm64 linux/x64/libonnxruntime_providers_cuda.so linux/x64/libonnxruntime_providers_tensorrt.so) \
    && echo "Node.js $(node --version), npm $(npm --version)"

COPY . ./
RUN chmod -R a+r model

USER node

CMD ["npm", "start", "--silent"]
