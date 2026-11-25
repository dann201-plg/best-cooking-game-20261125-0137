// Warung Kilat — the pure rules: orders, plates, timers, score.
// No browser APIs here on purpose: the same module runs in Node for the
// smoke test and in the browser for the game, and the same seed plus the
// same actions always replay the same shift.
//
// Actions passed to stepWorld each fixed step:
//   { add: ingredientId | null, plate: index | null, serve: bool, trash: bool }
// Every step returns the events it caused, so the shell can play sounds
// and the renderer can react without reading the rules' mind.

import { TUNING, plateCenter, SPICE } from './config.js';
import { mulberry32, pickWeighted } from './random.js';
import {
  DISHES,
  matchRecipe,
  canStillBecomeDish,
  dishPrice,
} from './recipes.js';

export function createWorld(seed) {
  return {
    seed,
    rng: mulberry32(seed),
    t: 0,
    shiftLeft: TUNING.shiftSeconds,
    score: 0,
    served: 0,
    combo: 0,
    bestCombo: 0,
    hearts: TUNING.startHearts,
    level: 1,
    levelClock: 0,
    serveStreak: 0,
    orders: [],
    plates: Array.from({ length: TUNING.plateCount }, () => ({
      items: [],
      wrong: false,
      shake: 0,
      matched: null,
    })),
    activePlate: 0,
    spawnTimer: 0.5,
    nextOrderId: 1,
    particles: [],
    popups: [],
    over: false,
    overReason: null,
  };
}

export function maxOrdersForLevel(level) {
  if (level >= 5) return 4;
  return 3;
}

function spawnIntervalSeconds(world) {
  const base = Math.max(
    TUNING.spawnMinSeconds,
    TUNING.spawnBaseSeconds - world.level * TUNING.spawnPerLevelSeconds,
  );
  return base * (0.85 + world.rng() * 0.3);
}

function pickSpice(world) {
  const level = world.level;
  const table =
    level <= 1
      ? [[0, 7], [1, 2], [2, 1]]
      : level <= 3
        ? [[0, 5], [1, 3], [2, 2]]
        : [[0, 3], [1, 3], [2, 4]];
  return pickWeighted(world.rng, table);
}

function spawnOrder(world) {
  const dish = DISHES[Math.floor(world.rng() * DISHES.length)];
  const spice = pickSpice(world);
  const patienceMax =
    Math.max(
      TUNING.patienceMinSeconds,
      TUNING.patienceBaseSeconds -
        (world.level - 1) * TUNING.patiencePerLevelSeconds,
    ) +
    world.rng() * TUNING.patienceJitterSeconds;
  const order = {
    id: world.nextOrderId++,
    dishId: dish.id,
    dishName: dish.name,
    spice,
    ingredients: [...dish.recipes[spice]],
    patience: patienceMax,
    patienceMax,
    price: dishPrice(dish, spice),
  };
  world.orders.push(order);
  return order;
}

function levelUp(world, events) {
  if (world.level >= TUNING.maxLevel) return;
  world.level += 1;
  events.push({ type: 'level', level: world.level });
}

function burstCoins(world, x, y, count) {
  for (let i = 0; i < count; i++) {
    const angle = -Math.PI / 2 + (world.rng() - 0.5) * 1.8;
    const speed = 160 + world.rng() * 260;
    world.particles.push({
      kind: 'coin',
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.9,
      maxLife: 0.9,
      size: 7 + world.rng() * 4,
    });
  }
}

function addPopup(world, x, y, text, color) {
  world.popups.push({ x, y, text, color, life: 1.25, maxLife: 1.25 });
}

function oldestMatchingOrder(world, matched) {
  return world.orders.find(
    (o) => o.dishId === matched.dish.id && o.spice === matched.spice,
  );
}

// True when some plate holds a finished dish an order is waiting for.
export function sajiReady(world) {
  return world.plates.some((plate) => {
    if (!plate.matched) return false;
    return oldestMatchingOrder(world, plate.matched) !== undefined;
  });
}

function clearPlate(plate) {
  plate.items = [];
  plate.wrong = false;
  plate.shake = 0;
  plate.matched = null;
}

function updateParticles(world, dt) {
  for (const p of world.particles) {
    p.life -= dt;
    p.vy += 900 * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
  }
  world.particles = world.particles.filter((p) => p.life > 0);
  for (const p of world.popups) {
    p.life -= dt;
    p.y -= 42 * dt;
  }
  world.popups = world.popups.filter((p) => p.life > 0);
}

export function stepWorld(world, dt, actions = {}) {
  const events = [];
  if (world.over) {
    updateParticles(world, dt);
    return events;
  }

  // --- Clock: shift time, level time, order spawns, patience. ---
  world.t += dt;
  world.shiftLeft -= dt;
  if (world.shiftLeft <= 0) {
    world.shiftLeft = 0;
    world.over = true;
    world.overReason = 'shift';
    events.push({ type: 'over', reason: 'shift' });
    updateParticles(world, dt);
    return events;
  }

  world.levelClock += dt;
  if (world.levelClock >= TUNING.levelSeconds) {
    world.levelClock -= TUNING.levelSeconds;
    levelUp(world, events);
  }

  world.spawnTimer -= dt;
  if (
    world.spawnTimer <= 0 &&
    world.orders.length < maxOrdersForLevel(world.level)
  ) {
    const order = spawnOrder(world);
    events.push({ type: 'spawn', orderId: order.id });
    world.spawnTimer = spawnIntervalSeconds(world);
  } else if (world.spawnTimer <= 0) {
    world.spawnTimer = 1.0;
  }

  for (let i = world.orders.length - 1; i >= 0; i--) {
    const order = world.orders[i];
    order.patience -= dt;
    if (order.patience <= 0) {
      world.orders.splice(i, 1);
      world.hearts -= 1;
      world.combo = 0;
      events.push({ type: 'miss', orderId: order.id, dishName: order.dishName });
      if (world.hearts <= 0) {
        world.hearts = 0;
        world.over = true;
        world.overReason = 'hearts';
        events.push({ type: 'over', reason: 'hearts' });
        updateParticles(world, dt);
        return events;
      }
    }
  }

  for (const plate of world.plates) {
    if (plate.shake > 0) plate.shake = Math.max(0, plate.shake - dt);
  }
  updateParticles(world, dt);

  // --- Player actions. ---
  if (typeof actions.plate === 'number') {
    world.activePlate = Math.max(
      0,
      Math.min(TUNING.plateCount - 1, actions.plate),
    );
  }

  if (actions.add) {
    const plate = world.plates[world.activePlate];
    const id = actions.add;
    if (plate.items.length >= 4) {
      events.push({ type: 'full', plate: world.activePlate });
    } else if (plate.items.includes(id)) {
      plate.items.push(id);
      plate.wrong = true;
      plate.shake = 0.4;
      plate.matched = null;
      events.push({ type: 'wrong', plate: world.activePlate, ingredient: id });
    } else {
      const candidate = [...plate.items, id];
      if (!canStillBecomeDish(candidate)) {
        plate.items.push(id);
        plate.wrong = true;
        plate.shake = 0.4;
        plate.matched = null;
        events.push({ type: 'wrong', plate: world.activePlate, ingredient: id });
      } else {
        plate.items.push(id);
        plate.matched = matchRecipe(plate.items);
        events.push({
          type: 'add',
          plate: world.activePlate,
          ingredient: id,
          complete: plate.matched !== null,
        });
      }
    }
  }

  if (actions.trash) {
    const plate = world.plates[world.activePlate];
    if (plate.items.length > 0) {
      clearPlate(plate);
      events.push({ type: 'clear', plate: world.activePlate });
    }
  }

  if (actions.serve) {
    const plate = world.plates[world.activePlate];
    if (plate.items.length === 0) {
      events.push({ type: 'serveFail', reason: 'empty' });
    } else if (plate.wrong || !plate.matched) {
      plate.shake = 0.45;
      events.push({
        type: 'serveFail',
        reason: plate.wrong ? 'wrong' : 'incomplete',
      });
    } else {
      const order = oldestMatchingOrder(world, plate.matched);
      if (!order) {
        plate.shake = 0.45;
        events.push({ type: 'serveFail', reason: 'no-order' });
      } else {
        const tip = Math.round(
          order.price *
            TUNING.tipFraction *
            Math.max(0, order.patience / order.patienceMax),
        );
        const gain = order.price + tip + world.combo * TUNING.comboBonusPerStep;
        world.score += gain;
        world.served += 1;
        world.combo += 1;
        world.bestCombo = Math.max(world.bestCombo, world.combo);
        world.serveStreak += 1;
        const center = plateCenter(world.activePlate);
        burstCoins(world, center.x, center.y - 20, 10);
        addPopup(
          world,
          center.x,
          center.y - 20,
          `SERVED +${gain}`,
          '#1F7A6D',
        );
        if (world.combo >= 2) {
          addPopup(
            world,
            center.x,
            center.y + 96,
            `KOMBO x${world.combo}`,
            '#E8A33D',
          );
        }
        world.orders = world.orders.filter((o) => o.id !== order.id);
        clearPlate(plate);
        events.push({
          type: 'serve',
          orderId: order.id,
          gain,
          price: order.price,
          tip,
          combo: world.combo,
        });
        if (world.serveStreak >= TUNING.servesPerLevel) {
          world.serveStreak = 0;
          levelUp(world, events);
        }
      }
    }
  }

  return events;
}
