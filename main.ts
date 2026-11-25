// Warung Kilat — hand-in program (Node 22, standard library only).
//
// It assembles the entry the grader reads: the playable game under game/,
// the screenshots under screenshots/, and the dossier the judge reads,
// built from those files by the kit's vendored library. Run it as
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output.
// The copy is byte for byte, so running it twice writes identical output.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const destination = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(destination, { recursive: true });
cpSync(join(repoRoot, 'game'), join(destination, 'game'), { recursive: true });
mkdirSync(join(destination, 'screenshots'), { recursive: true });
if (existsSync(join(repoRoot, 'screenshots'))) {
  cpSync(join(repoRoot, 'screenshots'), join(destination, 'screenshots'), { recursive: true });
}

// Caps the scorer enforces (from the competition's gate): at most 4
// screenshots, each at most 256 KiB; game/ at most 993 files and 48 MiB
// in all, no path over 1000 bytes; the dossier text at most 160 KiB.
writeFileSync(
  join(destination, 'dossier.json'),
  buildDossier(destination, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
