/** Render and operate the reusable graphics specimen over static HTTP. */
import fs from 'node:fs';
import {chromium} from 'playwright';

const port=Number(process.argv[2]??8979);
const screenshot=process.argv[3];
const executable=process.argv[4]??'C:/Program Files/Google/Chrome/Application/chrome.exe';
const receipt=process.argv[5];
if(!Number.isSafeInteger(port)||port<1||port>65535)throw Error('Specify the loopback server port');
const browser=await chromium.launch({executablePath:executable,headless:true});
try{
  const page=await browser.newPage({viewport:{width:1500,height:1120},deviceScaleFactor:1});
  const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.goto(`http://127.0.0.1:${port}/review-third/demo/`,{waitUntil:'load'});
  await page.waitForFunction(()=>document.body.dataset.ready==='true'||!!document.body.dataset.error,null,{timeout:180000});
  if(await page.evaluate(()=>document.body.dataset.error))throw Error(await page.evaluate(()=>document.body.dataset.error));
  const initial=await page.evaluate(()=>window.prism.last);
  await page.evaluate(()=>window.prism.select('topology'));
  const selected=await page.evaluate(()=>window.prism.last);
  await page.evaluate(()=>window.prism.setPhase(.65));
  const animated=await page.evaluate(()=>window.prism.last);
  if(!initial?.generation||selected?.scene!=='topology'||animated?.generation<=selected.generation||errors.length)throw Error(JSON.stringify({initial,selected,animated,errors}));
  if(screenshot)await page.screenshot({path:screenshot,fullPage:true});
  const compact=frame=>({generation:frame.generation,scene:frame.scene,tiles:frame.tiles,
    totalMs:frame.metrics.totalMs,workerCount:frame.metrics.workers,
    transferredBytes:frame.metrics.transferredBytes,fallbackTiles:frame.metrics.fallbackTiles});
  const report={ok:true,browser:browser.version(),initial:compact(initial),selected:compact(selected),
    animated:compact(animated),errors,screenshot};
  if(receipt)fs.writeFileSync(receipt,JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report));
  await page.close();
}finally{await browser.close();}
