// Ball centres share the 128px grid of the atlas cells.
// Cell 10 is Lin's knee-drive take-off; the jump is a touch higher than the other guards.
const releaseMs = 250;
export const player = {
  name: '린',
  atlas: new URL('./atlas.webp', import.meta.url),
  cellSize: 128, columns: 4, drawSize: 128, pivot: [64,118],
  standingPixels: 96, heightM: 1.72,
  hands: [[78,57],[79,62],[74,72],[80,32],[81,19],[88,12],[85,16],[82,19],
    [82,55],[80,27],[84,16],[83,66],[88,61],[93,57],[90,54],[95,55]],
  poses: {
    ready: [[0,0],[400,1]],
    hold: [[0,1],[60,2],[140,8],[195,3],[260,9]],
    flight: [[0,9],[75,4],[140,10],[releaseMs,5],[350,6],[470,7],[545,11],[630,1],[710,0]],
    walk: [[0,12],[140,13],[280,14],[420,15]],
    fumble: [[0,9],[80,8],[165,11],[330,2],[630,1],[770,0]]
  },
  strideM: 1.24,
  loopMs: {ready: 800, walk: 560},
  releaseMs,
  jump: {startMs: 25, durationMs: 470, peakPixels: 35}
};
