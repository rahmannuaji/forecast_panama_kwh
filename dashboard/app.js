/* Atlas Beban Panama: semua angka dibaca dari window.DATA (diekspor notebook, Tahap 10). */
'use strict';
const D = window.DATA;
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const INK = '#1d1d1b', INK2 = '#45443f', MUTED = '#8a877c', GRID = '#e4dfd1', RED = '#c8372d', RAIN = '#2b6cb0', BLUE = '#3b3934';
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const MONL = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const DAYL = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const CITIES = { Tocumen: { code: 'toc', color: '#5e5b53', dash: [], pt: 'circle' }, Santiago: { code: 'san', color: '#7d796d', dash: [7, 4], pt: 'triangle' }, David: { code: 'dav', color: '#959184', dash: [2, 3], pt: 'rect' } };
const WVAR = { T2M: { name: 'Suhu', nb: 'Suhu (°C)', label: 'Suhu (°C)', unit: '°C', d: 1 }, QV2M: { name: 'Kelembapan', nb: 'Kelembapan', label: 'Kelembapan (kg/kg)', unit: 'kg/kg', d: 4 },
  TQL: { name: 'Presipitasi cair', nb: 'Presipitasi cair', label: 'Presipitasi cair (l/m²)', unit: 'l/m²', d: 3 }, W2M: { name: 'Kecepatan angin', nb: 'Angin (m/s)', label: 'Angin (m/s)', unit: 'm/s', d: 2 } };
const NBLAB = Object.fromEntries(Object.values(WVAR).map(v => [v.nb, v.label]));
const FEAT = { hour: 'Jam', dow: 'Hari dalam minggu', month: 'Bulan', doy: 'Hari ke-n dalam tahun', Holiday_ID: 'Jenis hari libur', holiday: 'Hari libur', school: 'Masa sekolah', mean24_lag24: 'Rata-rata 24 jam (mundur 24 jam)', mean168_lag24: 'Rata-rata 168 jam (mundur 24 jam)' };
const featName = f => FEAT[f] || (f.startsWith('lag') ? `Beban ${f.slice(3)} jam sebelumnya` : (() => { const [v, c] = f.split('_'); const city = Object.keys(CITIES).find(k => CITIES[k].code === c); return `${WVAR[v] ? WVAR[v].name : v} ${city || c}`; })());
const MODELS = [
  { key: 'c2', name: 'Chronos-2', color: '#a3366f', dash: [] },
  { key: 'bolt', name: 'Chronos-Bolt', variant: 'Chronos-Bolt', color: '#a8690c', dash: [7, 4] },
  { key: 'tfm', name: 'TimesFM 2.0', variant: 'TimesFM-2.0', color: '#3d8a4a', dash: [2, 3] },
  { key: 'xgb', name: 'XGBoost', variant: 'XGBoost', color: '#5a4aa8', dash: [10, 3, 2, 3] }];
const VCOLOR = { 'Chronos-2 + kovariat': '#a3366f', 'Chronos-2 univariat': '#a3366f', 'Chronos-Bolt': '#a8690c', 'TimesFM-2.0': '#3d8a4a', 'XGBoost': '#5a4aa8' };
const VNAME = { 'Chronos-2 + kovariat': 'Chronos-2 + kovariat', 'Chronos-2 univariat': 'Chronos-2 tanpa kovariat', 'Chronos-Bolt': 'Chronos-Bolt', 'TimesFM-2.0': 'TimesFM 2.0', 'XGBoost': 'XGBoost' };

const state = { kov: true, city: 'Tocumen', wvar: 'T2M', days: 'kerja', corr: 'r_per_jam', range: 'all', week: true, reg: 'Semua', metric: 'MAPE (%)',
  flow: 'c2', day: D.backtest.origins.indexOf('2020-04-10'), show: new Set(['c2', 'bolt', 'tfm', 'xgb']), band: 'c2', sday: 7, smodel: 'c2', scity: 'Tocumen', soff: 2, uband: 'c2' };
if (state.day < 0) state.day = 0;

/* ---------- helpers ---------- */
const nf = (v, d = 1) => (v == null || Number.isNaN(+v)) ? '–' : (+v).toLocaleString('id-ID', { minimumFractionDigits: d, maximumFractionDigits: d });
const sgn = (v, d = 1) => (v > 0 ? '+' : v < 0 ? '−' : '') + nf(Math.abs(v), d);
const pfmt = p => p < 0.001 ? p.toExponential(1).replace('.', ',').replace('e-', ' × 10⁻').replace(/⁻(\d+)/, (_, e) => '⁻' + [...e].map(c => '⁰¹²³⁴⁵⁶⁷⁸⁹'[c]).join('')) : nf(p, 3);
const rows = t => t.data.map((r, i) => Object.fromEntries([['_i', t.index[i]], ...t.columns.map((c, j) => [c, r[j]])]));
const mean = a => { const v = a.filter(x => x != null); return v.reduce((s, x) => s + x, 0) / v.length; };
const utc = s => new Date(s.slice(0, 10) + 'T00:00:00Z');
const dShort = s => { const d = utc(s); return `${d.getUTCDate()} ${MON[d.getUTCMonth()]} ${d.getUTCFullYear()}`; };
const dLong = s => { const d = utc(s); return `${DAYL[d.getUTCDay()]}, ${d.getUTCDate()} ${MONL[d.getUTCMonth()]} ${d.getUTCFullYear()}`; };
const variantOf = m => m.key === 'c2' ? (state.kov ? 'Chronos-2 + kovariat' : 'Chronos-2 univariat') : m.variant;
const labelOf = m => VNAME[variantOf(m)];
const hexA = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };
const mix = (a, b, t) => { const p = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)); const [x, y] = [p(a), p(b)]; return '#' + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join(''); };
const tip = $('#tip');
const showTip = (e, html) => { tip.innerHTML = html; tip.style.opacity = 1; tip.style.left = Math.min(e.clientX + 14, innerWidth - 220) + 'px'; tip.style.top = e.clientY + 14 + 'px'; };
const hideTip = () => { tip.style.opacity = 0; };
const seg = (id, key, cb) => {
  const el = $(id);
  el.querySelectorAll('button').forEach(b => {
    b.setAttribute('aria-pressed', String(b.dataset.v === String(state[key])));
    b.onclick = () => { state[key] = b.dataset.v; el.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x === b))); cb(); };
  });
};
const table = (el, head, body, hl = () => false) => {
  el.innerHTML = `<thead><tr>${head.map(h => `<th scope="col">${h}</th>`).join('')}</tr></thead><tbody>${body.map((r, i) => `<tr${hl(r, i) ? ' class="hl"' : ''}>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody>`;
};
const sw = c => `<span class="sw" style="background:${c}"></span>`;

/* ---------- Chart.js defaults & plugins ---------- */
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
Object.assign(Chart.defaults, { maintainAspectRatio: false, responsive: true, locale: 'id-ID', color: INK2, borderColor: GRID });
Chart.defaults.font.family = "'Libre Franklin', system-ui, sans-serif";
Chart.defaults.font.size = 12.5;
Chart.defaults.animation.duration = reduce ? 0 : 450;
Chart.defaults.interaction = { mode: 'index', intersect: false };
Object.assign(Chart.defaults.elements.line, { borderWidth: 2, tension: 0.25 });
Object.assign(Chart.defaults.elements.point, { radius: 0, hoverRadius: 4, hitRadius: 6 });
Object.assign(Chart.defaults.plugins.tooltip, { backgroundColor: INK, titleColor: '#f7f5ee', bodyColor: '#f7f5ee', padding: 10, cornerRadius: 0, boxPadding: 4, usePointStyle: true });
Object.assign(Chart.defaults.plugins.legend, { position: 'top', align: 'start' });
Object.assign(Chart.defaults.plugins.legend.labels, { usePointStyle: true, pointStyle: 'line', boxWidth: 26, padding: 14, color: INK });
Chart.defaults.scale.grid.color = GRID;
Chart.defaults.scale.border = { color: INK };

Chart.register({
  id: 'marks',
  beforeDatasetsDraw(c, _, o) {
    const { ctx, chartArea: a, scales: { x } } = c;
    if (!x || !a) return;
    (o.bands || []).forEach(b => {
      const x0 = Math.max(x.getPixelForValue(b.from), a.left), x1 = Math.min(x.getPixelForValue(b.to), a.right), linePx = (o.lines || []).map(l => x.getPixelForValue(l.at));
      if (x1 <= x0) return;
      ctx.save(); ctx.fillStyle = b.color; ctx.fillRect(x0, a.top, x1 - x0, a.bottom - a.top);
      if (b.label) { ctx.fillStyle = INK2; ctx.font = "600 12px 'Libre Franklin'"; const w = ctx.measureText(b.label).width; if (w + 10 < x1 - x0 && !linePx.some(p => p > x0 && p < x0 + w + 14)) ctx.fillText(b.label, x0 + 6, a.bottom - 8); }
      ctx.restore();
    });
    (o.lines || []).forEach(l => {
      const px = x.getPixelForValue(l.at);
      if (px < a.left || px > a.right) return;
      ctx.save(); ctx.strokeStyle = l.color || RED; ctx.lineWidth = 1.5; ctx.setLineDash(l.dash || []);
      ctx.beginPath(); ctx.moveTo(px, a.top); ctx.lineTo(px, a.bottom); ctx.stroke();
      if (l.label) { ctx.fillStyle = INK; ctx.font = "600 12px 'Libre Franklin'"; const w = ctx.measureText(l.label).width; ctx.fillText(l.label, (l.side === 'left' || px + 6 + w > a.right) ? px - 6 - w : px + 6, a.top + (l.y || 14)); }
      ctx.restore();
    });
  }
});
Chart.register({
  id: 'endLabels',
  afterDatasetsDraw(c, _, o) {
    if (!o.on || innerWidth < 640) return;
    const { ctx, chartArea: a } = c, items = [];
    c.data.datasets.forEach((d, i) => {
      if (!d.label || d.endLabel === false || !c.isDatasetVisible(i)) return;
      const pts = c.getDatasetMeta(i).data; let k = d.data.length - 1;
      while (k >= 0 && d.data[k] == null) k--;
      if (k < 0 || !pts[k]) return;
      items.push({ y: pts[k].y, x: pts[k].x, t: d.endText || d.label, color: d.borderColor });
    });
    items.sort((p, q) => p.y - q.y);
    for (let i = 1; i < items.length; i++) if (items[i].y - items[i - 1].y < 15) items[i].y = items[i - 1].y + 15;
    ctx.save(); ctx.font = "600 12px 'Libre Franklin'"; ctx.textBaseline = 'middle';
    items.forEach(p => { ctx.fillStyle = p.color; ctx.fillRect(a.right + 8, p.y - 1.5, 10, 3); ctx.fillStyle = INK; ctx.fillText(p.t, a.right + 22, p.y); });
    ctx.restore();
  }
});
Chart.register({
  id: 'barValues',
  afterDatasetsDraw(c, _, o) {
    if (!o.on) return;
    const { ctx } = c;
    ctx.save(); ctx.font = "700 13px 'Libre Franklin'"; ctx.fillStyle = INK; ctx.textBaseline = 'middle';
    c.getDatasetMeta(0).data.forEach((bar, i) => { const v = c.data.datasets[0].data[i]; if (v != null) ctx.fillText(o.fmt(v), bar.x + 8, bar.y); });
    ctx.restore();
  }
});

const padR = n => innerWidth < 640 ? 8 : n;
const charts = {};
const chart = (id, cfg) => { charts[id]?.destroy(); charts[id] = new Chart($('#' + id), cfg); return charts[id]; };
const line = (label, data, color, extra = {}) => ({ label, data, borderColor: color, backgroundColor: color, ...extra });
const mwh = (ctx) => `${ctx.dataset.label}: ${nf(ctx.parsed.y, 1)} MWh`;
const axisY = (title, extra = {}) => ({ title: { display: !!title, text: title, color: INK2 }, grid: { color: GRID }, border: { display: false }, ...extra });
const axisX = (extra = {}) => ({ grid: { display: false }, ...extra, ticks: { autoSkip: true, maxRotation: 0, minRotation: 0, maxTicksLimit: 9, color: INK2, ...(extra.ticks || {}) } });

/* ---------- data shortcuts ---------- */
const W = D.weather, WD = W.daily, BT = D.backtest;
const dIdx = Object.fromEntries(WD.dates.map((d, i) => [d, i]));
const overallRows = rows(D.overall), regRows = rows(D.by_regime), dmRows = rows(D.dm), infoRows = rows(D.info);
const metricOf = (variant, metric, reg = state.reg) => {
  const r = reg === 'Semua' ? overallRows.find(x => x._i === variant) : regRows.find(x => x.regime === reg && x.model === variant);
  return r ? r[metric] : null;
};
const best = D.meta.best;
const covIdx = BT.origins.indexOf(D.meta.covid_start);
const hourLabels = Array.from({ length: 24 }, (_, h) => String(h + 1).padStart(2, '0') + '.00');
const hourly = D.hourly.values, H0 = Date.parse(D.hourly.start.replace(' ', 'T') + 'Z');
const dailyLoad = WD.load;
const meanRange = (a, b) => mean(WD.dates.map((d, i) => (d >= a && d <= b) ? dailyLoad[i] : null));
const covidDrop = (meanRange('2020-03-15', '2020-06-26') / meanRange(D.meta.test_start, '2020-03-14') - 1) * 100;

/* ============================================================ BERANDA */
function renderHome() {
  const bestMape = metricOf(best, 'MAPE (%)', 'Semua'), bestMae = metricOf(best, 'MAE', 'Semua');
  $('#home-lede').textContent = `Data berisi ${nf(D.meta.n_obs, 0)} jam beban listrik nasional Panama dari ${dShort(D.meta.start)} sampai ${dShort(D.meta.end)}, ditambah cuaca dari tiga kota serta indikator hari libur dan masa sekolah. Empat model diuji untuk meramal beban 24 jam ke depan.`;
  const hrs = D.heat.z.map(r => mean(r)), peakH = hrs.indexOf(Math.max(...hrs));
  const ht = D.holiday_test;
  $('#facts').innerHTML = [
    [nf(bestMape, 2) + '%', `galat rata-rata model terbaik, ${VNAME[best]}`],
    [sgn((ht.libur / ht.biasa - 1) * 100, 1) + '%', 'beban saat hari libur nasional'],
    [sgn(covidDrop, 1) + '%', 'beban saat pembatasan COVID-19'],
    ['Pukul ' + peakH, 'jam beban tertinggi (rata-rata 2019)']
  ].map(([b, s]) => `<div class="fact"><b>${b}</b><span>${s}</span></div>`).join('');

  const corr = rows(W.corr);
  const allT = Object.values(CITIES).flatMap(c => W.monthly['T2M_' + c.code]), allP = Object.values(CITIES).flatMap(c => W.monthly['TQL_' + c.code]);
  const T_MIN = Math.floor(Math.min(...allT)) - 1, T_MAX = T_MIN + 4 * Math.ceil((Math.ceil(Math.max(...allT)) + 1 - T_MIN) / 4), P_MAX = Math.ceil(Math.max(...allP) * 10) / 10;
  Object.entries(CITIES).forEach(([city, c]) => {
    const t = W.monthly['T2M_' + c.code], p = W.monthly['TQL_' + c.code];
    chart('clim-' + city, {
      data: { labels: MON, datasets: [
        { type: 'line', label: 'Suhu', data: t, borderColor: RED, backgroundColor: RED, yAxisID: 'y', pointRadius: 2.5 },
        { type: 'bar', label: 'Presipitasi', data: p, backgroundColor: hexA(RAIN, .55), yAxisID: 'y2', borderRadius: { topLeft: 3, topRight: 3 }, barPercentage: .78 }] },
      options: { plugins: { legend: { display: false }, tooltip: { callbacks: { label: x => x.dataset.label === 'Suhu' ? `Suhu: ${nf(x.parsed.y, 1)} °C` : `Presipitasi: ${nf(x.parsed.y, 3)}` } } },
        scales: { x: axisX({ ticks: { maxTicksLimit: 6, color: INK2 } }),
          y2: { stack: 'c', stackWeight: 1.2, offset: true, beginAtZero: true, max: P_MAX, title: { display: true, text: 'l/m²', color: INK2, font: { size: 11 } }, grid: { display: false }, border: { display: false }, ticks: { maxTicksLimit: 2, callback: v => nf(v, 2) } },
          y: { stack: 'c', stackWeight: 2, offset: true, min: T_MIN, max: T_MAX, title: { display: true, text: '°C', color: INK2, font: { size: 11 } }, grid: { color: GRID }, border: { display: false }, ticks: { stepSize: 4, callback: v => nf(v, 0) + '°' } } } }
    });
    const rT = corr.find(r => r._i === 'T2M_' + c.code);
    $('#clim-note-' + city).innerHTML = `Rata-rata ${nf(mean(t), 1)} °C, presipitasi rata-rata per jam ${nf(mean(p), 3)} l/m². Korelasi suhu harian dengan beban r = ${nf(rT.r_harian, 2)}. <b>Klik untuk analisis kota ini →</b>`;
  });

  const ti = dIdx[D.meta.test_start], ci = dIdx[D.meta.covid_start];
  const roll30 = dailyLoad.map((_, i) => i < 29 ? null : mean(dailyLoad.slice(i - 29, i + 1)));
  chart('home-daily', {
    type: 'line',
    data: { labels: WD.dates, datasets: [line('Rata-rata harian', dailyLoad, '#c9c3b3', { borderWidth: 1, tension: 0 }), line('Rata-rata 30 hari', roll30, INK, { borderWidth: 2.2 })] },
    options: { plugins: { legend: { display: true }, tooltip: { callbacks: { title: x => dLong(x[0].label), label: mwh } },
        marks: { bands: [{ from: ti, to: WD.dates.length - 1, color: 'rgba(29,29,27,.07)', label: 'Periode uji' }], lines: [{ at: ci, color: INK, dash: [4, 3], label: '15 Mar 2020', side: 'left', y: 16 }] } },
      scales: { x: axisX({ ticks: { autoSkip: false, callback(v) { const l = this.getLabelForValue(v); return l.slice(5) === '01-01' || v === 0 ? l.slice(0, 4) : ''; } } }), y: axisY('MWh') } }
  });

  $('#home-models').innerHTML = [
    ['#a3366f', 'Chronos-2', 'foundation model Amazon; dapat membaca kovariat cuaca dan kalender'],
    ['#a8690c', 'Chronos-Bolt', 'foundation model Amazon yang kecil dan cepat; hanya membaca riwayat beban'],
    ['#3d8a4a', 'TimesFM 2.0', 'foundation model Google, 500 juta parameter; hanya membaca riwayat beban'],
    ['#5a4aa8', 'XGBoost', 'machine learning berbasis pohon keputusan, dilatih pada data 2015–2019']
  ].map(([c, n, d]) => `<li>${sw(c)}<b>${n}</b>: ${d}</li>`).join('');

  const u = 'Chronos-2 univariat', k = 'Chronos-2 + kovariat';
  const dmAll = dmRows.find(r => r['Model A'] === k && r['Model B'] === u && r.Regime === 'Semua');
  const dmCov = dmRows.find(r => r['Model A'] === k && r['Model B'] === u && r.Regime === 'COVID-19');
  const second = overallRows.filter(r => r._i !== best)[0];
  $('#home-best').innerHTML = `<b>Model terpilih: ${VNAME[best]}.</b> MAPE ${nf(bestMape, 2)}% dan MAE ${nf(bestMae, 1)} MWh pada 178 hari uji. Urutan kedua adalah ${VNAME[second._i]} (MAPE ${nf(second['MAPE (%)'], 2)}%).`
    + (dmAll ? ` Manfaat kovariat untuk Chronos-2 ${dmAll['p-value'] < 0.05 ? 'signifikan' : 'tidak signifikan'} secara keseluruhan (p = ${pfmt(dmAll['p-value'])})` : '')
    + (dmCov ? ` dan ${dmCov['p-value'] < 0.05 ? 'signifikan' : 'tidak signifikan'} pada masa COVID-19 (p = ${pfmt(dmCov['p-value'])}).` : '.')
    + ` <a href="#performa">Lihat detail performa →</a>`;
}
$$('.city').forEach(el => {
  const go = () => { state.city = el.dataset.city; location.hash = '#cuaca'; };
  el.addEventListener('click', go);
  el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
});

/* ============================================================ EKSPLORASI */
function renderEDA() {
  const yr = rows(D.yearly);
  const y15 = yr.find(r => r._i === 2015), y19 = yr.find(r => r._i === 2019);
  const cagr = (Math.pow(y19.mean / y15.mean, 1 / 4) - 1) * 100;
  $('#eda-lede').textContent = `Rata-rata beban naik dari ${nf(y15.mean, 0)} MWh (2015) menjadi ${nf(y19.mean, 0)} MWh (2019), sekitar ${nf(cagr, 1)}% per tahun, lalu turun tajam saat pembatasan COVID-19 pada 2020. Data lengkap per jam tanpa nilai hilang.`;
  drawEdaDaily();
  drawWeek();
  const ht = D.holiday_test;
  $('#eda-season-p').textContent = `Beban naik dari dini hari, memuncak di siang hari, dan turun di malam hari. Akhir pekan lebih rendah daripada hari kerja. Hari libur nasional mirip hari Minggu, sehingga indikator hari libur penting untuk model.`;

  const z = D.heat.z, flat = z.flat(), lo = Math.min(...flat), hi = Math.max(...flat), days = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
  const col = v => mix('#efe9dc', '#1d1d1b', (v - lo) / (hi - lo));
  let h = '<div></div>' + days.map(d => `<div class="hd">${d}</div>`).join('');
  z.forEach((r, hr) => { h += `<div class="hl">${hr % 3 === 0 ? String(hr).padStart(2, '0') : ''}</div>` + r.map((v, d) => `<div class="c" style="background:${col(v)}" data-t="${days[d]}, ${String(hr).padStart(2, '0')}.00: ${nf(v, 0)} MWh"></div>`).join(''); });
  $('#heat').innerHTML = h;
  $('#heat').onmousemove = e => e.target.dataset.t ? showTip(e, e.target.dataset.t) : hideTip();
  $('#heat').onmouseleave = hideTip;
  $('#heat-leg').innerHTML = `${nf(lo, 0)} MWh <i style="background:linear-gradient(90deg,#efe9dc,#1d1d1b)"></i> ${nf(hi, 0)} MWh`;

  chart('eda-holiday', { type: 'line',
    data: { labels: Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0') + '.00'), datasets: [
      line('Hari biasa', D.holiday_profile.biasa, INK), line('Libur nasional', D.holiday_profile.libur, '#6f6b60', { borderDash: [6, 4] })] },
    options: { layout: { padding: { right: padR(130) } }, plugins: { legend: { display: true }, endLabels: { on: true }, tooltip: { callbacks: { label: mwh } } }, scales: { x: axisX(), y: axisY('MWh') } } });
  $('#eda-holiday-note').textContent = `Pada hari kerja, rata-rata beban harian saat libur ${nf(ht.libur, 1)} MWh vs ${nf(ht.biasa, 1)} MWh pada hari biasa (${sgn((ht.libur / ht.biasa - 1) * 100, 1)}%, ${ht.n_libur} hari libur). Uji t Welch: t = ${nf(ht.t, 2)}, p = ${pfmt(ht.p)}.`;

  const years = Object.keys(D.monthly);
  chart('eda-monthly', { type: 'line',
    data: { labels: MON, datasets: years.map((y, i) => line(y, D.monthly[y], mix('#c9c3b3', '#1d1d1b', i / (years.length - 1)), { pointRadius: 2, borderWidth: y === '2020' ? 2.6 : 1.8 })) },
    options: { plugins: { tooltip: { callbacks: { label: mwh } } }, scales: { x: axisX(), y: axisY('MWh') } } });

  table($('#tbl-yearly'), ['Tahun', 'Rata-rata', 'Simp. baku', 'Min', 'Maks', 'Jam', 'Tumbuh'],
    yr.map(r => [r._i, nf(r.mean, 1), nf(r.std, 1), nf(r.min, 1), nf(r.max, 1), nf(r.count, 0), r['tumbuh_%'] == null ? '–' : sgn(r['tumbuh_%'], 2) + '%']));

  const st = D.strength;
  chart('eda-strength', { type: 'bar',
    data: { labels: ['Tren', 'Harian (24 j)', 'Mingguan (168 j)'], datasets: [{ data: [st.Tren, st.seasonal_24, st.seasonal_168], backgroundColor: BLUE, borderRadius: 4, barPercentage: .55 }] },
    options: { indexAxis: 'y', layout: { padding: { right: 50 } }, plugins: { legend: { display: false }, barValues: { on: true, fmt: v => nf(v, 3) }, tooltip: { callbacks: { label: x => 'Kekuatan: ' + nf(x.parsed.x, 3) } } },
      scales: { x: { min: 0, max: 1, grid: { color: GRID }, border: { display: false } }, y: { grid: { display: false }, ticks: { color: INK } } } } });
  table($('#tbl-stat'), ['Deret', 'ADF p', 'KPSS p', 'Kesimpulan'], rows(D.stationarity).map(r => [r.Deret, nf(r['ADF p'], 4), nf(r['KPSS p'], 3),
    r['ADF p'] < 0.05 && r['KPSS p'] >= 0.05 ? 'Stasioner' : r['ADF p'] >= 0.05 && r['KPSS p'] < 0.05 ? 'Tidak stasioner' : 'Hasil uji berbeda']));

  const acfv = D.acf.slice(1);
  chart('eda-acf', { type: 'bar',
    data: { labels: acfv.map((_, i) => i + 1), datasets: [{ label: 'ACF', data: acfv, backgroundColor: acfv.map((_, i) => (i + 1) % 24 === 0 ? INK : hexA(INK, .28)), barPercentage: 1, categoryPercentage: 1 }] },
    options: { plugins: { legend: { display: false }, tooltip: { callbacks: { title: x => `Lag ${x[0].label} jam`, label: x => 'ACF: ' + nf(x.parsed.y, 3) } },
        marks: { lines: [{ at: 23, color: 'rgba(0,0,0,0)', label: `lag 24: ${nf(D.acf[24], 2)}` }, { at: 167, color: 'rgba(0,0,0,0)', label: `lag 168: ${nf(D.acf[168], 2)}` }] } },
      scales: { x: axisX({ title: { display: true, text: 'Lag (jam); batang gelap = kelipatan 24', color: INK2 }, ticks: { color: INK2, autoSkip: false, maxRotation: 0, minRotation: 0, callback: (v, i) => (i + 1) % 48 === 0 ? i + 1 : '' } }), y: axisY('', { min: -0.2, max: 1 }) } } });
  const an = D.anomaly;
  $('#eda-anom').textContent = `Deteksi anomali (simpangan dari median bergulir 168 jam melebihi 5 × MAD) menandai ${an.n} titik: ${an.ts.map((t, i) => `${dShort(t)} pukul ${t.slice(11)} (${nf(an.v[i], 1)} MWh)`).join(' dan ')}. Titik ini dibiarkan apa adanya karena tidak berada di periode uji.`;
}
function drawEdaDaily() {
  const idx = WD.dates.map((d, i) => i).filter(i => state.range === 'all' || WD.dates[i].startsWith(state.range));
  const labels = idx.map(i => WD.dates[i]), v = idx.map(i => dailyLoad[i]);
  const roll = v.map((_, i) => i < 6 ? null : mean(v.slice(i - 6, i + 1)));
  const ti = labels.indexOf(D.meta.test_start), ci = labels.indexOf(D.meta.covid_start);
  $('#eda-daily-sub').textContent = `${labels.length} hari, ${dShort(labels[0])} sampai ${dShort(labels.at(-1))}. Rata-rata ${nf(mean(v), 0)} MWh, minimum ${nf(Math.min(...v), 0)} MWh, maksimum ${nf(Math.max(...v), 0)} MWh.${ti >= 0 ? ' Area abu-abu adalah periode uji (178 hari).' : ''}`;
  chart('eda-daily', { type: 'line',
    data: { labels, datasets: [line('Rata-rata harian', v, state.week ? '#c9c3b3' : INK, { borderWidth: 1.2, tension: 0 }), ...(state.week ? [line('Rata-rata 7 hari', roll, INK, { borderWidth: 2 })] : [])] },
    options: { plugins: { legend: { display: state.week }, tooltip: { callbacks: { title: x => dLong(x[0].label), label: mwh } },
        marks: { bands: ti >= 0 ? [{ from: ti, to: labels.length - 1, color: 'rgba(29,29,27,.07)', label: 'Periode uji' }] : [], lines: ci >= 0 ? [{ at: ci, color: INK, dash: [4, 3], label: '15 Mar 2020: pembatasan COVID-19', side: 'left', y: 16 }] : [] } },
      scales: { x: axisX({ ticks: { maxTicksLimit: 8, color: INK2, callback(x) { return dShort(this.getLabelForValue(x)).slice(state.range === 'all' ? -8 : 0); } } }), y: axisY('MWh') } } });
}
function drawWeek() {
  const start = $('#eda-date').value || '2020-04-06';
  const i0 = Math.max(0, Math.round((utc(start).getTime() + 3600e3 - H0) / 3600e3));
  const v = hourly.slice(i0, i0 + 168);
  const labels = v.map((_, k) => new Date(H0 + (i0 + k) * 3600e3).toISOString().slice(0, 16).replace('T', ' '));
  const bands = [];
  for (let d = 0; d < 7; d++) { const day = labels[d * 24]?.slice(0, 10), di = dIdx[day]; if (di != null && WD.holiday[di]) bands.push({ from: d * 24, to: d * 24 + 23, color: 'rgba(29,29,27,.08)', label: 'Libur' }); }
  const pk = v.indexOf(Math.max(...v));
  $('#eda-week-title').textContent = `Beban per jam, ${dShort(start)} sampai ${dShort(labels.at(-1))}`;
  $('#eda-week-sub').textContent = `Rata-rata ${nf(mean(v), 0)} MWh. Puncak ${nf(v[pk], 0)} MWh pada ${dLong(labels[pk])} pukul ${labels[pk].slice(11).replace(':', '.')}.${bands.length ? ` ${bands.length} hari libur nasional dalam minggu ini.` : ''}`;
  chart('eda-hourly', { type: 'line', data: { labels, datasets: [line('Beban per jam', v, INK, { borderWidth: 1.8, tension: 0.2 })] },
    options: { plugins: { legend: { display: false }, marks: { bands }, tooltip: { callbacks: { title: x => `${dLong(x[0].label)}, ${x[0].label.slice(11).replace(':', '.')}`, label: mwh } } },
      scales: { x: axisX({ ticks: { autoSkip: false, maxRotation: 0, color: INK2, callback(x) { const l = this.getLabelForValue(x); return l.slice(11, 13) === '12' ? DAYL[utc(l).getUTCDay()].slice(0, 3) + ' ' + utc(l).getUTCDate() : ''; } } }), y: axisY('MWh') } } });
}
seg('#eda-range', 'range', drawEdaDaily);
$('#eda-week').onchange = e => { state.week = e.target.checked; drawEdaDaily(); };
$('#eda-date').onchange = drawWeek;
$$('#eda-preset button').forEach(b => b.onclick = () => { $('#eda-date').value = b.dataset.v; drawWeek(); });

/* ============================================================ CUACA */
const colOf = (v, c) => `${v}_${CITIES[c].code}`;
function wPoints() {
  const xs = WD[colOf(state.wvar, state.city)], out = [];
  WD.dates.forEach((d, i) => {
    if (state.days === 'kerja') { const wd = utc(d).getUTCDay(); if (wd === 0 || wd === 6 || WD.holiday[i] || d >= D.meta.covid_start) return; }
    out.push({ x: xs[i], y: dailyLoad[i], d });
  });
  return out;
}
const ols = pts => {
  const n = pts.length, mx = mean(pts.map(p => p.x)), my = mean(pts.map(p => p.y));
  let sxy = 0, sxx = 0, syy = 0;
  pts.forEach(p => { sxy += (p.x - mx) * (p.y - my); sxx += (p.x - mx) ** 2; syy += (p.y - my) ** 2; });
  return { b: sxy / sxx, a: my - (sxy / sxx) * mx, r: sxy / Math.sqrt(sxx * syy), sd: Math.sqrt(sxx / (n - 1)), n };
};
function renderWeather() {
  $$('#w-city button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === state.city)));
  const V = WVAR[state.wvar], C = CITIES[state.city], pts = wPoints(), f = ols(pts);
  const xs = pts.map(p => p.x), x0 = Math.min(...xs), x1 = Math.max(...xs);
  $('#w-sc-title').textContent = `${V.name} harian di ${state.city} vs beban harian nasional`;
  $('#w-sc-sub').textContent = `${nf(f.n, 0)} hari, ${state.days === 'kerja' ? 'hanya hari kerja biasa sebelum 15 Maret 2020 (tanpa akhir pekan, libur, dan masa COVID-19)' : 'semua hari 2015–2020'}. Garis hitam adalah regresi linear.`;
  chart('w-scatter', { type: 'scatter',
    data: { datasets: [
      { label: 'Hari', data: pts, backgroundColor: hexA(INK, .32), borderColor: hexA(INK, .32), pointRadius: 3, pointHoverRadius: 5 },
      { type: 'line', label: 'Regresi', data: [{ x: x0, y: f.a + f.b * x0 }, { x: x1, y: f.a + f.b * x1 }], borderColor: INK, borderWidth: 2, pointRadius: 0 }] },
    options: { interaction: { mode: 'nearest', intersect: true }, plugins: { legend: { display: false },
        tooltip: { filter: x => x.datasetIndex === 0, callbacks: { title: x => dLong(x[0].raw.d), label: x => [`${V.label}: ${nf(x.raw.x, V.d)}`, `Beban: ${nf(x.raw.y, 0)} MWh`] } } },
      scales: { x: { title: { display: true, text: `${V.label}, ${state.city}`, color: INK2 }, grid: { color: GRID }, border: { color: INK } }, y: axisY('Beban harian (MWh)') } } });

  const within = rows(W.r_within).find(r => r._i === V.nb)?.[state.city];
  const hourlyR = rows(W.corr).find(r => r._i === colOf(state.wvar, state.city));
  $('#w-stats').innerHTML = [
    [nf(f.r, 2), 'korelasi r (titik di plot)'], [nf(f.r ** 2 * 100, 1) + '%', 'variasi beban harian yang terjelaskan (R²)'],
    [state.wvar === 'T2M' ? sgn(f.b, 1) : sgn(f.b * f.sd, 1), state.wvar === 'T2M' ? 'MWh per kenaikan 1 °C' : 'MWh per kenaikan 1 simpangan baku']
  ].map(([b, s]) => `<div><b>${b}</b><span>${s}</span></div>`).join('');
  $('#w-insight').innerHTML = `Pada data per jam, korelasi ${V.name.toLowerCase()} ${state.city} dengan beban adalah r = ${nf(hourlyR.r_per_jam, 2)}. Di dalam jam yang sama, korelasinya hanya r = ${nf(within, 2)}. ` +
    (Math.abs(hourlyR.r_per_jam) > Math.abs(within) + 0.15 ? 'Sebagian besar korelasi per jam berasal dari pola harian bersama (siang lebih panas dan lebih banyak aktivitas), bukan dari pengaruh cuaca itu sendiri.' : 'Hubungannya tidak banyak berubah setelah pola harian dihapus.') +
    ' Inilah alasan kovariat cuaca hanya sedikit menambah akurasi model.';

  const corr = rows(W.corr), wr = rows(W.r_within);
  const val = (v, c) => state.corr === 'within' ? wr.find(r => r._i === WVAR[v].nb)[c] : corr.find(r => r._i === colOf(v, c))[state.corr];
  const cell = r => `<span style="display:block;padding:2px 6px;background:${hexA(INK, Math.min(Math.abs(r), 1) * .3)}">${r < 0 ? '−' + nf(-r, 3) : nf(r, 3)}</span>`;
  table($('#tbl-corr'), ['Variabel', ...Object.keys(CITIES).map(c => c === state.city ? `<u>${c}</u>` : c)],
    Object.keys(WVAR).map(v => [WVAR[v].label, ...Object.keys(CITIES).map(c => cell(val(v, c)))]), r => r[0] === V.label);

  chart('w-rhour', { type: 'line',
    data: { labels: Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0') + '.00'), datasets: Object.entries(W.r_hour).map(([c, v]) => line(c, v, CITIES[c].color, { pointRadius: 3, pointStyle: CITIES[c].pt, borderDash: CITIES[c].dash, borderWidth: c === state.city ? 2.6 : 1.6 })) },
    options: { layout: { padding: { right: padR(80) } }, plugins: { endLabels: { on: true }, tooltip: { callbacks: { label: x => `${x.dataset.label}: r = ${nf(x.parsed.y, 3)}` } },
        marks: { lines: [] } }, scales: { x: axisX(), y: axisY('r Pearson') } } });

  const di = W.diurnal, idx = a => { const m = mean(a); return a.map(x => x / m * 100); };
  $('#w-diur-title').textContent = `Profil harian beban dan ${V.name.toLowerCase()}`;
  chart('w-diurnal', { type: 'line',
    data: { labels: Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0') + '.00'), datasets: [
      line('Beban', idx(di.nat_demand), INK, { borderWidth: 3.2 }),
      ...Object.entries(CITIES).map(([c, o]) => line(`${V.name} ${c}`, idx(di[colOf(state.wvar, c)]), o.color, { borderDash: o.dash, borderWidth: c === state.city ? 2.4 : 1.4, endText: c }))] },
    options: { layout: { padding: { right: padR(80) } }, plugins: { endLabels: { on: true }, tooltip: { callbacks: { label: x => `${x.dataset.label}: ${nf(x.parsed.y, 1)}` } } }, scales: { x: axisX(), y: axisY('Indeks (rata-rata = 100)') } } });

  $('#w-mon-title').textContent = `${V.label} per bulan`;
  chart('w-monthly', { type: 'line',
    data: { labels: MON, datasets: Object.entries(CITIES).map(([c, o]) => line(c, W.monthly[colOf(state.wvar, c)], o.color, { pointRadius: 3, pointStyle: o.pt, borderDash: o.dash, borderWidth: c === state.city ? 2.6 : 1.6 })) },
    options: { layout: { padding: { right: padR(80) } }, plugins: { endLabels: { on: true }, tooltip: { callbacks: { label: x => `${x.dataset.label}: ${nf(x.parsed.y, V.d)} ${V.unit}` } } }, scales: { x: axisX(), y: axisY(V.label) } } });

  const ws = rows(W.stats);
  table($('#tbl-wstats'), ['Kota', 'Variabel', 'Rata-rata', 'Simp. baku', 'Min', 'Maks'],
    ws.map(r => { const d = Math.abs(r['Rata-rata']) < 1 ? 4 : 2; return [r.Kota, NBLAB[r.Variabel] || r.Variabel, nf(r['Rata-rata'], d), nf(r['Simpangan baku'], d), nf(r.Min, d), nf(r.Maks, d)]; }),
    r => r[0] === state.city);
}
seg('#w-city', 'city', renderWeather);
seg('#w-days', 'days', renderWeather);
seg('#w-corr-kind', 'corr', renderWeather);
$('#w-var').onchange = e => { state.wvar = e.target.value; renderWeather(); };

/* ============================================================ PERFORMA */
const regDays = () => BT.origins.map((_, i) => i).filter(i => state.reg === 'Semua' || BT.regime[i] === state.reg);
const absErr = (variant, i) => BT.mean[variant][i].map((v, h) => Math.abs(v - BT.actual[i][h]));
function renderPerf() {
  const metric = state.metric, regLab = state.reg === 'Semua' ? '178 hari uji' : `regime ${state.reg}`;
  const items = MODELS.map(m => ({ m, v: metricOf(variantOf(m), metric) }));
  const cov = metric === 'Cakupan 80% (%)';
  items.sort((a, b) => (a.v == null) - (b.v == null) || (cov ? Math.abs(a.v - 80) - Math.abs(b.v - 80) : a.v - b.v));
  const d = metric.includes('%') ? 2 : metric === 'MASE' || metric === 'WQL' ? 3 : 1;
  $('#p-bar-title').textContent = `${metric} per model, ${regLab}`;
  $('#p-bar-sub').textContent = (cov ? 'Makin dekat ke 80% makin baik.' : 'Makin kecil makin baik.') + (items.some(x => x.v == null) ? ' XGBoost tidak memberi interval, jadi tidak punya nilai untuk metrik ini.' : '');
  chart('p-bar', { type: 'bar',
    data: { labels: items.map(x => labelOf(x.m)), datasets: [{ data: items.map(x => x.v), backgroundColor: items.map(x => x.m.color), borderRadius: { topRight: 4, bottomRight: 4 }, barPercentage: .62 }] },
    options: { indexAxis: 'y', layout: { padding: { right: 70 } }, interaction: { mode: 'nearest', intersect: true },
      plugins: { legend: { display: false }, barValues: { on: true, fmt: v => nf(v, d) }, tooltip: { callbacks: { label: x => `${metric}: ${nf(x.parsed.x, d)}` } },
        marks: {} }, scales: { x: { beginAtZero: true, grid: { color: GRID }, border: { display: false }, ...(cov ? { min: 50, max: 100 } : {}) }, y: { grid: { display: false }, ticks: { color: INK, font: { weight: 600 } } } } } });

  const MET = ['MAE', 'RMSE', 'MAPE (%)', 'MASE', 'WQL', 'Cakupan 80% (%)'];
  const vs = D.meta.variants.map(v => ({ v, r: MET.map(k => metricOf(v, k)) })).sort((a, b) => a.r[0] - b.r[0]);
  const bestCol = MET.map((k, j) => { const c = vs.map(x => x.r[j]).filter(x => x != null); return k.startsWith('Cakupan') ? c.reduce((p, q) => Math.abs(q - 80) < Math.abs(p - 80) ? q : p) : Math.min(...c); });
  $('#p-tbl-sub').textContent = `${regLab}. Angka tebal adalah yang terbaik di tiap kolom. Baris Chronos-2 yang sedang tidak dipilih ditampilkan sebagai pembanding.`;
  table($('#tbl-metrics'), ['Model', 'MAE', 'RMSE', 'MAPE (%)', 'MASE', 'WQL', 'Cakupan 80%'],
    vs.map(x => [sw(VCOLOR[x.v]) + VNAME[x.v], ...x.r.map((v, j) => { const s = nf(v, [1, 1, 2, 3, 4, 1][j]); return v != null && v === bestCol[j] ? `<b>${s}</b>` : s; })]),
    r => r[0].includes(labelOf(MODELS[0])) && !r[0].includes(state.kov ? 'tanpa' : '+ kov'));

  const days = regDays();
  chart('p-horizon', { type: 'line',
    data: { labels: Array.from({ length: 24 }, (_, i) => i + 1), datasets: MODELS.map(m => line(labelOf(m), Array.from({ length: 24 }, (_, h) => mean(days.map(i => absErr(variantOf(m), i)[h]))), m.color, { borderDash: m.dash, endText: m.name })) },
    options: { layout: { padding: { right: padR(100) } }, plugins: { endLabels: { on: true }, tooltip: { callbacks: { title: x => `Horizon ${x[0].label} jam`, label: x => `${x.dataset.label}: ${nf(x.parsed.y, 1)} MWh` } } },
      scales: { x: axisX({ title: { display: true, text: 'Horizon (jam ke depan)', color: INK2 } }), y: axisY('MAE (MWh)', { beginAtZero: true }) } } });

  chart('p-daily', { type: 'line',
    data: { labels: BT.origins, datasets: MODELS.map(m => line(labelOf(m), BT.origins.map((_, i) => mean(absErr(variantOf(m), i))), m.color, { borderDash: m.dash, borderWidth: 1.5, tension: 0.15, endText: m.name })) },
    options: { layout: { padding: { right: padR(100) } }, plugins: { endLabels: { on: true }, tooltip: { callbacks: { title: x => dLong(x[0].label), label: x => `${x.dataset.label}: ${nf(x.parsed.y, 1)} MWh` } },
        marks: { lines: [{ at: covIdx, color: INK, dash: [4, 3], label: 'COVID-19', y: 14 }], bands: state.reg === 'Semua' ? [] : [{ from: state.reg === 'Normal' ? covIdx : 0, to: state.reg === 'Normal' ? BT.origins.length - 1 : covIdx, color: 'rgba(247,245,238,.75)' }] } },
      scales: { x: axisX({ ticks: { maxTicksLimit: 7, color: INK2, callback(v) { return dShort(this.getLabelForValue(v)).slice(0, -5); } } }), y: axisY('MAE harian (MWh)', { beginAtZero: true }) } } });

  const dm = dmRows.filter(r => r.Regime === state.reg);
  table($('#tbl-dm'), ['Model A', 'Model B', 'Selisih MAE (A − B)', 'Statistik DM', 'p-value', 'Kesimpulan (α = 5%)'],
    dm.map(r => [VNAME[r['Model A']], VNAME[r['Model B']], sgn(r['Selisih MAE (A-B)'], 2) + ' MWh', nf(r.DM, 2), pfmt(r['p-value']), r['p-value'] < 0.05 ? `<b>${r['Kesimpulan (alpha 5%)'].replace('A', VNAME[r['Model A']].split(' ')[0]).replace('B', VNAME[r['Model B']])}</b>` : 'Tidak berbeda signifikan']));
  const sig = dm.filter(r => r['p-value'] < 0.05).length;
  $('#dm-note').textContent = `${regLab[0].toUpperCase() + regLab.slice(1)}: ${sig} dari ${dm.length} perbandingan signifikan. Selisih negatif berarti Model A lebih akurat. Varians memakai koreksi HAC (Newey-West, lag 5) karena galat harian saling berkorelasi.`;

  renderFlow();
  const imp = D.importance;
  chart('p-imp', { type: 'bar', data: { labels: imp.f.map(featName), datasets: [{ data: imp.v, backgroundColor: '#5a4aa8', borderRadius: { topRight: 4, bottomRight: 4 }, barPercentage: .7 }] },
    options: { indexAxis: 'y', layout: { padding: { right: 50 } }, interaction: { mode: 'nearest', intersect: true }, plugins: { legend: { display: false }, barValues: { on: true, fmt: v => nf(v, 1) + '%' }, tooltip: { callbacks: { label: x => nf(x.parsed.x, 1) + '% total gain' } } },
      scales: { x: { grid: { color: GRID }, border: { display: false } }, y: { reverse: true, grid: { display: false }, ticks: { color: INK } } } } });
  table($('#tbl-info'), ['Model', 'Jenis', 'Parameter', 'Waktu 178 ramalan'], infoRows.map(r => [sw(VCOLOR[r._i]) + VNAME[r._i], r.jenis.split(' (')[0], r.parameter_juta == null ? 'ratusan pohon' : nf(r.parameter_juta, 1) + ' juta', nf(r.detik, 1) + ' dtk']));
}
const FLOW = {
  c2: { name: 'Chronos-2', org: 'Amazon, 2025', stops: [['Riwayat beban 2.048 jam', 'Sekitar 85 hari terakhir sebelum origin'], ['Kovariat masa lalu dan masa depan', 'Suhu tiga kota, kelembapan Tocumen, libur, sekolah (bisa dimatikan)'], ['Encoder transformer', 'Group attention membaca beban dan kovariat bersama-sama'], ['9 kuantil × 24 jam', 'Kuantil 0,1 sampai 0,9 untuk tiap jam'], ['Median = ramalan', 'Kuantil 0,1 dan 0,9 membentuk interval 80%']],
    what: 'Foundation model deret waktu yang dilatih sebelumnya pada sangat banyak deret dari berbagai bidang. Model ini dipakai zero-shot: tidak ada parameter yang diestimasi ulang pada data Panama. Pengetahuan tentang Panama hanya masuk lewat konteks 2.048 jam yang diberikan pada tiap origin.',
    plus: ['Satu-satunya foundation model di sini yang membaca kovariat masa depan, misalnya hari libur besok.', 'Konteks diperbarui setiap hari, sehingga model cepat menyesuaikan diri dengan level beban baru saat COVID-19.', 'Memberi interval prediksi, bukan hanya satu angka.'],
    minus: ['Dengan kovariat, inferensi di CPU sekitar 1,6 detik per ramalan.', 'Cuaca di backtest adalah nilai observasi, sehingga akurasinya adalah batas atas.'] },
  bolt: { name: 'Chronos-Bolt (small)', org: 'Amazon, 2024', stops: [['Riwayat beban 2.048 jam', 'Hanya beban, tanpa kovariat'], ['Normalisasi skala', 'Deret dibagi rata-rata absolutnya'], ['Potong menjadi patch', 'Beberapa jam digabung menjadi satu token'], ['Encoder-decoder T5', 'Sekitar 48 juta parameter'], ['9 kuantil × 24 jam', 'Langsung untuk seluruh horizon']],
    what: 'Versi Chronos yang lebih kecil dan cepat. Model ini membaca riwayat beban dalam potongan (patch) dan langsung mengeluarkan kuantil untuk 24 jam ke depan, juga secara zero-shot.',
    plus: ['Paling cepat di antara foundation model (sekitar 13 detik untuk 178 ramalan).', 'Interval 80%-nya paling mendekati nominal.'], minus: ['Tidak dapat membaca hari libur atau cuaca.', 'Kalah akurat dari Chronos-2.'] },
  tfm: { name: 'TimesFM 2.0', org: 'Google, 2024', stops: [['Riwayat beban 2.048 jam', 'Hanya beban, tanpa kovariat'], ['Patch input 32 jam', 'Dinormalisasi per deret'], ['Decoder transformer', 'Sekitar 500 juta parameter'], ['Patch output 128 jam', 'Dipotong menjadi 24 jam'], ['Rata-rata dan kuantil', 'Kuantil 0,1 sampai 0,9']],
    what: 'Foundation model decoder-only dari Google yang meramal secara autoregresif per patch. Model ini dipakai zero-shot dengan konteks yang sama seperti Chronos.',
    plus: ['Model terbesar di sini, kuat untuk pola musiman yang panjang.', 'Memberi rata-rata dan kuantil.'], minus: ['Tidak membaca kovariat.', 'Paling berat (sekitar 2 GB) dan lebih lambat di CPU.'] },
  xgb: { name: 'XGBoost', org: 'Chen & Guestrin, 2016', stops: [['Fitur kalender', 'Jam, hari, bulan, hari ke-n dalam tahun'], ['Lag beban', '24, 48, 72, 168, 336 jam dan rata-rata bergulir'], ['Cuaca dan kalender', 'Cuaca tiga kota, libur, sekolah'], ['Gradient boosting', 'Ratusan pohon keputusan dijumlahkan'], ['Satu angka per jam', 'Tanpa interval prediksi']],
    what: 'Model machine learning yang dilatih pada data 2015 sampai Oktober 2019, dengan November–Desember 2019 sebagai validasi untuk early stopping. Semua lag minimal 24 jam, sehingga satu model sah dipakai untuk horizon 1 sampai 24 tanpa bocoran informasi.',
    plus: ['Cepat dan mudah ditafsirkan lewat kepentingan fitur.', 'Memakai cuaca dan hari libur secara langsung.'], minus: ['Tidak melihat jam-jam terakhir sebelum origin, sehingga galat di horizon pendek lebih besar.', 'Tidak dilatih ulang selama periode uji, jadi lambat menyesuaikan diri dengan COVID-19.'] }
};
function renderFlow() {
  $$('#flow-model button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === state.flow)));
  const f = FLOW[state.flow], m = MODELS.find(x => x.key === state.flow), v = m.key === 'c2' ? 'Chronos-2 + kovariat' : m.variant;
  const mape = metricOf(v, 'MAPE (%)', 'Semua');
  $('#flow-card').innerHTML = `<h3>${f.name} <span class="sub" style="display:inline;font-weight:500">· ${f.org} · MAPE ${nf(mape, 2)}%${m.key === 'c2' ? ' (dengan kovariat)' : ''}</span></h3>
    <div class="flow" style="--line:${m.color};margin-top:14px">${f.stops.map(([b, s]) => `<div class="stop"><b>${b}</b><span>${s}</span></div>`).join('')}</div>
    <div class="explain"><div><h4>Cara kerja</h4><p>${f.what}</p></div><div><h4>Kelebihan</h4><ul>${f.plus.map(x => `<li>${x}</li>`).join('')}</ul><h4 style="margin-top:10px">Keterbatasan</h4><ul>${f.minus.map(x => `<li>${x}</li>`).join('')}</ul></div></div>`;
}
seg('#p-reg', 'reg', renderPerf);
seg('#flow-model', 'flow', renderFlow);
$('#p-metric').onchange = e => { state.metric = e.target.value; renderPerf(); };

/* ============================================================ PREDIKSI */
const PROB = MODELS.filter(m => m.key !== 'xgb');
function fillBandSelect(sel, key) {
  sel.innerHTML = `<option value="">Tidak ditampilkan</option>` + PROB.map(m => `<option value="${m.key}"${state[key] === m.key ? ' selected' : ''}>${m.key === 'c2' ? labelOf(m) : m.name}</option>`).join('');
}
const bandSets = (m, lo, hi) => m ? [
  { label: '_lo', data: lo, borderWidth: 0, pointRadius: 0, fill: false, endLabel: false },
  { label: `Interval 80% ${labelOf(m)}`, data: hi, borderWidth: 0, pointRadius: 0, backgroundColor: hexA(m.color, .16), fill: '-1', endLabel: false }] : [];
function renderPred() {
  $('#f-models').innerHTML = MODELS.map(m => `<label class="chk"><input type="checkbox" value="${m.key}"${state.show.has(m.key) ? ' checked' : ''}><i style="background:${m.color}"></i>${m.name}</label>`).join('');
  $$('#f-models input').forEach(c => c.onchange = () => { c.checked ? state.show.add(c.value) : state.show.delete(c.value); drawDay(); });
  fillBandSelect($('#f-band'), 'band'); fillBandSelect($('#u-band'), 'uband');
  $('#s-day').innerHTML = D.scenario.days.map((d, i) => `<option value="${i}"${i === state.sday ? ' selected' : ''}>${dShort(d)}${D.scenario.actual[i] == null ? ' · ramalan masa depan' : BT.holiday[BT.origins.indexOf(d)] ? ' · libur' : ''}</option>`).join('');
  drawDay(); drawScenario(); drawFuture();
}
function drawDay() {
  const i = state.day, o = BT.origins[i];
  $('#f-date').value = o;
  const ds = [line('Aktual', BT.actual[i], INK, { borderWidth: 2.8, endText: 'Aktual' })];
  const bm = MODELS.find(m => m.key === state.band);
  if (bm) { const b = BT.band[variantOf(bm)]; ds.unshift(...bandSets(bm, b.lo[i], b.hi[i])); }
  MODELS.filter(m => state.show.has(m.key)).forEach(m => ds.push(line(labelOf(m), BT.mean[variantOf(m)][i], m.color, { borderDash: m.dash, endText: m.name })));
  const hol = BT.holiday[i];
  $('#f-title').innerHTML = `${dLong(o)} <span class="tag">${BT.regime[i]}</span>${hol ? '<span class="tag red">Libur nasional</span>' : ''}`;
  $('#f-sub').textContent = `Ramalan dibuat ${dShort(o)} pukul 00.00 untuk jam 01.00 sampai 24.00.${bm ? ` Area berwarna adalah interval 80% ${labelOf(bm)}.` : ''}`;
  chart('f-chart', { type: 'line', data: { labels: hourLabels, datasets: ds },
    options: { layout: { padding: { right: padR(110) } }, plugins: { legend: { labels: { filter: x => x.text !== '_lo' } }, endLabels: { on: true }, tooltip: { filter: x => x.dataset.label !== '_lo', callbacks: { label: mwh } } },
      scales: { x: axisX({ ticks: { maxTicksLimit: 12, color: INK2 } }), y: axisY('MWh') } } });
  const errs = MODELS.map(m => { const a = absErr(variantOf(m), i); return { m, mae: mean(a), mape: mean(a.map((e, h) => e / BT.actual[i][h] * 100)) }; }).sort((a, b) => a.mae - b.mae);
  table($('#tbl-day'), ['Model', 'MAE (MWh)', 'MAPE'], errs.map(e => [sw(e.m.color) + labelOf(e.m), nf(e.mae, 1), nf(e.mape, 2) + '%']), (_, k) => k === 0);
  $('#f-note').textContent = `Paling akurat hari ini: ${labelOf(errs[0].m)}.` + (hol ? ' Hari libur menurunkan beban. Model yang membaca indikator libur (Chronos-2 dengan kovariat dan XGBoost) biasanya lebih siap menghadapinya.' : '');
}
$('#f-date').onchange = e => { const k = BT.origins.indexOf(e.target.value); if (k >= 0) { state.day = k; drawDay(); } };
$('#f-prev').onclick = () => { state.day = Math.max(0, state.day - 1); drawDay(); };
$('#f-next').onclick = () => { state.day = Math.min(BT.origins.length - 1, state.day + 1); drawDay(); };
$('#f-band').onchange = e => { state.band = e.target.value; drawDay(); };

function drawScenario() {
  const S = D.scenario, i = state.sday, src = S[state.smodel][state.scity], off = state.soff;
  const base = src['0'][i], scen = src[String(off)][i], act = S.actual[i];
  const m = MODELS.find(x => x.key === state.smodel), name = state.smodel === 'c2' ? 'Chronos-2 + kovariat' : 'XGBoost';
  $('#s-off-out').textContent = (off > 0 ? '+' : off < 0 ? '−' : '±') + Math.abs(off) + ' °C';
  const ds = [];
  if (act) ds.push(line('Aktual', act, INK, { borderWidth: 2.6, endText: 'Aktual' }));
  ds.push(line(`${name}, suhu asli`, base, MUTED, { borderDash: [5, 4], endText: 'Suhu asli' }));
  ds.push(line(`${name}, suhu ${$('#s-off-out').textContent}`, scen, m.color, { borderWidth: 2.6, endText: 'Skenario' }));
  const where = state.scity === 'Semua kota' ? 'ketiga kota' : state.scity;
  $('#s-title').textContent = `${dLong(S.days[i])}: ${name}, suhu ${where} ${$('#s-off-out').textContent}`;
  $('#s-sub').textContent = act ? 'Garis hitam adalah aktual; garis abu-abu putus-putus adalah ramalan dengan suhu asli.' : 'Hari ini di luar data (tidak ada aktual). Cuaca dasarnya adalah asumsi persistensi 24 jam terakhir.';
  chart('s-chart', { type: 'line', data: { labels: hourLabels, datasets: ds },
    options: { layout: { padding: { right: padR(90) } }, plugins: { endLabels: { on: true }, tooltip: { callbacks: { label: mwh } } }, scales: { x: axisX({ ticks: { maxTicksLimit: 12, color: INK2 } }), y: axisY('MWh') } } });
  const dlt = scen.map((v, h) => v - base[h]), md = mean(dlt), mx = dlt.reduce((p, q) => Math.abs(q) > Math.abs(p) ? q : p, 0), hx = dlt.indexOf(mx);
  const pk0 = Math.max(...base), pk1 = Math.max(...scen);
  $('#s-delta').innerHTML = [[sgn(md, 1) + ' MWh', 'perubahan rata-rata per jam'], [sgn(md / mean(base) * 100, 2) + '%', 'terhadap ramalan suhu asli'],
    [sgn(mx, 1) + ' MWh', `perubahan terbesar, pukul ${hourLabels[hx]}`], [sgn(pk1 - pk0, 1) + ' MWh', 'perubahan beban puncak']].map(([b, s]) => `<div><b>${b}</b><span>${s}</span></div>`).join('');
  $('#s-note').textContent = state.smodel === 'xgb'
    ? 'XGBoost memakai suhu pada jam yang sama sebagai fitur. Pohon keputusan memotong suhu pada ambang tertentu, sehingga responsnya bertangga dan bisa nol untuk perubahan kecil.'
    : 'Chronos-2 membaca kovariat secara in-context. Besarnya respons ditentukan oleh hubungan suhu–beban yang terlihat pada 85 hari konteks, bukan oleh parameter yang dilatih.';
  const sens = rows(S.sens);
  table($('#tbl-sens'), ['Suhu diubah di', ...D.scenario.sens.columns], sens.map(r => [r._i, ...D.scenario.sens.columns.map(c => sgn(r[c], 2))]), r => r[0] === state.scity);
}
seg('#s-model', 'smodel', drawScenario);
seg('#s-city', 'scity', drawScenario);
$('#s-day').onchange = e => { state.sday = +e.target.value; drawScenario(); };
$('#s-off').oninput = e => { state.soff = +e.target.value; drawScenario(); };

function drawFuture() {
  const F = D.future, K = 48, hist = F.hist.slice(-K), hts = F.hist_ts.slice(-K), n = hist.length, last = hist[n - 1];
  const labels = [...hts, ...F.ts], pad = k => Array(k).fill(null);
  const ds = [line('Aktual', [...hist, ...pad(24)], INK, { borderWidth: 1.8, tension: 0.2, endLabel: false })];
  const bm = MODELS.find(m => m.key === state.uband);
  if (bm) { const b = F.band[variantOf(bm)]; ds.unshift(...bandSets(bm, [...pad(n), ...b.lo], [...pad(n), ...b.hi])); }
  MODELS.forEach(m => ds.push(line(labelOf(m), [...pad(n - 1), last, ...F.mean[variantOf(m)]], m.color, { borderDash: m.dash, endText: m.name })));
  chart('u-chart', { type: 'line', data: { labels, datasets: ds },
    options: { layout: { padding: { right: padR(100) } }, plugins: { legend: { labels: { filter: x => x.text !== '_lo' } }, endLabels: { on: true }, tooltip: { filter: x => x.dataset.label !== '_lo' && x.parsed.y != null, callbacks: { title: x => `${dLong(x[0].label)}, ${x[0].label.slice(11).replace(':', '.')}`, label: mwh } },
        marks: { bands: [{ from: n - 1, to: labels.length - 1, color: 'rgba(29,29,27,.06)', label: 'Ramalan' }] } },
      scales: { x: axisX({ ticks: { autoSkip: false, maxRotation: 0, color: INK2, callback(x) { const l = this.getLabelForValue(x); return l.slice(11, 13) === '12' ? DAYL[utc(l).getUTCDay()].slice(0, 3) + ' ' + utc(l).getUTCDate() : ''; } } }), y: axisY('MWh') } } });
  table($('#tbl-future'), ['Jam', ...MODELS.map(m => labelOf(m))], F.ts.map((t, h) => [dShort(t) + ', ' + t.slice(11).replace(':', '.'), ...MODELS.map(m => nf(F.mean[variantOf(m)][h], 0))]));
}
$('#u-band').onchange = e => { state.uband = e.target.value; drawFuture(); };

/* ============================================================ routing & shared controls */
const RENDER = { beranda: renderHome, eksplorasi: renderEDA, cuaca: renderWeather, performa: renderPerf, prediksi: renderPred };
let current = null;
function route() {
  const t = (location.hash || '#beranda').slice(1), tab = RENDER[t] ? t : 'beranda';
  $$('section[data-tab]').forEach(s => s.classList.toggle('on', s.dataset.tab === tab));
  $$('.tabs a').forEach(a => a.getAttribute('href') === '#' + tab ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current'));
  if (current !== null) scrollTo({ top: 0 });
  current = tab; RENDER[tab]();
  $('.tabs a[aria-current]')?.scrollIntoView({ inline: 'center', block: 'nearest' });
}
$$('.kov').forEach(c => c.onchange = () => { state.kov = c.checked; $$('.kov').forEach(x => { x.checked = state.kov; }); RENDER[current](); });
addEventListener('hashchange', route);
route();
