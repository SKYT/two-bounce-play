import {ball} from './art/ball.js?v=8573a3d';
import {court} from './art/court.js?v=8573a3d';
import {hoop} from './art/hoop.js?v=8573a3d';

// scene.player is filled in by the home screen (game/players.js).
export const scene = {player: null, ball, court, hoop,
  camera: {angle: Math.PI / 4, depth: .46, pixelsPerMeter: 64}};
export const rules = {chargeMs: 950, targetWidth: .45, flightMs: 500,
  madeBounceMs: 1420, missBounceMs: 890, recoveryMs: 900, misses: 3};
