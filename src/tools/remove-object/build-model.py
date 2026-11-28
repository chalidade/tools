"""Rebuilds migan.onnx from MI-GAN's 512 px Places2 generator.

The weights are the TorchScript trace that IOPaint publishes from the official
MI-GAN release; it is exported to ONNX as is (one fixed 1x4x512x512 input:
0.5 - hole mask, then the RGB image in [-1, 1] with the hole zeroed; output
1x3x512x512 RGB in [-1, 1]).

  curl -LO https://github.com/Sanster/models/releases/download/migan/migan_traced.pt
  pip install torch onnx && python build-model.py

MI-GAN: MIT License (c) 2023 Picsart AI Research (PAIR).
https://github.com/Picsart-AI-Research/MI-GAN
"""
import torch

model = torch.jit.load('migan_traced.pt', map_location='cpu').eval()
x = torch.zeros(1, 4, 512, 512)
torch.onnx.export(model, x, 'migan.onnx', input_names=['input'], output_names=['output'], opset_version=17, dynamo=False)
