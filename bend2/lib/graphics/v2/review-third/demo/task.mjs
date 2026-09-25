/** Application task for the generic FrameWorkers transport; no mutable library globals. */
import {scene,dynamic,box,Raster,Surface} from './scene.mjs';
import {ImageBuffer} from '../../host/ImageBuffer.mjs';
/** Each worker owns its prepared scene and bounded tile cache, initialized once. */
export function setup(){return {scenes:new Map(),tiles:new Map(),buffers:new Map()};}
/** Render one complete opaque RGBA tile through actual compiled Bend functions. */
export function render(state,input,tile){
 if(!input||!['aurora','topology','instrument'].includes(input.scene)||!Number.isFinite(input.phase)||input.phase<0||input.phase>1)throw new TypeError('Invalid showcase state');
 let commands=state.scenes.get(input.scene);if(!commands){commands=scene(input.scene);state.scenes.set(input.scene,commands);}
 const key=`${input.scene}/${tile.x}/${tile.y}/${tile.size}`,depth=BigInt(tile.depth);let background=state.tiles.get(key);
 if(!background){const selected=Raster.select(commands,box(tile.x,tile.y,tile.x+tile.size,tile.y+tile.size));background=Raster.serial(selected,depth,tile.size,tile.x,tile.y,{$:'Pix',color:0});state.tiles.set(key,background);if(state.tiles.size>128)state.tiles.delete(state.tiles.keys().next().value);}
 const foreground=Raster.select(dynamic(input.scene,input.phase,input.visible!==false),box(tile.x,tile.y,tile.x+tile.size,tile.y+tile.size)),pma=Raster.serial(foreground,depth,tile.size,tile.x,tile.y,background),rgb=Surface.flatten_tree(depth,pma,{$:'Pix',color:0x080f22});
 let buffer=state.buffers.get(tile.size);if(!buffer){buffer=new ImageBuffer(tile.size);state.buffers.set(tile.size,buffer);}buffer.write(rgb);return buffer.bytes.slice();
}
