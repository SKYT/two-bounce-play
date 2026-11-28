// Creator screen: make "my player" from a shared form's parts. Every change is composed live on its own stage
// with the game's own code. Saving stores the recipe on the device; the page reloads with the new player chosen.
import {createPreview} from './preview.js?v=e2f48aa';
import {formsOf, choicesOf, defaultRecipe, randomRecipe, validRecipe, recipeData, nextCustomId, MAX_CUSTOM, bodyLabel,
  switchForm} from './custom.js?v=e2f48aa';
import {resolveFormPlayer, outfitArt} from './players.js?v=e2f48aa';
import {rosterBars} from './stats.js?v=e2f48aa';
import {showStats} from './home.js?v=e2f48aa';
import {stored} from './storage.js?v=e2f48aa';

const GROUPS = [['head', 'heads', '머리'], ['top', 'tops', '상의'], ['topColor', 'colors', '상의 색'], ['bottom', 'bottoms', '하의'],
  ['bottomColor', 'colors', '하의 색'], ['hand', 'hands', '슛 손'], ['rhythm', 'rhythms', '슛 리듬'], ['height', 'heights', '키']];

export function setupCreator({roster, ballStyle, els, onDone, onClose}) {
  const forms = formsOf(roster);
  const preview = createPreview(els.stage, ballStyle);
  preview.pause();
  let recipe = null, editing = null, turn = 0;

  function group(label, options, isOn, pick) {
    const box = document.createElement('fieldset');
    const legend = document.createElement('legend');
    legend.textContent = label;
    box.append(legend);
    for (const option of options) {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = option.name;
      if (option.swatch) { button.classList.add('swatch'); button.style.setProperty('--swatch', option.swatch); }
      button.setAttribute('aria-pressed', String(isOn(option)));
      button.onclick = () => pick(option);
      box.append(button);
    }
    els.fields.append(box);
  }

  function fields() {
    const entry = forms.get(recipe.form), choices = choicesOf(entry);
    els.fields.replaceChildren();
    // body type = which shared form; the same part ids carry over to the other body
    if (forms.size > 1) {
      group('체형', [...forms.values()].map(f => ({id: f.id, name: bodyLabel(f.name)})), o => o.id === recipe.form,
        o => { recipe = switchForm(recipe, forms.get(o.id)); update(); });
    }
    for (const [key, list, label] of GROUPS) {
      if (!choices[list].length) continue;
      // colour '' (as drawn) is stored as no colour at all
      group(label, choices[list], o => (recipe[key] ?? '') === o.id,
        o => { recipe = {...recipe, [key]: o.id || undefined}; update(); });
    }
  }

  async function update() {
    fields();
    els.nameInput.value = recipe.name;
    els.name.textContent = recipe.name || '이름 없음';
    const mine = ++turn;
    const data = recipeData({...recipe, name: recipe.name || '미리보기'}, forms);
    const spec = resolveFormPlayer('my-preview', data, forms.get(recipe.form).form);
    showStats(els.stats, rosterBars([...[...roster.values()].filter(s => s.id !== 'my-preview'), spec])['my-preview']);
    let art;
    try { art = await outfitArt(spec, spec.costumes[0].id); } catch { els.note.textContent = '조합을 만들지 못했어요'; return; }
    if (mine !== turn) return;
    els.note.textContent = '';
    preview.show({...spec, ...art}).catch(() => {});
  }

  els.nameInput.oninput = () => {
    recipe = {...recipe, name: els.nameInput.value.slice(0, 8)};
    els.name.textContent = recipe.name || '이름 없음';
  };
  els.random.onclick = () => { recipe = randomRecipe(forms.get(recipe.form), recipe.name); update(); };
  els.cancel.onclick = () => close();
  els.save.onclick = () => {
    const name = recipe.name.trim();
    if (!name) { els.note.textContent = '이름을 정해 주세요'; els.nameInput.focus(); return; }
    const saved = stored.customs();
    const id = editing ?? nextCustomId(saved);
    if (!id) { els.note.textContent = `내 선수는 ${MAX_CUSTOM}명까지 저장할 수 있어요`; return; }
    const entry = {...recipe, name, id};
    if (!validRecipe(entry, forms)) { els.note.textContent = '지금은 고를 수 없는 부품이 있어요'; return; }
    stored.setCustoms([...saved.filter(r => r.id !== id), entry]);
    stored.setPlayer(id);
    onDone(id);
  };

  function close() {
    preview.pause();
    onClose();
  }

  return {
    // recipe: a saved recipe to edit (with its id), a shared one to start from, or nothing for a new player
    open(start) {
      const first = forms.values().next().value;
      if (!first) return false;
      const saved = stored.customs();
      editing = start?.id && saved.some(r => r.id === start.id) ? start.id : null;
      const fallback = defaultRecipe(first, '내 선수 ' + (saved.length + 1));
      recipe = start && validRecipe({...start, name: start.name || 'x'}, forms) ? {...fallback, ...start} : fallback;
      delete recipe.id;
      els.title.textContent = editing ? '내 선수 고치기' : '새 선수 만들기';
      preview.resume();
      update();
      return true;
    },
    pause: () => preview.pause(),
    resume: () => preview.resume(),
    forms
  };
}
