// Everything the game remembers on the device, in one place. Keys keep their original names so players
// keep their records and choices. Private browsing or a full quota never breaks the game: reads fall back,
// writes are skipped.
const KEYS = {
  best: 'two-bounce:best:.45',                 // best streak (".45": the band width when records started)
  player: 'two-bounce:player',                 // last chosen player id
  costume: id => 'two-bounce:costume:' + id    // last outfit per player
};

function read(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}
function write(key, value) {
  try { localStorage.setItem(key, String(value)); } catch {}
}

export const stored = {
  best: () => Math.max(0, Number(read(KEYS.best)) || 0),
  setBest: value => write(KEYS.best, value),
  player: () => read(KEYS.player),
  setPlayer: id => write(KEYS.player, id),
  costume: id => read(KEYS.costume(id)),
  setCostume: (id, costume) => write(KEYS.costume(id), costume)
};
