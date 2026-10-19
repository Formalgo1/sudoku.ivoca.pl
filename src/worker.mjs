// Sudoku: statyczne pliki (assets) + API wyzwania dnia (/api/wyzwanie/*).
// Plansza dnia jest ta sama dla wszystkich; czas liczy serwer od rozpoczęcia do przesłania poprawnego rozwiązania.
import { obsluzWyzwanie, sprzataj, losowa } from './wyzwanie.mjs';
import { generuj, sprawdz } from './sudoku-gen.mjs';

export const SUDOKU = {
  nazwa: 'sudoku',
  kolejnosc: 'czas ASC',
  odliczanie: 15000,   // 15 s odliczania przed pokazaniem planszy; czas liczy się od końca odliczania
  // Plansze są wygenerowane na zapas (build/plansze-wyzwania.mjs); to tylko awaryjnie, bez kontroli jednoznaczności
  nowaPlansza() { return generuj(losowa, 46, false); },
  publiczne(dane) { return { plansza: dane.plansza }; },
  poczatkowyStan() { return { wyslane: 0 }; },
  ruch(stan, dane, body) {
    if (stan.wyslane >= 20) return { blad: 'Za dużo prób przesłania' };
    stan.wyslane++;
    if (!sprawdz(dane.plansza, body.wynik)) return { stan, odpowiedz: { poprawne: false } };
    return { stan, odpowiedz: { poprawne: true }, koniec: { wygrana: true } };
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
