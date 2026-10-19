// Sudoku: statyczne pliki (assets) + API wyzwania dnia (/api/wyzwanie/*).
// Plansza dnia jest ta sama dla wszystkich; czas liczy serwer od rozpoczęcia do przesłania poprawnego rozwiązania.
import { obsluzWyzwanie, sprzataj, losowa } from './wyzwanie.mjs';
import { generuj, sprawdz } from './sudoku-gen.mjs';

const BLEDY = 3;   // limit błędów, jak w zwykłej grze

export const SUDOKU = {
  nazwa: 'sudoku',
  kolejnosc: 'czas ASC',
  odliczanie: 15000,   // 15 s odliczania przed pokazaniem planszy; czas liczy się od końca odliczania
  // Plansze są wygenerowane na zapas (build/plansze-wyzwania.mjs); to tylko awaryjnie, bez kontroli jednoznaczności
  nowaPlansza() { return generuj(losowa, 46, false); },
  publiczne(dane) { return { plansza: dane.plansza }; },
  poczatkowyStan() { return { wyslane: 0, bledy: 0 }; },
  ruch(stan, dane, body) {
    stan.bledy = stan.bledy || 0;
    // pojedyncza cyfra: serwer mówi, czy jest dobra; 3 błędy kończą wyzwanie (jak w zwykłej grze)
    if (body.cyfra) {
      const i = body.cyfra.i, v = body.cyfra.v;
      if (!Number.isInteger(i) || i < 0 || i > 80 || !Number.isInteger(v) || v < 1 || v > 9 || dane.plansza[i] !== '0') {
        return { blad: 'Niepoprawny ruch' };
      }
      if (!stan.dobre) stan.dobre = dane.plansza;
      const dobra = dane.rozwiazanie[i] === String(v);
      if (!dobra) {
        stan.bledy++;
        const odpowiedz = { poprawna: false, bledy: stan.bledy };
        if (stan.bledy >= BLEDY) return { stan, odpowiedz, koniec: { wygrana: false, bledy: stan.bledy } };
        return { stan, odpowiedz };
      }
      stan.dobre = stan.dobre.slice(0, i) + v + stan.dobre.slice(i + 1);
      const odpowiedz = { poprawna: true, bledy: stan.bledy };
      if (stan.dobre.indexOf('0') === -1) return { stan, odpowiedz, koniec: { wygrana: true, bledy: stan.bledy } };
      return { stan, odpowiedz };
    }
    // cała plansza naraz (starsza wersja strony)
    if (stan.bledy >= BLEDY) return { blad: 'Koniec gry' };
    if (stan.wyslane >= 20) return { blad: 'Za dużo prób przesłania' };
    stan.wyslane++;
    if (!sprawdz(dane.plansza, body.wynik)) return { stan, odpowiedz: { poprawne: false } };
    return { stan, odpowiedz: { poprawne: true }, koniec: { wygrana: true, bledy: stan.bledy } };
  }
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/wyzwanie/')) return obsluzWyzwanie(request, env, SUDOKU);
    return env.ASSETS.fetch(request);
  },
  async scheduled(event, env) {
    await sprzataj(env);
  }
};
