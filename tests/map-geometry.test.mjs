import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildNetwork, route, validateNetwork } from '../dist/core.mjs';
const load = (f) => JSON.parse(readFileSync(new URL('../dist/' + f, import.meta.url)));
const data = load('directory.json'),
  geo = load('geometry.json'),
  g = buildNetwork(data.stores),
  byId = new Map(g.nodes.map((n) => [n.id, n]));
const inside = ([x, y], pts) => {
  let yes = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const a = pts[i],
      b = pts[j];
    if (a[1] > y !== b[1] > y && x < ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]) + a[0])
      yes = !yes;
  }
  return yes;
};
test('each current directory entry has its own source polygon on its primary floor', () => {
  assert.equal(g.layout, 'official-plan-derived');
  assert.equal(
    new Set(g.nodes.filter((n) => n.type === 'store').map((n) => n.directoryId || n.id)).size,
    179,
  );
  for (const s of data.stores) {
    const p = geo.floors[s.floor].find((p) => p.id === s.id);
    assert.ok(p, s.name);
    assert.ok(byId.has(s.id));
    assert.equal(byId.get(s.id).floor, s.floor);
    assert.ok(p.points.every(([x, y]) => x >= 0 && x <= 1000 && y >= 75 && y <= 575));
  }
  assert.ok(byId.has('s65-G3'));
  assert.equal(byId.get('s65-G3').floor, 'G3');
  const famsy = geo.floors.LG.find((p) => p.id === 's200');
  assert.equal(famsy.sourceId, '97');
  assert.ok(!geo.floors.G1.some((p) => p.id === 's200'));
});
test('walking polylines join their actual endpoints and stay outside source shop interiors', () => {
  for (const e of g.edges.filter((e) => e.type === 'walk')) {
    const a = byId.get(e.a),
      b = byId.get(e.b);
    assert.equal(a.floor, b.floor);
    assert.deepEqual(e.path[0], [a.x, a.y]);
    assert.deepEqual(e.path.at(-1), [b.x, b.y]);
    const polys = geo.floors[a.floor];
    for (let i = 1; i < e.path.length; i++) {
      const p = e.path[i - 1],
        q = e.path[i],
        count = Math.ceil(Math.hypot(q[0] - p[0], q[1] - p[1]) / 2);
      for (let j = 0; j <= count; j++) {
        const pt = [
          p[0] + ((q[0] - p[0]) * j) / Math.max(1, count),
          p[1] + ((q[1] - p[1]) * j) / Math.max(1, count),
        ];
        assert.ok(
          !polys.some((poly) => inside(pt, poly.points)),
          `${e.id} crosses a source shop at ${pt}`,
        );
      }
    }
  }
});
test('forward and return paths retain source geometry across all retail floors', () => {
  for (const floor of ['LG', 'G1', 'G2', 'G3']) {
    const s = data.stores.find((s) => s.floor === floor),
      r = route(g, 'B-park-A', s.id, { stepFree: true }),
      back = route(g, s.id, 'B-park-A', { stepFree: true });
    assert.ok(r && back);
    assert.ok(r.segments.filter((e) => e.type === 'walk').every((e) => e.path.length >= 1));
    assert.equal(r.metres, back.metres);
  }
});
test('import rejects out-of-bounds and non-numeric overlay paths', () => {
  for (const bad of [[[2000, 100]], [[10, null]], 'M 0 0']) {
    const copy = structuredClone(g);
    copy.edges[0].path = bad;
    assert.throws(() => validateNetwork(copy), /path geometry/);
  }
});
