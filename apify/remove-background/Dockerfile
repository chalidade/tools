# syntax=docker/dockerfile:1
# onnxruntime-node ships glibc binaries only, so this Actor uses a Debian
# Node image instead of apify/actor-node (Alpine/musl).
FROM node:22-bookworm-slim

# CPU only: skip the CUDA download; other platforms' binaries are dropped after install.
ENV ONNXRUNTIME_NODE_INSTALL=skip \
    NODE_ENV=production

WORKDIR /usr/src/app

# IS-Net general-use (DIS, Apache-2.0), ~170 MB: too big for git, so it is
# fetched from the rembg release mirror and checked against its SHA-256.
ADD --checksum=sha256:60920e99c45464f2ba57bee2ad08c919a52bbf852739e96947fbb4358c0d964a \
    https://github.com/danielgatis/rembg/releases/download/v0.0.0/isnet-general-use.onnx \
    model/isnet-general-use.onnx

COPY package*.json ./
# Keep optional dependencies: sharp installs its prebuilt libvips through them.
RUN npm --quiet set progress=false \
    && npm install --omit=dev --no-audit --no-fund \
    && (cd node_modules/onnxruntime-node/bin/napi-v6 \
        && rm -rf darwin win32 linux/arm64 linux/x64/libonnxruntime_providers_cuda.so linux/x64/libonnxruntime_providers_tensorrt.so) \
    && echo "Node.js $(node --version), npm $(npm --version)"

COPY . ./
RUN chmod a+r model/isnet-general-use.onnx

USER node

CMD ["npm", "start", "--silent"]
