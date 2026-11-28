// Mix-and-match outfits are assembled in the game from a shared form (game/forms/<form>/):
// body → top patch → bottom patch → high-density head, plus the takeoff/landing secondary-motion frames.
// The pure functions work on {width, height, data} RGBA images so Node tests can compare them with
// scripts/compose-mannequin.py pixel for pixel. Only composeOutfit() touches the DOM.

// Patch alpha: 0 keeps the pixel underneath, 128 clears it, 255 replaces it.
export function applyPatch(base, part) {
  const out = new Uint8ClampedArray(base.data);
  const src = part.data;
  for (let i = 0; i < out.length; i += 4) {
    const a = src[i + 3];
    if (a === 128) { out[i] = out[i + 1] = out[i + 2] = out[i + 3] = 0; }
    else if (a === 255) { out[i] = src[i]; out[i + 1] = src[i + 1]; out[i + 2] = src[i + 2]; out[i + 3] = 255; }
  }
  return {width: base.width, height: base.height, data: out};
}

export function upscale(image, k) {
  const width = image.width * k, height = image.height * k, out = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    const row = Math.floor(y / k) * image.width;
    for (let x = 0; x < width; x++) {
      const s = (row + Math.floor(x / k)) * 4, d = (y * width + x) * 4;
      out[d] = image.data[s]; out[d + 1] = image.data[s + 1]; out[d + 2] = image.data[s + 2]; out[d + 3] = image.data[s + 3];
    }
  }
  return {width, height, data: out};
}

// Copy `detail` into `target` wherever `mask` is set; boxes map a source cell to a target cell.
function pasteMasked(target, detail, mask, from = [0, 0, detail.width, detail.height], to = [0, 0]) {
  const [sx, sy, w, h] = from, [tx, ty] = to;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const s = ((sy + y) * detail.width + sx + x) * 4;
      if (!isSet(mask, s)) continue;
      const d = ((ty + y) * target.width + tx + x) * 4;
      target.data[d] = detail.data[s]; target.data[d + 1] = detail.data[s + 1];
      target.data[d + 2] = detail.data[s + 2]; target.data[d + 3] = detail.data[s + 3];
    }
  }
}
// Masks are 1-bit PNGs: a set pixel is white (and opaque, if the decoder adds alpha).
const isSet = (mask, i) => mask.data[i] > 0;

export function addHead(sheet, head, scale, cells, cellSize, columns) {
  const out = upscale(sheet, scale);
  if (!cells) { pasteMasked(out, head.image, head.mask); return out; }
  const size = cellSize * scale;
  cells.forEach((cell, index) => {
    pasteMasked(out, head.image, head.mask,
      [cell % columns * size, Math.floor(cell / columns) * size, size, size],
      [index % columns * size, Math.floor(index / columns) * size]);
  });
  return out;
}

// Same arithmetic as scripts/mannequin_motion.py: an elliptical falloff shifts movable pixels vertically.
export function bakeMotion(outfit, mask, motion, amplitude, size, columns) {
  const frames = motion.frames, rows = Math.ceil(frames.length / columns);
  const width = columns * size, height = rows * size, out = new Uint8ClampedArray(width * height * 4);
  const [rx, ry] = motion.radius;
  const at = (img, x, y) => (y * img.width + x) * 4;
  frames.forEach(([cell, cx, cy, direction], index) => {
    const ox = cell % columns * size, oy = Math.floor(cell / columns) * size;
    const dx = index % columns * size, dy = Math.floor(index / columns) * size;
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const s = at(outfit, ox + x, oy + y), d = (dy + y) * width * 4 + (dx + x) * 4;
      out.set(outfit.data.subarray(s, s + 4), d);
    }
    for (let y = cy - ry; y <= cy + ry; y++) {
      for (let x = cx - rx; x <= cx + rx; x++) {
        const weight = Math.max(0, 1 - ((x - cx) / rx) ** 2 - ((y - cy) / ry) ** 2);
        const shift = Math.floor(amplitude * weight + 0.5);
        const sampleY = y - direction * shift;
        if (!shift || x < 0 || x >= size || y < 0 || y >= size || sampleY < 0 || sampleY >= size) continue;
        if (!mask.data[at(mask, ox + x, oy + y) + 3] || !mask.data[at(mask, ox + x, oy + sampleY) + 3]) continue;
        const s = at(outfit, ox + x, oy + sampleY), d = (dy + y) * width * 4 + (dx + x) * 4;
        out.set(outfit.data.subarray(s, s + 4), d);
      }
    }
  });
  return {width, height, data: out};
}

// form: parsed form.json with images already decoded. outfit: {top, bottom, head}.
export function buildOutfit(form, outfit) {
  const {rig, images} = form;
  const uniform = applyPatch(applyPatch(images.body, images.tops[outfit.top]), images.bottoms[outfit.bottom]);
  const head = form.heads?.[outfit.head ?? form.defaultHead] && {image: images.heads[outfit.head ?? form.defaultHead],
    mask: images.headMasks[outfit.head ?? form.defaultHead]};
  const scale = head ? form.detailScale : 1;
  const sheet = head ? addHead(uniform, head, scale) : uniform;
  let motion = null;
  const amplitude = form.motion?.tops?.[outfit.top];
  if (amplitude && images.motionMasks[outfit.top]) {
    const strip = bakeMotion(uniform, images.motionMasks[outfit.top], form.motion, amplitude, rig.cellSize, rig.columns);
    motion = head ? addHead(strip, head, scale, form.motion.frames.map(f => f[0]), rig.cellSize, rig.columns) : strip;
  }
  return {sheet, motion, cellSize: rig.cellSize * scale};
}

// ---- browser side ----

async function decode(url) {
  const blob = await (await fetch(url)).blob();
  // No colour management or premultiplication: patch alphas (0/128/255) and colours must survive exactly.
  const bitmap = await createImageBitmap(blob, {premultiplyAlpha: 'none', colorSpaceConversion: 'none'});
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  const ctx = canvas.getContext('2d', {willReadFrequently: true});
  ctx.drawImage(bitmap, 0, 0);
  const {data} = ctx.getImageData(0, 0, bitmap.width, bitmap.height);
  return {width: bitmap.width, height: bitmap.height, data};
}

function toCanvas(image) {
  const canvas = document.createElement('canvas');
  canvas.width = image.width; canvas.height = image.height;
  canvas.getContext('2d').putImageData(new ImageData(image.data, image.width, image.height), 0, 0);
  return canvas;
}

const decoded = new Map(), outfitCache = new Map();
const decodeOnce = url => {
  if (!decoded.has(url.href)) decoded.set(url.href, decode(url));
  return decoded.get(url.href);
};

// Fetch only what this outfit uses: body, its top and bottom, its head and the top's motion mask.
async function partsFor(form, outfit) {
  const head = outfit.head ?? form.defaultHead, {urls} = form;
  const one = async (map, id) => (map[id] ? {[id]: await decodeOnce(map[id])} : {});
  const [body, tops, bottoms, heads, headMasks, motionMasks] = await Promise.all([
    decodeOnce(urls.body), one(urls.tops, outfit.top), one(urls.bottoms, outfit.bottom),
    one(urls.heads, head), one(urls.headMasks, head), one(urls.motionMasks, outfit.top)]);
  return {...form, images: {body, tops, bottoms, heads, headMasks, motionMasks}};
}

// After a form player is shown, fetch the rest of their wardrobe in the background so switching is instant.
export function prefetchParts(form, outfits) {
  const later = globalThis.requestIdleCallback || (fn => setTimeout(fn, 300));
  later(() => outfits.forEach(outfit => partsFor(form, outfit).catch(() => {})));
}

// Returns canvases ready for drawImage plus an object URL for CSS portraits; cached per outfit.
export async function composeOutfit(form, outfit) {
  const key = form.base.href + '|' + outfit.top + '|' + outfit.bottom + '|' + (outfit.head ?? '');
  if (!outfitCache.has(key)) {
    outfitCache.set(key, (async () => {
      const built = buildOutfit(await partsFor(form, outfit), outfit);
      const sheet = toCanvas(built.sheet);
      let url; // PNG encoding is slow: only when a portrait actually needs this outfit as an image URL
      return {sheet, motion: built.motion && toCanvas(built.motion), cellSize: built.cellSize,
        get url() {
          url ??= new Promise(resolve => sheet.toBlob(resolve, 'image/png')).then(blob => URL.createObjectURL(blob));
          return url;
        }};
    })());
  }
  return outfitCache.get(key);
}
