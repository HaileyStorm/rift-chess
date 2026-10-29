/** Host-native preview only; Canvas AA/blending do not implement v2 coverage. */
import {ImageBuffer} from './ImageBuffer.mjs';

const MAX_COMMANDS=2048;
const MAX_POINTS=32768;
const MAX_TEXTURES=128;
const MAX_TEXELS=16777216;
const LIMIT=4096;
const now=()=>globalThis.performance?.now?.()??Date.now();

function u32(value,name){
 if(!Number.isSafeInteger(value)||value<0||value>0xffffffff)throw new TypeError(`${name} must be U32`);
 return value;
}
function coordinate(value,name){
 if(!Number.isFinite(value)||Math.abs(value)>LIMIT)throw new RangeError(`${name} must be finite in [-4096,4096]`);
 return value;
}
function span(value,name,zero=false){
 coordinate(value,name);
 if(value<0||(!zero&&value===0))throw new RangeError(`${name} must be ${zero?'nonnegative':'positive'}`);
 return value;
}
function integerCoordinate(value,name){
 coordinate(value,name);
 if(!Number.isInteger(value))throw new TypeError(`${name} must be an integer`);
 return value;
}
function css(color){return `#${(u32(color,'color')&0xffffff).toString(16).padStart(6,'0')}`;}
function alpha(opacity){return Math.min(u32(opacity,'opacity'),255)/255;}
function kind(command){
 if(typeof command?.$!=='string')throw new TypeError('Malformed preview command');
 return command.$.slice(command.$.lastIndexOf('.')+1);
}
function list(value,limit,name,visit){
 let count=0,node=value;
 while(node?.$==='Con'){
  if(++count>limit)throw new RangeError(`${name} exceeds ${limit} entries`);
  visit(node.head);node=node.tail;
 }
 if(node?.$!=='Nil')throw new TypeError(`Malformed ${name}`);
 return count;
}
function surface(size,opaque){
 if(typeof globalThis.OffscreenCanvas!=='function')throw new Error('Canvas preview requires OffscreenCanvas');
 const canvas=new globalThis.OffscreenCanvas(size,size);
 const context=canvas.getContext('2d',{alpha:!opaque});
 if(!context||typeof context.createImageData!=='function'||typeof context.putImageData!=='function')throw new Error('Canvas preview requires Canvas 2D');
 context.imageSmoothingEnabled=false;
 return {canvas,context};
}
function textureShape(texture){
 if(!texture||typeof texture!=='object')throw new TypeError('Malformed texture');
 const rawDepth=texture.depth;
 const bounded=typeof rawDepth==='bigint'?rawDepth>=0n&&rawDepth<=12n:Number.isInteger(rawDepth)&&rawDepth>=0&&rawDepth<=12;
 if(!bounded)throw new RangeError('Texture depth must be in [0,12]');
 const depth=Number(rawDepth),size=u32(texture.size,'texture.size');
 if(size!==2**depth)throw new RangeError('Texture size must equal 2^depth');
 if(!texture.colors||!texture.mask)throw new TypeError('Texture requires colors and mask Images');
 return {depth,size};
}

export class CanvasPreview {
 #size;#frame;#backgroundBuffer;#background=null;
 #textures=[];#records=new Map();

 constructor(size=512){
  this.#backgroundBuffer=new ImageBuffer(size);
  this.#size=size;this.#frame=surface(size,true);
  if(typeof this.#frame.canvas.transferToImageBitmap!=='function')throw new Error('Canvas preview requires transferable ImageBitmap frames');
 }

 #makeTexture(texture,shape){
  const {size,depth}=shape;
  const colors=new ImageBuffer(size),mask=new ImageBuffer(size);
  colors.write(texture.colors);mask.write(texture.mask);
  const target=surface(size,false),data=target.context.createImageData(size,size);
  data.data.set(colors.bytes);
  for(let offset=0;offset<data.data.length;offset+=4)data.data[offset+3]=mask.bytes[offset];
  target.context.putImageData(data,0,0);
  return {texture,depth,size,colors:texture.colors,mask:texture.mask,canvas:target.canvas};
 }

 /** Texture IDs are indices in this array. Inputs are immutable Bend Data. */
 setTextures(textures){
  if(!Array.isArray(textures)||textures.length>MAX_TEXTURES)throw new RangeError('Textures must be an array of at most 128 entries');
  const started=now(),shapes=textures.map(textureShape),active=new Set(textures);
  let texels=0;
  for(const texture of active){const shape=textureShape(texture);texels+=shape.size*shape.size;}
  if(texels>MAX_TEXELS)throw new RangeError('Active textures exceed the texel budget');
  const records=new Map();let textureBuilds=0,textureCacheHits=0;
  const ordered=textures.map((texture,index)=>{
   let record=records.get(texture)??this.#records.get(texture);
   if(record){
    if(record.depth!==shapes[index].depth||record.size!==shapes[index].size||record.colors!==texture.colors||record.mask!==texture.mask)throw new TypeError('Cached texture Data was mutated');
    textureCacheHits++;
   }else{record=this.#makeTexture(texture,shapes[index]);textureBuilds++;}
   records.set(texture,record);return record;
  });
  this.#records=records;this.#textures=ordered;
  return {textures:ordered.length,textureBuilds,textureCacheHits,textureMs:now()-started};
 }

 #commands(commands){
  const result=[];let pointCount=0;
  const points=value=>{
   const parsed=[];
   list(value,MAX_POINTS,'points',point=>{
    if(++pointCount>MAX_POINTS)throw new RangeError('Preview paths exceed the point budget');
    parsed.push({x:coordinate(point?.x,'point.x'),y:coordinate(point?.y,'point.y')});
   });
   return parsed;
  };
  list(commands,MAX_COMMANDS,'commands',command=>{
   switch(kind(command)){
    case 'Polygon':result.push({kind:'Polygon',points:points(command.points),color:css(command.color),alpha:alpha(command.opacity)});break;
    case 'Line':
     if(typeof command.closed!=='boolean')throw new TypeError('Line.closed must be Bool');
     result.push({kind:'Line',points:points(command.points),color:css(command.color),alpha:alpha(command.opacity),width:span(command.width,'line.width'),closed:command.closed});break;
    case 'Ellipse':result.push({kind:'Ellipse',x:coordinate(command.center?.x,'center.x'),y:coordinate(command.center?.y,'center.y'),rx:span(command.rx,'ellipse.rx',true),ry:span(command.ry,'ellipse.ry',true),color:css(command.color),alpha:alpha(command.opacity)});break;
    case 'Sprite':{
     const texture=u32(command.texture,'sprite.texture'),label=u32(command.label,'sprite.label');
     if(texture>=this.#textures.length)throw new RangeError('Unknown sprite texture');
     if(label>0xffffff)throw new RangeError('Sprite label exceeds RGB24');
     const width=u32(command.width,'sprite.width'),height=u32(command.height,'sprite.height');
     if(width<1||height<1||width>LIMIT||height>LIMIT)throw new RangeError('Sprite dimensions must be in [1,4096]');
     result.push({kind:'Sprite',record:this.#textures[texture],left:integerCoordinate(command.left,'sprite.left'),top:integerCoordinate(command.top,'sprite.top'),width,height,alpha:alpha(command.opacity),label});break;
    }
    default:throw new TypeError('Unknown preview command');
   }
  });
  return result;
 }

 /** The caller owns transferring or closing the returned ImageBitmap. */
 render(commands,background){
  const started=now(),parsed=this.#commands(commands);
  const metrics={commands:parsed.length,sprites:0,commandMs:now()-started,backgroundCacheHit:this.#background?.image===background};
  const color=this.#frame.context,size=this.#size;
  const backgroundStarted=now();
  if(!metrics.backgroundCacheHit){
   this.#backgroundBuffer.write(background);
   const data=color.createImageData(size,size);data.data.set(this.#backgroundBuffer.bytes);
   this.#background={image:background,data};
  }
  color.setTransform(1,0,0,1,0,0);color.globalCompositeOperation='source-over';color.globalAlpha=1;color.imageSmoothingEnabled=false;
  color.putImageData(this.#background.data,0,0);
  metrics.backgroundMs=now()-backgroundStarted;
  const drawStarted=now();
  for(const command of parsed){
   color.globalAlpha=command.alpha;
   if(command.kind==='Sprite'){
    color.drawImage(command.record.canvas,command.left,command.top,command.width,command.height);metrics.sprites++;
   }else{
    color.beginPath();
    if(command.kind==='Ellipse')color.ellipse(command.x,command.y,command.rx,command.ry,0,0,2*Math.PI);
    else if(command.points.length){
     color.moveTo(command.points[0].x,command.points[0].y);
     for(let index=1;index<command.points.length;index++)color.lineTo(command.points[index].x,command.points[index].y);
     if(command.kind==='Polygon'||command.closed)color.closePath();
    }
    if(command.kind==='Line'){color.strokeStyle=command.color;color.lineWidth=command.width;color.lineCap='butt';color.lineJoin='miter';color.stroke();}
    else{color.fillStyle=command.color;color.fill();}
   }
  }
  metrics.drawMs=now()-drawStarted;
  const transferStarted=now(),bitmap=this.#frame.canvas.transferToImageBitmap();metrics.bitmapTransferMs=now()-transferStarted;
  metrics.totalMs=now()-started;
  return {bitmap,metrics};
 }
}
