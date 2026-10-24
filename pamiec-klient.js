// „Zapamiętaj mnie” w wyzwaniach dnia — klient po stronie gry (Szyfrant, Sudoku, Puzzle, Jazda).
// Ten sam plik jest we wszystkich czterech repozytoriach; zmiany wprowadzać we wszystkich.
//
// Opcję włącza się na stronie głównej ivoca.pl. Gra pyta ukrytą ramkę https://ivoca.pl/pamiec.html
// o identyfikator i token na dany dzień. Ramka wylicza je z klucza zapisanego na ivoca.pl osobno dla
// każdej gry i każdego dnia (do 30 dni wstecz); sam klucz nie trafia do gry ani na serwer.
// Gdy opcja jest wyłączona albo ramka nie odpowie w 3 s, gra działa jak dawniej (sessionStorage).
(function () {
  'use strict';
  var MOST = window.IVOCA_PAMIEC_URL || 'https://ivoca.pl/pamiec.html';
  var ramka = null, gotowa = null, nr = 0, czekaja = {};

  function zaladuj() {
    if (gotowa) return gotowa;
    gotowa = new Promise(function (ok) {
      var origin;
      try { origin = new URL(MOST).origin; } catch (e) { return ok(false); }
      var t = setTimeout(function () { ok(false); }, 3000);
      window.addEventListener('message', function (ev) {
        if (ev.origin !== origin || !ramka || ev.source !== ramka.contentWindow || !ev.data) return;
        if (ev.data.typ === 'ivoca-pamiec-gotowa') { clearTimeout(t); ok(true); }
        else if (ev.data.typ === 'ivoca-pamiec' && czekaja[ev.data.nr]) { czekaja[ev.data.nr](ev.data); delete czekaja[ev.data.nr]; }
      });
      ramka = document.createElement('iframe');
      ramka.src = MOST;
      ramka.title = 'ivoca.pl – pamięć gracza';
      ramka.setAttribute('aria-hidden', 'true');
      ramka.tabIndex = -1;
      ramka.style.cssText = 'position:absolute;width:0;height:0;border:0;visibility:hidden';
      (document.body || document.documentElement).appendChild(ramka);
    });
    return gotowa;
  }

  // dni: tablica 'RRRR-MM-DD'; przedluz: true przedłuża zapamiętanie o 30 dni (każda gra)
  // → { aktywna, wygasa, gracze: { dzien: { gracz, token } } } albo null
  function pytaj(dni, przedluz) {
    return zaladuj().then(function (ok) {
      if (!ok) return null;
      return new Promise(function (wynik) {
        var n = ++nr;
        var t = setTimeout(function () { delete czekaja[n]; wynik(null); }, 3000);
        czekaja[n] = function (d) { clearTimeout(t); wynik(d); };
        ramka.contentWindow.postMessage({ typ: 'ivoca-pamiec', nr: n, dni: dni || [], przedluz: !!przedluz }, new URL(MOST).origin);
      });
    }).catch(function () { return null; });
  }

  window.ivocaPamiec = {
    pytaj: pytaj,
    // { gracz, token } zapamiętanego gracza na dany dzień albo null (opcja wyłączona)
    gracz: function (dzien, przedluz) {
      return pytaj([dzien], przedluz).then(function (d) {
        return d && d.aktywna && d.gracze && d.gracze[dzien] ? d.gracze[dzien] : null;
      });
    },
    przedluz: function () { return pytaj([], true); }
  };
})();
