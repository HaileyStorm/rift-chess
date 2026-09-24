#!/usr/bin/env python3
"""Reproduce source-subset visual diagnostics. Explicit local font required.

Source font binaries and temporary glyph-data modules are not distributable
review artifacts. Do not copy them when sharing the output. Only the PNGs,
source hashes, manifests and pixel receipts belong in the review ZIP.
"""
from __future__ import annotations
import argparse,hashlib,importlib.util,json,os,subprocess,sys
from pathlib import Path
import numpy as np
from PIL import Image,ImageDraw,ImageFont
LIB=Path(__file__).resolve().parents[1];ROOT=LIB.parents[3]
def module(name,path):
    spec=importlib.util.spec_from_file_location(name,path);m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m);return m
def fixture(side=256):
    # Analytic coverage/material stress asset, not chess or reference concept art.
    yy,xx=np.mgrid[:side,:side];x=(xx+.5-side/2)/(side*.43);y=(yy+.5-side/2)/(side*.43)
    radius=np.hypot(x,y);z=np.sqrt(np.maximum(0,1-radius**2))
    light=np.clip(-.45*x-.55*y+.75*z,0,1)
    highlights=np.exp(-((x+.29)**2+(y+.35)**2)/.016)
    rings=(np.sin((x*.7+y*.2)*75+np.sin(y*10))*.5+.5)
    rgb=np.stack([42+60*light+15*rings,87+81*light+7*rings,108+104*light+8*rings],axis=-1)
    rgb=np.clip(rgb+highlights[:,:,None]*120,0,255).astype(np.uint8)
    a=np.clip((1-radius)*side*.43+.5,0,1)
    # Open annulus aperture tests interior zero-alpha pruning and hidden RGB.
    hole=np.hypot(x-.16,y-.16);a*=np.clip((hole-.32)*side*.43+.5,0,1)
    alpha=np.floor(a*255+.5).astype(np.uint8)
    rgb[alpha==0]=[230,20,230]
    return np.dstack((rgb,alpha))
def main():
    ap=argparse.ArgumentParser(description=__doc__);ap.add_argument('--font',type=Path,required=True);ap.add_argument('--out',type=Path,default=ROOT/'.artifacts/review-visual');a=ap.parse_args()
    out=a.out.resolve();out.mkdir(parents=True,exist_ok=True)
    font=module('font_bake',LIB/'tools/bake_font_native.py');rgba=module('rgba_prepare',LIB/'assets/tools/prepare_rgba.py');lower=module('subset_lower',LIB/'tools/portable/lower.py')
    sha=hashlib.sha256(a.font.read_bytes()).hexdigest()
    lines=['Sculpted & soft','Minimum 012345','Sphinx: Aa Bb 8g','Readable 40px','0123: () !? @','Edges, not blocks'];chars=''.join(lines)
    font_path=out/'DO_NOT_DISTRIBUTE_Font.bend';font_manifest=font.bake(a.font,sha,40,font_path,4,characters=chars)
    # Diagnostic comparator: same supplied font at half resolution with 2-bit
    # alpha, then nearest repeat. This is NOT the shipped DM Sans FontData.
    old_font=ImageFont.truetype(str(a.font),20);old={}
    def coord(n):return {'$':'Neg','magnitude':-n} if n<0 else {'$':'Pos','value':n}
    def tree(arr):
        if np.all(arr==arr[0,0]):return {'$':'Pix','color':int(arr[0,0])<<16}
        h=arr.shape[0]//2;return dict(zip(['$','tl','tr','bl','br'],['Qua']+[tree(p) for p in [arr[:h,:h],arr[:h,h:],arr[h:,:h],arr[h:,h:]]]))
    for ch in sorted(set(chars)):
        g=font.raster(old_font,ch,8);mask=g['mask'];q=(((mask.astype(np.uint16)*3+127)//255)*85).astype(np.uint8);q=q.repeat(2,0).repeat(2,1)
        old[ord(ch)]={'$':'Mask','advance':2*g['advance'],'left':coord(2*g['left']),'top':coord(2*g['top']),'depth':g['depth']+1,'size':2*g['side'],'coverage':tree(q)}
    old_path=out/'DO_NOT_DISTRIBUTE_reference-glyphs.json';old_path.write_text(json.dumps(old))
    asset=fixture();(out/'fixture.rga2').write_bytes(rgba.encode_rgba(8,asset.tobytes()))
    b=(LIB/'examples/materials/limestone-v1-256.rga').read_bytes();assert b[:5]==b'RGA1\x08'
    stone=np.dstack((np.frombuffer(b[5:],np.uint8).reshape(256,256,3),np.full((256,256),255,np.uint8)))
    (out/'stone.rga2').write_bytes(rgba.encode_rgba(8,stone.tobytes()))
    yy,xx=np.mgrid[:256,:256];stripe=((xx+yy*2)%4<2).astype(np.float64);fine=((xx*37+yy*83)%61)/60
    material=np.stack([85+92*stripe+12*fine,65+69*stripe+10*fine,43+48*stripe+8*fine],-1).astype(np.uint8)
    stress=np.dstack((material,np.full((256,256),255,np.uint8)));(out/'stress.rga2').write_bytes(rgba.encode_rgba(8,stress.tobytes()))
    entries={'stamp':('MaskedStamp.bend',['draw']),'rgba':('assets/RgbaImage.bend',['decode_bytes']),'mip':('Mip.bend',['level']),'texture':('AffineTexture.bend',['draw']),'glyph':('Glyph.bend',['draw']),'font':(str(font_path),['glyph'])}
    paths={};source_hashes={};common=Path(os.path.commonpath([ROOT,out]))
    for name,(file,exports) in entries.items():
        path=LIB/file;target=out/(name+'.mjs');source_hashes[name]=lower.Lower(common).emit(path,exports,target);paths[name]=str(target)
    cfg={'modules':paths,'out':str(out),'asset':str(out/'fixture.rga2'),'stone':str(out/'stone.rga2'),'stress':str(out/'stress.rga2'),'referenceGlyphs':str(old_path)}
    config=out/'render-config.json';config.write_text(json.dumps(cfg,indent=2))
    cmd=['node',str(LIB/'tools/portable/render.mjs'),str(config)];p=subprocess.run(cmd,text=True,capture_output=True,timeout=300)
    (out/'render.stdout.txt').write_text(p.stdout);(out/'render.stderr.txt').write_text(p.stderr)
    if p.returncode:raise RuntimeError(p.stderr)
    label_font=ImageFont.truetype(str(a.font),21);title_font=ImageFont.truetype(str(a.font),31);small=ImageFont.truetype(str(a.font),16)
    def card(name,title,subtitle,left,right,labels):
        c=Image.new('RGB',(1104,690),(245,243,237));d=ImageDraw.Draw(c)
        d.text((28,21),title,font=title_font,fill=(24,42,57));d.text((28,66),subtitle,font=small,fill=(70,82,89))
        for x,file,label in [(28,left,labels[0]),(564,right,labels[1])]:
            d.text((x,105),label,font=label_font,fill=(24,42,57));im=Image.open(out/(file+'.ppm'));c.paste(im,(x,143))
        d.text((28,665),'Diagnostic source-subset renders • not pinned Bend, browser, native or GPU evidence',font=small,fill=(70,82,89))
        c.save(out/(name+'.png'))
    card('01-alpha-sprites','Alpha sprites: continuous edges, holes and overlap','Straight RGBA → validated RGA2 decode → explicit mip level → MaskedStamp; integer clipping and painter order.','alpha-dark','alpha-light',['Dark checker / clipped / translucent','Light checker / same library calls'])
    card('02-material-filtering','Materials: explicit preparation, unchanged texture sampling','Top: supplied limestone. Bottom: high-frequency stress material. Same projected geometry on both sides.','material-nearest','material-filtered',['Center-nearest, source level 0','Center-nearest, explicit levels 0–3'])
    card('03-native-glyphs','Native glyph masks: avoid magnified atlas pixels','Same local DejaVu Sans reference; this comparison does not replace or change the shipped DM Sans atlas.','font-2bit-repeat','font-4bit-native',['20px / 2-bit / nearest ×2 reference','40px / native 4-bit Glyph.draw'])
    # Explicit nearest magnification for inspecting individual pixels, not a
    # substitute for the above 1:1 render.
    c=Image.new('RGB',(1104,500),(245,243,237));d=ImageDraw.Draw(c);d.text((28,20),'Glyph edge inspection · displayed at 4×',font=title_font,fill=(24,42,57))
    for x,file,label in [(28,'font-2bit-repeat','2-bit / repeated pixels'),(564,'font-4bit-native','4-bit / native coverage')]:
        d.text((x,76),label,font=label_font,fill=(24,42,57));im=Image.open(out/(file+'.ppm')).crop((13,45,141,125)).resize((512,320),Image.Resampling.NEAREST);c.paste(im,(x,117))
    d.text((28,456),'Quantization-only maximum alpha error: 42/255 at 2-bit; 8/255 at 4-bit. Not a legibility score.',font=small,fill=(70,82,89));c.save(out/'04-glyph-edge-inspection.png')
    # Pixel parity between temporary generated glyph source and producer masks
    # is separately tested by the source-subset renderer's successful glyph use.
    manifest={'scope':'Diagnostic PNGs composed from source-subset PPMs; captions/crops only are Pillow. No game/reference sprite art imported.',
              'font':font_manifest,'font_binary_or_glyph_data_distributed':False,'command':cmd,'exit_code':p.returncode,'source_bindings':source_hashes,
              'inputs':{f:hashlib.sha256((out/f).read_bytes()).hexdigest() for f in ['fixture.rga2','stone.rga2','stress.rga2']},
              'outputs':{p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(out.glob('0*.png'))}}
    (out/'visual-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n');print(json.dumps({'ok':True,'pngs':list(manifest['outputs']),'font_data_not_for_distribution':True}))
if __name__=='__main__':main()
