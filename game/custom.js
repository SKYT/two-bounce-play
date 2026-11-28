// "My players": players made in the creator from a shared form's parts. A recipe is a few ids; it turns into the
// same data a player.json holds, so the game, the stage and the portraits treat it like any other form player.
// Every choice comes from the form (heads, tops, bottoms) and from the roster (shot rhythm of players on that
// form), so a new part or player drawn by GPT shows up here with no extra data.

export const MAX_CUSTOM = 5;
export const HEIGHTS = [{id: 's', name: '작게', heightM: 1.62}, {id: 'm', name: '보통', heightM: 1.70},
  {id: 'l', name: '크게', heightM: 1.78}];
export const HANDS = [{id: 'right', name: '오른손'}, {id: 'left', name: '왼손'}];
const RHYTHM_KEYS = ['releaseMs', 'jump', 'strideM', 'flightMotion'];

// Forms that players can be made from, with their choices. roster: the loaded Map of players.
export function formsOf(roster) {
  const forms = new Map();
  for (const spec of roster.values()) {
    if (!spec.composed || spec.custom) continue;
    const form = spec.composed;
    if (!forms.has(form.id)) forms.set(form.id, {id: form.id, name: form.name, form, rhythms: []});
    // each original player on the form lends its shot timing as a rhythm preset
    const timing = Object.fromEntries(RHYTHM_KEYS.filter(k => spec[k] !== undefined).map(k => [k, spec[k]]));
    timing.poses = {flight: spec.poses.flight};
    forms.get(form.id).rhythms.push({id: spec.id, name: spec.name + ' 리듬', timing});
  }
  return forms;
}

export function choicesOf(entry) {
  const {form} = entry;
  const list = parts => Object.entries(parts || {}).map(([id, part]) => ({id, name: part.name}));
  return {heads: list(form.heads), tops: list(form.tops), bottoms: list(form.bottoms),
    rhythms: entry.rhythms.map(({id, name}) => ({id, name})), hands: HANDS, heights: HEIGHTS};
}

// The first choice of everything: a valid starting recipe for the creator.
export function defaultRecipe(entry, name = '내 선수') {
  const c = choicesOf(entry);
  return {v: RECIPE_VERSION, form: entry.id, head: entry.form.defaultHead ?? c.heads[0]?.id, top: c.tops[0].id, bottom: c.bottoms[0].id,
    hand: 'right', rhythm: c.rhythms[0].id, height: 'm', name};
}

export function randomRecipe(entry, name, random = Math.random) {
  const c = choicesOf(entry), pick = list => list[Math.floor(random() * list.length)].id;
  return {v: RECIPE_VERSION, form: entry.id, head: c.heads.length ? pick(c.heads) : undefined, top: pick(c.tops), bottom: pick(c.bottoms),
    hand: pick(c.hands), rhythm: pick(c.rhythms), height: pick(c.heights), name};
}

// Is every id still offered by the form and the roster? (a shared code or an old save may name removed parts)
export function validRecipe(recipe, forms) {
  const entry = forms.get(recipe?.form);
  if (!entry) return false;
  const c = choicesOf(entry), has = (list, id) => list.some(x => x.id === id);
  return has(c.tops, recipe.top) && has(c.bottoms, recipe.bottom) && has(c.rhythms, recipe.rhythm) &&
    has(c.hands, recipe.hand) && has(c.heights, recipe.height) && (!c.heads.length || has(c.heads, recipe.head)) &&
    typeof recipe.name === 'string' && recipe.name.trim().length > 0;
}

// player.json-shaped data for a recipe (only after validRecipe).
export function recipeData(recipe, forms) {
  const entry = forms.get(recipe.form);
  const rhythm = entry.rhythms.find(r => r.id === recipe.rhythm);
  return {name: recipe.name.trim().slice(0, 8), status: 'custom', custom: true, form: recipe.form, head: recipe.head,
    hand: recipe.hand, heightM: HEIGHTS.find(h => h.id === recipe.height).heightM,
    ...structuredClone(rhythm.timing), wardrobe: {top: [recipe.top], bottom: [recipe.bottom]}};
}

// Share codes: the recipe as compact JSON in base64url (UTF-8 safe for Korean names).
const SHORT = {form: 'f', head: 'h', top: 't', bottom: 'b', hand: 's', rhythm: 'r', height: 'k', name: 'n'};
export function encodeRecipe(recipe) {
  const compact = Object.fromEntries(Object.entries(SHORT).filter(([k]) => recipe[k] !== undefined).map(([k, s]) => [s, recipe[k]]));
  const bytes = new TextEncoder().encode(JSON.stringify({v: RECIPE_VERSION, ...compact}));
  let text = '';
  for (const b of bytes) text += String.fromCharCode(b);
  return btoa(text).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}
export function decodeRecipe(code) {
  try {
    const text = atob(code.replaceAll('-', '+').replaceAll('_', '/'));
    const data = JSON.parse(new TextDecoder().decode(Uint8Array.from(text, c => c.charCodeAt(0))));
    if (!(data.v >= 1 && data.v <= RECIPE_VERSION)) return null;
    const recipe = Object.fromEntries(Object.entries(SHORT).filter(([, s]) => data[s] !== undefined).map(([k, s]) => [k, data[s]]));
    return migrateRecipe({...recipe, v: data.v});
  } catch {
    return null;
  }
}

// Recipe versions. v1 recipes (saved and shared before 2026-11-28 evening) named lara's mannequin "female-normal";
// it is now "female-healthy", and "female-normal" is the saemi-based mannequin. Old recipes move once.
export const RECIPE_VERSION = 2;
const RENAMED_V1 = {'female-normal': 'female-healthy'};
export function migrateRecipe(recipe) {
  if (!recipe || (recipe.v ?? 1) >= RECIPE_VERSION) return recipe;
  return {...recipe, form: RENAMED_V1[recipe.form] ?? recipe.form, v: RECIPE_VERSION};
}

// Saved recipes get ids my-1 … my-5; a new one takes the first free number.
export function nextCustomId(saved) {
  for (let n = 1; n <= MAX_CUSTOM; n++) if (!saved.some(r => r.id === 'my-' + n)) return 'my-' + n;
  return null;
}
