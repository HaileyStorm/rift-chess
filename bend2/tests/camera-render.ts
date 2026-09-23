import assert from 'node:assert/strict';
import Scene from '../graphics/Scene.bend';
import Camera from '../graphics/Camera.bend';
import Model from '../core/Model.bend';

function sample(image: any, x: number, y: number): number {
  for (let half = 256; image.$ === 'Qua'; half /= 2) {
    const right = x >= half, bottom = y >= half;
    image = image[bottom ? (right ? 'br' : 'bl') : (right ? 'tr' : 'tl')];
    if (right) x -= half;
    if (bottom) y -= half;
  }
  return image.color;
}
const nil = { $: 'Nil' };
const background = Scene.background();
let checks = 0;
const timings: number[] = [];
for (const layout of [false, true]) {
  const position = Model.start(layout);
  for (const yaw of [0, 45, 90, 135, 180, 225, 270, 315]) {
    for (const pitch of [35, 65, 90]) {
      const view = { $: 'View', yaw, pitch, zoom: yaw % 90 ? 75 : 115 };
      const basis = Camera.basis(view);
      const start = performance.now();
      const ground = Scene.ground_base(background, position, 0, view);
      timings.push(performance.now() - start);
      for (let square = 0; square < 64; square++) {
        const x = Camera.center_x(square, basis), y = Camera.center_y(square, basis);
        const macro = Math.floor((square % 8) / 2) + 4 * Math.floor(square / 16);
        const missing = Boolean(position.holes & (1 << macro));
        // At shallow tilt a real neighboring wall may cover a cell's edge.
        // Check the broader eroded platform interior below for those views.
        if (missing && pitch === 35) continue;
        if (missing) {
          assert.equal(sample(ground, x, y), sample(background, x, y), `Hole is open: ${layout}/${yaw}/${pitch}/${square}`);
          const frame = { $: 'Frame', position, previous: position, selected: 64, hovered: square,
            targets: nil, tile: 16, tileTargets: { $: 'Con', head: macro, tail: nil },
            lastAction: 21760, progress: 16, theme: 0, view, shifts: nil, check: 64 };
          const highlighted = Scene.feedback_on(ground, frame);
          assert.equal(sample(highlighted, x, y), sample(background, x, y), 'Hover/Shift outline must not fill a hole');
          checks++;
        } else {
          assert.notEqual(sample(ground, x, y), sample(background, x, y), `Real tile has a surface: ${square}`);
        }
        checks++;
      }
      for (let macro = 0; macro < 16; macro++) {
        if (!(position.holes & (1 << macro))) continue;
        const corner = (macro % 4) * 2 + Math.floor(macro / 4) * 16;
        const cx = Math.round((Camera.center_x(corner, basis) + Camera.center_x(corner + 9, basis)) / 2);
        const cy = Math.round((Camera.center_y(corner, basis) + Camera.center_y(corner + 9, basis)) / 2);
        for (const dx of [-6, -3, 0, 3, 6]) for (const dy of [-3, 0, 3]) {
          assert.equal(sample(ground, cx + dx, cy + dy), sample(background, cx + dx, cy + dy),
            `Open interior mask: ${layout}/${yaw}/${pitch}/${macro}/${dx}/${dy}`);
          checks++;
        }
      }
    }
  }
}
timings.sort((a, b) => a - b);
console.log(JSON.stringify({ passed: true, checks, renderedGrounds: timings.length,
  medianGroundMs: timings[Math.floor(timings.length / 2)], p95GroundMs: timings[Math.floor(timings.length * .95)],
  scope: 'Finite JS renderer cases: missing platforms and hover/Shift outlines preserve background; not a formal camera proof' }));
