// Wspólny plik ivoca-wspolne (wzór: ivoca.org/js/wyglad.js). Kopiowany do każdej aplikacji.
// Przycisk #btn-wyglad może mieć: data-font-opis (nazwa czcionki standardowej, domyślnie „Inter”),
// data-font-css (jej font-family) i data-styl="wlasny" (aplikacja sama stylizuje przycisk).
// Ustawienia wyglądu tekstu: czcionka (Standardowa = czcionka aplikacji / Wyraźna = Atkinson Hyperlegible Next)
// i rozmiar tekstu (normalny / większy / największy). Wybór jest zapisywany tylko w tej przeglądarce
// (localStorage "font" i "textSize"); domyślne wartości nie są zapisywane wcale.
// Sam wybór stosuje skrypt w <head> każdej strony (atrybuty data-font i data-size na <html>),
// ten plik tylko dokłada okienko z ustawieniami do przycisku #btn-wyglad.
(function () {
  var btn = document.getElementById('btn-wyglad');
  if (!btn) return;
  var root = document.documentElement;

  var FONTY = [
    { v: 'standardowa', t: 'Standardowa', opis: btn.getAttribute('data-font-opis') || 'Inter', css: btn.getAttribute('data-font-css') || "'Inter', system-ui, sans-serif" },
    { v: 'wyrazna', t: 'Wyraźna', opis: 'Atkinson Hyperlegible — łatwiej odróżnić litery', css: "'Atkinson Hyperlegible Next', system-ui, sans-serif" }
  ];
  var ROZMIARY = [
    { v: 'normalny', t: 'Normalny', px: '1em' },
    { v: 'wiekszy', t: 'Większy', px: '1.125em' },
    { v: 'najwiekszy', t: 'Największy', px: '1.25em' }
  ];

  function czytaj(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function zapisz(k, v, domyslna) {
    try { if (v === domyslna) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {}
  }
  function teraz() {
    return {
      font: root.getAttribute('data-font') === 'wyrazna' ? 'wyrazna' : 'standardowa',
      size: root.getAttribute('data-size') || 'normalny'
    };
  }
  function ustaw(font, size) {
    if (font === 'wyrazna') root.setAttribute('data-font', 'wyrazna'); else root.removeAttribute('data-font');
    if (size === 'wiekszy' || size === 'najwiekszy') root.setAttribute('data-size', size); else root.removeAttribute('data-size');
  }

  var styl = document.createElement('style');
  styl.textContent =
    '.wyglad{position:relative}' +
    '.wyglad-btn:not([data-styl]){font:inherit;font-weight:700;font-size:1rem;line-height:1;min-width:44px;min-height:44px;padding:0 10px;border:0;border-radius:12px;background:transparent;color:var(--ink-soft,var(--soft));cursor:pointer}' +
    '.wyglad-btn:not([data-styl]):hover,.wyglad-btn:not([data-styl])[aria-expanded="true"]{background:var(--hover,color-mix(in srgb,var(--line) 50%,transparent));color:var(--ink)}' +
    '.wyglad-btn:focus-visible{outline:2px solid var(--brand,var(--accent));outline-offset:2px}' +
    '.wyglad-btn small{font-size:.75em}' +
    '.wyglad-panel{position:absolute;right:0;top:calc(100% + 6px);z-index:50;width:min(300px,calc(100vw - 32px));padding:14px 16px;border-radius:16px;' +
      'background:var(--card,#fff);color:var(--ink);border:1px solid var(--line);box-shadow:0 10px 25px -5px rgb(15 23 42 / .25);line-height:1.4;text-align:left}' +
    '.wyglad-panel[hidden]{display:none}' +
    '.wyglad-panel fieldset{border:0;margin:0 0 12px;padding:0}' +
    '.wyglad-panel legend{font-weight:700;font-size:.85rem;margin-bottom:6px;padding:0}' +
    '.wyglad-panel label{display:flex;align-items:flex-start;gap:10px;padding:8px 10px;border-radius:10px;border:1px solid var(--line);margin-top:6px;cursor:pointer}' +
    '.wyglad-panel label:has(input:checked){border-color:var(--brand,var(--accent));background:color-mix(in srgb,var(--brand,var(--accent)) 10%,transparent)}' +
    '.wyglad-panel input{margin:3px 0 0;accent-color:var(--brand,var(--accent));flex:none;width:18px;height:18px}' +
    '.wyglad-panel .opis{display:block;font-size:.8rem;color:var(--ink-soft,var(--soft))}' +
    '.wyglad-panel label:has(input:checked) .opis{color:var(--ink)}' +
    '.wyglad-panel .rozmiary{display:flex;gap:6px}' +
    '.wyglad-panel .rozmiary label{flex:1;flex-direction:column;align-items:center;gap:4px;text-align:center;margin-top:0;padding:8px 4px}' +
    '.wyglad-panel .rozmiary input{margin:0}' +
    '.wyglad-panel .info{margin:0;font-size:.75rem;color:var(--ink-soft,var(--soft))}';
  document.head.appendChild(styl);

  var panel = document.createElement('div');
  panel.className = 'wyglad-panel';
  panel.id = 'wyglad-panel';
  panel.setAttribute('role', 'group');
  panel.setAttribute('aria-label', 'Czcionka i rozmiar tekstu');
  panel.hidden = true;

  var h = '<fieldset><legend>Czcionka</legend>';
  FONTY.forEach(function (f) {
    h += '<label style="font-family:' + f.css.replace(/'/g, '&#39;').replace(/"/g, '&quot;') + '"><input type="radio" name="wyglad-font" value="' + f.v + '">' +
      '<span><span>' + f.t + '</span><span class="opis">' + f.opis + '</span></span></label>';
  });
  h += '</fieldset><fieldset><legend>Rozmiar tekstu</legend><div class="rozmiary">';
  ROZMIARY.forEach(function (r) {
    h += '<label><span style="font-size:' + r.px + '" aria-hidden="true">A</span><input type="radio" name="wyglad-size" value="' + r.v + '">' +
      '<span class="opis">' + r.t + '</span></label>';
  });
  h += '</div></fieldset><p class="info">Wybór zapamiętuje tylko ta przeglądarka.</p>';
  panel.innerHTML = h;
  btn.parentNode.appendChild(panel);

  function zaznacz() {
    var s = teraz();
    panel.querySelectorAll('input').forEach(function (i) {
      i.checked = (i.name === 'wyglad-font' ? s.font : s.size) === i.value;
    });
  }
  panel.addEventListener('change', function (e) {
    var i = e.target;
    var s = teraz();
    if (i.name === 'wyglad-font') { s.font = i.value; zapisz('font', i.value, 'standardowa'); }
    if (i.name === 'wyglad-size') { s.size = i.value; zapisz('textSize', i.value, 'normalny'); }
    ustaw(s.font, s.size);
  });

  function otworz() {
    zaznacz();
    panel.hidden = false;
    btn.setAttribute('aria-expanded', 'true');
    var c = panel.querySelector('input:checked');
    if (c) c.focus();
  }
  function zamknij(wrocFokus) {
    if (panel.hidden) return;
    panel.hidden = true;
    btn.setAttribute('aria-expanded', 'false');
    if (wrocFokus) btn.focus();
  }
  btn.addEventListener('click', function () { if (panel.hidden) otworz(); else zamknij(false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !panel.hidden) zamknij(true); });
  document.addEventListener('click', function (e) {
    if (!panel.hidden && !panel.contains(e.target) && !btn.contains(e.target)) zamknij(false);
  });
  panel.addEventListener('focusout', function (e) {
    if (e.relatedTarget && !panel.contains(e.relatedTarget) && e.relatedTarget !== btn) zamknij(false);
  });

  // Zmiana w innej karcie tej samej strony
  window.addEventListener('storage', function (e) {
    if (e.key === 'font' || e.key === 'textSize' || e.key === null) {
      ustaw(czytaj('font'), czytaj('textSize'));
      zaznacz();
    }
  });

  btn.hidden = false;
})();
