import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  buildNetwork,
  route,
  rankParking,
  matchSign,
  validateNetwork,
  instructions,
  knowledge,
} from '../dist/core.mjs';
const data = JSON.parse(readFileSync(new URL('../dist/directory.json', import.meta.url)));
const g = buildNetwork(data.stores);
test('every sourced directory record is reachable from the parking pilot', () => {
  assert.equal(data.stores.length, 179);
  assert.equal(new Set(data.stores.map((s) => s.id)).size, 179);
  assert.ok(validateNetwork(g));
  for (const s of data.stores) {
    const r = route(g, 'B-park-A', s.id);
    assert.ok(r, `${s.name} is disconnected`);
    assert.equal(r.nodes[0].id, 'B-park-A');
    assert.equal(r.nodes.at(-1).id, s.id);
    assert.equal(r.verified, false);
    assert.ok(Number.isFinite(r.seconds));
  }
});
test('step-free routes never use stairs or escalators across all floors', () => {
  for (const s of data.stores) {
    const r = route(g, 'B-park-B', s.id, { stepFree: true });
    assert.ok(r);
    assert.ok(r.segments.every((s) => !['stairs', 'escalator'].includes(s.type)));
  }
});
test('closing one lift reroutes; closing all accessible floor links gives no path', () => {
  const c = structuredClone(g),
    dest = data.stores.find((s) => s.floor === 'G3').id;
  c.edges
    .filter((e) => e.type === 'lift' && e.a.endsWith('west'))
    .forEach((e) => (e.closed = true));
  const r = route(c, 'B-park-A', dest, { stepFree: true });
  assert.ok(r);
  assert.ok(r.segments.filter((e) => e.type === 'lift').every((e) => e.a.endsWith('east')));
  c.edges.filter((e) => e.type === 'lift').forEach((e) => (e.closed = true));
  assert.equal(route(c, 'B-park-A', dest, { stepFree: true }), null);
});
test('parking recommendations are reachable and sorted by measured graph time', () => {
  const dest = data.stores.find((s) => s.floor === 'G2').id,
    ranked = rankParking(g, dest, { stepFree: true });
  assert.equal(ranked.length, 3);
  for (let i = 1; i < ranked.length; i++)
    assert.ok(ranked[i].route.seconds >= ranked[i - 1].route.seconds);
});
test('return journey uses the saved parking destination and has arrival instruction', () => {
  const start = data.stores.find((s) => s.floor === 'G1').id,
    r = route(g, start, 'B-park-C');
  assert.ok(r);
  const steps = instructions(r);
  assert.equal(steps[0].node, start);
  assert.equal(steps.at(-1).node, 'B-park-C');
  assert.equal(steps.at(-1).kind, 'arrive');
});
test('unknown origin and fully isolated destination fail safely', () => {
  assert.equal(route(g, 'not-real', 'B-park-A'), null);
  const c = structuredClone(g),
    dest = data.stores[0].id;
  c.edges.filter((e) => e.a === dest || e.b === dest).forEach((e) => (e.closed = true));
  assert.equal(route(c, 'B-park-A', dest), null);
});
test('OCR text resolves actual directory names and lot numbers without inventing locations', () => {
  const thai = data.stores.find((s) => s.name === 'Absolute Thai');
  assert.ok(thai);
  assert.equal(matchSign('ABSOLUTE THAI', data.stores, g.nodes)[0].id, thai.id);
  assert.ok(matchSign('G1-22', data.stores, g.nodes).some((m) => m.id === thai.id));
  assert.equal(matchSign('B-A', data.stores, g.nodes)[0].id, 'B-park-A');
  assert.deepEqual(matchSign('unknownwonderland12345', data.stores, g.nodes), []);
});
test('retrieval returns source-bearing records, including category requests', () => {
  const hits = knowledge('Where is Absolute Thai?', data.stores);
  assert.equal(hits[0].name, 'Absolute Thai');
  assert.ok(hits.every((s) => s.source.startsWith('https://www.simedarbyproperty.com')));
  assert.ok(knowledge('Find coffee', data.stores).length);
});
test('network import validation rejects unsafe malformed graphs', () => {
  const duplicate = structuredClone(g);
  duplicate.nodes.push({ ...duplicate.nodes[0] });
  assert.throws(() => validateNetwork(duplicate), /unique/);
  const neg = structuredClone(g);
  neg.edges[0].seconds = -10;
  assert.throws(() => validateNetwork(neg), /Invalid edge/);
  const missing = structuredClone(g);
  missing.edges[0].b = 'missing';
  assert.throws(() => validateNetwork(missing), /Invalid edge/);
});
test('same-checkpoint route is valid and one-way edges are respected', () => {
  assert.equal(route(g, 'B-park-A', 'B-park-A').seconds, 0);
  const tiny = {
    nodes: [
      { id: 'a', floor: 'LG', x: 0, y: 0 },
      { id: 'b', floor: 'LG', x: 1, y: 0 },
    ],
    edges: [
      {
        id: 'e',
        a: 'a',
        b: 'b',
        type: 'walk',
        metres: 1,
        seconds: 1,
        oneWay: true,
        verified: false,
      },
    ],
  };
  assert.ok(route(tiny, 'a', 'b'));
  assert.equal(route(tiny, 'b', 'a'), null);
});
