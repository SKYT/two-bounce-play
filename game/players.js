// Players are data: game/players/index.json lists them, game/players/<id>/player.json describes each one.
// Adding a player or an outfit never needs a code change.
import {asset} from './version.js?v=4f3956d';
import {composeOutfit, prefetchParts} from './compose.js?v=4f3956d';

const home = new URL('./players/', import.meta.url);
const forms = new URL('./forms/', import.meta.url);

async function readJson(url) {
  if (url.protocol === 'file:') { // Node tests read straight from disk
    const {readFile} = await import(/* Node only */ 'node:' + 'fs/promises');
    return JSON.parse(await readFile(url, 'utf8'));
  }
  const response = await fetch(url);
  if (!response.ok) throw new Error(url.pathname + ' ' + response.status);
  return response.json();
}

// Turn the JSON's relative sheet paths into versioned URLs; keep everything else as written.
export function resolvePlayer(id, data, base = new URL(id + '/', home)) {
  const spec = {...data, id, atlas: asset(data.sheet, base)};
  if (data.costumes?.length) {
    spec.costumes = data.costumes.map(c => ({...c, atlas: asset(c.sheet, base),
      motionAtlas: c.motionSheet ? asset(c.motionSheet, base) : null}));
    spec.motionAtlas = spec.costumes.find(c => c.sheet === data.sheet)?.motionAtlas;
  }
  return spec;
}

// A form is a shared body with interchangeable parts (game/forms/<form>/). A player that names a form
// takes its rig (cells, hands, timing) from the form and picks tops, bottoms and a head from it.
async function loadForm(name, base) {
  const dir = new URL(name + '/', base);
  const [form, rig, motion] = await Promise.all(['form.json', 'rig.json', 'motion.json']
    .map(file => readJson(asset(file, dir)).catch(() => null)));
  const urls = {body: asset(form.body, dir), tops: {}, bottoms: {}, heads: {}, headMasks: {}, motionMasks: {},
    front: form.layers?.front ? asset(form.layers.front, dir) : null};
  for (const [id, part] of Object.entries(form.tops)) {
    urls.tops[id] = asset(part.sheet, dir);
    if (part.motionMask) urls.motionMasks[id] = asset(part.motionMask, dir);
  }
  for (const [id, part] of Object.entries(form.bottoms)) urls.bottoms[id] = asset(part.sheet, dir);
  for (const [id, head] of Object.entries(form.heads || {})) {
    urls.heads[id] = asset(head.sheet, dir);
    urls.headMasks[id] = asset(head.mask, dir);
  }
  return {...form, id: name, base: dir, rig, motion, urls};
}

export function resolveFormPlayer(id, data, form) {
  const head = data.head ?? form.defaultHead;
  const scale = form.heads?.[head] ? form.detailScale : 1;
  const wardrobe = {top: {}, bottom: {}};
  for (const slot of ['top', 'bottom']) {
    for (const part of data.wardrobe[slot]) {
      const known = form[slot + 's'][part];
      if (!known) throw new Error(`${id}: ${form.id} has no ${slot} "${part}"`);
      wardrobe[slot][part] = known.name;
    }
  }
  const costumes = [];
  for (const top of data.wardrobe.top) for (const bottom of data.wardrobe.bottom) {
    costumes.push({id: top + '-' + bottom, name: wardrobe.top[top] + ' · ' + wardrobe.bottom[bottom], top, bottom, head});
  }
  return {...form.rig, ...data, poses: {...form.rig.poses, ...data.poses}, id, wardrobe, costumes, atlas: null,
    cellSize: form.rig.cellSize * scale, flightMotion: data.flightMotion ?? form.motion?.flight, composed: form};
}

// Pixels for one outfit: composed players are built in the browser, the rest point at their sheet files.
export async function outfitArt(spec, costumeId) {
  const costume = costumesOf(spec).find(c => c.id === costumeId) || costumesOf(spec)[0];
  if (spec.composed) {
    const art = await composeOutfit(spec.composed, costume);
    return {url: art.url, atlasImage: art.sheet, motionImage: art.motion, atlas: null, motionAtlas: null};
  }
  return {url: costume.atlas.href, atlas: costume.atlas, motionAtlas: costume.motionAtlas ?? spec.motionAtlas ?? null};
}

export function prefetchWardrobe(spec) {
  if (spec.composed) prefetchParts(spec.composed, spec.costumes);
}

// Add "my players" (creator recipes already turned into player data) after the original players.
// entries: [[id, data]]. Broken ones are skipped like broken player.json files.
export function addCustomPlayers(roster, entries) {
  const form = [...roster.values()].find(s => s.composed)?.composed;
  for (const [id, data] of entries) {
    const host = [...roster.values()].find(s => s.composed?.id === data.form)?.composed ?? (data.form === form?.id ? form : null);
    if (!host) continue;
    try { roster.set(id, resolveFormPlayer(id, data, host)); } catch (error) { console.warn(`custom ${id} skipped:`, error); }
  }
  return roster;
}

export async function loadRoster(base = home, formBase = forms) {
  const index = await readJson(asset('index.json', base));
  const formCache = new Map();
  // One broken player.json or form must not take the whole roster down: skip it and say why.
  const entries = await Promise.all(index.order.map(async id => {
    try {
      const data = await readJson(asset(id + '/player.json', base));
      if (!data.form) return [id, resolvePlayer(id, data, new URL(id + '/', base))];
      if (!formCache.has(data.form)) formCache.set(data.form, loadForm(data.form, formBase));
      return [id, resolveFormPlayer(id, data, await formCache.get(data.form))];
    } catch (error) {
      console.warn(`player ${id} skipped:`, error);
      return null;
    }
  }));
  const players = new Map(entries.filter(Boolean));
  if (!players.size) throw new Error('no player could be loaded');
  const defaultId = players.has(index.default) ? index.default : [...players.keys()][0];
  return Object.assign(players, {defaultId});
}

// Home-screen portraits: one sheet built when publishing (scripts/build-portraits.py). Missing in a
// source checkout; the home screen then falls back to each player's own sheet.
export async function loadPortraits(base = home) {
  try {
    const meta = await readJson(asset('portraits.json', base));
    return {...meta, url: asset('portraits.webp', base)};
  } catch {
    return null;
  }
}

export function initialPlayer(roster, requested, saved) {
  if (roster.has(requested)) return requested;
  return roster.has(saved) ? saved : roster.defaultId;
}

// A player's outfits share every cell, hand and timing; only the sheet differs.
export function costumesOf(spec) {
  return spec.costumes?.length ? spec.costumes : [{id: 'base', name: '기본', atlas: spec.atlas}];
}

export function initialCostume(spec, requested, saved) {
  const list = costumesOf(spec);
  return (list.find(c => c.id === requested) || list.find(c => c.id === saved) || list[0]).id;
}
