// Character-select stage: the chosen player, large, idling with the ball and showing their jump shot every few
// seconds. Switching players plays a short walk-in. It reuses the game's own sprite code, so a new player or
// outfit appears here with no extra data. Reduced motion shows a still ready pose.
import {loadPlayer} from './player-renderer.js?v=0d03931';
import {createBallSprite} from './art/ball.js?v=0d03931';

// Room above the head for the highest jumper (35 dots) plus the released ball.
const W = 240, H = 176, FLOOR = 158, CENTER = 140;
const IDLE_MS = 2600, WALK_MS = 520, HOLD_MS = 380;

export function createPreview(canvas, ballStyle) {
  const ctx = canvas.getContext('2d');
  const ball = createBallSprite(ballStyle);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let actor = null, spec = null, since = 0, frame = 0, running = true, token = 0;

  function resize() {
    const res = Math.max(1, Math.min(4, Math.ceil(canvas.clientWidth * (devicePixelRatio || 1) / W)));
    if (canvas.width !== W * res) { canvas.width = W * res; canvas.height = H * res; }
    return res;
  }

  // The demo timeline: walk in → idle → set → jump shot → idle → set → …
  function beat(t) {
    if (t < WALK_MS) return {state: 'walk', ms: t * spec.loopMs.walk / WALK_MS, x: -24 * (1 - t / WALK_MS)};
    const flightMs = spec.poses.flight.at(-1)[0] + 120;
    const cycle = IDLE_MS + HOLD_MS + flightMs, u = (t - WALK_MS) % cycle;
    if (u < IDLE_MS) return {state: 'ready', ms: u};
    if (u < IDLE_MS + HOLD_MS) return {state: 'hold', ms: (u - IDLE_MS) * 2.5};
    return {state: 'flight', ms: u - IDLE_MS - HOLD_MS};
  }

  function draw(now) {
    const res = resize();
    ctx.setTransform(res, 0, 0, res, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, W, H);
    if (spec?.hand === 'left') ctx.transform(-1, 0, 0, 1, W, 0);   // left-handers: the whole stage mirrored
    // spotlight and floor
    const light = ctx.createRadialGradient(CENTER, FLOOR - 44, 8, CENTER, FLOOR - 44, 115);
    light.addColorStop(0, 'rgba(255,214,120,.30)');
    light.addColorStop(1, 'rgba(255,214,120,0)');
    ctx.fillStyle = light;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(255,244,211,.10)';
    ctx.fillRect(0, FLOOR, W, H - FLOOR);
    if (!actor) return;

    const step = reduced.matches ? {state: 'ready', ms: 0} : beat(now - since);
    const pose = actor.pose(step.state, step.ms);
    const feet = {x: Math.round(CENTER + (step.x || 0)), y: FLOOR};
    const scale = 1;
    ctx.save();
    ctx.globalAlpha = .35 * (1 - Math.min(.5, pose.lift / 60));
    ctx.fillStyle = '#061615';
    ctx.beginPath();
    ctx.ellipse(feet.x, feet.y, 16 * (1 - Math.min(.4, pose.lift / 80)), 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    actor.draw(ctx, feet, 1, scale, pose);

    // ball: in the hands, then up and away after the release
    const size = 13;
    let hand = actor.hand(feet, 1, scale, pose), alpha = 1;
    if (step.state === 'flight' && step.ms >= spec.releaseMs) {
      const from = actor.hand(feet, 1, scale, actor.pose('flight', spec.releaseMs));
      const t = (step.ms - spec.releaseMs) / 600;
      hand = {x: from.x + 70 * t, y: from.y - 60 * t + 40 * t * t};
      alpha = Math.max(0, 1 - t * 1.4);
    }
    if (alpha > 0) {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.drawImage(ball, hand.x - size / 2, hand.y - size / 2, size, size);
      ctx.restore();
    }
  }

  function loop(now) {
    frame = 0;
    if (!running) return;
    draw(now);
    if (!reduced.matches) frame = requestAnimationFrame(loop);
  }
  const kick = () => { if (!frame && running) frame = requestAnimationFrame(loop); };

  return {
    // Show a player. spec is the same object the game uses (atlas URL or a composed atlasImage).
    async show(next) {
      const mine = ++token;
      const loaded = await loadPlayer(next);
      if (mine !== token) return;
      const sameBody = spec && spec.id === next.id;
      actor = loaded; spec = next;
      since = performance.now() - (sameBody ? WALK_MS : 0); // an outfit change skips the walk-in
      draw(performance.now());
      kick();
    },
    pause() { running = false; cancelAnimationFrame(frame); frame = 0; },
    resume() { running = true; kick(); }
  };
}
