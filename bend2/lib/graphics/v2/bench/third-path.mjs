/** A/B actual emitted Bend path hierarchy, preserving the exact input edge order. */
import fs from 'node:fs';
import crypto from 'node:crypto';
import Path from '../third/PathFill.bend';
import Sweep from './third/PathTraversal.bend';
import {assert,list} from '../tests/expansion/support.mjs';
/** Median with raw sample retention; no wall-clock pass threshold. */
function median(values){const v=[...values].sort((a,b)=>a-b);return v[Math.floor(v.length/2)];}
/** Read hierarchy size/depth independently from the Bend path evaluator. */
function structure(e){if(e.$==='Empty')return {edges:0,depth:0};if(e.$==='Edge')return {edges:1,depth:1};const a=structure(e.left),b=structure(e.right);return {edges:a.edges+b.edges,depth:1+Math.max(a.depth,b.depth)};}
const results=[];for(const count of [64,256,1024]){
 const points=Array.from({length:count},(_,i)=>{const t=i/count*Math.PI*2;return {$:'Point',x:Math.fround(128+117*Math.cos(t)),y:Math.fround(128+80*Math.sin(t))};}),legacy=Path.contour(list(points.slice(1)),points[0],points[0],{$:'Empty'}),balanced=Path.polygon(list(points)).value,row={edges:count,linear:structure(legacy),balanced:structure(balanced),size:256,samples:{linear:[],balanced:[]}};
 const inputs={linear:legacy,balanced},expected=Sweep.sweep(legacy,256);assert.equal(Sweep.sweep(balanced,256),expected);row.inside=expected;row.exactPointChecks=0;assert.ok(row.balanced.depth<=Math.ceil(Math.log2(count))+1);
 for(let y=0;y<256;y++)for(let x=0;x<256;x++){assert.equal(Path.hit(legacy,{$:'NonZero'},Math.fround(x+.5),Math.fround(y+.5)),Path.hit(balanced,{$:'NonZero'},Math.fround(x+.5),Math.fround(y+.5)));row.exactPointChecks++;}
 for(let trial=0;trial<5;trial++)for(const key of trial%2?['balanced','linear']:['linear','balanced']){const start=performance.now(),got=Sweep.sweep(inputs[key],256);row.samples[key].push(performance.now()-start);assert.equal(got,expected);}
 row.medianMs=Object.fromEntries(Object.entries(row.samples).map(([k,v])=>[k,median(v)]));results.push(row);
}
const report={ok:true,backend:'Actual pinned compiler emitted JS under Node',method:'Five rotated samples after one untimed complete sweep per variant. Identical original edge coordinates and F32 crossing kernel. Every grid point is also compared individually outside timing. Public polygon now uses a binary-carry hierarchy; old contour accumulator retained for comparison.',results,sources:Object.fromEntries(['./third-path.mjs','./third/PathTraversal.bend','../third/PathFill.bend'].map(relative=>[relative,crypto.createHash('sha256').update(fs.readFileSync(new URL(relative,import.meta.url))).digest('hex')])),scope:'Finite convex contours on 256² grid, not a speed guarantee for arbitrary self-intersecting paths; independent randomized point/coverage suite separately unchanged.'};if(process.env.PERF_OUTPUT)fs.writeFileSync(process.env.PERF_OUTPUT,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
