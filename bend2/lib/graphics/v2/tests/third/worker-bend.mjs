/** Actual compiled Bend fixture rendered inside real browser module workers. */
import Fixture from '../../review-third/demo/compiled/NativePixels.mjs';
import {ImageBuffer} from '../../host/ImageBuffer.mjs';
/** Render all 32² fixture pixels through Bend once per initialized worker. */
export function setup(){const buffer=new ImageBuffer(32);buffer.write(Fixture.render(2n,false));return buffer.bytes;}
/** Tile extraction is host presentation transport, not a substitute rasterizer. */
export function render(pixels,input,tile){const out=new Uint8Array(tile.size*tile.size*4);for(let y=0;y<tile.size;y++){const start=((tile.y+y)*32+tile.x)*4;out.set(pixels.subarray(start,start+tile.size*4),y*tile.size*4);}return out;}
