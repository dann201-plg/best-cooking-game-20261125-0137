// Warung Kilat — mouse and keyboard input, turned into one-shot actions.
// The shell polls once per fixed step, so a click or keypress is never
// applied twice. Hit regions come from config.js, the same rects the
// renderer draws, so a click lands exactly where the picture says it will.

import { INGREDIENTS } from './recipes.js';
import { binRect, plateRect, LAYOUT, pointInRect } from './config.js';

const PLATE_KEYS = { KeyQ: 0, KeyW: 1, KeyE: 2 };

export class GameInput {
  constructor(canvas) {
    this.canvas = canvas;
    this.queue = [];
    canvas.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      this.queue.push({ kind: 'click', x: event.clientX, y: event.clientY });
    });
    window.addEventListener('keydown', (event) => {
      if (event.repeat) return;
      this.queue.push({ kind: 'key', code: event.code });
      if (event.code === 'Space') event.preventDefault();
    });
  }

  // Convert a client-space pointer into logical 1280x720 canvas space.
  toLogical(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * 1280,
      y: ((clientY - rect.top) / rect.height) * 720,
    };
  }

  // Drain everything queued since the last poll into one action bundle.
  poll() {
    const actions = {
      add: null,
      plate: null,
      serve: false,
      trash: false,
      pause: false,
      start: false,
    };
    for (const event of this.queue) {
      if (event.kind === 'key') {
        const digit = /^Digit([1-8])$/.exec(event.code);
        if (digit) {
          actions.add = INGREDIENTS[Number(digit[1]) - 1].id;
        } else if (event.code in PLATE_KEYS) {
          actions.plate = PLATE_KEYS[event.code];
        } else if (event.code === 'Space' || event.code === 'Enter') {
          actions.serve = true;
          actions.start = true;
        } else if (event.code === 'KeyX') {
          actions.trash = true;
        } else if (event.code === 'KeyP') {
          actions.pause = true;
        }
        continue;
      }
      // Mouse click: bins, plates, SAJI, trash — otherwise a plain tap.
      const p = this.toLogical(event.x, event.y);
      let hit = false;
      for (let i = 0; i < INGREDIENTS.length; i++) {
        if (pointInRect(p.x, p.y, binRect(i))) {
          actions.add = INGREDIENTS[i].id;
          hit = true;
          break;
        }
      }
      if (!hit) {
        for (let i = 0; i < 3; i++) {
          if (pointInRect(p.x, p.y, plateRect(i))) {
            actions.plate = i;
            hit = true;
            break;
          }
        }
      }
      if (!hit && pointInRect(p.x, p.y, LAYOUT.saji)) {
        actions.serve = true;
        hit = true;
      }
      if (!hit && pointInRect(p.x, p.y, LAYOUT.trash)) {
        actions.trash = true;
        hit = true;
      }
      if (!hit) actions.start = true;
    }
    this.queue = [];
    return actions;
  }
}
