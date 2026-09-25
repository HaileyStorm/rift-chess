/** Real module-worker tile transport for application-owned compiled Bend jobs.
 * Assets/init are cloned once per worker. Each frame sends small application data
 * and tile coordinates; each output tile is transferred. The pool never serializes
 * a fresh Image tree itself. CPU worker execution is NOT a GPU implementation.
 */
import {square,damageTiles} from './TileDamage.mjs';
/** Validate a bounded integer option without silently coercing host input. */
function bounded(value,name,lo,hi){if(!Number.isSafeInteger(value)||value<lo||value>hi)throw new RangeError(`${name} must be an integer in [${lo},${hi}]`);return value;}
/** Copy one complete RGBA tile into nonoverlapping rows of a staging frame. */
function copyTile(destination,size,tile,bytes){for(let y=0;y<tile.size;y++)destination.set(bytes.subarray(y*tile.size*4,(y+1)*tile.size*4),((tile.y+y)*size+tile.x)*4);}
/** Bounded latest-request-wins renderer with atomic complete-frame publication. */
export class FrameWorkers {
  #slots=[];#batch=null;#generation=0;#job=0;#disposed=false;#last=null;#fallbackBusy=false;#dirty=new Map();
  /** Configure a square frame and worker task module.
   * taskModule exports async setup(init) and render(state,input,tile), returning
   * exactly tile.size²×4 straight RGBA bytes. fallback, when provided, has the
   * same rendering obligation. Caller must conservatively declare output damage.
   */
  constructor({size,tileSize=64,workers=2,taskModule,init=null,workerURL=new URL('./frame-worker.mjs',import.meta.url),timeoutMs=30000,fallback=null,WorkerClass=globalThis.Worker}) {
    Object.defineProperties(this,{size:{value:square(size),enumerable:true},tileSize:{value:square(tileSize,'tileSize'),enumerable:true}});damageTiles(size,tileSize,[]);
    bounded(workers,'workers',1,8);bounded(timeoutMs,'timeoutMs',100,300000);
    if(typeof taskModule!=='string'&&!(taskModule instanceof URL))throw new TypeError('taskModule must be a module URL');
    if(fallback!==null&&typeof fallback!=='function')throw new TypeError('fallback must be a function');
    this.timeoutMs=timeoutMs;this.fallback=fallback;this.taskModule=String(taskModule);this.init=init;this.failures=[];
    for(let i=0;i<workers;i++){
      const slot={index:i,worker:null,ready:false,dead:false,busy:null,timer:null};
      slot.promise=new Promise(resolve=>slot.resolveReady=resolve);this.#slots.push(slot);
      try{
        if(typeof WorkerClass!=='function')throw new Error('Module workers are unavailable');
        slot.worker=new WorkerClass(workerURL,{type:'module',name:`bend-graphics-${i}`});
        slot.worker.onmessage=event=>this.#message(slot,event.data);
        slot.worker.onerror=event=>{event.preventDefault?.();this.#fail(slot,new Error(event.message||'Worker error'));};
        slot.worker.onmessageerror=()=>this.#fail(slot,new Error('Worker message deserialization failed'));
        slot.timer=setTimeout(()=>this.#fail(slot,new Error('Worker initialization timeout')),timeoutMs);
        slot.worker.postMessage({v:1,type:'init',module:this.taskModule,payload:init});
      }catch(error){this.#fail(slot,error);}
    }
  }
  /** Wait for all slots to either initialize or fail; partial availability is explicit. */
  async ready(){await Promise.all(this.#slots.map(s=>s.promise));return {workers:this.#slots.filter(s=>s.ready&&!s.dead).length,failures:[...this.failures],fallback:!!this.fallback};}
  /** Render the newest request. Superseded/cancelled work resolves uncommitted.
   * Input is structured-cloned once at submission, before any asynchronous job.
   * Partial frames start from the last GOOD committed bytes, never an unfinished
   * generation. Returned pixels belong to the caller; private last-good state is
   * copied before publication so caller mutation cannot corrupt future damage.
   */
  render(input,{damage}={}) {
    if(this.#disposed)return Promise.reject(new Error('Renderer is disposed'));
    let requested,captured;try{requested=damageTiles(this.size,this.tileSize,this.#last?damage:undefined);captured=structuredClone(input);}catch(error){return Promise.reject(error);}
    // Carry uncommitted damage across superseded, cancelled and failed requests.
    // This lets accepted submissions describe successive desired states without
    // losing the footprint of the last actually committed state.
    for(const tile of requested)this.#dirty.set(tile.index,tile);
    const tiles=[...this.#dirty.values()].sort((a,b)=>a.index-b.index);
    this.#supersede('superseded');const generation=++this.#generation,start=performance.now();
    return new Promise((resolve,reject)=>{
      const batch={generation,input:captured,requestedTiles:requested.length,tiles,queue:tiles.map(tile=>({tile,retries:0})),remaining:tiles.length,stage:this.#last?this.#last.slice():new Uint8ClampedArray(this.size*this.size*4),resolve,reject,start,workerMs:[],fallbackTiles:0,transferredBytes:0};
      this.#batch=batch;if(!tiles.length)this.#commit(batch);else this.#dispatch();
    });
  }
  /** Cancel publication/queued jobs. Running synchronous worker jobs may finish. */
  cancel(){this.#generation++;this.#supersede('cancelled');}
  /** Resolve an obsolete batch without presenting its partially computed stage. */
  #supersede(reason){const batch=this.#batch;this.#batch=null;if(batch)batch.resolve({committed:false,generation:batch.generation,reason});}
  /** Dispatch at most one job per live worker, and one optional fallback job. */
  #dispatch(){
    const batch=this.#batch;if(!batch||this.#disposed)return;
    for(const slot of this.#slots){if(!batch.queue.length)break;if(slot.dead||!slot.ready||slot.busy)continue;const queued=batch.queue.shift(),job={...queued,id:++this.#job,generation:batch.generation};slot.busy=job;
      slot.timer=setTimeout(()=>this.#fail(slot,new Error('Worker tile timeout')),this.timeoutMs);
      try{slot.worker.postMessage({v:1,type:'tile',id:job.id,generation:job.generation,input:batch.input,tile:job.tile});}catch(error){this.#fail(slot,error);}
    }
    const initializing=this.#slots.some(s=>!s.dead&&!s.ready),live=this.#slots.some(s=>!s.dead&&s.ready);
    if(!live&&!initializing&&batch.queue.length){
      if(this.fallback&&!this.#fallbackBusy){const job=batch.queue.shift();this.#fallbackBusy=true;const started=performance.now();new Promise(resolve=>setTimeout(resolve,0)).then(()=>this.fallback(batch.input,job.tile)).then(bytes=>{
        if(!(bytes instanceof Uint8ClampedArray)&&!(bytes instanceof Uint8Array))throw new TypeError('Fallback must return RGBA byte storage');
        if(bytes.byteLength!==job.tile.size*job.tile.size*4)throw new RangeError('Fallback tile has wrong byte length');
        if(this.#batch===batch){batch.fallbackTiles++;this.#accept(batch,job.tile,bytes,performance.now()-started,false);}
      }).catch(error=>{if(this.#batch===batch)this.#reject(batch,error);}).finally(()=>{this.#fallbackBusy=false;this.#dispatch();});}
      else if(!this.fallback)this.#reject(batch,new Error('No rendering worker remains; last-good frame preserved'));
    }
  }
  /** Accept only an exact current job response; stale generations are discarded. */
  #message(slot,message){
    if(this.#disposed||slot.dead)return;
    if(!message||message.v!==1){this.#fail(slot,new Error('Unsupported worker protocol'));return;}
    if(message.type==='ready'){
      if(slot.ready||slot.busy){this.#fail(slot,new Error('Unexpected duplicate worker initialization'));return;}
      clearTimeout(slot.timer);slot.timer=null;slot.ready=true;slot.resolveReady();this.#dispatch();return;
    }
    if(message.type==='error'){this.#fail(slot,new Error(message.error||'Worker task failed'));return;}
    const job=slot.busy;
    if(message.type!=='tile'||!job||message.id!==job.id||message.generation!==job.generation){this.#fail(slot,new Error('Worker job identity mismatch'));return;}
    if(!(message.buffer instanceof ArrayBuffer)||message.buffer.byteLength!==job.tile.size*job.tile.size*4||!Number.isFinite(message.ms)||message.ms<0){this.#fail(slot,new Error('Malformed worker tile'));return;}
    clearTimeout(slot.timer);slot.timer=null;slot.busy=null;
    const batch=this.#batch;
    if(batch&&batch.generation===job.generation)this.#accept(batch,job.tile,new Uint8ClampedArray(message.buffer),message.ms,true);
    this.#dispatch();
  }
  /** Assemble a complete tile and publish only after every required tile arrives. */
  #accept(batch,tile,bytes,ms,transferred){if(this.#batch!==batch)return;copyTile(batch.stage,this.size,tile,bytes);batch.workerMs.push(ms);if(transferred)batch.transferredBytes+=bytes.byteLength;batch.remaining--;if(batch.remaining===0)this.#commit(batch);}
  /** Commit once, preserving independent internal last-good storage. */
  #commit(batch){if(this.#batch!==batch)return;this.#last=batch.stage.slice();this.#dirty.clear();this.#batch=null;batch.resolve({committed:true,generation:batch.generation,pixels:batch.stage,size:this.size,tiles:batch.tiles,metrics:{totalMs:performance.now()-batch.start,requestedTiles:batch.requestedTiles,carriedTiles:batch.tiles.length-batch.requestedTiles,workerMs:batch.workerMs,fallbackTiles:batch.fallbackTiles,transferredBytes:batch.transferredBytes,workers:this.#slots.filter(s=>s.ready&&!s.dead).length}});}
  /** Reject a failed generation without overwriting last-good bytes. */
  #reject(batch,error){if(this.#batch!==batch)return;this.#batch=null;batch.reject(error);}
  /** Quarantine a failed worker and retry its current tile at most once. */
  #fail(slot,error){
    if(slot.dead||this.#disposed)return;slot.dead=true;clearTimeout(slot.timer);slot.timer=null;slot.worker?.terminate();slot.resolveReady();this.failures.push({worker:slot.index,error:String(error?.message??error)});
    const job=slot.busy;slot.busy=null;const batch=this.#batch;
    if(batch&&job&&job.generation===batch.generation){if(job.retries<1)batch.queue.unshift({tile:job.tile,retries:job.retries+1});else this.#reject(batch,new Error('Tile retry failed; last-good frame preserved'));}
    this.#dispatch();
  }
  /** Terminate workers, settle pending publication, and release frame storage. */
  dispose(){if(this.#disposed)return;this.#disposed=true;this.#supersede('disposed');for(const slot of this.#slots){clearTimeout(slot.timer);slot.resolveReady();slot.worker?.terminate();slot.busy=null;}this.#last=null;this.#dirty.clear();}
}
