import {player} from './art/guji/player.js';
import {ball} from './art/ball.js';
import {court} from './art/court.js';
import {hoop} from './art/hoop.js';

export const scene = {player, ball, court, hoop,
  camera: {angle: Math.PI / 4, depth: .46, pixelsPerMeter: 64}};
export const rules = {chargeMs: 950, targetWidth: .45, flightMs: 500,
  madeBounceMs: 1420, missBounceMs: 890, recoveryMs: 900, misses: 3};
