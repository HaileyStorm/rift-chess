/** Validated deterministic tile damage, independent of renderer or application policy. */
/** Validate a square power-of-two extent in the legacy graphics domain. */
export function square(value,name='size') {
  if(!Number.isSafeInteger(value)||value<1||value>4096||(value&(value-1))) throw new RangeError(`${name} must be a power of two in [1,4096]`);
  return value;
}
/** Clip and normalize half-open damage; reversed/empty rectangles remain empty. */
export function clipped(rect,size) {
  if(!rect||typeof rect!=='object')throw new TypeError('A rectangle is required');
  for(const key of ['left','top','right','bottom'])if(!Number.isSafeInteger(rect[key]))throw new TypeError(`${key} must be a safe integer`);
  return {left:Math.max(0,Math.min(size,rect.left)),top:Math.max(0,Math.min(size,rect.top)),right:Math.max(0,Math.min(size,rect.right)),bottom:Math.max(0,Math.min(size,rect.bottom))};
}
/** Return unique row-major tiles intersecting damage, with at most 4096 jobs.
 * undefined means the full square; [] means no damage. A first frame must request
 * full damage even if application-supplied rectangles cover only a small area.
 */
export function damageTiles(size,tileSize,rectangles) {
  square(size);square(tileSize,'tileSize');
  if(tileSize>size||size/tileSize*size/tileSize>4096)throw new RangeError('Tile grid must contain 1..4096 whole tiles');
  if(rectangles!==undefined&&!Array.isArray(rectangles))throw new TypeError('damage must be an array or undefined');
  const n=size/tileSize,bits=new Uint8Array(n*n),input=rectangles??[{left:0,top:0,right:size,bottom:size}];
  for(const r of input){const {left,top,right,bottom}=clipped(r,size);if(left>=right||top>=bottom)continue;for(let y=Math.floor(top/tileSize);y<Math.ceil(bottom/tileSize);y++)for(let x=Math.floor(left/tileSize);x<Math.ceil(right/tileSize);x++)bits[y*n+x]=1;}
  const out=[];for(let index=0;index<bits.length;index++)if(bits[index])out.push({index,x:index%n*tileSize,y:Math.floor(index/n)*tileSize,size:tileSize,depth:Math.log2(tileSize)});
  return out;
}
/** Merge horizontally adjacent tiles into upload spans; order is deterministic. */
export function tileSpans(tiles) {
  const out=[];for(const tile of tiles){const last=out.at(-1);if(last&&last.top===tile.y&&last.bottom===tile.y+tile.size&&last.right===tile.x)last.right+=tile.size;else out.push({left:tile.x,top:tile.y,right:tile.x+tile.size,bottom:tile.y+tile.size});}return out;
}
