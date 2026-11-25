// Warung Kilat — a small seeded random generator (mulberry32).
// The whole game runs on this one stream, so the same seed and the same
// actions always replay the same shift. Used by the world rules and by
// the screenshot autopilot; never by the renderer directly.

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Pick one entry from a weighted table: [[value, weight], ...].
export function pickWeighted(rng, table) {
  let total = 0;
  for (const [, weight] of table) total += weight;
  let roll = rng() * total;
  for (const [value, weight] of table) {
    roll -= weight;
    if (roll <= 0) return value;
  }
  return table[table.length - 1][0];
}

export function pick(rng, list) {
  return list[Math.floor(rng() * list.length)];
}
