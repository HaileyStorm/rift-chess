import assert from 'node:assert/strict';
import {loadFontPack} from '../platform/browser/asset-port.ts';

const priorSelf=globalThis.self, priorFetch=globalThis.fetch;
try {
  globalThis.self={location:{href:'https://example.test/rift-preview/worker-v2.js',
    origin:'https://example.test'}};
  const requested=[];
  globalThis.fetch=async url=>{
    requested.push(String(url));
    const response=new Response(Uint8Array.from([82,70,78,84,2]),
      {status:200,headers:{'content-length':'5'}});
    Object.defineProperty(response,'url',{value:String(url)});
    return response;
  };
  const found=await loadFontPack('assets/rift-observatory-font.rga',262144);
  assert.equal(found.ok,true);
  assert.equal(found.used,5);
  assert.equal(found.bytes.length,8,'Bend Array backing must be a power of two');
  assert.deepEqual([...found.bytes],[82,70,78,84,2,0,0,0]);
  assert.deepEqual(requested,['https://example.test/rift-preview/assets/rift-observatory-font.rga']);
  const invalid=await loadFontPack('../other.rga',262144);
  assert.equal(invalid.ok,false);
  assert.equal(requested.length,1,'non-allowlisted path must not be fetched');
  globalThis.fetch=async url=>{
    const response=new Response(new Uint8Array(6),
      {status:200,headers:{'content-length':'6'}});
    Object.defineProperty(response,'url',{value:String(url)});
    return response;
  };
  assert.equal((await loadFontPack('assets/rift-observatory-font.rga',5)).ok,false,
    'over-cap Content-Length must be rejected before reading');
  console.log('Bend font byte port: nested URL, power-of-two backing, path and length caps passed');
}finally{
  globalThis.self=priorSelf;
  globalThis.fetch=priorFetch;
}
