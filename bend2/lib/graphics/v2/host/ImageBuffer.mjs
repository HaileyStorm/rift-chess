/** Mutable host boundary for immutable Bend RGB Images; no rendering policy.
 * Each buffer holds size×size×4 RGBA bytes. Alpha is 255: Image is opaque RGB,
 * not an RGBA texture. Uniform nodes are written with typed-array row fills.
 */
const endianProbe=new Uint32Array([0x01020304]);
const littleEndian=new Uint8Array(endianProbe.buffer)[0]===4;
/** Validate an integer instead of silently truncating a malformed host value. */
function integer(value,name){if(!Number.isSafeInteger(value))throw new TypeError(`${name} must be a safe integer`);return value;}
/** Clip a half-open integer rectangle; null means the complete square. */
export function clipRect(rect,size){
 if(rect===undefined||rect===null)return {left:0,top:0,right:size,bottom:size};
 const {left,top,right,bottom}=rect;
 for(const [k,n] of Object.entries({left,top,right,bottom}))integer(n,k);
 return {left:Math.max(0,Math.min(size,left)),top:Math.max(0,Math.min(size,top)),right:Math.max(0,Math.min(size,right)),bottom:Math.max(0,Math.min(size,bottom))};
}
/** Reusable size×size opaque-RGBA staging buffer. Never exposes source mutation. */
export class ImageBuffer {
 /** Allocate a power-of-two square, at most 4096²×4 bytes (64 MiB). */
 constructor(size){integer(size,'size');if(size<1||size>4096||(size&(size-1)))throw new RangeError('size must be a power of two in [1,4096]');this.size=size;this.bytes=new Uint8ClampedArray(size*size*4);this.words=new Uint32Array(this.bytes.buffer);}
 /** Write one clipped region and return visited-node/pixel counts, not time.
  * Inputs must be well-formed Bend Data. Only visited branches are validated;
  * a malformed visited node can throw after earlier writes have happened.
  */
 write(image,rect){
  const region=clipRect(rect,this.size);let visited=0,pixels=0;
  const {left,top,right,bottom}=region;if(left>=right||top>=bottom)return {region,visited,pixels};
  const visit=(node,x,y,side)=>{
   const l=Math.max(x,left),t=Math.max(y,top),r=Math.min(x+side,right),b=Math.min(y+side,bottom);
   if(l>=r||t>=b)return;visited++;
   if(node?.$==='Pix'){
    integer(node.color,'Pix.color');if(node.color<0||node.color>0xffffffff)throw new RangeError('Pix.color is not U32');
    const rgb=node.color>>>0,red=rgb>>>16&255,green=rgb>>>8&255,blue=rgb&255;
    const word=littleEndian?((0xff000000|(blue<<16)|(green<<8)|red)>>>0):((red<<24)|(green<<16)|(blue<<8)|255)>>>0;
    for(let row=t;row<b;row++)this.words.fill(word,row*this.size+l,row*this.size+r);
    pixels+=(r-l)*(b-t);return;
   }
   if(node?.$!=='Qua'||side===1)throw new TypeError('Malformed Image or quadtree deeper than its declared side');
   const half=side/2;visit(node.tl,x,y,half);visit(node.tr,x+half,y,half);visit(node.bl,x,y+half,half);visit(node.br,x+half,y+half,half);
  };
  visit(image,0,0,this.size);return {region,visited,pixels};
 }
}

/** Thin optional Canvas 2D upload adapter, separate from pure Bend rendering.
 * Reuses one ImageData and buffer. Dirty rectangles describe changed OUTPUT,
 * so callers still compute conservative scene damage and reconstruct it first.
 */
export class CanvasPresenter {
 /** Use an existing context whose canvas has already been sized by the app. */
 constructor(context,size){
  this.buffer=new ImageBuffer(size);
  if(!context||typeof context.createImageData!=='function'||typeof context.putImageData!=='function')throw new TypeError('A Canvas 2D compatible context is required');
  if(context.canvas&&(context.canvas.width!==size||context.canvas.height!==size))throw new RangeError('The application must size the canvas before constructing its presenter');
  this.context=context;this.imageData=context.createImageData(size,size);
  if(!(this.imageData.data instanceof Uint8ClampedArray)||this.imageData.data.length!==this.buffer.bytes.length)throw new TypeError('Unexpected ImageData layout');
  this.initialized=false;
 }
 /** Upload all pixels on the first call; thereafter [] means no work.
  * Rectangles are not reordered or merged; overlapping regions may upload twice.
  * Browser/device upload performance is deliberately outside this contract.
  */
 present(image,rectangles){
  if(rectangles!==undefined&&!Array.isArray(rectangles))throw new TypeError('rectangles must be an array or undefined');
  const regions=!this.initialized||rectangles===undefined?[null]:rectangles;
  let pixels=0,visited=0,uploads=0;
  for(const rect of regions){
   const result=this.buffer.write(image,rect);pixels+=result.pixels;visited+=result.visited;
   if(!result.pixels)continue;
   const {left,top,right,bottom}=result.region;
   // Copy only changed rows into the persistent ImageData. No full-frame copy
   // is hidden in the partial-update path.
   for(let y=top;y<bottom;y++){const start=(y*this.buffer.size+left)*4,end=(y*this.buffer.size+right)*4;this.imageData.data.set(this.buffer.bytes.subarray(start,end),start);}
   this.context.putImageData(this.imageData,0,0,left,top,right-left,bottom-top);uploads++;
  }
  this.initialized=true;return {pixels,visited,uploads};
 }
}
