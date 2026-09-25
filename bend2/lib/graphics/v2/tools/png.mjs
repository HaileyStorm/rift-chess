/** Minimal deterministic RGBA PNG writer for actual renderer receipts, not a rasterizer. */
import fs from 'node:fs';
import zlib from 'node:zlib';
const table=Uint32Array.from({length:256},(_,i)=>{for(let j=0;j<8;j++)i=(i&1)?0xedb88320^(i>>>1):i>>>1;return i>>>0;});
/** IEEE PNG CRC over chunk type and data bytes. */
function crc(bytes){let c=0xffffffff;for(const byte of bytes)c=table[(c^byte)&255]^(c>>>8);return (c^0xffffffff)>>>0;}
/** Encode one length/type/data/CRC chunk. */
function chunk(type,data){const body=Buffer.concat([Buffer.from(type),data]),out=Buffer.alloc(data.length+12);out.writeUInt32BE(data.length);body.copy(out,4);out.writeUInt32BE(crc(body),out.length-4);return out;}
/** Save width×height×4 byte RGBA without color correction or resampling. */
export function writePng(path,width,height,bytes){if(bytes.length!==width*height*4)throw Error('RGBA buffer shape mismatch');const header=Buffer.alloc(13);header.writeUInt32BE(width);header.writeUInt32BE(height,4);header[8]=8;header[9]=6;const rows=Buffer.alloc(height*(width*4+1));for(let y=0;y<height;y++)rows.set(bytes.subarray(y*width*4,(y+1)*width*4),y*(width*4+1)+1);fs.writeFileSync(path,Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',zlib.deflateSync(rows,{level:9})),chunk('IEND',Buffer.alloc(0))]));}
