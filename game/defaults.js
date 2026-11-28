import {ball} from './art/ball.js?v=1c51e47';
import {court} from './art/court.js?v=1c51e47';
import {hoop} from './art/hoop.js?v=1c51e47';

// scene.player is filled in by the home screen (game/players.js).
export const scene = {player: null, ball, court, hoop,
  camera: {angle: Math.PI / 4, depth: .46, pixelsPerMeter: 64},
  // Presentation only: none of these change rules or timing of the match. Reduced motion keeps only shadows.
  effects: {
    shadows: true,                                   // under the player and the ball, shrinking with height
    afterimage: {count: 2, stepMs: 45, alpha: .26},  // jump trail while airborne
    hitStopMs: 80,                                   // the made ball pauses in the net, then catches up
    shake: {pixels: 3, ms: 220},                     // court shake on a made basket (×1.5 on PERFECT)
    dust: {ms: 360},                                 // puffs at the feet when a jump lands
    rimWobble: {pixels: 2, ms: 360},                 // the hoop shivers when a miss rattles off the rim
    streakGlow: {from: 3, ms: 900}                   // warm light behind the hoop from the 3rd make in a row
  }};
export const rules = {chargeMs: 950, targetWidth: .45, flightMs: 500,
  madeBounceMs: 1420, missBounceMs: 890, recoveryMs: 900, misses: 3};
