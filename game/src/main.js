// Warung Kilat — boot, the fixed-step loop, screen flow and shot mode.
// The rules tick at a fixed 1/60 s so a shift plays the same on any
// machine; rendering happens once per animation frame. With ?shot= in
// the URL the game stages one deterministic scene instead, paints it
// twice and raises window.__shotReady for the screenshot tool.

import { createWorld, stepWorld } from './world.js';
import {
  render,
  SCREEN_TITLE,
  SCREEN_PLAY,
  SCREEN_PAUSED,
  SCREEN_OVER,
} from './render.js';
import { GameInput } from './input.js';
import { Sfx } from './audio.js';
import { stageShot } from './shots.js';

const STEP = 1 / 60;
const BEST_KEY = 'warung-kilat-best';

function loadBest() {
  try {
    return Number(window.localStorage.getItem(BEST_KEY)) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    /* best score is a nicety; never break the game over it */
  }
}

function playEventSounds(sfx, events) {
  for (const event of events) {
    if (event.type === 'add') {
      sfx.chop();
      if (event.complete) sfx.sizzle();
    } else if (event.type === 'serve') {
      sfx.ding();
    } else if (event.type === 'wrong' || event.type === 'serveFail') {
      sfx.buzz();
    } else if (event.type === 'miss') {
      sfx.miss();
    } else if (event.type === 'level') {
      sfx.levelUp();
    } else if (event.type === 'clear') {
      sfx.click();
    }
  }
}

function randomSeed() {
  return (Math.random() * 0x7fffffff) | 0;
}

function boot() {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const input = new GameInput(canvas);
  const sfx = new Sfx();
  let best = loadBest();

  // Screenshot mode: ?shot=start|play|serve|end&seed=N
  const params = new URLSearchParams(window.location.search);
  const shot = params.get('shot');
  if (shot) {
    const seed = Number(params.get('seed') || '1') || 1;
    const staged = stageShot(shot, seed, best);
    render(ctx, staged.world, staged.screen, staged.best, 0);
    render(ctx, staged.world, staged.screen, staged.best, 0);
    window.__shotReady = true;
    return;
  }

  let world = createWorld(randomSeed());
  let screen = SCREEN_TITLE;
  let last = performance.now();
  let acc = 0;

  function startGame() {
    world = createWorld(randomSeed());
    screen = SCREEN_PLAY;
    sfx.unlock();
    sfx.click();
  }

  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    const actions = input.poll();
    if (actions.add || actions.plate !== null || actions.serve || actions.start) {
      sfx.unlock();
    }

    if (screen === SCREEN_TITLE) {
      if (actions.start) startGame();
    } else if (screen === SCREEN_PLAY) {
      if (actions.pause) {
        screen = SCREEN_PAUSED;
      } else {
        acc += dt;
        while (acc >= STEP) {
          acc -= STEP;
          const events = stepWorld(world, STEP, actions);
          playEventSounds(sfx, events);
          actions.add = null;
          actions.plate = null;
          actions.serve = false;
          actions.trash = false;
          if (world.over) {
            screen = SCREEN_OVER;
            if (world.score > best) {
              best = world.score;
              saveBest(best);
            }
            break;
          }
        }
      }
    } else if (screen === SCREEN_PAUSED) {
      if (actions.pause || actions.start) screen = SCREEN_PLAY;
    } else if (screen === SCREEN_OVER) {
      if (actions.start) startGame();
    }

    render(ctx, world, screen, best, now / 1000);
  }

  requestAnimationFrame(frame);
}

boot();
