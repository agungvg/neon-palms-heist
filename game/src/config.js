// Every tuning number and colour in one place. The playfield is a fixed 1280x720 logical
// area; the renderer scales it to the window, so no rule below depends on the screen size.
// Top 64px and bottom 64px are HUD; the vault floor lives between them.

export const FIELD = { width: 1280, height: 720 };
export const HUD_TOP = 64;
export const HUD_BOTTOM = 656;

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

export const THIEF = {
  radius: 13,
  speed: 172,
  sneakSpeed: 96,
  dashSpeed: 390,
  dashTime: 0.35,
  dashCooldown: 3,
};

export const LIVES = 3;

export const GUARD = {
  radius: 14,
  patrolSpeed: 58,
  chaseSpeed: 102,
  coneLength: 235,
  coneHalfAngle: 0.56,
  scanArc: 0.85,
  scanPause: 1.6,
  detectRate: 62,
  closeDetectRate: 130,
  forgetRate: 26,
  chaseTime: 4,
};

export const CAMERA = {
  coneLength: 265,
  coneHalfAngle: 0.44,
  sweepArc: 0.7,
  sweepPeriod: 4.2,
  alarmRate: 30,
};

export const TOOLS = {
  empCount: 2,
  smokeCount: 2,
  empDuration: 10,
  smokeDuration: 6,
  smokeRadius: 92,
  lockpickSeconds: 2.5,
};

export const LOOT_VALUES = { cash: 5000, gold: 8000, diamond: 50000 };

export const PALETTE = {
  floor: '#0d1622',
  floorTile: '#14273a',
  wall: '#1d2f45',
  wallTrim: '#f5c542',
  neonPink: '#ff5da2',
  neonTeal: '#2de2c5',
  neonPurple: '#9b7bff',
  gold: '#f5c542',
  goldDim: '#a8842a',
  text: '#eef4f6',
  muted: '#8fa3b3',
  panel: '#12202f',
  panelEdge: '#24405c',
  danger: '#ff4d5e',
  dangerDim: '#7a2430',
  safe: '#2de2c5',
  guard: '#ffb347',
  camera: '#ff4d5e',
  thief: '#2de2c5',
  smoke: '#9fb4c4',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best loot is kept between visits (this browser only). */
export const BEST_KEY = 'neon-palms.best';
