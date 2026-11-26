// Ball centres share the 128px grid of the atlas cells.
// Draft sheet derived from Navi's poses; replace with packed original art via docs/player-production.md.
const releaseMs = 255;
export const player = {
  name: '메이',
  atlas: new URL('./atlas.webp', import.meta.url),
  cellSize: 128, columns: 4, drawSize: 128, pivot: [64,118],
  standingPixels: 96, heightM: 1.70,
  hands: [[78,57],[79,62],[74,72],[80,32],[81,19],[88,12],[85,16],[82,19],
    [82,55],[80,27],[84,16],[83,66],[88,61],[93,57],[90,54],[95,55]],
  poses: {
    ready: [[0,0],[420,1]],
    hold: [[0,1],[60,2],[145,8],[205,3],[275,9]],
    flight: [[0,9],[90,4],[190,10],[releaseMs,5],[360,6],[485,7],[560,11],[645,1],[730,0]],
    walk: [[0,12],[145,13],[290,14],[435,15]],
    fumble: [[0,9],[80,8],[170,11],[335,2],[640,1],[785,0]]
  },
  strideM: 1.28,
  loopMs: {ready: 840, walk: 580},
  releaseMs,
  jump: {startMs: 25, durationMs: 470, peakPixels: 34}
};
