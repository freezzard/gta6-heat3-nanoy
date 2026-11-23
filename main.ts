// Solara Heat — dossier builder for the gta6-01 entry.
// Copies the finished game/ and screenshots/ beside this file into the
// output directory and writes dossier.json with the vendored make.fun
// library. Run it as: MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(outDir, { recursive: true });
cpSync(join(here, 'game'), join(outDir, 'game'), { recursive: true });
mkdirSync(join(outDir, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(outDir, 'screenshots'), { recursive: true });
}

// Scorer caps from the quest gate: text_max_bytes shapes the byte budget;
// the rest refuse entries the scorer would refuse outright.
const dossierText = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(outDir, 'dossier.json'), dossierText);
