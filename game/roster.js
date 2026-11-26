import {player as guji} from './art/guji/player.js';
import {player as rio} from './art/rio/player.js';
import {player as vera} from './art/vera/player.js';
import {player as navi} from './art/navi/player.js?art=2';

export const roster = new Map([['guji',guji], ['rio',rio], ['vera',vera], ['navi',navi]]);
export function initialPlayer(requested, saved) {
  if (roster.has(requested)) return requested;
  return roster.has(saved) ? saved : 'guji';
}
