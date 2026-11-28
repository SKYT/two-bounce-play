// Home screen: player cards, outfit buttons and the remembered choice. It knows nothing about the match.
import {initialPlayer, costumesOf, initialCostume, outfitArt, prefetchWardrobe} from './players.js?v=0d03931';

import {stored} from './storage.js?v=0d03931';

// A portrait comes from the published portrait sheet when it exists, otherwise from the player's own sheet
// (url may be a promise: composed outfits are built in the browser first).
function portraitFromSheet(sheet, key) {
  const index = sheet?.entries[key];
  if (index == null) return null;
  const span = document.createElement('span');
  span.className = 'portrait';
  span.setAttribute('aria-hidden', 'true');
  const col = index % sheet.columns, row = Math.floor(index / sheet.columns);
  span.style.backgroundImage = 'url("' + sheet.url.href + '")';
  span.style.backgroundSize = (sheet.columns * 100) + '% ' + (sheet.rows * 100) + '%';
  span.style.backgroundPosition = (sheet.columns > 1 ? col / (sheet.columns - 1) * 100 : 0) + '% ' +
    (sheet.rows > 1 ? row / (sheet.rows - 1) * 100 : 0) + '%';
  return span;
}

function portraitFromAtlas(spec, url) {
  const span = document.createElement('span');
  span.className = 'portrait';
  if (spec.cellSize > spec.drawSize) span.style.imageRendering = 'auto';
  span.setAttribute('aria-hidden', 'true');
  span.style.backgroundSize = (spec.columns * 100) + '% auto';
  Promise.resolve(url).then(href => { span.style.backgroundImage = 'url("' + href + '")'; }).catch(() => {});
  return span;
}

// onChoose(id, costumeId, spec) runs for every choice; it returns a promise that settles when the player is ready.
// remember() stores the choice once the player has loaded.
export function setupHome({roster, portraits, preview, stageName, stageOutfit, cardsBox, costumesBox, costumeName, query, onChoose}) {
  const portrait = (id, costumeId) => {
    const spec = roster.get(id), costume = costumeId ?? costumesOf(spec)[0].id;
    return portraitFromSheet(portraits, costume === 'base' ? id : id + '/' + costume) ||
      portraitFromSheet(portraits, id) ||
      portraitFromAtlas(spec, outfitArt(spec, costume).then(art => art.url));
  };
  const cards = new Map();
  for (const [id, spec] of roster) {
    const card = document.createElement('button');
    card.append(portrait(id), spec.name);
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
      card.replaceChildren(portrait(id, selected.id), spec.name);
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
      chip.append(portrait(id, costume.id));
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
    const costume = initialCostume(base, costumeId ?? (remember ? null : query.get('costume')), stored.costume(id));
    for (const [key, card] of cards) card.setAttribute('aria-pressed', String(key === id));
    showCostumes(id, costume);
    const retry = () => choose(id, remember, costume);
    let art;
    try { art = await outfitArt(base, costume); } catch { art = null; }
    if (turn !== latest) return; // a newer choice was made while this outfit was being built
    if (!art) return onChoose(null, retry);
    if (preview) {
      const outfit = costumesOf(base).find(c => c.id === costume);
      stageName.textContent = base.name;
      stageOutfit.textContent = costumesOf(base).length > 1 ? outfit.name : '';
      preview.show({...base, ...art}).catch(() => {});
    }
    const ready = await onChoose({...base, ...art}, retry);
    if (ready) prefetchWardrobe(base);
    if (ready && remember) {
      stored.setPlayer(id);
      if (costumesOf(base).length > 1) stored.setCostume(id, costume);
    }
  }

  choose(initialPlayer(roster, query.get('player'), stored.player()), false);
}
