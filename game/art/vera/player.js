// Ball centres are measured from the same source poses as the atlas.
const releaseMs = 205;
export const player = {
  name: '베라',
  atlas: new URL('./atlas.webp', import.meta.url),
  cellSize: 128, columns: 4, drawSize: 128, pivot: [64,118],
  standingPixels: 96, heightM: 1.78,
  hands: [[79,63],[77,70],[69,75],[79,32],[78,18],[92,7],[95,11],[91,68],
    [81,72],[83,34],[89,16],[89,55],[94,63],[101,54],[89,54],[99,49]],
  poses: {
    ready: [[0,0],[340,1]],
    hold: [[0,1],[55,2],[110,8],[165,9],[235,3]],
    flight: [[0,3],[70,4],[150,10],[releaseMs,5],[275,6],[335,11],[385,7],[520,1],[600,0]],
    walk: [[0,12],[135,13],[270,14],[405,15]],
    fumble: [[0,9],[75,8],[145,7],[480,2],[660,1],[780,0]]
  },
  strideM: 1.18,
  loopMs: {ready: 680, walk: 540},
  releaseMs,
  jump: {startMs: 25, durationMs: 360, peakPixels: 23}
};
