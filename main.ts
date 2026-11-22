// Neon Palms: The Marlin Vault — the hand-in program (Node 22, standard library only).
// The game is this directory's game/ folder: plain static files a desktop browser loads
// offline (game/index.html and its ES modules, no library, no network request). This program
// copies game/ and screenshots/ from beside this file to /output and writes
// /output/dossier.json, the summary the judge reads, with the vendored make.fun library.
//
// Serve it locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

const gameDir = join(here, 'game');
const shotsDir = join(here, 'screenshots');
if (!existsSync(join(here, 'vendor', 'makefun-game.ts'))) {
  throw new Error('vendor/makefun-game.ts is missing: copy it unchanged from the kit before handing in');
}
if (!existsSync(join(gameDir, 'index.html'))) {
  throw new Error('game/index.html is missing: the hand-in needs the playable game beside main.ts');
}
if (!existsSync(shotsDir)) {
  throw new Error('screenshots/ is missing: the hand-in needs 3 or 4 real renders of the game');
}
const shots = readdirSync(shotsDir).filter((n) => !n.startsWith('.'));
if (shots.length < 3 || shots.length > 4) {
  throw new Error(`screenshots/ holds ${shots.length} images, the bounty wants 3 or 4`);
}
for (const name of shots) {
  const bytes = statSync(join(shotsDir, name)).size;
  if (bytes > 262144) throw new Error(`screenshots/${name} is ${bytes} bytes, over the 256 KiB cap`);
}

mkdirSync(out, { recursive: true });
cpSync(gameDir, join(out, 'game'), { recursive: true });
cpSync(shotsDir, join(out, 'screenshots'), { recursive: true });

// The scorer's own caps: only text_max_bytes shapes the bytes; the others refuse an entry the
// scorer would refuse (more than 4 screenshots or one over 256 KiB; more than 993 files in
// game/ or 48 MiB of game files in all; a path under game/ over 1000 bytes).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);

const dossierPath = join(out, 'dossier.json');
const dossierBytes = statSync(dossierPath).size;
console.log(`Neon Palms handed in: ${shots.length} screenshots, dossier ${dossierBytes} bytes at ${dossierPath}`);
