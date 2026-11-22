// Boot and the one loop: input is read every frame, the world advances in fixed 1/60 s steps
// (several in a slow frame, none in a fast one), and the renderer paints what is there. The game
// moves between five screens: title, play, paused, getaway win and busted.
//
// ?seed=N fixes the random pattern. ?shot=start|play|tools|end (with &seed=N) stages that scene
// instead of running the loop, paints it twice and sets window.__shotReady for a screenshot.
import { BEST_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import {
  EVENT_DIAMOND, EVENT_LOCKDOWN, EVENT_OVER, EVENT_PICKUP, EVENT_SPOTTED, EVENT_TOOL, EVENT_WIN,
  createWorld,
} from './world.js';
import {
  ACTION_CONFIRM, ACTION_DASH, ACTION_MUTE, ACTION_PAUSE, createInput,
} from './input.js';
import { createAudio } from './audio.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped, not replayed. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
const audio = createAudio();

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best loot then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();

  // Screen readers (and anyone watching the page's text) hear the screen changes and each hit.
  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    world.reset();
    accumulator = 0;
    screen = SCREEN_PLAY;
    announce('Playing. Grab the Marlin Diamond and reach the boat.');
  }

  function endGame(won) {
    screen = won ? SCREEN_WIN : SCREEN_OVER;
    if (world.state.score > best) {
      best = world.state.score;
      saveBest(best);
    }
    announce(won
      ? `Clean getaway! Loot ${world.state.score}. Best ${best}.`
      : `Busted. Loot ${world.state.score}. Best ${best}.`);
  }

  function playSounds(events) {
    if (events & EVENT_WIN) audio.win();
    else if (events & EVENT_OVER) audio.lose();
    else if (events & EVENT_LOCKDOWN) audio.lockdown();
    else if (events & EVENT_SPOTTED) audio.spotted();
    else if (events & EVENT_DIAMOND) audio.diamond();
    else if (events & EVENT_PICKUP) audio.pickup();
    else if (events & EVENT_TOOL) audio.click();
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_MUTE) {
      const muted = audio.toggleMute();
      announce(muted ? 'Sound off.' : 'Sound on.');
    }
    if (actions & ACTION_PAUSE && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    } else if (actions & (ACTION_PAUSE | ACTION_CONFIRM) && screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      announce('Playing.');
    } else if ((actions & ACTION_CONFIRM) && (screen === SCREEN_TITLE || screen === SCREEN_OVER || screen === SCREEN_WIN)) {
      startGame();
    }
    const click = input.takeClick();
    if (click && (screen === SCREEN_TITLE || screen === SCREEN_OVER || screen === SCREEN_WIN)) {
      startGame();
    }
    if (actions & ACTION_DASH && screen === SCREEN_PLAY) {
      // The dash edge is consumed by the step below through takeDash.
      pendingDash = true;
    }
  }

  let pendingDash = false;

  function step() {
    if (screen === SCREEN_TITLE) {
      world.step(STEP, {
        vx: 0, vy: 0, sneak: false, dash: false, select: null, click: null, mouse: input.mouse(),
      }, true);
      return;
    }
    const click = input.takeClick();
    const select = input.takeToolSelect();
    const dash = pendingDash;
    pendingDash = false;
    if (screen !== SCREEN_PLAY) return;
    const v = input.vector();
    const events = world.step(STEP, {
      vx: v.x, vy: v.y, sneak: input.sneak(), dash, select, click, mouse: input.mouse(),
    }, false);
    playSounds(events);
    if (events & EVENT_WIN) endGame(true);
    else if (events & EVENT_OVER) endGame(false);
    else if (events & EVENT_SPOTTED) announce('Spotted! Break line of sight!');
    else if (events & EVENT_DIAMOND) announce('Diamond secured! Reach the boat!');
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY) {
      while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) {
        step();
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(world.state, screen, best);
  }

  // Leaving the tab pauses a running game rather than letting cones sweep unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('Neon Palms. Press Space or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
