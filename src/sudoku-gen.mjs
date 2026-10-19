// Generator sudoku dla wyzwania dnia. Plansza: tekst 81 znaków, '0' = puste pole.
// Generator z kontrolą jednoznaczności (unikalne=true) jest wolny — używa go build/plansze-wyzwania.mjs
// (plansze na zapas w bazie). Worker generuje awaryjnie bez tej kontroli (każde poprawne rozwiązanie i tak się liczy).

export function losujWiersz(rnd) {
  const a = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  for (let i = 8; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

function mozna(t, i, n) {
  const r = Math.floor(i / 9), c = i % 9, br = r - r % 3, bc = c - c % 3;
  for (let k = 0; k < 9; k++) {
    if (t[r * 9 + k] === n || t[k * 9 + c] === n) return false;
    if (t[(br + Math.floor(k / 3)) * 9 + bc + k % 3] === n) return false;
  }
  return true;
}

function wypelnij(t, rnd) {
  const i = t.indexOf(0);
  if (i === -1) return true;
  for (const n of losujWiersz(rnd)) {
    if (mozna(t, i, n)) { t[i] = n; if (wypelnij(t, rnd)) return true; t[i] = 0; }
  }
  return false;
}

// liczba rozwiązań, najwyżej `limit` (pole z najmniejszą liczbą kandydatów najpierw)
export function liczRozwiazania(t, limit = 2) {
  let najl = -1, kand = null;
  for (let i = 0; i < 81; i++) {
    if (t[i]) continue;
    const k = [];
    for (let n = 1; n <= 9; n++) if (mozna(t, i, n)) k.push(n);
    if (k.length === 0) return 0;
    if (!kand || k.length < kand.length) { najl = i; kand = k; if (k.length === 1) break; }
  }
  if (najl === -1) return 1;
  let ile = 0;
  for (const n of kand) {
    t[najl] = n;
    ile += liczRozwiazania(t, limit - ile);
    t[najl] = 0;
    if (ile >= limit) break;
  }
  return ile;
}

export function generuj(rnd, puste = 46, unikalne = true) {
  const rozw = new Array(81).fill(0);
  wypelnij(rozw, rnd);
  const plansza = rozw.slice();
  const kolejnosc = Array.from({ length: 81 }, (_, i) => i);
  for (let i = 80; i > 0; i--) { const j = rnd(i + 1); [kolejnosc[i], kolejnosc[j]] = [kolejnosc[j], kolejnosc[i]]; }
  let usuniete = 0;
  for (const i of kolejnosc) {
    if (usuniete >= puste) break;
    const v = plansza[i];
    plansza[i] = 0;
    if (unikalne && liczRozwiazania(plansza.slice(), 2) !== 1) { plansza[i] = v; continue; }
    usuniete++;
  }
  return { plansza: plansza.join(''), rozwiazanie: rozw.join('') };
}

// Czy `wynik` (81 cyfr 1–9) to poprawne sudoku zgodne z cyframi startowymi `plansza`
export function sprawdz(plansza, wynik) {
  if (typeof wynik !== 'string' || !/^[1-9]{81}$/.test(wynik)) return false;
  for (let i = 0; i < 81; i++) if (plansza[i] !== '0' && plansza[i] !== wynik[i]) return false;
  for (let k = 0; k < 9; k++) {
    const w = new Set(), c = new Set(), b = new Set();
    for (let m = 0; m < 9; m++) {
      w.add(wynik[k * 9 + m]);
      c.add(wynik[m * 9 + k]);
      b.add(wynik[(Math.floor(k / 3) * 3 + Math.floor(m / 3)) * 9 + (k % 3) * 3 + m % 3]);
    }
    if (w.size !== 9 || c.size !== 9 || b.size !== 9) return false;
  }
  return true;
}
