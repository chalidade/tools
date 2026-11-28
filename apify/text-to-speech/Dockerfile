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
ADD --checksum=sha256:ff47d1ad3f108d84f6c45e666e308efad025666e778b5623517962fc27341054 \
    https://raw.githubusercontent.com/chalidade/tools/main/src/tools/text-to-speech/en_US-joe-medium.int8.onnx model/en_US-joe-medium.int8.onnx

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
