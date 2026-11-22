// The heist itself: the vault floor, the patrols, the cameras, the loot and the alarm.
// The thief crosses one room — the Marlin Vault — past three guards with vision cones and
// two sweeping CCTV cameras, lifts the Marlin Diamond and the cash, and reaches the boat.
// Everything the renderer draws and the screenshots stage comes from this state.

import {
  CAMERA, FIELD, GUARD, HUD_BOTTOM, HUD_TOP, LIVES, LOOT_VALUES, STEP, THIEF, TOOLS,
} from './config.js';

export const EVENT_HIT = 1;
export const EVENT_OVER = 2;
export const EVENT_WIN = 4;
export const EVENT_PICKUP = 8;
export const EVENT_SPOTTED = 16;
export const EVENT_DIAMOND = 32;
export const EVENT_LOCKDOWN = 64;
export const EVENT_TOOL = 128;

/** Solid rectangles: walls and display cases. They block movement and line of sight. */
export const WALLS = [
  { x: 0, y: HUD_TOP, w: 1280, h: 10 },
  { x: 0, y: HUD_BOTTOM - 10, w: 1280, h: 10 },
  { x: 0, y: HUD_TOP, w: 10, h: HUD_BOTTOM - HUD_TOP },
  { x: 1270, y: HUD_TOP, w: 10, h: HUD_BOTTOM - HUD_TOP },
  // Vault room, top centre: side walls + front wall with a wide door gap at x 600..680,
  // so leaving the vault never means threading a slit.
  { x: 520, y: HUD_TOP, w: 12, h: 96 },
  { x: 748, y: HUD_TOP, w: 12, h: 96 },
  { x: 520, y: 148, w: 80, h: 12 },
  { x: 680, y: 148, w: 80, h: 12 },
];

/** Display cases and counters: cover the thief can hide behind. Every piece sits clear of
 * the guards' patrol legs and leaves at least a thief-wide gap to its neighbours, so no
 * corner can wedge the thief and no guard ever walks through a case. */
export const COVER = [
  { x: 230, y: 190, w: 150, h: 56 },
  { x: 900, y: 190, w: 150, h: 56 },
  { x: 290, y: 400, w: 170, h: 56 },
  { x: 820, y: 400, w: 170, h: 56 },
  { x: 560, y: 310, w: 160, h: 52 },
  { x: 500, y: 230, w: 26, h: 26 },
  { x: 780, y: 230, w: 26, h: 26 },
  { x: 250, y: 540, w: 26, h: 26 },
  { x: 1030, y: 540, w: 26, h: 26 },
  { x: 60, y: 300, w: 90, h: 40 },
  { x: 1130, y: 300, w: 90, h: 40 },
];

export const SOLIDS = [...WALLS, ...COVER];

export const VAULT = { x: 532, y: 76, w: 216, h: 72 };
export const DOCK = { x: 1140, y: 570, w: 120, h: 76 };
export const SPAWN = { x: 90, y: 600 };

/** Clickable tool chips in the left HUD panel (shared with the renderer). */
export const TOOL_CHIPS = [
  { tool: 'emp', x: 20, y: 252, w: 168, h: 38 },
  { tool: 'smoke', x: 20, y: 296, w: 168, h: 38 },
  { tool: 'lockpick', x: 20, y: 340, w: 168, h: 38 },
];

const GUARD_DEFS = [
  {
    name: 'ROCCO',
    waypoints: [[200, 150], [430, 150], [430, 330], [200, 330]],
  },
  {
    name: 'VERA',
    waypoints: [[850, 150], [1080, 150], [1080, 330], [850, 330]],
  },
  {
    name: 'MILO',
    waypoints: [[470, 540], [810, 540], [810, 610], [470, 610]],
  },
];

const CAMERA_DEFS = [
  { x: 320, y: 104, baseAngle: Math.PI / 2, phase: 0 },
  { x: 960, y: 104, baseAngle: Math.PI / 2, phase: 2.1 },
];

const LOOT_DEFS = [
  { kind: 'cash', x: 250, y: 268 },
  { kind: 'cash', x: 1030, y: 268 },
  { kind: 'cash', x: 640, y: 428 },
  { kind: 'gold', x: 380, y: 480 },
  { kind: 'gold', x: 900, y: 480 },
  { kind: 'diamond', x: 640, y: 110 },
];

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  return d;
}

function pointInSolids(x, y) {
  for (const r of SOLIDS) {
    if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return true;
  }
  return false;
}

/** True when the straight segment between two points crosses no wall or case. */
function losClear(x1, y1, x2, y2) {
  const dist = Math.hypot(x2 - x1, y2 - y1);
  const steps = Math.max(1, Math.ceil(dist / 7));
  for (let i = 1; i < steps; i += 1) {
    const t = i / steps;
    if (pointInSolids(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t)) return false;
  }
  return true;
}

/** Push a circle out of every solid it overlaps, so the thief slides along walls instead
 * of wedging into a corner. Runs a few passes because one push can create another overlap. */
function resolveCircle(t, r) {
  for (let iter = 0; iter < 3; iter += 1) {
    let pushed = false;
    for (const s of SOLIDS) {
      const cx = Math.max(s.x, Math.min(t.x, s.x + s.w));
      const cy = Math.max(s.y, Math.min(t.y, s.y + s.h));
      const dx = t.x - cx;
      const dy = t.y - cy;
      const d2 = dx * dx + dy * dy;
      if (d2 < r * r) {
        if (d2 > 0.0001) {
          const d = Math.sqrt(d2);
          const push = (r - d) / d;
          t.x += dx * push;
          t.y += dy * push;
        } else {
          // Centre inside the rectangle: leave by the shallowest side.
          const left = t.x - s.x;
          const right = s.x + s.w - t.x;
          const top = t.y - s.y;
          const bottom = s.y + s.h - t.y;
          const m = Math.min(left, right, top, bottom);
          if (m === left) t.x = s.x - r;
          else if (m === right) t.x = s.x + s.w + r;
          else if (m === top) t.y = s.y - r;
          else t.y = s.y + s.h + r;
        }
        pushed = true;
      }
    }
    t.x = Math.max(10 + r, Math.min(1270 - r, t.x));
    t.y = Math.max(HUD_TOP + 10 + r, Math.min(HUD_BOTTOM - 10 - r, t.y));
    if (!pushed) break;
  }
}

export function createWorld() {
  let state = null;

  function reset() {
    state = {
      time: 0,
      score: 0,
      alarm: 0,
      lives: LIVES,
      won: false,
      over: false,
      thief: {
        x: SPAWN.x, y: SPAWN.y, angle: -Math.PI / 2, sneak: false,
        dashT: 0, dashCd: 0, invuln: 0, moving: false,
      },
      guards: GUARD_DEFS.map((d) => ({
        name: d.name,
        waypoints: d.waypoints,
        x: d.waypoints[0][0],
        y: d.waypoints[0][1],
        wp: 1,
        wait: 0,
        scanPhase: 0,
        angle: 0,
        suspicion: 0,
        mode: 'patrol',
        chaseT: 0,
        tx: 0,
        ty: 0,
      })),
      cameras: CAMERA_DEFS.map((d) => ({
        x: d.x, y: d.y, baseAngle: d.baseAngle, phase: d.phase, angle: d.baseAngle, offline: 0,
      })),
      lootItems: LOOT_DEFS.map((d) => ({ ...d, taken: false, progress: 0 })),
      smokes: [],
      empT: 0,
      tools: { emp: TOOLS.empCount, smoke: TOOLS.smokeCount },
      selectedTool: 'emp',
      objectives: { entered: false, loot15k: false, diamond: false, loot50k: false, escaped: false },
      banners: [],
      mouse: { x: 640, y: 360 },
      alarmHot: false,
    };
    for (const g of state.guards) {
      const [tx, ty] = g.waypoints[1];
      g.angle = Math.atan2(ty - g.y, tx - g.x);
    }
  }

  function pushBanner(text, sub, color) {
    state.banners = [{ text, sub, color, t: 2.4, max: 2.4 }];
  }

  function thiefInSmoke() {
    for (const s of state.smokes) {
      if (Math.hypot(state.thief.x - s.x, state.thief.y - s.y) < s.r) return true;
    }
    return false;
  }

  function seesThief(ox, oy, angle, halfAngle, length) {
    if (state.thief.invuln > 0) return false;
    if (thiefInSmoke()) return false;
    const dx = state.thief.x - ox;
    const dy = state.thief.y - oy;
    const dist = Math.hypot(dx, dy);
    if (dist > length) return false;
    if (Math.abs(angleDiff(Math.atan2(dy, dx), angle)) > halfAngle) return false;
    return losClear(ox, oy, state.thief.x, state.thief.y);
  }

  function caughtByGuard() {
    let events = EVENT_HIT;
    state.lives -= 1;
    state.alarm = Math.min(100, state.alarm + 15);
    state.thief.x = SPAWN.x;
    state.thief.y = SPAWN.y;
    state.thief.invuln = 2.5;
    state.thief.dashT = 0;
    for (const g of state.guards) {
      g.mode = 'patrol';
      g.suspicion = 0;
      g.chaseT = 0;
    }
    pushBanner('CAUGHT!', 'Rocco drags you back to the door — one life gone', '#ff4d5e');
    if (state.lives <= 0) {
      state.over = true;
      events |= EVENT_OVER;
    }
    return events;
  }

  function lockdown() {
    let events = EVENT_LOCKDOWN | EVENT_HIT;
    state.lives -= 1;
    state.alarm = 45;
    state.thief.x = SPAWN.x;
    state.thief.y = SPAWN.y;
    state.thief.invuln = 2.5;
    state.thief.dashT = 0;
    for (const g of state.guards) {
      g.mode = 'patrol';
      g.suspicion = 0;
      g.chaseT = 0;
    }
    pushBanner('LOCKDOWN!', 'The vault seals — the crew pulls you out, one life gone', '#ff4d5e');
    if (state.lives <= 0) {
      state.over = true;
      events |= EVENT_OVER;
    }
    return events;
  }

  function moveThief(dx, dy) {
    const t = state.thief;
    t.x += dx;
    t.y += dy;
    resolveCircle(t, THIEF.radius);
  }

  function useToolAt(tool, x, y) {
    if (tool === 'emp') {
      if (state.tools.emp <= 0 || state.empT > 0) return 0;
      state.tools.emp -= 1;
      state.empT = TOOLS.empDuration;
      for (const c of state.cameras) c.offline = TOOLS.empDuration;
      pushBanner('EMP BURST', 'Cameras dark for 10 seconds — move!', '#2de2c5');
      return EVENT_TOOL;
    }
    if (tool === 'smoke') {
      if (state.tools.smoke <= 0) return 0;
      state.tools.smoke -= 1;
      state.smokes.push({ x, y, r: TOOLS.smokeRadius, t: TOOLS.smokeDuration });
      return EVENT_TOOL;
    }
    return 0;
  }

  function step(dt, input, attract) {
    if (!state) reset();
    let events = 0;

    // Patrols and cameras always sweep, even on the title screen.
    for (const g of state.guards) {
      if (g.mode === 'patrol') {
        const [tx, ty] = g.waypoints[g.wp];
        const dx = tx - g.x;
        const dy = ty - g.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 6) {
          g.wait += dt;
          g.scanPhase += dt;
          g.angle = Math.atan2(dy, dx) + Math.sin(g.scanPhase * 1.1) * GUARD.scanArc;
          if (g.wait >= GUARD.scanPause) {
            g.wait = 0;
            g.wp = (g.wp + 1) % g.waypoints.length;
          }
        } else {
          g.wait = 0;
          const stepLen = Math.min(dist, GUARD.patrolSpeed * dt);
          g.x += (dx / dist) * stepLen;
          g.y += (dy / dist) * stepLen;
          g.angle = Math.atan2(dy, dx);
        }
      }
    }
    for (const c of state.cameras) {
      if (c.offline > 0) c.offline -= dt;
      else c.angle = c.baseAngle + Math.sin((state.time * 2 * Math.PI) / CAMERA.sweepPeriod + c.phase) * CAMERA.sweepArc;
    }
    for (const s of state.smokes) s.t -= dt;
    state.smokes = state.smokes.filter((s) => s.t > 0);
    if (state.empT > 0) state.empT -= dt;
    for (const b of state.banners) b.t -= dt;
    state.banners = state.banners.filter((b) => b.t > 0);

    if (attract) {
      state.time += dt;
      return 0;
    }
    if (state.won || state.over) return 0;

    state.time += dt;
    const t = state.thief;
    if (t.invuln > 0) t.invuln -= dt;
    if (t.dashCd > 0) t.dashCd -= dt;
    if (input.mouse) state.mouse = input.mouse;

    if (input.select) {
      state.selectedTool = input.select;
      events |= EVENT_TOOL;
    }
    if (input.click) {
      const chip = TOOL_CHIPS.find((c) => input.click.x >= c.x && input.click.x <= c.x + c.w
        && input.click.y >= c.y && input.click.y <= c.y + c.h);
      if (chip) state.selectedTool = chip.tool;
      else if (input.click.y > HUD_TOP && input.click.y < HUD_BOTTOM) {
        events |= useToolAt(state.selectedTool, input.click.x, input.click.y);
      }
    }

    // Movement: sneak is slow and quiet, dash is fast and loud.
    const speed = t.dashT > 0 ? THIEF.dashSpeed : input.sneak ? THIEF.sneakSpeed : THIEF.speed;
    t.sneak = input.sneak;
    t.moving = input.vx !== 0 || input.vy !== 0;
    if (t.moving) t.angle = Math.atan2(input.vy, input.vx);
    if (input.dash && t.dashCd <= 0 && t.moving) {
      t.dashT = THIEF.dashTime;
      t.dashCd = THIEF.dashCooldown;
      const nx = t.x + Math.cos(t.angle) * 130;
      const ny = t.y + Math.sin(t.angle) * 130;
      for (const g of state.guards) {
        if (g.mode === 'patrol' && Math.hypot(g.x - nx, g.y - ny) < 300) {
          g.mode = 'investigate';
          g.tx = nx;
          g.ty = ny;
        }
      }
    }
    if (t.dashT > 0) t.dashT -= dt;
    moveThief(input.vx * speed * dt, input.vy * speed * dt);

    // Objectives: crossing into the floor, and the loot totals.
    if (!state.objectives.entered && Math.hypot(t.x - SPAWN.x, t.y - SPAWN.y) > 130) {
      state.objectives.entered = true;
    }
    if (!state.objectives.loot15k && state.score >= 15000) state.objectives.loot15k = true;
    if (!state.objectives.loot50k && state.score >= 50000) state.objectives.loot50k = true;

    // Guard senses.
    let anyDetection = false;
    for (const g of state.guards) {
      if (g.mode === 'chase') {
        g.chaseT -= dt;
        const dx = t.x - g.x;
        const dy = t.y - g.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 1) {
          const stepLen = Math.min(dist, GUARD.chaseSpeed * dt);
          g.x += (dx / dist) * stepLen;
          g.y += (dy / dist) * stepLen;
          g.angle = Math.atan2(dy, dx);
        }
        if (dist < 26) {
          events |= caughtByGuard();
          if (state.over) return events;
          continue;
        }
        if (g.chaseT <= 0 && !seesThief(g.x, g.y, g.angle, GUARD.coneHalfAngle, GUARD.coneLength)) {
          g.mode = 'return';
        }
        continue;
      }
      if (g.mode === 'investigate') {
        const dx = g.tx - g.x;
        const dy = g.ty - g.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 8) {
          g.wait += dt;
          if (g.wait > 1.2) {
            g.wait = 0;
            g.mode = 'patrol';
          }
        } else {
          const stepLen = Math.min(dist, GUARD.patrolSpeed * 1.4 * dt);
          g.x += (dx / dist) * stepLen;
          g.y += (dy / dist) * stepLen;
          g.angle = Math.atan2(dy, dx);
        }
      }
      if (g.mode === 'return') {
        let best = 0;
        let bestDist = Infinity;
        g.waypoints.forEach(([wx, wy], i) => {
          const d = Math.hypot(wx - g.x, wy - g.y);
          if (d < bestDist) {
            bestDist = d;
            best = i;
          }
        });
        g.wp = best;
        g.mode = 'patrol';
      }
      if (g.mode === 'patrol' || g.mode === 'investigate') {
        const dist = Math.hypot(t.x - g.x, t.y - g.y);
        const seen = seesThief(g.x, g.y, g.angle, GUARD.coneHalfAngle, GUARD.coneLength);
        if (seen) {
          anyDetection = true;
          let rate = dist < 120 ? GUARD.closeDetectRate : GUARD.detectRate;
          if (t.sneak) rate *= 0.45;
          g.suspicion = Math.min(100, g.suspicion + rate * dt);
          if (g.suspicion >= 100) {
            g.mode = 'chase';
            g.chaseT = GUARD.chaseTime;
            g.suspicion = 55;
            state.alarm = Math.min(100, state.alarm + 25);
            pushBanner('SPOTTED!', `${g.name} saw you — break line of sight!`, '#ff4d5e');
            events |= EVENT_SPOTTED;
          }
        } else {
          g.suspicion = Math.max(0, g.suspicion - GUARD.forgetRate * dt);
        }
      }
    }

    // Camera senses.
    for (const c of state.cameras) {
      if (c.offline > 0) continue;
      if (seesThief(c.x, c.y, c.angle, CAMERA.coneHalfAngle, CAMERA.coneLength)) {
        anyDetection = true;
        state.alarm = Math.min(100, state.alarm + CAMERA.alarmRate * dt);
        if (!state.alarmHot && state.alarm > 70) {
          state.alarmHot = true;
          pushBanner('ALARM RISING', 'A camera has you — get out of its cone!', '#ff9f43');
        }
      }
    }
    if (state.alarm < 60) state.alarmHot = false;
    if (!anyDetection) state.alarm = Math.max(0, state.alarm - 2.2 * dt);

    // Loot: walk over cash and gold; the diamond needs the lockpick held in the vault.
    for (const item of state.lootItems) {
      if (item.taken) continue;
      const dist = Math.hypot(t.x - item.x, t.y - item.y);
      if (item.kind === 'diamond') {
        if (dist < 46 && state.selectedTool === 'lockpick') {
          item.progress += dt / TOOLS.lockpickSeconds;
          if (item.progress >= 1) {
            item.taken = true;
            state.score += LOOT_VALUES.diamond;
            state.objectives.diamond = true;
            pushBanner('DIAMOND SECURED!', 'The Marlin Diamond is yours — now reach the boat!', '#f5c542');
            events |= EVENT_DIAMOND | EVENT_PICKUP;
          }
        } else {
          item.progress = Math.max(0, item.progress - dt / 1.2);
        }
      } else if (dist < 30) {
        item.taken = true;
        state.score += LOOT_VALUES[item.kind];
        events |= EVENT_PICKUP;
      }
    }

    // Alarm hits the top: lockdown costs a life.
    if (state.alarm >= 100) {
      events |= lockdown();
      if (state.over) return events;
    }

    // Win: diamond in hand and the thief reaches the boat dock.
    const diamond = state.lootItems.find((i) => i.kind === 'diamond');
    if (diamond.taken && t.x >= DOCK.x && t.x <= DOCK.x + DOCK.w && t.y >= DOCK.y && t.y <= DOCK.y + DOCK.h) {
      state.won = true;
      state.objectives.escaped = true;
      events |= EVENT_WIN;
    }

    return events;
  }

  reset();

  return {
    get state() {
      return state;
    },
    reset,
    step,
  };
}
