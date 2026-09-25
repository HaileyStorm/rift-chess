/** Application controller; scene/layout controls remain outside the reusable library. */
import {FrameWorkers} from '../../host/FrameWorkers.mjs';
import {TilePresenter} from '../../host/TilePresenter.mjs';
import {setup,render} from './task.mjs';
import {dynamicDamage} from './scene.mjs';
const $=id=>document.getElementById(id),canvas=$('canvas'),presenter=new TilePresenter(canvas.getContext('2d'),1024),fallbackState=setup();
const names={aurora:['Aurora','COMPOUND PATHS / PREMULTIPLIED LIGHT','01'],topology:['Topology','BOOLEAN GEOMETRY / SAMPLE-LEVEL COVERAGE','02'],instrument:['Signal room','APPLICATION GRAPHICS / IMMUTABLE DRAW LISTS','03']};
let pool=null,selected='aurora',phase=.42,playing=false,serial=0,records=[],latest=null;
/** Display only a completed current generation; render errors remain visible. */
async function update(full=false){const request=++serial;$('status').textContent='Rendering current generation…';if(full)$('busy').classList.remove('hidden');try{const frame=await pool.render({scene:selected,phase,visible:$('visible').checked},{damage:full?undefined:dynamicDamage});if(!frame.committed||request!==serial)return;const upload=presenter.present(frame);latest=frame;records.push({scene:selected,...frame.metrics,upload});if(records.length>120)records.shift();$('latency').textContent=frame.metrics.totalMs.toFixed(1);$('status').textContent=`Committed generation ${frame.generation} · ${frame.tiles.length} tiles · ${upload.uploads} uploads`;$('counter').textContent=`${(frame.metrics.transferredBytes/1024).toFixed(0)} KiB transferred`;$('busy').classList.add('hidden');document.body.dataset.ready='true';window.prism.last={generation:frame.generation,scene:selected,metrics:frame.metrics,tiles:frame.tiles.length};}catch(error){$('status').textContent=`Render failed: ${error.message}`;$('busy').textContent='Rendering failed — see status below';document.body.dataset.error=error.message;throw error;}}
/** Recreate worker ownership when the application changes its CPU budget. */
async function workers(count){pool?.dispose();pool=new FrameWorkers({size:1024,tileSize:64,workers:count,taskModule:new URL('./task.mjs',import.meta.url),timeoutMs:60000,fallback:(input,tile)=>render(fallbackState,input,tile)});const ready=await pool.ready();$('worker-chip').textContent=`${ready.workers} CPU workers`;await update(true);}
/** Change a specimen without preserving invalid scene caches in the output image. */
async function select(name){selected=name;for(const button of document.querySelectorAll('.scene'))button.classList.toggle('selected',button.dataset.scene===name);$('title').textContent=names[name][0];$('caption').textContent=names[name][1];$('number').textContent=`STUDY ${names[name][2]} / 03`;await update(true);}
/** Advance only after a completed render to bound application queue pressure. */
async function animate(){if(!playing)return;phase=(phase+.012)%1;$('phase').value=String(Math.round(phase*100));$('phase-value').textContent=`${Math.round(phase*100)}%`;await update(false);if(playing)requestAnimationFrame(animate);}
window.prism={get records(){return records;},get frame(){return latest;},get pool(){return pool;},select,setPhase:async(value)=>{phase=value;$('phase').value=String(value*100);$('phase-value').textContent=`${Math.round(value*100)}%`;await update(false);},setWorkers:workers,last:null};
for(const button of document.querySelectorAll('.scene'))button.addEventListener('click',()=>select(button.dataset.scene).catch(console.error));
$('phase').addEventListener('input',()=>{phase=Number($('phase').value)/100;$('phase-value').textContent=`${Math.round(phase*100)}%`;update(false).catch(console.error);});
$('visible').addEventListener('change',()=>update(false).catch(console.error));$('workers').addEventListener('change',()=>workers(Number($('workers').value)).catch(console.error));
$('animate').addEventListener('click',()=>{playing=!playing;$('animate').textContent=playing?'❚❚ Pause':'▶ Play';if(playing)animate().catch(console.error);});
$('reset').addEventListener('click',()=>window.prism.setPhase(.42).catch(console.error));
$('save').addEventListener('click',()=>canvas.toBlob(blob=>{if(!blob)return;const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`prism-${selected}.png`;a.click();setTimeout(()=>URL.revokeObjectURL(url),5000);}));
window.addEventListener('pagehide',()=>pool?.dispose());await workers(4);
