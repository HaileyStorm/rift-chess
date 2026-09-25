/** Versioned module-worker endpoint; task code and initialized assets are app-owned. */
let task=null,state=null,ready=false,busy=false;
/** Send a bounded diagnostic without passing host exception objects across realms. */
function fail(error){self.postMessage({v:1,type:'error',error:String(error?.message??error).slice(0,2048)});}
/** Initialize once, then execute one complete tile per message with transfer ownership. */
self.onmessage=async event=>{
  const message=event.data;
  try{
    if(!message||message.v!==1)throw new Error('Unsupported frame-worker protocol');
    if(message.type==='init'){
      if(ready||task||busy)throw new Error('Worker can initialize only once');busy=true;
      task=await import(message.module);if(typeof task.render!=='function')throw new TypeError('Task module must export render(state,input,tile)');
      state=typeof task.setup==='function'?await task.setup(message.payload):null;busy=false;ready=true;self.postMessage({v:1,type:'ready'});return;
    }
    if(message.type!=='tile'||!ready||busy)throw new Error('Worker not ready for this tile');
    const tile=message.tile;if(!tile||!Number.isInteger(tile.size)||tile.size<1||tile.size>4096||!Number.isInteger(tile.x)||!Number.isInteger(tile.y)||tile.x<0||tile.y<0)throw new TypeError('Invalid tile bounds');
    busy=true;const start=performance.now();let bytes=await task.render(state,message.input,tile);
    if(!(bytes instanceof Uint8Array)&&!(bytes instanceof Uint8ClampedArray))throw new TypeError('Task must return RGBA bytes');
    if(bytes.byteLength!==tile.size*tile.size*4)throw new RangeError('Task returned an incorrect tile byte length');
    if(bytes.byteOffset!==0||bytes.byteLength!==bytes.buffer.byteLength)bytes=bytes.slice();
    const buffer=bytes.buffer;self.postMessage({v:1,type:'tile',id:message.id,generation:message.generation,ms:performance.now()-start,buffer},[buffer]);busy=false;
  }catch(error){busy=false;fail(error);}
};
