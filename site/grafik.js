// Sitedeki her grafik ve tabloyu markalı bir PNG grafiğe çevirir.
// Her kartın köşesine "PNG" düğmesi eklenir; açılan pencerede başlık, sütun, satır sayısı ve boyut seçilir.
(() => {
  const RENK = {bg: '#070E1D', panel: '#0C1628', fg: '#EEF2F6', mut: '#8A97AD', line: '#1B2A44', yesil: '#00F134', kum: '#D8B67A', kirmizi: '#FF7A66'};
  const BOYUT = {yayin: [1920, 1080, 'Yayın · 1920×1080'], dikey: [1080, 1350, 'Instagram · 1080×1350'], kare: [1080, 1080, 'Kare · 1080×1080']};
  const e = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
  const logo = new Image(); logo.src = 'logo.png';

  // "1.089" -> 1089, "%22,2" -> 22.2, "246,7 mn ₺" -> 246.7, "1.25.51" (derece) -> 85.51 sn
  function sayi(t) {
    t = String(t || '').trim();
    if (!t || t === '—') return null;
    const d = t.match(/^(\d+)[.:](\d{2})[.:](\d{2})$/);
    if (d) return +d[1] * 60 + +d[2] + +d[3] / 100;
    const c = t.replace(/[%₺+\s]|TL|mn|bin/g, '').replace(/\./g, '').replace(',', '.');
    return /^-?\d+(\.\d+)?$/.test(c) ? parseFloat(c) : null;
  }

  // ---------- kaynaktan veri çıkar ----------
  function tabloOku(tbl) {
    const bas = [...tbl.querySelectorAll('thead th')].map((th) => th.textContent.trim());
    const satir = [...tbl.querySelectorAll('tbody tr')].map((tr) => [...tr.querySelectorAll('td')].map((td) => td.textContent.trim()));
    const sayisal = bas.map((_, i) => {
      const v = satir.map((r) => r[i]).filter((x) => x && x !== '—');
      return v.length > 0 && v.filter((x) => sayi(x) !== null).length / v.length > 0.8 && bas[i] !== '#';
    });
    const etiket = bas.findIndex((_, i) => !sayisal[i] && bas[i] !== '#' && satir.some((r) => r[i]));
    return {tur: 'tablo', bas, satir, sayisal, etiket: etiket < 0 ? 0 : etiket};
  }
  function svgOku(svg) {
    const ogeler = [...svg.querySelectorAll('rect title, circle title')];
    const veri = ogeler.map((t) => {
      const s = t.textContent, i = s.indexOf(': ');
      const k = s.slice(0, i), [v, ek] = s.slice(i + 2).split(' · ');
      return {k, metin: v, v: sayi(v), alt: ek || ''};
    }).filter((x) => x.v !== null);
    const cizgi = !!svg.querySelector('polyline');
    const yatayMi = !cizgi && !!svg.querySelector('rect') && [...svg.querySelectorAll('text')].some((t) => t.getAttribute('text-anchor') === 'end');
    return {tur: 'svg', veri, bicim: cizgi ? 'cizgi' : yatayMi ? 'yatay' : 'dikey'};
  }
  function kaynaklar(kart) {
    const k = [];
    kart.querySelectorAll('svg').forEach((s, i) => { if (s.querySelector('title')) k.push({ad: 'Grafik' + (i ? ' ' + (i + 1) : ''), el: s}); });
    kart.querySelectorAll('table').forEach((t, i) => { if (t.querySelector('tbody tr')) k.push({ad: 'Tablo' + (i ? ' ' + (i + 1) : ''), el: t}); });
    if (kart.matches('.tiles')) k.push({ad: 'Sayılar', el: kart});
    return k;
  }

  // ---------- çizim ----------
  function kirp(ctx, s, w) {
    if (ctx.measureText(s).width <= w) return s;
    while (s.length > 1 && ctx.measureText(s + '…').width > w) s = s.slice(0, -1);
    return s + '…';
  }
  function zemin(ctx, W, H, baslik, alt) {
    ctx.fillStyle = RENK.bg; ctx.fillRect(0, 0, W, H);
    let g = ctx.createRadialGradient(W * 0.88, -H * 0.1, 0, W * 0.88, -H * 0.1, W * 0.7);
    g.addColorStop(0, 'rgba(0,241,52,.20)'); g.addColorStop(1, 'rgba(0,241,52,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    g = ctx.createRadialGradient(0, H * 1.1, 0, 0, H * 1.1, W * 0.6);
    g.addColorStop(0, 'rgba(216,182,122,.10)'); g.addColorStop(1, 'rgba(216,182,122,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const P = Math.round(W * 0.05), s = W / 1920 * (W < H ? 1.5 : 1);
    const lg = Math.round(84 * s);
    ctx.fillStyle = RENK.yesil; yuvarlak(ctx, P, P, lg, lg, 16 * s); ctx.fill();
    if (logo.complete && logo.naturalWidth) ctx.drawImage(logo, P + lg * 0.1, P + lg * 0.1, lg * 0.8, lg * 0.8);
    ctx.fillStyle = RENK.fg; ctx.font = `700 ${Math.round(60 * s)}px "Space Grotesk", Inter, sans-serif`; ctx.textBaseline = 'alphabetic';
    const tx = P + lg + 28 * s;
    ctx.fillText(kirp(ctx, baslik, W - tx - P), tx, P + lg * 0.55);
    ctx.fillStyle = RENK.mut; ctx.font = `500 ${Math.round(28 * s)}px Inter, sans-serif`;
    ctx.fillText(kirp(ctx, alt, W - tx - P), tx, P + lg * 0.55 + 44 * s);
    // pist rayı ve dipnot
    const ry = H - P - 40 * s;
    ctx.fillStyle = 'rgba(238,242,246,.55)';
    for (let x = 0; x < W; x += 34 * s) ctx.fillRect(x, ry, 22 * s, 3 * s);
    ctx.fillStyle = RENK.mut; ctx.font = `500 ${Math.round(22 * s)}px Inter, sans-serif`;
    ctx.fillText('Kaynak: TJK resmi sonuçları', P, ry + 38 * s);
    ctx.textAlign = 'right'; ctx.fillText('YRŞ TYZ', W - P, ry + 38 * s); ctx.textAlign = 'left';
    return {x: P, y: P + lg + 70 * s, w: W - 2 * P, h: ry - (P + lg + 70 * s) - 36 * s, s};
  }
  function yuvarlak(ctx, x, y, w, h, r) {
    r = Math.min(r, h / 2, w / 2); ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function yatayCiz(ctx, A, veri) {
    const s = A.s, n = veri.length, satirH = Math.min(A.h / n, 86 * s), bh = satirH * 0.62;
    ctx.font = `600 ${Math.round(Math.min(30, satirH * 0.42 / s) * s)}px Inter, sans-serif`;
    const lw = Math.min(A.w * 0.34, Math.max(...veri.map((d) => ctx.measureText(d.k).width)) + 24 * s);
    const vw = Math.max(...veri.map((d) => ctx.measureText(d.metin).width)) + 28 * s;
    const max = Math.max(...veri.map((d) => Math.abs(d.v))) || 1, bw = A.w - lw - vw;
    const y0 = A.y + (A.h - satirH * n) / 2;
    veri.forEach((d, i) => {
      const y = y0 + i * satirH, w = Math.max(4 * s, bw * Math.abs(d.v) / max);
      ctx.fillStyle = i === 0 ? RENK.fg : RENK.mut; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
      ctx.fillText(kirp(ctx, d.k, lw - 20 * s), A.x + lw - 20 * s, y + satirH / 2);
      const g = ctx.createLinearGradient(A.x + lw, 0, A.x + lw + w, 0);
      if (d.v < 0) { g.addColorStop(0, 'rgba(255,122,102,.25)'); g.addColorStop(1, RENK.kirmizi); }
      else if (i === 0) { g.addColorStop(0, 'rgba(0,241,52,.15)'); g.addColorStop(1, RENK.yesil); }
      else { g.addColorStop(0, 'rgba(238,242,246,.10)'); g.addColorStop(1, 'rgba(238,242,246,.78)'); }
      ctx.fillStyle = g; yuvarlak(ctx, A.x + lw, y + (satirH - bh) / 2, w, bh, bh / 2); ctx.fill();
      ctx.textAlign = 'left'; ctx.fillStyle = RENK.fg;
      ctx.fillText(d.metin, A.x + lw + w + 14 * s, y + satirH / 2);
    });
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  }
  function dikeyCiz(ctx, A, veri, cizgi) {
    const s = A.s, n = veri.length, alt = 56 * s, ust = 46 * s, H = A.h - alt - ust;
    const max = Math.max(...veri.map((d) => d.v)), min = cizgi ? Math.min(...veri.map((d) => d.v)) : 0;
    const lo = cizgi ? min - (max - min) * 0.15 : 0, hi = max + (max - lo) * (cizgi ? 0.15 : 0) || 1;
    const Y = (v) => A.y + ust + H * (1 - (v - lo) / (hi - lo || 1));
    const bw = A.w / n, fs = Math.round(Math.min(26, bw * 0.32 / s) * s);
    ctx.strokeStyle = RENK.line; ctx.lineWidth = 2 * s;
    ctx.beginPath(); ctx.moveTo(A.x, A.y + ust + H); ctx.lineTo(A.x + A.w, A.y + ust + H); ctx.stroke();
    const enb = veri.reduce((b, d, i) => (d.v > veri[b].v ? i : b), 0);
    if (cizgi) {
      ctx.strokeStyle = RENK.yesil; ctx.lineWidth = 6 * s; ctx.lineJoin = 'round'; ctx.beginPath();
      veri.forEach((d, i) => { const x = A.x + bw * (i + 0.5); i ? ctx.lineTo(x, Y(d.v)) : ctx.moveTo(x, Y(d.v)); }); ctx.stroke();
    }
    const adim = Math.ceil(n / Math.max(1, Math.floor(A.w / (90 * s))));
    veri.forEach((d, i) => {
      const x = A.x + bw * i, y = Y(d.v);
      if (cizgi) { ctx.fillStyle = RENK.yesil; ctx.beginPath(); ctx.arc(x + bw / 2, y, 9 * s, 0, 7); ctx.fill(); }
      else {
        const g = ctx.createLinearGradient(0, y, 0, A.y + ust + H);
        g.addColorStop(0, i === enb ? RENK.yesil : 'rgba(238,242,246,.85)'); g.addColorStop(1, i === enb ? 'rgba(0,241,52,.2)' : 'rgba(238,242,246,.12)');
        ctx.fillStyle = g; yuvarlak(ctx, x + bw * 0.16, y, bw * 0.68, Math.max(2, A.y + ust + H - y), Math.min(10 * s, bw * 0.2)); ctx.fill();
      }
      ctx.textAlign = 'center';
      if (n <= 24 || i % adim === 0) {
        ctx.fillStyle = RENK.fg; ctx.font = `700 ${fs}px Inter, sans-serif`; ctx.fillText(d.metin, x + bw / 2, y - 16 * s);
        ctx.fillStyle = RENK.mut; ctx.font = `500 ${fs}px Inter, sans-serif`; ctx.fillText(kirp(ctx, d.k, bw - 6 * s), x + bw / 2, A.y + ust + H + 38 * s);
      }
    });
    ctx.textAlign = 'left';
  }

  // ---------- sayı odaklı çıktılar ----------
  const AYLAR = /^(Oca|Şub|Mar|Nis|May|Haz|Tem|Ağu|Eyl|Eki|Kas|Ara)/;
  const zamanMi = (veri) => veri.length >= 4 && veri.every((d) => AYLAR.test(d.k) || /^(19|20)\d\d$/.test(d.k) || /^\d{1,2} \S+ \d{4}$/.test(d.k));
  const dereceMi = (veri) => veri.every((d) => /^\d+[.:]\d{2}[.:]\d{2}$/.test(d.metin));
  const yuzdeMi = (veri) => veri.every((d) => /%/.test(d.metin));
  // veriye bakıp en uygun görünümü seçer
  function otomatik(d) {
    const v = d.veri, n = v.length;
    if (d.tiles) return n === 1 ? 'tek' : 'kart';
    if (n === 1) return 'tek';
    if (n <= 4) return 'kart';
    if (dereceMi(v)) return 'liste';               // dereceler: çubuk anlamsız, sayılar konuşsun
    if (zamanMi(v)) return d.bicim === 'cizgi' || n > 12 ? 'cizgi' : 'dikey';
    if (yuzdeMi(v) && n <= 6) return 'kart';
    if (d.bicim === 'dikey' || d.bicim === 'cizgi') return d.bicim;
    const max = Math.max(...v.map((x) => Math.abs(x.v))), min = Math.min(...v.map((x) => Math.abs(x.v)));
    if (n >= 8 && max > 0 && min / max > 0.85) return 'liste';   // değerler birbirine çok yakın: çubuklar fark göstermez
    return 'yatay';
  }
  function tekCiz(ctx, A, d) {
    const s = A.s, x = A.x, y = A.y + A.h * 0.5;
    ctx.fillStyle = RENK.yesil; ctx.font = `700 ${Math.round(Math.min(260 * s, A.w / Math.max(3, d.metin.length) * 1.7))}px "Space Grotesk", Inter, sans-serif`;
    ctx.textBaseline = 'alphabetic'; ctx.fillText(d.metin, x, y + 40 * s);
    ctx.fillStyle = RENK.fg; ctx.font = `600 ${Math.round(48 * s)}px Inter, sans-serif`; ctx.fillText(kirp(ctx, d.k, A.w), x, y + 120 * s);
    if (d.alt) { ctx.fillStyle = RENK.mut; ctx.font = `500 ${Math.round(32 * s)}px Inter, sans-serif`; ctx.fillText(kirp(ctx, d.alt, A.w), x, y + 172 * s); }
  }
  function kartCiz(ctx, A, veri) {
    const s = A.s, n = Math.min(veri.length, 6), dikeyEkran = A.w < A.h * 1.3;
    const sut = dikeyEkran ? (n <= 3 ? 1 : 2) : (n <= 3 ? n : n === 4 ? 2 : 3), sat = Math.ceil(n / sut), bosluk = 28 * s;
    const w = (A.w - bosluk * (sut - 1)) / sut, h = Math.min((A.h - bosluk * (sat - 1)) / sat, 420 * s);
    const y0 = A.y + (A.h - (h * sat + bosluk * (sat - 1))) / 2;
    const p = 36 * s, altVar = veri.slice(0, n).some((d) => d.alt);
    // bütün kartlarda aynı rakam boyutu: en uzun rakam kutuya sığacak kadar
    let fs = Math.min(h * (altVar ? 0.34 : 0.42), 150 * s);
    const sigdir = () => { ctx.font = `700 ${Math.round(fs)}px "Space Grotesk", Inter, sans-serif`; return veri.slice(0, n).every((d) => ctx.measureText(d.metin).width <= w - 2 * p); };
    while (!sigdir() && fs > 30 * s) fs -= 4 * s;
    veri.slice(0, n).forEach((d, i) => {
      const x = A.x + (i % sut) * (w + bosluk), y = y0 + Math.floor(i / sut) * (h + bosluk);
      ctx.fillStyle = 'rgba(238,242,246,.04)'; yuvarlak(ctx, x, y, w, h, 22 * s); ctx.fill();
      ctx.strokeStyle = i === 0 ? 'rgba(0,241,52,.55)' : RENK.line; ctx.lineWidth = 2 * s; ctx.stroke();
      ctx.fillStyle = RENK.mut; ctx.font = `600 ${Math.round(30 * s)}px Inter, sans-serif`; ctx.textBaseline = 'top';
      ctx.fillText(kirp(ctx, d.k, w - 2 * p), x + p, y + p);
      ctx.textBaseline = 'alphabetic';
      const altY = y + h - p, sayiY = altVar ? altY - 26 * s - 28 * s : altY;
      ctx.font = `700 ${Math.round(fs)}px "Space Grotesk", Inter, sans-serif`; ctx.fillStyle = i === 0 ? RENK.yesil : RENK.fg;
      ctx.fillText(d.metin, x + p, sayiY);
      if (d.alt) { ctx.fillStyle = RENK.mut; ctx.font = `500 ${Math.round(26 * s)}px Inter, sans-serif`; ctx.fillText(kirp(ctx, d.alt, w - 2 * p), x + p, altY); }
    });
    ctx.textBaseline = 'alphabetic';
  }
  function listeCiz(ctx, A, veri) {
    const s = A.s, n = veri.length, satirH = Math.min(A.h / n, 92 * s), fs = Math.round(Math.min(34 * s, satirH * 0.46));
    const y0 = A.y + (A.h - satirH * n) / 2;
    veri.forEach((d, i) => {
      const y = y0 + i * satirH, orta = y + satirH / 2;
      if (i) { ctx.fillStyle = RENK.line; ctx.fillRect(A.x, y, A.w, 2 * s); }
      ctx.textBaseline = 'middle';
      ctx.font = `700 ${fs}px "Space Grotesk", Inter, sans-serif`; ctx.fillStyle = i === 0 ? RENK.yesil : RENK.mut; ctx.textAlign = 'left';
      ctx.fillText(String(i + 1), A.x, orta);
      ctx.fillStyle = i === 0 ? RENK.fg : 'rgba(238,242,246,.88)'; ctx.font = `600 ${fs}px Inter, sans-serif`;
      ctx.fillText(kirp(ctx, d.k, A.w * 0.62), A.x + 80 * s, orta);
      ctx.textAlign = 'right'; ctx.fillStyle = i === 0 ? RENK.yesil : RENK.fg; ctx.font = `700 ${Math.round(fs * 1.12)}px "Space Grotesk", Inter, sans-serif`;
      ctx.fillText(d.metin, A.x + A.w, orta);
    });
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  }
  function tabloCiz(ctx, A, T) { // T: {bas: [..], satir: [[..]], sag: [bool]}
    const s = A.s, n = T.satir.length, satirH = Math.min(A.h / (n + 1), 84 * s), fs = Math.round(Math.min(30 * s, satirH * 0.42));
    ctx.font = `600 ${fs}px Inter, sans-serif`;
    const gen = T.bas.map((b, i) => Math.max(ctx.measureText(b).width, ...T.satir.map((r) => ctx.measureText(r[i] || '').width)) + 40 * s);
    const top = gen.reduce((a, b) => a + b, 0), olcek = Math.min(1, A.w / top);
    const xs = []; let x = A.x; gen.forEach((g, i) => { xs.push(x); x += (i === 0 ? A.w - (top - gen[0]) * olcek : g * olcek); });
    const genis = gen.map((g, i) => (i === 0 ? A.w - (top - gen[0]) * olcek : g * olcek));
    const y0 = A.y + (A.h - satirH * (n + 1)) / 2;
    const yaz = (t, i, y, renk, kalin) => {
      ctx.fillStyle = renk; ctx.font = `${kalin ? 700 : 500} ${fs}px Inter, sans-serif`;
      const sag = T.sag[i]; ctx.textAlign = sag ? 'right' : 'left';
      ctx.fillText(kirp(ctx, t || '', genis[i] - 24 * s), sag ? xs[i] + genis[i] - 12 * s : xs[i], y);
    };
    ctx.textBaseline = 'middle';
    T.bas.forEach((b, i) => yaz(b, i, y0 + satirH / 2, RENK.mut, false));
    T.satir.forEach((r, j) => {
      const y = y0 + (j + 1) * satirH;
      ctx.fillStyle = RENK.line; ctx.fillRect(A.x, y, A.w, 2 * s);
      r.forEach((c, i) => yaz(c, i, y + satirH / 2, j === 0 ? (i === 0 ? RENK.yesil : RENK.fg) : 'rgba(238,242,246,.88)', j === 0 || i === 0));
    });
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  }

  async function ciz(canvas, ayar) {
    const [W, H] = BOYUT[ayar.boyut];
    canvas.width = W; canvas.height = H;
    try { await Promise.all([document.fonts.load('700 60px "Space Grotesk"'), document.fonts.load('600 30px Inter'), logo.decode?.()]); } catch (err) {}
    const ctx = canvas.getContext('2d');
    const A = zemin(ctx, W, H, ayar.baslik, ayar.alt);
    if (!ayar.veri.length && !(ayar.gorunum === 'tablo' && ayar.T)) { ctx.fillStyle = RENK.mut; ctx.font = `500 ${32 * A.s}px Inter`; ctx.fillText('Bu seçimle çizilecek veri yok.', A.x, A.y + 60 * A.s); return; }
    const g = ayar.gorunum;
    if (g === 'tek') tekCiz(ctx, A, ayar.veri[0]);
    else if (g === 'kart') kartCiz(ctx, A, ayar.veri);
    else if (g === 'liste') listeCiz(ctx, A, ayar.veri);
    else if (g === 'tablo' && ayar.T) tabloCiz(ctx, A, ayar.T);
    else if (g === 'yatay') yatayCiz(ctx, A, ayar.veri);
    else dikeyCiz(ctx, A, ayar.veri, g === 'cizgi');
  }

  // ---------- pencere ----------
  const GORUNUM = [['oto', 'Otomatik'], ['yatay', 'Çubuk'], ['dikey', 'Sütun'], ['cizgi', 'Çizgi'], ['kart', 'Sayı kartları'], ['tek', 'Tek büyük sayı'], ['liste', 'Sıralı liste (sadece rakamlar)'], ['tablo', 'Tablo']];
  function ac(kart, baslikVer, altVer) {
    const K = kaynaklar(kart); if (!K.length) return;
    const baslik0 = baslikVer || kart.querySelector('h2')?.textContent.trim() || 'TJK istatistikleri';
    const alt0 = altVer || document.getElementById('ozetSatir')?.textContent.trim() || '';
    const p = document.createElement('div'); p.className = 'pngp'; p.setAttribute('role', 'dialog'); p.setAttribute('aria-modal', 'true'); p.setAttribute('aria-label', 'Grafik olarak indir');
    p.innerHTML = `<div class="pngp-kutu">
      <div class="pngp-ust"><h2>Grafik olarak indir</h2><button type="button" class="pngp-kapat" aria-label="Kapat">✕</button></div>
      <div class="pngp-govde">
        <div class="pngp-ayar">
          <label>Başlık<input id="pgBaslik" value="${e(baslik0)}"></label>
          <label>Alt başlık<input id="pgAlt" value="${e(alt0)}"></label>
          ${K.length > 1 ? `<label>Kaynak<select id="pgKaynak">${K.map((k, i) => `<option value="${i}">${e(k.ad)}</option>`).join('')}</select></label>` : ''}
          <div id="pgTablo"></div>
          <label>Görünüm<select id="pgGorunum">${GORUNUM.map(([v, t]) => `<option value="${v}">${t}</option>`).join('')}</select></label>
          <label>Boyut<select id="pgBoyut">${Object.entries(BOYUT).map(([k, v]) => `<option value="${k}">${v[2]}</option>`).join('')}</select></label>
          <button type="button" class="btn" id="pgIndir">PNG indir</button>
        </div>
        <div class="pngp-onizleme"><canvas id="pgTuval" aria-label="Önizleme"></canvas></div>
      </div></div>`;
    document.body.appendChild(p);
    const $ = (id) => p.querySelector('#' + id);
    let kaynak = 0;
    function tabloAyar() {
      const k = K[kaynak], alan = $('pgTablo');
      if (k.el.tagName !== 'TABLE') { alan.innerHTML = ''; return; }
      const T = tabloOku(k.el);
      const sayiSut = T.bas.map((b, i) => [b, i]).filter(([, i]) => T.sayisal[i]);
      if (!sayiSut.length) { alan.innerHTML = '<p class="d">Bu tabloda grafiğe çevrilecek sayı sütunu yok.</p>'; return; }
      const varsayilan = (sayiSut.find(([b]) => /1\.|birincilik|kazan/i.test(b)) || sayiSut[0])[1];
      alan.innerHTML = `<label>İsim sütunu<select id="pgEtiket">${T.bas.map((b, i) => (T.sayisal[i] ? '' : `<option value="${i}"${i === T.etiket ? ' selected' : ''}>${e(b || 'Sütun ' + (i + 1))}</option>`)).join('')}</select></label>
        <label>Değer sütunu<select id="pgDeger">${sayiSut.map(([b, i]) => `<option value="${i}"${i === varsayilan ? ' selected' : ''}>${e(b)}</option>`).join('')}</select></label>
        <label>Kaç satır<select id="pgAdet">${[5, 8, 10, 12, 15].map((n) => `<option${n === 10 ? ' selected' : ''}>${n}</option>`).join('')}</select></label>
        <label class="pngp-kutucuk"><input type="checkbox" id="pgSirala"> Büyükten küçüğe sırala</label>`;
      alan.querySelectorAll('select,input').forEach((x) => x.addEventListener('change', yenile));
    }
    function veriAl() {
      const k = K[kaynak];
      if (k.el.matches('.tiles')) {
        return {tiles: true, veri: [...k.el.querySelectorAll('.tile')].map((t) => ({k: t.querySelector('.k')?.textContent.trim() || '', metin: t.querySelector('.v')?.textContent.trim() || '', alt: t.querySelector('.s')?.textContent.trim() || '', v: 0}))};
      }
      if (k.el.tagName !== 'TABLE') {
        const S = svgOku(k.el); return {veri: S.veri, bicim: S.bicim};
      }
      const T = tabloOku(k.el), ei = +($('pgEtiket')?.value ?? T.etiket), di = +($('pgDeger')?.value ?? -1);
      if (di < 0) return {veri: [], bicim: 'yatay'};
      let v = T.satir.map((r) => ({k: r[ei] || '', metin: r[di], v: sayi(r[di])})).filter((x) => x.v !== null && x.k);
      const sirali = $('pgSirala')?.checked;
      if (sirali) v.sort((a, b) => b.v - a.v);
      const adet = +($('pgAdet')?.value || 10);
      // tablo görünümü: isim + en fazla 4 sayı sütunu
      const sut = [ei, ...T.bas.map((_, i) => i).filter((i) => T.sayisal[i] && i !== ei).sort((a, b) => (a === di ? -1 : b === di ? 1 : a - b)).slice(0, 4)];
      let sat = T.satir.filter((r) => r[ei]);
      if (sirali) sat = [...sat].sort((a, b) => (sayi(b[di]) ?? -1e18) - (sayi(a[di]) ?? -1e18));
      const Tt = {bas: sut.map((i) => T.bas[i]), satir: sat.slice(0, adet).map((r) => sut.map((i) => r[i])), sag: sut.map((i) => T.sayisal[i])};
      return {veri: v.slice(0, adet), bicim: 'yatay', T: Tt};
    }
    async function yenile() {
      const d = veriAl(), sec = $('pgGorunum').value, oto = otomatik(d);
      const ad = (v) => GORUNUM.find((x) => x[0] === v)[1];
      $('pgGorunum').options[0].textContent = `Otomatik (${ad(oto).replace(/ \(.*/, '')})`;
      $('pgGorunum').querySelector('option[value=tablo]').hidden = !d.T;
      await ciz($('pgTuval'), {...d, gorunum: sec === 'oto' || (sec === 'tablo' && !d.T) ? oto : sec, baslik: $('pgBaslik').value, alt: $('pgAlt').value, boyut: $('pgBoyut').value});
    }
    const kapat = () => { p.remove(); document.removeEventListener('keydown', esc); };
    const esc = (ev) => { if (ev.key === 'Escape') kapat(); };
    document.addEventListener('keydown', esc);
    p.addEventListener('click', (ev) => { if (ev.target === p) kapat(); });
    p.querySelector('.pngp-kapat').addEventListener('click', kapat);
    $('pgKaynak')?.addEventListener('change', (ev) => { kaynak = +ev.target.value; tabloAyar(); yenile(); });
    let t; ['pgBaslik', 'pgAlt'].forEach((id) => $(id).addEventListener('input', () => { clearTimeout(t); t = setTimeout(yenile, 250); }));
    $('pgBoyut').addEventListener('change', yenile);
    $('pgGorunum').addEventListener('change', yenile);
    $('pgIndir').addEventListener('click', () => {
      $('pgTuval').toBlob((b) => {
        const a = document.createElement('a'), ad = ($('pgBaslik').value || 'grafik').toLocaleLowerCase('tr').replace(/[^a-z0-9çğıöşü]+/g, '-').replace(/^-|-$/g, '');
        a.href = URL.createObjectURL(b); a.download = `tjk-${ad || 'grafik'}.png`; document.body.appendChild(a); a.click();
        setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
      }, 'image/png');
    });
    tabloAyar(); yenile(); $('pgBaslik').focus();
  }

  // ---------- düğmeler ----------
  function dugmeEkle() {
    document.querySelectorAll('#icerik section.card, #icerik .tiles').forEach((kart) => {
      if (kart.querySelector(':scope > .png-btn') || !kaynaklar(kart).length) return;
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'png-btn'; b.textContent = 'PNG'; b.title = 'Grafik olarak indir';
      b.addEventListener('click', () => ac(kart));
      kart.prepend(b);
    });
  }
  let bekle;
  new MutationObserver(() => { clearTimeout(bekle); bekle = setTimeout(dugmeEkle, 60); }).observe(document.getElementById('icerik'), {childList: true, subtree: true});
  dugmeEkle();
  // grafiğe çevrilebilecek bir tablo/grafik var mı? (sohbet asistanı kullanır)
  const uygun = (el) => kaynaklar(el).some((k) => k.el.tagName !== 'TABLE' || tabloOku(k.el).sayisal.some(Boolean));
  window.tjkGrafik = {ac, sayi, uygun};
})();
