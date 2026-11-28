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
ADD --checksum=sha256:3e345e977b55620a37c0c2b2af0644e019afdfad562dcf71eb929bb7274285f9 \
    https://raw.githubusercontent.com/chalidade/tools/main/src/tools/transkrip/model/encoder_model_quantized.onnx model/encoder_model_quantized.onnx
ADD --checksum=sha256:a6beb6baabb66f00b6a686d828c95ffca6146d51900cbad0266cad38f64cf861 \
    https://raw.githubusercontent.com/chalidade/tools/main/src/tools/transkrip/model/decoder_model_merged_quantized.onnx model/decoder_model_merged_quantized.onnx
ADD --checksum=sha256:50d6a919f0a0601d56a04eb583c780d18553aa388254ba3158eb6a00f13e2c1a \
    https://raw.githubusercontent.com/chalidade/tools/main/src/tools/transkrip/model/vocab.json model/vocab.json

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
