// Colour variants of a garment: the same top or bottom in another colour, with no new art. Only the part's own
// painted pixels (patch alpha 255) change; shading, outlines and white trim keep their lightness. A coloured part
// is turned to the target hue; a grey one (graphite trousers) is tinted, leaving near-white trim and near-black
// outlines alone.

export const COLORS = [
  {id: 'red', name: '빨강', hue: 356, swatch: '#d8434a'},
  {id: 'orange', name: '주황', hue: 24, swatch: '#ec8a3c'},
  {id: 'yellow', name: '노랑', hue: 48, swatch: '#e8c440'},
  {id: 'green', name: '초록', hue: 135, swatch: '#4aa45e'},
  {id: 'teal', name: '청록', hue: 178, swatch: '#33a7a3'},
  {id: 'blue', name: '파랑', hue: 218, swatch: '#3f72d8'},
  {id: 'purple', name: '보라', hue: 276, swatch: '#8a56c8'},
  {id: 'pink', name: '분홍', hue: 330, swatch: '#e06aa6'},
];
const SATURATED = 0.25, GREY_PART = 0.15, TINT = 0.38, DARK = 0.3, DARK_TARGET = 0.4;

function toHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, d = max - min;
  if (!d) return [0, 0, l];
  const s = d / (1 - Math.abs(2 * l - 1));
  let h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [(h * 60 + 360) % 360, s, l];
}

function toRgb(h, s, l) {
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = l - c / 2;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] :
    h < 300 ? [x, 0, c] : [c, 0, x];
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}

// The garment's own colour: the saturation-weighted circular mean hue of its painted pixels, and how colourful it is.
export function mainColor(part) {
  let x = 0, y = 0, weight = 0, count = 0, sat = 0, light = 0;
  const {data} = part;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] !== 255) continue;
    const [h, s, l] = toHsl(data[i], data[i + 1], data[i + 2]);
    count++; sat += s; light += l;
    if (s < SATURATED || l < 0.08 || l > 0.92) continue;
    x += Math.cos(h * Math.PI / 180) * s; y += Math.sin(h * Math.PI / 180) * s; weight += s;
  }
  const hue = weight ? (Math.atan2(y, x) * 180 / Math.PI + 360) % 360 : 0;
  return {hue, saturation: count ? sat / count : 0, lightness: count ? light / count : 0};
}

// A recoloured copy of a part patch ({width, height, data}); unknown colour ids give the part back unchanged.
export function recolor(part, colorId) {
  const target = COLORS.find(c => c.id === colorId);
  if (!part || !target) return part;
  const {hue, saturation, lightness} = mainColor(part), grey = saturation < GREY_PART;
  // a dark garment (navy top) would only turn a darker shade of the new colour: lift it so the colour reads
  const lift = lightness < DARK ? Math.min(2.2, DARK_TARGET / Math.max(lightness, 0.05)) : 1;
  const out = new Uint8ClampedArray(part.data);
  for (let i = 0; i < out.length; i += 4) {
    if (out[i + 3] !== 255) continue;
    const [h, s, l] = toHsl(out[i], out[i + 1], out[i + 2]);
    let next;
    if (grey) {
      if (l < 0.07 || l > 0.82) continue;                      // outline and white trim stay
      next = toRgb(target.hue, Math.max(s, TINT), Math.min(0.8, l * lift));
    } else {
      if ((s < 0.12 && lift === 1) || l > 0.88 || l < 0.05) continue;   // greys, white trim and outline stay
      // a dark garment is coloured outright; a bright one turns as a whole, so accents keep their relation
      next = lift > 1 ? toRgb(target.hue, Math.max(s, 0.55), Math.min(0.85, l * lift))
        : toRgb((h - hue + target.hue + 360) % 360, s, l);
    }
    out[i] = next[0]; out[i + 1] = next[1]; out[i + 2] = next[2];
  }
  return {width: part.width, height: part.height, data: out};
}
