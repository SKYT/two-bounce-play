async function decodeAtlas(url) {
  const image = new Image();
  image.src = url;
  await image.decode();
  return image;
}

export async function loadPlayer(spec) {
  const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)');
  // Composed outfits arrive as canvases (atlasImage/motionImage); sheet players as URLs.
  const [image, motionImage] = await Promise.all([
    spec.atlasImage ?? decodeAtlas(spec.atlas),
    spec.motionImage ?? (spec.motionAtlas ? decodeAtlas(spec.motionAtlas) : null)
  ]);
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
      const pose = {cell, lift: 4 * jump.peakPixels * t * (1 - t)};
      if (motionImage && !reduced?.matches && state === 'flight') {
        const beat = spec.flightMotion?.find(([from, to]) => elapsed >= from && elapsed < to);
        if (beat) pose.motionCell = beat[2];
      }
      return pose;
    },
    hand(feet, facing, scale, pose) {
      const [x,y] = spec.hands[pose.cell];
      return {x: feet.x + facing * scale * (x - spec.pivot[0]),
        y: feet.y + scale * (y - spec.pivot[1] - pose.lift)};
    },
    draw(ctx, feet, facing, scale, pose) {
      const size = spec.cellSize;
      // On a small backing canvas several source texels can contribute to one screen pixel.
      // Sample them together so thin facial lines survive subpixel movement.
      const downsample = size > spec.drawSize && Math.abs(ctx.getTransform().a) * scale * spec.drawSize < size;
      ctx.save();
      ctx.translate(feet.x, feet.y - Math.round(pose.lift) * scale);
      ctx.scale(facing * scale, scale);
      ctx.imageSmoothingEnabled = downsample;
      const cell = pose.motionCell ?? pose.cell;
      const atlas = pose.motionCell == null ? image : motionImage;
      ctx.drawImage(atlas, cell % spec.columns * size, Math.floor(cell / spec.columns) * size,
        size, size, -spec.pivot[0], -spec.pivot[1], spec.drawSize, spec.drawSize);
      ctx.restore();
    }
  };
}
