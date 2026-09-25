/** Canvas presentation for complete committed RGBA worker frames; no renderer policy. */
import {square,tileSpans} from './TileDamage.mjs';
/** Reusable ImageData uploader, with conservative tile-to-row-span coalescing. */
export class TilePresenter {
  /** Canvas dimensions must already equal size; resizing remains application-owned. */
  constructor(context,size){this.size=square(size);if(!context?.canvas||context.canvas.width!==size||context.canvas.height!==size)throw new RangeError('Canvas must match the frame size');if(typeof context.createImageData!=='function'||typeof context.putImageData!=='function')throw new TypeError('A Canvas 2D context is required');this.context=context;this.image=context.createImageData(size,size);this.initialized=false;}
  /** Upload only changed spans after initialization. Rejected frames do nothing.
   * Cost includes staging-row copies and putImageData calls, not display scanout.
   */
  present(frame){
    if(!frame?.committed)return {uploads:0,pixels:0,ms:0};
    if(!Array.isArray(frame.tiles))throw new TypeError('Committed frame must include tiles');
    for(const t of frame.tiles)if(!t||![t.x,t.y,t.size].every(Number.isSafeInteger)||t.size<1||t.x<0||t.y<0||t.x+t.size>this.size||t.y+t.size>this.size)throw new RangeError('Malformed committed tile');
    if(frame.size!==this.size||!(frame.pixels instanceof Uint8ClampedArray)||frame.pixels.length!==this.size*this.size*4)throw new TypeError('Malformed committed frame');
    const start=performance.now(),spans=this.initialized?tileSpans(frame.tiles):[{left:0,top:0,right:this.size,bottom:this.size}];let pixels=0;
    for(const {left,top,right,bottom}of spans){for(let y=top;y<bottom;y++){const begin=(y*this.size+left)*4,end=(y*this.size+right)*4;this.image.data.set(frame.pixels.subarray(begin,end),begin);}this.context.putImageData(this.image,0,0,left,top,right-left,bottom-top);pixels+=(right-left)*(bottom-top);}
    this.initialized=true;return {uploads:spans.length,pixels,ms:performance.now()-start};
  }
}
