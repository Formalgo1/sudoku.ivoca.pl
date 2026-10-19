# Sudoku

Klasyczne sudoku w przeglądarce (sudoku.ivoca.pl), cztery poziomy trudności, plus wyzwanie dnia z publicznym rankingiem.

## Zawartość

```
index.html       gra (Tailwind skompilowany do vendor/tailwind.css, zob. build/README.md)
ranking.html     publiczny ranking wyzwania dnia (/ranking)
projekt.html     O projekcie, regulamin, polityka prywatności, kontakt
src/worker.mjs   Worker: pliki statyczne + API /api/wyzwanie/* (logika Sudoku)
src/wyzwanie.mjs część wspólna wyzwania dnia — TEN SAM plik jest w szyfrant.ivoca.pl, zmieniać w obu
src/sudoku-gen.mjs generator i sprawdzanie plansz
build/plansze-wyzwania.mjs plansze dnia na zapas (SQL do bazy D1)
migrations/      schemat bazy D1 „wyzwanie-dnia” (wspólnej z Szyfrantem)
```

## Wyzwanie dnia

- Karta nad panelem gry, link bezpośredni `/?wyzwanie`, ranking `/ranking` (`?dzien=RRRR-MM-DD`).
- Plansza dnia z tabeli `plansze` (wygenerowane na zapas z kontrolą jednoznaczności, 46 pustych pól). Gdy zabraknie dnia, Worker generuje awaryjnie planszę bez tej kontroli. Dogenerowanie (INSERT OR IGNORE):
  `node build/plansze-wyzwania.mjs RRRR-MM-DD 1100 > /tmp/plansze.sql && npx wrangler d1 execute wyzwanie-dnia --remote --file /tmp/plansze.sql`
- Przeglądarka nie dostaje rozwiązania i nie ma podpowiedzi. Każda wpisana cyfra idzie (kolejką, po jednej) do `POST /api/wyzwanie/ruch` jako `{cyfra: {i, v}}`; serwer odpowiada `poprawna` i liczbę błędów, zła cyfra jest czerwona. 3 błędy = koniec (przegrana, bez publikacji), komplet dobrych cyfr = wygrana — decyduje serwer (stan `dobre` w sesji). Ranking: czas, błędy informacyjnie (kolumna `bledy`, migracja `0002_bledy.sql`). Limit POST 150/min (każda cyfra to zapytanie). Bez pauzy (czas biegnie po stronie serwera). Przed startem 15 s odliczania na czerwono (plansza zasłonięta): serwer zapisuje `start` = chwila rozpoczęcia + 15 s (`odliczanie` w obiekcie gry) i odrzuca ruchy przed tym czasem. Link `/?wyzwanie` w karcie otwartej w tle zaczyna wyzwanie dopiero, gdy karta stanie się widoczna.
- Zapis wyniku, identyfikator gracza w `sessionStorage` (`wyzwanie-gracz`), podświetlenie w rankingu — jak w Szyfrancie (README tam). Stan wyzwania: `sessionStorage` `sudoku-wyzwanie`.
- Sprzątanie bazy robi cron Workera Szyfranta (wspólna baza).
- Test: `~/.cache/puzzle-test/wyzwanie-sudoku-ui.js` (`URL=… node …`).

## Publikacja

`npx wrangler deploy` (Worker `dark-truth-0072`, domena sudoku.ivoca.pl). Wyjątki w `.assetsignore`.
