// Where everything is on one frame, as plain data: camera, player pose, ball, shadows, effects.
// render.js only draws what this returns, so the rules of motion can be tested in Node and a different
// renderer (PixiJS, a replay exporter) can reuse them unchanged.
import {makeProjection} from './projection.js?v=5b1f447';

export const COURT_SIZE = {width: 400, height: 500};
const mix = (a,b,t) => a + (b-a)*t;
const between = (a,b,t) => ({x:mix(a.x,b.x,t), y:mix(a.y,b.y,t)});

function madeBasket(t, end, rim, floor, netLength, diameter, scale) {
  const exit = {x:rim.x, y:rim.y+netLength};
  const impact = {x:floor.x, y:Math.max(floor.y-diameter/2,exit.y+diameter*1.2)};
  if (t <= .24) return between(rim,exit,t/.24);
  if (t <= .56) {
    const u = (t-.24)/.32;
    return between(exit,impact,u*(.45+.55*u));
  }
  const u = (t-.56)/.44;
  const p = between(impact,{x:end.x,y:end.y-diameter/2},u);
  p.y -= 4*u*(1-u)*scale*1.75;
  return p;
}

// A made basket holds still for a moment in the net, then catches up so the bounce still ends on time.
export function hitStop(elapsed, duration, holdMs) {
  if (!holdMs || elapsed <= 0) return elapsed;
  if (elapsed < holdMs) return 0;
  return Math.min(duration, (elapsed-holdMs)*duration/(duration-holdMs));
}

// When does a jump land? First moment after the highest point where the flight pose is back on the floor.
// Pose timing never changes for a loaded player, so it is worked out once per actor.
const landings = new WeakMap();
export function landingMs(actor) {
  if (!landings.has(actor)) {
    let top = 0, topAt = 0, landed = null;
    for (let t = 0; t <= 2400; t += 8) {
      const lift = actor.pose('flight',t).lift || 0;
      if (lift > top) { top = lift; topAt = t; }
      if (top > 4 && t > topAt && lift <= 1) { landed = t; break; }
    }
    landings.set(actor, landed);
  }
  return landings.get(actor);
}

// actor: a loaded player (pose/hand only). reduced: prefers-reduced-motion.
export function layoutFrame({game, now, scene, rules, actor, reduced = false, size = COURT_SIZE}) {
  const {phase, shot, spot, band} = game;
  const fx = scene.effects || {};
  const player = scene.player;
  const raw = Math.max(0, now-game.since);
  const duration = shot?.hit ? rules.madeBounceMs : rules.missBounceMs;
  const elapsed = phase === 'bounce' && shot?.hit && !reduced ? hitStop(raw,duration,fx.hitStopMs) : raw;
  const bounce = phase === 'bounce' ? Math.min(1,elapsed/duration) : 0;
  const focus = bounce ? between(spot,shot.end,bounce) : spot;
  const view = makeProjection(scene,focus,size.width,size.height);
  const feet = view.floor(focus), floor = view.project(0,scene.hoop.depthM);
  const rim = {x:floor.x, y:floor.y-view.lift};
  let face = feet.x > rim.x ? -1 : 1;
  const aim = face;
  const scale = view.scale*player.heightM/player.standingPixels;
  const diameter = view.scale*scene.ball.diameterM, netLength = view.scale*scene.hoop.netLengthM;

  let shake = null;
  if (phase === 'bounce' && shot?.hit && fx.shake && !reduced && raw < fx.shake.ms) {
    const k = (1-raw/fx.shake.ms)*fx.shake.pixels*(shot.perfect ? 1.5 : 1);
    shake = {x:Math.round(k*Math.sin(raw*.11)), y:Math.round(k*.5*Math.cos(raw*.13))};
  }

  let poseState = phase;
  let poseTime = phase === 'ready' && reduced ? 0 : elapsed;
  if (phase === 'bounce' && player.poses.walk) {
    const from = view.floor(spot), to = view.floor(shot.end);
    const distanceM = Math.hypot(to.x-from.x,to.y-from.y)/view.scale;
    face = Math.abs(to.x-from.x) < 2 ? face : Math.sign(to.x-from.x);
    poseState = 'walk';
    // Match the feet to screen travel and limit cadence on long rebounds.
    const cycles = Math.min(distanceM/player.strideM,duration/380);
    poseTime = cycles*bounce*player.loopMs.walk;
  }
  const pose = actor.pose(poseState,poseTime);

  let center = actor.hand(feet,face,scale,pose);
  let ballFloor = null;  // where the ball's shadow falls; null while the ball is in the hands
  let ripple = null;     // net splash ring under a made basket
  const detach = player.releaseMs;
  if (phase === 'flight' && elapsed >= detach) {
    const t = Math.min(1,(elapsed-detach)/rules.flightMs);
    const from = actor.hand(feet,face,scale,actor.pose('flight',detach));
    const target = view.floor({x:shot.contact,y:105});
    center = between(from,{x:target.x,y:target.y-view.lift},t);
    center.y -= 95*Math.sin(Math.PI*t);
    ballFloor = {x:center.x, y:mix(feet.y,target.y,t)};
  } else if (phase === 'bounce') {
    if (shot.hit) {
      const end = view.floor(shot.end);
      center = madeBasket(bounce,end,rim,floor,netLength,diameter,view.scale);
      ballFloor = {x:center.x, y:bounce < .56 ? floor.y : mix(floor.y,end.y,(bounce-.56)/.44)};
      if (bounce >= .56 && bounce < .76 && !reduced) {
        const p = madeBasket(.56,end,rim,floor,netLength,diameter,view.scale);
        const u = (bounce-.56)/.2;
        ripple = {x:p.x, y:p.y+diameter/2, rx:(.22+u*.7)*view.scale, ry:(.08+u*.18)*view.scale, alpha:1-u};
      }
    } else {
      center = view.floor(between({x:shot.contact,y:105},shot.end,bounce));
      ballFloor = {...center};
      const u = bounce < .56 ? bounce/.56 : (bounce-.56)/.44;
      center.y -= bounce < .56 ? view.lift*(1-u)+42*Math.sin(Math.PI*u) : 34*Math.sin(Math.PI*u);
    }
  } else if (phase === 'fumble') {
    const from = actor.hand(feet,face,scale,actor.pose('hold',rules.chargeMs));
    const u = Math.min(1,elapsed/rules.recoveryMs), ground = feet.y-7*scale;
    center.x = mix(from.x,feet.x+13*face*scale,u);
    center.y = u < .35 ? mix(from.y,ground,(u/.35)**2) :
      ground-scale*(u < .7 ? 15*Math.sin(Math.PI*(u-.35)/.35) : 7*Math.sin(Math.PI*(u-.7)/.3));
  }

  const shadows = [];
  if (fx.shadows) {
    shadows.push({x:feet.x, y:feet.y, rx:15*scale*(1-Math.min(.4,pose.lift/80)), alpha:.32*(1-Math.min(.5,pose.lift/60))});
    if (ballFloor) {
      const height = Math.max(0, ballFloor.y-center.y);
      shadows.push({x:ballFloor.x, y:ballFloor.y, rx:diameter*.55*(1-Math.min(.5,height/260)), alpha:.26*(1-Math.min(.75,height/220))});
    }
  }

  // Landing dust: two puffs spreading from the feet for a moment after the jump comes down.
  const dust = [];
  const land = landingMs(actor);
  if (fx.dust && !reduced && land !== null) {
    const flightLength = detach+rules.flightMs;
    const age = phase === 'flight' ? elapsed-land :
      phase === 'bounce' ? raw+flightLength-Math.min(land,flightLength) : -1;
    if (age >= 0 && age < fx.dust.ms) {
      const u = age/fx.dust.ms, at = view.floor(spot);   // stays where the jump came down
      for (const side of [-1,1]) {
        dust.push({x:at.x+side*(7+u*13)*scale, y:at.y-(1+u*3)*scale, r:(4+u*6)*scale, alpha:.55*(1-u)});
      }
    }
  }

  // A miss rattles off the rim: the hoop shivers briefly.
  let rimWobble = 0;
  if (phase === 'bounce' && shot && !shot.hit && fx.rimWobble && !reduced && raw < fx.rimWobble.ms) {
    rimWobble = Math.round(fx.rimWobble.pixels*(1-raw/fx.rimWobble.ms)*Math.sin(raw*.16));
  }

  // From the third make in a row, warm light swells behind the hoop, stronger with the streak.
  let glow = null;
  const goalAge = now-game.goalAt;
  if (fx.streakGlow && !reduced && game.streak >= fx.streakGlow.from && goalAge >= 0 && goalAge < fx.streakGlow.ms) {
    const strength = Math.min(1,(game.streak-fx.streakGlow.from+1)/3);
    glow = {x:rim.x, y:rim.y-view.scale*.6, r:view.scale*(1.2+strength*.8),
      alpha:.42*strength*Math.sin(Math.PI*goalAge/fx.streakGlow.ms)};
  }

  const ghosts = [];
  if (phase === 'flight' && fx.afterimage && !reduced && pose.lift > 6) {
    const {count, stepMs, alpha} = fx.afterimage;
    for (let k = count; k >= 1; k--) {
      ghosts.push({pose:actor.pose('flight', Math.max(0, elapsed-k*stepMs)), alpha:alpha*(1-(k-1)/count)});
    }
  }

  // Backspin: the top of the ball turns away from the hoop while it flies and keeps rolling on the bounces.
  let spin = 0;
  if (!reduced && (scene.ball.spinTurnsPerSecond||0) > 0) {
    const flying = phase === 'flight' && elapsed >= detach ? elapsed-detach : 0;
    const air = phase === 'bounce' ? rules.flightMs+elapsed*.6 : flying;
    spin = -aim*2*Math.PI*scene.ball.spinTurnsPerSecond*Math.max(0,air)/1000;
  }

  return {
    view, feet, rim, face, scale, pose, ghosts, shadows, shake, ripple, dust, rimWobble, glow,
    ball: {x:center.x, y:center.y, diameter, spin, floor:ballFloor},
    netInFront: phase === 'bounce' && shot.hit && bounce < .32,
    // the ball is in the hands: the fingers that close over it are drawn after it
    grip: phase === 'ready' || phase === 'hold' || (phase === 'flight' && elapsed < detach),
    gauge: phase === 'hold' || phase === 'ready' ? {band, power: phase === 'hold' ? elapsed/rules.chargeMs : 0} : null,
    goal: {age: now-game.goalAt, perfect: shot?.perfect}
  };
}
