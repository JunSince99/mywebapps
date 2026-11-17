// Builds the GTA 6 countdown: a single static page. Output folder comes from the root build (dist/gta6).
import { readFileSync, writeFileSync, rmSync, mkdirSync, cpSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
const OUT = resolve(process.argv[2] || 'dist');
process.chdir(dirname(fileURLToPath(import.meta.url)));
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
cpSync('public', OUT, { recursive: true });
writeFileSync(`${OUT}/index.html`, readFileSync('src/index.html', 'utf8'));
console.log(`built ${OUT}`);
