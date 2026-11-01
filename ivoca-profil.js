// Profil gracza ivoca.org — klient po stronie gry (wspólny plik z repo ivoca-wspolne, kopiowany do js/ każdej gry).
//
// Gra woła ivocaStat(zdarzenie, wygrana, dane) jak dotąd; funkcja ivocaStat odkłada zdarzenie do
// window.ivocaProfilQ, a ten plik przekazuje je ukrytej ramce https://ivoca.org/pamiec.html.
// Ramka zapisuje statystyki w profilu na ivoca.org TYLKO wtedy, gdy na tym urządzeniu włączone jest
// „Zapamiętaj mnie” — inaczej je odrzuca. Nic nie trafia na serwer: profil istnieje tylko w przeglądarce.
//
// Ramka wczytuje się dopiero przy pierwszym zdarzeniu (nie przy wejściu na stronę). Gdy nie odpowie
// (np. gra bez internetu), zdarzenia czekają w localStorage gry („ivoca-profil-kolejka”, najwyżej 50,
// najwyżej 30 dni) i idą przy kolejnej okazji.
(function () {
  'use strict';
  if (window.ivocaProfilQ && window.ivocaProfilQ.gotowy) return;
  var MOST = window.IVOCA_PAMIEC_URL || 'https://ivoca.org/pamiec.html';
  var KOLEJKA = 'ivoca-profil-kolejka', MAKS = 50, WIEK = 30 * 24 * 3600 * 1000;
  var ramka = null, gotowa = null, gotowaOk = null, sluchacz = false, nr = 0, czekaja = {}, zegar = null, wysyla = false;
  var origin;
  try { origin = new URL(MOST, location.href).origin; } catch (e) { return; }

  function wczytaj() {
    var k = [];
    try { k = JSON.parse(localStorage.getItem(KOLEJKA) || '[]'); } catch (e) {}
    if (!Array.isArray(k)) k = [];
    var granica = Date.now() - WIEK;
    return k.filter(function (z) { return z && typeof z.t === 'number' && z.t > granica; }).slice(-MAKS);
  }
  function zapisz(k) {
    try { if (k.length) localStorage.setItem(KOLEJKA, JSON.stringify(k.slice(-MAKS))); else localStorage.removeItem(KOLEJKA); } catch (e) {}
  }
  function liczba(x, maks) { return typeof x === 'number' && isFinite(x) && x >= 0 && x <= maks ? Math.round(x) : undefined; }

  // ivocaStat('start' | 'finish', wygrana, { war: 'Łatwy', czas: sekundy, punkty, ruchy })
  function dodaj(zdarzenie, wygrana, dane) {
    if (zdarzenie !== 'start' && zdarzenie !== 'finish') return;
    dane = dane && typeof dane === 'object' ? dane : {};
    var z = { zd: zdarzenie === 'start' ? 'start' : 'koniec', t: Date.now() };
    if (typeof wygrana === 'boolean' && z.zd === 'koniec') z.w = wygrana;
    if (typeof dane.war === 'string' && dane.war) z.war = dane.war.slice(0, 40);
    var c = liczba(dane.czas, 864000), p = liczba(dane.punkty, 1e9), r = liczba(dane.ruchy, 1e6);
    if (c !== undefined) z.czas = c;
    if (p !== undefined) z.punkty = p;
    if (r !== undefined) z.ruchy = r;
    var k = wczytaj();
    k.push(z);
    zapisz(k);
    planuj(1500);
  }

  function zaladuj() {
    if (gotowa) return gotowa;
    gotowa = new Promise(function (ok) {
      var t = setTimeout(function () {
        if (ramka && ramka.parentNode) ramka.parentNode.removeChild(ramka);
        ramka = null; gotowa = null; ok(false);
      }, 8000);
      if (!sluchacz) {
        sluchacz = true;
        window.addEventListener('message', function (ev) {
          if (ev.origin !== origin || !ramka || ev.source !== ramka.contentWindow || !ev.data) return;
          if (ev.data.typ === 'ivoca-pamiec-gotowa') { if (gotowaOk) gotowaOk(); }
          else if (ev.data.typ === 'ivoca-profil' && czekaja[ev.data.nr]) { czekaja[ev.data.nr](ev.data); delete czekaja[ev.data.nr]; }
        });
      }
      gotowaOk = function () { clearTimeout(t); ok(true); };
      ramka = document.createElement('iframe');
      ramka.src = MOST;
      ramka.title = 'ivoca.org – profil gracza';
      ramka.setAttribute('aria-hidden', 'true');
      ramka.tabIndex = -1;
      ramka.style.cssText = 'position:absolute;width:0;height:0;border:0;visibility:hidden';
      (document.body || document.documentElement).appendChild(ramka);
    });
    return gotowa;
  }

  function wyslij() {
    zegar = null;
    if (wysyla) return;
    var k = wczytaj();
    if (!k.length) { zapisz(k); return; }
    if (navigator.onLine === false) return;   // bez internetu — spróbujemy przy następnym zdarzeniu albo wejściu
    wysyla = true;
    zaladuj().then(function (ok) {
      if (!ok || !ramka) return null;
      return new Promise(function (wynik) {
        var n = ++nr;
        var t = setTimeout(function () { delete czekaja[n]; wynik(null); }, 5000);
        czekaja[n] = function (d) { clearTimeout(t); wynik(d); };
        ramka.contentWindow.postMessage({ typ: 'ivoca-profil', nr: n, zdarzenia: k }, origin);
      });
    }).then(function (odp) {
      if (!odp || !odp.ok) return false;
      // ramka przyjęła (albo odrzuciła, bo „Zapamiętaj mnie” jest wyłączone) — tak czy inaczej zdarzenia znikają z kolejki
      var wyslane = {};
      k.forEach(function (z) { wyslane[z.t + '|' + z.zd] = 1; });
      zapisz(wczytaj().filter(function (z) { return !wyslane[z.t + '|' + z.zd]; }));
      return true;
    }).catch(function () { return false; }).then(function (udane) {
      wysyla = false;
      // zdarzenia dodane w trakcie wysyłki idą od razu; po nieudanej próbie czekamy na kolejne zdarzenie albo wejście
      if (udane && !zegar && wczytaj().length) planuj(500);
    });
  }
  function planuj(ms) { if (zegar) clearTimeout(zegar); zegar = setTimeout(wyslij, ms); }

  // zdarzenia odłożone przed wczytaniem tego pliku
  var stare = Array.isArray(window.ivocaProfilQ) ? window.ivocaProfilQ : [];
  window.ivocaProfilQ = { gotowy: true, push: function (a) { if (a && a.length) dodaj(a[0], a[1], a[2]); } };
  stare.forEach(function (a) { window.ivocaProfilQ.push(a); });
  // zaległe zdarzenia z poprzednich wizyt (np. gra bez internetu) — gdy strona się wczyta
  if (!stare.length && wczytaj().length) {
    if (document.readyState === 'complete') planuj(2000);
    else window.addEventListener('load', function () { planuj(2000); });
  }
})();
