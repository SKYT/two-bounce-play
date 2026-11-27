// Ball centres measured on the packed 128px grid in docs/players/saemi.json.
const releaseMs = 230;
export const player = {
  name: '쌔미',
  atlas: new URL('./atlas.webp', import.meta.url),
  cellSize: 128, columns: 4, drawSize: 128, pivot: [64,118],
  standingPixels: 96, heightM: 1.76,
  hands: [[78,59],[79,64],[68,68],[80,25],[82,19],[88,11],[89,16],[85,22],
    [79,62],[79,22],[84,14],[89,29],[89,59],[88,59],[93,54],[99,54]],
  poses: {
    ready: [[0,0],[460,1]],
    hold: [[0,1],[60,2],[125,8],[190,3],[245,9]],
    flight: [[0,9],[78,4],[162,10],[releaseMs,5],[312,6],[380,11],[440,7],[580,1],[665,0]],
    walk: [[0,12],[140,13],[280,14],[420,15]],
    fumble: [[0,9],[90,8],[185,2],[510,1],[810,0]]
  },
  strideM: 1.22,
  loopMs: {ready: 840, walk: 560},
  releaseMs,
  jump: {startMs: 20, durationMs: 420, peakPixels: 27}
};
