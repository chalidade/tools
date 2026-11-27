# onnxruntime-node ships glibc binaries only, so this Actor uses a Debian
# Node image instead of apify/actor-node (Alpine/musl).
FROM node:22-bookworm-slim

# CPU only: skip the 280 MB CUDA download; other platforms' binaries are
# dropped after install.
ENV ONNXRUNTIME_NODE_INSTALL=skip \
    NODE_ENV=production

WORKDIR /usr/src/app

COPY package*.json ./
# Keep optional dependencies: sharp installs its prebuilt libvips through them.
RUN npm --quiet set progress=false \
    && npm install --omit=dev --no-audit --no-fund \
    && (cd node_modules/onnxruntime-node/bin/napi-v6 \
        && rm -rf darwin win32 linux/arm64 linux/x64/libonnxruntime_providers_cuda.so linux/x64/libonnxruntime_providers_tensorrt.so) \
    && echo "Node.js $(node --version), npm $(npm --version)"

COPY . ./

USER node

CMD ["npm", "start", "--silent"]
