"""Rebuilds realesr-general-x4v3.onnx from Real-ESRGAN's PyTorch weights,
without needing PyTorch: the .pth zip is unpickled by hand and the compact
SRVGG network (conv + PReLU x 33, pixel shuffle, plus a nearest-neighbour
copy of the input) is written straight to ONNX.

  curl -LO https://github.com/xinntao/Real-ESRGAN/releases/download/v0.2.5.0/realesr-general-x4v3.pth
  mv realesr-general-x4v3.pth x4v3.pth
  pip install numpy onnx && python build-model.py

Weights: Real-ESRGAN, BSD-3-Clause (c) 2021 Xintao Wang.
"""
import pickle, zipfile, numpy as np, onnx, sys
from onnx import helper, TensorProto, numpy_helper
z = zipfile.ZipFile('x4v3.pth')
prefix = z.namelist()[0].split('/')[0]
class Storage:
    def __init__(s, key, dtype): s.key, s.dtype = key, dtype
def rebuild(storage, offset, size, stride, *a):
    buf = np.frombuffer(z.read(f'{prefix}/data/{storage.key}'), dtype=storage.dtype)
    n = int(np.prod(size)) if size else 1
    return np.lib.stride_tricks.as_strided(buf[offset:], shape=size, strides=[s*buf.itemsize for s in stride]).copy() if size else buf[offset:offset+1].reshape(())
class U(pickle.Unpickler):
    def find_class(self, mod, name):
        if name == '_rebuild_tensor_v2': return rebuild
        if name == 'FloatStorage': return np.float32
        if name == 'OrderedDict':
            import collections; return collections.OrderedDict
        if mod.startswith('torch'): return lambda *a, **k: None
        return super().find_class(mod, name)
    def persistent_load(self, pid):
        _, typ, key, loc, numel = pid
        return Storage(key, typ)
sd = U(z.open(f'{prefix}/data.pkl')).load()
sd = sd.get('params', sd)
keys = list(sd.keys()); print(len(keys), keys[:6], keys[-4:])
nodes, inits = [], []
def init(name, arr): inits.append(numpy_helper.from_array(arr.astype(np.float32), name)); return name
x = 'input'; i = 0; cur = x; idx = 0
body = sorted({int(k.split('.')[1]) for k in keys if k.startswith('body.')})
for b in body:
    w = sd.get(f'body.{b}.weight'); bias = sd.get(f'body.{b}.bias')
    out = f'h{b}'
    if w.ndim == 4:
        nodes.append(helper.make_node('Conv', [cur, init(f'w{b}', w), init(f'b{b}', bias)], [out], pads=[1,1,1,1], kernel_shape=[3,3]))
    else:  # PReLU: weight (C,) -> (C,1,1)
        nodes.append(helper.make_node('PRelu', [cur, init(f'p{b}', w.reshape(-1,1,1))], [out]))
    cur = out
up = 4
nodes.append(helper.make_node('DepthToSpace', [cur], ['ps'], blocksize=up, mode='CRD'))
nodes.append(helper.make_node('Resize', ['input', '', init('scales', np.array([1,1,up,up], np.float32))], ['base'], mode='nearest'))
nodes.append(helper.make_node('Add', ['ps', 'base'], ['output']))
g = helper.make_graph(nodes, 'realesr-general-x4v3',
  [helper.make_tensor_value_info('input', TensorProto.FLOAT, [1,3,'h','w'])],
  [helper.make_tensor_value_info('output', TensorProto.FLOAT, [1,3,'H','W'])], inits)
m = helper.make_model(g, opset_imports=[helper.make_opsetid('', 17)], producer_name='toowl')
m.ir_version = 8
onnx.checker.check_model(m)
onnx.save(m, 'realesr-general-x4v3.onnx')
print('ok', len(nodes))
