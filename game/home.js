// Home screen: player cards, outfit buttons and the remembered choice. It knows nothing about the match.
import {initialPlayer, costumesOf, initialCostume} from './players.js?v=8573a3d';

const playerKey = 'two-bounce:player';
const costumeKey = id => 'two-bounce:costume:' + id;
const load = key => { try { return localStorage.getItem(key); } catch { return null; } };
const save = (key, value) => { try { localStorage.setItem(key, value); } catch {} };

function portrait(spec, atlas) {
  const span = document.createElement('span');
  span.className = 'portrait';
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
    for (const costume of list) {
      const chip = document.createElement('button');
      chip.append(portrait(spec, costume.atlas));
      chip.title = costume.name;
      chip.setAttribute('aria-label', costume.name);
      chip.setAttribute('aria-pressed', String(costume.id === chosen));
      chip.onclick = () => choose(id, true, costume.id);
      costumesBox.append(chip);
    }
    costumeName.textContent = list.find(c => c.id === chosen).name;
  }

  async function choose(id, remember, costumeId) {
    const base = roster.get(id);
    // An explicit click picks from storage; the first load may follow ?costume=.
    const costume = initialCostume(base, costumeId ?? (remember ? null : query.get('costume')), load(costumeKey(id)));
    const outfit = costumesOf(base).find(c => c.id === costume);
    for (const [key, card] of cards) card.setAttribute('aria-pressed', String(key === id));
    showCostumes(id, costume);
    const ready = await onChoose({...base, atlas: outfit.atlas}, () => choose(id, remember, costume));
    if (ready && remember) {
      save(playerKey, id);
      if (costumesOf(base).length > 1) save(costumeKey(id), costume);
    }
  }

  choose(initialPlayer(roster, query.get('player'), load(playerKey)), false);
}
