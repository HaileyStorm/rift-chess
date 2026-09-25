/** Independent test-only image and integer reference helpers. */
import assert from 'node:assert/strict';
export {assert};
/** Create a packed RGB Pix constructor. */
export function pix(color){return {$:'Pix',color:color>>>0};}
/** Build a quadtree from an independent scalar function over a size×size image. */
export function image(size,fn,x=0,y=0){if(size===1)return pix(fn(x,y));const h=size/2,a=image(h,fn,x,y),b=image(h,fn,x+h,y),c=image(h,fn,x,y+h),d=image(h,fn,x+h,y+h);if([a,b,c,d].every(n=>n.$==='Pix'&&n.color===a.color))return a;return {$:'Qua',tl:a,tr:b,bl:c,br:d};}
/** Flatten the exact size×size pixel meaning; reject malformed depth-zero quads. */
export function flat(node,size){const a=new Uint32Array(size*size);function visit(n,x,y,s){if(n.$==='Pix'){for(let j=y;j<y+s;j++)a.fill(n.color,j*size+x,j*size+x+s);return;}assert.ok(s>1,'malformed image');const h=s/2;visit(n.tl,x,y,h);visit(n.tr,x+h,y,h);visit(n.bl,x,y+h,h);visit(n.br,x+h,y+h,h);}visit(node,0,0,size);return a;}
/** Convert a host array to an immutable Bend Data list in the same order. */
export function list(items){let r={$:'Nil'};for(let i=items.length-1;i>=0;i--)r={$:'Con',head:items[i],tail:r};return r;}
/** Read a Bend list while checking the constructor shape. */
export function array(xs){const out=[];while(xs.$==='Con'){out.push(xs.head);xs=xs.tail;}assert.equal(xs.$,'Nil');return out;}
/** Canonical signed coordinate, with explicit bounded-domain tests left to callers. */
export function coord(n){return n<0?{$:'Neg',magnitude:-n}:{$:'Pos',value:n};}
/** Half-open screen-space rectangle. */
export function box(l,t,r,b){return {$:'Box',left:l,top:t,right:r,bottom:b};}
/** Integer encoded-channel source-over; this oracle calls no Bend implementation. */
export function over(s,d,a){a=Math.min(a,255);if(!a)return d;if(a===255)return s;let c=0;for(const q of [0,8,16])c|=Math.floor((((s>>>q)&255)*a+((d>>>q)&255)*(255-a)+127)/255)<<q;return c>>>0;}
/** Deterministic U32 xorshift generator; returns an integer in [0,n). */
export function rng(seed=0x82f019ab){let v=seed>>>0;return n=>{v^=v<<13;v^=v>>>17;v^=v<<5;return (v>>>0)%n;};}
/** Apply one independently specified clipped fill or sprite to a row-major raster. */
export function reference(target,size,command){const {clip}=command;for(let y=Math.max(0,clip.top);y<Math.min(size,clip.bottom);y++)for(let x=Math.max(0,clip.left);x<Math.min(size,clip.right);x++){let color=command.color,a=Math.min(command.opacity,255);if(command.kind==='sprite'){const sx=x-command.x,sy=y-command.y;if(sx<0||sy<0||sx>=command.side||sy>=command.side)continue;const i=sy*command.side+sx;color=command.colors[i];a=Math.floor(((command.mask[i]>>>16)&255)*a/255+127/255);}target[y*size+x]=over(color,target[y*size+x],a);}return target;}
/** Full-frame equality with a useful first failing pixel rather than a giant dump. */
export function equalPixels(got,want,label){assert.equal(got.length,want.length);for(let i=0;i<got.length;i++)if(got[i]!==want[i])assert.fail(`${label} pixel ${i}: ${got[i].toString(16)} != ${want[i].toString(16)}`);return got.length;}
