// Warung Kilat — tuning numbers, palette and screen geometry.
// One logical canvas of 1280x720; the page scales it to the window.
// Every layout rect the game clicks or draws lives here, so the input
// mapping and the renderer can never drift apart.

export const VIEW_W = 1280;
export const VIEW_H = 720;

export const PALETTE = {
  cream: '#FFF6E3',
  wall: '#FBEBC9',
  paper: '#FFFDF6',
  ink: '#2E2118',
  inkSoft: '#6B4A2F',
  wood: '#7A4A2B',
  woodDark: '#5C3A21',
  woodLight: '#A9744B',
  terracotta: '#C65D3B',
  terracottaDark: '#A34A2E',
  teal: '#1F7A6D',
  tealDark: '#155E54',
  gold: '#E8A33D',
  goldLight: '#F5C66B',
  chili: '#D33A2C',
  leaf: '#4E9A51',
  leafLight: '#7CB86A',
  orange: '#E07B39',
  plate: '#FDFBF4',
  plateRim: '#D8C9A8',
  shadow: 'rgba(46,33,24,0.18)',
};

export const TUNING = {
  shiftSeconds: 150,
  startHearts: 3,
  maxOrders: 4,
  plateCount: 3,
  // Order spawn: interval shrinks as the level rises.
  spawnBaseSeconds: 6.0,
  spawnPerLevelSeconds: 0.7,
  spawnMinSeconds: 3.0,
  // Patience: seconds a ticket waits before the customer walks away.
  patienceBaseSeconds: 30,
  patiencePerLevelSeconds: 2.5,
  patienceMinSeconds: 16,
  patienceJitterSeconds: 4,
  // Level: every 30 s of shift time, or every 5 serves.
  levelSeconds: 30,
  servesPerLevel: 5,
  maxLevel: 6,
  // Scoring: price + tip (patience left) + combo bonus.
  priceBase: 40,
  pricePerIngredient: 12,
  spiceBonus: [0, 15, 30],
  tipFraction: 0.5,
  comboBonusPerStep: 5,
  // How long the autopilot waits between two adds in screenshot mode.
  shotAddGapSeconds: 0.35,
};

export const SPICE = ['Biasa', 'Sedang', 'Pedas'];
export const SPICE_COLORS = ['#4E9A51', '#E07B39', '#D33A2C'];

// ---- Layout ---------------------------------------------------------------

export const LAYOUT = {
  header: { x: 0, y: 0, w: 1280, h: 44 },
  orders: { x: 16, y: 52, w: 300, h: 112, gap: 12 },
  bins: { x: 16, y: 172, w: 148, h: 100, gap: 8 },
  plates: { y: 352, radius: 54, gap: 200, firstX: 440 },
  trash: { x: 992, y: 316, w: 138, h: 76 },
  saji: { x: 490, y: 436, w: 300, h: 56 },
  hud: { x: 16, y: 504, w: 1248, h: 72 },
  hints: { x: 16, y: 592, w: 1248, h: 36 },
  counter: { x: 0, y: 648, w: 1280, h: 72 },
};

export function orderSlotRect(slot) {
  const o = LAYOUT.orders;
  return { x: o.x + slot * (o.w + o.gap), y: o.y, w: o.w, h: o.h };
}

export function binRect(index) {
  const b = LAYOUT.bins;
  return { x: b.x + index * (b.w + b.gap), y: b.y, w: b.w, h: b.h };
}

export function plateCenter(index) {
  const p = LAYOUT.plates;
  return { x: p.firstX + index * p.gap, y: p.y };
}

export function plateRect(index) {
  const c = plateCenter(index);
  const r = LAYOUT.plates.radius + 10;
  return { x: c.x - r, y: c.y - r, w: r * 2, h: r * 2 };
}

export function pointInRect(px, py, r) {
  return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
}
