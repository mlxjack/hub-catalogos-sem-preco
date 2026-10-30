/* Black November 2026 - Chumbada Oficial
 * Ativa sozinho de 01/11/2026 00:00 a 30/11/2026 23:59:59 (horario de Brasilia).
 * Fora da janela nao faz nada. Para pre-visualizar: abrir a pagina com ?bn=1
 * (ou window.BN_FORCE = true). Nao depende de nenhum framework. */
(function () {
  var START = Date.UTC(2026, 10, 1, 3, 0, 0);      // 01/11/2026 00:00 BRT
  var END = Date.UTC(2026, 11, 1, 3, 0, 0) - 1000; // 30/11/2026 23:59:59 BRT
  var forced = /[?&]bn=1(&|$|#)/.test(location.search + location.hash) || window.BN_FORCE === true;
  var now = Date.now();
  window.BLACK_NOVEMBER_ACTIVE = forced || (now >= START && now <= END);
  if (!window.BLACK_NOVEMBER_ACTIVE) return;

  var base = (function () {
    var s = document.currentScript;
    return s && s.src ? s.src.replace(/bn\.js(\?.*)?$/, '') : './black-november/';
  })();

  var root = document.documentElement;
  root.classList.add('bn');

  if (!document.querySelector('link[data-bn]')) {
    var l = document.createElement('link');
    l.rel = 'stylesheet'; l.href = base + 'bn.css'; l.setAttribute('data-bn', '');
    document.head.appendChild(l);
  }

  var SLIDES = [
    { src: 'banner-desconto-30.webp', alt: 'Black November: 30% de desconto nos produtos com cores fora de padrao e inativas' },
    { src: 'banner-frete-gratis.webp', alt: 'Black November: frete gratis nas compras acima de R$ 3.000 e precos especiais no atacado' },
    { src: 'banner-desconto-12.webp', alt: 'Black November: 12% de desconto nas iscas Vermelho Holografico, Veu da Noite, Pastel e Preto Brilhante' }
  ];

  function isHome() {
    // SPAs com HashRouter: home = '', '#', '#/' (com ou sem ?query). Produto fica sem banner.
    if (/\/produtos?\//.test(location.pathname)) return false; // paginas de produto prerenderizadas
    var p = location.hash.replace(/^#/, '').split('?')[0];
    return p === '' || p === '/';
  }

  var el = null, timer = null, idx = 0;

  function go(n) {
    idx = (n + SLIDES.length) % SLIDES.length;
    var imgs = el.querySelectorAll('.bn-slide'), dots = el.querySelectorAll('.bn-dot');
    for (var i = 0; i < imgs.length; i++) {
      imgs[i].classList.toggle('on', i === idx);
      dots[i].classList.toggle('on', i === idx);
      dots[i].setAttribute('aria-current', i === idx ? 'true' : 'false');
    }
  }
  function play() { stop(); timer = setInterval(function () { go(idx + 1); }, 5500); }
  function stop() { if (timer) { clearInterval(timer); timer = null; } }

  function build() {
    var s = document.createElement('section');
    s.className = 'bn-banner';
    s.setAttribute('aria-label', 'Black November');
    var h = '<div class="bn-stage">';
    SLIDES.forEach(function (sl, i) {
      h += '<img class="bn-slide' + (i === 0 ? ' on' : '') + '" src="' + base + sl.src + '" alt="' + sl.alt + '"' +
        ' draggable="false">';
    });
    h += '<button type="button" class="bn-nav bn-prev" aria-label="Banner anterior">&#8249;</button>' +
      '<button type="button" class="bn-nav bn-next" aria-label="Proximo banner">&#8250;</button></div>' +
      '<div class="bn-dots">';
    SLIDES.forEach(function (_, i) {
      h += '<button type="button" class="bn-dot' + (i === 0 ? ' on' : '') + '" aria-label="Banner ' + (i + 1) + '"></button>';
    });
    h += '</div>' +
      '<p class="bn-rules"><b>Black November</b> &middot; 01 a 30/11 &middot; ' +
      '<span><b>30% OFF</b> em cores fora de padr&atilde;o e inativas</span> &middot; ' +
      '<span><b>12% OFF</b> em iscas Vermelho Hologr&aacute;fico, V&eacute;u da Noite, Pastel e Preto Brilhante</span> &middot; ' +
      '<span><b>Frete gr&aacute;tis</b> acima de R$&nbsp;3.000</span> &middot; ' +
      '<span><b>Atacado</b> com pre&ccedil;os especiais</span> &middot; conforme disponibilidade</p>';
    s.innerHTML = h;
    s.querySelector('.bn-prev').onclick = function () { go(idx - 1); play(); };
    s.querySelector('.bn-next').onclick = function () { go(idx + 1); play(); };
    var dots = s.querySelectorAll('.bn-dot');
    for (var i = 0; i < dots.length; i++) (function (n) { dots[n].onclick = function () { go(n); play(); }; })(i);
    s.addEventListener('mouseenter', stop);
    s.addEventListener('mouseleave', play);
    var x0 = null, st = s.querySelector('.bn-stage');
    st.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
    st.addEventListener('touchend', function (e) {
      if (x0 === null) return;
      var d = e.changedTouches[0].clientX - x0; x0 = null;
      if (Math.abs(d) > 40) { go(idx + (d < 0 ? 1 : -1)); play(); }
    }, { passive: true });
    return s;
  }

  function sync() {
    var want = isHome();
    if (want && !el) {
      el = build();
      document.body.insertBefore(el, document.body.firstChild);
      idx = 0; play();
    } else if (!want && el) {
      stop(); el.remove(); el = null;
    }
  }

  function init() {
    sync();
    window.addEventListener('hashchange', sync);
  }
  if (document.body) init(); else document.addEventListener('DOMContentLoaded', init);
})();
