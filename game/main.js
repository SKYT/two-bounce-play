import {scene as baseScene, rules} from './defaults.js?art=ball2';
import {roster, initialPlayer} from './roster.js?roster=9';
import {createRenderer} from './render.js?art=ball2';
import {newMatch, charge, cancelCharge, release, advance} from './match.js';
import {enableAudio, tone, swish} from './audio.js';

const el = id => document.getElementById(id);
const home = el('home'), court = el('court'), canvas = el('view'), button = el('shoot');
const status = el('status'), play = el('play'), retry = el('retry');
const readyText = '자유투 라인 · 꾹 누르고 목표 띠에서 놓으세요';
const recordKey = 'two-bounce:best:.45';
let best = 0;
try { best = Math.max(0,Number(localStorage.getItem(recordKey))||0); } catch {}
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
      try { localStorage.setItem(recordKey,String(best)); } catch {}
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
document.addEventListener('visibilitychange',() => { if (document.hidden) cancel(); });
el('leave').onclick = () => {
  cancelAnimationFrame(frameId);
  cancel();
  court.hidden = true;
  home.hidden = false;
  showRecord();
  play.focus();
};
function showRecord() { el('homeRecord').textContent = '최고 '+best+'연속'; }
showRecord();
retry.onclick = startGame;
const playerKey = 'two-bounce:player';
const cards = new Map();
let savedPlayer;
try { savedPlayer = localStorage.getItem(playerKey); } catch {}
for (const [id, spec] of roster) {
  const card = document.createElement('button');
  const portrait = document.createElement('span');
  portrait.className = 'portrait';
  portrait.setAttribute('aria-hidden','true');
  portrait.style.backgroundImage = 'url("' + spec.atlas.href + '")';
  portrait.style.backgroundSize = (spec.columns*100)+'% auto';
  card.append(portrait, spec.name);
  card.onclick = () => selectPlayer(id,true);
  cards.set(id,card);
  el('roster').append(card);
}

// A slower atlas download must never replace the player's most recent choice.
async function selectPlayer(id, remember) {
  const selected = {...baseScene, player:roster.get(id)};
  scene = selected;
  play.disabled = true;
  play.textContent = '선수 불러오는 중';
  for (const [key,card] of cards) card.setAttribute('aria-pressed',String(key === id));
  try {
    const render = await createRenderer(canvas,selected,rules);
    if (scene !== selected) return;
    draw = render;
    if (remember) {
      try { localStorage.setItem(playerKey,id); } catch {}
    }
    play.textContent = '게임 시작';
    play.onclick = startGame;
  } catch {
    if (scene !== selected) return;
    play.textContent = '선수 다시 불러오기';
    play.onclick = () => selectPlayer(id,remember);
  }
  play.disabled = false;
}
selectPlayer(initialPlayer(new URLSearchParams(location.search).get('player'),savedPlayer),false);
