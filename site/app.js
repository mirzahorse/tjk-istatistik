"use strict";
// ---------- veri ----------
const RAW = window.TJK_DATA, Dc = RAW.dict, R = RAW.races, S = RAW.starts;
const AY = ['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara'];
const races = R.t.map((_, i) => ({
  i, tarih: Dc.t[R.t[i]], hip: Dc.h[R.h[i]], no: R.no[i], ad: Dc.ad[R.ad[i]], sinif: Dc.sn[R.sn[i]], tur: Dc.tur[R.tur[i]],
  irk: Dc.irk[R.irk[i]], mes: R.m[i], pist: Dc.p[R.p[i]], rekor: Dc.rek[R.rek[i]], ikr: R.ikr[i], saat: Dc.saat[R.saat[i]], n: R.n[i]
}));
for (const r of races) { const d = new Date(r.tarih + 'T12:00:00'); r.dow = d.getDay(); r.saatH = parseInt(r.saat, 10); }
const rows = S.r.map((ri, i) => {
  const rc = races[ri], s = S.s[i];
  return {
    rc, sira: Math.abs(s), derecesiz: s < 0, at: Dc.at[S.at[i]], baba: Dc.ba[S.ba[i]], anne: Dc.an[S.an[i]], yas: S.y[i], renk: Dc.rk[S.rk[i]],
    cins: Dc.c[S.c[i]], kilo: S.kg[i] / 10, fazla: S.fz[i] / 10, jokey: Dc.j[S.j[i]], ap: S.ap[i] === 1, sahip: Dc.sh[S.sh[i]], antr: Dc.tr[S.an2[i]],
    st: S.st[i], ds: S.ds[i] === 1, agf: S.agf[i], hp: S.hp[i] < 0 ? null : S.hp[i], sn: S.sn[i] < 0 ? null : S.sn[i] / 100,
    g: S.g[i] < 0 ? null : S.g[i] / 100, kz: S.kz ? S.kz[i] : 0, fark: Dc.f[S.f[i]], ekip: Dc.e[S.e[i]], yeni: Dc.e[S.ye[i]], ara: S.ara[i]
  };
});
for (const r of rows) { r.k = r.at + '|' + r.baba + '|' + r.anne; r.w = r.sira === 1; r.i3 = r.sira <= 3 && !r.derecesiz; }
// favori: koşudaki en düşük ganyan
const minG = new Map();
for (const r of rows) if (r.g > 0 && (!minG.has(r.rc.i) || r.g < minG.get(r.rc.i))) minG.set(r.rc.i, r.g);
for (const r of rows) r.fav = r.g > 0 && r.g === minG.get(r.rc.i);

// ---------- biçim ----------
const nf = new Intl.NumberFormat('tr-TR'), nf1 = new Intl.NumberFormat('tr-TR', {minimumFractionDigits: 1, maximumFractionDigits: 1}), nf2 = new Intl.NumberFormat('tr-TR', {minimumFractionDigits: 2, maximumFractionDigits: 2});
const N = (v) => nf.format(v), P = (v) => '%' + nf1.format(v), M = (v) => nf1.format(v / 1e6) + ' mn ₺';
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const tarih = (s) => { const [y, m, d] = s.split('-'); return `${+d} ${AY[+m - 1]} ${y}`; };
const derece = (sn) => { if (sn == null) return '—'; const m = Math.floor(sn / 60), s = sn - m * 60; return `${m}.${s.toFixed(2).padStart(5, '0')}`; };
const U = (s) => String(s || '').toLocaleUpperCase('tr').trim();
// TJK isimleri kısaltmalı tutar (B.AKÇAY, M.M.BİLGİN, SAL.ÇELİK): "Burak Akçay" yazınca da bulunsun
function adEslesir(kisa, sorgu) {
  const A = U(kisa).replace(/\s+/g, ' '), q = U(sorgu).replace(/\s+/g, ' ');
  if (!q) return false;
  if (A.includes(q)) return true;
  const k = q.split(' '); if (k.length < 2) return false;
  const p = A.split('.').map((x) => x.trim()).filter(Boolean); if (p.length < 2) return false;
  const soy = p[p.length - 1], bas = p.slice(0, -1), adlar = k.slice(0, -1), sq = k[k.length - 1];
  if (!(soy.startsWith(sq) || sq.startsWith(soy))) return false;
  return bas.length <= adlar.length && bas.every((b, i) => adlar[i].startsWith(b));
}
window.adEslesir = adEslesir;
const pct = (w, s) => (s ? 100 * w / s : 0);
const sum = (a, f) => a.reduce((t, x) => t + f(x), 0);

// ---------- istatistik yardımcıları ----------
// grup: {start, bir, i3, ikr (toplam kazanç: ilk 5 ikramiyeleri), oyn (ganyanlı start), don (kazananların ganyan toplamı)}
function grupla(list, keyf) {
  const m = new Map();
  for (const r of list) {
    const k = keyf(r); if (k == null || k === '') continue;
    let o = m.get(k); if (!o) { o = {k, start: 0, bir: 0, i3: 0, ikr: 0, oyn: 0, don: 0, atlar: new Set(), kazAt: new Set()}; m.set(k, o); }
    o.start++; o.atlar.add(r.k); o.ikr += r.kz;
    if (r.w) { o.bir++; o.kazAt.add(r.k); }
    if (r.i3) o.i3++;
    if (r.g > 0) { o.oyn++; if (r.w) o.don += r.g; }
  }
  for (const o of m.values()) { o.yuzde = pct(o.bir, o.start); o.kar = o.don - o.oyn; o.roi = o.oyn ? 100 * o.kar / o.oyn : 0; }
  return [...m.values()];
}
const oranlar = (list, keyf, keys) => { const g = new Map(grupla(list, keyf).map((o) => [o.k, o])); return keys.map((k) => ({k, ...(g.get(k) || {start: 0, bir: 0, yuzde: 0})})); };

// ---------- grafikler (SVG) ----------
function cubuk(data, o = {}) { // data: [{k, v, alt}]
  if (!data.length || !data.some((d) => d.v > 0)) return '<div class="empty">Bu filtrelerle veri yok.</div>';
  const W = 560, H = o.h || 210, ml = 8, mb = 34, mt = 18, bw = (W - ml) / data.length, max = Math.max(...data.map((d) => d.v)) || 1;
  const f = o.fmt || N;
  let s = `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="${esc(o.aria || '')}">`;
  data.forEach((d, i) => {
    const h = (H - mb - mt) * d.v / max, x = ml + i * bw + bw * 0.15, w = bw * 0.7, y = H - mb - h;
    s += `<rect class="${d.ikinci ? 'bar2' : 'bar'}" x="${x}" y="${y}" width="${w}" height="${Math.max(h, 0.5)}" rx="2"><title>${esc(d.k)}: ${esc(f(d.v))}${d.alt ? ' · ' + esc(d.alt) : ''}</title></rect>`;
    if (bw > 30) s += `<text class="val" x="${x + w / 2}" y="${y - 4}" text-anchor="middle">${esc(f(d.v))}</text>`;
    s += `<text x="${x + w / 2}" y="${H - mb + 14}" text-anchor="middle">${esc(d.k)}</text>`;
    if (d.alt && bw > 44) s += `<text x="${x + w / 2}" y="${H - mb + 27}" text-anchor="middle">${esc(d.alt)}</text>`;
  });
  return s + '</svg>';
}
function yatay(data, o = {}) {
  if (!data.length) return '<div class="empty">Bu filtrelerle veri yok.</div>';
  const W = 560, bh = 24, H = data.length * bh + 4, lw = o.lw || 110, max = Math.max(...data.map((d) => d.v)) || 1, f = o.fmt || N;
  let s = `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="${esc(o.aria || '')}">`;
  data.forEach((d, i) => {
    const y = 2 + i * bh, w = (W - lw - 70) * d.v / max;
    s += `<text x="${lw - 8}" y="${y + bh / 2 + 4}" text-anchor="end">${esc(d.k)}</text><rect class="bar" x="${lw}" y="${y + 4}" width="${Math.max(w, 1)}" height="${bh - 8}" rx="2"><title>${esc(d.k)}: ${esc(f(d.v))}</title></rect><text class="val" x="${lw + w + 6}" y="${y + bh / 2 + 4}">${esc(f(d.v))}</text>`;
  });
  return s + '</svg>';
}
function cizgi(pts, o = {}) { // pts: [{x: label, y}]
  if (pts.length < 2) return '<div class="empty">Grafik için en az iki değer gerekiyor.</div>';
  const W = 560, H = 200, ml = 34, mr = 10, mt = 14, mb = 26;
  const ys = pts.map((p) => p.y), lo = Math.min(...ys), hi = Math.max(...ys), pad = Math.max(2, (hi - lo) * 0.1), y0 = lo - pad, y1 = hi + pad;
  const X = (i) => ml + (W - ml - mr) * (pts.length === 1 ? 0.5 : i / (pts.length - 1)), Y = (v) => mt + (H - mt - mb) * (1 - (v - y0) / (y1 - y0));
  let s = `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="${esc(o.aria || '')}">`;
  for (const t of [y0, (y0 + y1) / 2, y1]) s += `<line class="grd" x1="${ml}" x2="${W - mr}" y1="${Y(t)}" y2="${Y(t)}"/><text x="${ml - 4}" y="${Y(t) + 4}" text-anchor="end">${Math.round(t)}</text>`;
  s += `<polyline class="ln" points="${pts.map((p, i) => X(i) + ',' + Y(p.y)).join(' ')}"/>`;
  pts.forEach((p, i) => { s += `<circle class="dot" cx="${X(i)}" cy="${Y(p.y)}" r="3.5"><title>${esc(p.x)}: ${p.y}</title></circle>`; });
  const step = Math.ceil(pts.length / 6);
  pts.forEach((p, i) => { if (i % step === 0 || i === pts.length - 1) s += `<text x="${X(i)}" y="${H - 8}" text-anchor="middle">${esc(p.x)}</text>`; });
  return s + '</svg>';
}
function tablo(cols, list, o = {}) { // cols: [[başlık, fn(row), sağa?, sınıf fn?]]
  if (!list.length) return `<div class="empty">${o.bos || 'Bu filtrelerle sonuç yok.'}</div>`;
  let s = `<div class="tw${o.tall ? ' tall' : ''}"><table><thead><tr>${cols.map((c) => `<th${c[2] ? ' class="r"' : ''}>${esc(c[0])}</th>`).join('')}</tr></thead><tbody>`;
  list.forEach((r, i) => { s += '<tr>' + cols.map((c) => { const v = c[1](r, i), cl = [c[2] ? 'r' : '', c[3] ? c[3](r) : ''].filter(Boolean).join(' '); return `<td${cl ? ` class="${cl}"` : ''}>${esc(v)}</td>`; }).join('') + '</tr>'; });
  return s + '</tbody></table></div>';
}
const kart = (baslik, aciklama, govde, id = '') => `<section class="card"${id ? ` id="${id}"` : ''}><h2>${esc(baslik)}</h2>${aciklama ? `<p class="d">${esc(aciklama)}</p>` : ''}${govde}</section>`;
const kutu = (k, v, s = '') => `<div class="tile"><div class="k">${esc(k)}</div><div class="v">${esc(v)}</div>${s ? `<div class="s">${esc(s)}</div>` : ''}</div>`;
const karCls = (r) => (r.kar > 0 ? 'pos' : r.kar < 0 ? 'neg' : '');

// ---------- filtreler ----------
const F = {bas: '', bit: '', hip: [], pist: [], irk: [], mes: [], tur: [], yas: [], cins: []};
const $ = (id) => document.getElementById(id);
const uniq = (f) => [...new Set(races.map(f))];
const SECENEK = {
  hip: uniq((r) => r.hip).sort((a, b) => a.localeCompare(b, 'tr')).map((v) => [v, v]),
  pist: ['Kum', 'Çim', 'Sentetik'].map((v) => [v, v]),
  irk: ['İngiliz', 'Arap'].map((v) => [v, v]),
  mes: uniq((r) => r.mes).sort((a, b) => a - b).map((v) => [String(v), nf.format(v) + ' m']),
  tur: ['Maiden', 'Şartlı', 'Handikap', 'Kısa Vade Handikap', 'KV', 'Satış', 'Grup 1', 'Grup 2', 'Grup 3', 'Amatör'].filter((t) => uniq((r) => r.tur).includes(t)).map((v) => [v, v]),
  yas: [['2', '2 yaşlı'], ['3', '3 yaşlı'], ['4', '4 yaşlı'], ['5', '5 ve yukarı']],
  cins: [['Erkek', 'Erkek'], ['Dişi', 'Dişi']]
};
// çoklu seçim kutusu
function msEtiket(el) {
  const k = el.dataset.k, sec = F[k], b = el.querySelector('.ms-btn');
  const ad = (v) => (SECENEK[k].find((o) => o[0] === v) || [v, v])[1];
  b.textContent = !sec.length ? 'Tümü' : sec.length === 1 ? ad(sec[0]) : sec.length + ' seçili';
  b.title = sec.map(ad).join(', ');
  b.classList.toggle('dolu', sec.length > 0);
}
document.querySelectorAll('.ms').forEach((el) => {
  const k = el.dataset.k;
  el.innerHTML = `${esc(el.dataset.ad)}<button type="button" class="ms-btn" aria-haspopup="true" aria-expanded="false"></button>
    <div class="ms-pop" hidden role="group" aria-label="${esc(el.dataset.ad)}"><div class="ms-ust"><button type="button" data-hepsi>Hepsini seç</button><button type="button" data-temiz>Temizle</button></div>
    ${SECENEK[k].map(([v, t]) => `<label><input type="checkbox" value="${esc(v)}">${esc(t)}</label>`).join('')}</div>`;
  const btn = el.querySelector('.ms-btn'), pop = el.querySelector('.ms-pop');
  const uygula = () => { F[k] = [...pop.querySelectorAll('input:checked')].map((i) => i.value); msEtiket(el); ciz(); };
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const ac = pop.hidden;
    document.querySelectorAll('.ms-pop').forEach((p) => { p.hidden = true; p.previousElementSibling.setAttribute('aria-expanded', 'false'); });
    pop.hidden = !ac; btn.setAttribute('aria-expanded', String(ac));
  });
  pop.addEventListener('click', (e) => e.stopPropagation());
  pop.addEventListener('change', uygula);
  pop.querySelector('[data-hepsi]').addEventListener('click', () => { pop.querySelectorAll('input').forEach((i) => { i.checked = true; }); uygula(); });
  pop.querySelector('[data-temiz]').addEventListener('click', () => { pop.querySelectorAll('input').forEach((i) => { i.checked = false; }); uygula(); });
  msEtiket(el);
});
document.addEventListener('click', () => document.querySelectorAll('.ms-pop').forEach((p) => { p.hidden = true; p.previousElementSibling.setAttribute('aria-expanded', 'false'); }));
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') document.querySelectorAll('.ms-pop').forEach((p) => { p.hidden = true; }); });
for (const id of ['f_bas', 'f_bit']) {
  $(id).min = RAW.ilk; $(id).max = RAW.son;
  $(id).addEventListener('change', () => { const el = $(id); if (el.value && !el.validity.valid) return; F[id === 'f_bas' ? 'bas' : 'bit'] = el.value; ciz(); });
}
$('dahaFiltre').addEventListener('click', () => {
  const ac = $('filtreEk').hidden; $('filtreEk').hidden = !ac;
  $('dahaFiltre').setAttribute('aria-expanded', String(ac)); $('dahaFiltre').textContent = ac ? 'Daha az filtre' : 'Daha fazla filtre';
});
$('temizle').addEventListener('click', () => {
  F.bas = F.bit = ''; $('f_bas').value = $('f_bit').value = '';
  document.querySelectorAll('.ms').forEach((el) => { F[el.dataset.k] = []; el.querySelectorAll('input').forEach((i) => { i.checked = false; }); msEtiket(el); });
  ciz();
});

let cache = {key: '', list: rows};
function suzulmus() {
  const key = JSON.stringify(F);
  if (cache.key === key) return cache.list;
  const list = rows.filter((r) => {
    const c = r.rc;
    const yok = (a) => !a.length;
    return (!F.bas || c.tarih >= F.bas) && (!F.bit || c.tarih <= F.bit) && (yok(F.hip) || F.hip.includes(c.hip)) && (yok(F.pist) || F.pist.includes(c.pist)) &&
      (yok(F.irk) || F.irk.includes(c.irk)) && (yok(F.mes) || F.mes.includes(String(c.mes))) && (yok(F.tur) || F.tur.includes(c.tur)) &&
      (yok(F.yas) || F.yas.some((v) => (v === '5' ? r.yas >= 5 : r.yas === +v))) && (yok(F.cins) || F.cins.includes(r.cins));
  });
  cache = {key, list};
  return list;
}

// ---------- sekmeler ----------
let sekme = 'genel';
const durum = {atAra: '', atSec: '', olcutJ: 'bir', olcutA: 'bir', kisiAra: '', aygirAra: '', kisrakAra: ''};
document.querySelectorAll('#sekmeler button').forEach((b) => b.addEventListener('click', () => {
  sekme = b.dataset.tab; window.tjkIzle?.(b.textContent.trim()); document.querySelectorAll('#sekmeler button').forEach((x) => x.classList.toggle('on', x === b)); ciz(); history.replaceState(null, '', '#' + sekme);
}));

// ---------- jokey olmaya kalan (apranti) ----------
// TJK listesinin son kopyası + o tarihten sonraki apranti galibiyetleri (her saat güncellenen veriden)
function apranti() {
  const A = RAW.apranti; if (!A || !A.liste?.length) return '';
  const son = new Map(), sonra = new Map(), yil = new Map();
  for (const r of rows) {
    const j = r.jokey;
    if (!son.has(j) || son.get(j) < r.rc.tarih) son.set(j, r.rc.tarih);
    if (r.w) yil.set(j, (yil.get(j) || 0) + 1);
    if (r.w && r.ap && r.rc.tarih > A.tarih) sonra.set(j, (sonra.get(j) || 0) + 1);
  }
  const sinir = new Date(RAW.son + 'T12:00:00'); sinir.setDate(sinir.getDate() - 60);
  const sinirS = sinir.toISOString().slice(0, 10);
  let L = A.liste.map(([ad, kisa, kod, kalan, b1]) => {
    const yeni = sonra.get(kisa) || 0;
    return {ad, kisa, kod, kalan: Math.max(0, kalan - yeni), yeni, b1: b1 + yeni, yil: yil.get(kisa) || 0, son: son.get(kisa) || ''};
  });
  const hepsi = durum.aprHepsi;
  if (!hepsi) L = L.filter((o) => o.son >= sinirS);
  L.sort((a, b) => a.kalan - b.kalan || b.yil - a.yil);
  const kalanCls = (o) => (o.kalan === 0 ? 'pos' : o.kalan <= 5 ? 'pos' : '');
  return kart('Jokey olmaya kalan', 'Aprantilerin jokey olmak için kazanması gereken yarış sayısı. Her yeni galibiyette kendiliğinden azalır.',
    `<div class="ctl"><label class="pngp-kutucuk" style="flex-direction:row;align-items:center;gap:8px;font-size:13px;color:var(--mut)"><input type="checkbox" id="aprHepsi"${hepsi ? ' checked' : ''} style="accent-color:var(--yesil)"> Son 60 günde binmeyenleri de göster</label></div>` +
    tablo([['Apranti', (o) => o.ad], ['Kısa ad', (o) => o.kisa], ['Sınıf', (o) => o.kod], ['Kalan', (o) => (o.kalan === 0 ? 'Jokey oldu' : o.kalan), 1, kalanCls],
      ['Toplam 1.lik', (o) => o.b1, 1], ['2026 1.lik', (o) => o.yil, 1], ['Son biniş', (o) => (o.son ? tarih(o.son) : '—')]], L, {tall: 1, bos: 'Listede gösterilecek apranti yok.'}));
}

function genel(L) {
  const atW = new Map();
  for (const r of L) atW.set(r.k, (atW.get(r.k) || false) || r.w);
  const fav = L.filter((r) => r.fav), ikr = sum(L, (r) => r.kz);
  let h = '<div class="tiles">' + kutu('Koşu', N(new Set(L.map((r) => r.rc.i)).size)) + kutu('Koşan at', N(atW.size)) +
    kutu('Favori kazanma', P(pct(fav.filter((r) => r.w).length, fav.length))) + kutu('Dağıtılan ikramiye', M(ikr)) + '</div>';
  h += '<section class="card pist" id="pist" aria-label="Sezonun önündekiler"></section>';
  h += apranti();
  const ay = new Map(); for (const r of L) { const k = r.rc.tarih.slice(0, 7); if (!ay.has(k)) ay.set(k, new Set()); ay.get(k).add(r.rc.i); }
  const ayD = [...ay].sort().map(([k, s]) => ({k: AY[+k.slice(5) - 1], v: s.size}));
  const hp = new Map(); for (const r of L) { if (!hp.has(r.rc.hip)) hp.set(r.rc.hip, new Set()); hp.get(r.rc.hip).add(r.rc.i); }
  const hpD = [...hp].map(([k, s]) => ({k, v: s.size})).sort((a, b) => b.v - a.v);
  h += '<div class="grid">' + kart('Aylara göre koşu sayısı', '', cubuk(ayD, {aria: 'Aylık koşu sayısı'})) + kart('Hipodromlara göre koşu sayısı', '', yatay(hpD, {aria: 'Hipodrom bazında koşu sayısı'})) + '</div>';
  const surpriz = L.filter((r) => r.w && r.g > 0).sort((a, b) => b.g - a.g).slice(0, 10);
  h += kart('En büyük sürprizler', 'En yüksek ganyanla kazanan atlar.', tablo([['Tarih', (r) => tarih(r.rc.tarih)], ['Hipodrom', (r) => r.rc.hip], ['At', (r) => r.at], ['Jokey', (r) => r.jokey], ['Ganyan', (r) => nf2.format(r.g), 1]], surpriz));
  return h;
}

function atlar(L) {
  let h = kart('At ara', 'Adını yazın; atın bu yılki bütün koşuları çıksın.', `<div class="ctl"><label>At adı<input id="atAra" placeholder="ör. MR ÇIRAK" value="${esc(durum.atAra)}"></label></div><div id="atSonuc"></div>`);
  h += kart('At karşılaştır', '2–4 at yazın; yan yana karşılaştırma ve PNG açılsın.', `<div class="ctl kars-giris">${[1, 2, 3, 4].map((i) => `<label>${i}. at<input list="atListe" data-kars="${i}" placeholder="${i <= 2 ? 'zorunlu' : 'isteğe bağlı'}"></label>`).join('')}<button type="button" class="btn" id="karsAc">Karşılaştır</button></div><datalist id="atListe">${[...new Set(rows.map((r) => r.at))].sort((a, b) => a.localeCompare(b, 'tr')).map((a) => `<option value="${esc(a)}">`).join('')}</datalist>`);
  // en çok kazanan
  const g = grupla(L, (r) => r.k);
  const ad = (o) => o.k.split('|')[0], baba = (o) => o.k.split('|')[1];
  const kaz = g.filter((o) => o.bir > 0).sort((a, b) => b.bir - a.bir || b.ikr - a.ikr).slice(0, 15);
  // HP artışı
  const hpm = new Map();
  for (const r of [...L].sort((a, b) => (a.rc.tarih < b.rc.tarih ? -1 : 1))) if (r.hp != null) { const o = hpm.get(r.k) || {k: r.k, ilk: r.hp, son: r.hp, n: 0}; o.son = r.hp; o.n++; hpm.set(r.k, o); }
  const hpArt = [...hpm.values()].filter((o) => o.n >= 3).map((o) => ({...o, fark: o.son - o.ilk})).sort((a, b) => b.fark - a.fark).slice(0, 15);
  // seriler
  const seq = new Map();
  for (const r of [...L].sort((a, b) => (a.rc.tarih < b.rc.tarih ? -1 : a.rc.tarih > b.rc.tarih ? 1 : 0))) {
    const o = seq.get(r.k) || {k: r.k, seri: 0, kazandi: false, sonraki: 0, son: ''}; o.son = r.rc.tarih;
    if (r.w) { o.seri++; o.kazandi = true; o.sonraki = 0; } else { o.seri = 0; if (o.kazandi) o.sonraki++; }
    seq.set(r.k, o);
  }
  const seri = [...seq.values()].filter((o) => o.seri >= 2).sort((a, b) => b.seri - a.seri).slice(0, 15);
  const kuraklik = [...seq.values()].filter((o) => o.kazandi && o.sonraki > 0).sort((a, b) => b.sonraki - a.sonraki).slice(0, 15);
  const hic = g.filter((o) => o.bir === 0).sort((a, b) => b.start - a.start).slice(0, 15);
  h += '<div class="grid">' + kart('En çok kazanan atlar', '', tablo([['At', ad], ['Baba', baba], ['1.lik', (o) => o.bir, 1], ['Start', (o) => o.start, 1], ['Kazanç', (o) => M(o.ikr), 1]], kaz)) +
    kart('Handikap puanı en çok artan atlar', 'İlk ve son koşusundaki HP farkı (en az 3 koşu).', tablo([['At', (o) => o.k.split('|')[0]], ['İlk HP', (o) => o.ilk, 1], ['Son HP', (o) => o.son, 1], ['Artış', (o) => '+' + o.fark, 1, () => 'pos']], hpArt)) + '</div>';
  h += '<div class="grid">' + kart('Seri yapanlar', 'Son koşularını üst üste kazanan atlar.', tablo([['At', (o) => o.k.split('|')[0]], ['Üst üste galibiyet', (o) => o.seri, 1], ['Son koşu', (o) => tarih(o.son)]], seri, {bos: 'Şu an 2+ galibiyet serisi olan at yok.'})) +
    kart('Galibiyetten uzaklaşanlar', 'Daha önce kazanmış ama son galibiyetinden beri en çok koşan atlar.', tablo([['At', (o) => o.k.split('|')[0]], ['Galibiyetsiz koşu', (o) => o.sonraki, 1], ['Son koşu', (o) => tarih(o.son)]], kuraklik)) + '</div>';
  h += kart('En çok koşup hiç kazanamayan atlar', '', tablo([['At', ad], ['Baba', baba], ['Start', (o) => o.start, 1], ['İlk 3', (o) => o.i3, 1]], hic));
  return h;
}
function atKarnesi() {
  const el = $('atSonuc'); if (!el) return;
  const q = U(durum.atAra);
  if (!q) { el.innerHTML = ''; return; }
  const adaylar = [...new Set(rows.filter((r) => r.at.includes(q)).map((r) => r.k))];
  if (!adaylar.length) { el.innerHTML = '<div class="empty">Bu isimde at bulunamadı.</div>'; return; }
  if (!adaylar.includes(durum.atSec)) durum.atSec = adaylar.find((k) => k.split('|')[0] === q) || adaylar[0];
  let h = adaylar.length > 1 ? '<div class="chips">' + adaylar.slice(0, 20).map((k) => `<button class="chip${k === durum.atSec ? ' on' : ''}" data-at="${esc(k)}">${esc(k.split('|')[0])} <small>(${esc(k.split('|')[1])})</small></button>`).join('') + '</div>' : '';
  const L = rows.filter((r) => r.k === durum.atSec).sort((a, b) => (a.rc.tarih < b.rc.tarih ? -1 : 1));
  const [ad, baba, anne] = durum.atSec.split('|'), son = L[L.length - 1];
  h += `<p class="d"><b>${esc(ad)}</b><span data-fav-alan="${esc(durum.atSec)}"></span> · ${esc(son.yas)} yaşlı ${esc(son.renk.toLowerCase())} ${esc(son.cins.toLowerCase())} · ${esc(baba)} – ${esc(anne)} · Antrenör ${esc(son.antr)} · Sahip ${esc(son.sahip)}</p>`;
  h += '<div class="tiles">' + kutu('Start', N(L.length)) + kutu('1.lik', N(L.filter((r) => r.w).length)) + kutu('İlk 3', N(L.filter((r) => r.i3).length)) + kutu('Kazanç', M(sum(L, (r) => r.kz))) + kutu('Son HP', son.hp ?? '—') + '</div>';
  const hpPts = L.filter((r) => r.hp != null).map((r) => ({x: tarih(r.rc.tarih).replace(' 2026', ''), y: r.hp}));
  const MB = (m) => (m <= 1200 ? '≤1200' : m <= 1600 ? '1300–1600' : m <= 2000 ? '1700–2000' : '2100+');
  const uz = grupla(L, (r) => r.rc.pist + ' · ' + MB(r.rc.mes)).sort((a, b) => b.start - a.start);
  h += '<div class="grid">' + kart('Handikap puanı gelişimi', '', cizgi(hpPts, {aria: 'HP gelişimi'})) +
    kart('Pist ve mesafe uzmanlığı', '', tablo([['Pist · mesafe', (o) => o.k], ['Start', (o) => o.start, 1], ['1.lik', (o) => o.bir, 1], ['İlk 3', (o) => o.i3, 1]], uz)) + '</div>';
  h += kart('Koşuları', '', tablo([['Tarih', (r) => tarih(r.rc.tarih)], ['Hipodrom', (r) => r.rc.hip], ['Mesafe', (r) => N(r.rc.mes), 1], ['Pist', (r) => r.rc.pist], ['Sınıf', (r) => r.rc.sinif], ['Sıra', (r) => (r.derecesiz ? 'Derecesiz' : r.sira + '/' + r.rc.n), 1], ['Derece', (r) => derece(r.sn)], ['Jokey', (r) => r.jokey], ['Kilo', (r) => nf1.format(r.kilo), 1], ['Ganyan', (r) => (r.g ? nf2.format(r.g) : '—'), 1], ['HP', (r) => r.hp ?? '—', 1], ['Ekipman', (r) => r.ekip || '—']], [...L].reverse(), {tall: 1}));
  el.innerHTML = h;
  if (window.tjkUye) window.tjkUye.favButon(durum.atSec, el.querySelector('[data-fav-alan]'));
  el.querySelectorAll('[data-at]').forEach((b) => b.addEventListener('click', () => { durum.atSec = b.dataset.at; atKarnesi(); }));
}

// ---------- jokeyler / antrenörler ----------
function siralama(L, alan, olcut, id, baslik, kimAd) {
  let g = grupla(L, alan);
  if (olcut === 'yuzde') g = g.filter((o) => o.start >= 30).sort((a, b) => b.yuzde - a.yuzde);
  else if (olcut === 'ikr') g.sort((a, b) => b.ikr - a.ikr);
  else g.sort((a, b) => b.bir - a.bir || a.start - b.start);
  const sec = `<select id="${id}">${[['bir', 'Birincilik sayısı'], ['yuzde', 'Kazanma yüzdesi'], ['ikr', 'Kazandırdığı ikramiye']].map(([v, t]) => `<option value="${v}"${v === olcut ? ' selected' : ''}>${t}</option>`).join('')}</select>`;
  return kart(baslik, olcut === 'yuzde' ? 'En az 30 kez koşanlar arasında.' : '',
    `<div class="ctl"><label>Sırala${sec}</label></div>` +
    tablo([['#', (o, i) => i + 1, 1], [kimAd, (o) => o.k], ['1.lik', (o) => o.bir, 1], ['İlk 3', (o) => o.i3, 1], ['Start', (o) => o.start, 1], ['Kazanma', (o) => P(o.yuzde), 1], ['Kazandırdığı ikramiye', (o) => M(o.ikr), 1]], g.slice(0, 20)));
}
// ---------- haftalık / aylık tablo ----------
const AY_UZUN = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const gunKaydir = (iso, d) => { const t = new Date(iso + 'T12:00:00'); t.setDate(t.getDate() + d); return t.toISOString().slice(0, 10); };
const haftaBasi = (iso) => { const t = new Date(iso + 'T12:00:00'); return gunKaydir(iso, -((t.getDay() + 6) % 7)); };   // pazartesi
function donemler(tur) {
  if (tur === 'ay') {
    const s = [...new Set(rows.map((r) => r.rc.tarih.slice(0, 7)))].sort().reverse();
    return s.map((a) => [a, `${AY_UZUN[+a.slice(5) - 1]} ${a.slice(0, 4)}`]);
  }
  const s = [...new Set(rows.map((r) => haftaBasi(r.rc.tarih)))].sort().reverse();
  return s.map((b) => { const e = gunKaydir(b, 6), t1 = new Date(b + 'T12:00:00'), t2 = new Date(e + 'T12:00:00');
    return [b, t1.getMonth() === t2.getMonth() ? `${t1.getDate()}–${t2.getDate()} ${AY_UZUN[t2.getMonth()]}` : `${t1.getDate()} ${AY_UZUN[t1.getMonth()]} – ${t2.getDate()} ${AY_UZUN[t2.getMonth()]}`]; });
}
function donemTablosu(L, alan, kimAd, onek) {
  const tur = durum[onek + 'Tur'] || 'hafta', D = donemler(tur);
  let sec = durum[onek + 'Donem']; if (!D.some((d) => d[0] === sec)) sec = D[0]?.[0];
  const [bas, bit] = tur === 'ay' ? [sec + '-01', sec + '-31'] : [sec, gunKaydir(sec, 6)];
  const P_ = L.filter((r) => r.rc.tarih >= bas && r.rc.tarih <= bit);
  const g = grupla(P_, alan).map((o) => ({...o, iki: 0, uc: 0}));
  const gm = new Map(g.map((o) => [o.k, o])); for (const r of P_) { const o = gm.get(alan(r)); if (!o || r.derecesiz) continue; if (r.sira === 2) o.iki++; if (r.sira === 3) o.uc++; }
  g.sort((a, b) => b.bir - a.bir || b.iki - a.iki || b.uc - a.uc || a.start - b.start);
  const ad = (D.find((d) => d[0] === sec)?.[1] || '') + (bit > RAW.son ? ' (devam ediyor)' : '');
  return kart(`${tur === 'ay' ? 'Aylık' : 'Haftalık'} ${kimAd.toLocaleLowerCase('tr')} tablosu · ${ad}`, tur === 'ay' ? '' : 'Pazartesi–pazar.',
    `<div class="ctl"><div class="chips" role="group" aria-label="Dönem türü" style="margin:0">${[['hafta', 'Haftalık'], ['ay', 'Aylık']].map(([v, t]) => `<button type="button" class="chip${v === tur ? ' on' : ''}" data-donem-tur="${onek}|${v}">${t}</button>`).join('')}</div>
     <label>${tur === 'ay' ? 'Ay' : 'Hafta'}<select data-donem="${onek}">${D.map(([v, t]) => `<option value="${v}"${v === sec ? ' selected' : ''}>${t}</option>`).join('')}</select></label></div>` +
    tablo([['#', (o, i) => i + 1, 1], [kimAd, (o) => o.k], ['1.', (o) => o.bir, 1], ['2.', (o) => o.iki, 1], ['3.', (o) => o.uc, 1], ['Start', (o) => o.start, 1], ['Kazanma', (o) => P(o.yuzde), 1], ['Kazandırdığı ikramiye', (o) => M(o.ikr), 1]],
      g.filter((o) => o.bir || o.iki || o.uc).slice(0, 25), {bos: 'Bu dönemde koşu yok.'}));
}
function jokeyler(L) {
  let h = donemTablosu(L, (r) => r.jokey, 'Jokey', 'dJ');
  h += siralama(L, (r) => r.jokey, durum.olcutJ, 's_olcutJ', 'Jokey sıralaması (sezon)', 'Jokey');
  const ik = grupla(L, (r) => r.jokey + ' + ' + r.antr).filter((o) => o.bir >= 3).sort((a, b) => b.bir - a.bir || b.yuzde - a.yuzde).slice(0, 15);
  const ap = oranlar(L, (r) => (r.ap ? 'Apranti' : 'Profesyonel'), ['Profesyonel', 'Apranti']);
  h += '<div class="grid">' + kart('En çok birlikte kazanan jokey ve antrenörler', '', tablo([['İkili', (o) => o.k], ['1.lik', (o) => o.bir, 1], ['Start', (o) => o.start, 1], ['Kazanma', (o) => P(o.yuzde), 1]], ik)) +
    kart('Apranti ve profesyonel jokeyler', 'Kazanma yüzdesi.', cubuk(ap.map((o) => ({k: o.k, v: o.yuzde})), {fmt: P, aria: 'Apranti ve profesyonel kazanma oranı'})) + '</div>';
  h += kart('Jokey ara', 'Adını yazın; hipodromlara göre sonuçları çıksın.', `<div class="ctl"><label>Jokey<input id="kisiAra" value="${esc(durum.kisiAra)}" placeholder="ör. M.ÇİÇEK"></label></div><div id="kisiSonuc"></div>`);
  return h;
}
function antrenorler(L) {
  let h = donemTablosu(L, (r) => r.antr, 'Antrenör', 'dA');
  h += siralama(L, (r) => r.antr, durum.olcutA, 's_olcutA', 'Antrenör sıralaması (sezon)', 'Antrenör');
  const ik = grupla(L, (r) => r.antr + ' + ' + r.jokey).filter((o) => o.bir >= 3).sort((a, b) => b.bir - a.bir || b.yuzde - a.yuzde).slice(0, 15);
  const sh = grupla(L, (r) => r.sahip).sort((a, b) => b.bir - a.bir || a.start - b.start).slice(0, 15);
  h += '<div class="grid">' + kart('En çok birlikte kazanan antrenör ve jokeyler', '', tablo([['İkili', (o) => o.k], ['1.lik', (o) => o.bir, 1], ['Start', (o) => o.start, 1], ['Kazanma', (o) => P(o.yuzde), 1]], ik)) +
    kart('Sahip sıralaması', 'En çok birincilik alan at sahipleri.', tablo([['#', (o, i) => i + 1, 1], ['Sahip', (o) => o.k], ['1.lik', (o) => o.bir, 1], ['Start', (o) => o.start, 1], ['Kazanç', (o) => M(o.ikr), 1]], sh)) + '</div>';
  h += kart('Antrenör ara', 'Adını yazın; hipodromlara göre sonuçları çıksın.', `<div class="ctl"><label>Antrenör<input id="kisiAra" value="${esc(durum.kisiAra)}" placeholder="ör. M.ÖZGÜL"></label></div><div id="kisiSonuc"></div>`);
  return h;
}
function kisiKarnesi() {
  const el = $('kisiSonuc'); if (!el) return;
  const q = U(durum.kisiAra); if (!q) { el.innerHTML = ''; return; }
  const jokey = sekme === 'jokey', alan = jokey ? (r) => r.jokey : (r) => r.antr;
  const L = suzulmus().filter((r) => adEslesir(alan(r), q));
  const adlar = [...new Set(L.map(alan))];
  const kol = [['Hipodrom', (o) => o.k], ['Start', (o) => o.start, 1], ['1.lik', (o) => o.bir, 1], ['Kazanma', (o) => P(o.yuzde), 1]];
  el.innerHTML = (adlar.length > 1 ? `<p class="d">${adlar.length} isim eşleşti: ${esc(adlar.slice(0, 8).join(', '))}${adlar.length > 8 ? '…' : ''}. Daha uzun yazarak daraltabilirsiniz.</p>` : '') +
    tablo(kol, grupla(L, (r) => r.rc.hip).sort((a, b) => b.start - a.start), {bos: jokey ? 'Bu isimde jokey yok.' : 'Bu isimde antrenör yok.'});
}

function yetis(L) {
  const g = grupla(L, (r) => r.baba).sort((a, b) => b.bir - a.bir).slice(0, 20);
  const iki = new Map(); for (const r of L) if (r.yas === 2 && r.w) iki.set(r.baba, (iki.get(r.baba) || 0) + 1);
  let h = kart('Aygır sıralaması', 'Tayların toplam başarısına göre.', tablo([['#', (o, i) => i + 1, 1], ['Aygır', (o) => o.k], ['Kazanan tay', (o) => o.kazAt.size, 1], ['1.lik', (o) => o.bir, 1], ['Start', (o) => o.start, 1], ['Kazanma', (o) => P(o.yuzde), 1], ['Kazandırdığı ikramiye', (o) => M(o.ikr), 1]], g));
  h += '<div class="grid">' + kart('Aygır ara', 'Taylarının pist ve mesafeye göre başarısı.', `<div class="ctl"><label>Aygır (baba)<input id="aygirAra" value="${esc(durum.aygirAra)}" placeholder="ör. APPROVE"></label></div><div id="aygirSonuc"></div>`) +
    kart('Kısrak ara', 'Aynı anneden gelen atlar.', `<div class="ctl"><label>Kısrak (anne)<input id="kisrakAra" value="${esc(durum.kisrakAra)}" placeholder="ör. COPY CAT"></label></div><div id="kisrakSonuc"></div>`) + '</div>';
  return h;
}
function aygirKarnesi() {
  const el = $('aygirSonuc'); if (!el) return;
  const q = U(durum.aygirAra); if (!q) { el.innerHTML = ''; return; }
  const L = suzulmus().filter((r) => r.baba.includes(q));
  if (!L.length) { el.innerHTML = '<div class="empty">Bu isimde aygır bulunamadı.</div>'; return; }
  const MB = (m) => (m <= 1200 ? '≤1200' : m <= 1600 ? '1300–1600' : m <= 2000 ? '1700–2000' : '2100+');
  const pm = grupla(L, (r) => r.rc.pist + ' · ' + MB(r.rc.mes)).sort((a, b) => b.start - a.start);
  const taylar = grupla(L, (r) => r.k).sort((a, b) => b.bir - a.bir || b.i3 - a.i3).slice(0, 10);
  el.innerHTML = `<p class="d">${N(new Set(L.map((r) => r.baba)).size)} aygır eşleşti · ${N(new Set(L.map((r) => r.k)).size)} tay · ${N(L.length)} start</p>` +
    tablo([['Pist · mesafe', (o) => o.k], ['Start', (o) => o.start, 1], ['1.lik', (o) => o.bir, 1], ['Kazanma', (o) => P(o.yuzde), 1]], pm) +
    '<p class="d" style="margin-top:12px">En başarılı tayları</p>' + tablo([['At', (o) => o.k.split('|')[0]], ['1.lik', (o) => o.bir, 1], ['Start', (o) => o.start, 1], ['Kazanç', (o) => M(o.ikr), 1]], taylar);
}
function kisrakKarnesi() {
  const el = $('kisrakSonuc'); if (!el) return;
  const q = U(durum.kisrakAra); if (!q) { el.innerHTML = ''; return; }
  const L = rows.filter((r) => r.anne.includes(q));
  const g = grupla(L, (r) => r.k).sort((a, b) => b.bir - a.bir || b.i3 - a.i3);
  el.innerHTML = g.length ? `<p class="d">Yılın tamamı, filtrelerden bağımsız.</p>` + tablo([['At', (o) => o.k.split('|')[0]], ['Baba', (o) => o.k.split('|')[1]], ['Anne', (o) => o.k.split('|')[2]], ['Start', (o) => o.start, 1], ['1.lik', (o) => o.bir, 1], ['İlk 3', (o) => o.i3, 1], ['Kazanç', (o) => M(o.ikr), 1]], g) : '<div class="empty">2026\'da koşan tayı bulunamadı.</div>';
}

function kosul(L) {
  const bar = (list) => list.map((o) => ({k: o.k, v: o.yuzde}));
  const GB = [['1–2', 0, 2], ['2–3', 2, 3], ['3–5', 3, 5], ['5–10', 5, 10], ['10–20', 10, 20], ['20+', 20, 1e9]];
  const gan = oranlar(L, (r) => (r.g > 0 ? (GB.find(([, a, z]) => r.g >= a && r.g < z) || [])[0] : null), GB.map((b) => b[0]));
  const agf = oranlar(L, (r) => (r.agf ? (r.agf >= 8 ? '8+' : String(r.agf)) : null), ['1', '2', '3', '4', '5', '6', '7', '8+']);
  const st = oranlar(L, (r) => (r.st ? (r.st >= 15 ? '15+' : String(r.st)) : null), [...Array(14)].map((_, i) => String(i + 1)).concat('15+'));
  const ds = oranlar(L, (r) => (r.st ? (r.ds ? 'Dış start' : 'Normal start') : null), ['Normal start', 'Dış start']);
  const KB = [['≤52', 0, 52], ['52,5–54', 52.5, 54], ['54,5–56', 54.5, 56], ['56,5–58', 56.5, 58], ['58,5+', 58.5, 99]];
  const kilo = oranlar(L, (r) => (r.kilo ? (KB.find(([, a, z]) => r.kilo >= a && r.kilo <= z) || [])[0] : null), KB.map((b) => b[0]));
  const fz = oranlar(L, (r) => (r.fazla > 0 ? 'Fazla kilolu' : 'Normal'), ['Normal', 'Fazla kilolu']);
  const AB = [['İlk koşu', -1, -1], ['≤7 gün', 0, 7], ['8–14', 8, 14], ['15–30', 15, 30], ['31–60', 31, 60], ['60+', 61, 1e9]];
  const ara = oranlar(L, (r) => (AB.find(([, a, z]) => r.ara >= a && r.ara <= z) || [])[0], AB.map((b) => b[0]));
  const saat = oranlar(L, (r) => (r.rc.saatH < 17 ? 'Gündüz (17:00 öncesi)' : 'Akşam'), ['Gündüz (17:00 öncesi)', 'Akşam']);
  const gun = oranlar(L, (r) => (r.rc.dow === 0 || r.rc.dow === 6 ? 'Hafta sonu' : 'Hafta içi'), ['Hafta içi', 'Hafta sonu']);
  // ekipman
  const EK = {KG: 'Kapalı gözlük', K: 'Kulaklık', DB: 'Dil bağı', SK: 'Ring–start kulaklık', SKG: 'Ring–start kapalı gözlük', GKR: 'GKR', 'ÖG': 'ÖG', SGKR: 'SGKR', YP: 'YP', BB: 'BB'};
  const ek = Object.entries(EK).map(([c, ad]) => {
    const var_ = L.filter((r) => r.ekip.split(' ').includes(c)), yok = L.filter((r) => !r.ekip.split(' ').includes(c)), ilk = L.filter((r) => r.yeni.split(' ').includes(c));
    return {c, ad, n: var_.length, var: pct(var_.filter((r) => r.w).length, var_.length), yok: pct(yok.filter((r) => r.w).length, yok.length), ilkN: ilk.length, ilk: pct(ilk.filter((r) => r.w).length, ilk.length)};
  }).filter((o) => o.n > 0);
  // en iyi dereceler
  const m = new Map();
  for (const r of L) { if (r.sn == null) continue; const k = r.rc.hip + '|' + r.rc.pist + '|' + r.rc.mes; const o = m.get(k); if (!o || r.sn < o.sn) m.set(k, {r, sn: r.sn, n: 0}); }
  const rs = (s) => { const p = String(s || '').split('.'); return p.length === 3 ? +p[0] * 60 + +p[1] + +p[2] / 100 : null; };
  const der = [...m.values()].sort((a, b) => a.r.rc.hip.localeCompare(b.r.rc.hip, 'tr') || a.r.rc.pist.localeCompare(b.r.rc.pist, 'tr') || a.r.rc.mes - b.r.rc.mes);
  let h = '<div class="grid">' + kart('Ganyana göre kazanma', 'Bu ganyan aralığındaki atların yüzde kaçı kazandı.', cubuk(bar(gan), {fmt: P, aria: 'Ganyana göre kazanma'})) +
    kart('AGF sırasına göre kazanma', 'AGF: oynanma sırası. 1 = en çok oynanan at.', cubuk(bar(agf), {fmt: P, aria: 'AGF sırasına göre kazanma'})) + '</div>';
  h += '<div class="grid">' + kart('Start numarasına göre kazanma', 'Yüzde. Mesafe ve pist filtresiyle bakınca daha anlamlı.', cubuk(st.map((o) => ({k: o.k, v: o.yuzde})), {fmt: (v) => nf1.format(v), aria: 'Start numarasına göre kazanma yüzdesi'})) + + '</div>';
  h += kart('Taşınan kiloya göre kazanma', 'Handikapta iyi atlar daha çok kilo taşır; bu yüzden ağır kilolular daha sık kazanır.', cubuk(bar(kilo), {fmt: P, aria: 'Kiloya göre kazanma'}));
  h += '<div class="grid">' + kart('Dinlenme süresine göre kazanma', 'Önceki koşusundan bu yana geçen gün.', cubuk(bar(ara), {fmt: P, aria: 'Dinlenme süresine göre kazanma'})) +
    kart('Saat ve gün', 'Gündüz ve akşam, hafta içi ve hafta sonu kazanma yüzdesi.', cubuk(bar(saat).concat(bar(gun).map((d) => ({...d, ikinci: 1}))), {fmt: P, aria: 'Saat ve güne göre kazanma'})) + '</div>';
  const kaz = L.filter((r) => r.w), fav = L.filter((r) => r.fav);
  const FB = [['Burun–Baş', /^(Burun|Kısa Baş|Baş|At Başı)$/], ['Boyun', /^Boyun$/], ['Yarım–1 boy', /^(Yarım Boy|1 Boy)$/], ['1,5–3 boy', /^(1,5|2|2,5|3) Boy$/], ['3,5–5 boy', /^(3,5|4|4,5|5) Boy$/], ['5+ boy', /^\d+(,5)? Boy$/]];
  const fb = FB.map(([k]) => ({k, v: 0})); for (const r of kaz) { const i = FB.findIndex(([, re]) => re.test(r.fark)); if (i >= 0) fb[i].v++; }
  const KBF = [['≤6 at', 0, 6], ['7–9 at', 7, 9], ['10–12 at', 10, 12], ['13–15 at', 13, 15], ['16+ at', 16, 99]];
  const kb = KBF.map(([k, a, z]) => { const f = fav.filter((r) => r.rc.n >= a && r.rc.n <= z); return {k, v: pct(f.filter((r) => r.w).length, f.length)}; });
  h += '<div class="grid">' + kart('Koşular ne farkla bitiyor?', 'Birincinin ikinciye attığı fark, koşu sayısı.', cubuk(fb, {aria: 'Kazanma farkı'})) +
    kart('Kalabalık koşularda favori', 'Koşan at sayısına göre favorinin kazanma yüzdesi.', cubuk(kb, {fmt: P, aria: 'Koşan at sayısına göre favori'})) + '</div>';
  h += kart('Ekipman etkisi', 'Kazanma yüzdesi: ekipman takılıyken, takılı değilken ve ilk takıldığı koşuda.', tablo([['Ekipman', (o) => o.c + (o.ad !== o.c ? ' · ' + o.ad : '')], ['Start', (o) => N(o.n), 1], ['Takılıyken', (o) => P(o.var), 1], ['Takılmamışken', (o) => P(o.yok), 1], ['İlk takıldığında', (o) => (o.ilkN ? P(o.ilk) + ' (' + N(o.ilkN) + ')' : '—'), 1]], ek));
  h += kart('En iyi dereceler', 'Her hipodrom, pist ve mesafede yılın en iyisi. Yeşil olanlar pist rekoru seviyesinde.', tablo([['Hipodrom', (o) => o.r.rc.hip], ['Pist', (o) => o.r.rc.pist], ['Mesafe', (o) => N(o.r.rc.mes), 1], ['En iyi derece', (o) => derece(o.sn), 0, (o) => (rs(o.r.rc.rekor) != null && o.sn <= rs(o.r.rc.rekor) + 0.001 ? 'pos' : '')], ['At', (o) => o.r.at], ['Tarih', (o) => tarih(o.r.rc.tarih)], ['Pist rekoru', (o) => o.r.rc.rekor || '—']], der, {tall: 1}));
  return h;
}

function sonuc(L) {
  const byRace = new Map(); for (const r of L) { if (!byRace.has(r.rc.i)) byRace.set(r.rc.i, []); byRace.get(r.rc.i).push(r); }
  const list = [...byRace.entries()].map(([i, a]) => ({rc: races[i], a: a.sort((x, y) => x.sira - y.sira)})).sort((x, y) => (x.rc.tarih < y.rc.tarih ? 1 : x.rc.tarih > y.rc.tarih ? -1 : x.rc.hip.localeCompare(y.rc.hip, 'tr') || y.rc.no - x.rc.no)).slice(0, 60);
  const ilk = (o, n) => o.a.find((r) => r.sira === n && !r.derecesiz);
  return kart('Son koşular', 'Filtrelere uyan en yeni 60 koşu.', tablo([['Tarih', (o) => tarih(o.rc.tarih)], ['Hipodrom', (o) => o.rc.hip], ['Koşu', (o) => o.rc.no, 1], ['Koşu adı / sınıf', (o) => (o.rc.ad ? o.rc.ad + ' · ' : '') + o.rc.sinif], ['Mesafe', (o) => N(o.rc.mes) + ' ' + o.rc.pist], ['1.', (o) => ilk(o, 1)?.at || '—'], ['Derece', (o) => derece(ilk(o, 1)?.sn)], ['Ganyan', (o) => (ilk(o, 1)?.g ? nf2.format(ilk(o, 1).g) : '—'), 1], ['Jokey', (o) => ilk(o, 1)?.jokey || '—'], ['2.', (o) => ilk(o, 2)?.at || '—'], ['3.', (o) => ilk(o, 3)?.at || '—']], list, {tall: 1}));
}

// ---------- çizim ----------
function ciz() {
  const L = suzulmus(), el = $('icerik');
  $('filtreler').hidden = sekme === 'video' || sekme === 'oneri' || sekme === 'tum' || sekme === 'akis' || sekme === 'bugun';
  if (sekme === 'video') { el.innerHTML = '<div id="videoAlan"></div>'; if (window.tjkVideo) window.tjkVideo.baslat(); }
  else if (sekme === 'oneri') { el.innerHTML = '<div id="oneriAlan"></div>'; if (window.tjkOneri) window.tjkOneri.baslat(); }
  else if (sekme === 'bugun') { el.innerHTML = '<div id="bugunAlan"></div>'; if (window.tjkBugun) window.tjkBugun.baslat(); }
  else if (sekme === 'akis') { el.innerHTML = '<div id="akisAlan"></div>'; if (window.tjkAkis) window.tjkAkis.baslat(); }
  else if (sekme === 'tum') { el.innerHTML = '<div id="tumAlan"></div>'; if (window.tjkTum) window.tjkTum.baslat(); }
  else el.innerHTML = {genel, atlar, jokey: jokeyler, antr: antrenorler, yetis, kosul, sonuc}[sekme](L);
  if (sekme === 'genel') pist();
  $('aprHepsi')?.addEventListener('change', (e) => { durum.aprHepsi = e.target.checked; ciz(); });
  $('karsAc')?.addEventListener('click', () => { const a = [...document.querySelectorAll('[data-kars]')].map((i) => U(i.value)).filter(Boolean); if (a.length < 2) { alert('En az iki at yazın.'); return; } window.tjkKarsilastir?.ac(a); });
  if (sekme === 'atlar') { atKarnesi(); baglaArama('atAra', 'atAra', atKarnesi); }
  if (sekme === 'jokey' || sekme === 'antr') {
    kisiKarnesi(); baglaArama('kisiAra', 'kisiAra', kisiKarnesi);
    $('s_olcutJ')?.addEventListener('change', (e) => { durum.olcutJ = e.target.value; ciz(); });
    $('s_olcutA')?.addEventListener('change', (e) => { durum.olcutA = e.target.value; ciz(); });
    document.querySelectorAll('[data-donem-tur]').forEach((b) => b.addEventListener('click', () => { const [o, v] = b.dataset.donemTur.split('|'); durum[o + 'Tur'] = v; durum[o + 'Donem'] = ''; ciz(); }));
    document.querySelectorAll('[data-donem]').forEach((s) => s.addEventListener('change', () => { durum[s.dataset.donem + 'Donem'] = s.value; ciz(); }));
  }
  if (sekme === 'yetis') { aygirKarnesi(); kisrakKarnesi(); baglaArama('aygirAra', 'aygirAra', aygirKarnesi); baglaArama('kisrakAra', 'kisrakAra', kisrakKarnesi); }
  const f = Object.values(F).filter((v) => (Array.isArray(v) ? v.length : v)).length;
  $('temizle').hidden = !f;
  $('ozetSatir').textContent = `TJK 2026 · ${tarih(RAW.son)} tarihine kadar${f ? ' · ' + f + ' filtre açık' : ''}`;
}
function baglaArama(id, key, fn) {
  const el = $(id); if (!el) return; let t;
  el.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => { durum[key] = el.value; fn(); }, 300); });
}

// ---------- açılış: sezonun önündekiler (pist) ----------
const PIST = {jokey: ['Jokey', (r) => r.jokey], antr: ['Antrenör', (r) => r.antr], at: ['At', (r) => r.k, (r) => r.at], baba: ['Aygır', (r) => r.baba]};
let pistSec = 'jokey', pistIlk = true;
function pist() {
  if (!$('pist')) return;
  const [ad, kf, gf] = PIST[pistSec];
  const g = new Map(), adi = new Map();
  for (const r of rows) { if (!r.w) continue; const k = kf(r); if (!k) continue; g.set(k, (g.get(k) || 0) + 1); if (gf) adi.set(k, gf(r)); }
  const ilk = [...g].sort((a, b) => b[1] - a[1]).slice(0, 5), max = ilk[0]?.[1] || 1;
  const azalt = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  $('pist').innerHTML = `<div class="pist-bas"><span><b>Sezonun önündekiler</b> · birincilik sayısı</span><div class="pist-sec" role="group" aria-label="Sıralama">${Object.entries(PIST).map(([k, v]) => `<button type="button" data-p="${k}" class="${k === pistSec ? 'on' : ''}" aria-pressed="${k === pistSec}">${v[0]}</button>`).join('')}</div></div>
    <div class="kulvarlar">${ilk.map(([k, v], i) => `<div class="kulvar"><span class="no">${i + 1}</span><div class="serit"><div class="at" data-w="${(100 * v / max).toFixed(1)}" style="width:${pistIlk && !azalt ? '0' : (100 * v / max).toFixed(1)}%"><span class="pist-ad">${esc(adi.get(k) || k)}</span></div></div><span class="pist-sayi">${N(v)}</span></div>`).join('')}<div class="direk" aria-hidden="true"></div></div>
`;
  $('pist').querySelector('.kulvarlar').style.position = 'relative';
  $('pist').querySelectorAll('[data-p]').forEach((b) => b.addEventListener('click', () => { pistSec = b.dataset.p; pistIlk = false; pist(); }));
  if (pistIlk && !azalt) requestAnimationFrame(() => requestAnimationFrame(() => $('pist').querySelectorAll('.at').forEach((a) => { a.style.width = a.dataset.w + '%'; })));
  pistIlk = false;
}
$('dipnot').textContent = `Kaynak: TJK resmi sonuçları. Son yarış günü: ${tarih(RAW.son)}. Kazanç ve kazandırdığı ikramiye: ilk 5 sıraya verilen ikramiyelerin toplamı (yetiştirici primi hariç). Jokey, antrenör ve aygır için bu, atlarının kazandığı ikramiyedir.`;
let h0 = location.hash.slice(1); if (h0 === 'insan') h0 = 'jokey'; if (['genel', 'bugun', 'akis', 'atlar', 'jokey', 'antr', 'yetis', 'kosul', 'sonuc', 'tum', 'oneri', 'video'].includes(h0)) { sekme = h0; document.querySelectorAll('#sekmeler button').forEach((x) => x.classList.toggle('on', x.dataset.tab === h0)); }
ciz();
