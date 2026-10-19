// Generuje plansze sudoku do wyzwania dnia na zapas i zapisuje je jako SQL do wgrania do bazy D1.
// Użycie: node build/plansze-wyzwania.mjs 2026-10-19 1100 > /tmp/plansze.sql
//         npx wrangler d1 execute wyzwanie-dnia --remote --file /tmp/plansze.sql
// INSERT OR IGNORE — istniejących dni nie nadpisuje.
import { generuj } from '../src/sudoku-gen.mjs';
import { randomInt } from 'node:crypto';

const [od = new Date().toISOString().slice(0, 10), ile = '400', puste = '46'] = process.argv.slice(2);
const d = new Date(od + 'T12:00:00Z');
const wiersze = [];
for (let i = 0; i < Number(ile); i++) {
  const dzien = new Date(d.getTime() + i * 86400000).toISOString().slice(0, 10);
  const p = generuj(n => randomInt(n), Number(puste), true);
  wiersze.push(`('sudoku','${dzien}','${JSON.stringify(p)}')`);
}
for (let i = 0; i < wiersze.length; i += 100) {
  console.log('INSERT OR IGNORE INTO plansze (gra, dzien, dane) VALUES\n' + wiersze.slice(i, i + 100).join(',\n') + ';');
}
