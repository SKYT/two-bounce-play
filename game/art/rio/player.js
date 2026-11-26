// Socket coordinates mark the centre of the ball on the 128px drawing grid.
const releaseMs = 240;
export const player = {
  name: '리오',
  atlas: new URL('./atlas.webp', import.meta.url),
  cellSize: 128, columns: 4, drawSize: 128, pivot: [64,118],
  standingPixels: 96, heightM: 1.98,
  hands: [[77,57],[76,65],[76,70],[80,29],[82,23],[99,17],
    [97,22],[86,71],[79,60],[83,39],[97,22],[98,36],[93,60],[95,54],[91,57],[94,51]],
  poses: {
    ready: [[0,0],[360,1]],
    hold: [[0,1],[55,2],[125,8],[195,9],[260,3]],
    flight: [[0,3],[90,4],[175,10],[releaseMs,5],[325,6],[420,11],[500,7],[620,1],[690,0]],
    walk: [[0,12],[150,13],[300,14],[450,15]],
    fumble: [[0,9],[70,8],[145,7],[520,2],[710,1],[830,0]]
  },
  strideM: 1.4,
  loopMs: {ready: 740, walk: 600},
  releaseMs,
  jump: {startMs: 35, durationMs: 440, peakPixels: 30}
};
