// Home screen: player cards, outfit buttons and the remembered choice. It knows nothing about the match.
import {initialPlayer, costumesOf, initialCostume, outfitArt} from './players.js?v=866d6cd';

const playerKey = 'two-bounce:player';
const costumeKey = id => 'two-bounce:costume:' + id;
const load = key => { try { return localStorage.getItem(key); } catch { return null; } };
const save = (key, value) => { try { localStorage.setItem(key, value); } catch {} };

// url may be a promise: composed outfits are built in the browser before they can be shown.
function portrait(spec, url) {
  const span = document.createElement('span');
  span.className = 'portrait';
  if (spec.cellSize > spec.drawSize) span.style.imageRendering = 'auto';
  span.setAttribute('aria-hidden', 'true');
  span.style.backgroundSize = (spec.columns * 100) + '% auto';
  Promise.resolve(url).then(href => { span.style.backgroundImage = 'url("' + href + '")'; }).catch(() => {});
  return span;
}
const firstArt = spec => outfitArt(spec, costumesOf(spec)[0].id).then(art => art.url);

// onChoose(id, costumeId, spec) runs for every choice; it returns a promise that settles when the player is ready.
// remember() stores the choice once the player has loaded.
export function setupHome({roster, cardsBox, costumesBox, costumeName, query, onChoose}) {
  const cards = new Map();
  for (const [id, spec] of roster) {
    const card = document.createElement('button');
    card.append(portrait(spec, firstArt(spec)), spec.name);
    card.onclick = () => choose(id, true);
    cards.set(id, card);
    cardsBox.append(card);
  }

  function showCostumes(id, chosen) {
    const spec = roster.get(id), list = costumesOf(spec);
    costumesBox.replaceChildren();
    costumesBox.hidden = list.length < 2;
    if (costumesBox.hidden) return;
    const selected = list.find(c => c.id === chosen);
    costumeName.textContent = selected.name;
    if (spec.wardrobe) {
      const card = cards.get(id);
      card.replaceChildren(portrait(spec, outfitArt(spec, selected.id).then(art => art.url)), spec.name);
      for (const [slot, label] of [['top', '상의'], ['bottom', '하의']]) {
        const group = document.createElement('fieldset');
        const legend = document.createElement('legend');
        legend.textContent = label;
        group.append(legend);
        for (const [part, name] of Object.entries(spec.wardrobe[slot])) {
          const other = slot === 'top' ? 'bottom' : 'top';
          const outfit = list.find(c => c[slot] === part && c[other] === selected[other]);
          const button = document.createElement('button');
          button.textContent = name;
          button.disabled = !outfit;
          button.setAttribute('aria-pressed', String(selected[slot] === part));
          if (outfit) button.onclick = () => choose(id, true, outfit.id);
          group.append(button);
        }
        costumesBox.append(group);
      }
      return;
    }
    for (const costume of list) {
      const chip = document.createElement('button');
      chip.append(portrait(spec, outfitArt(spec, costume.id).then(art => art.url)));
      chip.title = costume.name;
      chip.setAttribute('aria-label', costume.name);
      chip.setAttribute('aria-pressed', String(costume.id === chosen));
      chip.onclick = () => choose(id, true, costume.id);
      costumesBox.append(chip);
    }
  }

  let latest = 0;
  async function choose(id, remember, costumeId) {
    const turn = ++latest;
    const base = roster.get(id);
    // An explicit click picks from storage; the first load may follow ?costume=.
    const costume = initialCostume(base, costumeId ?? (remember ? null : query.get('costume')), load(costumeKey(id)));
    for (const [key, card] of cards) card.setAttribute('aria-pressed', String(key === id));
    showCostumes(id, costume);
    const retry = () => choose(id, remember, costume);
    let art;
    try { art = await outfitArt(base, costume); } catch { art = null; }
    if (turn !== latest) return; // a newer choice was made while this outfit was being built
    if (!art) return onChoose(null, retry);
    const ready = await onChoose({...base, ...art}, retry);
    if (ready && remember) {
      save(playerKey, id);
      if (costumesOf(base).length > 1) save(costumeKey(id), costume);
    }
  }

  choose(initialPlayer(roster, query.get('player'), load(playerKey)), false);
}
