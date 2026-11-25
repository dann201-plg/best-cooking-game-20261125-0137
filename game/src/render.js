// Warung Kilat — every pixel the player sees, drawn on one canvas.
// No images, no fonts to load: vector food icons, system fonts, and the
// warm warung palette from config.js. The layout rects come from config
// too, so what you click is exactly what you see.

import {
  PALETTE,
  LAYOUT,
  VIEW_W,
  VIEW_H,
  SPICE,
  SPICE_COLORS,
  orderSlotRect,
  binRect,
  plateCenter,
  plateRect,
  pointInRect,
} from './config.js';
import { INGREDIENTS, INGREDIENT_BY_ID } from './recipes.js';
import { sajiReady } from './world.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function text(ctx, str, x, y, size, weight, color, align = 'left') {
  ctx.font = `${weight} ${size}px system-ui, -apple-system, "Segoe UI", sans-serif`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(str, x, y);
}

function shadow(ctx, x, y, w, h, r) {
  ctx.fillStyle = PALETTE.shadow;
  rr(ctx, x + 3, y + 4, w, h, r);
  ctx.fill();
}

function formatClock(seconds) {
  const s = Math.max(0, Math.ceil(seconds));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

function formatScore(n) {
  return n.toLocaleString('id-ID');
}

// ---- Ingredient icons (vector, drawn at center cx,cy, size s) -----------

export function drawIngredientIcon(ctx, id, cx, cy, s) {
  const u = s / 64; // unit scale: icons are designed on a 64px box
  ctx.save();
  ctx.translate(cx, cy);
  ctx.lineWidth = 2.5 * u;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  switch (id) {
    case 'nasi': {
      // Bowl of rice with steam.
      ctx.fillStyle = '#8A5A2B';
      ctx.beginPath();
      ctx.arc(0, 8 * u, 22 * u, 0, Math.PI);
      ctx.fill();
      ctx.fillStyle = '#F7F3E6';
      ctx.beginPath();
      ctx.arc(-10 * u, -2 * u, 8 * u, 0, Math.PI * 2);
      ctx.arc(0, -6 * u, 9 * u, 0, Math.PI * 2);
      ctx.arc(10 * u, -2 * u, 8 * u, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(46,33,24,0.35)';
      ctx.beginPath();
      ctx.moveTo(-8 * u, -16 * u);
      ctx.quadraticCurveTo(-11 * u, -22 * u, -8 * u, -27 * u);
      ctx.moveTo(6 * u, -16 * u);
      ctx.quadraticCurveTo(9 * u, -22 * u, 6 * u, -27 * u);
      ctx.stroke();
      break;
    }
    case 'mie': {
      // Bowl of wavy noodles.
      ctx.fillStyle = '#7A4A2B';
      ctx.beginPath();
      ctx.arc(0, 8 * u, 22 * u, 0, Math.PI);
      ctx.fill();
      ctx.strokeStyle = '#F2C14E';
      ctx.lineWidth = 4 * u;
      for (let row = 0; row < 3; row++) {
        ctx.beginPath();
        const y = (-8 + row * 7) * u;
        ctx.moveTo(-16 * u, y);
        for (let x = -16; x <= 16; x += 4) {
          ctx.lineTo(x * u, y + Math.sin((x + row * 9) * 0.7) * 2.5 * u);
        }
        ctx.stroke();
      }
      ctx.strokeStyle = '#5C3A21';
      ctx.lineWidth = 2.5 * u;
      ctx.beginPath();
      ctx.moveTo(10 * u, -24 * u);
      ctx.lineTo(20 * u, 2 * u);
      ctx.moveTo(16 * u, -24 * u);
      ctx.lineTo(25 * u, 0 * u);
      ctx.stroke();
      break;
    }
    case 'ayam': {
      // Chicken drumstick.
      ctx.fillStyle = '#D98A4B';
      ctx.beginPath();
      ctx.ellipse(-4 * u, 2 * u, 16 * u, 12 * u, -0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#B96F33';
      ctx.beginPath();
      ctx.ellipse(-8 * u, 6 * u, 8 * u, 5 * u, -0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#FFF6E3';
      ctx.lineWidth = 5 * u;
      ctx.beginPath();
      ctx.moveTo(8 * u, -6 * u);
      ctx.lineTo(20 * u, -18 * u);
      ctx.stroke();
      ctx.fillStyle = '#FFF6E3';
      ctx.beginPath();
      ctx.arc(21 * u, -19 * u, 4 * u, 0, Math.PI * 2);
      ctx.arc(16 * u, -15 * u, 3.5 * u, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'telur': {
      // Fried egg, sunny side up.
      ctx.fillStyle = '#FFFDF6';
      ctx.beginPath();
      ctx.ellipse(0, 0, 22 * u, 17 * u, 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#F5A623';
      ctx.beginPath();
      ctx.arc(-2 * u, 1 * u, 9 * u, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FBD46A';
      ctx.beginPath();
      ctx.arc(-4 * u, -1 * u, 4 * u, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'sayur': {
      // Three green leaves.
      ctx.fillStyle = '#5FA84F';
      for (const [dx, rot] of [[-12, -0.7], [0, 0], [12, 0.7]]) {
        ctx.save();
        ctx.translate(dx * u, 2 * u);
        ctx.rotate(rot);
        ctx.beginPath();
        ctx.ellipse(0, -6 * u, 7 * u, 13 * u, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      ctx.strokeStyle = '#3E7A34';
      ctx.lineWidth = 2 * u;
      ctx.beginPath();
      ctx.moveTo(0, 14 * u);
      ctx.lineTo(0, 22 * u);
      ctx.stroke();
      break;
    }
    case 'bumbu': {
      // Red chili with a green stem.
      ctx.fillStyle = '#D33A2C';
      ctx.beginPath();
      ctx.moveTo(-16 * u, -8 * u);
      ctx.quadraticCurveTo(-2 * u, -18 * u, 14 * u, -6 * u);
      ctx.quadraticCurveTo(20 * u, 2 * u, 12 * u, 8 * u);
      ctx.quadraticCurveTo(-4 * u, 14 * u, -16 * u, -8 * u);
      ctx.fill();
      ctx.strokeStyle = '#3E7A34';
      ctx.lineWidth = 3.5 * u;
      ctx.beginPath();
      ctx.moveTo(-14 * u, -8 * u);
      ctx.quadraticCurveTo(-20 * u, -16 * u, -14 * u, -20 * u);
      ctx.stroke();
      ctx.fillStyle = '#F5C66B';
      ctx.beginPath();
      ctx.arc(2 * u, 2 * u, 2.5 * u, 0, Math.PI * 2);
      ctx.arc(8 * u, -1 * u, 2 * u, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'sate': {
      // Skewer with three cubes and sauce.
      ctx.strokeStyle = '#C9BFA4';
      ctx.lineWidth = 3 * u;
      ctx.beginPath();
      ctx.moveTo(-22 * u, 18 * u);
      ctx.lineTo(22 * u, -18 * u);
      ctx.stroke();
      ctx.fillStyle = '#8A5A2B';
      for (const [dx, dy] of [[-12, 10], [0, 0], [12, -10]]) {
        ctx.save();
        ctx.translate(dx * u, dy * u);
        ctx.rotate(-0.6);
        ctx.fillRect(-7 * u, -7 * u, 14 * u, 14 * u);
        ctx.restore();
      }
      ctx.strokeStyle = '#C65D3B';
      ctx.lineWidth = 2 * u;
      ctx.beginPath();
      ctx.moveTo(-14 * u, 12 * u);
      ctx.lineTo(14 * u, -12 * u);
      ctx.stroke();
      break;
    }
    case 'teh': {
      // Glass of iced tea with a straw.
      ctx.fillStyle = 'rgba(255,253,246,0.9)';
      ctx.beginPath();
      ctx.moveTo(-13 * u, -18 * u);
      ctx.lineTo(13 * u, -18 * u);
      ctx.lineTo(9 * u, 20 * u);
      ctx.lineTo(-9 * u, 20 * u);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#8F5420';
      ctx.lineWidth = 2 * u;
      ctx.stroke();
      ctx.fillStyle = '#C97B2D';
      ctx.beginPath();
      ctx.moveTo(-11 * u, -8 * u);
      ctx.lineTo(11 * u, -8 * u);
      ctx.lineTo(9 * u, 18 * u);
      ctx.lineTo(-9 * u, 18 * u);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(255,253,246,0.75)';
      ctx.fillRect(-6 * u, -4 * u, 6 * u, 6 * u);
      ctx.fillRect(1 * u, 4 * u, 6 * u, 6 * u);
      ctx.strokeStyle = '#D33A2C';
      ctx.lineWidth = 3.5 * u;
      ctx.beginPath();
      ctx.moveTo(6 * u, -26 * u);
      ctx.lineTo(2 * u, -6 * u);
      ctx.stroke();
      break;
    }
    default:
      break;
  }
  ctx.restore();
}

// ---- Background, header, HUD ----------------------------------------------

function drawBackground(ctx) {
  ctx.fillStyle = PALETTE.cream;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  // Faint wall tiles.
  ctx.strokeStyle = 'rgba(122,74,43,0.07)';
  ctx.lineWidth = 1;
  for (let x = 0; x <= VIEW_W; x += 64) {
    ctx.beginPath();
    ctx.moveTo(x, 44);
    ctx.lineTo(x, 648);
    ctx.stroke();
  }
  for (let y = 44; y <= 648; y += 64) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(VIEW_W, y);
    ctx.stroke();
  }
  // Header strip.
  ctx.fillStyle = PALETTE.woodDark;
  ctx.fillRect(0, 0, VIEW_W, LAYOUT.header.h);
  ctx.fillStyle = PALETTE.gold;
  ctx.fillRect(0, LAYOUT.header.h - 4, VIEW_W, 4);
  text(ctx, 'WARUNG KILAT', 20, 31, 24, 800, PALETTE.cream);
  text(ctx, 'warung cepat saji', 220, 30, 15, 400, PALETTE.goldLight);
  // Wooden counter behind the bins and plates.
  ctx.fillStyle = PALETTE.wood;
  shadow(ctx, 8, 168, 1264, 252, 14);
  rr(ctx, 8, 168, 1264, 252, 14);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,246,227,0.16)';
  ctx.lineWidth = 2;
  for (let y = 196; y < 420; y += 28) {
    ctx.beginPath();
    ctx.moveTo(16, y);
    ctx.lineTo(1264, y);
    ctx.stroke();
  }
  // Counter front at the very bottom.
  ctx.fillStyle = PALETTE.woodDark;
  ctx.fillRect(0, LAYOUT.counter.y, VIEW_W, LAYOUT.counter.h);
  ctx.fillStyle = PALETTE.woodLight;
  ctx.fillRect(0, LAYOUT.counter.y, VIEW_W, 6);
  text(
    ctx,
    'WARUNG KILAT  •  SEJAK 1998  •  RASA NOMOR SATU, ANTRI NOMOR DUA',
    VIEW_W / 2,
    LAYOUT.counter.y + 44,
    17,
    700,
    PALETTE.goldLight,
    'center',
  );
}

function drawTicket(ctx, order, slot, now) {
  const r = orderSlotRect(slot);
  const frac = Math.max(0, order.patience / order.patienceMax);
  const blink = frac < 0.2 && Math.floor(now * 4) % 2 === 0;
  shadow(ctx, r.x, r.y, r.w, r.h, 10);
  ctx.fillStyle = blink ? '#FFE9E4' : PALETTE.paper;
  rr(ctx, r.x, r.y, r.w, r.h, 10);
  ctx.fill();
  ctx.strokeStyle = frac < 0.25 ? PALETTE.chili : 'rgba(46,33,24,0.25)';
  ctx.lineWidth = frac < 0.25 ? 3 : 1.5;
  rr(ctx, r.x, r.y, r.w, r.h, 10);
  ctx.stroke();

  text(ctx, order.dishName, r.x + 14, r.y + 28, 21, 800, PALETTE.ink);
  text(ctx, `Rp ${formatScore(order.price)}`, r.x + r.w - 14, r.y + 28, 18, 800, PALETTE.teal, 'right');
  // Spice badge.
  const badge = SPICE[order.spice];
  ctx.fillStyle = SPICE_COLORS[order.spice];
  const bw = 14 + badge.length * 8.5;
  rr(ctx, r.x + 14, r.y + 38, bw, 22, 11);
  ctx.fill();
  text(ctx, badge.toUpperCase(), r.x + 14 + bw / 2, r.y + 54, 12, 800, '#FFFDF6', 'center');
  // Needed ingredients.
  order.ingredients.forEach((id, i) => {
    drawIngredientIcon(ctx, id, r.x + 32 + i * 44, r.y + 82, 34);
  });
  // Patience bar.
  const bx = r.x + 14;
  const by = r.y + r.h - 14;
  const bwBar = r.w - 28;
  ctx.fillStyle = 'rgba(46,33,24,0.15)';
  rr(ctx, bx, by, bwBar, 8, 4);
  ctx.fill();
  ctx.fillStyle =
    frac > 0.5 ? PALETTE.leaf : frac > 0.25 ? PALETTE.orange : PALETTE.chili;
  if (frac > 0) {
    rr(ctx, bx, by, bwBar * frac, 8, 4);
    ctx.fill();
  }
}

function drawBin(ctx, ing, index) {
  const r = binRect(index);
  shadow(ctx, r.x, r.y, r.w, r.h, 10);
  ctx.fillStyle = PALETTE.paper;
  rr(ctx, r.x, r.y, r.w, r.h, 10);
  ctx.fill();
  ctx.strokeStyle = 'rgba(46,33,24,0.2)';
  ctx.lineWidth = 1.5;
  rr(ctx, r.x, r.y, r.w, r.h, 10);
  ctx.stroke();
  // Key hint.
  ctx.fillStyle = PALETTE.ink;
  ctx.beginPath();
  ctx.arc(r.x + 18, r.y + 18, 12, 0, Math.PI * 2);
  ctx.fill();
  text(ctx, ing.key, r.x + 18, r.y + 23, 14, 800, '#FFFDF6', 'center');
  drawIngredientIcon(ctx, ing.id, r.x + r.w / 2, r.y + 50, 52);
  text(ctx, ing.name, r.x + r.w / 2, r.y + 92, 16, 700, PALETTE.ink, 'center');
}

function drawPlate(ctx, world, index, now) {
  const plate = world.plates[index];
  const c = plateCenter(index);
  const radius = LAYOUT.plates.radius;
  const shakeX = plate.shake > 0 ? Math.sin(now * 45) * plate.shake * 18 : 0;
  const cx = c.x + shakeX;

  if (index === world.activePlate) {
    ctx.strokeStyle = PALETTE.teal;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(cx, c.y, radius + 12, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = PALETTE.teal;
    rr(ctx, cx - 34, c.y + radius + 8, 68, 18, 9);
    ctx.fill();
    text(ctx, 'AKTIF', cx, c.y + radius + 21, 11, 800, '#FFFDF6', 'center');
  }

  ctx.fillStyle = 'rgba(46,33,24,0.25)';
  ctx.beginPath();
  ctx.ellipse(cx, c.y + radius + 2, radius, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PALETTE.plate;
  ctx.beginPath();
  ctx.arc(cx, c.y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = PALETTE.plateRim;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cx, c.y, radius - 3, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(216,201,168,0.6)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(cx, c.y, radius - 16, 0, Math.PI * 2);
  ctx.stroke();

  // Key badge on the plate's left rim: Q / W / E selects this plate.
  ctx.fillStyle = index === world.activePlate ? PALETTE.teal : PALETTE.ink;
  ctx.beginPath();
  ctx.arc(cx - radius, c.y, 11, 0, Math.PI * 2);
  ctx.fill();
  text(ctx, ['Q', 'W', 'E'][index], cx - radius, c.y + 4, 12, 800, '#FFFDF6', 'center');

  // Ingredients on the plate, arranged in a small circle.
  const n = plate.items.length;
  if (n === 0) {
    text(ctx, `PIRING ${index + 1}`, cx, c.y + 5, 14, 700, 'rgba(46,33,24,0.35)', 'center');
  }
  plate.items.forEach((id, i) => {
    const angle = -Math.PI / 2 + (i * Math.PI * 2) / Math.max(1, n);
    const px = cx + Math.cos(angle) * (n === 1 ? 0 : 24);
    const py = c.y + Math.sin(angle) * (n === 1 ? 0 : 24);
    drawIngredientIcon(ctx, id, px, py, 34);
  });

  if (plate.wrong) {
    ctx.strokeStyle = PALETTE.chili;
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx - 20, c.y - 20);
    ctx.lineTo(cx + 20, c.y + 20);
    ctx.moveTo(cx + 20, c.y - 20);
    ctx.lineTo(cx - 20, c.y + 20);
    ctx.stroke();
    text(ctx, 'SALAH!', cx, c.y - radius - 8, 14, 800, PALETTE.chili, 'center');
  } else if (plate.matched) {
    ctx.strokeStyle = PALETTE.gold;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(cx, c.y, radius + 5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = PALETTE.gold;
    rr(ctx, cx - 32, c.y - radius - 22, 64, 20, 10);
    ctx.fill();
    text(ctx, 'SIAP!', cx, c.y - radius - 7, 12, 800, PALETTE.ink, 'center');
  }
}

function drawTrashButton(ctx) {
  const r = LAYOUT.trash;
  shadow(ctx, r.x, r.y, r.w, r.h, 10);
  ctx.fillStyle = '#EFE3C8';
  rr(ctx, r.x, r.y, r.w, r.h, 10);
  ctx.fill();
  ctx.strokeStyle = 'rgba(46,33,24,0.3)';
  ctx.lineWidth = 1.5;
  rr(ctx, r.x, r.y, r.w, r.h, 10);
  ctx.stroke();
  ctx.strokeStyle = PALETTE.chili;
  ctx.lineWidth = 2;
  // Trash can: lid, handle and tapered body.
  ctx.fillStyle = PALETTE.chili;
  rr(ctx, r.x + 20, r.y + 20, 28, 5, 2);
  ctx.fill();
  ctx.fillRect(r.x + 31, r.y + 14, 6, 6);
  ctx.beginPath();
  ctx.moveTo(r.x + 22, r.y + 27);
  ctx.lineTo(r.x + 46, r.y + 27);
  ctx.lineTo(r.x + 43, r.y + 54);
  ctx.lineTo(r.x + 25, r.y + 54);
  ctx.closePath();
  ctx.fill();
  text(ctx, 'BUANG', r.x + 78, r.y + 36, 17, 800, PALETTE.ink);
  text(ctx, 'tombol X', r.x + 78, r.y + 56, 12, 400, PALETTE.inkSoft);
}

function drawSajiButton(ctx, world, now) {
  const r = LAYOUT.saji;
  const ready = sajiReady(world);
  const pulse = ready ? 0.5 + 0.5 * Math.sin(now * 6) : 0;
  if (ready) {
    ctx.save();
    ctx.shadowColor = PALETTE.gold;
    ctx.shadowBlur = 24 + pulse * 18;
    ctx.fillStyle = PALETTE.gold;
    rr(ctx, r.x - 4, r.y - 4, r.w + 8, r.h + 8, 18);
    ctx.fill();
    ctx.restore();
  }
  shadow(ctx, r.x, r.y, r.w, r.h, 16);
  ctx.fillStyle = ready ? PALETTE.gold : PALETTE.terracotta;
  rr(ctx, r.x, r.y, r.w, r.h, 16);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,253,246,0.65)';
  ctx.lineWidth = 2;
  rr(ctx, r.x + 3, r.y + 3, r.w - 6, r.h - 6, 13);
  ctx.stroke();
  text(ctx, 'SAJI!', r.x + r.w / 2, r.y + 36, 30, 900, '#FFFDF6', 'center');
  text(
    ctx,
    ready ? 'piring siap — sajikan!' : 'tekan SPACE',
    r.x + r.w / 2,
    r.y + 51,
    11,
    700,
    'rgba(255,253,246,0.9)',
    'center',
  );
}

function drawHeart(ctx, x, y, size, filled) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 24, size / 24);
  ctx.beginPath();
  ctx.moveTo(0, 8);
  ctx.bezierCurveTo(-14, -4, -8, -14, 0, -6);
  ctx.bezierCurveTo(8, -14, 14, -4, 0, 8);
  ctx.closePath();
  if (filled) {
    ctx.fillStyle = PALETTE.chili;
    ctx.fill();
  } else {
    ctx.strokeStyle = 'rgba(255,253,246,0.5)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  ctx.restore();
}

function drawHud(ctx, world) {
  const h = LAYOUT.hud;
  ctx.fillStyle = PALETTE.woodDark;
  shadow(ctx, h.x, h.y, h.w, h.h, 12);
  rr(ctx, h.x, h.y, h.w, h.h, 12);
  ctx.fill();

  for (let i = 0; i < 3; i++) {
    drawHeart(ctx, 52 + i * 36, h.y + 36, 26, i < world.hearts);
  }
  text(ctx, 'NYAWA', 24, h.y + 62, 11, 700, PALETTE.goldLight);

  // Shift timer bar.
  const barX = 320;
  const barY = h.y + 20;
  const barW = 640;
  const frac = Math.max(0, world.shiftLeft / 150);
  text(ctx, 'SHIFT', barX, h.y + 16, 12, 800, PALETTE.goldLight);
  text(
    ctx,
    formatClock(world.shiftLeft),
    barX + barW,
    h.y + 16,
    15,
    800,
    '#FFFDF6',
    'right',
  );
  ctx.fillStyle = 'rgba(255,246,227,0.18)';
  rr(ctx, barX, barY, barW, 20, 10);
  ctx.fill();
  ctx.fillStyle =
    frac > 0.5 ? PALETTE.teal : frac > 0.2 ? PALETTE.gold : PALETTE.chili;
  if (frac > 0) {
    rr(ctx, barX, barY, barW * frac, 20, 10);
    ctx.fill();
  }

  text(ctx, 'SKOR', 1010, h.y + 24, 13, 800, PALETTE.goldLight);
  text(ctx, formatScore(world.score), 1010, h.y + 52, 26, 900, '#FFFDF6');
  text(ctx, `KOMBO x${world.combo}`, 1140, h.y + 30, 16, 800, PALETTE.gold, 'right');
  text(ctx, `LEVEL ${world.level}`, 1140, h.y + 54, 16, 800, '#FFFDF6', 'right');
}

function drawParticles(ctx, world) {
  for (const p of world.particles) {
    const alpha = Math.max(0, p.life / p.maxLife);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = PALETTE.gold;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.goldLight;
    ctx.beginPath();
    ctx.arc(p.x - p.size * 0.25, p.y - p.size * 0.25, p.size * 0.45, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  for (const p of world.popups) {
    const alpha = Math.max(0, p.life / p.maxLife);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = '800 26px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.lineWidth = 5;
    ctx.strokeStyle = 'rgba(46,33,24,0.85)';
    ctx.strokeText(p.text, p.x, p.y);
    ctx.fillStyle = p.color;
    ctx.fillText(p.text, p.x, p.y);
    ctx.restore();
  }
}

function drawHints(ctx) {
  text(
    ctx,
    '1–8  tambah bahan      Q / W / E  pilih piring      SPACE  saji      X  buang      P  jeda',
    VIEW_W / 2,
    LAYOUT.hints.y + 24,
    15,
    600,
    PALETTE.inkSoft,
    'center',
  );
}

// ---- Screens ----------------------------------------------------------------

function drawTitleScreen(ctx, best, now) {
  // Awning stripes.
  for (let i = 0; i < 16; i++) {
    ctx.fillStyle = i % 2 === 0 ? PALETTE.terracotta : PALETTE.cream;
    ctx.fillRect(i * 80, 44, 80, 46);
    ctx.beginPath();
    ctx.arc(i * 80 + 40, 90, 40, 0, Math.PI);
    ctx.fill();
  }
  ctx.fillStyle = PALETTE.woodDark;
  ctx.fillRect(0, 118, VIEW_W, 8);

  text(ctx, 'WARUNG', VIEW_W / 2, 208, 76, 900, PALETTE.terracotta, 'center');
  text(ctx, 'KILAT', VIEW_W / 2, 282, 76, 900, PALETTE.teal, 'center');
  text(
    ctx,
    'Warung cepat saji — rakit pesanan sebelum pelanggan kabur!',
    VIEW_W / 2,
    316,
    19,
    600,
    PALETTE.inkSoft,
    'center',
  );

  // How to play card.
  const card = { x: 290, y: 406, w: 700, h: 154 };
  shadow(ctx, card.x, card.y, card.w, card.h, 14);
  ctx.fillStyle = PALETTE.paper;
  rr(ctx, card.x, card.y, card.w, card.h, 14);
  ctx.fill();
  text(ctx, 'CARA MAIN', card.x + 24, card.y + 34, 17, 800, PALETTE.terracotta);
  const lines = [
    'Klik tempat bahan (atau tekan 1–8) untuk merakit hidangan di piring.',
    'Tiap tiket punya resep dan level pedas sendiri — salah bahan, piring gagal.',
    'Piring lengkap yang cocok dengan tiket membuat tombol SAJI menyala.',
    'Sajikan sebelum kesabaran pelanggan habis. 3 pelanggan kabur = shift berakhir.',
  ];
  lines.forEach((line, i) => {
    text(ctx, `•  ${line}`, card.x + 24, card.y + 64 + i * 24, 15, 500, PALETTE.ink);
  });

  if (best > 0) {
    text(
      ctx,
      `SKOR TERBAIK: ${formatScore(best)}`,
      VIEW_W / 2,
      592,
      20,
      800,
      PALETTE.teal,
      'center',
    );
  }
  const blink = Math.floor(now * 1.6) % 2 === 0;
  if (blink) {
    text(
      ctx,
      'KLIK ATAU TEKAN SPACE UNTUK MULAI',
      VIEW_W / 2,
      626,
      22,
      800,
      PALETTE.terracotta,
      'center',
    );
  }
}

function drawPausedOverlay(ctx) {
  ctx.fillStyle = 'rgba(46,33,24,0.55)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  text(ctx, 'JEDA', VIEW_W / 2, 330, 72, 900, '#FFFDF6', 'center');
  text(ctx, 'Tekan P untuk lanjut main', VIEW_W / 2, 380, 22, 600, PALETTE.goldLight, 'center');
}

function drawOverScreen(ctx, world, best) {
  ctx.fillStyle = 'rgba(46,33,24,0.45)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  const panel = { x: 340, y: 130, w: 600, h: 440 };
  shadow(ctx, panel.x, panel.y, panel.w, panel.h, 16);
  ctx.fillStyle = PALETTE.paper;
  rr(ctx, panel.x, panel.y, panel.w, panel.h, 16);
  ctx.fill();
  const title =
    world.overReason === 'hearts' ? 'WARUNG TUTUP!' : 'SHIFT SELESAI!';
  text(ctx, title, VIEW_W / 2, panel.y + 72, 46, 900, PALETTE.terracotta, 'center');
  text(
    ctx,
    world.overReason === 'hearts'
      ? 'Tiga pelanggan kabur — shift berakhir lebih awal.'
      : 'Waktu shift habis — kerja bagus, juru masak!',
    VIEW_W / 2,
    panel.y + 108,
    16,
    500,
    PALETTE.inkSoft,
    'center',
  );
  const rows = [
    ['Skor akhir', formatScore(world.score)],
    ['Pesanan tersaji', String(world.served)],
    ['Kombo terbaik', `x${world.bestCombo}`],
    ['Level tercapai', String(world.level)],
    ['Skor terbaik', formatScore(Math.max(best, world.score))],
  ];
  rows.forEach(([label, value], i) => {
    const y = panel.y + 160 + i * 44;
    text(ctx, label, panel.x + 48, y, 20, 600, PALETTE.ink);
    text(ctx, value, panel.x + panel.w - 48, y, 20, 800, PALETTE.teal, 'right');
  });
  text(
    ctx,
    'TEKAN ENTER / KLIK UNTUK MAIN LAGI',
    VIEW_W / 2,
    panel.y + 400,
    19,
    800,
    PALETTE.terracotta,
    'center',
  );
}

// ---- Frame ------------------------------------------------------------------

export function render(ctx, world, screen, best, now) {
  drawBackground(ctx);
  if (screen === SCREEN_TITLE) {
    // A dressed counter behind the title: three small sample plates
    // sitting between the subtitle and the how-to card.
    const sample = [
      ['nasi', 'telur', 'bumbu'],
      ['mie', 'ayam', 'bumbu'],
      ['sate', 'bumbu', 'sayur'],
    ];
    sample.forEach((items, i) => {
      const cx = 470 + i * 170;
      const cy = 362;
      const radius = 34;
      ctx.fillStyle = PALETTE.plate;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = PALETTE.plateRim;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, radius - 2, 0, Math.PI * 2);
      ctx.stroke();
      items.forEach((id, j) => {
        const angle = -Math.PI / 2 + (j * Math.PI * 2) / items.length;
        drawIngredientIcon(
          ctx,
          id,
          cx + Math.cos(angle) * 15,
          cy + Math.sin(angle) * 15,
          24,
        );
      });
    });
    drawTitleScreen(ctx, best, now);
    return;
  }

  // Play, paused and over share the live board.
  world.orders.forEach((order, slot) => drawTicket(ctx, order, slot, now));
  if (world.orders.length === 0) {
    text(
      ctx,
      'Menunggu pesanan pertama…',
      170,
      112,
      17,
      600,
      PALETTE.inkSoft,
    );
  }
  INGREDIENTS.forEach((ing, i) => drawBin(ctx, ing, i));
  world.plates.forEach((_, i) => drawPlate(ctx, world, i, now));
  drawTrashButton(ctx);
  drawSajiButton(ctx, world, now);
  drawHud(ctx, world);
  drawHints(ctx);
  drawParticles(ctx, world);

  if (screen === SCREEN_PAUSED) drawPausedOverlay(ctx);
  if (screen === SCREEN_OVER) drawOverScreen(ctx, world, best);
}

// Re-exported for input.js so clicks map to the same rects.
export { orderSlotRect, binRect, plateRect };
export { pointInRect as rectContains };
