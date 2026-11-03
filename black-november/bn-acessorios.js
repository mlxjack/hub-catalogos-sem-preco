/* Black November 2026 - regras dos catalogos de ACESSORIOS (planilha "Conferencia ... x Black November").
 * 30% OFF nas cores/variacoes pintadas na planilha. Fora da janela (ou sem ?bn=1) nao faz nada.
 *   on      cores do seletor (swatches) que entram na promo
 *   onVars  variacoes (botoes de "Opcoes") que entram na promo, quando nao ha cor
 *   onlyVars se informado, o desconto das cores so vale nessas variacoes
 *   off     cores/opcoes da promo que NAO existem no catalogo (aparecem como chips clicaveis)
 *   label   nome do campo no texto do pedido (padrao: Cor)
 */
(function () {
  var PCT = 30;
  var RULES = {
    'agulha-de-tarrafa': { on: ['Branco'] },
    'carretel-para-chicotes': { off: ['Cinza', 'Cristal', 'Rosa', 'Verde', 'Vermelha', 'Roxo'] },
    'copo-para-carretel-g': { on: ['Amarelo', 'Laranja', 'Roxo', 'Rosa', 'Cinza'], off: ['Vermelha', 'Azul Bic'] },
    'snap-universal-cobreno-g': { on: ['Rosa', 'Marrom', 'Preto', 'Azul Bic', 'Cinza'] },
    'cobreno-p-m-e-g': { on: ['Rosa', 'Marrom', 'Preto', 'Azul Bic', 'Cinza'] },
    'micro-snap-cobre-no-m': { on: ['Rosa', 'Marrom', 'Preto', 'Azul Bic', 'Cinza'] },
    'elastricot-150m': { off: ['Extra Fino 100m', 'Fino 100m'], label: 'Opção' },
    'iscador-duplo-branco-ou-cristal': { off: ['Branco'] },
    'kit-enrolador': { onVars: ['Roxo Metálico'], off: ['Laranja Metálico'] },
    'kit-suporte-carretilha-e-molinete-individual': { on: ['Azul', 'Amarelo', 'Branco', 'Cinza', 'Laranja', 'Rosa', 'Verde', 'Vermelho'], off: ['Roxo'] },
    'micanga-de-vidro': { on: ['Verde', 'Marrom', 'Camaleão', 'Rosa', 'Areia'] },
    'nano-pipe-borracha': { on: ['Amarelo', 'Branco', 'Cinza', 'Laranja', 'Rosa', 'Roxo', 'Verde', 'Vermelho'], off: ['Azul'] },
    'porta-elastricot': { on: ['Amarelo', 'Branco', 'Rosa', 'Verde', 'Vermelho', 'Translúcido'] },
    'porta-pernada-compacto': { on: ['Cinza', 'Violeta'] },
    'porta-pernada-e-chicote': { on: ['Branco', 'Areia', 'Rosa'], off: ['Azul'] },
    'suporte-de-vara-slim': { on: ['Azul', 'Laranja', 'Amarelo', 'Branco', 'Cinza', 'Rosa', 'Roxo', 'Verde', 'Vermelho'] },
    'suporte-para-molinetes': { on: ['Azul'] },
    'tela-de-espremer-iscas': { on: ['Amarela', 'Verde', 'Vermelha'] },
    'suporte-de-vara-premium-completo': { on: ['Branco'], onlyVars: ['Somente copo', 'Somente ferradura'] }
  };

  function norm(s) {
    return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
  }
  function has(list, v) {
    var n = norm(v);
    return !!list && list.some(function (x) { return norm(x) === n; });
  }
  function active() { return window.BLACK_NOVEMBER_ACTIVE === true; }
  function rule(p) { return active() && p ? RULES[p.slug] || null : null; }

  // 0 ou 30
  function pct(p, color, varName) {
    var r = rule(p);
    if (!r) return 0;
    if (r.onVars && has(r.onVars, varName)) return PCT;
    if (r.on && has(r.on, color)) {
      if (r.onlyVars && !has(r.onlyVars, varName)) return 0;
      return PCT;
    }
    return 0;
  }

  function brl(n) { return 'R$ ' + n.toFixed(2).replace('.', ','); }
  // troca o 1o valor "R$ 12,90" do texto pelo valor com desconto
  function discounted(priceText) {
    var m = String(priceText || '').match(/R\$\s*(\d[\d.]*(?:,\d+)?)/);
    if (!m) return null;
    var n = parseFloat(m[1].replace(/\./g, '').replace(',', '.'));
    if (!isFinite(n) || n <= 0) return null;
    return String(priceText).replace(m[0], brl(Math.round(n * (100 - PCT)) / 100));
  }

  var offState = {}; // id do produto -> nome escolhido entre as cores fora de padrao

  window.BN_ACC = {
    rule: rule,
    pct: pct,
    // selo "-30%" no card da listagem
    ribbon: function (p) {
      var r = rule(p);
      return r ? '<span class="bn-ribbon">até -' + PCT + '%</span>' : '';
    },
    // cor/opcao fora de padrao escolhida (ou '')
    offName: function (p) { return (rule(p) && offState[p.id]) || ''; },
    offLabel: function (p) {
      var n = this.offName(p);
      return n ? n + ' (Black November -' + PCT + '%)' : '';
    },
    fieldLabel: function (p) { var r = rule(p); return (r && r.label) || 'Cor'; },
    afterDetail: function (p) {
      var r = rule(p);
      if (!r) return;
      offState[p.id] = '';
      var showPrices = window.CONFIG && window.CONFIG.showPrices;
      var colors = document.getElementById('section-colors');
      var vars = document.getElementById('section-vars');
      var priceEl = document.getElementById('detail-price-display');
      var wa = document.getElementById('btn-order-whatsapp');

      function curVarName() {
        var i = state.selectedVariation[p.id];
        return p.vars && p.vars[i] ? p.vars[i][0] : '';
      }
      function curPriceText() {
        var i = state.selectedVariation[p.id];
        return (p.vars && p.vars[i] && p.vars[i][1]) || p.price || '';
      }

      // selos nas cores e nas variacoes (dependem da variacao ativa)
      function refresh() {
        var off = offState[p.id];
        var v = curVarName();
        var effective = 0;
        if (colors) {
          colors.querySelectorAll('.swatch-btn').forEach(function (b) {
            var c = b.dataset.colorName;
            var d = pct(p, c, v);
            b.classList.toggle('bn-swatch-promo', d > 0);
            var tag = b.querySelector('.bn-swatch-tag');
            if (d > 0 && !tag) {
              tag = document.createElement('span'); tag.className = 'bn-swatch-tag';
              tag.textContent = '-' + d + '%'; b.appendChild(tag);
            } else if (d === 0 && tag) tag.remove();
            if (off) { b.classList.remove('active'); b.setAttribute('aria-checked', 'false'); }
            else if (b.classList.contains('active')) effective = d;
          });
        }
        if (vars) {
          vars.querySelectorAll('.var-btn').forEach(function (b, i) {
            var name = p.vars[i][0];
            var d = pct(p, (state.selectedColor[p.id] || ''), name);
            var onlyVar = r.onVars && has(r.onVars, name);
            var on = onlyVar || (d > 0 && !colors);
            b.classList.toggle('bn-var-promo', !!on);
            var tag = b.querySelector('.bn-var-tag');
            if (on && !tag) {
              tag = document.createElement('span'); tag.className = 'bn-var-tag';
              tag.textContent = '-' + PCT + '%'; b.appendChild(tag);
            } else if (!on && tag) tag.remove();
            if (b.classList.contains('active') && on) effective = PCT;
          });
        }
        if (off) effective = PCT;
        if (!colors && !vars && r.on) effective = 0;
        var lbl = document.getElementById('selected-color-label');
        if (off && colors && lbl) lbl.textContent = off + ' (fora de padrão)';
        document.querySelectorAll('.bn-offpattern-chip').forEach(function (c) {
          c.classList.toggle('active', c.dataset.off === off);
          c.setAttribute('aria-pressed', c.dataset.off === off ? 'true' : 'false');
        });
        // preco com desconto (so no catalogo com precos)
        if (showPrices && priceEl) {
          var base = curPriceText();
          var disc = effective ? discounted(base) : null;
          if (disc) {
            priceEl.innerHTML = '<s class="bn-old-price"></s> <span class="bn-new-price"></span>';
            priceEl.querySelector('.bn-old-price').textContent = base;
            priceEl.querySelector('.bn-new-price').textContent = disc;
            priceEl.classList.add('bn-promo-price');
          } else {
            priceEl.classList.remove('bn-promo-price');
            if (priceEl.querySelector('.bn-old-price')) priceEl.textContent = base || 'Sob Consulta';
          }
        }
      }

      // escolher um swatch normal desfaz a cor fora de padrao (antes do handler do app.js)
      if (colors) colors.addEventListener('click', function (e) {
        if (e.target.closest('.swatch-btn')) offState[p.id] = '';
      }, true);
      [colors, vars].forEach(function (s) {
        if (s) s.addEventListener('click', function () { refresh(); });
      });

      // bloco "fora de padrao": chips clicaveis
      if (r.off && r.off.length) {
        var lab = (r.label === 'Opção') ? 'opções' : 'cores';
        var box = document.createElement('div');
        box.className = 'info-section bn-offpattern';
        box.innerHTML = '<h2 class="info-section-title">Black November — ' + lab + ' fora de padrão <span class="bn-offpattern-pct">-' + PCT + '%</span></h2>' +
          '<div class="bn-offpattern-chips"></div>' +
          '<p class="bn-offpattern-note">' + (showPrices ? 'Preço com ' + PCT + '% de desconto nessas ' + lab + '. ' : '') +
          'Disponibilidade limitada ao estoque — confirme pelo WhatsApp.</p>';
        var chips = box.querySelector('.bn-offpattern-chips');
        r.off.forEach(function (name) {
          var b = document.createElement('button');
          b.type = 'button'; b.className = 'bn-offpattern-chip'; b.dataset.off = name;
          b.setAttribute('aria-pressed', 'false'); b.title = name + ' — ' + PCT + '% OFF';
          b.textContent = name;
          b.addEventListener('click', function () {
            offState[p.id] = offState[p.id] === name ? '' : name;
            if (!offState[p.id] && colors) {
              // volta a destacar a cor ativa do seletor
              colors.querySelectorAll('.swatch-btn').forEach(function (s) {
                var on = s.dataset.colorName === state.selectedColor[p.id];
                s.classList.toggle('active', on); s.setAttribute('aria-checked', on ? 'true' : 'false');
              });
              var lbl = document.getElementById('selected-color-label');
              if (lbl) lbl.textContent = state.selectedColor[p.id];
            }
            refresh();
            if (wa) {
              var cfg = window.CONFIG;
              var o = offState[p.id];
              var msg = cfg.whatsappMessageTemplate
                .replace('{productName}', p.name).replace('{category}', p.category)
                .replace('{variation}', curVarName() || 'Nenhum')
                .replace('{color}', o ? window.BN_ACC.offLabel(p) : (state.selectedColor[p.id] || 'Nenhum'));
              var url = 'https://wa.me/' + cfg.whatsappNumber + '?text=' + encodeURIComponent(msg);
              wa.onclick = function () { window.open(url, '_blank', 'noopener'); };
            }
          });
          chips.appendChild(b);
        });
        var anchor = vars || colors;
        var host = document.querySelector('.selecao-add-row');
        if (host && host.parentNode) host.parentNode.insertBefore(box, host);
        else if (anchor) anchor.after(box);
      }
      refresh();
    }
  };
})();
