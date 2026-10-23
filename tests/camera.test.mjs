import test from 'node:test';
import assert from 'node:assert/strict';
import { PLAN_FRAME, fitMapCamera, mapViewBox, zoomMapCamera } from '../dist/camera.mjs';
test('Fit includes the complete official source image, including all four corners', () => {
  const c = fitMapCamera(),
    [x, y, w, h] = mapViewBox(c).split(' ').map(Number);
  assert.equal(mapViewBox(c), '0 75 1000 500');
  for (const px of [PLAN_FRAME.x, PLAN_FRAME.x + PLAN_FRAME.width])
    for (const py of [PLAN_FRAME.y, PLAN_FRAME.y + PLAN_FRAME.height])
      assert.ok(px >= x && px <= x + w && py >= y && py <= y + h);
});
test('zoom preserves the centre and fit recovers after zooming and panning', () => {
  const c = fitMapCamera(),
    z = zoomMapCamera(c, 2);
  assert.equal(z.panX + PLAN_FRAME.width / z.zoom / 2, 500);
  assert.equal(z.panY + PLAN_FRAME.height / z.zoom / 2, 325);
  const moved = { ...z, panX: -123, panY: 450 };
  Object.assign(moved, fitMapCamera());
  assert.deepEqual(moved, c);
  assert.equal(zoomMapCamera(c, 100).zoom, 5);
  assert.equal(zoomMapCamera(c, 0.01).zoom, 0.8);
});
