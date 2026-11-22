/* ═══════════════════════════════════════════════════════════════
   The FooD-ToX-MaP — app.js
   ═══════════════════════════════════════════════════════════════ */

/* ── Field indices in REC ────────────────────────────────────── */
const F = { t:0, j:1, y:2, k:3, cat:4, pmid:5, abs:6, tox:7, org:8, hlt:9, prd:10, ing:11, country:12 };

/* ── Category colours ────────────────────────────────────────── */
const CAT_COLORS = {
  'Major Toxicants':             '#064e3b',
  'Processing Toxicants':        '#ea580c',
  'Microbial Toxicants':         '#16a34a',
  'Food Matrices':               '#475569',
  'Exposure & Toxicity':         '#0d9488',
  'Food Chemicals':              '#d97706',
  'Lab Methods':                 '#15803d',
  'Environmental Contamination': '#64748b',
  'Microplastics':               '#047857',
};
const CAT_COLOR_ARR = Object.values(CAT_COLORS);
const CHART_COLORS = ['#064e3b','#ea580c','#16a34a','#0d9488','#d97706','#475569','#15803d','#047857','#64748b','#334155'];
const gc = '#e2ebe6';
const tc = '#3f524b';

/* ── State ───────────────────────────────────────────────────── */
const ACTIVE = { cat: new Set(), tox: new Set(), org: new Set(), hlt: new Set(), prd: new Set(), ing: new Set(), country: new Set() };
let filtered = [];
let PAGE = 1;
let PER_PAGE = 30;
let filterTimer = null;
let charts = {};
let sidebarVisible = true;

/* ── DIM → metadata array map ────────────────────────────────── */
const DIM_META = { cat: 'cats', tox: 'tox', org: 'org', hlt: 'hlt', prd: 'prd', ing: 'ing', country: 'countries' };

/* ── Accessor helpers ────────────────────────────────────────── */
const g    = (r, f) => r[F[f]];
const getJ   = r => META.journals[g(r,'j')] || '';
const getTox = r => (g(r,'tox')||[]).map(i => META.tox[i]).filter(Boolean);
const getOrg = r => (g(r,'org')||[]).map(i => META.org[i]).filter(Boolean);
const getHlt = r => (g(r,'hlt')||[]).map(i => META.hlt[i]).filter(Boolean);
const getPrd = r => (g(r,'prd')||[]).map(i => META.prd[i]).filter(Boolean);
const getIng = r => (g(r,'ing')||[]).map(i => META.ing[i]).filter(Boolean);
const getCat = r => META.cats[g(r,'cat')] || '';
const getCtr = r => META.countries[g(r,'country')] || 'Other';

/* ── Initialise pills ────────────────────────────────────────── */
function buildAllPills() {
  buildPills('catPills',     META.cats,      'cat',     'pill-cat');
  buildPills('toxPills',     META.tox,       'tox',     'pill-tox');
  buildPills('orgPills',     META.org,       'org',     'pill-org');
  buildPills('hltPills',     META.hlt,       'hlt',     'pill-hlt');
  buildPills('prdPills',     META.prd,       'prd',     'pill-prd');
  buildPills('ingPills',     META.ing,       'ing',     'pill-ing');
  buildPills('countryPills', META.countries, 'country', 'pill-country');
}

function buildPills(containerId, items, dim, cls) {
  const c = document.getElementById(containerId);
  c.innerHTML = items.map(item =>
    `<div class="pill ${cls}" data-dim="${dim}" data-val="${escHtml(item)}" onclick="togglePill(this)">${escHtml(item)}</div>`
  ).join('');
}

function filterPills(dim) {
  const id    = dim === 'tox' ? 'toxSearch' : 'prdSearch';
  const q     = document.getElementById(id).value.toLowerCase();
  const pillId = dim === 'tox' ? 'toxPills' : 'prdPills';
  document.querySelectorAll(`#${pillId} .pill`).forEach(p => {
    p.style.display = p.dataset.val.toLowerCase().includes(q) ? '' : 'none';
  });
}

function togglePill(el) {
  const dim = el.dataset.dim, val = el.dataset.val;
  if (ACTIVE[dim].has(val)) { ACTIVE[dim].delete(val); el.classList.remove('active'); }
  else                       { ACTIVE[dim].add(val);    el.classList.add('active');    }
  PAGE = 1; applyFilters();
}

/* ── Select All for a dimension ──────────────────────────────── */
function selectAllDim(dim) {
  const pillsId = dim + 'Pills';
  const container = document.getElementById(pillsId);
  if (!container) return;

  const visiblePills = Array.from(container.querySelectorAll('.pill')).filter(p => p.style.display !== 'none');
  const allSelected  = visiblePills.every(p => p.classList.contains('active'));

  if (allSelected) {
    visiblePills.forEach(p => { ACTIVE[dim].delete(p.dataset.val); p.classList.remove('active'); });
    showToast(`Cleared all ${DIM_LABELS[dim]} filters`);
  } else {
    visiblePills.forEach(p => { ACTIVE[dim].add(p.dataset.val); p.classList.add('active'); });
    showToast(`Selected ${visiblePills.length} ${DIM_LABELS[dim]} values`);
  }
  PAGE = 1; applyFilters();
}

function clearDim(dim) {
  ACTIVE[dim].clear();
  document.querySelectorAll(`[data-dim="${dim}"]`).forEach(el => el.classList.remove('active'));
  PAGE = 1; applyFilters();
}

function clearAllFilters() {
  Object.keys(ACTIVE).forEach(k => ACTIVE[k].clear());
  document.querySelectorAll('.pill.active').forEach(el => el.classList.remove('active'));
  document.getElementById('searchInput').value = '';
  document.getElementById('clearSearch').style.display = 'none';
  document.getElementById('slMin').value = 2000;
  document.getElementById('slMax').value = 2026;
  updateSlider(false);
  PAGE = 1; applyFilters();
  showToast('All filters cleared');
}

function clearSearch() {
  document.getElementById('searchInput').value = '';
  document.getElementById('clearSearch').style.display = 'none';
  PAGE = 1; applyFilters();
}

/* ── Sidebar toggle ──────────────────────────────────────────── */
function toggleSidebar() {
  sidebarVisible = !sidebarVisible;
  const layout = document.getElementById('layout');
  layout.classList.toggle('sidebar-hidden', !sidebarVisible);
}

/* ── Per-page selector ───────────────────────────────────────── */
function changePerPage() {
  PER_PAGE = +document.getElementById('perPageSel').value;
  PAGE = 1;
  renderTable();
  renderPagination();
  updateMetrics(hasAnyFilter());
}

/* ── Year column sort cycling ────────────────────────────────── */
function cycleSortYear() {
  const sel = document.getElementById('sortSel');
  const icon = document.getElementById('yearSortIcon');
  if (sel.value === 'year_desc') {
    sel.value = 'year_asc';
    icon.textContent = '↑';
  } else if (sel.value === 'year_asc') {
    sel.value = 'title_asc';
    icon.textContent = '—';
  } else {
    sel.value = 'year_desc';
    icon.textContent = '↓';
  }
  PAGE = 1; applyFilters();
}

/* ── Slider ──────────────────────────────────────────────────── */
function updateSlider(refilter = true) {
  let mn = +document.getElementById('slMin').value;
  let mx = +document.getElementById('slMax').value;
  if (mn > mx) { const t = mn; mn = mx; mx = t; }
  document.getElementById('yrMin').textContent = mn;
  document.getElementById('yrMax').textContent = mx;
  const pct = v => ((v - 2000) / 26) * 100;
  const fill = document.getElementById('rangeFill');
  fill.style.left  = pct(mn) + '%';
  fill.style.width = (pct(mx) - pct(mn)) + '%';
  if (refilter) { PAGE = 1; applyFilters(); }
}

function getYearRange() {
  return [+document.getElementById('slMin').value, +document.getElementById('slMax').value].sort((a,b)=>a-b);
}

/* ── Debounce search ─────────────────────────────────────────── */
function debouncedFilter() {
  const v = document.getElementById('searchInput').value;
  document.getElementById('clearSearch').style.display = v ? 'block' : 'none';
  clearTimeout(filterTimer);
  filterTimer = setTimeout(() => { PAGE = 1; applyFilters(); }, 250);
}

/* ── Active filter count badge ───────────────────────────────── */
function updateActiveCountBadge() {
  let count = 0;
  for (const s of Object.values(ACTIVE)) count += s.size;
  if (document.getElementById('searchInput').value.trim()) count++;
  const [y0, y1] = getYearRange();
  if (y0 !== 2000 || y1 !== 2026) count++;

  const badge = document.getElementById('activeCountBadge');
  if (count > 0) {
    badge.textContent = count + ' active';
    badge.style.display = 'inline-block';
  } else {
    badge.style.display = 'none';
  }
}

/* ── Core filter ─────────────────────────────────────────────── */
function applyFilters() {
  const q  = document.getElementById('searchInput').value.toLowerCase().trim();
  const [y0, y1] = getYearRange();
  const sort = document.getElementById('sortSel').value;

  const activeCatIdx = new Set();
  ACTIVE.cat.forEach(label => {
    const i = META.cats.indexOf(label);
    if (i >= 0) activeCatIdx.add(i);
  });

  filtered = REC.filter(r => {
    const y = g(r,'y');
    if (y < y0 || y > y1) return false;
    if (activeCatIdx.size > 0 && !activeCatIdx.has(g(r,'cat'))) return false;
    if (ACTIVE.tox.size > 0 && !getTox(r).some(v => ACTIVE.tox.has(v))) return false;
    if (ACTIVE.org.size > 0 && !getOrg(r).some(v => ACTIVE.org.has(v))) return false;
    if (ACTIVE.hlt.size > 0 && !getHlt(r).some(v => ACTIVE.hlt.has(v))) return false;
    if (ACTIVE.prd.size > 0 && !getPrd(r).some(v => ACTIVE.prd.has(v))) return false;
    if (ACTIVE.ing.size > 0 && !getIng(r).some(v => ACTIVE.ing.has(v))) return false;
    if (ACTIVE.country.size > 0 && !ACTIVE.country.has(getCtr(r))) return false;
    if (q) {
      const t = (g(r,'t') || '').toLowerCase();
      const a = (g(r,'abs') || '').toLowerCase();
      if (!t.includes(q) && !a.includes(q)) return false;
    }
    return true;
  });

  if (sort === 'year_desc') filtered.sort((a,b) => g(b,'y') - g(a,'y'));
  else if (sort === 'year_asc') filtered.sort((a,b) => g(a,'y') - g(b,'y'));
  else filtered.sort((a,b) => (g(a,'t')||'').localeCompare(g(b,'t')||''));

  const icon = document.getElementById('yearSortIcon');
  if (icon) {
    if (sort === 'year_desc') icon.textContent = '↓';
    else if (sort === 'year_asc') icon.textContent = '↑';
    else icon.textContent = '—';
  }

  const hasFilters = hasAnyFilter();
  updateActiveChips();
  updateActiveCountBadge();
  updateModeDisplay(hasFilters);
  updateMetrics(hasFilters);
  updateCharts(hasFilters);
  renderTable();
  renderPagination();
}

function hasAnyFilter() {
  if (document.getElementById('searchInput').value.trim()) return true;
  for (const s of Object.values(ACTIVE)) if (s.size > 0) return true;
  const [y0, y1] = getYearRange();
  return y0 !== 2000 || y1 !== 2026;
}

/* ── Active chips row ────────────────────────────────────────── */
const DIM_LABELS = { cat:'Category', tox:'Toxicant', org:'Organ', hlt:'Health Effect', prd:'Product', ing:'Matrix', country:'Country' };

function updateActiveChips() {
  const bar   = document.getElementById('activeFilters');
  const chips = document.getElementById('afChips');
  const parts = [];
  for (const [dim, s] of Object.entries(ACTIVE)) {
    for (const val of s) parts.push({ dim, val });
  }
  const q = document.getElementById('searchInput').value.trim();
  if (q) parts.push({ dim:'search', val:`"${q}"` });
  if (parts.length === 0) { bar.style.display = 'none'; return; }
  bar.style.display = 'flex';
  chips.innerHTML = parts.map(({dim, val}) =>
    `<div class="af-chip" onclick="removeChip('${dim}','${escHtml(val)}')">${escHtml(DIM_LABELS[dim] || dim)}: <strong>${escHtml(val)}</strong> <span class="af-chip-x">✕</span></div>`
  ).join('');
}

function removeChip(dim, val) {
  if (dim === 'search') { clearSearch(); return; }
  ACTIVE[dim].delete(val);
  document.querySelectorAll(`[data-dim="${dim}"][data-val="${val}"]`).forEach(el => el.classList.remove('active'));
  PAGE = 1; applyFilters();
}

/* ── Mode display ────────────────────────────────────────────── */
function updateModeDisplay(hasFilters) {
  document.getElementById('overviewMode').style.display  = hasFilters ? 'none' : 'block';
  document.getElementById('filteredMode').style.display  = hasFilters ? 'block' : 'none';
}

/* ── Metrics ─────────────────────────────────────────────────── */
function topCounts(arr, getter, n) {
  const cnt = {};
  arr.forEach(r => getter(r).forEach(v => { if(v) cnt[v]=(cnt[v]||0)+1; }));
  return Object.entries(cnt).sort((a,b)=>b[1]-a[1]).slice(0,n);
}
function topCountsSingle(arr, getter, n) {
  const cnt = {};
  arr.forEach(r => { const v = getter(r); if(v) cnt[v]=(cnt[v]||0)+1; });
  return Object.entries(cnt).sort((a,b)=>b[1]-a[1]).slice(0,n);
}
function peakYear(arr) {
  const cnt = {};
  arr.forEach(r => { const y=g(r,'y'); cnt[y]=(cnt[y]||0)+1; });
  const e = Object.entries(cnt).sort((a,b)=>b[1]-a[1]);
  return e.length ? e[0][0] : '—';
}

function updateMetrics(hasFilters) {
  const data     = hasFilters ? filtered : REC;
  const total    = data.length;
  const journals = new Set(data.map(r => g(r,'j'))).size;
  const peak     = peakYear(data);
  const topTox   = topCounts(data, getTox, 3);
  const topHlt   = topCounts(data, getHlt, 3);
  const topCtr   = topCountsSingle(data, getCtr, 1);

  if (!hasFilters) {
    document.getElementById('mTotal').textContent      = total.toLocaleString();
    document.getElementById('mJournals').textContent   = journals.toLocaleString();
    document.getElementById('mPeakYear').textContent   = peak;
    document.getElementById('mTopTox').textContent     = topTox[0] ? topTox[0][0].split(' ')[0] : '—';
    document.getElementById('mTopHlt').textContent     = topHlt[0] ? topHlt[0][0].split(' ').slice(0,2).join(' ') : '—';
    document.getElementById('mTopCountry').textContent = topCtr[0] ? topCtr[0][0] : '—';
    document.getElementById('badgeTotal').textContent  = total.toLocaleString() + ' Papers';
  } else {
    document.getElementById('fmTotal').textContent    = total.toLocaleString();
    document.getElementById('fmJournals').textContent = journals.toLocaleString();
    document.getElementById('fmPeak').textContent     = peak;
    document.getElementById('fmTopTox').textContent   = topTox[0] ? topTox[0][0].split(' ')[0] : '—';
  }

  const start = (PAGE-1)*PER_PAGE+1;
  const end   = Math.min(PAGE*PER_PAGE, total);
  document.getElementById('showCount').innerHTML =
    total === 0 ? '0 results' :
    `<b>${start.toLocaleString()}–${end.toLocaleString()}</b> of <b>${total.toLocaleString()}</b> papers`;

  if (!hasFilters) buildOverviewText(total, journals, peak, topTox, topHlt);
}

function buildOverviewText(total, journals, peak, topTox, topHlt) {
  const el = document.getElementById('overviewText');
  const topT = topTox.slice(0,3).map(e=>e[0]).join(', ');
  const topH = topHlt.slice(0,3).map(e=>e[0]).join(', ');
  el.innerHTML = `
    <strong>The FooD-ToX-MaP</strong> indexes <strong>${total.toLocaleString()}</strong> original research papers on food toxicants and contaminants,
    spanning <strong>${journals.toLocaleString()} unique journals</strong> from 2000 to 2026.
    Publication activity peaked in <strong>${peak}</strong>, reflecting growing global concern about chemical, microbial,
    and environmental contaminants in the food supply.
    The most-studied toxicants include <strong>${escHtml(topT)}</strong>.
    Key health endpoints investigated are <strong>${escHtml(topH)}</strong>.
    Use the sidebar filters to explore papers by toxicant, organ system, health effect, food product, country, and publication year.
    All filters work together (AND logic) for precise literature discovery.
  `;
}

/* ── Charts ──────────────────────────────────────────────────── */
function destroyChart(key) {
  if (charts[key]) { charts[key].destroy(); delete charts[key]; }
}

function makeBarChart(id, labels, data, color, horizontal=false) {
  destroyChart(id);
  const ctx = document.getElementById(id);
  if (!ctx) return;
  charts[id] = new Chart(ctx, {
    type: 'bar',
    data: { labels, datasets: [{ data, backgroundColor: color, borderColor: color, borderWidth: 0, borderRadius: 3 }] },
    options: {
      responsive: true, maintainAspectRatio: false,
      indexAxis: horizontal ? 'y' : 'x',
      plugins: { legend: { display: false }, tooltip: { callbacks: {
        label: ctx => ` ${ctx.parsed[horizontal ? 'x' : 'y'].toLocaleString()} papers`
      }}},
      scales: {
        x: { ticks: { color: tc, font: { size: 10 }, maxTicksLimit: horizontal ? 6 : 12 }, grid: { color: gc } },
        y: { ticks: { color: tc, font: { size: 10 }, maxTicksLimit: horizontal ? 10 : 6 }, grid: { color: gc } }
      }
    }
  });
}

function makeDoughnut(id, labels, data, colors) {
  destroyChart(id);
  const ctx = document.getElementById(id);
  if (!ctx) return;
  charts[id] = new Chart(ctx, {
    type: 'doughnut',
    data: { labels, datasets: [{ data, backgroundColor: colors, borderColor: '#ffffff', borderWidth: 2, hoverOffset: 4 }] },
    options: {
      responsive: true, maintainAspectRatio: false, cutout: '60%',
      plugins: {
        legend: { display: true, position: 'right', labels: { color: tc, font: { size: 9 }, boxWidth: 10, padding: 6 } }
      }
    }
  });
}

function updateCharts(hasFilters) {
  const data = hasFilters ? filtered : REC;
  const [y0, y1] = getYearRange();

  const yrCnt = {};
  for (let y = y0; y <= y1; y++) yrCnt[y] = 0;
  data.forEach(r => {
    const y = g(r,'y');
    if (yrCnt[y] !== undefined) yrCnt[y]++;
    else yrCnt[y] = (yrCnt[y]||0)+1;
  });
  const yrLabels = Object.keys(yrCnt).sort();
  const yrVals   = yrLabels.map(y => yrCnt[y]);

  const catCnt = {};
  data.forEach(r => { const c=getCat(r); catCnt[c]=(catCnt[c]||0)+1; });
  const catEntries = Object.entries(catCnt).sort((a,b)=>b[1]-a[1]).slice(0,8);

  const trim = (s, n) => s.length > n ? s.slice(0,n)+'…' : s;

  const toxTop = topCounts(data, getTox, 8);
  const hltTop = topCounts(data, getHlt, 8);
  const prdTop = topCounts(data, getPrd, 8);
  const orgTop = topCounts(data, getOrg, 8);

  if (!hasFilters) {
    makeBarChart('yearChart', yrLabels, yrVals, '#064e3b');
    makeDoughnut('catChart',
      catEntries.map(e => e[0]),
      catEntries.map(e => e[1]),
      catEntries.map(e => CAT_COLORS[e[0]] || '#64748b')
    );
    makeBarChart('toxChart', toxTop.map(e=>trim(e[0],14)), toxTop.map(e=>e[1]), '#ea580c', true);
    makeBarChart('hltChart', hltTop.map(e=>trim(e[0],18)), hltTop.map(e=>e[1]), '#064e3b', true);
    makeBarChart('prdChart', prdTop.map(e=>trim(e[0],14)), prdTop.map(e=>e[1]), '#16a34a', true);
    makeBarChart('orgChart', orgTop.map(e=>trim(e[0],14)), orgTop.map(e=>e[1]), '#047857', true);
  } else {
    makeBarChart('fYearChart', yrLabels, yrVals, '#064e3b');
    makeDoughnut('fCatChart',
      catEntries.map(e => e[0]),
      catEntries.map(e => e[1]),
      catEntries.map(e => CAT_COLORS[e[0]] || '#64748b')
    );
    makeBarChart('fHltChart', hltTop.map(e=>trim(e[0],16)), hltTop.map(e=>e[1]), '#ea580c', true);
  }
}

/* ── Table ───────────────────────────────────────────────────── */
function renderTable() {
  const body  = document.getElementById('tableBody');
  const noRes = document.getElementById('noResults');
  if (filtered.length === 0) { body.innerHTML = ''; noRes.style.display = 'block'; return; }
  noRes.style.display = 'none';

  const start = (PAGE-1)*PER_PAGE;
  const rows  = filtered.slice(start, Math.min(start+PER_PAGE, filtered.length));
  const catColor = cat => CAT_COLORS[cat] || '#64748b';

  body.innerHTML = rows.map(r => {
    const pmid  = g(r,'pmid');
    const url   = pmid && pmid !== 'nan' ? `https://pubmed.ncbi.nlm.nih.gov/${pmid}/` : '#';
    const tox   = getTox(r).slice(0,2);
    const org   = getOrg(r).slice(0,1);
    const hlt   = getHlt(r).slice(0,2);
    const prd   = getPrd(r).slice(0,1);
    const cat   = getCat(r);
    const title = escHtml(g(r,'t') || '');

    let rec64;
    try {
      rec64 = btoa(encodeURIComponent(JSON.stringify([g(r,'pmid'), g(r,'t'), g(r,'j'), g(r,'y'), g(r,'abs'), g(r,'cat')])));
    } catch(e) { rec64 = ''; }

    return `<tr onclick="${rec64 ? `openModal('${rec64}')` : ''}" style="cursor:pointer">
      <td class="tbl-title">
        <a href="${url}" target="_blank" onclick="event.stopPropagation()">${title}</a>
        <div class="tbl-journal">${escHtml(getJ(r))}</div>
      </td>
      <td class="tbl-journal">${escHtml(getJ(r).split(' ').slice(0,4).join(' '))}</td>
      <td class="tbl-year">${g(r,'y')}</td>
      <td>${tox.map(t=>`<span class="tag tag-tox">${escHtml(t)}</span>`).join('')}</td>
      <td>${org.map(o=>`<span class="tag tag-org">${escHtml(o)}</span>`).join('')}</td>
      <td>${hlt.map(h=>`<span class="tag tag-hlt">${escHtml(h)}</span>`).join('')}</td>
      <td>${prd.map(p=>`<span class="tag tag-prd">${escHtml(p)}</span>`).join('')}</td>
      <td><span class="cat-badge" title="${escHtml(cat)}" style="background:${catColor(cat)}"></span></td>
    </tr>`;
  }).join('');
}

/* ── Pagination ──────────────────────────────────────────────── */
function renderPagination() {
  const total = Math.ceil(filtered.length / PER_PAGE);
  const pag   = document.getElementById('pagination');
  if (total <= 1) { pag.innerHTML = ''; return; }

  let html = `<button class="page-btn" onclick="goPage(${PAGE-1})" ${PAGE===1?'disabled':''}>‹</button>`;
  const pages = [];
  for (let p = 1; p <= total; p++) {
    if (p===1 || p===total || Math.abs(p-PAGE)<=2) pages.push(p);
    else if (pages[pages.length-1] !== '…') pages.push('…');
  }
  pages.forEach(p => {
    if (p === '…') html += `<span class="page-ellipsis">…</span>`;
    else html += `<button class="page-btn ${p===PAGE?'active':''}" onclick="goPage(${p})">${p}</button>`;
  });
  html += `<button class="page-btn" onclick="goPage(${PAGE+1})" ${PAGE===total?'disabled':''}>›</button>`;
  pag.innerHTML = html;
}

function goPage(p) {
  const total = Math.ceil(filtered.length / PER_PAGE);
  if (p < 1 || p > total) return;
  PAGE = p;
  renderTable(); renderPagination();
  updateMetrics(hasAnyFilter());
  document.getElementById('mainContent').scrollTo(0, 0);
}

/* ── Modal ───────────────────────────────────────────────────── */
function openModal(enc) {
  try {
    const [pmid, title, journalIdx, year, abs, catIdx] = JSON.parse(decodeURIComponent(atob(enc)));
    const cat = META.cats[catIdx] || '';
    const url = pmid && pmid !== 'nan' ? `https://pubmed.ncbi.nlm.nih.gov/${pmid}/` : '#';

    const rec = REC.find(r => g(r,'pmid') === pmid);
    const tox = rec ? getTox(rec) : [];
    const org = rec ? getOrg(rec) : [];
    const hlt = rec ? getHlt(rec) : [];
    const prd = rec ? getPrd(rec) : [];
    const ctr = rec ? getCtr(rec) : '';

    document.getElementById('modalBody').innerHTML = `
      <div class="modal-title"><a href="${url}" target="_blank" style="color:inherit;text-decoration:none">${escHtml(title||'')}</a></div>
      <div class="modal-meta">
        <span class="modal-meta-item"><strong>Year:</strong> ${year}</span>
        <span class="modal-meta-item"><strong>PMID:</strong> <a href="${url}" target="_blank" style="color:var(--acc)">${escHtml(pmid||'')}</a></span>
        <span class="modal-meta-item"><strong>Category:</strong> ${escHtml(cat)}</span>
        ${ctr ? `<span class="modal-meta-item"><strong>Country:</strong> ${escHtml(ctr)}</span>` : ''}
      </div>
      ${tox.length ? `<div class="modal-section"><div class="modal-section-title">Toxicants</div><div class="modal-tags">${tox.map(t=>`<span class="tag tag-tox">${escHtml(t)}</span>`).join('')}</div></div>` : ''}
      ${org.length ? `<div class="modal-section"><div class="modal-section-title">Organ / System</div><div class="modal-tags">${org.map(t=>`<span class="tag tag-org">${escHtml(t)}</span>`).join('')}</div></div>` : ''}
      ${hlt.length ? `<div class="modal-section"><div class="modal-section-title">Health Effects</div><div class="modal-tags">${hlt.map(t=>`<span class="tag tag-hlt">${escHtml(t)}</span>`).join('')}</div></div>` : ''}
      ${prd.length ? `<div class="modal-section"><div class="modal-section-title">Food Products</div><div class="modal-tags">${prd.map(t=>`<span class="tag tag-prd">${escHtml(t)}</span>`).join('')}</div></div>` : ''}
      ${abs ? `<div class="modal-section"><div class="modal-section-title">Abstract</div><div class="modal-abstract">${escHtml(abs)}</div></div>` : ''}
    `;
    document.getElementById('modalOverlay').classList.add('open');
  } catch(e) { console.error('Modal error:', e); }
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('open');
}

/* ── Keyboard shortcuts ──────────────────────────────────────── */
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { closeModal(); return; }
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') return;
  if (e.key === 's' || e.key === 'S') { toggleSidebar(); return; }
  if (e.key === '/') {
    e.preventDefault();
    document.getElementById('searchInput').focus();
  }
});

/* ── Export ──────────────────────────────────────────────────── */
function exportCSV() {
  const headers = ['Title','Journal','Year','PMID','Category','Toxicants','Organ_System','Health_Effect','Food_Product','Country'];
  const rows = filtered.map(r => [
    `"${(g(r,'t')||'').replace(/"/g,'""')}"`,
    `"${(getJ(r)||'').replace(/"/g,'""')}"`,
    g(r,'y'),
    g(r,'pmid'),
    `"${getCat(r)}"`,
    `"${getTox(r).join('; ')}"`,
    `"${getOrg(r).join('; ')}"`,
    `"${getHlt(r).join('; ')}"`,
    `"${getPrd(r).join('; ')}"`,
    getCtr(r),
  ]);
  const csv  = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = `food_tox_map_${filtered.length}_papers.csv`; a.click();
  URL.revokeObjectURL(url);
  showToast(`Exported ${filtered.length.toLocaleString()} papers as CSV`);
}

/* ── Toast ───────────────────────────────────────────────────── */
let toastTimer = null;
function showToast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
}

/* ── Utility ─────────────────────────────────────────────────── */
function escHtml(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ── Boot ────────────────────────────────────────────────────── */
(function init() {
  buildAllPills();
  updateSlider(false);
  filtered = [...REC];
  filtered.sort((a,b) => g(b,'y') - g(a,'y'));
  updateMetrics(false);
  updateCharts(false);
  renderTable();
  renderPagination();
  document.querySelectorAll('.chart-wrap canvas').forEach(c => {
    c.style.maxHeight = c.closest('.h180') ? '180px' : '110px';
  });
})();