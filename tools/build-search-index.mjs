/**
 * Gera o search-index.json usado pela busca global do hub.
 *
 * Roda a partir do repo do hub e lê os catálogos clonados como pastas irmãs:
 *
 *   node tools/build-search-index.mjs
 *
 * A variante (com/sem preço) é inferida do CNAME do próprio hub, então o mesmo
 * script serve aos dois hubs sem configuração.
 *
 * Para os catálogos React (Anzóis e Iscas) o script NÃO reimplementa o parsing:
 * ele carrega o `src/utils/csvParser.js` do próprio catálogo e apenas troca a
 * leitura via HTTP por leitura local. Isso importa porque o parser de Anzóis
 * mescla jig heads por modelo e deriva o id com slugify(modelTitle) — usar o
 * Handle cru do CSV geraria links que não resolvem.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HUB_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ROOT = resolve(HUB_DIR, '..');

// ---------------------------------------------------------------- configuração

const CATALOGS = {
  'sem-preco': {
    anzois: {
      label: 'Anzóis & Jig Heads', dir: 'catalogo-de-anzois-e-jigs-v2',
      url: 'https://anzois.chumbada.com.br/', path: '#/product/', kind: 'csv',
    },
    iscas: {
      label: 'Iscas', dir: 'catalogo-de-isca-v2-sem-preco',
      url: 'https://iscas.chumbada.com.br/', path: '#/product/', kind: 'csv',
    },
    acessorios: {
      label: 'Acessórios', dir: 'catalogo-de-acessorios-v2',
      url: 'https://acessorios.chumbada.com.br/', path: '#/produto/', kind: 'datajs',
    },
    chumbadas: {
      label: 'Chumbadas & Jig Heads', dir: 'catalogo-de-chumbadas-e-jig-heads',
      url: 'https://chumbadas.chumbada.com.br/', path: '#/produto/', kind: 'inline-chumbadas',
    },
    oculos: {
      label: 'Óculos', dir: 'oculos-chumbada-sem-preco',
      url: 'https://oculos.chumbada.com.br/', path: '#/produto/', kind: 'inline-oculos',
    },
  },
  'com-preco': {
    anzois: {
      label: 'Anzóis & Jig Heads', dir: 'catalogo-de-anzois-e-jigs-com-preco-v2',
      url: 'https://precosdosanzois.chumbada.com.br/', path: '#/product/', kind: 'csv',
    },
    iscas: {
      label: 'Iscas', dir: 'catalogo-iscas-v2',
      url: 'https://precodasiscas.chumbada.com.br/', path: '#/product/', kind: 'csv',
    },
    acessorios: {
      label: 'Acessórios', dir: 'catalogo-acessorios-precos-chumbada',
      url: 'https://precodosacessorios.chumbada.com.br/', path: '#/produto/', kind: 'datajs',
    },
    chumbadas: {
      label: 'Chumbadas & Jig Heads', dir: 'catalogo-de-chumbadas-e-jig-heads-com-preco',
      url: 'https://precodaschumbadas.chumbada.com.br/', path: '#/produto/', kind: 'inline-chumbadas',
    },
    oculos: {
      label: 'Óculos', dir: 'oculos-chumbada-oficial',
      url: 'https://precodosoculos.chumbada.com.br/', path: '#/produto/', kind: 'inline-oculos',
    },
  },
};

/**
 * Termos que as pessoas digitam mas que não aparecem no nome dos produtos
 * (ex.: "polarizado" não está em "Oculos Solar Quadrado"). Ficam na meta do
 * catálogo — não em cada produto — para não inflar o índice.
 */
const CATALOG_ALIASES = {
  anzois: 'anzol anzois anzóis jig head jighead quimipoint premium ewg offset mola',
  iscas: 'isca iscas soft baits shad grub camarao camarão minhoca lambari artificial',
  acessorios: 'acessorio acessorios acessório acessórios suporte snap girador rotor chicote alicate',
  chumbadas: 'chumbada chumbadas peso pesos lastro jig head jighead olhal poita',
  oculos: 'oculos óculos oculós polarizado polarizados polarizada sol solar lente lentes armacao armação uv protecao proteção',
};

function detectVariant() {
  const cnamePath = join(HUB_DIR, 'CNAME');
  const cname = existsSync(cnamePath) ? readFileSync(cnamePath, 'utf8').trim() : '';
  if (cname.includes('catalogosdeprecos')) return 'com-preco';
  if (cname.startsWith('catalogos.')) return 'sem-preco';
  throw new Error(`Não foi possível inferir a variante pelo CNAME ("${cname}"). Esperado catalogos.* ou catalogosdeprecos.*`);
}

// -------------------------------------------------------------------- utilidades

/** Parser CSV (RFC4180): campos entre aspas podem conter vírgulas e quebras de linha. */
function parseCSV(text) {
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1); // BOM
  const rows = [];
  let row = [], field = '', quoted = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else quoted = false;
      } else field += ch;
      continue;
    }
    if (ch === '"') { quoted = true; continue; }
    if (ch === ',') { row.push(field); field = ''; continue; }
    if (ch === '\r') continue;
    if (ch === '\n') { row.push(field); rows.push(row); row = []; field = ''; continue; }
    field += ch;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }

  const header = rows.shift() || [];
  return rows
    .filter((r) => r.some((c) => c !== ''))
    .map((r) => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ''])));
}

/** Extrai um literal de array JS/JSON atribuído a uma variável, equilibrando colchetes. */
function extractArrayLiteral(src, declRegex) {
  const m = src.match(declRegex);
  if (!m) throw new Error(`Declaração não encontrada: ${declRegex}`);
  const start = src.indexOf('[', m.index);
  let depth = 0, quoted = false, esc = false;
  for (let i = start; i < src.length; i++) {
    const ch = src[i];
    if (esc) { esc = false; continue; }
    if (ch === '\\') { esc = true; continue; }
    if (quoted) { if (ch === '"') quoted = false; continue; }
    if (ch === '"') { quoted = true; continue; }
    if (ch === '[') depth++;
    else if (ch === ']' && --depth === 0) {
      const raw = src.slice(start, i + 1);
      return JSON.parse(raw.replace(/,(\s*[\]}])/g, '$1')); // tolera vírgula sobrando
    }
  }
  throw new Error('Array literal não fechado');
}

const numOrNull = (n) => (Number.isFinite(n) ? n : null);

/** "5.98" | 5.98 | "R$ 5,98" -> 5.98 */
function toNumber(val) {
  if (val == null || val === '') return null;
  if (typeof val === 'number') return numOrNull(val);
  let s = String(val).replace(/R\$/g, '').trim();
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.'); // 1.234,56
  return numOrNull(parseFloat(s));
}

const fmtBRL = (n) => (n == null ? '' : 'R$ ' + n.toFixed(2).replace('.', ','));

/** Formata min/max como faixa quando divergem. */
function priceLabel(min, max) {
  if (min == null) return '';
  if (max == null || max === min) return fmtBRL(min);
  return `${fmtBRL(min)} – ${fmtBRL(max)}`;
}

/** Resolve imagens relativas contra o domínio do catálogo. */
function absoluteImage(img, baseUrl) {
  if (!img) return '';
  if (/^https?:\/\//i.test(img)) return img;
  return baseUrl.replace(/\/$/, '') + '/' + String(img).replace(/^\.?\//, '');
}

const stripTags = (html) => String(html || '').replace(/<[^>]*>/g, ' ').replace(/&[a-z]+;/gi, ' ');
const squish = (s) => String(s || '').replace(/\s+/g, ' ').trim();

// ------------------------------------------------------------------- extratores

/**
 * Carrega o csvParser.js do próprio catálogo, trocando apenas a fonte de dados.
 * Assim a lógica de id/merge/categoria fica idêntica à do catálogo em produção.
 */
async function loadViaCatalogParser(catalogDir) {
  const parserPath = join(catalogDir, 'src', 'utils', 'csvParser.js');
  const csvPath = join(catalogDir, 'public', 'products.csv');
  if (!existsSync(parserPath)) throw new Error(`csvParser.js não encontrado em ${parserPath}`);
  if (!existsSync(csvPath)) throw new Error(`products.csv não encontrado em ${csvPath}`);

  const rows = parseCSV(readFileSync(csvPath, 'utf8'));
  let code = readFileSync(parserPath, 'utf8');

  // Papa.parse baixaria o CSV por HTTP; aqui entregamos as linhas já parseadas.
  if (!code.includes("import Papa from 'papaparse';")) {
    throw new Error(`${parserPath}: import do papaparse não encontrado — parser mudou, ajuste o shim.`);
  }
  code = code.replace(
    "import Papa from 'papaparse';",
    'const Papa = { parse: (_src, opts) => { try { opts.complete({ data: __ROWS__ }); } catch (e) { opts.error ? opts.error(e) : (() => { throw e; })(); } } };',
  );
  // import.meta.env não existe no Node; o caminho não é usado pelo shim.
  code = code.replace(/import\.meta\.env\.BASE_URL/g, "''");
  code = `const __ROWS__ = ${JSON.stringify(rows)};\n` + code;

  // Escrito dentro do repo do catálogo para que imports relativos continuem válidos.
  const tmp = join(catalogDir, `.search-index-parser.${process.pid}.mjs`);
  try {
    writeFileSync(tmp, code, 'utf8');
    const mod = await import(pathToFileURL(tmp).href);
    return await mod.loadProducts();
  } finally {
    rmSync(tmp, { force: true });
  }
}

async function fromCSV(cfg, catalogDir) {
  const products = await loadViaCatalogParser(catalogDir);
  return products.map((p) => {
    const min = toNumber(p.minPrice);
    const max = toNumber(p.maxPrice);
    // Valores de opção (cores, tamanhos, pesos) entram nas keywords: é comum
    // buscar isca pela cor ("glow", "capim rubi") ou jig head pelo peso.
    const optionValues = Object.values(p.options || {}).flat().join(' ');
    return {
      slug: p.id,
      name: squish(p.title),
      image: absoluteImage((p.images || [])[0], cfg.url),
      price: priceLabel(min, max),
      keywords: squish([
        p.category,
        (p.tags || []).join(' '),
        optionValues,
        (p.variants || []).map((v) => v.sku).join(' '),
      ].join(' ')),
    };
  });
}

function fromDataJs(cfg, catalogDir) {
  const file = join(catalogDir, 'assets', 'js', 'data.js');
  const code = readFileSync(file, 'utf8');
  const win = {};
  new Function('window', code + '\n;return window;')(win);
  const list = win.PRODUCTS || [];
  if (!list.length) throw new Error(`${file}: window.PRODUCTS vazio`);

  return list.map((p) => ({
    slug: p.slug,
    name: squish(p.name),
    image: absoluteImage(p.img, cfg.url),
    price: p.price ? squish(String(p.price)) : '',
    keywords: squish([p.category, (p.swatches || []).map((s) => s[0]).join(' '), stripTags(p.description).slice(0, 160)].join(' ')),
  }));
}

function fromChumbadas(cfg, catalogDir) {
  const src = readFileSync(join(catalogDir, 'index.html'), 'utf8');
  const list = extractArrayLiteral(src, /const\s+PRODUCTS\s*=/);

  return list.map((p) => {
    const prices = (p.variants || []).map((v) => toNumber(v.price)).filter((n) => n != null);
    return {
      slug: p.handle,
      name: squish(p.title),
      image: absoluteImage(p.image, cfg.url),
      price: prices.length ? priceLabel(Math.min(...prices), Math.max(...prices)) : '',
      keywords: squish([p.category, (p.weights || []).join(' '), (p.hooks || []).join(' '), p.tags || ''].join(' ')),
    };
  });
}

/**
 * Vários óculos compartilham título e modelo, diferindo só pela cor — sem isso
 * a busca mostraria linhas idênticas. Extrai um rótulo curto de armação/lente.
 */
function oculosVariantLabel(color) {
  const s = String(color || '');
  // Cobre "Cor da Armação: X", "com Armação: X" e "- Cor: X"
  const armacao = s.match(/Arma[çc][ãa]o:\s*([^;]+)/i) || s.match(/(?:^|[-;])\s*Cor:\s*([^;]+)/i);
  const lente = s.match(/Cor da Lente:\s*([^;]+)/i);
  const parts = [];
  if (armacao) parts.push(`Armação ${squish(armacao[1])}`);
  if (lente) parts.push(`Lente ${squish(lente[1])}`);
  return parts.length ? parts.join(' / ') : squish(s).slice(0, 48);
}

function fromOculos(cfg, catalogDir) {
  const src = readFileSync(join(catalogDir, 'index.html'), 'utf8');
  const list = extractArrayLiteral(src, /const\s+produtos\s*=/);

  const items = list
    .filter((p) => p.sku)
    .map((p) => {
      const label = oculosVariantLabel(p.color);
      return {
        slug: p.sku,
        name: squish(`${p.title} ${p.model}${label ? ` — ${label}` : ''}`),
        image: absoluteImage(p.img, cfg.url),
        price: p.price ? fmtBRL(toNumber(p.price)) : '',
        keywords: squish([p.model, p.color, p.sku, p.tag].join(' ')),
      };
    });

  // Rede de segurança: se dois óculos ainda colidirem, o SKU desempata.
  const counts = new Map();
  items.forEach((it) => counts.set(it.name, (counts.get(it.name) || 0) + 1));
  items.forEach((it) => {
    if (counts.get(it.name) > 1) it.name += ` (${it.slug})`;
  });

  return items;
}

const EXTRACTORS = {
  csv: fromCSV,
  datajs: fromDataJs,
  'inline-chumbadas': fromChumbadas,
  'inline-oculos': fromOculos,
};

// ------------------------------------------------------------------------ main

const variant = detectVariant();
const showPrices = variant === 'com-preco';
const catalogs = CATALOGS[variant];

console.log(`Hub: ${HUB_DIR}`);
console.log(`Variante: ${variant} (preços ${showPrices ? 'visíveis' : 'ocultos'})\n`);

const products = [];
const meta = {};
let failures = 0;

for (const [key, cfg] of Object.entries(catalogs)) {
  const catalogDir = join(ROOT, cfg.dir);
  meta[key] = { label: cfg.label, url: cfg.url, path: cfg.path, aliases: CATALOG_ALIASES[key] || '' };

  if (!existsSync(catalogDir)) {
    console.error(`  ✗ ${key.padEnd(11)} pasta ausente: ${cfg.dir}`);
    failures++;
    continue;
  }

  try {
    const items = await EXTRACTORS[cfg.kind](cfg, catalogDir);
    const seen = new Set();
    let added = 0, skipped = 0;

    for (const it of items) {
      if (!it.slug || !it.name) { skipped++; continue; }
      if (seen.has(it.slug)) { skipped++; continue; }
      seen.add(it.slug);
      const entry = { c: key, s: it.slug, n: it.name };
      if (it.image) entry.i = it.image;
      if (showPrices && it.price) entry.p = it.price;
      if (it.keywords) entry.k = it.keywords.slice(0, 320);
      products.push(entry);
      added++;
    }

    const noImage = items.filter((i) => !i.image).length;
    const notes = [skipped ? `${skipped} ignorados` : '', noImage ? `${noImage} sem imagem` : '']
      .filter(Boolean).join(', ');
    console.log(`  ✓ ${key.padEnd(11)} ${String(added).padStart(4)} produtos${notes ? `  (${notes})` : ''}`);
  } catch (err) {
    console.error(`  ✗ ${key.padEnd(11)} ${err.message}`);
    failures++;
  }
}

if (failures) {
  console.error(`\nAbortado: ${failures} catálogo(s) falharam. O índice NÃO foi escrito.`);
  process.exit(1);
}

products.sort((a, b) => a.n.localeCompare(b.n, 'pt-BR'));

const out = {
  generatedAt: new Date().toISOString().slice(0, 10),
  variant,
  showPrices,
  catalogs: meta,
  products,
};

const outPath = join(HUB_DIR, 'search-index.json');
writeFileSync(outPath, JSON.stringify(out), 'utf8');

const kb = (readFileSync(outPath).length / 1024).toFixed(1);
console.log(`\n${products.length} produtos → search-index.json (${kb} KB)`);
