import {player as guji} from './art/guji/player.js';
import {player as rio} from './art/rio/player.js';
import {player as vera} from './art/vera/player.js';
import {player as navi} from './art/navi/player.js?art=2';
import {player as lin} from './art/lin/player.js';
import {player as mei} from './art/mei/player.js';
import {player as saemi} from './art/saemi/player.js';
import {player as yunseul} from './art/yunseul/player.js';
import {player as haru} from './art/haru/player.js';

export const roster = new Map([['guji',guji], ['rio',rio], ['vera',vera], ['navi',navi], ['lin',lin], ['mei',mei], ['saemi',saemi], ['yunseul',yunseul], ['haru',haru]]);
// A player's outfits share every cell, hand and timing; only the sheet differs.
export function costumesOf(spec) {
  return spec.costumes?.length ? spec.costumes : [{id:'base', name:'기본', atlas:spec.atlas}];
}
export function initialCostume(spec, requested, saved) {
  const list = costumesOf(spec);
  return (list.find(c => c.id === requested) || list.find(c => c.id === saved) || list[0]).id;
}
export function initialPlayer(requested, saved) {
  if (roster.has(requested)) return requested;
  return roster.has(saved) ? saved : 'guji';
}
