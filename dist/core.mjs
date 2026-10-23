import PLAN_NETWORK from './plan-network.mjs';
export const FLOORS = ['B', 'LG', 'G1', 'G2', 'G3'];
export const RETAIL = ['LG', 'G1', 'G2', 'G3'];
export const CATEGORIES = {
  'food-beverage': 'Food & drink',
  fashion: 'Fashion',
  'accessories-bags-shoes': 'Bags & shoes',
  'home-living': 'Home & living',
  'it-gadget': 'Tech',
  'jewelry-optical-timepieces': 'Jewellery & eyewear',
  'kids-toys': 'Kids & books',
  'leisure-entertainment': 'Experiences',
  'saloon-beauty-wellness': 'Beauty & wellness',
  services: 'Services',
  supermarket: 'Groceries',
};
export const normal = (s) =>
  String(s || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
export function buildNetwork(stores) {
  const g = structuredClone(PLAN_NETWORK),
    active = new Map(stores.filter((s) => s.active !== false).map((s) => [s.id, s]));
  g.nodes = g.nodes
    .filter(
      (n) =>
        n.type !== 'store' ||
        (active.has(n.directoryId || n.id) &&
          active.get(n.directoryId || n.id).floor === (n.directoryFloor || n.floor)),
    )
    .map((n) =>
      n.type === 'store'
        ? {
            ...n,
            name: active.get(n.directoryId || n.id).name,
            lot: active.get(n.directoryId || n.id).lot,
            category: active.get(n.directoryId || n.id).category,
          }
        : n,
    );
  const ids = new Set(g.nodes.map((n) => n.id));
  g.edges = g.edges.filter((e) => ids.has(e.a) && ids.has(e.b));
  return g;
}
export function validateNetwork(g) {
  if (!g || !Array.isArray(g.nodes) || !Array.isArray(g.edges) || !g.nodes.length)
    throw Error('A network needs nodes and edges.');
  if (g.nodes.length > 5000 || g.edges.length > 15000) throw Error('Network is too large.');
  const ids = new Set();
  for (const n of g.nodes) {
    if (typeof n.id !== 'string' || !/^[A-Za-z0-9_-]{1,100}$/.test(n.id) || ids.has(n.id))
      throw Error('Node IDs must be unique.');
    ids.add(n.id);
    if (
      !FLOORS.includes(n.floor) ||
      !Number.isFinite(n.x) ||
      !Number.isFinite(n.y) ||
      n.x < 0 ||
      n.x > 1000 ||
      n.y < 0 ||
      n.y > 650
    )
      throw Error('Invalid floor or node coordinates.');
  }
  for (const e of g.edges) {
    if (
      e.path &&
      (!Array.isArray(e.path) ||
        e.path.length > 3000 ||
        e.path.some(
          (p) =>
            !Array.isArray(p) ||
            p.length !== 2 ||
            !Number.isFinite(p[0]) ||
            !Number.isFinite(p[1]) ||
            p[0] < 0 ||
            p[0] > 1000 ||
            p[1] < 0 ||
            p[1] > 650,
        ))
    )
      throw Error('Invalid route path geometry.');
    if (
      !ids.has(e.a) ||
      !ids.has(e.b) ||
      !['walk', 'lift', 'escalator', 'stairs'].includes(e.type) ||
      !Number.isFinite(e.metres) ||
      e.metres < 0 ||
      !Number.isFinite(e.seconds) ||
      e.seconds < 0
    )
      throw Error('Invalid edge endpoints, type, or cost.');
  }
  return true;
}
export function route(g, start, end, prefs = {}) {
  const byId = new Map(g.nodes.map((n) => [n.id, n]));
  if (!byId.has(start) || !byId.has(end)) return null;
  const adj = new Map(g.nodes.map((n) => [n.id, []]));
  for (const e of g.edges) {
    if (e.closed || (prefs.stepFree && ['escalator', 'stairs'].includes(e.type))) continue;
    let cost = prefs.strategy === 'distance' ? e.metres + (e.type === 'walk' ? 0 : 40) : e.seconds;
    if (prefs.preferLift && e.type === 'escalator') cost += 90;
    adj.get(e.a)?.push({ to: e.b, e, cost });
    if (!e.oneWay) adj.get(e.b)?.push({ to: e.a, e, cost });
  }
  const dist = new Map([[start, 0]]),
    prev = new Map(),
    todo = new Set([start]),
    done = new Set();
  while (todo.size) {
    let u = [...todo].reduce((a, b) =>
      (dist.get(a) ?? Infinity) <= (dist.get(b) ?? Infinity) ? a : b,
    );
    todo.delete(u);
    if (u === end) break;
    done.add(u);
    for (const t of adj.get(u) || []) {
      if (done.has(t.to)) continue;
      let d = dist.get(u) + t.cost;
      if (d < (dist.get(t.to) ?? Infinity)) {
        dist.set(t.to, d);
        prev.set(t.to, { from: u, edge: t.e });
        todo.add(t.to);
      }
    }
  }
  if (!dist.has(end)) return null;
  const path = [end],
    segments = [];
  let u = end;
  while (u !== start) {
    const p = prev.get(u);
    if (!p) return null;
    segments.unshift({ from: byId.get(p.from), to: byId.get(u), ...p.edge });
    u = p.from;
    path.unshift(u);
  }
  const nodes = path.map((id) => byId.get(id));
  return {
    start,
    end,
    nodes,
    segments,
    metres: segments.reduce((a, e) => a + e.metres, 0),
    seconds: segments.reduce((a, e) => a + e.seconds, 0),
    floors: [...new Set(nodes.map((n) => n.floor))],
    transfers: segments.filter((e) => e.type !== 'walk').length,
    verified: segments.every((e) => e.verified) && nodes.every((n) => n.verified),
  };
}
export function instructions(r) {
  if (!r) return [];
  const first = r.nodes[0],
    out = [
      {
        kind: 'start',
        node: first.id,
        floor: first.floor,
        text: `Start at ${first.name}.`,
        detail:
          'Find the blue START pin. Confirm this starting checkpoint; indoor GPS is not tracking you.',
      },
    ];
  let pending = [],
    last = null;
  const flush = () => {
    if (pending.length && last) {
      const metres = pending.reduce((n, e) => n + e.metres, 0);
      if (metres > 0.1)
        out.push({
          kind: 'walk',
          node: last.id,
          floor: last.floor,
          edgeIds: pending.map((e) => e.id),
          targetType: last.type,
          text: `Follow the blue arrows to ${last.name}.`,
          detail: `About ${Math.max(1, Math.round(metres))} m · indicative estimate. ${last.type === 'lift' ? 'Look for the amber USE THIS LIFT marker.' : last.type === 'escalator' ? 'Look for the amber escalator marker.' : 'The red pin marks the destination approach; confirm its entrance on site.'}`,
        });
      pending = [];
    }
  };
  for (let i = 0; i < r.segments.length; i++) {
    const segment = r.segments[i];
    if (segment.type === 'walk') {
      pending.push(segment);
      last = segment.to;
      continue;
    }
    flush();
    let end = segment.to;
    if (segment.type === 'lift')
      while (
        i + 1 < r.segments.length &&
        r.segments[i + 1].type === 'lift' &&
        r.segments[i + 1].from.id === end.id
      )
        end = r.segments[++i].to;
    const landmark = segment.from.name.replace(/\s*·\s*(B|LG|G\d+)$/, '');
    out.push({
      kind: segment.type,
      node: segment.from.id,
      exitNode: end.id,
      floor: segment.from.floor,
      targetFloor: end.floor,
      bank: landmark,
      text: `Use ${landmark}: ${segment.from.floor} → ${end.floor}.`,
      detail:
        segment.type === 'lift'
          ? `Enter on ${segment.from.floor}, select ${end.floor}, then exit at ${end.name}. Check the actual lift signs: this bank connection is plan-derived.`
          : `Board the marked ${segment.type} on ${segment.from.floor} and exit on ${end.floor}. Confirm its direction and access on site.`,
    });
    last = end;
  }
  flush();
  const end = r.nodes.at(-1);
  out.push({
    kind: 'arrive',
    node: r.end,
    floor: end.floor,
    text: `Destination: ${end.name}.`,
    detail: `Red destination pin · ${end.lot || 'Parking lobby approach'} · ${end.floor}. Confirm the actual entrance/checkpoint.`,
  });
  return out;
}
export function rankParking(g, dest, prefs) {
  return g.nodes
    .filter((n) => n.type === 'parking')
    .map((n) => ({ node: n, route: route(g, n.id, dest, prefs) }))
    .filter((x) => x.route)
    .sort((a, b) => a.route.seconds - b.route.seconds);
}
export function matchSign(text, stores, nodes) {
  const q = normal(text);
  if (q.length < 2) return [];
  const out = [];
  for (const s of stores.filter((s) => s.active !== false)) {
    const name = normal(s.name),
      lot = normal(s.lot),
      firstLot = normal(s.lot.split(/[,/&]/)[0]);
    let score = 0;
    if (name.length > 2 && q.includes(name)) score = 100 + name.length;
    if (firstLot.length >= 4 && q.includes(firstLot)) score = Math.max(score, 95 + firstLot.length);
    if (name.includes(q) && q.length >= 3) score = Math.max(score, 50 + q.length);
    if (score) out.push({ id: s.id, name: s.name, floor: s.floor, lot: s.lot, score });
  }
  const m = text.toUpperCase().match(/\b(B)\s*[-·:]?\s*(?:ZONE\s*)?([ABC])\b/);
  if (m) {
    let n = nodes.find((n) => n.id === `${m[1]}-park-${m[2]}`);
    if (n) out.push({ ...n, score: 200 });
  }
  return out.sort((a, b) => b.score - a.score).slice(0, 8);
}
export function knowledge(query, stores) {
  const q = query.toLowerCase(),
    terms = q
      .split(/\W+/)
      .filter(
        (x) =>
          x.length > 2 &&
          ![
            'where',
            'what',
            'find',
            'near',
            'the',
            'and',
            'does',
            'have',
            'want',
            'please',
            'mall',
            'kedai',
            'mana',
            'nak',
          ].includes(x),
      );
  const category = /coffee|cafe|kopi|food|eat|makan|restaurant|drink/.test(q)
    ? 'food-beverage'
    : /clothes|fashion|baju/.test(q)
      ? 'fashion'
      : /kids|toy|book|buku/.test(q)
        ? 'kids-toys'
        : /cinema|movie|climb|skating|ice|entertainment/.test(q)
          ? 'leisure-entertainment'
          : null;
  return stores
    .filter((s) => s.active !== false)
    .map((s) => {
      const txt = (
        s.name +
        ' ' +
        s.lot +
        ' ' +
        s.floor +
        ' ' +
        (CATEGORIES[s.category] || '')
      ).toLowerCase();
      let score =
        terms.reduce((n, t) => n + (txt.includes(t) ? 4 : 0), 0) +
        (category === s.category ? 2 : 0);
      return { ...s, score };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);
}
export function haversine(lat, lng, a, b) {
  const rad = (x) => (x * Math.PI) / 180;
  const h =
    Math.sin(rad(lat - a) / 2) ** 2 +
    Math.cos(rad(lat)) * Math.cos(rad(a)) * Math.sin(rad(lng - b) / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}
