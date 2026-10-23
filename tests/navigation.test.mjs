import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { orientedPoints, floorLegs, arrowPositions, floorConnectors } from '../dist/navigation.mjs';
import { buildNetwork, route, instructions } from '../dist/core.mjs';
const data = JSON.parse(readFileSync(new URL('../dist/directory.json', import.meta.url))),
  g = buildNetwork(data.stores),
  thai = data.stores.find((s) => s.name === 'Absolute Thai');
test('direction arrows follow travel direction in forward and reverse walking journeys', () => {
  const edge = {
    a: 'a',
    b: 'b',
    path: [
      [0, 0],
      [100, 0],
    ],
    from: { id: 'a', x: 0, y: 0 },
    to: { id: 'b', x: 100, y: 0 },
  };
  assert.ok(arrowPositions(orientedPoints(edge), 40).every((a) => a.angle === 0));
  const reverse = { ...edge, from: edge.to, to: edge.from };
  assert.deepEqual(orientedPoints(reverse), [
    [100, 0],
    [0, 0],
  ]);
  assert.ok(arrowPositions(orientedPoints(reverse), 40).every((a) => Math.abs(a.angle) === 180));
  assert.deepEqual(edge.path, [
    [0, 0],
    [100, 0],
  ]);
});
test('lift instructions name the bank and keep the boarding floor distinct from the exit', () => {
  const r = route(g, 'B-park-A', thai.id, { stepFree: true }),
    steps = instructions(r),
    lift = steps.find((s) => s.kind === 'lift');
  assert.ok(lift);
  assert.equal(lift.floor, 'B');
  assert.equal(lift.targetFloor, 'G1');
  assert.equal(lift.node, 'B-west');
  assert.equal(lift.exitNode, 'G1-west');
  assert.match(lift.text, /West lift lobby/);
  assert.match(lift.detail, /select G1/);
  assert.equal(steps.filter((s) => s.kind === 'lift').length, 1);
  const boarded = floorConnectors(r, 'B'),
    exit = floorConnectors(r, 'G1');
  assert.ok(
    boarded.some((c) => c.node.id === 'B-west' && c.role === 'board' && c.toFloor === 'G1'),
  );
  assert.ok(exit.some((c) => c.node.id === 'G1-west' && c.role === 'exit'));
  assert.deepEqual(floorConnectors(r, 'LG'), []);
});
test('return directions use the same bank with downward floors and correctly oriented source paths', () => {
  const r = route(g, thai.id, 'B-park-A', { stepFree: true }),
    lift = instructions(r).find((s) => s.kind === 'lift');
  assert.equal(lift.floor, 'G1');
  assert.equal(lift.targetFloor, 'B');
  assert.match(lift.detail, /select B/);
  for (const seg of r.segments.filter((e) => e.type === 'walk')) {
    const points = orientedPoints(seg);
    assert.deepEqual(points[0], [seg.from.x, seg.from.y]);
    assert.deepEqual(points.at(-1), [seg.to.x, seg.to.y]);
  }
});
test('floor overlays never join paths across lift transfers', () => {
  const r = route(g, 'B-park-C', thai.id, { stepFree: true });
  for (const floor of ['B', 'LG', 'G1', 'G2', 'G3']) {
    const legs = floorLegs(r, floor);
    for (const leg of legs)
      for (const id of leg.edgeIds) {
        const e = r.segments.find((e) => e.id === id);
        assert.equal(e.type, 'walk');
        assert.equal(e.from.floor, floor);
        assert.equal(e.to.floor, floor);
      }
  }
});
test('closing west lift labels the actual east bank chosen by rerouting', () => {
  const copy = structuredClone(g);
  copy.edges
    .filter((e) => e.type === 'lift' && e.a.endsWith('west'))
    .forEach((e) => (e.closed = true));
  const r = route(copy, 'B-park-A', thai.id, { stepFree: true }),
    lift = instructions(r).find((s) => s.kind === 'lift');
  assert.match(lift.text, /East lift lobby/);
  assert.ok(floorConnectors(r, 'B').every((c) => c.node.id.endsWith('east')));
});
