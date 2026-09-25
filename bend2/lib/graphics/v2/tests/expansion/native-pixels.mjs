/** Emit complete JS reference pixels and independently compare schedule variants. */
import fs from 'node:fs';
import Fixture from './NativePixels.bend';
import Draw from '../../DrawList.bend';
import {assert,array,flat,pix,equalPixels} from './support.mjs';
const expected=flat(Fixture.render(0n,false),64);let pixels=0;
for(const forks of [0n,1n,3n])for(const offload of [false,true])pixels+=equalPixels(flat(Fixture.render(forks,offload),64),expected,'fixture schedule');
pixels+=equalPixels(flat(Draw.render(Fixture.commands(),6n,64,0,0,pix(1056816)),64),expected,'untiled painter order');
assert.deepEqual(array(Fixture.main()),[...expected]);
if(process.env.PIXEL_OUTPUT)fs.writeFileSync(process.env.PIXEL_OUTPUT,JSON.stringify([...expected])+'\n');
console.log(JSON.stringify({ok:true,pixels,fixturePixels:expected.length,scope:'actual pinned JS compiler; complete reference output for C/native comparison, independently tested component composition'}));
