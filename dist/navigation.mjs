export function orientedPoints(segment) {
  const path = segment.path || [
    [segment.from.x, segment.from.y],
    [segment.to.x, segment.to.y],
  ];
  return segment.from.id === segment.a ? path : [...path].reverse();
}
export function floorLegs(route, floor) {
  const legs = [];
  let current = null;
  for (const segment of route?.segments || []) {
    if (segment.type !== 'walk' || segment.from.floor !== floor || segment.to.floor !== floor) {
      current = null;
      continue;
    }
    const points = orientedPoints(segment);
    if (!current || current.end !== segment.from.id) {
      current = {
        points: [...points],
        start: segment.from.id,
        end: segment.to.id,
        edgeIds: [segment.id],
      };
      legs.push(current);
    } else {
      current.points.push(...points.slice(1));
      current.end = segment.to.id;
      current.edgeIds.push(segment.id);
    }
  }
  return legs;
}
export function arrowPositions(points, spacing = 60) {
  const arrows = [];
  let covered = 0,
    next = spacing * 0.65;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1],
      b = points[i],
      length = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (!length) continue;
    while (next <= covered + length) {
      const t = (next - covered) / length;
      if (t >= 0 && t <= 1)
        arrows.push({
          x: a[0] + (b[0] - a[0]) * t,
          y: a[1] + (b[1] - a[1]) * t,
          angle: (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI,
        });
      next += spacing;
    }
    covered += length;
  }
  return arrows;
}
export function floorConnectors(route, floor) {
  const connectors = [];
  for (let i = 0; i < (route?.segments.length || 0); i++) {
    const first = route.segments[i];
    if (first.type === 'walk') continue;
    let last = first;
    if (first.type === 'lift')
      while (
        i + 1 < route.segments.length &&
        route.segments[i + 1].type === 'lift' &&
        route.segments[i + 1].from.id === last.to.id
      )
        last = route.segments[++i];
    const key = first.type + '-' + first.from.id + '-' + last.to.id;
    if (first.from.floor === floor)
      connectors.push({
        key,
        node: first.from,
        fromFloor: first.from.floor,
        toFloor: last.to.floor,
        role: 'board',
        type: first.type,
      });
    if (last.to.floor === floor)
      connectors.push({
        key,
        node: last.to,
        fromFloor: first.from.floor,
        toFloor: last.to.floor,
        role: 'exit',
        type: first.type,
      });
  }
  return connectors;
}
export function shortLandmark(node) {
  return String(node?.name || 'Checkpoint').replace(/\s*·\s*(B|LG|G\d+)$/, '');
}
