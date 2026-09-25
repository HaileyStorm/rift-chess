/** Deliberately nonconforming REAL worker for job identity rejection. */
self.onmessage=event=>{const m=event.data;if(m.type==='init'){self.postMessage({v:1,type:'ready'});return;}const buffer=new ArrayBuffer(m.tile.size*m.tile.size*4);self.postMessage({v:1,type:'tile',id:m.id+1,generation:m.generation,ms:1,buffer},[buffer]);};
