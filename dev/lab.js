// The v22 settings and players live only in this entry point.
const previewSlot = document.getElementById('preview');
const setupCamera = document.getElementById('setupCamera');
const courtCamera = document.getElementById('courtCamera');
const cameraControl = document.getElementById('cameraControl');
const testGame = document.getElementById('testGame');
let previewFrame = 0;

function requestLabPreview() {
  if (settings.hidden || previewFrame) return;
  previewFrame = requestAnimationFrame(now => {
    previewFrame = 0;
    if (settings.hidden) return;
    session = settingsProfile();
    prepareNextShot(true);
    frame(now, true);
  });
}

function editScene() {
  cancelAnimationFrame(animation);
  cancel();
  player = {...free};
  ball = {...free};
  phase = 'ready';
  shot = null;
  goalAt = -Infinity;
  scored = attempts = sequence = streak = misses = 0;
  difficulty.disabled = false;
  showScreen(settings);
  previewSlot.append(canvas);
  setupCamera.append(cameraControl);
  requestLabPreview();
}

function testScene() {
  cancelAnimationFrame(previewFrame);
  previewFrame = 0;
  courtCamera.append(cameraControl);
  court.insertBefore(canvas, statusLine);
  startGame();
}

testGame.onclick = document.getElementById('back').onclick = testScene;
document.getElementById('leave').onclick = () => {
  editScene();
  testGame.focus();
};
settings.addEventListener('change', requestLabPreview);
window.addEventListener('resize', requestLabPreview);
editScene();
