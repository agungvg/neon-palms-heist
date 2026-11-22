// Every pixel of Neon Palms: the neon vault floor, the vision cones, the guards, the
// cameras, the loot, and the dense HUD — WIN/LOSE, loot, alarm meter, objectives, tools,
// patrol status and controls, all readable at a glance when the frame is shrunk.

import { CAMERA, FIELD, FONT, GUARD, HUD_BOTTOM, HUD_TOP, PALETTE } from './config.js';
import { COVER, DOCK, SOLIDS, TOOL_CHIPS, VAULT, WALLS } from './world.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_WIN = 'win';
export const SCREEN_OVER = 'over';

const TOOL_NAMES = { emp: 'EMP BURST', smoke: 'SMOKE', lockpick: 'LOCKPICK' };
const TOOL_KEYS = { emp: '1', smoke: '2', lockpick: '3' };
const TOOL_DESCS = { emp: 'Cameras dark 10s', smoke: 'Blind spot 6s', lockpick: 'Crack the vault' };

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function fmtMoney(n) {
  return '$' + n.toLocaleString('en-US');
}

function fmtTime(t) {
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function cone(ctx, x, y, angle, half, len, rgb, alpha) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  const g = ctx.createRadialGradient(0, 0, 8, 0, 0, len);
  g.addColorStop(0, `rgba(${rgb},${alpha})`);
  g.addColorStop(0.75, `rgba(${rgb},${alpha * 0.55})`);
  g.addColorStop(1, `rgba(${rgb},0)`);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.arc(0, 0, len, -half, half);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = `rgba(${rgb},${alpha * 0.8})`;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(Math.cos(-half) * len, Math.sin(-half) * len);
  ctx.moveTo(0, 0);
  ctx.lineTo(Math.cos(half) * len, Math.sin(half) * len);
  ctx.stroke();
  ctx.restore();
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');

  function drawFloor(state) {
    ctx.fillStyle = PALETTE.floor;
    ctx.fillRect(0, HUD_TOP, FIELD.width, HUD_BOTTOM - HUD_TOP);
    // Subtle checker tiles.
    ctx.fillStyle = PALETTE.floorTile;
    const ts = 64;
    for (let y = HUD_TOP; y < HUD_BOTTOM; y += ts) {
      for (let x = 0; x < FIELD.width; x += ts) {
        if (((x / ts) + (y / ts)) % 2 === 0) ctx.fillRect(x, y, ts, ts);
      }
    }
    // Neon trim along the room edges.
    ctx.strokeStyle = PALETTE.neonPink;
    ctx.globalAlpha = 0.55;
    ctx.lineWidth = 2;
    ctx.strokeRect(14, HUD_TOP + 14, FIELD.width - 28, HUD_BOTTOM - HUD_TOP - 28);
    ctx.globalAlpha = 1;
    // Pink carpet runner from the door to the vault, and a roulette wheel painted
    // on the floor: the room reads as a casino, not an empty grid.
    ctx.fillStyle = 'rgba(255,93,162,0.10)';
    ctx.fillRect(596, 170, 88, HUD_BOTTOM - 170);
    ctx.strokeStyle = 'rgba(245,197,66,0.55)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(596, 170);
    ctx.lineTo(596, HUD_BOTTOM);
    ctx.moveTo(684, 170);
    ctx.lineTo(684, HUD_BOTTOM);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(245,197,66,0.5)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(640, 520, 44, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(640, 520, 28, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = 'rgba(245,197,66,0.6)';
    ctx.font = `800 13px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText('00', 640, 525);
    ctx.fillStyle = 'rgba(245,197,66,0.55)';
    for (const [cx, cy] of [[300, 540], [330, 556], [980, 540], [950, 556], [700, 470], [580, 470]]) {
      ctx.beginPath();
      ctx.arc(cx, cy, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
    // Palm-leaf shadows in the corners, the Vice City night outside the glass.
    ctx.fillStyle = 'rgba(45,226,197,0.10)';
    for (const [px, py, flip] of [[30, 90, 1], [1250, 90, -1], [30, 620, 1]]) {
      ctx.save();
      ctx.translate(px, py);
      ctx.scale(flip, 1);
      for (let i = 0; i < 5; i += 1) {
        ctx.rotate(0.35);
        ctx.beginPath();
        ctx.ellipse(26, 0, 30, 7, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
    // The house name on the back wall, between the first camera and the vault.
    ctx.fillStyle = PALETTE.neonPink;
    ctx.font = `800 22px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('M A R L I N', 430, 100);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `600 11px ${FONT}`;
    ctx.fillText('CASINO · EST. 1986', 430, 122);
  }

  function drawDock(state) {
    const glow = state.won ? 0.9 : 0.35;
    ctx.fillStyle = '#241a10';
    ctx.fillRect(DOCK.x, DOCK.y, DOCK.w, DOCK.h);
    ctx.strokeStyle = PALETTE.neonTeal;
    ctx.globalAlpha = glow;
    ctx.lineWidth = 3;
    ctx.strokeRect(DOCK.x + 2, DOCK.y + 2, DOCK.w - 4, DOCK.h - 4);
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#3a2c18';
    for (let i = 0; i < 4; i += 1) ctx.fillRect(DOCK.x + 6, DOCK.y + 8 + i * 18, DOCK.w - 12, 5);
    ctx.fillStyle = PALETTE.neonTeal;
    ctx.font = `800 15px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText('⚓ GETAWAY', DOCK.x + DOCK.w / 2, DOCK.y + 26);
    ctx.fillStyle = PALETTE.text;
    ctx.font = `600 11px ${FONT}`;
    ctx.fillText('BOAT DOCK', DOCK.x + DOCK.w / 2, DOCK.y + 44);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `600 10px ${FONT}`;
    ctx.fillText('diamond first!', DOCK.x + DOCK.w / 2, DOCK.y + 60);
  }

  function drawVault(state) {
    ctx.fillStyle = '#1a1408';
    ctx.fillRect(VAULT.x, VAULT.y, VAULT.w, VAULT.h);
    ctx.strokeStyle = PALETTE.gold;
    ctx.lineWidth = 3;
    ctx.strokeRect(VAULT.x, VAULT.y, VAULT.w, VAULT.h);
    ctx.fillStyle = PALETTE.gold;
    ctx.font = `800 13px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText('V A U L T', VAULT.x + VAULT.w / 2, VAULT.y + 16);
    const d = state.lootItems.find((i) => i.kind === 'diamond');
    if (!d.taken) {
      const pulse = 0.6 + 0.4 * Math.sin(state.time * 3);
      ctx.save();
      ctx.translate(d.x, d.y);
      ctx.fillStyle = `rgba(245,197,66,${0.25 * pulse})`;
      ctx.beginPath();
      ctx.arc(0, 0, 26 + 6 * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = '#bff3ff';
      ctx.fillRect(-11, -11, 22, 22);
      ctx.fillStyle = '#7fd4ff';
      ctx.beginPath();
      ctx.moveTo(0, -15);
      ctx.lineTo(11, 0);
      ctx.lineTo(0, 15);
      ctx.lineTo(-11, 0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      if (d.progress > 0) {
        ctx.strokeStyle = PALETTE.gold;
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(d.x, d.y, 34, -Math.PI / 2, -Math.PI / 2 + d.progress * Math.PI * 2);
        ctx.stroke();
      }
      ctx.fillStyle = PALETTE.gold;
      ctx.font = `700 11px ${FONT}`;
      ctx.fillText('MARLIN DIAMOND · $50,000', d.x, d.y + 52);
    }
  }

  function drawLoot(state) {
    for (const item of state.lootItems) {
      if (item.taken || item.kind === 'diamond') continue;
      if (item.kind === 'cash') {
        ctx.fillStyle = '#1f7a4d';
        rr(ctx, item.x - 14, item.y - 9, 28, 18, 3);
        ctx.fill();
        ctx.fillStyle = '#2fbf71';
        rr(ctx, item.x - 14, item.y - 9, 28, 18, 3);
        ctx.stroke();
        ctx.fillStyle = '#eafff3';
        ctx.font = `800 11px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.fillText('$', item.x, item.y + 4);
      } else {
        ctx.fillStyle = PALETTE.goldDim;
        ctx.fillRect(item.x - 13, item.y - 6, 26, 12);
        ctx.fillStyle = PALETTE.gold;
        ctx.fillRect(item.x - 13, item.y - 8, 26, 10);
        ctx.fillStyle = '#7a5c14';
        ctx.font = `800 9px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.fillText('AU', item.x, item.y + 3);
      }
    }
  }

  function drawSmoke(state) {
    for (const s of state.smokes) {
      const g = ctx.createRadialGradient(s.x, s.y, 6, s.x, s.y, s.r);
      g.addColorStop(0, 'rgba(190,205,216,0.78)');
      g.addColorStop(0.6, 'rgba(159,180,196,0.45)');
      g.addColorStop(1, 'rgba(159,180,196,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(238,244,246,0.5)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r * 0.85, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = 'rgba(238,244,246,0.85)';
      ctx.font = `700 11px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText('SMOKE', s.x, s.y - s.r + 12);
    }
  }

  function drawCones(state) {
    for (const c of state.cameras) {
      if (c.offline > 0) continue;
      cone(ctx, c.x, c.y, c.angle, CAMERA.coneHalfAngle, CAMERA.coneLength, '255,77,94', 0.30);
    }
    for (const g of state.guards) {
      const hot = g.mode === 'chase' || g.suspicion > 55;
      cone(ctx, g.x, g.y, g.angle, GUARD.coneHalfAngle, GUARD.coneLength,
        hot ? '255,77,94' : '255,179,71', hot ? 0.42 : 0.30);
    }
  }

  function drawSolids() {
    for (const w of WALLS) {
      ctx.fillStyle = PALETTE.wall;
      ctx.fillRect(w.x, w.y, w.w, w.h);
      ctx.strokeStyle = PALETTE.wallTrim;
      ctx.globalAlpha = 0.7;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(w.x + 0.5, w.y + 0.5, w.w - 1, w.h - 1);
      ctx.globalAlpha = 1;
    }
    for (const c of COVER) {
      ctx.fillStyle = '#16273a';
      rr(ctx, c.x, c.y, c.w, c.h, 6);
      ctx.fill();
      ctx.strokeStyle = PALETTE.neonPink;
      ctx.globalAlpha = 0.75;
      ctx.lineWidth = 2;
      rr(ctx, c.x + 1, c.y + 1, c.w - 2, c.h - 2, 6);
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.fillStyle = 'rgba(238,244,246,0.16)';
      rr(ctx, c.x + 8, c.y + 8, c.w - 16, 10, 4);
      ctx.fill();
    }
  }

  function drawPatrols(state) {
    ctx.save();
    ctx.strokeStyle = 'rgba(143,163,179,0.4)';
    ctx.setLineDash([2, 8]);
    ctx.lineWidth = 1.5;
    for (const g of state.guards) {
      ctx.beginPath();
      g.waypoints.forEach(([x, y], i) => {
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.closePath();
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawGuards(state) {
    for (const g of state.guards) {
      // Suspicion bar + name.
      ctx.fillStyle = 'rgba(10,16,24,0.85)';
      rr(ctx, g.x - 26, g.y - 40, 52, 22, 4);
      ctx.fill();
      ctx.fillStyle = PALETTE.text;
      ctx.font = `800 10px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText(g.name, g.x, g.y - 28);
      ctx.fillStyle = '#233242';
      rr(ctx, g.x - 22, g.y - 25, 44, 4, 2);
      ctx.fill();
      ctx.fillStyle = g.suspicion > 55 ? PALETTE.danger : PALETTE.guard;
      if (g.suspicion > 1) {
        rr(ctx, g.x - 22, g.y - 25, (44 * g.suspicion) / 100, 4, 2);
        ctx.fill();
      }
      // Body: amber circle, dark visor, facing tick.
      ctx.fillStyle = '#2a2118';
      ctx.beginPath();
      ctx.arc(g.x, g.y, 15, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = g.mode === 'chase' ? PALETTE.danger : PALETTE.guard;
      ctx.beginPath();
      ctx.arc(g.x, g.y, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#241a10';
      ctx.beginPath();
      ctx.arc(g.x + Math.cos(g.angle) * 5, g.y + Math.sin(g.angle) * 5, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = PALETTE.text;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(g.x + Math.cos(g.angle) * 13, g.y + Math.sin(g.angle) * 13);
      ctx.lineTo(g.x + Math.cos(g.angle) * 21, g.y + Math.sin(g.angle) * 21);
      ctx.stroke();
      if (g.mode === 'chase') {
        ctx.fillStyle = PALETTE.danger;
        ctx.font = `900 20px ${FONT}`;
        ctx.fillText('!', g.x, g.y - 44);
      } else if (g.mode === 'investigate') {
        ctx.fillStyle = PALETTE.gold;
        ctx.font = `900 16px ${FONT}`;
        ctx.fillText('?', g.x, g.y - 44);
      }
    }
  }

  function drawCameras(state) {
    for (const c of state.cameras) {
      ctx.fillStyle = '#20262e';
      ctx.fillRect(c.x - 10, c.y - 6, 20, 12);
      ctx.fillStyle = c.offline > 0 ? '#5a6b7a' : PALETTE.camera;
      ctx.beginPath();
      ctx.arc(c.x + Math.cos(c.angle) * 12, c.y + Math.sin(c.angle) * 12, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = c.offline > 0 ? PALETTE.muted : PALETTE.camera;
      ctx.font = `800 9px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText(c.offline > 0 ? `OFF ${Math.ceil(c.offline)}s` : 'CAM', c.x, c.y - 14);
    }
  }

  function drawThief(state) {
    const t = state.thief;
    if (t.invuln > 0 && Math.floor(state.time * 10) % 2 === 0) return;
    if (t.dashT > 0) {
      ctx.fillStyle = 'rgba(45,226,197,0.25)';
      ctx.beginPath();
      ctx.arc(t.x - Math.cos(t.angle) * 26, t.y - Math.sin(t.angle) * 26, 12, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#0b3d34';
    ctx.beginPath();
    ctx.arc(t.x, t.y, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.thief;
    ctx.beginPath();
    ctx.arc(t.x, t.y, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0b3d34';
    ctx.beginPath();
    ctx.arc(t.x + Math.cos(t.angle) * 5, t.y + Math.sin(t.angle) * 5, 6, 0, Math.PI * 2);
    ctx.fill();
    if (t.sneak) {
      ctx.strokeStyle = 'rgba(45,226,197,0.8)';
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(t.x, t.y, 19, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.fillStyle = PALETTE.text;
    ctx.font = `800 10px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText('YOU', t.x, t.y - 22);
  }

  function panel(x, y, w, h) {
    ctx.fillStyle = 'rgba(18,32,47,0.92)';
    rr(ctx, x, y, w, h, 8);
    ctx.fill();
    ctx.strokeStyle = PALETTE.panelEdge;
    ctx.lineWidth = 1.5;
    rr(ctx, x + 0.5, y + 0.5, w - 1, h - 1, 8);
    ctx.stroke();
  }

  function drawTopBar(state, best) {
    ctx.fillStyle = '#0a121c';
    ctx.fillRect(0, 0, FIELD.width, HUD_TOP);
    ctx.fillStyle = PALETTE.neonPink;
    ctx.fillRect(0, HUD_TOP - 3, FIELD.width, 3);
    ctx.textBaseline = 'middle';
    // WIN / LOSE.
    ctx.textAlign = 'left';
    ctx.fillStyle = PALETTE.safe;
    ctx.font = `800 12px ${FONT}`;
    ctx.fillText('WIN', 16, 16);
    ctx.fillStyle = PALETTE.text;
    ctx.font = `600 12px ${FONT}`;
    ctx.fillText('Diamond + boat', 52, 16);
    ctx.fillStyle = PALETTE.danger;
    ctx.font = `800 12px ${FONT}`;
    ctx.fillText('LOSE', 16, 38);
    ctx.fillStyle = PALETTE.text;
    ctx.font = `600 12px ${FONT}`;
    ctx.fillText('Alarm 100% ×3 · 0 lives', 52, 38);
    // Loot, big and gold.
    ctx.textAlign = 'left';
    ctx.fillStyle = PALETTE.gold;
    ctx.font = `800 13px ${FONT}`;
    ctx.fillText('LOOT', 300, 16);
    ctx.font = `900 30px ${FONT}`;
    ctx.fillText(fmtMoney(state.score), 300, 40);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `600 11px ${FONT}`;
    ctx.fillText(`BEST ${fmtMoney(best)}`, 470, 40);
    // Alarm meter.
    ctx.fillStyle = PALETTE.text;
    ctx.font = `800 13px ${FONT}`;
    ctx.fillText('ALARM', 640, 16);
    const ax = 640;
    const aw = 230;
    ctx.fillStyle = '#233242';
    rr(ctx, ax, 26, aw, 16, 8);
    ctx.fill();
    const frac = state.alarm / 100;
    const ag = ctx.createLinearGradient(ax, 0, ax + aw, 0);
    ag.addColorStop(0, '#2de2c5');
    ag.addColorStop(0.6, '#f5c542');
    ag.addColorStop(1, '#ff4d5e');
    ctx.fillStyle = ag;
    if (frac > 0.01) {
      rr(ctx, ax, 26, Math.max(16, aw * frac), 16, 8);
      ctx.fill();
    }
    ctx.fillStyle = PALETTE.text;
    ctx.font = `800 13px ${FONT}`;
    ctx.fillText(`${Math.round(state.alarm)}%`, ax + aw + 10, 34);
    // Time + lives.
    ctx.textAlign = 'right';
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `800 12px ${FONT}`;
    ctx.fillText('TIME', 1060, 16);
    ctx.fillStyle = PALETTE.text;
    ctx.font = `800 20px ${FONT}`;
    ctx.fillText(fmtTime(state.time), 1060, 40);
    ctx.fillStyle = PALETTE.danger;
    ctx.font = `900 20px ${FONT}`;
    let hearts = '';
    for (let i = 0; i < 3; i += 1) hearts += i < state.lives ? '♥' : '♡';
    ctx.fillText(hearts, 1264, 34);
  }

  function drawLeftPanel(state) {
    panel(12, 76, 184, 330);
    ctx.textAlign = 'left';
    ctx.fillStyle = PALETTE.neonTeal;
    ctx.font = `800 13px ${FONT}`;
    ctx.fillText('OBJECTIVES', 22, 96);
    const objs = [
      ['Cross the floor', state.objectives.entered],
      ['Lift $15,000', state.objectives.loot15k],
      ['Crack the vault', state.objectives.diamond],
      ['Reach $50,000', state.objectives.loot50k],
      ['Escape by boat', state.objectives.escaped],
    ];
    const done = objs.filter((o) => o[1]).length;
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `600 11px ${FONT}`;
    ctx.fillText(`${done}/5 done`, 150, 96);
    objs.forEach(([label, ok], i) => {
      const y = 118 + i * 22;
      ctx.fillStyle = ok ? PALETTE.safe : '#3a4c60';
      ctx.font = `800 13px ${FONT}`;
      ctx.fillText(ok ? '☑' : '☐', 22, y);
      ctx.fillStyle = ok ? PALETTE.text : PALETTE.muted;
      ctx.font = `600 12px ${FONT}`;
      ctx.fillText(label, 42, y);
    });
    ctx.fillStyle = PALETTE.neonTeal;
    ctx.font = `800 13px ${FONT}`;
    ctx.fillText('TOOLS — click or 1/2/3', 22, 244);
    TOOL_CHIPS.forEach((chip) => {
      const selected = state.selectedTool === chip.tool;
      ctx.fillStyle = selected ? 'rgba(45,226,197,0.22)' : 'rgba(35,50,66,0.9)';
      rr(ctx, chip.x, chip.y, chip.w, chip.h, 6);
      ctx.fill();
      ctx.strokeStyle = selected ? PALETTE.neonTeal : PALETTE.panelEdge;
      ctx.lineWidth = selected ? 2 : 1;
      rr(ctx, chip.x + 0.5, chip.y + 0.5, chip.w - 1, chip.h - 1, 6);
      ctx.stroke();
      ctx.fillStyle = PALETTE.text;
      ctx.font = `800 12px ${FONT}`;
      const count = chip.tool === 'emp' ? `×${state.tools.emp}` : chip.tool === 'smoke' ? `×${state.tools.smoke}` : '∞';
      ctx.fillText(`[${TOOL_KEYS[chip.tool]}] ${TOOL_NAMES[chip.tool]} ${count}`, chip.x + 10, chip.y + 14);
      ctx.fillStyle = PALETTE.muted;
      ctx.font = `600 10px ${FONT}`;
      ctx.fillText(TOOL_DESCS[chip.tool], chip.x + 10, chip.y + 28);
    });
  }

  function drawRightPanel(state) {
    panel(1084, 76, 184, 330);
    ctx.textAlign = 'left';
    ctx.fillStyle = PALETTE.neonTeal;
    ctx.font = `800 13px ${FONT}`;
    ctx.fillText('GUARDS', 1094, 96);
    state.guards.forEach((g, i) => {
      const y = 118 + i * 46;
      const status = g.mode === 'chase' ? 'CHASING!' : g.mode === 'investigate' ? 'CURIOUS' : g.suspicion > 55 ? 'SUSPICIOUS' : 'CALM';
      ctx.fillStyle = g.mode === 'chase' ? PALETTE.danger : PALETTE.text;
      ctx.font = `800 12px ${FONT}`;
      ctx.fillText(g.name, 1094, y);
      ctx.fillStyle = g.mode === 'chase' ? PALETTE.danger : PALETTE.muted;
      ctx.font = `700 10px ${FONT}`;
      ctx.textAlign = 'right';
      ctx.fillText(status, 1258, y);
      ctx.textAlign = 'left';
      ctx.fillStyle = '#233242';
      rr(ctx, 1094, y + 8, 164, 6, 3);
      ctx.fill();
      ctx.fillStyle = g.suspicion > 55 ? PALETTE.danger : PALETTE.guard;
      if (g.suspicion > 1) {
        rr(ctx, 1094, y + 8, (164 * g.suspicion) / 100, 6, 3);
        ctx.fill();
      }
      ctx.fillStyle = PALETTE.muted;
      ctx.font = `600 10px ${FONT}`;
      ctx.fillText(g.mode === 'patrol' ? 'patrol · cone 235' : g.mode, 1094, y + 28);
    });
    ctx.fillStyle = PALETTE.neonTeal;
    ctx.font = `800 13px ${FONT}`;
    ctx.fillText('CAMERAS', 1094, 268);
    state.cameras.forEach((c, i) => {
      const y = 290 + i * 30;
      ctx.fillStyle = PALETTE.text;
      ctx.font = `800 12px ${FONT}`;
      ctx.fillText(`CAM ${i + 1}`, 1094, y);
      ctx.fillStyle = c.offline > 0 ? PALETTE.safe : PALETTE.camera;
      ctx.font = `700 11px ${FONT}`;
      ctx.textAlign = 'right';
      ctx.fillText(c.offline > 0 ? `OFFLINE ${Math.ceil(c.offline)}s` : 'SWEEPING', 1258, y);
      ctx.textAlign = 'left';
    });
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `600 11px ${FONT}`;
    ctx.fillText('EMP kills both.', 1094, 352);
    ctx.fillText('Smoke blinds them.', 1094, 368);
    ctx.fillText('Sneak: Shift, slow', 1094, 384);
    ctx.fillText('but half as visible.', 1094, 398);
  }

  function drawBottomBar(state) {
    ctx.fillStyle = '#0a121c';
    ctx.fillRect(0, HUD_BOTTOM, FIELD.width, FIELD.height - HUD_BOTTOM);
    ctx.fillStyle = PALETTE.neonPink;
    ctx.fillRect(0, HUD_BOTTOM, FIELD.width, 3);
    ctx.textAlign = 'left';
    ctx.fillStyle = PALETTE.neonPink;
    ctx.font = `800 14px ${FONT}`;
    ctx.fillText('NEON PALMS', 16, HUD_BOTTOM + 26);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `600 11px ${FONT}`;
    ctx.fillText('THE MARLIN VAULT', 16, HUD_BOTTOM + 44);
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.text;
    ctx.font = `700 13px ${FONT}`;
    ctx.fillText('WASD move · SHIFT sneak · SPACE dash · CLICK use tool · 1/2/3 tools · P pause · M sound', 640, HUD_BOTTOM + 30);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `600 11px ${FONT}`;
    const dash = state.thief.dashCd > 0 ? `DASH ${state.thief.dashCd.toFixed(1)}s` : 'DASH READY';
    ctx.fillText(`${dash} · EMP ${state.tools.emp} · SMOKE ${state.tools.smoke} · ${state.selectedTool.toUpperCase()} selected`, 640, HUD_BOTTOM + 48);
  }

  function drawBanners(state) {
    const b = state.banners[0];
    if (!b) return;
    const alpha = Math.min(1, b.t / 0.6);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(8,14,22,0.82)';
    const w = 560;
    rr(ctx, 640 - w / 2, 300, w, 84, 10);
    ctx.fill();
    ctx.strokeStyle = b.color;
    ctx.lineWidth = 2;
    rr(ctx, 640 - w / 2, 300, w, 84, 10);
    ctx.stroke();
    ctx.fillStyle = b.color;
    ctx.font = `900 34px ${FONT}`;
    ctx.fillText(b.text, 640, 330);
    ctx.fillStyle = PALETTE.text;
    ctx.font = `600 14px ${FONT}`;
    ctx.fillText(b.sub, 640, 360);
    ctx.restore();
  }

  function overlay(title, lines, accent) {
    ctx.fillStyle = 'rgba(6,11,18,0.78)';
    ctx.fillRect(0, HUD_TOP, FIELD.width, HUD_BOTTOM - HUD_TOP);
    ctx.textAlign = 'center';
    ctx.fillStyle = accent;
    ctx.font = `900 64px ${FONT}`;
    ctx.fillText(title, 640, 300);
    ctx.fillStyle = PALETTE.text;
    ctx.font = `600 17px ${FONT}`;
    lines.forEach((line, i) => ctx.fillText(line, 640, 350 + i * 28));
  }

  function draw(state, screen, best) {
    ctx.clearRect(0, 0, FIELD.width, FIELD.height);
    drawFloor(state);
    drawDock(state);
    drawVault(state);
    drawPatrols(state);
    drawLoot(state);
    drawSmoke(state);
    drawCones(state);
    drawSolids();
    drawVault(state);
    drawGuards(state);
    drawCameras(state);
    drawThief(state);
    drawTopBar(state, best);
    drawLeftPanel(state);
    drawRightPanel(state);
    drawBottomBar(state);
    drawBanners(state);

    if (screen === SCREEN_TITLE) {
      ctx.fillStyle = 'rgba(6,11,18,0.72)';
      ctx.fillRect(0, HUD_TOP, FIELD.width, HUD_BOTTOM - HUD_TOP);
      ctx.textAlign = 'center';
      ctx.fillStyle = PALETTE.neonPink;
      ctx.font = `900 84px ${FONT}`;
      ctx.fillText('NEON PALMS', 640, 250);
      ctx.fillStyle = PALETTE.neonTeal;
      ctx.font = `900 34px ${FONT}`;
      ctx.fillText('T H E   M A R L I N   V A U L T', 640, 300);
      ctx.fillStyle = PALETTE.text;
      ctx.font = `600 17px ${FONT}`;
      ctx.fillText('One room. Three guards. Two cameras. One diamond.', 640, 340);
      ctx.fillText('Read the cones. Spend your tools. Reach the boat.', 640, 368);
      ctx.fillStyle = PALETTE.gold;
      ctx.font = `800 15px ${FONT}`;
      ctx.fillText('WASD move · SHIFT sneak · SPACE dash · CLICK use tool · 1 / 2 / 3 tools', 640, 420);
      ctx.fillStyle = PALETTE.text;
      ctx.font = `800 20px ${FONT}`;
      ctx.fillText('PRESS SPACE OR CLICK TO START', 640, 470);
      if (best > 0) {
        ctx.fillStyle = PALETTE.muted;
        ctx.font = `600 14px ${FONT}`;
        ctx.fillText(`Best loot so far: ${fmtMoney(best)}`, 640, 500);
      }
    } else if (screen === SCREEN_PAUSED) {
      overlay('PAUSED', ['The crew waits. The cones keep sweeping.', 'Press P or Space to keep moving.'], PALETTE.neonTeal);
    } else if (screen === SCREEN_WIN) {
      const rating = state.lives === 3 ? 'GHOST CREW — never caught' : state.lives === 2 ? 'CLEAN — one scare' : 'LOUD BUT RICH';
      overlay('CLEAN GETAWAY!', [
        `Loot: ${fmtMoney(state.score)} in ${fmtTime(state.time)} — ${rating}`,
        `Best loot: ${fmtMoney(Math.max(best, state.score))}`,
        'Press Space or click to run it again.',
      ], PALETTE.gold);
    } else if (screen === SCREEN_OVER) {
      overlay('BUSTED!', [
        `The Marlin crew leaves you at the door with ${fmtMoney(state.score)}.`,
        `Best loot: ${fmtMoney(Math.max(best, state.score))}`,
        'Press Space or click to try again.',
      ], PALETTE.danger);
    }
  }

  return { draw };
}
