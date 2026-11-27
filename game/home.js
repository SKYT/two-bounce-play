// Home screen: player cards, outfit buttons and the remembered choice. It knows nothing about the match.
import {initialPlayer, costumesOf, initialCostume} from './players.js?v=0cfd164';

const playerKey = 'two-bounce:player';
const costumeKey = id => 'two-bounce:costume:' + id;
const load = key => { try { return localStorage.getItem(key); } catch { return null; } };
const save = (key, value) => { try { localStorage.setItem(key, value); } catch {} };

function portrait(spec, atlas) {
  const span = document.createElement('span');
  span.className = 'portrait';
  if (spec.cellSize > spec.drawSize) span.style.imageRendering = 'auto';
  span.setAttribute('aria-hidden', 'true');
  span.style.backgroundImage = 'url("' + atlas.href + '")';
  span.style.backgroundSize = (spec.columns * 100) + '% auto';
  return span;
}

// onChoose(id, costumeId, spec) runs for every choice; it returns a promise that settles when the player is ready.
// remember() stores the choice once the player has loaded.
export function setupHome({roster, cardsBox, costumesBox, costumeName, query, onChoose}) {
  const cards = new Map();
  for (const [id, spec] of roster) {
    const card = document.createElement('button');
    card.append(portrait(spec, spec.atlas), spec.name);
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
      card.replaceChildren(portrait(spec, selected.atlas), spec.name);
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
      chip.append(portrait(spec, costume.atlas));
      chip.title = costume.name;
      chip.setAttribute('aria-label', costume.name);
      chip.setAttribute('aria-pressed', String(costume.id === chosen));
      chip.onclick = () => choose(id, true, costume.id);
      costumesBox.append(chip);
    }
  }

  async function choose(id, remember, costumeId) {
    const base = roster.get(id);
    // An explicit click picks from storage; the first load may follow ?costume=.
    const costume = initialCostume(base, costumeId ?? (remember ? null : query.get('costume')), load(costumeKey(id)));
    const outfit = costumesOf(base).find(c => c.id === costume);
    for (const [key, card] of cards) card.setAttribute('aria-pressed', String(key === id));
    showCostumes(id, costume);
    const ready = await onChoose({...base, atlas: outfit.atlas, motionAtlas: outfit.motionAtlas}, () => choose(id, remember, costume));
    if (ready && remember) {
      save(playerKey, id);
      if (costumesOf(base).length > 1) save(costumeKey(id), costume);
    }
  }

  choose(initialPlayer(roster, query.get('player'), load(playerKey)), false);
}
