export async function loadPlayer(spec) {
  const image = new Image();
  image.src = spec.atlas;
  await image.decode();
  return {
    pose(state, elapsed) {
      const keys = spec.poses[state] || spec.poses.ready;
      const loop = spec.loopMs?.[state];
      const time = loop ? elapsed % loop : elapsed;
      let cell = keys[0][1];
      for (const [start, next] of keys) {
        if (time < start) break;
        cell = next;
      }
      const jump = spec.jump;
      const t = state === 'flight' ? Math.min(1, Math.max(0, (elapsed - jump.startMs) / jump.durationMs)) : 0;
      return {cell, lift: 4 * jump.peakPixels * t * (1 - t)};
    },
    hand(feet, facing, scale, pose) {
      const [x,y] = spec.hands[pose.cell];
      return {x: feet.x + facing * scale * (x - spec.pivot[0]),
        y: feet.y + scale * (y - spec.pivot[1] - pose.lift)};
    },
    draw(ctx, feet, facing, scale, pose) {
      const size = spec.cellSize;
      ctx.save();
      ctx.translate(feet.x, feet.y - Math.round(pose.lift) * scale);
      ctx.scale(facing * scale, scale);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(image, pose.cell % spec.columns * size, Math.floor(pose.cell / spec.columns) * size,
        size, size, -spec.pivot[0], -spec.pivot[1], spec.drawSize, spec.drawSize);
      ctx.restore();
    }
  };
}
