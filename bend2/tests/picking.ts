import App from '../App.bend';
const start = performance.now();
let checks = 0;
for (let y = 0; y < 512; y++) for (let x = 0; x < 512; x++) {
  const u = x + 2*y - 528, v = 2*y - x - 16;
  const expected = u >= 0 && v >= 0 && u < 384 && v < 384
    ? (7 - Math.floor(v/48))*8 + Math.floor(u/48) : 64;
  const actual = App.square_at(x,y);
  if (actual !== expected) throw new Error(`Floor mismatch (${x},${y}): ${actual} != ${expected}`);
  checks++;
}
for (let square=0;square<64;square++) {
  if (App.square_at(App.center_x(square),App.center_y(square)) !== square) throw new Error(`Center mismatch ${square}`);
  checks++;
}
console.log(JSON.stringify({ ok:true, checks, classification:'finite exhaustive 512x512 floor projection plus all64 centers; not arbitrary-scene picking theorem', elapsedMs:performance.now()-start }));
