// Wyzwanie dnia — część wspólna dla gier na ivoca.pl (Szyfrant, Sudoku).
// Ten sam plik jest w obu repozytoriach (src/wyzwanie.mjs); zmiany wprowadzać w obu.
//
// Baza D1 „wyzwanie-dnia” (wspólna dla gier, kolumna `gra`):
//   plansze  — plansza dnia (dane gry, np. ukryty kod albo sudoku z rozwiązaniem),
//   sesje    — rozpoczęte gry dnia (stan po stronie serwera; czas liczy serwer), kasowane po 2 dniach,
//   gracze   — losowy identyfikator nadany przez serwer + skrót tokenu (bez żadnych danych osobowych),
//   wyniki   — zapisane na publicznej liście wyniki (tylko gdy gracz sam tego chce).
// Adresy IP nie są zapisywane; limit zapytań (binding LIMIT) liczy Cloudflare w pamięci.

const ALFABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'; // Crockford base32: bez I, L, O, U
const CZAS_NA_GRE = 6 * 3600 * 1000;                // po 6 godzinach sesja wygasa
const PRZECHOWUJ_SESJE = 2 * 24 * 3600 * 1000;      // sesje i nieużyte identyfikatory kasujemy po 2 dniach
const LIMIT_LISTY = 100;

export function losowyKod(n) {
  const b = new Uint8Array(n);
  crypto.getRandomValues(b);
  let s = '';
  for (let i = 0; i < n; i++) s += ALFABET[b[i] & 31];
  return s;
}
export function losowa(n) {               // liczba całkowita 0..n-1 z crypto
  const a = new Uint32Array(1);
  const max = Math.floor(0x100000000 / n) * n;
  do { crypto.getRandomValues(a); } while (a[0] >= max);
  return a[0] % n;
}
async function skrot(tekst) {
  const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(tekst));
  return [...new Uint8Array(h)].map(x => x.toString(16).padStart(2, '0')).join('');
}

// Dzień wyzwania liczony w czasie polskim
export function dzisiaj(teraz = Date.now()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Warsaw', year: 'numeric', month: '2-digit', day: '2-digit' })
    .format(new Date(teraz));
}

function json(dane, status = 200) {
  return new Response(JSON.stringify(dane), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }
  });
}
const blad = (status, komunikat) => json({ blad: komunikat }, status);

async function czytajJson(request) {
  const t = await request.text();
  if (t.length > 4000) throw new Error('za duże');
  return t ? JSON.parse(t) : {};
}

async function planszaDnia(env, gra, dzien) {
  let row = await env.DB.prepare('SELECT dane FROM plansze WHERE gra = ? AND dzien = ?').bind(gra.nazwa, dzien).first();
  if (row) return JSON.parse(row.dane);
  const dane = gra.nowaPlansza();
  // INSERT OR IGNORE: przy jednoczesnym pierwszym zapytaniu wygrywa jedna plansza, potem czytamy zapisaną
  await env.DB.prepare('INSERT OR IGNORE INTO plansze (gra, dzien, dane) VALUES (?, ?, ?)').bind(gra.nazwa, dzien, JSON.stringify(dane)).run();
  row = await env.DB.prepare('SELECT dane FROM plansze WHERE gra = ? AND dzien = ?').bind(gra.nazwa, dzien).first();
  return JSON.parse(row.dane);
}

function poprawnyDzien(d) { return typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d); }
function poprawnyGracz(g) { return typeof g === 'string' && /^[0-9A-HJKMNP-TV-Z]{8}$/.test(g); }

// gra: { nazwa, nowaPlansza(), publiczne(dane), poczatkowyStan(), ruch(stan, dane, body) -> {stan, odpowiedz, koniec?}, kolejnosc,
//        odliczanie? (ms przed startem: czas gry liczy się dopiero od końca odliczania) }
export async function obsluzWyzwanie(request, env, gra) {
  const url = new URL(request.url);
  const sciezka = url.pathname.replace(/^\/api\/wyzwanie\/?/, '');

  if (env.LIMIT && request.method === 'POST') {
    const ip = request.headers.get('CF-Connecting-IP') || 'brak';
    const { success } = await env.LIMIT.limit({ key: gra.nazwa + ':' + ip });
    if (!success) return blad(429, 'Za dużo zapytań — odczekaj chwilę.');
  }

  try {
    if (request.method === 'GET' && sciezka === 'ranking') return await ranking(request, env, gra, url);
    if (request.method !== 'POST') return blad(405, 'Niedozwolona metoda');
    const body = await czytajJson(request);
    if (sciezka === 'start') return await start(env, gra);
    if (sciezka === 'ruch') return await ruch(env, gra, body);
    if (sciezka === 'zapisz') return await zapisz(env, gra, body);
    return blad(404, 'Nie ma takiego zapytania');
  } catch (e) {
    if (e instanceof SyntaxError || e.message === 'za duże') return blad(400, 'Niepoprawne dane');
    console.log('wyzwanie: błąd', e && e.stack);
    return blad(500, 'Błąd serwera');
  }
}

async function start(env, gra) {
  const dzien = dzisiaj();
  const dane = await planszaDnia(env, gra, dzien);
  const id = losowyKod(24);
  const odliczanie = gra.odliczanie || 0;
  const startGry = Date.now() + odliczanie;
  await env.DB.prepare('INSERT INTO sesje (id, gra, dzien, start, stan) VALUES (?, ?, ?, ?, ?)')
    .bind(id, gra.nazwa, dzien, startGry, JSON.stringify(gra.poczatkowyStan())).run();
  return json({ sesja: id, dzien, start: startGry, odliczanie, plansza: gra.publiczne(dane) });
}

async function ruch(env, gra, body) {
  if (typeof body.sesja !== 'string' || body.sesja.length !== 24) return blad(400, 'Brak sesji');
  const s = await env.DB.prepare('SELECT * FROM sesje WHERE id = ? AND gra = ?').bind(body.sesja, gra.nazwa).first();
  if (!s) return blad(404, 'Nie ma takiej gry — zacznij wyzwanie od nowa.');
  if (s.koniec) return blad(409, 'Ta gra już się skończyła.');
  const teraz = Date.now();
  if (teraz - s.start > CZAS_NA_GRE) return blad(410, 'Czas na tę grę minął — zacznij wyzwanie od nowa.');
  if (teraz < s.start - 1000) return blad(409, 'Odliczanie jeszcze trwa.');

  const dane = await planszaDnia(env, gra, s.dzien);
  const wynik = gra.ruch(JSON.parse(s.stan), dane, body);
  if (wynik.blad) return blad(400, wynik.blad);

  const nowyStan = JSON.stringify(wynik.stan);
  let zmiana;
  if (wynik.koniec) {
    zmiana = await env.DB.prepare('UPDATE sesje SET stan = ?, koniec = ?, czas = ?, wygrana = ?, proby = ? WHERE id = ? AND stan = ? AND koniec IS NULL')
      .bind(nowyStan, teraz, teraz - s.start, wynik.koniec.wygrana ? 1 : 0, wynik.koniec.proby ?? null, s.id, s.stan).run();
  } else {
    zmiana = await env.DB.prepare('UPDATE sesje SET stan = ? WHERE id = ? AND stan = ? AND koniec IS NULL')
      .bind(nowyStan, s.id, s.stan).run();
  }
  // ktoś w międzyczasie zmienił stan (dwa zapytania naraz) — klient ponowi
  if (!zmiana.meta.changes) return blad(409, 'Ruch nie został przyjęty — spróbuj jeszcze raz.');

  const odp = Object.assign({}, wynik.odpowiedz);
  if (wynik.koniec) {
    odp.koniec = true;
    odp.wygrana = !!wynik.koniec.wygrana;
    odp.czas = teraz - s.start;
    if (wynik.koniec.proby != null) odp.proby = wynik.koniec.proby;
  }
  return json(odp);
}

async function zapisz(env, gra, body) {
  if (typeof body.sesja !== 'string' || body.sesja.length !== 24) return blad(400, 'Brak sesji');
  const s = await env.DB.prepare('SELECT * FROM sesje WHERE id = ? AND gra = ?').bind(body.sesja, gra.nazwa).first();
  if (!s) return blad(404, 'Nie ma takiej gry.');
  if (!s.koniec || !s.wygrana) return blad(409, 'Zapisać można tylko ukończoną, wygraną grę.');
  if (s.zapisano) return blad(409, 'Ten wynik jest już zapisany.');

  const teraz = Date.now();
  let gracz = null, token = null;
  if (poprawnyGracz(body.gracz) && typeof body.token === 'string') {
    const g = await env.DB.prepare('SELECT token_hash FROM gracze WHERE id = ?').bind(body.gracz).first();
    if (g && g.token_hash === await skrot(body.token)) { gracz = body.gracz; token = body.token; }
  }
  if (!gracz) {
    token = losowyKod(32);
    const hash = await skrot(token);
    for (let i = 0; i < 5 && !gracz; i++) {
      const kandydat = losowyKod(8);
      const r = await env.DB.prepare('INSERT OR IGNORE INTO gracze (id, token_hash, utworzono) VALUES (?, ?, ?)').bind(kandydat, hash, teraz).run();
      if (r.meta.changes) gracz = kandydat;
    }
    if (!gracz) return blad(500, 'Nie udało się nadać identyfikatora.');
  }

  const r = await env.DB.prepare('INSERT OR IGNORE INTO wyniki (gra, dzien, gracz, proby, czas, zapisano) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(gra.nazwa, s.dzien, gracz, s.proby, s.czas, teraz).run();
  if (!r.meta.changes) return json({ blad: 'Twój wynik z tego dnia jest już na liście.', gracz, token, dzien: s.dzien }, 409);
  await env.DB.prepare('UPDATE sesje SET zapisano = 1 WHERE id = ?').bind(s.id).run();

  const lista = await listaDnia(env, gra, s.dzien, gracz);
  return json({ gracz, token, dzien: s.dzien, miejsce: lista.ty ? lista.ty.miejsce : null, liczba: lista.liczba });
}

async function listaDnia(env, gra, dzien, gracz) {
  const { results } = await env.DB.prepare(`SELECT gracz, proby, czas FROM wyniki WHERE gra = ? AND dzien = ? ORDER BY ${gra.kolejnosc}, zapisano LIMIT 5000`)
    .bind(gra.nazwa, dzien).all();
  let ty = null, miejsce = 0, poprzedni = null;
  const wiersze = results.map((w, i) => {
    // remis (te same próby i czas co do sekundy) = to samo miejsce
    const klucz = (w.proby ?? '') + ':' + Math.floor(w.czas / 1000);
    if (klucz !== poprzedni) { miejsce = i + 1; poprzedni = klucz; }
    const wiersz = { miejsce, gracz: w.gracz, czas: w.czas };
    if (w.proby != null) wiersz.proby = w.proby;
    if (gracz && w.gracz === gracz) { wiersz.ty = true; ty = wiersz; }
    return wiersz;
  });
  return { liczba: wiersze.length, wiersze, ty };
}

async function ranking(request, env, gra, url) {
  const dzien = url.searchParams.get('dzien') || dzisiaj();
  if (!poprawnyDzien(dzien)) return blad(400, 'Niepoprawna data');
  const naglowek = request.headers.get('X-Gracz');
  const gracz = poprawnyGracz(naglowek) ? naglowek : null;
  const lista = await listaDnia(env, gra, dzien, gracz);
  const wiersze = lista.wiersze.slice(0, LIMIT_LISTY);
  // własny wynik pokazujemy zawsze, także poza pierwszą setką
  if (lista.ty && lista.ty.miejsce > LIMIT_LISTY && !wiersze.includes(lista.ty)) wiersze.push(lista.ty);
  return json({ dzien, dzis: dzisiaj(), liczba: lista.liczba, wiersze });
}

// Sprzątanie (cron): stare sesje i identyfikatory, które nigdy nie trafiły na listę
export async function sprzataj(env) {
  const granica = Date.now() - PRZECHOWUJ_SESJE;
  await env.DB.prepare('DELETE FROM sesje WHERE start < ?').bind(granica).run();
  await env.DB.prepare('DELETE FROM gracze WHERE utworzono < ? AND id NOT IN (SELECT gracz FROM wyniki)').bind(granica).run();
}
