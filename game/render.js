import {loadPlayer} from './player-renderer.js?v=28d8d0e';
import {createBallSprite} from './art/ball.js?v=28d8d0e';
import {drawCourt} from './art/court.js?v=28d8d0e';
import {createHoopLayer} from './art/hoop.js?v=28d8d0e';

import {layoutFrame, COURT_SIZE} from './frame.js?v=28d8d0e';
export {hitStop} from './frame.js?v=28d8d0e';

const {width, height} = COURT_SIZE;

function shadow(ctx, x, y, rx, alpha) {
  if (alpha <= 0 || rx <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#061615';
  ctx.beginPath();
  ctx.ellipse(x, y, rx, rx*.34, 0, 0, Math.PI*2);
  ctx.fill();
  ctx.restore();
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
  // Left-handed players use the right-handed art mirrored together with the whole court (hoop on the left).
  // A mirrored right-hander is a left-hander, so no extra sprites are needed. Text is drawn unmirrored.
  const mirror = scene.player.hand === 'left';

  return function draw(game, now) {
    const reduced = motion.matches;
    const f = layoutFrame({game, now, scene, rules, actor, reduced});
    const res = Math.max(1,Math.min(4,Math.ceil(canvas.clientWidth*(window.devicePixelRatio||1)/width)));
    if (canvas.width !== width*res || canvas.height !== height*res) {
      canvas.width = width*res;
      canvas.height = height*res;
    }
    ctx.setTransform(res,0,0,res,0,0);
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0,0,width,height);
    if (f.shake) ctx.translate(f.shake.x,f.shake.y);
    if (mirror) ctx.transform(-1,0,0,1,width,0);
    drawCourt(ctx,f.view.project,scene.court,scene.hoop.depthM);
    if (f.glow) {
      const g = ctx.createRadialGradient(f.glow.x,f.glow.y,0,f.glow.x,f.glow.y,f.glow.r);
      g.addColorStop(0,`rgba(255,214,140,${f.glow.alpha})`);
      g.addColorStop(1,'rgba(255,214,140,0)');
      ctx.fillStyle = g;
      ctx.fillRect(f.glow.x-f.glow.r,f.glow.y-f.glow.r,f.glow.r*2,f.glow.r*2);
    }
    ctx.save();
    ctx.translate(0,f.rimWobble);
    drawHoop(ctx,f.view,scene,f.goal.age,reduced);
    ctx.restore();
    if (f.ripple) {
      ctx.save();
      ctx.globalAlpha = f.ripple.alpha;
      ctx.strokeStyle = '#fff0c4';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(f.ripple.x,f.ripple.y,f.ripple.rx,f.ripple.ry,0,0,Math.PI*2);
      ctx.stroke();
      ctx.restore();
    }
    for (const s of f.shadows) shadow(ctx,s.x,s.y,s.rx,s.alpha);
    for (const d of f.dust) {
      ctx.save();
      ctx.globalAlpha = d.alpha;
      ctx.fillStyle = '#ece6d2';
      ctx.beginPath();
      ctx.ellipse(d.x,d.y,d.r,d.r*.55,0,0,Math.PI*2);
      ctx.fill();
      ctx.restore();
    }
    for (const ghost of f.ghosts) {
      ctx.save();
      ctx.globalAlpha = ghost.alpha;
      actor.draw(ctx,f.feet,f.face,f.scale,ghost.pose);
      ctx.restore();
    }
    actor.draw(ctx,f.feet,f.face,f.scale,f.pose);
    const {x, y, diameter, spin} = f.ball;
    if (spin) {
      ctx.save();
      ctx.translate(x,y);
      ctx.rotate(spin);
      ctx.drawImage(ball,-diameter/2,-diameter/2,diameter,diameter);
      ctx.restore();
    } else {
      ctx.drawImage(ball,x-diameter/2,y-diameter/2,diameter,diameter);
    }
    if (f.grip) actor.drawGrip(ctx,f.feet,f.face,f.scale,f.pose);
    if (f.netInFront) drawHoop(ctx,f.view,scene,f.goal.age,reduced,true);
    if (f.gauge) gauge(ctx,f.feet,f.gauge.band,f.gauge.power);
    if (mirror) ctx.transform(-1,0,0,1,width,0);
    drawGoal(ctx,mirror ? {...f.rim, x: width-f.rim.x} : f.rim,f.goal.age,f.goal.perfect,reduced);
  };
}
