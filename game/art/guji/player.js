// Poses use the 128-unit drawing grid. Anchors are measured from the cell's top left.
const releaseMs = 265;
export const player = {
  name: '구지',
  atlas: new URL('./atlas.webp', import.meta.url),
  cellSize: 256,
  columns: 5,
  drawSize: 128,
  pivot: [64, 116],
  standingPixels: 88,
  heightM: 1.85,
  hands: [[79,58],[79,76],[79,45],[78,27],[86,29],[80,28],[81,58],
    [77,76],[76,72],[73,69],[78,27],[80,20],[80,20],[86,29]],
  // Each key is [start in milliseconds, atlas cell].
  poses: {
    ready: [[0,0]],
    hold: [[0,1],[90,2],[200,3]],
    flight: [[0,3],[190,10],[releaseMs,11],[366,12],[418,13],[450,4],[490,7],[600,8]],
    fumble: [[0,1],[350,8]]
  },
  releaseMs,
  jump: {startMs: 40, durationMs: 450, peakPixels: 26}
};
