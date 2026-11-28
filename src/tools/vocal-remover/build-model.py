"""Rebuilds scnet.fp16.onnx, the stem separator's model: SCNet (Tong et al.,
"SCNet: Sparse Compression Network for Music Source Separation", ICASSP 2024)
as its author trained it on MUSDB18-HQ, exported between its STFT and iSTFT
(the browser computes those, see stft.ts), weights stored as float16.

  R=https://raw.githubusercontent.com/ZFTurbo/Music-Source-Separation-Training/84b1eac0887756b4f1a9d7a1ff49105939749ed2/models/scnet
  mkdir -p scnetpkg && touch scnetpkg/__init__.py
  curl -o scnetpkg/scnet.py $R/scnet.py -o scnetpkg/separation.py $R/separation.py
  D=https://github.com/ZFTurbo/Music-Source-Separation-Training/releases/download/v.1.0.6
  curl -LO $D/config_musdb18_scnet.yaml -LO $D/scnet_checkpoint_musdb18.ckpt
  pip install torch onnx onnxruntime onnxscript pyyaml numpy
  python build-model.py <dir with the files above> <out dir>

Weights and code: starrytong/SCNet, MIT (the author confirms the weights are
MIT and may be redistributed converted: github.com/starrytong/SCNet/issues/35),
in the layout of ZFTurbo/Music-Source-Separation-Training (MIT). The graph
changes follow @audio/neural-separate's export-scnet.py (MIT): the rFFT over
time becomes cos/sin products (no ONNX exporter takes aten::fft_rfft), and
GroupNorm(1, C) reduces one axis at a time (summed whole, onnxruntime loses
precision over the 10-million-value groups).

One 11 s segment (485100 samples at 44.1 kHz, padded to 486400, 476 frames):
  mix_spec   [1, 4, 2049, 476]   L re, L im, R re, R im
  stems_spec [1, 16, 2049, 476]  (drums, bass, other, vocals) x (L, R) x (re, im)
STFT: n_fft 4096, hop 1024, rectangular window, scaled 1/sqrt(4096), centered
with reflect padding.
"""
import math
import os
import sys
from collections import deque

src, out = sys.argv[1], sys.argv[2]
sys.path.insert(0, src)

import numpy as np  # noqa: E402
import onnx  # noqa: E402
import torch  # noqa: E402
import torch.nn as nn  # noqa: E402
import torch.nn.functional as F  # noqa: E402
import yaml  # noqa: E402
from onnx import TensorProto, helper, numpy_helper  # noqa: E402
from scnetpkg.scnet import SCNet  # noqa: E402

SEGMENT = 485100


class Loader(yaml.SafeLoader):
    pass


Loader.add_constructor('tag:yaml.org,2002:python/tuple', lambda l, n: tuple(l.construct_sequence(n)))
cfg = yaml.load(open(os.path.join(src, 'config_musdb18_scnet.yaml')), Loader=Loader)
model = SCNet(**cfg['model'])
model.load_state_dict(torch.load(os.path.join(src, 'scnet_checkpoint_musdb18.ckpt'), map_location='cpu', weights_only=True))
model.eval()
print('sources', model.sources)


def stft(x):
    hop = model.hop_length
    pad = hop - x.shape[-1] % hop
    if (x.shape[-1] + pad) // hop % 2 == 0:
        pad += hop
    x = F.pad(x, (0, pad))
    B, C, L = x.shape
    z = torch.view_as_real(torch.stft(x.reshape(-1, L), **model.stft_config, return_complex=True))
    return z.permute(0, 3, 1, 2).reshape(B, 2 * C, z.shape[1], z.shape[2]), pad


def istft(y, pad):
    B, _, Fr, T = y.shape
    y = torch.view_as_complex(y.reshape(-1, 2, Fr, T).permute(0, 2, 3, 1).contiguous())
    x = torch.istft(y, **model.stft_config)
    return x.reshape(B, len(model.sources), model.audio_channels, -1)[..., :-pad]


def dft(x, inverse):
    T = x.shape[3] if not inverse else 2 * (x.shape[3] - 1)
    t, k = torch.arange(T, dtype=torch.float64), torch.arange(T // 2 + 1, dtype=torch.float64)
    a = 2 * math.pi * k[:, None] * t[None] / T
    if not inverse:
        c, s = (torch.cos(a).T / math.sqrt(T)).to(x.dtype), (-torch.sin(a).T / math.sqrt(T)).to(x.dtype)
        return torch.cat([x @ c, x @ s], dim=1)
    w = torch.full((T // 2 + 1, 1), 2.0, dtype=torch.float64)
    w[0] = w[-1] = 1
    c, s = (w * torch.cos(a) / math.sqrt(T)).to(x.dtype), (-w * torch.sin(a) / math.sqrt(T)).to(x.dtype)
    h = x.shape[1] // 2
    return x[:, :h] @ c + x[:, h:] @ s


def group_norm(mod):
    def mean(x):
        for d in range(x.dim() - 1, 0, -1):
            x = x.mean(d, keepdim=True)
        return x

    def forward(x):
        mu = mean(x)
        var = mean((x - mu) ** 2)
        shape = (1, -1) + (1,) * (x.dim() - 2)
        return (x - mu) / torch.sqrt(var + mod.eps) * mod.weight.view(shape) + mod.bias.view(shape)

    return forward


for f in model.separation_net.feature_conversion:
    f.forward = (lambda inv: lambda x: dft(x, inv))(f.inverse)
for m in model.modules():
    if isinstance(m, nn.GroupNorm) and m.num_groups == 1:
        m.forward = group_norm(m)


class Core(nn.Module):
    """SCNet.forward between its STFT and its iSTFT."""

    def __init__(self, m):
        super().__init__()
        self.m = m

    def forward(self, x):
        m, skips = self.m, deque()
        for sd in m.encoder:
            x, skip, lengths, orig = sd(x)
            skips.append((skip, lengths, orig))
        x = m.separation_net(x)
        for fusion, su in m.decoder:
            skip, lengths, orig = skips.pop()
            x = su(fusion(x, skip), lengths, orig)
        return x


os.makedirs(out, exist_ok=True)
f32 = os.path.join(out, 'scnet.onnx')
spec, _ = stft(torch.randn(1, 2, SEGMENT))
with torch.no_grad():
    torch.onnx.export(Core(model).eval(), (spec,), f32, input_names=['mix_spec'],
                      output_names=['stems_spec'], opset_version=17, dynamo=False)
print('exported', list(spec.shape), os.path.getsize(f32) / 1e6, 'MB')

# float16 weights, float32 compute: each big weight is stored as float16 and Cast back in the graph;
# onnxruntime folds the Cast at load, so the session holds float32 weights and computes as the export does.
m = onnx.load(f32)
g = m.graph
casts = []
for init in list(g.initializer):
    a = numpy_helper.to_array(init)
    if a.dtype == np.float32 and a.size > 1024:
        g.initializer.remove(init)
        g.initializer.append(numpy_helper.from_array(a.astype(np.float16), init.name + '_h'))
        casts.append(helper.make_node('Cast', [init.name + '_h'], [init.name], to=TensorProto.FLOAT))
for n in reversed(casts):
    g.node.insert(0, n)
onnx.checker.check_model(m)

# Fold what does not depend on the audio: the input's shape is fixed, so the DFT matrices (built from Range, Cos and
# Sin, which onnxruntime-web's WebGPU session would leave on the CPU every run), the shapes and the reshapes' targets
# are computed once here and stored (onnxruntime-web has no float64 kernels for them). The float16 weights' Casts
# stay (folded at load), and so do the float32 fills (ConstantOfShape: the LSTMs' zero states), stored as their shape.
import onnxruntime as ort  # noqa: E402

half = {n.output[0] for n in g.node if n.op_type == 'Cast' and n.input[0].endswith('_h')}
known = {i.name for i in g.initializer if not i.name.endswith('_h')}
foldable = []
for n in g.node:
    fill = n.op_type == 'ConstantOfShape' and any(a.t.data_type == TensorProto.FLOAT for a in n.attribute)
    if n.output[0] in half or fill:
        continue
    if n.op_type == 'Shape' or all(i == '' or i in known for i in n.input):
        foldable.append(n)
        known.update(n.output)
folded = {id(n) for n in foldable}
inits = {i.name for i in g.initializer}
need = sorted({i for n in g.node if id(n) not in folded for i in n.input if i in known and i not in inits}
              | {o.name for o in g.output if o.name in known})
probe = onnx.ModelProto()
probe.CopyFrom(m)
types = {v.name: v.type.tensor_type.elem_type for v in onnx.shape_inference.infer_shapes(m).graph.value_info}
types.update({n.output[0]: next(a.t.data_type for a in n.attribute if a.name == 'value') for n in g.node if n.op_type == 'Constant'})
probe.graph.output.extend([helper.make_tensor_value_info(t, types[t], None) for t in need])
so = ort.SessionOptions()
so.graph_optimization_level = ort.GraphOptimizationLevel.ORT_DISABLE_ALL
ps = ort.InferenceSession(probe.SerializeToString(), so, providers=['CPUExecutionProvider'])
vals = dict(zip(need, ps.run(need, {'mix_spec': spec.numpy()})))
del ps, probe
keep_nodes = [n for n in g.node if id(n) not in folded]
del g.node[:]
g.node.extend(keep_nodes)
seen = {}
for t in need:
    a = vals[t]
    key = (a.dtype.str, a.shape, a.tobytes())
    if key in seen:  # identical values (the DFT matrices of each layer) stored once
        g.node.insert(0, helper.make_node('Identity', [seen[key]], [t]))
        continue
    seen[key] = t
    g.initializer.append(numpy_helper.from_array(a, t))
used = {i for n in g.node for i in n.input}
for init in list(g.initializer):
    if init.name not in used:
        g.initializer.remove(init)
print('folded', len(foldable), 'nodes into', len(seen), 'values;', len(g.node), 'nodes left')
onnx.checker.check_model(m)
f16 = os.path.join(out, 'scnet.fp16.onnx')
onnx.save(m, f16)
print('fp16', len(casts), 'weights,', os.path.getsize(f16) / 1e6, 'MB')

s = ort.InferenceSession(f16, providers=['CPUExecutionProvider'])
t = torch.arange(SEGMENT) / 44100
tone = sum(torch.sin(2 * math.pi * f * t) / k for k, f in enumerate((110, 220, 440, 880, 1760), 1))
for label, mix in (('noise', 0.1 * torch.randn(1, 2, SEGMENT)), ('tones', 0.2 * torch.stack([tone, 0.8 * tone])[None])):
    with torch.no_grad():
        want = model(mix).numpy()
        sp, pad = stft(mix)
        got = istft(torch.from_numpy(s.run(None, {'mix_spec': sp.numpy()})[0]), pad).numpy()
    print(label, 'max|diff|/max|y| =', float(np.abs(got - want).max() / np.abs(want).max()))
