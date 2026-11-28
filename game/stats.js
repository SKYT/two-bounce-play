// Character-select numbers from the data the game already uses: jump height (peak lift against the standing
// height) and release speed (ms from the start of the shot to the ball leaving the hand). Bars are scaled to the
// roster, so a new player lands between the others with no extra data.
export function playerStats(spec) {
  const jump = spec.jump;
  if (!jump || !spec.standingPixels || !spec.heightM) return null;
  return {
    jumpCm: Math.round(jump.peakPixels / spec.standingPixels * spec.heightM * 100),
    releaseMs: spec.releaseMs,
    heightCm: Math.round(spec.heightM * 100)
  };
}

// {id: {jump: 0..1, release: 0..1}} with .3 for the lowest and 1 for the best in the roster (quick release = high).
export function rosterBars(specs) {
  const stats = specs.map(s => [s.id, playerStats(s)]).filter(([, v]) => v);
  const span = (key, flip) => {
    const values = stats.map(([, v]) => v[key]), lo = Math.min(...values), hi = Math.max(...values);
    return v => .3 + .7 * (hi === lo ? 1 : (flip ? hi - v[key] : v[key] - lo) / (hi - lo));
  };
  const jump = span('jumpCm', false), release = span('releaseMs', true), height = span('heightCm', false);
  return Object.fromEntries(stats.map(([id, v]) => [id, {...v, jump: jump(v), release: release(v), height: height(v)}]));
}

// The stage accent: the most common strongly coloured pixel of the outfit (skin and outlines are less saturated).
export function accentOf(pixels) {
  const counts = new Map();
  for (let i = 0; i < pixels.length; i += 4) {
    if (pixels[i + 3] < 200) continue;
    const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
    const hi = Math.max(r, g, b), lo = Math.min(r, g, b);
    if (hi < 60 || hi > 245 || (hi - lo) / hi < .52) continue;
    const key = (r >> 5) << 6 | (g >> 5) << 3 | (b >> 5);
    const slot = counts.get(key) || {n: 0, r: 0, g: 0, b: 0};
    slot.n++; slot.r += r; slot.g += g; slot.b += b;
    counts.set(key, slot);
  }
  let best = null;
  for (const slot of counts.values()) if (!best || slot.n > best.n) best = slot;
  return best && best.n >= 12 ? [best.r / best.n, best.g / best.n, best.b / best.n].map(Math.round) : null;
}
