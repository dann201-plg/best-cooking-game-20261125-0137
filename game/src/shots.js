// Warung Kilat — deterministic screenshot staging.
// Each scene plays the REAL rules forward from a fixed seed with a
// scripted autopilot that performs the same adds and serves a player
// would, so every screenshot is a genuine frame of the game, never a
// mock-up. The autopilot runs in three phases:
//   0 — fill plate 0 with the oldest order's recipe and serve it
//       (score and combo appear);
//   1 — put two of three ingredients on plate 1 (a dish mid-assembly);
//   2 — finish plate 2 completely and leave it (SAJI glows).
// The "end" scene instead plays the whole 150-second shift through.

import { TUNING } from './config.js';
import { createWorld, stepWorld } from './world.js';
import { SCREEN_TITLE, SCREEN_PLAY, SCREEN_OVER } from './render.js';

const STEP = 1 / 60;

function makeAutopilot(world) {
  let phase = 0;
  let targetId = null;
  let lastAddT = -10;

  function plateIndex() {
    return phase === 0 ? 0 : phase === 1 ? 1 : 2;
  }

  function decide() {
    const act = {};
    if (phase >= 3 || world.over) return act;
    const plate = world.plates[plateIndex()];
    const order =
      world.orders.find((o) => o.id === targetId) || world.orders[0];
    if (!order) return act;
    targetId = order.id;

    // The ticket we were cooking for walked away: clear and restart.
    if (
      plate.wrong ||
      (plate.items.length > 0 &&
        !plate.items.every((id) => order.ingredients.includes(id)))
    ) {
      act.plate = plateIndex();
      act.trash = true;
      return act;
    }

    // A plate can match a SMALLER recipe before it matches the ticket's
    // (Biasa is a subset of Pedas): only the ticket's exact recipe
    // counts as done, so keep adding until the sets are equal.
    const targetKey = [...order.ingredients].sort().join('+');
    const plateKey = [...plate.items].sort().join('+');
    const plateMatchesTarget = plate.items.length > 0 && plateKey === targetKey;

    if (phase === 0 && plateMatchesTarget) {
      const waiting = world.orders.some(
        (o) =>
          o.dishId === plate.matched.dish.id && o.spice === plate.matched.spice,
      );
      if (waiting) {
        act.plate = 0;
        act.serve = true;
        phase = 1;
        targetId = null;
        return act;
      }
      act.plate = 0;
      act.trash = true;
      return act;
    }
    if (phase === 1 && plate.items.length >= 2) {
      phase = 2;
      targetId = null;
      return act;
    }
    if (phase === 2 && plateMatchesTarget) {
      phase = 3;
      return act;
    }

    if (world.t - lastAddT < TUNING.shotAddGapSeconds) return act;
    const next = order.ingredients.find((id) => !plate.items.includes(id));
    if (next) {
      act.plate = plateIndex();
      act.add = next;
      lastAddT = world.t;
    }
    return act;
  }

  return {
    decide,
    get phase() {
      return phase;
    },
    setPhase(p) {
      phase = p;
    },
  };
}

function runSteps(world, seconds, decideFn, stopFn) {
  const steps = Math.ceil(seconds / STEP);
  for (let i = 0; i < steps; i++) {
    const act = decideFn ? decideFn() : {};
    const events = stepWorld(world, STEP, act);
    if (stopFn && stopFn(events)) return true;
    if (world.over) return true;
  }
  return false;
}

// Stage one scene. Returns { world, screen, best } for the renderer.
export function stageShot(scene, seed, best) {
  const world = createWorld(seed);

  if (scene === 'start') {
    return { world, screen: SCREEN_TITLE, best };
  }

  if (scene === 'serve') {
    const auto = makeAutopilot(world);
    runSteps(world, 60, () => auto.decide(), () => auto.phase >= 3);
    // Let the board fill so the serve lands with tickets still waiting.
    runSteps(world, 20, null, () => world.orders.length >= 2);
    // Serve the finished plate while other tickets are on the board.
    stepWorld(world, STEP, { plate: 2, serve: true });
    // Let the coins fly and the popup show.
    runSteps(world, 0.45, null);
    return { world, screen: SCREEN_PLAY, best };
  }

  if (scene === 'end') {
    const auto = makeAutopilot(world);
    function endlessDecide() {
      if (auto.phase >= 3) {
        const plate = world.plates[2];
        if (plate.matched) {
          const waiting = world.orders.some(
            (o) =>
              o.dishId === plate.matched.dish.id &&
              o.spice === plate.matched.spice,
          );
          auto.setPhase(0);
          return waiting
            ? { plate: 2, serve: true }
            : { plate: 2, trash: true };
        }
        auto.setPhase(0);
        return {};
      }
      return auto.decide();
    }
    runSteps(world, 400, endlessDecide);
    return {
      world,
      screen: SCREEN_OVER,
      best: Math.max(best, world.score),
    };
  }

  // Default: the 'play' scene.
  const auto = makeAutopilot(world);
  runSteps(world, 60, () => auto.decide(), () => auto.phase >= 3);
  // Let the board fill to 2-3 tickets before freezing the frame.
  runSteps(world, 25, null, () => world.orders.length >= 3);
  runSteps(world, 1.5, null);
  return { world, screen: SCREEN_PLAY, best };
}
