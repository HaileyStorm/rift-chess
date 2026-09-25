/** Run the third-pass protocol against real static HTTP ESM and module workers. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';

const lib=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const port=Number(process.argv[2]??8979);
if(!Number.isSafeInteger(port)||port<1||port>65535)throw Error('Specify the loopback server port');
const executable=process.argv[3]??'C:/Program Files/Google/Chrome/Application/chrome.exe';
const native=JSON.parse(fs.readFileSync(path.join(lib,'review-third/receipts/native/reference.json'),'utf8'));
const browser=await chromium.launch({executablePath:executable,headless:true});
try{
  const page=await browser.newPage();
  const errors=[],failed=[];
  page.on('pageerror',error=>errors.push(String(error)));
  page.on('requestfailed',request=>failed.push({url:request.url(),reason:request.failure()?.errorText}));
  await page.goto(`http://127.0.0.1:${port}/tests/third/browser-http.html`,{waitUntil:'load'});
  const protocol=await page.evaluate(async nativePixels=>{
    window.__fixtureURL=new URL('./worker-task.mjs',location.href).href;
    window.__workerURL=new URL('../../host/frame-worker.mjs',location.href).href;
    window.__badWorkerURL=new URL('./worker-bad-identity.mjs',location.href).href;
    window.__bendFixtureURL=new URL('./worker-bend.mjs',location.href).href;
    window.__nativePixels=nativePixels;
    await import('./browser.mjs');
    return window.__qa;
  },native,{timeout:120000});
  if(!protocol?.ok||errors.length||failed.length)throw Error(JSON.stringify({protocol,errors,failed}));
  const report={ok:true,browser:browser.version(),groups:protocol.groups,
    comparedBytes:protocol.comparedBytes,nativeBendPixels:protocol.nativeBendPixels,
    workers:protocol.bendWorkers,errors,failed,transport:'loopback static HTTP module workers'};
  if(process.argv[4])fs.writeFileSync(process.argv[4],JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report));
  await page.close();
}finally{await browser.close();}
