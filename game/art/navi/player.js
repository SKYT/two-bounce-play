// Ball centres use the 128px grid from docs/players/navi.json.
const releaseMs = 260;
export const player = {
  name: '나비',
  atlas: new URL('./atlas.webp?art=2', import.meta.url),
  cellSize: 128, columns: 4, drawSize: 128, pivot: [64,118],
  standingPixels: 96, heightM: 1.83,
  hands: [[78,57],[79,62],[74,72],[80,32],[81,19],[88,12],[85,16],[82,19],
    [82,55],[80,27],[84,16],[83,66],[88,61],[93,57],[90,54],[95,55]],
  poses: {
    ready: [[0,0],[440,1]],
    hold: [[0,1],[65,2],[155,8],[212,3],[285,9]],
    flight: [[0,9],[95,4],[195,10],[releaseMs,5],[365,6],[490,7],[565,11],[650,1],[735,0]],
    walk: [[0,12],[150,13],[300,14],[450,15]],
    fumble: [[0,9],[85,8],[175,11],[340,2],[645,1],[790,0]]
  },
  strideM: 1.32,
  loopMs: {ready: 860, walk: 600},
  releaseMs,
  jump: {startMs: 30, durationMs: 460, peakPixels: 32}
};
