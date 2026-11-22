// The screenshot scenes behind ?shot=start|play|tools|end. Each one plays the real rules
// forward from a fresh world, steered by a scripted path, so the frame is what a real game
// looks like and the same seed always gives the same frame. The cover (play) is the mid-heist
// climax: thief mid-floor, cones sweeping, a camera on the room, the diamond glinting in the
// vault, the alarm meter alive — every required element in one frame.
import { STEP } from './config.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';

const START_SECONDS = 5;
const PLAY_SECONDS = 12;

/** Steer the thief along waypoints for `seconds`, invulnerable so the staging never ends early. */
function scriptedPath(world, waypoints, seconds, sneakFrom) {
  const state = world.state;
  let wp = 0;
  const steps = Math.round(seconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    const t = state.thief;
    t.invuln = 999;
    const [tx, ty] = waypoints[Math.min(wp, waypoints.length - 1)];
    const dx = tx - t.x;
    const dy = ty - t.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 14 && wp < waypoints.length - 1) wp += 1;
    const vx = dist > 1 ? dx / dist : 0;
    const vy = dist > 1 ? dy / dist : 0;
    world.step(STEP, {
      vx, vy, sneak: wp >= sneakFrom, dash: false, select: null, click: null, mouse: { x: t.x, y: t.y },
    }, false);
  }
  state.thief.invuln = 0;
}

function setLoot(state, takenKinds, score) {
  for (const item of state.lootItems) {
    if (takenKinds.includes(item.kind)) item.taken = true;
  }
  state.score = score;
}

/**
 * Set `world` to the named scene and return the screen to draw over it and the best
 * loot to show. Names: start (title), play (cover climax), tools (EMP + smoke moment),
 * end (getaway win); any other name is start.
 */
export function stageShot(name, world) {
  world.reset();
  const state = world.state;

  if (name === 'play') {
    scriptedPath(world, [[150, 560], [300, 500], [430, 450], [560, 400], [610, 380]], PLAY_SECONDS, 2);
    state.thief.x = 610;
    state.thief.y = 380;
    state.thief.angle = -Math.PI / 2;
    state.thief.sneak = true;
    setLoot(state, ['cash', 'gold'], 23000);
    state.objectives.entered = true;
    state.objectives.loot15k = true;
    state.selectedTool = 'smoke';
    state.alarm = 42;
    state.time = 96;
    // Vera has the thief at the edge of her cone: suspicion high, not yet spotted.
    state.guards[1].suspicion = 68;
    state.guards[1].angle = Math.atan2(state.thief.y - state.guards[1].y, state.thief.x - state.guards[1].x);
    return { screen: SCREEN_PLAY, best: 23000 };
  }

  if (name === 'tools') {
    scriptedPath(world, [[150, 560], [300, 500], [400, 360], [490, 280]], 9, 1);
    state.thief.x = 490;
    state.thief.y = 280;
    state.thief.angle = Math.PI;
    state.thief.sneak = true;
    state.smokes.push({ x: 440, y: 310, r: 92, t: 5 });
    state.empT = 6;
    for (const c of state.cameras) c.offline = 6;
    state.tools.emp = 1;
    state.tools.smoke = 1;
    state.selectedTool = 'smoke';
    setLoot(state, ['cash', 'gold'], 18000);
    state.objectives.entered = true;
    state.objectives.loot15k = true;
    state.alarm = 18;
    state.time = 74;
    state.guards[0].suspicion = 45;
    return { screen: SCREEN_PLAY, best: 18000 };
  }

  if (name === 'end') {
    for (const item of state.lootItems) item.taken = true;
    state.score = 81000;
    state.objectives.entered = true;
    state.objectives.loot15k = true;
    state.objectives.diamond = true;
    state.objectives.loot50k = true;
    state.thief.x = 1200;
    state.thief.y = 610;
    state.alarm = 12;
    state.time = 187;
    world.step(STEP, {
      vx: 0, vy: 0, sneak: false, dash: false, select: null, click: null, mouse: { x: 1200, y: 610 },
    }, false);
    return { screen: state.won ? SCREEN_WIN : SCREEN_OVER, best: 81000 };
  }

  for (let i = 0; i < START_SECONDS / STEP; i += 1) {
    world.step(STEP, {
      vx: 0, vy: 0, sneak: false, dash: false, select: null, click: null, mouse: { x: 640, y: 360 },
    }, true);
  }
  return { screen: SCREEN_TITLE, best: 0 };
}
