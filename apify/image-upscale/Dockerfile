FROM apify/actor-node:22

# onnxruntime-node: CPU only. Skip the 280 MB CUDA download and drop the
# binaries for other platforms after install.
ENV ONNXRUNTIME_NODE_INSTALL=skip

COPY --chown=myuser package*.json ./
# Keep optional dependencies: sharp installs its prebuilt libvips through them.
RUN npm --quiet set progress=false \
    && npm install --omit=dev --no-audit --no-fund \
    && (cd node_modules/onnxruntime-node/bin/napi-v6 \
        && rm -rf darwin win32 linux/arm64 linux/x64/libonnxruntime_providers_cuda.so linux/x64/libonnxruntime_providers_tensorrt.so) \
    && echo "Node.js $(node --version), npm $(npm --version)"

COPY --chown=myuser . ./

CMD ["npm", "start", "--silent"]
