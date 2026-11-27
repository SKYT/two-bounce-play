// Measured ball centres on the 128px grid, including the empty-hand gather replacement.
const releaseMs = 215;

export const player = {
  name: '윤슬',
  atlas: new URL('./atlas.webp', import.meta.url),
  cellSize: 128, columns: 4, drawSize: 128, pivot: [64,118],
  standingPixels: 96, heightM: 1.73,
  hands: [
    [77,65], [76,68], [81,74], [81,39], [85,20], [93,15], [93,16], [80,63],
    [82,61], [84,45], [91,17], [83,57], [87,61], [89,61], [90,52], [91,51]
  ],
  poses: {
    ready: [[0,0],[470,1]],
    hold: [[0,1],[60,2],[130,8],[205,9],[265,3]],
    flight: [[0,3],[75,4],[155,10],[releaseMs,5],[300,6],[375,11],[415,7],[550,1],[650,0]],
    walk: [[0,12],[130,13],[260,14],[390,15]],
    fumble: [[0,3],[80,9],[140,8],[220,2],[500,1],[710,0]]
  },
  strideM: 1.18,
  loopMs: {ready: 880, walk: 520},
  releaseMs,
  jump: {startMs: 15, durationMs: 400, peakPixels: 26}
};
