// Serial semantic subset shim, NOT a Bend runtime. See lower.py and REVIEW.md.
let COUNTS=null;
export function counters(enabled=true){COUNTS=enabled?Object.create(null):null;return COUNTS;}
const U32={
 add:(a,b)=>(a+b)>>>0,sub:(a,b)=>(a-b)>>>0,mul:(a,b)=>Math.imul(a,b)>>>0,
 div:(a,b)=>b?Math.floor(a/b)>>>0:0,mod:(a,b)=>b?a%b:a,
 and:(a,b)=>(a&b)>>>0,or:(a,b)=>(a|b)>>>0,xor:(a,b)=>(a^b)>>>0,
 shln:(a,n)=>n>=32n?0:(a<<Number(n))>>>0,shrn:(a,n)=>n>=32n?0:a>>>Number(n),
 shl:a=>(a<<1)>>>0,shr:a=>a>>>1,
 min:Math.min,max:Math.max,is_eq:(a,b)=>a===b,is_ne:(a,b)=>a!==b,
 is_zero:a=>a===0,is_lt:(a,b)=>a<b,is_gt:(a,b)=>a>b,is_le:(a,b)=>a<=b,is_ge:(a,b)=>a>=b,
 to_nat:a=>BigInt(a),from_nat:a=>Number(a&0xffffffffn),to_f32:Math.fround,
};
const F32={
 add:(a,b)=>Math.fround(a+b),sub:(a,b)=>Math.fround(a-b),mul:(a,b)=>Math.fround(a*b),div:(a,b)=>Math.fround(a/b),
 abs:Math.abs,min:Math.min,max:Math.max,
 is_eq:(a,b)=>a===b,is_ne:(a,b)=>a!==b,is_lt:(a,b)=>a<b,is_gt:(a,b)=>a>b,is_le:(a,b)=>a<=b,is_ge:(a,b)=>a>=b,
 to_u32:a=>Number.isNaN(a)||a<=0?0:a>=4294967295?4294967295:Math.trunc(a),
};
const Nat={add:(a,b)=>a+b,sub:(a,b)=>a>b?a-b:0n,mul:(a,b)=>a*b,div:(a,b)=>b?a/b:0n,mod:(a,b)=>b?a%b:a,
 is_eq:(a,b)=>a===b,is_ne:(a,b)=>a!==b,is_lt:(a,b)=>a<b,is_gt:(a,b)=>a>b,is_le:(a,b)=>a<=b,is_ge:(a,b)=>a>=b};
const Bool={and:(a,b)=>a&&b,or:(a,b)=>a||b,not:a=>!a,pick:(c,a,b)=>c?a:b};
const List={reverse:xs=>{let out={$:'Nil'};while(xs.$==='Con'){out={$:'Con',head:xs.head,tail:out};xs=xs.tail;}return out;},
 length:xs=>{let n=0n;while(xs.$==='Con'){n++;xs=xs.tail;}return n;}};
