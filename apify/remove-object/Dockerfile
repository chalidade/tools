# syntax=docker/dockerfile:1
# onnxruntime-node ships glibc binaries only, so this Actor uses a Debian
# Node image instead of apify/actor-node (Alpine/musl).
FROM node:22-bookworm-slim

# CPU only: skip the CUDA download; other platforms' binaries are dropped after install.
ENV ONNXRUNTIME_NODE_INSTALL=skip \
    NODE_ENV=production

WORKDIR /usr/src/app

# The model is the one the site's browser tool ships (src/tools/…), fetched
# from this repo at build time and checked against its SHA-256 — no copy in git.
ADD --checksum=sha256:d0c4eb7020010d3c5b9f1d7bee1283170ad81a1ee87cab4aac6b182f3fa900f5 \
    https://raw.githubusercontent.com/chalidade/tools/main/src/tools/remove-object/migan.onnx model/migan.onnx

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
