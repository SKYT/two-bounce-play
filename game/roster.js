import {player as guji} from './art/guji/player.js';
import {player as rio} from './art/rio/player.js';

export const roster = new Map([['guji',guji], ['rio',rio]]);
export function initialPlayer(requested, saved) {
  if (roster.has(requested)) return requested;
  return roster.has(saved) ? saved : 'guji';
}
