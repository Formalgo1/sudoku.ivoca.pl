// Okno z ostrzeżeniem przed przejściem na zewnętrzną stronę (spoza ivoca.org, ivoca.pl i ich podserwisów).
// Wspólny plik z repo ivoca-wspolne — zmiany robić tam i kopiować do serwisów.
// Tło, tekst i ramki ze zmiennych strony (--card, --ink, --line); przycisk „Przejdź” zawsze #2563eb z białym tekstem
// (5,2:1 w każdym motywie). Własne kolory: --zewn-bg, --zewn-ink, --zewn-btn, --zewn-btn-ink, --zewn-link.
// Działa dla wszystkich linków, także dodanych później (np. w wynikach testu) — przez delegację kliknięć.
(function () {
  'use strict';
  var wlasna = function (host) { return /(^|\.)ivoca\.(org|pl)$/.test(host) || host === location.hostname; };

  var css = document.createElement('style');
  css.textContent =
    'dialog.zewn{max-width:min(28rem,calc(100vw - 32px));padding:20px;border:1px solid var(--line,#cbd5e1);border-radius:16px;' +
    'background:var(--zewn-bg,var(--card,#fff));color:var(--zewn-ink,var(--ink,#0f172a));box-shadow:0 20px 40px -12px rgb(0 0 0 / .35);font:inherit}' +
    'dialog.zewn::backdrop{background:rgb(15 23 42 / .55)}' +
    'dialog.zewn h2{margin:0 0 8px;font-size:1.1rem;line-height:1.3}' +
    'dialog.zewn p{margin:0 0 10px;font-size:.95rem}' +
    'dialog.zewn .adres{font:.85rem/1.45 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;word-break:break-all;' +
    'background:color-mix(in srgb,currentColor 7%,transparent);border:1px solid var(--line,#cbd5e1);border-radius:8px;padding:8px 10px}' +
    'dialog.zewn .przyciski{display:flex;flex-wrap:wrap;gap:10px;margin-top:14px}' +
    'dialog.zewn button{min-height:48px;padding:10px 18px;border-radius:12px;font:inherit;font-weight:600;cursor:pointer}' +
    'dialog.zewn .idz{border:0;background:var(--zewn-btn,#2563eb);color:var(--zewn-btn-ink,#fff)}' +
    'dialog.zewn .anuluj{background:transparent;color:var(--zewn-link,inherit);border:1px solid var(--line,#cbd5e1)}' +
    'dialog.zewn button:focus-visible{outline:2px solid currentColor;outline-offset:2px}' +
    'dialog.zewn .idz:focus-visible{outline-color:var(--zewn-btn,#2563eb)}';
  document.head.appendChild(css);

  var dlg = document.createElement('dialog');
  dlg.className = 'zewn';
  dlg.setAttribute('aria-labelledby', 'zewn-tytul');
  dlg.setAttribute('aria-describedby', 'zewn-opis');
  dlg.innerHTML =
    '<h2 id="zewn-tytul">Przejście na zewnętrzną stronę</h2>' +
    '<div id="zewn-opis"><p>Ten link prowadzi poza serwis, na zewnętrzną stronę niezależną od niego. ' +
    'Nie odpowiadamy za jej treść ani za to, jak przetwarza Twoje dane — obowiązują tam zasady jej właściciela.</p>' +
    '<p class="adres" id="zewn-adres"></p></div>' +
    '<div class="przyciski"><button type="button" class="idz" value="idz">Przejdź do strony</button>' +
    '<button type="button" class="anuluj" value="anuluj">Zostań tutaj</button></div>';
  document.body.appendChild(dlg);

  var cel = null, zrodlo = null;
  dlg.querySelector('.idz').addEventListener('click', function () {
    var url = cel;
    dlg.close();
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
  });
  dlg.querySelector('.anuluj').addEventListener('click', function () { dlg.close(); });
  dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); }); // kliknięcie obok okna
  // Esc zamyka to okno, zanim klawisz dostanie gra albo jej własne okienka (nasłuch na window w fazie przechwytywania)
  window.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && dlg.open) { e.preventDefault(); e.stopImmediatePropagation(); dlg.close(); }
  }, true);
  dlg.addEventListener('close', function () {
    cel = null;
    if (zrodlo && document.contains(zrodlo)) zrodlo.focus();
    zrodlo = null;
  });

  document.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button !== 0) return;
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a) return;
    var u;
    try { u = new URL(a.getAttribute('href'), location.href); } catch (x) { return; }
    if ((u.protocol !== 'https:' && u.protocol !== 'http:') || wlasna(u.hostname)) return;
    if (typeof dlg.showModal !== 'function') return; // bardzo stara przeglądarka — zwykły link
    e.preventDefault();
    cel = u.href;
    zrodlo = a;
    document.getElementById('zewn-adres').textContent = u.href;
    dlg.showModal();
    dlg.querySelector('.anuluj').focus();
  });
})();
