// Players are data: game/players/index.json lists them, game/players/<id>/player.json describes each one.
// Adding a player or an outfit never needs a code change.
import {asset} from './version.js?v=02a49b2';

const home = new URL('./players/', import.meta.url);

async function readJson(url) {
  if (url.protocol === 'file:') { // Node tests read straight from disk
    const {readFile} = await import('node:fs/promises');
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
    spec.costumes = data.costumes.map(c => ({...c, atlas: asset(c.sheet, base)}));
  }
  return spec;
}

export async function loadRoster(base = home) {
  const index = await readJson(asset('index.json', base));
  const entries = await Promise.all(index.order.map(async id =>
    [id, resolvePlayer(id, await readJson(asset(id + '/player.json', base)), new URL(id + '/', base))]));
  const roster = new Map(entries);
  roster.defaultId = roster.has(index.default) ? index.default : index.order[0];
  return roster;
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
