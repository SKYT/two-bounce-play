import {scene as baseScene, rules} from './defaults.js?v=5b1f447';
import {loadRoster, loadPortraits, addCustomPlayers} from './players.js?v=5b1f447';
import {formsOf, validRecipe, recipeData, decodeRecipe, encodeRecipe, migrateRecipe, MAX_CUSTOM} from './custom.js?v=5b1f447';
import {setupCreator} from './creator.js?v=5b1f447';
import {setupHome} from './home.js?v=5b1f447';
import {stored} from './storage.js?v=5b1f447';
import {createPreview} from './preview.js?v=5b1f447';
import {createRenderer} from './render.js?v=5b1f447';
import {newMatch, charge, cancelCharge, release, advance} from './match.js?v=5b1f447';
import {enableAudio, tone, swish} from './audio.js?v=5b1f447';

const el = id => document.getElementById(id);
const home = el('home'), court = el('court'), canvas = el('view'), button = el('shoot');
const status = el('status'), retry = el('retry');
const play = /** @type {HTMLButtonElement} */ (el('play'));
const readyText = '자유투 라인 · 꾹 누르고 목표 띠에서 놓으세요';
let best = stored.best();
let game, draw, frameId, input = null;
let scene = baseScene;

function updateScore() {
  el('score').textContent = game.goals+' / '+game.attempts+' 슛';
  el('missCount').textContent = '실패 '+game.misses+' / '+rules.misses;
  el('records').textContent = '현재 '+game.streak+'연속 · 최고 '+best+'연속';
}

function reflect(event) {
  if (!event) return;
  if (event === 'firstBounce') { tone(155,.13); navigator.vibrate?.(10); return; }
  if (event === 'over') {
    input = null;
    button.hidden = true;
    el('gameOver').hidden = false;
    el('result').textContent = game.attempts+'번 슛 · '+game.goals+'골';
    retry.focus();
  }
  if (event === 'fumble') { input = null; tone(180,.1); }
  if (event === 'release') tone(400,.07);
  if (event === 'miss') tone(310,.13);
  if (event === 'secondBounce' || event === 'freeThrow') { tone(125,.12); navigator.vibrate?.(10); }
  if (event === 'perfect' || event === 'goal') {
    if (event === 'perfect') swish(); else tone(740,.13);
    navigator.vibrate?.([30,45,30]);
    if (game.streak > best) {
      best = game.streak;
      stored.setBest(best);
    }
  }
  const messages = {release:'슛', fumble:'타이밍 놓침 · 공을 놓쳤어요', miss:'림 · 다음 바운드를 보세요',
    perfect:'PERFECT · 다음 바운드를 보세요', goal:'득점 · 다음 바운드를 보세요',
    secondBounce:'두 번째 바운드 · 이 자리에서 다음 슛', freeThrow:'범위 이탈 · 자유투 라인에서 다시 시작',
    ready:'다시 준비 · 목표 띠에서 놓으세요', over:'누적 3회 실패로 경기가 끝났어요.'};
  status.textContent = messages[event];
  updateScore();
}

function frame(now) {
  reflect(advance(game,now,scene.player.releaseMs));
  draw(game,now);
  if (game.phase !== 'over') frameId = requestAnimationFrame(frame);
}

function startGame() {
  cancelAnimationFrame(frameId);
  game = newMatch();
  input = null;
  preview.pause();
  home.hidden = true;
  court.hidden = false;
  el('gameOver').hidden = true;
  button.hidden = false;
  status.textContent = readyText;
  updateScore();
  button.focus();
  frame(performance.now());
}

function press(id) {
  if (court.hidden || input !== null || !charge(game,performance.now())) return false;
  input = id;
  enableAudio();
  status.textContent = '끝에 닿기 전에 놓으세요 · 목표 중앙은 PERFECT';
  return true;
}
function lift(id) {
  if (input !== id) return;
  input = null;
  reflect(release(game,performance.now()));
}
function cancel() {
  input = null;
  if (game?.phase === 'hold') {
    cancelCharge(game);
    status.textContent = '다시 누르면 준비해요';
  }
}
for (const surface of [canvas,button]) {
  surface.onpointerdown = e => {
    if (e.button === 0 && press(e.pointerId)) {
      surface.setPointerCapture(e.pointerId);
      e.preventDefault();
    }
  };
  surface.onpointerup = e => lift(e.pointerId);
  surface.onpointercancel = e => { if (input === e.pointerId) cancel(); };
}
button.onkeydown = e => {
  if (e.key === ' ' || e.key === 'Enter') {
    e.preventDefault();
    if (!e.repeat) press('key');
  }
};
button.onkeyup = e => { if (e.key === ' ' || e.key === 'Enter') lift('key'); };
window.addEventListener('blur',cancel);
document.addEventListener('visibilitychange',() => {
  if (document.hidden) { cancel(); preview.pause(); }
  else if (!home.hidden) preview.resume();
});
el('leave').onclick = () => {
  cancelAnimationFrame(frameId);
  cancel();
  court.hidden = true;
  home.hidden = false;
  preview.resume();
  showRecord();
  play.focus();
};
function showRecord() { el('homeRecord').textContent = '최고 '+best+'연속'; }
showRecord();
retry.onclick = startGame;
// A slower atlas download must never replace the player's most recent choice.
async function selectPlayer(player, retryChoice) {
  if (!player) { // the outfit could not be built
    scene = {...baseScene};
    play.textContent = '선수 다시 불러오기';
    play.onclick = retryChoice;
    play.disabled = false;
    return false;
  }
  const selected = {...baseScene, player};
  scene = selected;
  play.disabled = true;
  play.textContent = '선수 불러오는 중';
  let ready = false;
  try {
    const render = await createRenderer(canvas,selected,rules);
    if (scene !== selected) return false;
    draw = render;
    play.textContent = '게임 시작';
    play.onclick = startGame;
    ready = true;
  } catch {
    if (scene !== selected) return false;
    play.textContent = '선수 다시 불러오기';
    play.onclick = retryChoice;
  }
  play.disabled = false;
  return ready;
}

play.disabled = true;
play.textContent = '선수 목록 불러오는 중';
const preview = createPreview(el('preview'), baseScene.ball);
const query = new URLSearchParams(location.search);

// "My players": saved creator recipes join the roster; a selected one gets edit / share / delete.
function setupCustom(roster) {
  const forms = formsOf(roster);
  const all = stored.customs().map(migrateRecipe);
  stored.setCustoms(all);   // old recipes are moved once (see migrateRecipe)
  const saved = all.filter(r => validRecipe(r, forms));
  addCustomPlayers(roster, saved.map(r => [r.id, recipeData(r, forms)]));
  const creatorSection = el('creator');
  const creator = setupCreator({roster, ballStyle: baseScene.ball,
    els: {stage: el('creatorPreview'), fields: el('creatorFields'), name: el('creatorName'), stats: el('creatorStats'),
      nameInput: el('creatorNameInput'), random: el('creatorRandom'), cancel: el('creatorCancel'), save: el('creatorSave'),
      note: el('creatorNote'), title: el('creatorTitle')},
    onDone: id => location.assign(location.pathname + '?player=' + encodeURIComponent(id)),
    onClose: () => { creatorSection.hidden = true; home.hidden = false; preview.resume(); el('newPlayer').focus(); }});
  const openCreator = recipe => {
    if (!creator.open(recipe)) return;
    home.hidden = true; creatorSection.hidden = false; preview.pause();
    el('creatorNameInput').focus();
  };
  const newPlayer = /** @type {HTMLButtonElement} */ (el('newPlayer'));
  newPlayer.disabled = !forms.size || saved.length >= MAX_CUSTOM;
  newPlayer.textContent = saved.length >= MAX_CUSTOM ? `내 선수 ${MAX_CUSTOM}명이 가득 찼어요` : '새 선수 만들기';
  newPlayer.onclick = () => openCreator(null);
  let armed = null;
  const tools = (id) => {
    const recipe = saved.find(r => r.id === id);
    el('customTools').hidden = !recipe;
    el('customNote').textContent = '';
    if (!recipe) return;
    el('editPlayer').onclick = () => openCreator(recipe);
    el('sharePlayer').onclick = async () => {
      const link = location.origin + location.pathname + '?recipe=' + encodeRecipe(recipe);
      try { await navigator.clipboard.writeText(link); el('customNote').textContent = '링크를 복사했어요'; }
      catch { el('customNote').textContent = link; }
    };
    const remove = el('deletePlayer');
    remove.textContent = '삭제';
    remove.onclick = () => {
      if (armed !== id) { armed = id; remove.textContent = '한 번 더 누르면 삭제'; return; }
      stored.setCustoms(stored.customs().filter(r => r.id !== id));
      location.assign(location.pathname);
    };
  };
  // a shared link opens the creator with that player (saved only if the visitor presses 저장)
  const shared = query.get('recipe') && decodeRecipe(query.get('recipe'));
  if (shared) setTimeout(() => openCreator(shared), 0);
  return tools;
}

Promise.all([loadRoster(), loadPortraits()]).then(([roster, portraits]) => {
  const tools = setupCustom(roster);
  setupHome({roster, portraits, preview, stageName:el('stageName'), stageOutfit:el('stageOutfit'), stageStats:el('stageStats'), cardsBox:el('roster'), costumesBox:el('costumes'),
    costumeName:el('costumeName'), query, onChoose:(player, retryChoice) => { tools(player?.id); return selectPlayer(player, retryChoice); }});
}).catch(() => {
    play.textContent = '선수 목록을 불러오지 못했어요 · 새로고침';
    play.disabled = false;
    play.onclick = () => location.reload();
  });
