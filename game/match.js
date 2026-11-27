import {rules} from './defaults.js?art=ball2';

const freeThrow = {x:200,y:330};
const basket = {x:200,y:105};
const distance = p => Math.hypot(p.x-basket.x,p.y-basket.y);

function targetBand(spot) {
  const center = Math.min(.84,.25+distance(spot)/600);
  return {center, low:center-rules.targetWidth/2, high:center+rules.targetWidth/2};
}

export function newMatch() {
  return {phase:'ready', since:0, spot:{...freeThrow}, band:targetBand(freeThrow), goalAt:-Infinity,
    shot:null, attempts:0, goals:0, misses:0, streak:0, firstBounce:false};
}

export function charge(game, now) {
  if (game.phase !== 'ready') return false;
  game.phase = 'hold';
  game.since = now;
  return true;
}

export function cancelCharge(game) {
  if (game.phase === 'hold') game.phase = 'ready';
}

function fumble(game, now) {
  game.phase = 'fumble';
  game.since = now;
  game.attempts++;
  game.misses++;
  game.streak = 0;
  return 'fumble';
}

export function release(game, now, random = Math.random) {
  if (game.phase !== 'hold') return;
  const held = now-game.since;
  if (held >= rules.chargeMs) return fumble(game,now);
  const power = Math.max(0,held/rules.chargeMs), error = power-game.band.center;
  const hit = power >= game.band.low && power <= game.band.high;
  const angle = hit ? Math.PI*(.10+random()*.80) : Math.PI*(error<0 ? .28 : .72)+(random()-.5)*1.4;
  const range = hit ? 48+random()*55 : 110+Math.abs(error)*380;
  game.shot = {hit, perfect:hit && Math.abs(error)<=rules.targetWidth/8,
    contact:basket.x+(hit ? 0 : error<0 ? -14 : 14),
    end:{x:basket.x+Math.cos(angle)*range,y:basket.y+Math.sin(angle)*range}};
  game.attempts++;
  game.firstBounce = false;
  game.phase = 'flight';
  game.since = now;
  return 'release';
}

export function advance(game, now, releaseMs) {
  const elapsed = now-game.since;
  if (game.phase === 'hold' && elapsed >= rules.chargeMs) return fumble(game,now);
  if (game.phase === 'flight' && elapsed >= releaseMs+rules.flightMs) {
    game.phase = 'bounce';
    game.since = now;
    if (game.shot.hit) {
      game.goals++;
      game.streak++;
      game.goalAt = now;
      return game.shot.perfect ? 'perfect' : 'goal';
    }
    game.misses++;
    game.streak = 0;
    return 'miss';
  }
  let event;
  if (game.phase === 'bounce') {
    const duration = game.shot.hit ? rules.madeBounceMs : rules.missBounceMs;
    if (elapsed < duration) {
      if (!game.firstBounce && elapsed >= duration*.56) {
        game.firstBounce = true;
        return 'firstBounce';
      }
      return;
    }
    const p = game.shot.end;
    const outside = p.x<16 || p.x>384 || p.y<52 || p.y>478 || distance(p)>320;
    game.spot = outside ? {...freeThrow} : {...p};
    event = outside ? 'freeThrow' : 'secondBounce';
  } else if (game.phase === 'fumble' && elapsed >= rules.recoveryMs) {
    event = 'ready';
  } else return;
  game.phase = game.misses >= rules.misses ? 'over' : 'ready';
  game.band = targetBand(game.spot);
  game.since = now;
  return game.phase === 'over' ? 'over' : event;
}
