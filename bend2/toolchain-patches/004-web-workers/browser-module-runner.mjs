import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import {chromium, firefox, webkit} from 'playwright';

const [artifactsArg, packetRootArg, browserName='chromium', executablePath=''] = process.argv.slice(2);
const artifacts = path.resolve(artifactsArg), packetRoot = path.resolve(packetRootArg);
const browserType = {chromium,firefox,webkit}[browserName];
if (!browserType) throw new Error('Unknown browser');
const source = fs.readFileSync(path.join(packetRoot,'tests/workers/browser_runner.py'),'utf8');
const checks = /^CHECKS = r'''([\s\S]*?)'''/m.exec(source)?.[1];
if (!checks) throw new Error('Missing exact packet CHECKS function');
const sources = {};
for (const name of ['integer','image','continuations','automatic','policies','floats']) {
  const dir=path.join(artifacts,name);
  const manifest=JSON.parse(fs.readFileSync(path.join(dir,'manifest.json'),'utf8'));
  const files={};
  for (const [key,file] of Object.entries(manifest.artifacts)) if (key!=='manifest')
    files[key]=fs.readFileSync(path.join(dir,file),'utf8');
  sources[name]={...files,serial:fs.readFileSync(path.join(dir,'serial.mjs'),'utf8'),artifacts:manifest.artifacts};
}
const rootURL='/nested/build/';
let responseMode='normal';
const negativeServed=[];
const policyWorker=`policies/${sources.policies.artifacts.worker}`;
const server=http.createServer((request,response)=>{
  let uri;
  try {uri=decodeURIComponent(new URL(request.url,'http://127.0.0.1').pathname)}
  catch {response.writeHead(400).end();return}
  if (!uri.startsWith(rootURL)) {response.writeHead(404).end();return}
  const relative=uri.slice(rootURL.length)||'index.html';
  if (responseMode!=='normal') negativeServed.push({mode:responseMode,relative});
  if (relative===policyWorker && responseMode==='missing-worker') {response.writeHead(404).end();return}
  const target=path.resolve(artifacts,relative);
  if (!(target===artifacts||target.startsWith(artifacts+path.sep))) {response.writeHead(403).end();return}
  try {
    const stat=fs.statSync(target);
    if (!stat.isFile()) {response.writeHead(404).end();return}
    const ext=path.extname(target);
    const type=relative===policyWorker && responseMode==='wrong-mime'?'text/plain':
      ext==='.html'?'text/html; charset=utf-8':ext==='.mjs'?'text/javascript; charset=utf-8':
      ext==='.json'?'application/json; charset=utf-8':'application/octet-stream';
    if (relative===policyWorker && responseMode==='corrupt-worker') {
      response.writeHead(200,{'Content-Type':'text/javascript; charset=utf-8','Cache-Control':'no-store'}).end('this is not JavaScript;');
      return;
    }
    response.writeHead(200,{'Content-Type':type,'Content-Length':stat.size,'Cache-Control':'no-store',
      ...(relative==='index.html' && responseMode==='csp-deny-workers'
        ? {'Content-Security-Policy':"default-src 'self'; script-src 'self'; worker-src 'none'; connect-src 'self'"}:{})});
    fs.createReadStream(target).pipe(response);
  } catch {response.writeHead(404).end()}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
let browser;
const receipt={route:'production static ESM module workers',browser:browserName,productionAcceptance:false,
  artifacts,packetChecksSha256:undefined,requests:[],pageErrors:[]};
try {
  browser=await browserType.launch({headless:true,...(executablePath?{executablePath}:{})});
  receipt.version=browser.version();
  const page=await browser.newPage();
  page.on('pageerror',error=>receipt.pageErrors.push(String(error)));
  page.on('requestfailed',request=>receipt.requests.push({url:request.url(),failure:request.failure()}));
  await page.goto(`http://127.0.0.1:${server.address().port}${rootURL}index.html`,{waitUntil:'domcontentloaded'});
  // Node Playwright treats a string arrow as an expression (a function value),
  // whereas the packet's Python binding invokes it. This is test-only code.
  const result=await page.evaluate(new Function('return ('+checks+')')(),{sources,classic:false,
    callerSource:fs.readFileSync(path.join(artifacts,'browser_caller.mjs'),'utf8')});
  Object.assign(receipt,result);
  receipt.productionAcceptance=receipt.passed===true && receipt.pageErrors.length===0 && receipt.requests.length===0;
  await page.close();
  receipt.negative=[];
  async function strictFailure(name,mode,workerOverride='') {
    responseMode=mode;
    const servedBefore=negativeServed.length;
    const context=await browser.newContext();
    const tab=await context.newPage();
    try {
      await tab.goto(`http://127.0.0.1:${server.address().port}${rootURL}index.html`,{waitUntil:'domcontentloaded'});
      const result=await tab.evaluate(async ({workerOverride,integerWorker})=>{
        const api=await import(new URL('./policies/index.mjs',location.href).href);
        const options={workers:2,mode:'required-only',policy:'strict',startupTimeoutMs:3000,taskTimeoutMs:3000};
        if(workerOverride==='wrong-build')
          options.workerURL=new URL('./integer/'+integerWorker,location.href);
        const session=api.createSession(options);
        try {const value=await session.call('require_tree',[3n,1000n,42]);return {settled:'success',value}}
        catch(error){return {settled:'rejected',code:error?.code||null,message:String(error).slice(0,250)}}
        finally{session.close()}
      },{workerOverride,integerWorker:sources.integer.artifacts.worker});
      const served=negativeServed.slice(servedBefore).filter(x=>x.relative===policyWorker);
      receipt.negative.push({name,mode,...result,served:served.length,
        ...mode==='wrong-mime' && result.settled==='success' && browserName==='webkit'
          ? {mimeTolerance:'WebKit executed exact-content module worker served as text/plain'} : {},
        passed:result.settled==='rejected' && (mode==='normal'||mode==='csp-deny-workers'||served.length>0)
          || mode==='wrong-mime' && browserName==='webkit' && result.settled==='success' && served.length>0});
    } catch(error) {receipt.negative.push({name,mode,passed:false,harnessError:String(error)})}
    finally {await context.close();responseMode='normal'}
  }
  await strictFailure('CSP worker-src none rejects required region','csp-deny-workers');
  await strictFailure('missing worker module rejects required region','missing-worker');
  await strictFailure('wrong MIME worker module rejects required region','wrong-mime');
  await strictFailure('corrupt worker module rejects required region','corrupt-worker');
  await strictFailure('mixed-build worker handshake rejects required region','normal','wrong-build');
  const lifecycle=await browser.newPage();
  try {
    await lifecycle.goto(`http://127.0.0.1:${server.address().port}${rootURL}index.html`);
    const cases=await lifecycle.evaluate(async()=>{
      const api=await import(new URL('./policies/index.mjs',location.href).href);
      const closed=api.createSession({workers:2,mode:'required-only',policy:'strict'});
      const pending=closed.submit('require_tree',[3n,200000n,42]);
      closed.close();
      let closeRejected=false;try{await pending.promise}catch{closeRejected=true}
      const reusable=api.createSession({workers:2,mode:'required-only',policy:'strict'});
      const abort=new AbortController(),cancelled=reusable.submit('require_tree',[3n,200000n,42],{signal:abort.signal});
      abort.abort();let cancelRejected=false;try{await cancelled.promise}catch{cancelRejected=true}
      const value=await reusable.call('require_tree',[1n,50n,7]);
      const recovered=reusable.stats().requiredWitnesses>=1;
      reusable.close();
      return {closeRejected,cancelRejected,recovered,value,closedWorkers:closed.stats().workers,
        reusableWorkers:reusable.stats().workers};
    });
    receipt.negative.push({name:'close/cancel settle and session remains usable',...cases,
      passed:cases.closeRejected && cases.cancelRejected && cases.recovered &&
        cases.closedWorkers===0 && cases.reusableWorkers===0});
  } catch(error) {receipt.negative.push({name:'close/cancel',passed:false,harnessError:String(error)})}
  finally{await lifecycle.close()}
  receipt.productionAcceptance=receipt.productionAcceptance && receipt.negative.every(test=>test.passed);
} catch (error) {receipt.error=String(error);receipt.productionAcceptance=false}
finally {await browser?.close();await new Promise(resolve=>server.close(resolve))}
const output=path.resolve(artifacts,`../worker-browser-${browserName}-${receipt.version?.replace(/[^0-9.]/g,'')||'error'}-receipt.json`);
fs.writeFileSync(output,JSON.stringify(receipt,null,2)+'\n');
console.log(JSON.stringify({browser:receipt.browser,version:receipt.version,productionAcceptance:receipt.productionAcceptance,
  checks:receipt.tests?.length,passed:receipt.tests?.filter(x=>x.ok).length,
  failed:receipt.tests?.filter(x=>!x.ok).map(x=>({name:x.name,error:x.error})),
  negative:receipt.negative?.map(({name,passed,code})=>({name,passed,code})),
  pageErrors:receipt.pageErrors,requestFailures:receipt.requests,error:receipt.error,receipt:output}));
if (!receipt.productionAcceptance) process.exitCode=2;
