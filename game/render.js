import {makeProjection} from './projection.js?v=8573a3d';
import {loadPlayer} from './player-renderer.js?v=8573a3d';
import {createBallSprite} from './art/ball.js?v=8573a3d';
import {drawCourt} from './art/court.js?v=8573a3d';
import {createHoopLayer} from './art/hoop.js?v=8573a3d';

const width = 400, height = 500;
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

function gauge(ctx, feet, band, power) {
  const x = feet.x > 320 ? feet.x-34 : feet.x+26, y = feet.y-80;
  ctx.fillStyle = '#123a39';
  ctx.fillRect(x,y,14,74);
  ctx.fillStyle = '#99f1aa';
  ctx.fillRect(x,y+74*(1-band.high),14,74*(band.high-band.low));
  const level = y+74*(1-power);
  ctx.strokeStyle = 'white';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x-3,level);
  ctx.lineTo(x+17,level);
  ctx.stroke();
}

function drawGoal(ctx, rim, age, perfect, reduced) {
  const t = age/570;
  if (t >= 1) return;
  ctx.save();
  if (!reduced && t > .30) {
    ctx.save();
    ctx.globalAlpha = .62*(1-t);
    ctx.strokeStyle = '#ffe375';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(rim.x,rim.y,16+42*t,0,Math.PI*2);
    ctx.stroke();
    for (let i=0; i<20; i++) {
      const a = i*Math.PI/10, r = 18+t*(i%2 ? 56 : 38);
      ctx.fillStyle = i%2 ? '#fff4ce' : '#ffc158';
      ctx.beginPath();
      ctx.arc(rim.x+Math.cos(a)*r,rim.y+Math.sin(a)*r,3,0,Math.PI*2);
      ctx.fill();
    }
    ctx.restore();
  }
  ctx.textAlign = 'center';
  ctx.font = 'bold 26px system-ui';
  ctx.fillStyle = '#fff4ce';
  ctx.fillText(perfect ? 'PERFECT' : '골!',rim.x,rim.y-32);
  ctx.restore();
}

export async function createRenderer(canvas, scene, rules) {
  const ctx = canvas.getContext('2d');
  const actor = await loadPlayer(scene.player);
  const ball = createBallSprite(scene.ball);
  const drawHoop = createHoopLayer(width,height);
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  canvas.style.backgroundColor = scene.court.floor;

  return function draw(game, now) {
    const {phase, shot, spot, band} = game;
    const elapsed = Math.max(0, now-game.since);
    const duration = shot?.hit ? rules.madeBounceMs : rules.missBounceMs;
    const bounce = phase === 'bounce' ? Math.min(1,elapsed/duration) : 0;
    const focus = bounce ? between(spot,shot.end,bounce) : spot;
    const view = makeProjection(scene,focus,width,height);
    const feet = view.floor(focus), floor = view.project(0,scene.hoop.depthM);
    const rim = {x:floor.x,y:floor.y-view.lift};
    let face = feet.x > rim.x ? -1 : 1;
    const aim = face;
    const scale = view.scale*scene.player.heightM/scene.player.standingPixels;
    const diameter = view.scale*scene.ball.diameterM, netLength = view.scale*scene.hoop.netLengthM;
    const age = now-game.goalAt;
    const res = Math.max(1,Math.min(4,Math.ceil(canvas.clientWidth*(window.devicePixelRatio||1)/width)));
    if (canvas.width !== width*res || canvas.height !== height*res) {
      canvas.width = width*res;
      canvas.height = height*res;
    }
    ctx.setTransform(res,0,0,res,0,0);
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0,0,width,height);
    drawCourt(ctx,view.project,scene.court,scene.hoop.depthM);
    drawHoop(ctx,view,scene,age,motion.matches);
    let poseState = phase;
    let poseTime = phase === 'ready' && motion.matches ? 0 : elapsed;
    if (phase === 'bounce' && scene.player.poses.walk) {
      const from = view.floor(spot), to = view.floor(shot.end);
      const distanceM = Math.hypot(to.x-from.x,to.y-from.y)/view.scale;
      face = Math.abs(to.x-from.x) < 2 ? face : Math.sign(to.x-from.x);
      poseState = 'walk';
      // Match the feet to screen travel and limit cadence on long rebounds.
      const cycles = Math.min(distanceM/scene.player.strideM,duration/380);
      poseTime = cycles*bounce*scene.player.loopMs.walk;
    }
    const pose = actor.pose(poseState,poseTime);
    actor.draw(ctx,feet,face,scale,pose);
    let center = actor.hand(feet,face,scale,pose);
    const detach = scene.player.releaseMs;
    if (phase === 'flight' && elapsed >= detach) {
      const t = Math.min(1,(elapsed-detach)/rules.flightMs);
      const from = actor.hand(feet,face,scale,actor.pose('flight',detach));
      const target = view.floor({x:shot.contact,y:105});
      center = between(from,{x:target.x,y:target.y-view.lift},t);
      center.y -= 95*Math.sin(Math.PI*t);
    } else if (phase === 'bounce') {
      if (shot.hit) {
        center = madeBasket(bounce,view.floor(shot.end),rim,floor,netLength,diameter,view.scale);
        if (bounce >= .56 && bounce < .76 && !motion.matches) {
          const p = madeBasket(.56,view.floor(shot.end),rim,floor,netLength,diameter,view.scale);
          const u = (bounce-.56)/.2;
          ctx.save();
          ctx.globalAlpha = 1-u;
          ctx.strokeStyle = '#fff0c4';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.ellipse(p.x,p.y+diameter/2,(.22+u*.7)*view.scale,(.08+u*.18)*view.scale,0,0,Math.PI*2);
          ctx.stroke();
          ctx.restore();
        }
      } else {
        center = view.floor(between({x:shot.contact,y:105},shot.end,bounce));
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
    // Backspin: the top of the ball turns away from the hoop while it flies and keeps rolling on the bounces.
    let spin = 0;
    if (!motion.matches && (scene.ball.spinTurnsPerSecond||0) > 0) {
      const flying = phase === 'flight' && elapsed >= detach ? elapsed-detach : 0;
      const air = phase === 'bounce' ? rules.flightMs+elapsed*.6 : flying;
      spin = -aim*2*Math.PI*scene.ball.spinTurnsPerSecond*Math.max(0,air)/1000;
    }
    if (spin) {
      ctx.save();
      ctx.translate(center.x,center.y);
      ctx.rotate(spin);
      ctx.drawImage(ball,-diameter/2,-diameter/2,diameter,diameter);
      ctx.restore();
    } else {
      ctx.drawImage(ball,center.x-diameter/2,center.y-diameter/2,diameter,diameter);
    }
    if (phase === 'bounce' && shot.hit && bounce < .32) drawHoop(ctx,view,scene,age,motion.matches,true);
    if (phase === 'hold' || phase === 'ready') gauge(ctx,feet,band,phase === 'hold' ? elapsed/rules.chargeMs : 0);
    drawGoal(ctx,rim,age,shot?.perfect,motion.matches);
  };
}
