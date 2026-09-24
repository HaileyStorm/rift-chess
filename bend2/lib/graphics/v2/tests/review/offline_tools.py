#!/usr/bin/env python3
"""Actual Python tests, distinct from the non-authoritative Bend source harness."""
from __future__ import annotations
import hashlib, importlib.util, json, os, subprocess, sys, tempfile, unittest
from fractions import Fraction
from pathlib import Path
import numpy as np
from PIL import Image,ImageFont
LIB=Path(__file__).resolve().parents[2]
def module(name,path):
    spec=importlib.util.spec_from_file_location(name,path);m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m);return m
rgba=module('prepare_rgba',LIB/'assets/tools/prepare_rgba.py')
font=module('bake_native',LIB/'tools/bake_font_native.py')
COUNTS={'area_output_channels':0,'alpha_values':0,'font_bake':'not requested'}
def rounded(x:Fraction)->int:return (2*x.numerator+x.denominator)//(2*x.denominator)
def reference(a,width,height):
    h,w=a.shape[:2]
    if (w,h)==(width,height):return a.copy()
    out=np.zeros((height,width,4),np.uint8)
    for oy in range(height):
      for ox in range(width):
        total=Fraction(0);weight=Fraction(0);sums=[Fraction(0) for _ in range(3)]
        for iy in range(h):
          dy=max(Fraction(0),min(Fraction((oy+1)*h,height),iy+1)-max(Fraction(oy*h,height),iy))
          for ix in range(w):
            dx=max(Fraction(0),min(Fraction((ox+1)*w,width),ix+1)-max(Fraction(ox*w,width),ix))
            area=dx*dy;alpha=int(a[iy,ix,3]);total+=area;weight+=area*alpha
            for c in range(3):sums[c]+=area*alpha*int(a[iy,ix,c])
        out[oy,ox,3]=rounded(weight/total)
        if out[oy,ox,3]:
          for c in range(3):out[oy,ox,c]=rounded(sums[c]/weight)
    return out
class OfflineTests(unittest.TestCase):
  def test_exact_area_fraction_oracle(self):
    r=np.random.default_rng(19017)
    for w,h,dw,dh in [(5,7,3,4),(7,3,4,5),(1,1,7,5),(9,1,2,1),(1,7,3,2),(6,4,3,2)]+[tuple(map(int,r.integers(1,8,size=4))) for _ in range(45)]:
      a=r.integers(0,256,size=(h,w,4),dtype=np.uint8)
      a[0,0]=[255,0,255,0]
      np.testing.assert_array_equal(rgba.area_resize(a,dw,dh),reference(a,dw,dh))
      COUNTS['area_output_channels']+=dw*dh*4
  def test_identity_and_transparency(self):
    a=np.array([[[255,0,255,0]]],dtype=np.uint8)
    b=rgba.area_resize(a,1,1);np.testing.assert_array_equal(a,b);self.assertIsNot(a,b)
    np.testing.assert_array_equal(rgba.area_resize(a,3,3),np.zeros((3,3,4),np.uint8))
    h=np.array([[[255,0,0,255],[0,0,255,0]],[[255,0,255,0],[0,0,255,0]]],dtype=np.uint8)
    np.testing.assert_array_equal(rgba.half(h),np.array([[[255,0,0,64]]],np.uint8))
  def test_wire_and_maximum(self):
    for d in range(10):
      side=1<<d;a=np.arange(side*side*4,dtype=np.uint8).reshape(side,side,4)
      wire=rgba.encode_rgba(d,a.tobytes());depth,b=rgba.decode_rgba(wire)
      self.assertEqual(depth,d);np.testing.assert_array_equal(a,b);self.assertEqual(len(wire),5+4*side*side)
    self.assertEqual(len(wire),1048581)
  def test_wire_rejections(self):
    for depth in [-1,10,True,1.5]:
      with self.assertRaises(ValueError):rgba.encode_rgba(depth,b'')
    for data in [b'',b'RGA1\x00',b'RGA2\x0a',b'RGA2\x00\x00',b'RGA2\x00'+bytes(5)]:
      with self.assertRaises(ValueError):rgba.decode_rgba(data)
    for a in [np.zeros((2,2,3),np.uint8),np.zeros((2,2,4),np.float32),np.zeros((0,2,4),np.uint8)]:
      with self.assertRaises(ValueError):rgba.area_resize(a,1,1)
    with self.assertRaises(ValueError):rgba.area_resize(np.zeros((1,1,4),np.uint8),True,1)
    with self.assertRaises(ValueError):rgba.half(np.zeros((3,3,4),np.uint8))
  def test_prepare_deterministic_crop_fit(self):
    with tempfile.TemporaryDirectory() as tmp:
      tmp=Path(tmp);a=np.zeros((10,20,4),np.uint8);a[:]=[200,100,50,255];a[0,0]=[2,3,4,0]
      src=tmp/'input.png';Image.fromarray(a).save(src)
      first=rgba.prepare(src,tmp/'first',16);second=rgba.prepare(src,tmp/'second',16)
      self.assertEqual(first,second);self.assertEqual(first['content_xywh'],[0,4,16,8]);self.assertEqual(len(first['levels']),5)
      for level in first['levels']:self.assertEqual((tmp/'first'/level['file']).read_bytes(),(tmp/'second'/level['file']).read_bytes())
      m=rgba.prepare(src,tmp/'crop',32,(4,2,6,4),preview=False)
      self.assertEqual(m['content_xywh'],[13,14,6,4])
      m=rgba.prepare(src,tmp/'up',32,(4,2,6,4),allow_upscale=True,preview=False)
      self.assertEqual(m['content_xywh'],[0,5,32,21])
      with self.assertRaises(ValueError):rgba.prepare(src,tmp/'bad',16,(0,0,21,10))
      self.assertFalse((tmp/'bad').exists())
      jpg=tmp/'wrong-format.jpg';Image.new('RGB',(2,2)).save(jpg)
      with self.assertRaises(ValueError):rgba.prepare(jpg,tmp/'bad-format',2)
      self.assertFalse((tmp/'bad-format').exists())
  def test_quantization(self):
    a=np.arange(256,dtype=np.uint8)
    four=font.quantize_alpha(a,4);eight=font.quantize_alpha(a,8)
    np.testing.assert_array_equal(eight,a);self.assertEqual(len(np.unique(four)),16)
    err=np.abs(four.astype(np.int16)-a.astype(np.int16));self.assertEqual(int(err.max()),8)
    old=(((a.astype(np.int16)*3+127)//255)*85)
    self.assertEqual(int(np.abs(old-a.astype(np.int16)).max()),42)
    self.assertEqual(four[0],0);self.assertEqual(four[-1],255)
    COUNTS['alpha_values']=256;COUNTS['quantization_max_error_4bit']=8;COUNTS['quantization_max_error_2bit']=42
  @unittest.skipUnless(os.environ.get('REVIEW_FONT_PATH'),'explicit local test font not supplied')
  def test_pinned_local_font_baker(self):
    src=Path(os.environ['REVIEW_FONT_PATH']);sha=hashlib.sha256(src.read_bytes()).hexdigest()
    with tempfile.TemporaryDirectory() as tmp:
      out=Path(tmp)/'Font.bend'
      with self.assertRaises(ValueError):font.bake(src,'0'*64,40,out,4,characters='Ag?')
      self.assertFalse(out.exists())
      rec=font.bake(src,sha,40,out,4,characters='Ag?')
      self.assertEqual(rec['generated_sha256'],hashlib.sha256(out.read_bytes()).hexdigest())
      before=out.read_bytes();font.bake(src,sha,40,out,4,characters='Ag?');self.assertEqual(before,out.read_bytes());self.assertIn('import ../',out.read_text())
      f=ImageFont.truetype(str(src),40)
      for ch in 'Ag?':
        g=font.raster(f,ch,4);self.assertLess(g['top'],0);self.assertEqual(g['mask'].shape,(g['side'],g['side']));self.assertGreater(g['mask'].max(),0)
      COUNTS['font_bake']={'status':'passed','source_name':src.name,'sha256':sha,'native_px':40,'alpha_bits':4,'font_not_bundled':True}
if __name__=='__main__':
    suite=unittest.defaultTestLoader.loadTestsFromTestCase(OfflineTests)
    result=unittest.TextTestRunner(verbosity=2).run(suite)
    print(json.dumps({'ok':result.wasSuccessful(),'tests':result.testsRun,'skipped':len(result.skipped),**COUNTS,
                      'scope':'Actual Python offline-tool execution; no Bend or font-module typecheck claimed.'}))
    sys.exit(0 if result.wasSuccessful() else 1)
