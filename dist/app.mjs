import {
  orientedPoints,
  floorLegs,
  arrowPositions,
  floorConnectors,
  shortLandmark,
} from './navigation.mjs';
import { PLAN_FRAME, fitMapCamera, mapViewBox, zoomMapCamera } from './camera.mjs';
import {
  FLOORS,
  RETAIL,
  CATEGORIES,
  normal,
  buildNetwork,
  validateNetwork,
  route,
  instructions,
  rankParking,
  haversine,
} from './core.mjs';
const $ = (s) => document.querySelector(s),
  $$ = (s) => [...document.querySelectorAll(s)],
  esc = (s) =>
    String(s ?? '').replace(
      /[&<>"']/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
    );
const ICONS = {
  route: '<path d="M5 17h4a4 4 0 0 0 4-4V7h6M15 3l4 4-4 4"/><circle cx="5" cy="17" r="2"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4 4"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  parking: '<rect x="3" y="3" width="18" height="18" rx="4"/><path d="M9 17V7h4a3 3 0 0 1 0 6H9"/>',
  pin: '<path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 0 1 14 0Z"/><circle cx="12" cy="10" r="2"/>',
  star: '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9Z"/>',
  arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
  settings:
    '<path d="M12 3v3m0 12v3M3 12h3m12 0h3M5.6 5.6l2 2m8.8 8.8 2 2m0-12.8-2 2m-8.8 8.8-2 2"/><circle cx="12" cy="12" r="5"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v1"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  lift: '<rect x="5" y="2" width="14" height="20" rx="2"/><path d="m8 8 2-2 2 2m0 8 2 2 2-2M10 6v7m4-2v7"/>',
  shop: '<path d="m4 3-2 6h20l-2-6ZM4 9v12h16V9M9 21v-8h6v8"/>',
  food: '<path d="M5 3v7m3-7v7M3 7h7m-4 3v11M17 3c-4 5-4 9 1 9V3v18"/>',
  chat: '<path d="M21 11a8 8 0 0 1-8 8H7l-5 3V9a7 7 0 0 1 7-7h4a8 8 0 0 1 8 9Z"/><path d="M7 8h9m-9 5h6"/>',
  download: '<path d="M12 3v12m-4-4 4 4 4-4M4 16v5h16v-5"/>',
  check: '<path d="m5 12 4 4L20 5"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  heart: '<path d="M20 5c-3-3-7-1-8 1-1-2-5-4-8-1-5 5 8 15 8 15S25 10 20 5Z"/>',
  car: '<path d="m4 8 2-5h12l2 5M3 9h18v9H3Zm3 9v3m12-3v3M6 13h2m8 0h2"/>',
  camera: '<path d="M4 6h4l2-3h4l2 3h4v15H4Z"/><circle cx="12" cy="13" r="4"/>',
  back: '<path d="M20 12H4m6-6-6 6 6 6"/>',
  print: '<path d="M6 8V2h12v6M6 17H3V8h18v9h-3M6 14h12v8H6Z"/>',
  external: '<path d="M14 3h7v7m0-7L10 14M10 3H3v18h18v-7"/>',
};
const icon = (n, cls = '') =>
  `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n] || ICONS.pin}</svg>`;
let data,
  geometry,
  stores,
  graph,
  geoBusy = false;
const KEY = 'mallway-v1';
const maintenanceMode = new URLSearchParams(location.search).get('maintenance') === '1';
let persisted = {};
try {
  persisted = JSON.parse(localStorage.getItem(KEY) || '{}');
} catch {}
const S = {
  page: 'planner',
  mode: 'before',
  floor: 'LG',
  dest: null,
  start: 'LG-entrance-west',
  parkingOrigin: 'B-park-A',
  parkChoice: null,
  route: null,
  step: 0,
  zoom: 1,
  official: true,
  ...fitMapCamera(),
  largeText: persisted.preferences?.largeText || false,
  mapFull: false,
  prefs: { stepFree: false, preferLift: false, strategy: 'time' },
  favorites: persisted.favorites || [],
  car: persisted.car || null,
  history: persisted.history || [],
  dirQuery: '',
  dirCategory: '',
  dirFloor: '',
  dirFavorites: false,
  adminTab: 'overview',
  originFloor: 'LG',
  editNode: null,
  placing: false,
  geoMessage: '',
  ...persisted.preferences,
};
function persist() {
  try {
    localStorage.setItem(
      KEY,
      JSON.stringify({
        favorites: S.favorites,
        car: S.car,
        history: S.history.slice(0, 30),
        stores,
        graph,
        preferences: { prefs: S.prefs, largeText: S.largeText },
      }),
    );
  } catch {
    toast('Storage is full or unavailable. Export a backup to keep your changes.');
  }
}
function toast(message) {
  $('#toast').textContent = message;
  $('#toast').classList.add('visible');
  clearTimeout(toast.t);
  toast.t = setTimeout(() => $('#toast').classList.remove('visible'), 4200);
}
function modal(title, content) {
  $('#dialog-content').innerHTML =
    `<div class="dialog-head"><h2>${esc(title)}</h2><button class="icon-btn" data-action="close-dialog" aria-label="Close">${icon('close')}</button></div>${content}`;
  if (!$('#dialog').open) $('#dialog').showModal();
}
function closeModal() {
  $('#dialog').close();
}
function download(name, content, type = 'application/json') {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function store(id) {
  return stores.find((s) => s.id === id) || stores.find((s) => s.id === node(id)?.directoryId);
}
function node(id) {
  return graph.nodes.find((n) => n.id === id);
}
function floorName(f) {
  return f === 'B'
    ? 'Basement'
    : f === 'LG'
      ? 'Lower Ground'
      : `Ground Floor ${f.replace('G', '')}`;
}
function badge(s) {
  return CATEGORIES[s.category] || 'Services';
}
function getStart() {
  return S.mode === 'before'
    ? S.parkChoice || rankParking(graph, S.dest, S.prefs)[0]?.node.id
    : S.mode === 'parked'
      ? S.parkingOrigin
      : S.start;
}
function go(page) {
  S.page =
    ['planner', 'directory', 'parking'].includes(page) || (maintenanceMode && page === 'admin')
      ? page
      : 'planner';
  S.placing = false;
  render();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
function chooseDest(id) {
  const n = node(id);
  if (!n) {
    toast(
      'This directory entry needs a mapped approach before a route can be created. Choose another shop or report it to the map maintainer.',
    );
    return;
  }
  S.dest = id;
  S.route = null;
  S.step = 0;
  S.parkChoice = null;
  S.floor = n.floor;
  S.official = true;
  resetCamera();
  go('planner');
}
function calculate() {
  if (!S.dest) {
    toast('Choose a destination first.');
    return;
  }
  const start = getStart();
  const r = route(graph, start, S.dest, S.prefs);
  if (!r) {
    S.route = null;
    render();
    toast('No available route. Change the start or reopen a connection.');
    return;
  }
  S.route = r;
  S.step = 0;
  S.floor = r.nodes[0].floor;
  S.official = false;
  resetCamera();
  S.history.unshift({
    start,
    end: S.dest,
    at: new Date().toISOString(),
    metres: Math.round(r.metres),
    seconds: Math.round(r.seconds),
  });
  S.history = S.history.slice(0, 30);
  persist();
  render();
  toast(
    r.verified
      ? 'Route ready. Confirm your starting checkpoint.'
      : 'Route preview ready. Confirm lift connections and storefront access on site.',
  );
}
function nav() {
  return `<aside class="rail"><a href="#" class="brand-symbol" aria-label="MallWay home" data-page="planner">↗</a>${[
    ['planner', 'route', 'Navigate'],
    ['directory', 'grid', 'Shop Directory'],
    ['parking', 'parking', 'My Parking'],
  ]
    .map(
      ([p, i, t]) =>
        `<button class="navitem ${S.page === p ? 'active' : ''}" data-page="${p}" aria-label="${t}" ${S.page === p ? 'aria-current="page"' : ''}>${icon(i)}<span>${t}</span></button>`,
    )
    .join('')}</aside>`;
}
function header() {
  return `<header class="topbar"><a href="#" data-page="planner" class="brandmark"><span class="brand-symbol">↗</span><div class="brand">Mall<em>Way</em><small>Less searching. More exploring.</small></div></a><div class="top-right"><span class="pill green"><i class="live-dot"></i> KL East demo</span><button class="text-size ${S.largeText ? 'active' : ''}" data-action="text-size" aria-label="${S.largeText ? 'Use standard text' : 'Use extra large text'}" aria-pressed="${S.largeText}">Aa<span>Text size</span></button><button class="mall-select" data-action="mall-info">${icon('pin')} KL East Mall</button><button class="icon-btn" data-action="map-notes" aria-label="Sources and map notes">${icon('info')}</button></div></header>`;
}
function heading(title, sub, actions = '') {
  return `<div class="heading"><div><div class="breadcrumbs">MALLWAY DEMO &nbsp; / &nbsp; KL EAST MALL</div><h1>${title}</h1><p>${sub}</p></div><div class="heading-actions">${actions}</div></div>`;
}
function statusBar() {
  return `<div class="status-bar"><span><i></i> Official plans & directory · sourced 22 Oct 2026</span><button class="tiny-button" data-action="map-notes">Sources & map notes ${icon('external')}</button></div>`;
}
function sourceNotice() {
  return `<div class="notice">Shop outlines align with the official plans. Concourse approaches are plan-derived; doors, lift links and distance estimates need a mall walkthrough.</div>`;
}
function destinationField() {
  const s = store(S.dest),
    n = node(S.dest);
  return `<div class="field"><label for="dest-search">WHERE ARE YOU HEADING?</label>${n ? `<div class="destination"><span class="mini-icon">${icon(s?.category === 'food-beverage' ? 'food' : 'shop')}</span><div><strong>${esc(n.name)}</strong><div class="small muted">${esc(s?.lot || n.floor)} · ${esc(badge(s || {}))}</div></div><button class="remove" data-action="clear-dest" aria-label="Clear destination">×</button></div>` : `<div class="input-icon">${icon('search')}<input id="dest-search" class="control" type="search" placeholder="Search a shop, brand or lot…" autocomplete="off"><div id="dest-results"></div></div>`}</div>`;
}
function originPicker() {
  if (S.mode === 'before')
    return `<div class="notice info small">Choose a shop. We’ll compare basement lobby approaches so you can plan where to park. Live bay availability is not connected.</div>`;
  if (S.mode === 'parked')
    return `<div class="field"><label for="parking-origin">YOUR PARKING CHECKPOINT</label><select class="control" id="parking-origin">${graph.nodes
      .filter((n) => n.type === 'parking')
      .map(
        (n) =>
          `<option value="${n.id}" ${n.id === S.parkingOrigin ? 'selected' : ''}>${esc(n.name)} · pilot checkpoint</option>`,
      )
      .join(
        '',
      )}</select><p class="helper">Choose the lobby nearest your car, then save a pillar or bay number in My parking.</p></div>`;
  const currentOrigin = node(S.start);
  if (currentOrigin && ['store', 'entrance', 'lift', 'escalator'].includes(currentOrigin.type))
    S.originFloor = currentOrigin.floor;
  const origins = graph.nodes.filter(
    (n) => n.floor === S.originFloor && ['store', 'entrance', 'lift', 'escalator'].includes(n.type),
  );
  if (!origins.some((n) => n.id === S.start)) S.start = origins[0]?.id;
  return `<div class="field"><label for="origin-floor">YOUR CURRENT FLOOR</label><select class="control" id="origin-floor">${FLOORS.map((f) => `<option ${f === S.originFloor ? 'selected' : ''} value="${f}">${f} · ${floorName(f)}</option>`).join('')}</select></div><div class="field"><label for="inside-origin">NEAREST SHOP OR LANDMARK</label><select class="control" id="inside-origin">${origins.map((n) => `<option ${n.id === S.start ? 'selected' : ''} value="${n.id}">${esc(n.name)}</option>`).join('')}</select></div>`;
}
function plannerPanel() {
  const parking = S.dest && S.mode === 'before' ? rankParking(graph, S.dest, S.prefs) : [];
  if (parking.length && !parking.some((p) => p.node.id === S.parkChoice))
    S.parkChoice = parking[0].node.id;
  const picked = parking.find((p) => p.node.id === S.parkChoice);
  const option = (p, i) =>
    `<button class="parking-option ${p.node.id === S.parkChoice ? 'selected' : ''}" data-parking-choice="${p.node.id}"><span><strong>${esc(p.node.name)}</strong><small>≈ ${Math.max(1, Math.ceil(p.route.seconds / 60))} min · ${Math.round(p.route.metres)} m estimate</small><small>Pilot lobby approach · bays not mapped</small></span>${i === 0 ? '<span class="pill">Suggested</span>' : ''}</button>`;
  return `<section class="card planner"><div class="section-kicker">YOUR JOURNEY</div><h3>Where to next?</h3><p class="small muted" style="margin-top:7px">Choose a destination and starting point.</p><div class="tabs" aria-label="Starting situation">${[
    ['before', 'Plan a visit'],
    ['parked', 'I’ve parked'],
    ['inside', 'I’m inside'],
  ]
    .map(
      ([m, t]) =>
        `<button data-mode="${m}" class="${S.mode === m ? 'active' : ''}" aria-pressed="${S.mode === m}">${t}</button>`,
    )
    .join(
      '',
    )}</div><button class="map-jump" data-action="show-map">${icon('grid')} View the floor plan ${icon('arrow')}</button>${destinationField()}${S.mode !== 'before' ? '<div class="divider"></div>' : ''}${originPicker()}${
    picked
      ? `<div class="parking-heading"><span class="eyebrow">PARK NEAR THIS LOBBY</span></div>${option(picked, parking.indexOf(picked))}<details class="route-options"><summary>Compare ${parking.length - 1} other approaches</summary>${parking
          .filter((p) => p !== picked)
          .map((p) => option(p, parking.indexOf(p)))
          .join('')}</details>`
      : ''
  }<div class="divider"></div><label class="check-row"><span>Step-free route<small>Lifts only for floor changes</small></span><input id="step-free" class="switch" type="checkbox" ${S.prefs.stepFree ? 'checked' : ''}></label><details class="route-options"><summary>More route preferences</summary><label class="check-row"><span>Prefer lifts<small>Helpful with a stroller or shopping bags</small></span><input id="prefer-lift" class="switch" type="checkbox" ${S.prefs.preferLift ? 'checked' : ''}></label><div class="field"><label for="strategy">ROUTE PRIORITY</label><select id="strategy" class="control"><option value="time" ${S.prefs.strategy === 'time' ? 'selected' : ''}>Lowest estimated journey time</option><option value="distance" ${S.prefs.strategy === 'distance' ? 'selected' : ''}>Less walking, with floor-change penalty</option></select></div></details><div class="planner-cta"><button class="btn big wide" data-action="calculate" ${!S.dest ? 'disabled' : ''}>${icon('route')} Find my route ${icon('arrow')}</button></div><p class="helper">Confirm your current floor and a nearby shop or landmark. Continuous indoor tracking is not connected.</p>${S.geoMessage ? `<div class="notice info" style="margin-top:12px">${esc(S.geoMessage)}</div>` : ''}</section>`;
}

function routePanel() {
  const r = S.route,
    steps = instructions(r),
    current = steps[S.step];
  return `<section class="card planner"><button class="btn ghost" data-action="back-plan">${icon('back')} Edit journey</button><div class="spacer"></div><button class="map-jump" data-action="show-map">${icon('grid')} Open route map ${icon('arrow')}</button><div class="eyebrow">Your route</div><h3 style="margin-top:8px">${esc(node(r.end)?.name)}</h3><p class="small muted" style="margin-top:5px">From ${esc(node(r.start)?.name)}</p><div class="route-summary"><div><strong>${Math.max(1, Math.ceil(r.seconds / 60))}<span class="small"> min</span></strong><small>Estimated time</small></div><div><strong>${Math.round(r.metres)}<span class="small"> m</span></strong><small>Estimated walk</small></div><div><strong>${r.floors.length}</strong><small>Levels visited</small></div></div><div class="notice ${r.verified ? 'success' : ''}">${r.verified ? 'Mapped route marked verified by your workspace editor. Follow on-site signs.' : 'Plan-derived preview · lift links, storefront doors and times need on-site confirmation.'}</div><div class="route-controls"><button class="btn secondary" data-action="save-start-parking" ${node(r.start)?.type !== 'parking' ? 'disabled' : ''}>${icon('car')} Save parking</button><button class="btn secondary" data-action="speak">${icon('chat')} Read step</button></div><ol class="step-list">${steps.map((s, i) => `<li class="${s.kind === 'lift' || s.kind === 'escalator' ? 'connector-step ' : ''}${i === S.step ? 'current' : i < S.step ? 'done' : ''}"><button class="step-number" data-step="${i}" aria-label="View step ${i + 1}">${i < S.step ? '✓' : i + 1}</button><p>${esc(s.text)}</p><small>${esc(s.detail)} · ${s.floor}</small></li>`).join('')}</ol><div class="route-controls"><button class="btn secondary" data-action="previous-step" aria-label="Previous step" ${S.step === 0 ? 'disabled' : ''}>${icon('back')}</button><button class="btn" data-action="next-step">${S.step === steps.length - 1 ? 'Finish journey' : current.targetFloor ? 'I’ve reached ' + current.targetFloor : S.step === 0 ? 'Confirm my start' : 'Confirm checkpoint'} ${icon(S.step === steps.length - 1 ? 'check' : 'arrow')}</button></div><div class="route-controls" style="margin-top:9px"><button class="btn secondary" data-action="update-origin">${icon('pin')} Update start</button><button class="btn secondary" data-action="print-route">${icon('print')} Print</button><button class="btn secondary" data-action="export-route">${icon('download')} Export</button></div><p class="helper">Current instruction: ${esc(current.targetFloor ? current.floor + ' → ' + current.targetFloor : current.floor)}. Confirmation advances the checkpoint; your phone is not tracking your position indoors.</p></section>`;
}
function color(category) {
  if (category === 'food-beverage') return '#efdfcf';
  if (['fashion', 'accessories-bags-shoes', 'jewelry-optical-timepieces'].includes(category))
    return '#e1daf2';
  if (['home-living', 'supermarket'].includes(category)) return '#d7e9dc';
  return '#d9e7ee';
}
function resetCamera() {
  Object.assign(S, fitMapCamera());
}
function cameraBox() {
  return mapViewBox(S);
}
function applyCamera() {
  const svg = $('#floor-map');
  if (svg) svg.setAttribute('viewBox', cameraBox());
  const label = $('#zoom-label');
  if (label) label.textContent = Math.round(S.zoom * 100) + '%';
  syncMapAnnotations();
}
function zoomMap(factor) {
  Object.assign(S, zoomMapCamera(S, factor));
  applyCamera();
}
function focusRoute() {
  const legs = floorLegs(S.route, S.floor),
    points = legs.flatMap((l) => l.points);
  for (const n of S.route?.nodes || []) if (n.floor === S.floor) points.push([n.x, n.y]);
  if (!points.length) {
    resetCamera();
    applyCamera();
    return;
  }
  const xs = points.map((p) => p[0]),
    ys = points.map((p) => p[1]),
    left = Math.min(...xs),
    right = Math.max(...xs),
    top = Math.min(...ys),
    bottom = Math.max(...ys);
  S.zoom = Math.min(
    2.5,
    PLAN_FRAME.width / (right - left + 260),
    PLAN_FRAME.height / (bottom - top + 220),
  );
  S.zoom = Math.max(0.8, S.zoom);
  S.panX = (left + right) / 2 - PLAN_FRAME.width / S.zoom / 2;
  S.panY = (top + bottom) / 2 - PLAN_FRAME.height / S.zoom / 2;
  applyCamera();
}
function pathString(points) {
  return points.map((p, i) => (i ? 'L' : 'M') + p.join(' ')).join(' ');
}
function annotation(n, kind, options = {}) {
  const pin = ['start', 'destination'].includes(kind),
    used = kind === 'board' || kind === 'exit',
    parking = n.type === 'parking',
    short = shortLandmark(n),
    w = pin ? 210 : used ? 185 : 145,
    h = pin || used ? 58 : 29;
  const overlap = graph.nodes.some(
    (other) =>
      other.floor === n.floor &&
      other.id !== n.id &&
      Math.hypot(other.x - n.x, other.y - n.y) < 12 &&
      (other.type === 'parking' || other.id === S.route?.start || other.id === S.route?.end),
  );
  const dx = !pin && overlap ? 40 : 0,
    dy = !pin && overlap ? 38 : 0;
  const title =
    kind === 'start'
      ? 'START CHECKPOINT'
      : kind === 'destination'
        ? 'DESTINATION'
        : used
          ? (kind === 'board' ? 'USE THIS ' : 'EXIT ') +
            (n.type === 'lift' ? 'LIFT' : n.type.toUpperCase())
          : '';
  const caption = pin
    ? `${n.floor} · ${n.lot || 'Confirm this landmark'}`
    : used
      ? kind === 'board'
        ? `${options.fromFloor} → ${options.toFloor} · ${n.type === 'lift' ? 'select ' + options.toFloor : 'go to ' + options.toFloor}`
        : `From ${options.fromFloor} · exit on ${options.toFloor}`
      : '';
  const symbol = pin
    ? `<path class="location-pin-shape" d="M0 0C-4-7-18-21-18-33a18 18 0 1 1 36 0C18-21 4-7 0 0Z"/>${kind === 'destination' ? '<path class="pin-flag" d="M-5-23v-20m0 1H7l-4 6H-5"/>' : '<circle class="pin-centre" cx="0" cy="-33" r="6"/>'}`
    : `<rect class="facility-badge" x="-19" y="-19" width="38" height="38" rx="11"/>${parking ? '<text class="parking-glyph" x="0" y="7" text-anchor="middle">P</text>' : `<svg x="-12" y="-12" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICONS[n.type === 'lift' ? 'lift' : 'route']}</svg>`}`;
  return `<g class="map-annotation nav-${kind} ${used ? 'route-connector' : ''}" data-map-x="${n.x}" data-map-y="${n.y}" data-label-width="${w}" data-label-height="${h}" data-symbol-dx="${dx}" data-symbol-dy="${dy}" data-priority="${kind === 'destination' ? 0 : kind === 'start' ? 1 : used ? 2 : 3}" ${!pin ? `data-map-checkpoint="${esc(n.id)}" tabindex="0" role="button" aria-label="${esc((used ? (kind === 'board' ? 'Use ' : 'Exit at ') : '') + short + (used ? ' · ' + options.fromFloor + ' to ' + options.toFloor : ''))}"` : ''}><title>${esc(title + ' ' + n.name + ' ' + caption)}</title><line class="annotation-leader"/>${dx || dy ? `<line class="annotation-offset-line" x1="0" y1="0" x2="${dx}" y2="${dy}"/><circle class="annotation-anchor" cx="0" cy="0" r="4"/>` : ''}<g class="nav-symbol" transform="translate(${dx} ${dy})">${symbol}</g><g class="map-label-card"><rect class="label-background" width="${w}" height="${h}" rx="9"/><rect class="label-accent" width="4" height="${h - 12}" x="0" y="6" rx="2"/>${pin || used ? `<text class="marker-kicker" x="12" y="15">${esc(title)}</text><text class="marker-name" x="12" y="33">${esc(short.length > 26 ? short.slice(0, 25) + '…' : short)}</text><text class="marker-detail" x="12" y="49">${esc(caption.length > 32 ? caption.slice(0, 31) + '…' : caption)}</text>` : `<text class="marker-simple" x="12" y="19">${esc(short.length > 19 ? short.slice(0, 18) + '…' : short)}</text>`}</g></g>`;
}
function syncMapAnnotations() {
  const svg = $('#floor-map');
  if (!svg) return;
  const ctm = svg.getScreenCTM();
  if (!ctm) return;
  const scale = 1 / Math.hypot(ctm.a, ctm.b),
    box = svg.getBoundingClientRect(),
    annotations = [...svg.querySelectorAll('.map-annotation')].sort(
      (a, b) => Number(a.dataset.priority) - Number(b.dataset.priority),
    ),
    occupied = [],
    active = [];
  for (const el of annotations) {
    const x = Number(el.dataset.mapX),
      y = Number(el.dataset.mapY);
    el.setAttribute('transform', `translate(${x} ${y}) scale(${scale})`);
    const px = ctm.a * x + ctm.c * y + ctm.e,
      py = ctm.b * x + ctm.d * y + ctm.f,
      dx = Number(el.dataset.symbolDx),
      dy = Number(el.dataset.symbolDy);
    const visible =
      px + dx >= box.left - 20 &&
      px + dx <= box.right + 20 &&
      py + dy >= box.top - 20 &&
      py + dy <= box.bottom + 55;
    el.style.visibility = visible ? 'visible' : 'hidden';
    el.setAttribute('aria-hidden', String(!visible));
    if (!visible) continue;
    active.push(el);
    el._anchor = { x: px, y: py, dx, dy };
    occupied.push({
      x: px + dx - 21,
      y:
        py +
        dy -
        (el.classList.contains('nav-start') || el.classList.contains('nav-destination') ? 55 : 21),
      w: 42,
      h: el.classList.contains('nav-start') || el.classList.contains('nav-destination') ? 56 : 42,
    });
  }
  for (const leg of !S.official && S.route ? floorLegs(S.route, S.floor) : []) {
    for (let i = 1; i < leg.points.length; i++) {
      const a = leg.points[i - 1],
        b = leg.points[i],
        length = Math.hypot(b[0] - a[0], b[1] - a[1]) / scale,
        count = Math.max(1, Math.ceil(length / 12));
      for (let j = 0; j <= count; j++) {
        const t = j / count,
          px = a[0] + (b[0] - a[0]) * t,
          py = a[1] + (b[1] - a[1]) * t;
        occupied.push({
          x: ctm.a * px + ctm.c * py + ctm.e - 7,
          y: ctm.b * px + ctm.d * py + ctm.f - 7,
          w: 14,
          h: 14,
        });
      }
    }
  }
  for (const control of document.querySelectorAll('.map-zoom,.map-hint')) {
    const r = control.getBoundingClientRect();
    if (r.width && r.height) occupied.push({ x: r.left, y: r.top, w: r.width, h: r.height });
  }
  const intersects = (a, b) =>
    a.x < b.x + b.w + 7 && a.x + a.w + 7 > b.x && a.y < b.y + b.h + 7 && a.y + a.h + 7 > b.y;
  for (const el of active) {
    const { x, y, dx, dy } = el._anchor,
      w = Number(el.dataset.labelWidth),
      h = Number(el.dataset.labelHeight),
      pin = el.classList.contains('nav-start') || el.classList.contains('nav-destination');
    const candidates = pin
      ? [
          [32, -65],
          [32, 12],
          [-w - 32, -65],
          [-w - 32, 12],
          [-w / 2, -120],
          [-w / 2, 48],
        ]
      : [
          [dx + 32, dy - 25],
          [dx - w - 32, dy - 25],
          [dx + 32, dy + 32],
          [dx - w - 32, dy + 32],
          [dx - w / 2, dy + 48],
          [dx - w / 2, dy - h - 34],
        ];
    for (const distance of [120, 180, 240])
      for (const ox of [-w - 32, -w / 2, 32])
        for (const oy of [-h - distance, distance]) candidates.push([dx + ox, dy + oy]);
    let best = null;
    for (const [ox, oy] of candidates) {
      const left = Math.max(box.left + 10, Math.min(box.right - w - 10, x + ox)),
        top = Math.max(box.top + 10, Math.min(box.bottom - h - 10, y + oy)),
        r = { x: left, y: top, w, h },
        score =
          occupied.reduce((sum, o) => sum + (intersects(r, o) ? 1 : 0), 0) * 1000 +
          Math.abs(left - (x + ox)) +
          Math.abs(top - (y + oy));
      if (!best || score < best.score) best = { ...r, score };
      if (score === 0) break;
    }
    if (!best) continue;
    const ox = best.x - x,
      oy = best.y - y;
    el.querySelector('.map-label-card').setAttribute('transform', `translate(${ox} ${oy})`);
    const line = el.querySelector('.annotation-leader');
    line.setAttribute('x1', dx);
    line.setAttribute('y1', pin ? -25 : dy);
    line.setAttribute('x2', Math.max(ox, Math.min(ox + w, dx)));
    line.setAttribute('y2', Math.max(oy, Math.min(oy + h, pin ? -25 : dy)));
    occupied.push(best);
  }
  const arrows = svg.querySelector('#route-arrows');
  if (arrows && arrows.dataset.scale !== String(scale)) {
    arrows.dataset.scale = String(scale);
    arrows.innerHTML =
      !S.official && S.route
        ? floorLegs(S.route, S.floor)
            .flatMap((leg) => arrowPositions(leg.points, 55 * scale))
            .map(
              (a) =>
                `<g transform="translate(${a.x} ${a.y}) scale(${scale}) rotate(${a.angle})"><path d="M-5-4.5 0 0-5 4.5"/></g>`,
            )
            .join('')
        : '';
  }
}
function mapSVG() {
  const f = S.floor,
    r = S.route,
    polys = geometry.floors[f] || [],
    dest = node(S.dest),
    start = r
      ? node(r.start)
      : node(S.mode === 'inside' ? S.start : S.mode === 'parked' ? S.parkingOrigin : null),
    connectors = floorConnectors(r, f),
    used = new Map(connectors.map((c) => [c.node.id, c]));
  return `<svg id="floor-map" viewBox="${cameraBox()}" preserveAspectRatio="xMidYMid meet" role="group" aria-label="Interactive official ${f} floor plan. Blue arrows show walking direction; blue pin is start; red pin is destination; amber lift is the selected connector." tabindex="0"><title>KL East Mall ${f} — official plan with visible navigation markers</title><defs><filter id="pin-shadow" x="-100%" y="-100%" width="300%" height="300%"><feDropShadow dx="0" dy="2" stdDeviation="2" flood-opacity=".25"/></filter></defs><image href="assets/plan-${f}.png" x="0" y="75" width="1000" height="500" preserveAspectRatio="none"/>
 ${polys
   .map((p) => {
     const shop = store(p.id);
     if (!shop || shop.active === false) return '';
     const mappedId = dest?.directoryId || S.dest,
       selected = p.id === mappedId && dest?.floor === f;
     return `<polygon class="shop-outline ${selected ? 'selected' : ''} ${p.id === (start?.directoryId || start?.id) && start?.floor === f ? 'origin' : ''}" points="${p.points.map((pt) => pt.join(',')).join(' ')}" data-map-store="${esc(node(p.id)?.floor === f ? p.id : p.id + '-' + f)}" tabindex="0" role="button" aria-label="${esc(shop.name + ' · ' + shop.lot)}"><title>${esc(shop.name + ' · ' + shop.lot)}</title></polygon>`;
   })
   .join('')}
 <g class="route-visual">${
   !S.official && r
     ? floorLegs(r, f)
         .map(
           (leg) =>
             `<path class="route-shadow" d="${pathString(leg.points)}"/><path class="route-halo" d="${pathString(leg.points)}"/><path class="route-line" d="${pathString(leg.points)}"/>`,
         )
         .join('')
     : ''
 }<g id="route-arrows"></g></g>
 ${graph.nodes
   .filter(
     (n) =>
       n.floor === f &&
       ['lift', 'escalator', 'parking'].includes(n.type) &&
       (r ? used.has(n.id) : n.id !== start?.id && n.id !== dest?.id),
   )
   .map((n) =>
     annotation(n, used.has(n.id) ? used.get(n.id).role : 'facility', used.get(n.id) || {}),
   )
   .join('')}
 ${start?.floor === f ? annotation(start, 'start') : ''}${dest?.floor === f ? annotation(dest, 'destination') : ''}
 </svg>`;
}
function instructionCard(step, steps) {
  const connector = ['lift', 'escalator', 'stairs'].includes(step.kind),
    viewingExit = connector && S.floor === step.targetFloor;
  return `<div class="map-context ${connector ? 'connector-context' : ''}"><span class="context-icon">${icon(connector ? 'lift' : step.kind === 'arrive' ? 'pin' : 'route')}</span><div><span class="section-kicker">STEP ${S.step + 1} OF ${steps.length} · ${connector ? (viewingExit ? 'EXIT ON ' + step.targetFloor : 'BOARD ON ' + step.floor) : step.floor}</span><strong>${esc(step.text)}</strong><p>${esc(connector ? (viewingExit ? 'Exit at the amber lift marker, then continue to the next walking step.' : `Use the amber marker on ${step.floor}. ${step.kind === 'lift' ? 'Select ' + step.targetFloor + ' inside the lift.' : 'Confirm the direction on site.'}`) : step.detail)}</p></div><div class="instruction-floor-actions">${connector ? `<button class="btn ${S.floor === step.floor ? 'soft' : 'secondary'}" data-floor="${step.floor}">Board ${step.floor}</button><button class="btn ${viewingExit ? 'soft' : 'secondary'}" data-floor="${step.targetFloor}">Exit ${step.targetFloor} ${icon('arrow')}</button>` : `<button class="btn soft" data-floor="${step.floor}" aria-label="Show current instruction floor">Show ${step.floor} ${icon('arrow')}</button>`}</div></div>`;
}
function mapPanel() {
  const r = S.route,
    selected = store(S.dest),
    selectedFloor = node(S.dest)?.floor,
    onFloor = graph.nodes.filter((n) => n.type === 'store' && n.floor === S.floor),
    steps = r ? instructions(r) : [],
    step = steps[S.step],
    connectors = floorConnectors(r, S.floor),
    board = connectors.find((c) => c.role === 'board'),
    exit = connectors.find((c) => c.role === 'exit');
  const through = steps.find(
    (s) =>
      s.kind === 'lift' &&
      FLOORS.indexOf(S.floor) > Math.min(FLOORS.indexOf(s.floor), FLOORS.indexOf(s.targetFloor)) &&
      FLOORS.indexOf(S.floor) < Math.max(FLOORS.indexOf(s.floor), FLOORS.indexOf(s.targetFloor)),
  );
  const floorText = board
    ? `Use ${shortLandmark(board.node)} to ${board.toFloor}`
    : exit
      ? `Exit ${shortLandmark(exit.node)} on ${S.floor}`
      : through
        ? `Stay in ${through.bank} until ${through.targetFloor}`
        : r
          ? floorLegs(r, S.floor).length
            ? `Follow the blue arrows on ${S.floor}`
            : 'No walking route on this level'
          : 'Select a shop to see its destination pin';
  return `<section id="map-panel" class="card map-card ${S.mapFull ? 'expanded-map' : ''}"><div class="map-toolbar"><div class="map-title"><span class="map-emblem">${icon('grid')}</span><div>Explore KL East<small>Official plan · clear checkpoints & directions</small></div></div><div class="map-actions"><button class="icon-btn" data-action="floor-shops" aria-label="Browse shops on this floor">${icon('search')}</button><button class="icon-btn" data-action="expand-map" aria-label="${S.mapFull ? 'Close expanded map' : 'Expand map'}">${icon(S.mapFull ? 'close' : 'external')}</button></div></div>
 <div class="level-bar"><span>LEVEL</span><div class="floor-buttons" aria-label="Select floor">${FLOORS.map((f) => `<button data-floor="${f}" aria-label="Show ${f} floor" aria-pressed="${f === S.floor}" class="${f === S.floor ? 'active' : ''} ${r?.floors.includes(f) ? 'on-route' : ''}">${f}${r?.floors.includes(f) ? '<i></i>' : ''}</button>`).join('')}</div><span class="floor-long">${floorName(S.floor)}</span></div>
 <div class="route-level-brief ${board || exit ? 'has-connector' : ''}"><span class="brief-floor">${S.floor}</span><div><strong>${esc(floorText)}</strong><span>${r ? (S.official ? 'Walking line is hidden. Select Show route below.' : 'Blue arrows = walk · amber = your lift/escalator · red pin = destination') : 'Blue pin = selected start · red pin = destination'}</span></div>${r ? `<button class="btn secondary" data-action="focus-route">${icon('search')} Focus route</button>` : ''}</div>
 <div class="map-surface"><div class="map-scroll" id="map-scroll">${mapSVG()}</div><div class="map-zoom"><button data-action="zoom-in" aria-label="Zoom in">+</button><span id="zoom-label">${Math.round(S.zoom * 100)}%</span><button data-action="zoom-out" aria-label="Zoom out">−</button><button data-action="zoom-reset" aria-label="Fit floor plan">${icon('grid')}</button></div><div class="map-hint">Drag to explore · scroll to zoom · Fit shows the complete plan</div></div>
 <div class="basement-source-note" ${S.floor !== 'B' ? 'hidden' : ''}>${icon('info')}<p><strong>Complete published Basement plan.</strong> Service lots and lifts are shown; parking bays, ramps and drive aisles are not included in the source.</p></div>
 ${r ? instructionCard(step, steps) : `<div class="map-context"><span class="context-icon destination-context">${icon(selected ? 'pin' : 'shop')}</span><div><span class="section-kicker">${selected ? 'RED PIN · YOUR DESTINATION' : 'CHOOSE YOUR NEXT STOP'}</span><strong>${selected ? esc(selected.name) : onFloor.length + ' stops on ' + S.floor}</strong><p>${selected ? esc(selected.lot) + ' · ' + esc(badge(selected)) : 'Tap a shop or browse this floor’s readable directory.'}</p></div>${selected ? `<button class="btn soft" data-floor="${selectedFloor}">Show ${selectedFloor}</button>` : `<button class="btn soft" data-action="floor-shops">Browse ${icon('arrow')}</button>`}</div>`}
 <div class="map-footer"><div class="legend nav-legend"><span><i class="legend-line"></i>→ Walk this way</span><span><i class="legend-pin origin"></i>Start</span><span><i class="legend-pin"></i>Destination</span><span><i class="legend-lift"></i>Your lift / escalator</span></div><div class="map-footer-actions"><a class="official-switch" href="assets/plan-${S.floor}.png" target="_blank" rel="noopener noreferrer" aria-label="Open full ${S.floor} floor plan">Open full plan ${icon('external')}</a>${r ? `<button class="official-switch" aria-pressed="${!S.official}" data-action="toggle-official">${S.official ? 'Show route' : 'Hide route'}</button>` : `<a class="official-switch" href="${esc(data.mall.source)}" target="_blank" rel="noopener noreferrer">View source ${icon('external')}</a>`}</div></div></section><div class="under-map"><div class="card feature-card"><span class="mini-icon">${icon('car')}</span><div><h4>${S.car ? 'Your car is remembered' : 'Make the way back easy'}</h4><p>${S.car ? esc(S.car.label) : 'Save a lobby, bay number and a note.'}</p></div><button class="btn secondary" data-page="parking" aria-label="My parking">${icon('arrow')}</button></div><div class="card feature-card"><span class="mini-icon">${icon('shop')}</span><div><h4>Find your next favourite</h4><p>Browse shops by name, floor or category.</p></div><button class="btn secondary" data-page="directory" aria-label="Browse the shop directory">${icon('arrow')}</button></div></div>`;
}
function plannerPage() {
  return (
    heading(
      'Your next stop, made simple.',
      'From parking to your favourite shop. All on one familiar plan.',
      `<button class="btn secondary" data-action="locate" aria-label="Detect mall">${icon('pin')}<span>${geoBusy ? 'Locating…' : 'Detect mall'}</span></button><button class="btn soft" data-page="directory" aria-label="Browse shops">${icon('shop')}<span>Browse shops</span></button>`,
    ) +
    `<div class="workspace"><div>${S.route ? routePanel() : plannerPanel()}</div><div>${mapPanel()}${statusBar()}</div></div>`
  );
}
function storeCard(s) {
  return `<article class="card store-card"><div class="row"><span class="mini-icon" style="background:${color(s.category)}">${icon(s.category === 'food-beverage' ? 'food' : 'shop')}</span><button class="icon-btn ${S.favorites.includes(s.id) ? 'fav' : ''}" data-favorite="${s.id}" aria-label="${S.favorites.includes(s.id) ? 'Remove' : 'Save'} ${esc(s.name)}">${icon('star')}</button></div><h3>${esc(s.name)}</h3><p class="muted">${esc(s.lot)} · ${esc(badge(s))}</p><button class="btn soft" data-destination="${s.id}">Directions ${icon('arrow')}</button></article>`;
}
function directoryPage() {
  return (
    heading(
      'Something for every stop.',
      'Browse the official directory. Pick a destination to start your journey.',
      `<button class="btn ${S.dirFavorites ? 'soft' : 'secondary'}" data-action="favorites-only" aria-label="Show saved shops">${icon('star')}<span>Saved (${S.favorites.length})</span></button>`,
    ) +
    `<div class="directory-tools"><div class="input-icon">${icon('search')}<input id="directory-search" class="control" type="search" placeholder="Search stores, brands or lot numbers" value="${esc(S.dirQuery)}"></div><select class="control" id="directory-category" aria-label="Filter by category"><option value="">All categories</option>${Object.entries(
      CATEGORIES,
    )
      .map(
        ([k, v]) => `<option value="${k}" ${k === S.dirCategory ? 'selected' : ''}>${v}</option>`,
      )
      .join(
        '',
      )}</select><select class="control" id="directory-floor" aria-label="Filter by floor"><option value="">All floors</option>${FLOORS.map((f) => `<option ${f === S.dirFloor ? 'selected' : ''}>${f}</option>`).join('')}</select></div><div id="directory-grid" class="content-grid">${directoryCards()}</div>${statusBar()}`
  );
}
function directoryCards() {
  const q = normal(S.dirQuery);
  const list = stores.filter(
    (s) =>
      s.active !== false &&
      (!q || normal(s.name + s.lot).includes(q)) &&
      (!S.dirCategory || s.category === S.dirCategory) &&
      (!S.dirFloor || s.floor === S.dirFloor) &&
      (!S.dirFavorites || S.favorites.includes(s.id)),
  );
  return list.length
    ? list.map(storeCard).join('')
    : `<div class="empty">${icon('search')}<h3>No matching stops yet</h3><p>Try another name, floor, or category.</p></div>`;
}
function parkingPage() {
  const car = S.car;
  return (
    heading(
      'Your way back, sorted.',
      'A saved checkpoint makes the last part of your visit a little easier.',
    ) +
    `<div class="parking-layout"><section class="card page-card"><h2>${car ? 'Your saved parking' : 'Remember where you parked'}</h2>${car ? `<div class="route-summary"><div><strong>${esc(car.label)}</strong><small>Saved ${new Date(car.at).toLocaleString()}</small></div></div><p><strong>Vehicle reference:</strong> ${esc(car.vehicle || 'Not added')}</p><p><strong>Notes:</strong> ${esc(car.notes || 'No notes')}</p><div class="notice info">Checkpoint ${esc(car.node)} · ${node(car.node)?.verified ? 'marked verified in this workspace' : 'pilot lobby checkpoint'}</div>` : ''}<div class="field"><label for="save-parking-node">PARKING CHECKPOINT</label><select id="save-parking-node" class="control">${graph.nodes
      .filter((n) => n.type === 'parking')
      .map(
        (n) =>
          `<option value="${n.id}" ${n.id === car?.node ? 'selected' : ''}>${esc(n.name)} · pilot checkpoint</option>`,
      )
      .join(
        '',
      )}</select></div><div class="field"><label for="vehicle">VEHICLE REFERENCE (OPTIONAL)</label><input id="vehicle" class="control" maxlength="40" value="${esc(car?.vehicle || '')}" placeholder="Silver hatchback"></div><div class="field"><label for="parking-notes">NOTES</label><textarea id="parking-notes" class="control" maxlength="500" placeholder="Near pillar, entrance or lift…">${esc(car?.notes || '')}</textarea></div><div class="two"><button class="btn" data-action="save-parking">${icon('parking')} Save parking</button><button class="btn danger" data-action="clear-parking" ${!car ? 'disabled' : ''}>Clear saved spot</button></div></section><section class="card page-card"><h3 style="margin-top:0">Take me back to my car</h3><p class="small muted">Confirm your current floor and nearby landmark first.</p><div class="spacer"></div><div class="field"><label for="return-origin">WHERE ARE YOU NOW?</label><select id="return-origin" class="control">${graph.nodes
      .filter((n) => ['store', 'entrance', 'lift'].includes(n.type))
      .map(
        (n) =>
          `<option value="${n.id}" ${n.id === S.dest ? 'selected' : ''}>${n.floor} · ${esc(n.name)}</option>`,
      )
      .join(
        '',
      )}</select></div><button class="btn wide" data-action="return-car" ${!car ? 'disabled' : ''}>${icon('route')} Route to saved parking</button><div class="divider"></div><div class="eyebrow">Recent journeys</div>${
      S.history.length
        ? S.history
            .slice(0, 7)
            .map(
              (h) =>
                `<button class="suggestion" data-repeat-start="${esc(h.start)}" data-repeat-end="${esc(h.end)}"><span class="mini-icon">${icon('clock')}</span><span>${esc(node(h.end)?.name || h.end)}<small>From ${esc(node(h.start)?.name || h.start)} · ${new Date(h.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small></span></button>`,
            )
            .join('')
        : '<p class="small muted" style="margin-top:12px">Your planned journeys will appear here.</p>'
    }</section></div>${statusBar()}`
  );
}
function mapNotes() {
  modal(
    'Sources & map notes',
    `<p><strong>MallWay</strong> is intended for malls across Malaysia. This working demonstration uses KL East Mall. Other mall datasets are not yet connected.</p><p>KL East Mall demo · ${stores.length} sourced directory records across Basement, LG, G1, G2 and G3.</p><h3>Plans and routes</h3><p>Shop outlines use the original official plan geometry. Corridor paths are traced from those images. Storefront doors, lift-bank connections, parking approaches, distances and times need an on-site walkthrough. The plans are not measured surveys.</p><p>The full published Basement plan is included. Its source does not show parking bays, ramps or drive aisles. B-park-A/B/C identify pilot lobby approaches, not official parking-zone names.</p><h3>Your location</h3><p>Detect mall suggests the mall using approximate geolocation. Choose your current floor and nearby shop or landmark yourself. Confirming a route step advances the display; it does not track your movement indoors. Bay availability and live lift status are not connected.</p><h3>Saved on this device</h3><p>Parking, favourites, recent journeys and text preferences stay in this browser. Clearing site data removes them. Step-free routing excludes stairs and escalators in the route network; verify accessibility and public access on site.</p><h3>Official references</h3><p><a target="_blank" rel="noopener noreferrer" href="${data.mall.source}">KL East Mall directory, floor plans and facilities ↗</a><br>Directory and plans sourced 22 October 2026; tenancies may change.</p><p><a target="_blank" rel="noopener noreferrer" href="https://www.gps.gov/gps-accuracy">GPS.gov: indoor and underground positioning limits ↗</a></p>`,
  );
}
function originOptions(floor, selected) {
  return graph.nodes
    .filter(
      (n) =>
        n.floor === floor && ['store', 'entrance', 'lift', 'escalator', 'parking'].includes(n.type),
    )
    .map(
      (n) =>
        `<option value="${esc(n.id)}" ${n.id === selected ? 'selected' : ''}>${esc(n.name)}${n.lot ? ' · ' + esc(n.lot) : ''}</option>`,
    )
    .join('');
}
function updateOrigin() {
  const start = node(S.route?.start || getStart());
  const floor = FLOORS.includes(S.floor) ? S.floor : start?.floor || 'LG';
  modal(
    'Where are you now?',
    `<p>Choose the floor and the closest shop, entrance or lift. Your destination stays selected.</p><form id="origin-update-form"><div class="field"><label for="update-origin-floor">CURRENT FLOOR</label><select id="update-origin-floor" class="control">${FLOORS.map((f) => `<option value="${f}" ${f === floor ? 'selected' : ''}>${f} · ${floorName(f)}</option>`).join('')}</select></div><div class="field"><label for="update-origin-node">NEAREST SHOP OR LANDMARK</label><select id="update-origin-node" class="control" required>${originOptions(floor, start?.id)}</select></div><div class="notice info">Your location is confirmed manually. Indoor movement is not tracked.</div><div class="actions"><button class="btn secondary" type="button" data-action="close-dialog">Cancel</button><button class="btn" type="submit">${icon('pin')} Confirm my start</button></div></form>`,
  );
}
function adminPage() {
  return (
    heading(
      'Make the map your own.',
      'Edit your device’s directory and route network. Changes are local, not shared.',
      `<button class="btn secondary" data-action="export-backup">${icon('download')}<span>Export backup</span></button>`,
    ) +
    `<section class="card page-card" style="max-width:none"><div class="notice info">Prototype workspace editor · no administrator account or shared backend. Export your changes to move them to another device. A checkbox records your own verification; it does not independently validate a route.</div><div class="admin-tabs">${[
      ['overview', 'Overview'],
      ['stores', 'Directory'],
      ['connections', 'Connections'],
      ['network', 'Network JSON'],
      ['checkpoints', 'Checkpoint QR'],
      ['backup', 'Backup & restore'],
    ]
      .map(
        ([id, t]) =>
          `<button class="btn secondary ${S.adminTab === id ? 'active' : ''}" data-admin-tab="${id}">${t}</button>`,
      )
      .join('')}</div>${adminContent()}</section>`
  );
}
function adminContent() {
  if (S.adminTab === 'overview')
    return `<div class="stats"><div class="stat"><strong>${stores.length}</strong><small>Directory records</small></div><div class="stat"><strong>${graph.nodes.length}</strong><small>Mapped nodes</small></div><div class="stat"><strong>${graph.edges.filter((e) => e.closed).length}</strong><small>Closed connections</small></div><div class="stat"><strong>${S.history.length}</strong><small>Journeys on this device</small></div></div>${sourceNotice()}<p>Use Directory to edit records. Connections lets you simulate lift closures and test rerouting. Network JSON lets you replace the plan-derived network with a surveyed graph; every edge has a verification flag. The route engine respects closures, step-free constraints and one-way edges.</p><h3>Before field use</h3><ul><li>Survey entrances, corridors and vertical connections against the current official plans.</li><li>Replace demo parking-zone labels with real checkpoint names.</li><li>Measure distances and check restricted routes, stairs and escalator directions.</li><li>Test wheelchair paths in person; confirm live facility status separately.</li></ul>`;
  if (S.adminTab === 'stores')
    return `<div class="two"><input id="admin-search" class="control" placeholder="Filter directory…"><button class="btn" data-action="add-store">+ Add store</button></div><div class="spacer"></div><div class="table-wrap"><table class="admin-table"><thead><tr><th>STORE</th><th>LOT</th><th>FLOOR</th><th>STATUS</th><th></th></tr></thead><tbody id="admin-store-rows">${adminStoreRows('')}</tbody></table></div>`;
  if (S.adminTab === 'connections')
    return `<p class="muted small">Close a connector to test route recalculation. Lift and escalator names below are plan-derived labels. Existing routes are cleared when the network changes.</p><div class="spacer"></div>${graph.edges
      .filter((e) => e.type !== 'walk')
      .map(
        (e) =>
          `<label class="toggle-line"><span><strong>${esc(node(e.a)?.name)} → ${esc(node(e.b)?.floor)}</strong><br><small class="muted">${e.type} · ${e.seconds}s estimated transfer</small></span><span class="small">Open <input class="switch" type="checkbox" data-edge="${esc(e.id)}" ${!e.closed ? 'checked' : ''}></span></label>`,
      )
      .join(
        '',
      )}<div class="spacer"></div><button class="btn secondary" data-action="reopen-all">Reopen all connections</button>`;
  if (S.adminTab === 'network')
    return `<p class="small muted">Export and edit coordinates, costs, one-way flags, closures, and verification status. Coordinates use the same 1000 × 650 canvas as the official plan. Walking edges carry path polylines; update these together with endpoints. Importing is validated before your current network is replaced. Node IDs used by stores must remain available.</p><div class="spacer"></div><textarea id="network-json" class="control textarea" spellcheck="false">${esc(JSON.stringify(graph, null, 2))}</textarea><div class="spacer"></div><div class="two"><button class="btn" data-action="apply-network">Validate & apply network</button><button class="btn secondary" data-action="export-network">Download network JSON</button></div>`;
  if (S.adminTab === 'checkpoints')
    return `<p class="small muted">Print these test checkpoints. They open a confirmation for a registered landmark; placing a code at a physical location requires verifying the node first.</p><div class="spacer"></div><button class="btn secondary" data-action="print-route">${icon('print')} Print QR sheet</button><div class="spacer"></div><div class="checkpoint-grid">${checkpointCards()}</div>`;
  return `<h3>Keep your testing workspace</h3><p>Backup includes directory edits, network, favourites, saved parking and history. Only import your own trusted MallWay JSON backup.</p><div class="spacer"></div><button class="btn" data-action="export-backup">${icon('download')} Download backup</button><div class="divider"></div><label class="label" for="restore-file">RESTORE A WORKSPACE BACKUP (MAX 5 MB)</label><input id="restore-file" class="file-input" type="file" accept="application/json,.json"><div class="divider"></div><button class="btn danger" data-action="reset-workspace">Reset to original directory and plan-derived network</button>`;
}
function adminStoreRows(q) {
  return stores
    .filter((s) => normal(s.name + s.lot).includes(normal(q)))
    .map(
      (s) =>
        `<tr><td>${esc(s.name)}</td><td>${esc(s.lot)}</td><td>${s.floor}</td><td>${s.active === false ? 'Hidden' : 'Active'}</td><td><button class="tiny-button" data-edit-store="${s.id}">Edit</button></td></tr>`,
    )
    .join('');
}
function qrSVG(id, size = 4) {
  if (!window.qrcode) return '';
  let q = window.qrcode(0, 'M');
  q.addData(new URL('?checkpoint=' + encodeURIComponent(id), location.href).href);
  q.make();
  return q.createSvgTag({ cellSize: size, margin: 3, scalable: true });
}
function checkpointCards() {
  return graph.nodes
    .filter((n) => ['parking', 'entrance', 'lift'].includes(n.type))
    .map(
      (n) =>
        `<article class="card checkpoint-card"><h3>${esc(n.name)}</h3><div class="qr-box">${qrSVG(n.id)}</div><p>MW:${esc(n.id)}<br>${n.verified ? 'Workspace verified' : 'Demonstration checkpoint'}</p></article>`,
    )
    .join('');
}
function render() {
  document.documentElement.classList.toggle('large-text', S.largeText);
  const pages = {
    planner: plannerPage,
    directory: directoryPage,
    parking: parkingPage,
    admin: adminPage,
  };
  $('#app').innerHTML =
    nav() +
    `<div class="shell">${header()}<main id="main" class="main">${(pages[S.page] || plannerPage)()}</main></div>`;
  requestAnimationFrame(syncMapAnnotations);
}
function searchDest(q) {
  const wrap = $('#dest-results');
  if (!wrap) return;
  const term = normal(q);
  const list = stores
    .filter((s) => s.active !== false && (!term || normal(s.name + s.lot).includes(term)))
    .slice(0, 8);
  wrap.innerHTML = `<div class="suggestions">${list.length ? list.map((s) => `<button class="suggestion" data-destination="${s.id}"><span class="mini-icon">${icon(s.category === 'food-beverage' ? 'food' : 'shop')}</span><span>${esc(s.name)}<small>${esc(s.lot)} · ${esc(badge(s))}</small></span></button>`).join('') : '<div class="empty small">No matches. Try the brand or lot number.</div>'}</div>`;
}
function acceptOrigin(id) {
  const n = node(id);
  if (!n) return;
  S.route = null;
  S.start = id;
  S.originFloor = n.floor;
  S.mode = n.type === 'parking' ? 'parked' : 'inside';
  if (n.type === 'parking') S.parkingOrigin = id;
  S.floor = n.floor;
  go('planner');
  if (S.dest) calculate();
  else toast('Starting point confirmed. Choose your destination.');
}
async function locate() {
  if (!navigator.geolocation) {
    toast('Geolocation is unavailable. Select your starting checkpoint manually.');
    return;
  }
  if (geoBusy) return;
  geoBusy = true;
  toast('Requesting your approximate location…');
  navigator.geolocation.getCurrentPosition(
    (p) => {
      geoBusy = false;
      const d = haversine(p.coords.latitude, p.coords.longitude, data.mall.lat, data.mall.lng);
      const accuracy = p.coords.accuracy;
      if (d <= 800) {
        modal(
          'Confirm your mall',
          `<p>You appear to be near KL East Mall. Accuracy reported by your device: approximately ${Math.round(accuracy)} m.</p><p>This does not identify your floor, entrance or parking bay. Confirm the mall, then select your floor and a nearby landmark.</p><div class="actions"><button class="btn" data-action="confirm-mall">KL East Mall is correct</button></div>`,
        );
      } else {
        S.geoMessage = `Your reported location is about ${(d / 1000).toFixed(1)} km from the mall reference point (±${Math.round(accuracy)} m). KL East Mall is the only supported mall. You can still plan a visit.`;
        go('planner');
      }
    },
    (e) => {
      geoBusy = false;
      toast(
        e.code === 1
          ? 'Location permission declined. Manual checkpoints still work.'
          : 'Location unavailable. Select your floor and a nearby landmark instead.',
      );
    },
    { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
  );
}
function validateStores(list) {
  if (!Array.isArray(list) || list.length > 1000) throw Error('Invalid directory.');
  const ids = new Set();
  for (const s of list) {
    if (
      !s ||
      typeof s.id !== 'string' ||
      !/^[A-Za-z0-9_-]{1,100}$/.test(s.id) ||
      ids.has(s.id) ||
      typeof s.name !== 'string' ||
      !s.name.trim() ||
      s.name.length > 150 ||
      !FLOORS.includes(s.floor) ||
      typeof s.lot !== 'string' ||
      s.lot.length > 150 ||
      !Object.hasOwn(CATEGORIES, s.category)
    )
      throw Error('Directory fields or IDs are invalid.');
    ids.add(s.id);
  }
  return true;
}
function saveCar(id, vehicle = '', notes = '') {
  const n = node(id);
  if (!n || n.type !== 'parking') {
    toast('Select a parking checkpoint.');
    return;
  }
  S.car = { node: id, label: n.name, vehicle, notes, at: new Date().toISOString() };
  persist();
  toast('Parking saved on this device.');
}
function editStore(id) {
  const s = store(id) || {
    id: 's-local-' + Date.now(),
    name: '',
    lot: '',
    floor: 'LG',
    category: 'services',
    active: true,
  };
  modal(
    store(id) ? 'Edit directory record' : 'Add a store',
    `<form id="store-form" data-id="${s.id}"><div class="field"><label for="edit-name">NAME</label><input id="edit-name" class="control" required maxlength="150" value="${esc(s.name)}"></div><div class="two"><div class="field"><label for="edit-lot">LOT</label><input id="edit-lot" class="control" required maxlength="150" value="${esc(s.lot)}"></div><div class="field"><label for="edit-floor">FLOOR</label><select id="edit-floor" class="control">${FLOORS.map((f) => `<option ${f === s.floor ? 'selected' : ''}>${f}</option>`).join('')}</select></div></div><div class="field"><label for="edit-category">CATEGORY</label><select id="edit-category" class="control">${Object.entries(
      CATEGORIES,
    )
      .map(([k, v]) => `<option value="${k}" ${k === s.category ? 'selected' : ''}>${v}</option>`)
      .join(
        '',
      )}</select></div><label class="check-row"><span>Show in directory</span><input id="edit-active" type="checkbox" ${s.active !== false ? 'checked' : ''}></label><p class="helper">New shops or changed floors need matching, surveyed network nodes before routing becomes available. Changing floor or active status rebuilds the source-derived seed and resets network edits. Export a backup first.</p><div class="actions"><button type="button" class="btn secondary" data-action="close-dialog">Cancel</button><button type="submit" class="btn">Save record</button></div></form>`,
  );
}
document.addEventListener('click', async (e) => {
  const t = e.target.closest('button,a,[data-map-store],[data-map-checkpoint]');
  if (!t) return;
  if (t.hasAttribute('data-page')) {
    e.preventDefault();
    go(t.dataset.page);
    return;
  }
  if (t.dataset.mode) {
    S.mode = t.dataset.mode;
    S.route = null;
    if (
      S.mode === 'inside' &&
      !graph.nodes.some(
        (n) =>
          n.id === S.start &&
          n.floor === S.originFloor &&
          ['store', 'entrance', 'lift', 'escalator'].includes(n.type),
      )
    )
      S.start = graph.nodes.find(
        (n) => n.floor === S.originFloor && ['lift', 'entrance'].includes(n.type),
      )?.id;
    render();
    return;
  }
  if (t.dataset.destination) {
    chooseDest(t.dataset.destination);
    return;
  }
  if (t.dataset.favorite) {
    const id = t.dataset.favorite;
    S.favorites = S.favorites.includes(id)
      ? S.favorites.filter((x) => x !== id)
      : [...S.favorites, id];
    persist();
    render();
    return;
  }
  if (t.dataset.floor) {
    if ($('#dialog').open) closeModal();
    S.floor = t.dataset.floor;
    resetCamera();
    render();
    return;
  }
  if (t.dataset.parkingChoice) {
    S.parkChoice = t.dataset.parkingChoice;
    render();
    return;
  }
  if (t.dataset.step !== undefined) {
    if ($('#dialog').open) closeModal();
    S.step = Number(t.dataset.step);
    S.floor = instructions(S.route)[S.step].floor;
    resetCamera();
    render();
    return;
  }
  if (t.dataset.mapStore) {
    const s = store(t.dataset.mapStore);
    if (!s) return;
    modal(
      s.name,
      `<p><strong>${esc(s.lot)}</strong> · ${esc(badge(s))} · Selected level ${node(t.dataset.mapStore)?.floor}</p><p>This shop outline comes from the official published plan. The route stops at a nearby concourse approach; confirm the actual shop entrance on site.</p><div class="actions"><button class="btn secondary" data-confirm-origin="${esc(t.dataset.mapStore)}">I’m here</button><button class="btn" data-map-dest="${esc(t.dataset.mapStore)}">Go here ${icon('arrow')}</button></div>`,
    );
    return;
  }
  if (t.dataset.mapDest) {
    closeModal();
    chooseDest(t.dataset.mapDest);
    return;
  }
  if (t.dataset.mapCheckpoint) {
    const n = node(t.dataset.mapCheckpoint);
    const steps = instructions(S.route),
      idx = steps.findIndex(
        (s) =>
          ['lift', 'escalator', 'stairs'].includes(s.kind) &&
          (s.node === n.id || s.exitNode === n.id),
      ),
      step = steps[idx];
    modal(
      n.name,
      `${step ? `<div class="connector-callout"><span class="section-kicker">YOUR ROUTE USES THIS ${n.type.toUpperCase()}</span><h3>${esc(step.text)}</h3><p>${esc(step.detail)}</p><div class="actions"><button class="btn" data-step="${idx}">Show boarding step</button><button class="btn secondary" data-floor="${step.targetFloor}">Show exit on ${step.targetFloor}</button></div></div>` : '<p>Plan-traced checkpoint. Confirm its floor, label and access on site.</p>'}<details class="route-options"><summary>Use this landmark as your starting point</summary><p>Confirm that you are beside this landmark on ${n.floor}.</p><div class="actions"><button class="btn secondary" data-confirm-origin="${n.id}">Use as my start</button></div></details>`,
    );
    return;
  }

  if (t.dataset.confirmOrigin) {
    closeModal();
    acceptOrigin(t.dataset.confirmOrigin);
    return;
  }

  if (t.dataset.adminTab) {
    S.adminTab = t.dataset.adminTab;
    render();
    return;
  }
  if (t.dataset.editStore) {
    editStore(t.dataset.editStore);
    return;
  }
  if (t.dataset.repeatStart) {
    S.mode = node(t.dataset.repeatStart)?.type === 'parking' ? 'parked' : 'inside';
    S.parkingOrigin = t.dataset.repeatStart;
    S.start = t.dataset.repeatStart;
    S.originFloor = node(S.start)?.floor || 'LG';
    S.dest = t.dataset.repeatEnd;
    go('planner');
    calculate();
    return;
  }
  const action = t.dataset.action;
  if (!action) return;
  switch (action) {
    case 'close-dialog':
      closeModal();
      break;
    case 'clear-dest':
      S.dest = null;
      S.route = null;
      render();
      break;
    case 'calculate':
      calculate();
      break;
    case 'back-plan':
      S.route = null;
      render();
      break;
    case 'zoom-in':
      zoomMap(1.3);
      break;
    case 'zoom-out':
      zoomMap(1 / 1.3);
      break;
    case 'focus-route':
      focusRoute();
      break;
    case 'zoom-reset':
      resetCamera();
      applyCamera();
      break;
    case 'text-size':
      S.largeText = !S.largeText;
      persist();
      render();
      break;
    case 'show-map':
      $('#map-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      break;
    case 'expand-map':
      S.mapFull = !S.mapFull;
      render();
      break;
    case 'floor-shops':
      modal(
        'Explore ' + S.floor,
        `<p>Choose a shop on this level.</p><div class="floor-shop-list">${graph.nodes
          .filter((n) => n.floor === S.floor && n.type === 'store')
          .map((n) => ({ ...store(n.id), id: n.id, floor: n.floor }))
          .map(
            (s) =>
              `<button class="suggestion" data-map-dest="${s.id}"><span><strong>${esc(s.name)}</strong><small>${esc(s.lot)} · ${esc(badge(s))}</small></span>${icon('arrow')}</button>`,
          )
          .join('')}</div>`,
      );
      break;
    case 'toggle-official':
      S.official = !S.official;
      render();
      break;
    case 'update-origin':
      updateOrigin();
      break;
    case 'map-notes':
      mapNotes();
      break;
    case 'locate':
      locate();
      break;
    case 'confirm-mall':
      closeModal();
      S.geoMessage =
        'KL East Mall confirmed. Choose your floor and a nearby checkpoint; indoor location is not tracked.';
      if (S.mode === 'before') S.mode = 'inside';
      go('planner');
      break;
    case 'mall-info':
      modal(
        'KL East Mall',
        `<p>823, Jalan Lingkaran Tengah 2, KL Timur, 53100 Kuala Lumpur.</p><p>MallWay is intended for malls across Malaysia. This demonstration includes KL East Mall only. Additional mall datasets are not yet connected. The mall reference coordinate is approximate and is used only to suggest this demo location.</p><div class="notice info">Shop outlines match the official plans. Lobby links and parking approaches need on-site verification.</div><a target="_blank" rel="noopener noreferrer" href="${data.mall.source}">Open official directory and plans ↗</a>`,
      );
      break;
    case 'favorites-only':
      S.dirFavorites = !S.dirFavorites;
      render();
      break;
    case 'next-step':
      {
        const steps = instructions(S.route);
        if (S.step >= steps.length - 1) {
          toast('Journey completed. Your car checkpoint remains saved.');
          S.route = null;
          render();
        } else {
          S.step++;
          S.floor = steps[S.step].floor;
          S.official = false;
          resetCamera();
          render();
        }
      }
      break;
    case 'previous-step':
      S.step = Math.max(0, S.step - 1);
      S.floor = instructions(S.route)[S.step].floor;
      resetCamera();
      render();
      break;
    case 'speak':
      if (!window.speechSynthesis) {
        toast('Speech is unavailable in this browser.');
        break;
      }
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(instructions(S.route)[S.step].text);
      u.lang = 'en-MY';
      speechSynthesis.speak(u);
      break;
    case 'save-start-parking':
      saveCar(S.route.start);
      render();
      break;
    case 'save-parking':
      saveCar(
        $('#save-parking-node').value,
        $('#vehicle').value.trim(),
        $('#parking-notes').value.trim(),
      );
      render();
      break;
    case 'clear-parking':
      S.car = null;
      persist();
      render();
      toast('Saved parking cleared.');
      break;
    case 'return-car':
      {
        if (!S.car) break;
        S.start = $('#return-origin').value;
        S.originFloor = node(S.start)?.floor || 'LG';
        S.dest = S.car.node;
        S.mode = 'inside';
        go('planner');
        calculate();
      }
      break;
    case 'print-route':
      window.print();
      break;
    case 'export-route':
      if (S.route)
        download(
          'mallway-journey.json',
          JSON.stringify(
            {
              mall: data.mall.name,
              generated: new Date().toISOString(),
              verified: S.route.verified,
              warning:
                'Concourse paths are traced from the published plan; door positions, floor links and times require field verification.',
              ...S.route,
              instructions: instructions(S.route),
            },
            null,
            2,
          ),
        );
      break;
    case 'export-backup':
      download(
        'mallway-workspace.json',
        JSON.stringify(
          {
            format: 'mallway-workspace',
            version: 1,
            exported: new Date().toISOString(),
            stores,
            graph,
            favorites: S.favorites,
            car: S.car,
            history: S.history,
            preferences: { prefs: S.prefs, largeText: S.largeText },
          },
          null,
          2,
        ),
      );
      break;
    case 'export-network':
      download('mallway-network.json', JSON.stringify(graph, null, 2));
      break;
    case 'apply-network':
      try {
        const g = JSON.parse($('#network-json').value);
        if (g.layout === 'schematic')
          throw Error(
            'This older schematic does not align with the official plans. Use the new seed or import a surveyed network.',
          );
        g.version = 2;
        g.layout = 'surveyed-workspace';
        validateNetwork(g);
        if (stores.some((s) => s.active !== false && !g.nodes.some((n) => n.id === s.id)))
          throw Error('Every active store must have a network node.');
        graph = g;
        S.route = null;
        persist();
        toast('Network validated and applied.');
        render();
      } catch (e) {
        toast(e.message);
      }
      break;
    case 'reopen-all':
      graph.edges.forEach((e) => (e.closed = false));
      S.route = null;
      persist();
      render();
      toast('All connections reopened.');
      break;
    case 'add-store':
      editStore(null);
      break;
    case 'reset-workspace':
      modal(
        'Reset this workspace?',
        `<p>This removes local directory and network edits, saved parking, favourites and history. Download a backup first if you need them.</p><div class="actions"><button class="btn secondary" data-action="close-dialog">Cancel</button><button class="btn danger" data-action="confirm-reset">Reset workspace</button></div>`,
      );
      break;
    case 'confirm-reset':
      stores = structuredClone(data.stores);
      graph = buildNetwork(stores);
      S.car = null;
      S.favorites = [];
      S.history = [];
      S.route = null;
      S.dest = null;
      persist();
      closeModal();
      render();
      toast('Original workspace restored.');
      break;
  }
});
document.addEventListener('keydown', (e) => {
  if (
    ['Enter', ' '].includes(e.key) &&
    e.target.matches('[data-map-store],[data-map-checkpoint]')
  ) {
    e.preventDefault();
    e.target.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  }
  if (e.key === 'Escape') {
    if (S.mapFull) {
      S.mapFull = false;
      render();
    }
  }
});
document.addEventListener('focusin', (e) => {
  if (e.target.id === 'dest-search') searchDest(e.target.value);
});
document.addEventListener('input', (e) => {
  const t = e.target;
  if (t.id === 'dest-search') searchDest(t.value);
  if (t.id === 'directory-search') {
    S.dirQuery = t.value;
    $('#directory-grid').innerHTML = directoryCards();
  }
  if (t.id === 'admin-search') $('#admin-store-rows').innerHTML = adminStoreRows(t.value);
});
document.addEventListener('change', async (e) => {
  const t = e.target;
  if (t.id === 'step-free' || t.id === 'prefer-lift' || t.id === 'strategy') {
    S.prefs.stepFree = $('#step-free').checked;
    S.prefs.preferLift = $('#prefer-lift').checked;
    S.prefs.strategy = $('#strategy').value;
    S.route = null;
    S.parkChoice = null;
    persist();
    render();
  }
  if (t.id === 'parking-origin') {
    S.parkingOrigin = t.value;
    S.route = null;
  }
  if (t.id === 'update-origin-floor') {
    $('#update-origin-node').innerHTML = originOptions(t.value);
  }
  if (t.id === 'origin-floor') {
    S.originFloor = t.value;
    S.start = graph.nodes.find(
      (n) => n.floor === t.value && ['entrance', 'lift'].includes(n.type),
    )?.id;
    render();
  }
  if (t.id === 'inside-origin') {
    S.start = t.value;
    S.route = null;
  }
  if (t.id === 'directory-category') {
    S.dirCategory = t.value;
    $('#directory-grid').innerHTML = directoryCards();
  }
  if (t.id === 'directory-floor') {
    S.dirFloor = t.value;
    $('#directory-grid').innerHTML = directoryCards();
  }
  if (t.hasAttribute('data-edge')) {
    const edge = graph.edges.find((x) => x.id === t.dataset.edge);
    if (edge) edge.closed = !t.checked;
    S.route = null;
    persist();
    toast('Connection updated. Plan a new route to see the change.');
  }
  if (t.id === 'restore-file') {
    const file = t.files[0];
    if (!file) return;
    try {
      if (file.size > 5 * 1024 * 1024) throw Error('Backup exceeds 5 MB.');
      const b = JSON.parse(await file.text());
      if (b.format !== 'mallway-workspace' || b.version !== 1)
        throw Error('Unsupported backup format.');
      validateStores(b.stores);
      validateNetwork(b.graph);
      if (b.stores.some((s) => s.active !== false && !b.graph.nodes.some((n) => n.id === s.id)))
        throw Error('Backup is missing store nodes.');
      if (b.car && !b.graph.nodes.some((n) => n.id === b.car.node && n.type === 'parking'))
        throw Error('Invalid saved parking checkpoint.');
      modal(
        'Restore this backup?',
        `<p>Your current directory, network and saved items will be replaced. Older schematic networks will be upgraded to the source-aligned seed. Export your current workspace first if needed.</p><div class="actions"><button class="btn secondary" data-action="close-dialog">Cancel</button><button id="confirm-restore" class="btn">Restore backup</button></div>`,
      );
      $('#confirm-restore').onclick = () => {
        stores = b.stores;
        graph = b.graph.layout === 'schematic' ? buildNetwork(stores) : { ...b.graph, version: 2 };
        S.favorites = (b.favorites || []).filter((id) => stores.some((s) => s.id === id));
        S.car = b.car || null;
        S.history = Array.isArray(b.history) ? b.history.slice(0, 30) : [];
        S.route = null;
        S.dest = null;
        persist();
        closeModal();
        render();
        toast('Workspace restored.');
      };
    } catch (e) {
      toast('Restore failed: ' + e.message);
    }
  }
});
document.addEventListener('submit', (e) => {
  e.preventDefault();
  const form = e.target;
  if (form.id === 'origin-update-form') {
    const id = $('#update-origin-node').value;
    if (!node(id) || node(id).floor !== $('#update-origin-floor').value) return;
    closeModal();
    acceptOrigin(id);
  }
  if (form.id === 'store-form') {
    try {
      const previous = store(form.dataset.id);
      const s = {
        ...previous,
        id: form.dataset.id,
        name: $('#edit-name').value.trim(),
        lot: $('#edit-lot').value.trim(),
        floor: $('#edit-floor').value,
        category: $('#edit-category').value,
        active: $('#edit-active').checked,
        source: previous?.source || 'Local workspace entry',
        verified: previous ? 'directory' : 'local',
      };
      validateStores([s]);
      const changedTopology =
        !previous || s.floor !== previous.floor || s.active !== previous.active;
      stores = previous ? stores.map((x) => (x.id === s.id ? s : x)) : [...stores, s];
      if (changedTopology) graph = buildNetwork(stores);
      else {
        for (const n of graph.nodes.filter((n) => (n.directoryId || n.id) === s.id))
          Object.assign(n, { name: s.name, lot: s.lot, category: s.category });
      }
      S.route = null;
      persist();
      closeModal();
      render();
      toast('Directory updated.');
    } catch (e) {
      toast(e.message);
    }
  }
});
try {
  const response = await fetch('./directory.json');
  if (!response.ok) throw Error('Directory could not load.');
  data = await response.json();
  const geoResponse = await fetch('./geometry.json');
  if (!geoResponse.ok) throw Error('Floor geometry could not load.');
  geometry = await geoResponse.json();
  stores = (persisted.stores || structuredClone(data.stores)).map((s) => ({
    ...s,
    mapPoint: data.stores.find((d) => d.id === s.id)?.mapPoint,
  }));
  validateStores(stores);
  graph =
    persisted.graph?.version >= 2 &&
    persisted.graph?.layout !== 'schematic' &&
    (persisted.graph.layout !== 'official-plan-derived' ||
      persisted.graph.seedRevision === '2026-10-22-plan-2')
      ? persisted.graph
      : buildNetwork(stores);
  if (S.car && node(S.car.node)) S.car.label = node(S.car.node).name;
  validateNetwork(graph);
  if (maintenanceMode) S.page = 'admin';
  render();
  const id = new URLSearchParams(location.search).get('checkpoint');
  if (id && node(id)) {
    const checkpoint = node(id);
    modal(
      'Confirm your starting point',
      `<p>Are you beside <strong>${esc(checkpoint.name)}</strong> on <strong>${checkpoint.floor}</strong>?</p><p>Only confirm if the floor and landmark match your actual location.</p><div class="actions"><button class="btn secondary" data-action="close-dialog">Cancel</button><button class="btn" data-confirm-origin="${esc(id)}">I’m here</button></div>`,
    );
  }
  if ('serviceWorker' in navigator && !/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname))
    navigator.serviceWorker.register('./sw.js').catch(() => {});
} catch (e) {
  $('#app').innerHTML =
    `<div class="boot"><h1>Let’s reconnect.</h1><p>${esc(e.message)}</p><p>Serve this folder through a web server, then refresh.</p><button id="recover-local" class="btn">Reset local workspace & reload</button></div>`;
  $('#recover-local').onclick = () => {
    localStorage.removeItem(KEY);
    location.reload();
  };
}

const pointers = new Map();
let mapDrag = null,
  suppressMapClick = 0;
document.addEventListener('pointerdown', (e) => {
  const map = e.target.closest('#floor-map');
  if (!map || e.button !== 0) return;
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  const box = map.getBoundingClientRect();
  mapDrag = {
    x: e.clientX,
    y: e.clientY,
    panX: S.panX,
    panY: S.panY,
    width: box.width,
    height: box.height,
    zoom: S.zoom,
    dist:
      pointers.size === 2
        ? Math.hypot(
            ...(() => {
              const p = [...pointers.values()];
              return [p[0].x - p[1].x, p[0].y - p[1].y];
            })(),
          )
        : 0,
  };
});
document.addEventListener('pointermove', (e) => {
  if (!pointers.has(e.pointerId) || !mapDrag) return;
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pointers.size === 2) {
    const p = [...pointers.values()],
      d = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y);
    if (mapDrag.dist) {
      const target = Math.max(0.8, Math.min(5, (mapDrag.zoom * d) / mapDrag.dist));
      zoomMap(target / S.zoom);
      suppressMapClick = Date.now() + 300;
    }
    return;
  }
  const dx = e.clientX - mapDrag.x,
    dy = e.clientY - mapDrag.y;
  if (Math.abs(dx) + Math.abs(dy) > 5) suppressMapClick = Date.now() + 300;
  const scale = Math.max(
    PLAN_FRAME.width / S.zoom / mapDrag.width,
    PLAN_FRAME.height / S.zoom / mapDrag.height,
  );
  S.panX = Math.max(-500, Math.min(1000, mapDrag.panX - dx * scale));
  S.panY = Math.max(-300, Math.min(650, mapDrag.panY - dy * scale));
  applyCamera();
});
for (const event of ['pointerup', 'pointercancel'])
  document.addEventListener(event, (e) => {
    pointers.delete(e.pointerId);
    mapDrag = null;
  });
document.addEventListener(
  'click',
  (e) => {
    if (e.target.closest('#floor-map') && Date.now() < suppressMapClick) {
      e.preventDefault();
      e.stopImmediatePropagation();
    }
  },
  true,
);
document.addEventListener(
  'wheel',
  (e) => {
    if (!e.target.closest('#floor-map')) return;
    e.preventDefault();
    zoomMap(e.deltaY < 0 ? 1.12 : 1 / 1.12);
  },
  { passive: false },
);
document.addEventListener('keydown', (e) => {
  if (e.target.id !== 'floor-map') return;
  const d = 35 / S.zoom;
  if (['+', '=', '-', '0', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key))
    e.preventDefault();
  if (e.key === '+' || e.key === '=') zoomMap(1.3);
  if (e.key === '-') zoomMap(1 / 1.3);
  if (e.key === '0') resetCamera();
  if (e.key === 'ArrowLeft') S.panX -= d;
  if (e.key === 'ArrowRight') S.panX += d;
  if (e.key === 'ArrowUp') S.panY -= d;
  if (e.key === 'ArrowDown') S.panY += d;
  applyCamera();
});

window.addEventListener('resize', () => requestAnimationFrame(syncMapAnnotations));
