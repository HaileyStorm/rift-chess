/** Full exact JS surface-pipeline output for independently built C executables. */
import fs from 'node:fs';
import Fixture from './NativePixels.bend';
import {flat,equalPixels} from '../expansion/support.mjs';
const expected=flat(Fixture.render(0n,false),32);let pixels=0;
for(const forks of [0n,1n,2n])for(const offload of [false,true])pixels+=equalPixels(flat(Fixture.render(forks,offload),32),expected,'surface schedule');
if(process.env.PIXEL_OUTPUT)fs.writeFileSync(process.env.PIXEL_OUTPUT,JSON.stringify([...expected])+'\n');
console.log(JSON.stringify({ok:true,pixels,fixturePixels:1024,scope:'Actual emitted JS; composed new component fixture with native full-pixel reference.'}));
