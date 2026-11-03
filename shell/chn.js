/* Chumbada Oficial — menu global + busca (componente compartilhado)
 *
 * Fonte única. `sync.sh` copia este arquivo para /shell/ dos dois hubs; todos os
 * catálogos carregam o script do hub da sua variante, então uma alteração aqui
 * (depois do sync + deploy do hub) chega a todos sem tocar nos catálogos.
 *
 * Uso (no <head> ou fim do <body> do catálogo):
 *   <script src="./shell/chn.js" defer data-variant="sem-preco"
 *           data-current="anzois"                       // chave do catálogo atual (vazio no hub)
 *           data-hide=".main-header"                    // cabeçalho antigo a esconder (opcional)
 *           data-extra='[{"l":"Linha ECO","h":"#/linha-eco"}]'></script>   // links próprios (opcional)
 *
 * Variante (com/sem preço) = hub de onde o script foi servido (ou data-variant).
 * O visual fica em Shadow DOM: não sofre com o CSS de nenhum catálogo e vice-versa. */
(function () {
  'use strict';
  if (window.__chn) return;
  window.__chn = true;

  var me = document.currentScript;
  var attr = function (k, d) { return (me && me.getAttribute('data-' + k)) || d; };

  var VARIANTS = {
    'sem-preco': {
      hub: 'https://catalogos.chumbada.com.br/',
      cats: {
        anzois: 'https://anzois.chumbada.com.br/',
        iscas: 'https://iscas.chumbada.com.br/',
        acessorios: 'https://acessorios.chumbada.com.br/',
        oculos: 'https://oculos.chumbada.com.br/',
        chumbadas: 'https://chumbadas.chumbada.com.br/',
        pesqueiro: 'https://pesqueiro.chumbada.com.br/'
      }
    },
    'com-preco': {
      hub: 'https://catalogosdeprecos.chumbada.com.br/',
      cats: {
        anzois: 'https://precosdosanzois.chumbada.com.br/',
        iscas: 'https://precodasiscas.chumbada.com.br/',
        acessorios: 'https://precodosacessorios.chumbada.com.br/',
        oculos: 'https://precodosoculos.chumbada.com.br/',
        chumbadas: 'https://precodaschumbadas.chumbada.com.br/',
        pesqueiro: 'https://precopesqueiro.chumbada.com.br/'
      }
    }
  };
  var LABELS = [
    ['anzois', 'Anzóis & Jig Heads'], ['iscas', 'Iscas'], ['acessorios', 'Acessórios'],
    ['oculos', 'Óculos'], ['chumbadas', 'Chumbadas'], ['pesqueiro', 'Pesqueiro']
  ];

  var srcUrl = me && me.src ? new URL(me.src, location.href) : null;
  var variantKey = attr('variant', srcUrl && /catalogosdeprecos/.test(srcUrl.hostname) ? 'com-preco' : 'sem-preco');
  var V = VARIANTS[variantKey] || VARIANTS['sem-preco'];
  var current = attr('current', '');
  var isHub = !current;
  // Só o hub servido de localhost usa o índice local; os catálogos sempre buscam o índice do hub no ar.
  var base = isHub && srcUrl && /^(localhost|127\.0\.0\.1)$/.test(srcUrl.hostname) ? srcUrl.href.replace(/shell\/chn\.js.*$/, '') : V.hub;
  var INDEX_URL = base + 'search-index.json';
  var extra = [];
  try { extra = JSON.parse(attr('extra', '[]')); } catch (e) {}
  var hideSel = attr('hide', '');
  var showSelecao = attr('selecao', isHub ? '1' : '') === '1';

  // ---------- estilos na página (só o mínimo: esconder cabeçalho antigo, offsets) ----------
  var g = document.createElement('style');
  g.id = 'chn-global';
  g.textContent =
    'chumbada-nav{display:block;position:sticky;top:0;z-index:2147483000;min-height:68px;background:#0a3a47}' +
    'html{scroll-padding-top:84px}' +
    '.ms-hub-link{display:none !important}' +   /* "Voltar aos catálogos" da Minha Seleção: o menu já faz isso */
    (hideSel ? hideSel + '{display:none !important}' : '');
  document.head.appendChild(g);

  if (!document.getElementById('chn-fonts')) {
    var f = document.createElement('link');
    f.id = 'chn-fonts'; f.rel = 'stylesheet';
    f.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Outfit:wght@600;700;800&display=swap';
    document.head.appendChild(f);
  }

  var CSS = '\
:host{all:initial;display:block;font-family:Inter,system-ui,-apple-system,Segoe UI,sans-serif;color:#fff;-webkit-font-smoothing:antialiased}\
*{box-sizing:border-box;margin:0;padding:0}\
a{color:inherit;text-decoration:none}\
button{font:inherit;color:inherit;background:none;border:0;cursor:pointer}\
:focus-visible{outline:2px solid #ff7a33;outline-offset:2px;border-radius:6px}\
.bar{position:relative;background:linear-gradient(180deg,#0b3f4d,#0a3541);border-bottom:1px solid rgba(255,255,255,.1);box-shadow:0 6px 24px rgba(4,24,30,.28)}\
.bar::after{content:"";position:absolute;left:0;right:0;bottom:-1px;height:2px;background:linear-gradient(90deg,#ff4d00,#ff7a33 40%,transparent 80%)}\
.in{display:flex;align-items:center;gap:6px;max-width:1280px;height:68px;margin:0 auto;padding:0 20px}\
.logo{display:flex;align-items:center;flex:none;margin-right:12px;padding:6px 0}\
.logo{gap:10px}\
.logo img{height:48px;width:auto;display:block;transition:transform .3s}\
.logo b{display:block;font:800 15px/1 Outfit,Inter,sans-serif;letter-spacing:.04em;text-transform:uppercase}\
.logo small{display:block;margin-top:4px;font:600 10px/1 Inter,sans-serif;letter-spacing:.18em;text-transform:uppercase;color:#ff8a52}\
@media (max-width:1180px){.lt{display:none}}\
.logo:hover img{transform:scale(1.04)}\
nav{display:flex;align-items:center;gap:2px;flex:1;min-width:0}\
nav a{position:relative;display:inline-flex;align-items:center;gap:6px;height:40px;padding:0 12px;border-radius:99px;font-size:13.5px;font-weight:600;letter-spacing:.01em;color:rgba(255,255,255,.82);white-space:nowrap;transition:background .2s,color .2s}\
nav a:hover{background:rgba(255,255,255,.1);color:#fff}\
nav a[aria-current=page]{background:#ff4d00;color:#fff;box-shadow:0 4px 14px rgba(255,77,0,.4)}\
nav a.sub{font-weight:500;font-size:12.5px;color:#ffb48f}\
nav a.sub:hover{color:#fff}\
.sp{flex:1}\
.sf{position:relative;display:flex;align-items:center;width:210px;height:40px;border-radius:99px;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.16);transition:width .3s cubic-bezier(.16,1,.3,1),background .2s,border-color .2s}\
.sf:focus-within{width:290px;background:#fff;border-color:#ff4d00;color:#111}\
.sf svg{flex:none;margin-left:13px;opacity:.8}\
.sf input{flex:1;min-width:0;height:100%;padding:0 12px 0 9px;border:0;outline:0;background:transparent;font:inherit;font-size:14px;color:inherit}\
.sf input::placeholder{color:rgba(255,255,255,.7)}\
.sf:focus-within input::placeholder{color:#767676}\
.sf kbd{flex:none;margin-right:10px;padding:1px 7px;border:1px solid rgba(255,255,255,.3);border-radius:5px;font:600 11px Inter,sans-serif;opacity:.7}\
.sf:focus-within kbd{display:none}\
.ext{flex:none;display:inline-flex;align-items:center;height:40px;padding:0 16px;margin-left:6px;border:1px solid rgba(255,255,255,.28);border-radius:99px;font-size:13px;font-weight:700;transition:background .2s,border-color .2s}\
.ext:hover{background:#fff;color:#0a3541;border-color:#fff}\
.ext.sel{border-color:#ff4d00;color:#ffb48f}\
.ext.sel:hover{background:#ff4d00;color:#fff;border-color:#ff4d00}\
.ib{display:none;flex:none;width:44px;height:44px;border-radius:50%;align-items:center;justify-content:center;transition:background .2s}\
.ib:hover{background:rgba(255,255,255,.12)}\
.panel{position:absolute;left:0;right:0;top:100%;background:#fff;color:#111;box-shadow:0 24px 50px rgba(4,24,30,.35);border-radius:0 0 18px 18px;max-width:760px;margin:0 auto;overflow:hidden}\
.panel[hidden]{display:none}\
.res{max-height:min(66vh,560px);overflow-y:auto;overscroll-behavior:contain}\
.it{display:flex;align-items:center;gap:14px;padding:11px 18px;border-bottom:1px solid #eee;color:#111;transition:background .15s}\
.it:hover,.it.on{background:#fff4ee}\
.it.on{box-shadow:inset 3px 0 0 #ff4d00}\
.th{flex:none;width:52px;height:52px;object-fit:contain;background:#f4f6f7;border:1px solid #e6eaec;border-radius:10px;padding:3px}\
.tx{flex:1;min-width:0;display:flex;flex-direction:column;gap:5px}\
.nm{font-weight:600;font-size:14.5px;line-height:1.25;overflow:hidden;text-overflow:ellipsis}\
.nm mark{background:rgba(255,77,0,.16);color:inherit;border-radius:3px;padding:0 1px}\
.mt{display:flex;gap:8px;align-items:center;flex-wrap:wrap}\
.tg{font-size:10.5px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:#0a3a47;background:#e3f0f3;padding:3px 8px;border-radius:99px}\
.pr{font-size:12px;font-weight:700;color:#d43f00}\
.go{flex:none;color:#aaa;transition:transform .2s,color .2s}\
.it:hover .go,.it.on .go{color:#ff4d00;transform:translateX(4px)}\
.ms{padding:14px 18px;font-size:14px;color:#555;line-height:1.5}\
.ms b{color:#111}\
.ft{padding:10px 18px;background:#f4f6f7;font-size:11.5px;color:#666}\
.chips{display:flex;flex-wrap:wrap;gap:8px;padding:0 18px 16px}\
.chips a{padding:7px 13px;border-radius:99px;background:#e3f0f3;color:#0a3a47;font-size:12.5px;font-weight:600}\
.chips a:hover{background:#ff4d00;color:#fff}\
.drawer{display:none}\
@media (max-width:1100px){\
  .sf{width:180px}.sf:focus-within{width:260px}.sf kbd{display:none}\
  nav a{padding:0 9px;font-size:13px}\
}\
@media (max-width:960px){\
  nav,.sf,.ext{display:none}\
  .ib{display:inline-flex}\
  .in{padding:0 8px 0 16px;gap:0}\
  .sp{flex:1}\
  .panel{border-radius:0 0 16px 16px}\
  .drawer.open{display:block;position:absolute;left:0;right:0;top:100%;background:#0a3541;box-shadow:0 24px 50px rgba(4,24,30,.4);padding:8px 16px 20px;max-height:calc(100vh - 68px);overflow-y:auto}\
  .drawer a{display:flex;align-items:center;justify-content:space-between;min-height:52px;padding:0 6px;border-bottom:1px solid rgba(255,255,255,.1);font-size:16px;font-weight:600;color:rgba(255,255,255,.9)}\
  .drawer a[aria-current=page]{color:#ff8a52}\
  .drawer a[aria-current=page]::after{content:"•";margin-left:8px}\
  .drawer a.sub{font-size:14px;font-weight:500;color:#ffb48f;padding-left:20px}\
  .drawer .row{display:flex;gap:10px;margin-top:16px}\
  .drawer .row a{flex:1;justify-content:center;border:1px solid rgba(255,255,255,.28);border-radius:99px;min-height:46px;font-size:14px}\
  .drawer .row a.sel{border-color:#ff4d00;color:#ffb48f}\
}\
@media (prefers-reduced-motion:reduce){*{transition:none !important;animation:none !important}}\
';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function norm(s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); }
  function tokenize(s) { return norm(s).split(/[^a-z0-9°]+/).filter(Boolean); }

  var ICON_SEARCH = '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>';
  var ICON_MENU = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>';
  var ICON_X = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>';

  function catHref(key) {
    // No próprio catálogo o link vai para a home dele (hash limpo).
    return V.cats[key];
  }

  function linksHtml(mode) {
    return LABELS.map(function (l) {
      var cur = l[0] === current;
      var s = '<a href="' + catHref(l[0]) + '"' + (cur ? ' aria-current="page"' : '') + '>' + esc(l[1]) + '</a>';
      if (cur) s += extra.map(function (x) { return '<a class="sub" href="' + esc(x.h) + '">' + esc(x.l) + '</a>'; }).join('');
      return s;
    }).join('');
  }

  var logoSrc = 'https://cdn.shopify.com/s/files/1/0454/5845/6736/files/CHUMBADA-OFICIAL.png?v=1756760093';

  function build() {
    var host = document.createElement('chumbada-nav');
    var root = host.attachShadow({ mode: 'open' });
    root.innerHTML =
      '<style>' + CSS + '</style>' +
      '<div class="bar"><div class="in">' +
        '<a class="logo" href="' + (isHub ? base : V.hub) + '" aria-label="Chumbada Oficial — Catálogos, página inicial"' + (isHub ? ' aria-current="page"' : '') + '><img src="' + logoSrc + '" alt="" height="48"><span class="lt"><b>Chumbada</b><small>Catálogos</small></span></a>' +
        '<nav aria-label="Catálogos">' + linksHtml() + '</nav>' +
        '<div class="sp"></div>' +
        '<label class="sf" role="search">' + ICON_SEARCH +
          '<input id="q" type="search" autocomplete="off" spellcheck="false" placeholder="Buscar produto..." aria-label="Buscar produto em todos os catálogos" role="combobox" aria-expanded="false" aria-controls="res"><kbd aria-hidden="true">/</kbd></label>' +
        (showSelecao ? '<a class="ext sel" href="#/minha-selecao">Minha Seleção</a>' : '') +
        '<a class="ext" href="https://chumbadas.com.br/" target="_blank" rel="noopener">Loja ↗</a>' +
        '<button class="ib" id="sb" aria-label="Buscar produto" aria-expanded="false">' + ICON_SEARCH + '</button>' +
        '<button class="ib" id="mb" aria-label="Abrir menu" aria-expanded="false">' + ICON_MENU + '</button>' +
      '</div>' +
      '<div class="drawer" id="drawer"><div id="drawerLinks"></div><div class="row">' +
        (showSelecao ? '<a class="sel" href="#/minha-selecao">Minha Seleção</a>' : '') +
        '<a href="' + V.hub + '">Início</a><a href="https://chumbadas.com.br/" target="_blank" rel="noopener">Loja ↗</a></div></div>' +
      '<div class="panel" id="panel" hidden><div class="res" id="res" role="listbox" aria-label="Produtos encontrados"></div></div>' +
      '</div>';

    var $ = function (id) { return root.getElementById(id); };
    $('drawerLinks').innerHTML = linksHtml();

    var input = $('q'), panel = $('panel'), res = $('res');
    var drawer = $('drawer'), mb = $('mb'), sb = $('sb');
    var index = null, loading = null, matches = [], act = -1, mobileSearch = false;

    function loadIndex() {
      if (index) return Promise.resolve(index);
      if (loading) return loading;
      loading = fetch(INDEX_URL, { cache: 'no-cache' }).then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      }).then(function (d) {
        d.products.forEach(function (p) {
          p._n = norm(p.n);
          var c = d.catalogs[p.c] || {};
          p._h = norm(p.n + ' ' + (c.label || '') + ' ' + (c.aliases || '') + ' ' + (p.k || ''));
        });
        index = d;
        return d;
      }).catch(function (e) { loading = null; throw e; });
      return loading;
    }

    function score(p, tokens, raw) {
      var total = 1;
      for (var i = 0; i < tokens.length; i++) {
        var t = tokens[i];
        if (p._h.indexOf(t) === -1) return 0;
        if (p._n.indexOf(t) === 0) total += 220;
        else if (p._n.indexOf(' ' + t) !== -1) total += 120;
        else if (p._n.indexOf(t) !== -1) total += 60;
        else total += 12;
      }
      if (p._n === raw) total += 1200;
      else if (p._n.indexOf(raw) === 0) total += 500;
      else if (p._n.indexOf(raw) !== -1) total += 260;
      return Math.max(total - Math.min(p._n.length, 60) * 0.4, 0.001);
    }
    function search(q) {
      var tokens = tokenize(q);
      if (!tokens.length) return [];
      var raw = norm(q).trim(), out = [];
      index.products.forEach(function (p) { var s = score(p, tokens, raw); if (s > 0) out.push({ p: p, s: s }); });
      out.sort(function (a, b) { return b.s - a.s || a.p.n.localeCompare(b.p.n, 'pt-BR'); });
      return out.map(function (r) { return r.p; });
    }
    function hl(name, tokens) {
      var nn = norm(name), fl = new Array(name.length).fill(false);
      tokens.forEach(function (t) {
        var from = 0, at;
        while ((at = nn.indexOf(t, from)) !== -1) { for (var i = at; i < at + t.length && i < fl.length; i++) fl[i] = true; from = at + t.length; }
      });
      var h = '', o = false;
      for (var i = 0; i < name.length; i++) {
        if (fl[i] && !o) { h += '<mark>'; o = true; } else if (!fl[i] && o) { h += '</mark>'; o = false; }
        h += esc(name[i]);
      }
      return h + (o ? '</mark>' : '');
    }
    function url(p) {
      var c = index.catalogs[p.c];
      return c.url.replace(/\/$/, '') + '/' + c.path + encodeURIComponent(p.s);
    }

    function openPanel() { panel.hidden = false; input.setAttribute('aria-expanded', 'true'); }
    function closePanel() { panel.hidden = true; input.setAttribute('aria-expanded', 'false'); act = -1; }

    function render(q) {
      var tokens = tokenize(q);
      act = -1;
      if (!tokens.length) { closePanel(); return; }
      if (!index) { res.innerHTML = '<p class="ms">Carregando produtos…</p>'; openPanel(); return; }
      matches = search(q);
      if (!matches.length) {
        res.innerHTML = '<p class="ms">Nenhum produto encontrado para <b>“' + esc(q.trim()) + '”</b>.</p>' +
          '<p class="ms" style="padding-top:0">Tente outro termo (nome, modelo, peso ou SKU) ou abra um catálogo:</p>' +
          '<div class="chips">' + LABELS.map(function (l) { return '<a href="' + catHref(l[0]) + '">' + esc(l[1]) + '</a>'; }).join('') + '</div>';
        openPanel(); return;
      }
      var shown = matches.slice(0, 8);
      res.innerHTML = shown.map(function (p, i) {
        var c = index.catalogs[p.c];
        return '<a class="it" role="option" id="o' + i + '" href="' + esc(url(p)) + '">' +
          (p.i ? '<img class="th" src="' + esc(p.i) + '" alt="" loading="lazy">' : '<span class="th"></span>') +
          '<span class="tx"><span class="nm">' + hl(p.n, tokens) + '</span><span class="mt"><span class="tg">' + esc(c.label) + '</span>' +
          (p.p ? '<span class="pr">' + esc(p.p) + '</span>' : '') + '</span></span><span class="go" aria-hidden="true">→</span></a>';
      }).join('') +
        (matches.length > shown.length ? '<div class="ft">Mostrando ' + shown.length + ' de ' + matches.length + ' — refine a busca para ver os demais</div>' : '');
      openPanel();
    }

    function setAct(i) {
      var its = res.querySelectorAll('.it');
      if (!its.length) return;
      if (its[act]) { its[act].classList.remove('on'); its[act].removeAttribute('aria-selected'); }
      act = (i + its.length) % its.length;
      its[act].classList.add('on'); its[act].setAttribute('aria-selected', 'true');
      its[act].scrollIntoView({ block: 'nearest' });
      input.setAttribute('aria-activedescendant', its[act].id);
    }

    function warm() { loadIndex().then(function () { if (input.value) render(input.value); }).catch(function () {
      res.innerHTML = '<p class="ms">A busca está indisponível no momento. Use o menu para abrir o catálogo desejado.</p>'; openPanel();
    }); }
    input.addEventListener('focus', warm);
    input.addEventListener('input', function () { warm(); render(input.value); });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setAct(act + 1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setAct(act - 1); }
      else if (e.key === 'Enter') {
        var its = res.querySelectorAll('.it'), t = its[act >= 0 ? act : 0];
        if (t) { e.preventDefault(); location.href = t.href; dismissSearch(); }
      } else if (e.key === 'Escape') {
        if (!panel.hidden) { e.preventDefault(); closePanel(); } else { input.value = ''; input.blur(); }
      }
    });

    // Mobile: o mesmo campo vira uma linha própria sob a barra.
    function setMobileSearch(on) {
      mobileSearch = on;
      sb.setAttribute('aria-expanded', on);
      var sf = root.querySelector('.sf');
      if (on) {
        setDrawer(false);
        sf.style.cssText = 'display:flex;position:absolute;left:12px;right:12px;top:10px;width:auto;height:44px;background:#fff;color:#111;border-color:#ff4d00;z-index:2';
        sb.innerHTML = ICON_X; sb.setAttribute('aria-label', 'Fechar busca');
        sb.style.cssText = 'position:relative;z-index:3';
        input.focus();
      } else {
        sf.style.cssText = ''; sb.style.cssText = ''; sb.innerHTML = ICON_SEARCH; sb.setAttribute('aria-label', 'Buscar produto');
        input.value = ''; closePanel();
      }
    }
    // Escolher um resultado fecha a busca: nos catálogos de página única só o #hash muda,
    // então sem isso o painel ficava por cima do produto aberto.
    function dismissSearch() { if (mobileSearch) setMobileSearch(false); else { closePanel(); input.value = ''; } input.blur(); }
    res.addEventListener('click', function (e) { if (e.target.closest('a.it')) setTimeout(dismissSearch, 0); });
    window.addEventListener('hashchange', function () { if (!panel.hidden) dismissSearch(); });
    function setDrawer(on) {
      drawer.classList.toggle('open', on);
      mb.innerHTML = on ? ICON_X : ICON_MENU;
      mb.setAttribute('aria-expanded', on);
      mb.setAttribute('aria-label', on ? 'Fechar menu' : 'Abrir menu');
      if (on && mobileSearch) setMobileSearch(false);
    }
    sb.addEventListener('click', function () { setMobileSearch(!mobileSearch); });
    mb.addEventListener('click', function () { setDrawer(!drawer.classList.contains('open')); });
    drawer.addEventListener('click', function (e) { if (e.target.closest('a')) setDrawer(false); });
    window.addEventListener('resize', function () { if (innerWidth > 960) { setDrawer(false); if (mobileSearch) setMobileSearch(false); } });

    document.addEventListener('click', function (e) {
      if (e.composedPath().indexOf(host) === -1) { closePanel(); if (drawer.classList.contains('open')) setDrawer(false); }
    });
    document.addEventListener('keydown', function (e) {
      var t = e.target, tag = t && t.tagName;
      if (e.key === '/' && !e.ctrlKey && !e.metaKey && tag !== 'INPUT' && tag !== 'TEXTAREA' && !(t && t.isContentEditable)) {
        e.preventDefault();
        if (innerWidth > 960) input.focus(); else setMobileSearch(true);
      }
    });

    // ?q= na URL do hub abre a busca já preenchida (ex.: atalhos de campanha).
    var m = /[?&]q=([^&#]*)/.exec(location.search);
    if (m && isHub) { input.value = decodeURIComponent(m[1].replace(/\+/g, ' ')); warm(); }

    return host;
  }

  function mount() {
    var host = build();
    document.body.insertBefore(host, document.body.firstChild);
    document.documentElement.classList.add('chn-on');
    window.dispatchEvent(new CustomEvent('chn:ready', { detail: { host: host } }));
    // Qualquer página pode pedir foco na busca: window.dispatchEvent(new Event('chn:focus-search'))
    window.addEventListener('chn:focus-search', function () {
      var i = host.shadowRoot.getElementById('q');
      if (innerWidth > 960) i.focus(); else host.shadowRoot.getElementById('sb').click();
    });
  }
  // Monta no DOMContentLoaded (depois de qualquer banner promocional, que se insere antes)
  // para o menu ficar sempre no topo da página.
  if (document.readyState === 'complete') mount();
  else document.addEventListener('DOMContentLoaded', mount);
})();
