// Sitedeki her grafik ve tabloyu markalı bir PNG grafiğe çevirir.
// Her kartın köşesine "PNG" düğmesi eklenir; açılan pencerede başlık, sütun, satır sayısı ve boyut seçilir.
(() => {
  const RENK = {bg: '#070E1D', panel: '#0C1628', fg: '#EEF2F6', mut: '#8A97AD', line: '#1B2A44', yesil: '#00F134', kum: '#D8B67A', kirmizi: '#FF7A66'};
  const BOYUT = {yayin: [1920, 1080, 'Yayın · 1920×1080'], dikey: [1080, 1350, 'Instagram · 1080×1350'], kare: [1080, 1080, 'Kare · 1080×1080']};
  const e = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));

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
  function zemin(ctx, W, H, baslik, alt, foto) {
    ctx.fillStyle = RENK.bg; ctx.fillRect(0, 0, W, H);
    let g = ctx.createRadialGradient(W * 0.88, -H * 0.1, 0, W * 0.88, -H * 0.1, W * 0.7);
    g.addColorStop(0, 'rgba(0,241,52,.20)'); g.addColorStop(1, 'rgba(0,241,52,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    g = ctx.createRadialGradient(0, H * 1.1, 0, 0, H * 1.1, W * 0.6);
    g.addColorStop(0, 'rgba(216,182,122,.10)'); g.addColorStop(1, 'rgba(216,182,122,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const P = Math.round(W * 0.05), s = W / 1920 * (W < H ? 1.5 : 1);
    const lg = Math.round(84 * s);
    let tx = P + 30 * s;
    if (foto) {
      // yuvarlak portre: fotoğrafın üst-orta kısmı (baş ve omuz)
      const D = Math.round(lg * 1.6), y0 = P + lg * 0.42 - D / 2 + 10 * s, kw = foto.naturalWidth * 0.58;
      ctx.save(); ctx.beginPath(); ctx.arc(P + D / 2, y0 + D / 2, D / 2, 0, Math.PI * 2); ctx.clip();
      ctx.fillStyle = '#fff'; ctx.fillRect(P, y0, D, D);
      ctx.drawImage(foto, (foto.naturalWidth - kw) / 2, foto.naturalHeight * 0.02, kw, kw, P, y0, D, D); ctx.restore();
      ctx.strokeStyle = RENK.yesil; ctx.lineWidth = 4 * s; ctx.beginPath(); ctx.arc(P + D / 2, y0 + D / 2, D / 2 - 2 * s, 0, Math.PI * 2); ctx.stroke();
      tx = P + D + 28 * s;
    } else { ctx.fillStyle = RENK.yesil; yuvarlak(ctx, P, P + 6 * s, 8 * s, lg - 12 * s, 4 * s); ctx.fill(); }
    ctx.fillStyle = RENK.fg; ctx.font = `600 ${Math.round(60 * s)}px Inter, sans-serif`; ctx.textBaseline = 'alphabetic';
    ctx.fillText(kirp(ctx, baslik, W - tx - P), tx, P + lg * 0.55);
    ctx.fillStyle = RENK.mut; ctx.font = `600 ${Math.round(28 * s)}px Inter, sans-serif`;
    ctx.fillText(kirp(ctx, alt, W - tx - P), tx, P + lg * 0.55 + 44 * s);
    // pist rayı ve dipnot
    const ry = H - P - 40 * s;
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
      const ag = ctx.createLinearGradient(0, A.y + ust, 0, A.y + ust + H); ag.addColorStop(0, 'rgba(0,241,52,.28)'); ag.addColorStop(1, 'rgba(0,241,52,0)');
      ctx.fillStyle = ag; ctx.beginPath(); ctx.moveTo(A.x + bw * 0.5, A.y + ust + H);
      veri.forEach((d, i) => ctx.lineTo(A.x + bw * (i + 0.5), Y(d.v))); ctx.lineTo(A.x + bw * (veri.length - 0.5), A.y + ust + H); ctx.closePath(); ctx.fill();
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
        ctx.fillStyle = RENK.fg; ctx.font = `600 ${fs}px Inter, sans-serif`; ctx.fillText(d.metin, x + bw / 2, y - 16 * s);
        ctx.fillStyle = RENK.mut; ctx.font = `600 ${fs}px Inter, sans-serif`; ctx.fillText(kirp(ctx, d.k, bw - 6 * s), x + bw / 2, A.y + ust + H + 38 * s);
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
    if (dereceMi(v)) return 'liste';               // dereceler: sayılar konuşsun
    if (zamanMi(v)) return 'cizgi';                // aylar/yıllar: gidişat çizgisi
    if (d.bicim === 'yatay') return 'podyum';      // sıralamalar: ilk üç öne çıksın
    if (n <= 8) return 'kart';                     // az kategori: büyük rakamlar
    return 'cizgi';
  }
  // grafiğin altına tek cümlelik yorum
  function yorum(d, gorunum) {
    const v = d.veri; if (!v || v.length < 2) return '';
    if (gorunum === 'podyum' || gorunum === 'liste' || gorunum === 'yatay' || gorunum === 'tablo') {
      const f = v[0].v - v[1].v;
      if (/₺|mn|TL/.test(v[0].metin) || !isFinite(f)) return `Zirvede ${v[0].k}`;
      const yz = /%/.test(v[0].metin);
      return `Zirvede ${v[0].k}. İkinciyle arasındaki fark: ${new Intl.NumberFormat('tr-TR', {maximumFractionDigits: 1}).format(Math.abs(f))}${yz ? ' puan' : ''}`;
    }
    const enb = v.reduce((a, b) => (b.v > a.v ? b : a)), enk = v.reduce((a, b) => (b.v < a.v ? b : a));
    return `En yüksek: ${enb.k} (${enb.metin}) · En düşük: ${enk.k} (${enk.metin})`;
  }
  function podyumCiz(ctx, A, veri, birim) {
    const s = A.s, n = Math.min(veri.length, 10), yatayEkran = A.w > A.h * 1.4, bos = 24 * s;
    const kutu = (x, y, w, h, d, sira, buyuk) => {
      ctx.fillStyle = sira === 1 ? 'rgba(0,241,52,.07)' : 'rgba(238,242,246,.04)'; yuvarlak(ctx, x, y, w, h, 22 * s); ctx.fill();
      ctx.strokeStyle = sira === 1 ? 'rgba(0,241,52,.6)' : RENK.line; ctx.lineWidth = 2 * s; ctx.stroke();
      const p = (buyuk ? 40 : 28) * s;
      if (buyuk) { ctx.save(); yuvarlak(ctx, x, y, w, h, 22 * s); ctx.clip(); ctx.fillStyle = 'rgba(0,241,52,.07)'; ctx.font = `600 ${Math.round(h * 1.05)}px Inter, sans-serif`; ctx.textAlign = 'right'; ctx.textBaseline = 'alphabetic'; ctx.fillText('1', x + w + h * 0.08, y + h * 0.95); ctx.restore(); ctx.textAlign = 'left'; }
      ctx.textBaseline = 'top'; ctx.fillStyle = sira === 1 ? RENK.yesil : sira <= 3 ? RENK.kum : RENK.mut;
      ctx.font = `600 ${Math.round((buyuk ? 34 : 26) * s)}px Inter, sans-serif`;
      ctx.fillText(sira + '.', x + p, y + p);
      let fs = (buyuk ? 60 : 38) * s; ctx.fillStyle = RENK.fg;
      do { ctx.font = `600 ${Math.round(fs)}px Inter, sans-serif`; fs -= 2 * s; } while (ctx.measureText(d.k).width > w - 2 * p && fs > 18 * s);
      ctx.fillText(d.k, x + p, y + p + (buyuk ? 52 : 38) * s);
      ctx.textBaseline = 'alphabetic';
      let vs = Math.min((buyuk ? 170 : 92) * s, h * (buyuk ? 0.42 : 0.4));
      do { ctx.font = `600 ${Math.round(vs)}px Inter, sans-serif`; vs -= 3 * s; } while (ctx.measureText(d.metin).width > w - 2 * p && vs > 24 * s);
      ctx.fillStyle = sira === 1 ? RENK.yesil : RENK.fg; ctx.fillText(d.metin, x + p, y + h - p - (birim ? 34 * s : 0));
      if (birim) { ctx.fillStyle = RENK.mut; ctx.font = `600 ${Math.round(24 * s)}px Inter, sans-serif`; ctx.fillText(birim, x + p, y + h - p); }
    };
    const liste = (x, y, w, h, kalan, bas) => {
      if (!kalan.length) return;
      const sh = Math.min(h / kalan.length, 80 * s), fs = Math.round(Math.min(30 * s, sh * 0.44));
      kalan.forEach((d, i) => {
        const yy = y + i * sh + sh / 2; ctx.textBaseline = 'middle';
        if (i) { ctx.fillStyle = RENK.line; ctx.fillRect(x, y + i * sh, w, 2 * s); }
        ctx.fillStyle = RENK.mut; ctx.font = `600 ${fs}px Inter, sans-serif`; ctx.textAlign = 'left'; ctx.fillText((bas + i) + '.', x, yy);
        ctx.fillStyle = 'rgba(238,242,246,.9)'; ctx.font = `600 ${fs}px Inter, sans-serif`; ctx.fillText(kirp(ctx, d.k, w * 0.62), x + 62 * s, yy);
        ctx.textAlign = 'right'; ctx.fillStyle = RENK.fg; ctx.font = `600 ${fs}px Inter, sans-serif`; ctx.fillText(d.metin, x + w, yy);
        ctx.textAlign = 'left';
      });
      ctx.textBaseline = 'alphabetic';
    };
    const v = veri.slice(0, n);
    if (yatayEkran) {
      const w1 = A.w * (n > 3 ? 0.38 : 0.5) - bos, w2 = A.w * (n > 3 ? 0.27 : 0.5) - bos, h2 = (A.h - bos) / 2;
      kutu(A.x, A.y, w1, A.h, v[0], 1, true);
      if (v[1]) kutu(A.x + w1 + bos, A.y, w2, v[2] ? h2 : A.h, v[1], 2, false);
      if (v[2]) kutu(A.x + w1 + bos, A.y + h2 + bos, w2, h2, v[2], 3, false);
      liste(A.x + w1 + w2 + 2 * bos + 12 * s, A.y, A.w - w1 - w2 - 2 * bos - 12 * s, A.h, v.slice(3), 4);
    } else {
      const h1 = A.h * (n > 3 ? 0.36 : 0.55), h2 = A.h * (n > 3 ? 0.24 : 0.45) - bos, w2 = (A.w - bos) / 2;
      kutu(A.x, A.y, A.w, h1, v[0], 1, true);
      if (v[1]) kutu(A.x, A.y + h1 + bos, v[2] ? w2 : A.w, h2, v[1], 2, false);
      if (v[2]) kutu(A.x + w2 + bos, A.y + h1 + bos, w2, h2, v[2], 3, false);
      liste(A.x, A.y + h1 + h2 + 2 * bos, A.w, A.h - h1 - h2 - 2 * bos, v.slice(3), 4);
    }
  }

  // ---------- profil kartı (karne PNG'si) ----------
  function halka(ctx, cx, cy, r, yuzde, etiket, renk, s) {
    ctx.lineCap = 'round'; ctx.lineWidth = r * 0.16;
    ctx.strokeStyle = 'rgba(238,242,246,.08)'; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = renk; ctx.beginPath(); ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.max(0.005, Math.min(1, yuzde / 100))); ctx.stroke();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = RENK.fg;
    ctx.font = `600 ${Math.round(r * 0.46)}px Inter, sans-serif`;
    ctx.fillText('%' + new Intl.NumberFormat('tr-TR', {maximumFractionDigits: 1}).format(yuzde), cx, cy - r * 0.04);
    ctx.fillStyle = RENK.mut; ctx.font = `600 ${Math.round(Math.max(20 * s, r * 0.15))}px Inter, sans-serif`;
    ctx.fillText(etiket, cx, cy + r * 0.36);
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.lineCap = 'butt';
  }
  function istatKutular(ctx, x, y, w, h, liste, sut, s) {
    const bos = 20 * s, sat = Math.ceil(liste.length / sut), kw = (w - bos * (sut - 1)) / sut, kh = (h - bos * (sat - 1)) / sat;
    let fs = Math.min(kh * 0.42, 110 * s);
    const sig = () => { ctx.font = `600 ${Math.round(fs)}px Inter, sans-serif`; return liste.every((d) => ctx.measureText(d.metin).width < kw - 56 * s); };
    while (!sig() && fs > 26 * s) fs -= 3 * s;
    liste.forEach((d, i) => {
      const kx = x + (i % sut) * (kw + bos), ky = y + Math.floor(i / sut) * (kh + bos), p = 28 * s;
      ctx.fillStyle = 'rgba(238,242,246,.04)'; yuvarlak(ctx, kx, ky, kw, kh, 20 * s); ctx.fill(); ctx.strokeStyle = RENK.line; ctx.lineWidth = 2 * s; ctx.stroke();
      ctx.fillStyle = RENK.mut; ctx.font = `600 ${Math.round(26 * s)}px Inter, sans-serif`; ctx.textBaseline = 'top'; ctx.fillText(kirp(ctx, d.k, kw - 2 * p), kx + p, ky + p);
      ctx.textBaseline = 'alphabetic'; ctx.font = `600 ${Math.round(fs)}px Inter, sans-serif`; ctx.fillStyle = d.vurgu ? RENK.yesil : RENK.fg;
      ctx.fillText(d.metin, kx + p, ky + kh - p);
    });
  }
  function aylikCiz(ctx, x, y, w, h, baslik, veri, s) {
    ctx.fillStyle = RENK.mut; ctx.font = `600 ${Math.round(24 * s)}px Inter, sans-serif`; ctx.textBaseline = 'top'; ctx.fillText(baslik, x, y);
    const ust = y + 44 * s, alt = 34 * s, H = h - (ust - y) - alt, n = veri.length, bw = w / n, max = Math.max(1, ...veri.map((d) => d.v));
    const enb = veri.reduce((b, d, i) => (d.v > veri[b].v ? i : b), 0);
    veri.forEach((d, i) => {
      const bh = Math.max(3 * s, H * d.v / max), bx = x + i * bw + bw * 0.18, by = ust + H - bh;
      ctx.fillStyle = i === enb ? RENK.yesil : 'rgba(238,242,246,.55)'; yuvarlak(ctx, bx, by, bw * 0.64, bh, Math.min(8 * s, bw * 0.2)); ctx.fill();
      ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
      if (d.v) { ctx.fillStyle = i === enb ? RENK.yesil : RENK.fg; ctx.font = `600 ${Math.round(Math.min(24 * s, bw * 0.4))}px Inter, sans-serif`; ctx.fillText(String(d.v), bx + bw * 0.32, by - 8 * s); }
      ctx.fillStyle = RENK.mut; ctx.font = `600 ${Math.round(Math.min(20 * s, bw * 0.36))}px Inter, sans-serif`; ctx.fillText(d.k, bx + bw * 0.32, ust + H + 26 * s);
      ctx.textAlign = 'left';
    });
  }
  function formCiz(ctx, x, y, w, h, baslik, form, s) {
    ctx.fillStyle = RENK.mut; ctx.font = `600 ${Math.round(24 * s)}px Inter, sans-serif`; ctx.textBaseline = 'top'; ctx.fillText(baslik, x, y);
    const n = form.length; if (!n) return;
    const r = Math.min((w / n) * 0.4, 46 * s, (h - 90 * s) / 2), cy = y + 44 * s + r + 10 * s, adim = w / n;
    form.forEach((f, i) => {
      const cx = x + adim * i + adim / 2, sira = +f.s;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = sira === 1 ? RENK.yesil : sira <= 3 ? RENK.kum : sira <= 5 ? 'rgba(238,242,246,.22)' : 'rgba(238,242,246,.07)'; ctx.fill();
      ctx.fillStyle = sira <= 3 ? RENK.bg : RENK.fg; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = `600 ${Math.round(r * 0.9)}px Inter, sans-serif`; ctx.fillText(f.s, cx, cy + 1);
      ctx.fillStyle = RENK.mut; ctx.font = `600 ${Math.round(Math.min(18 * s, adim * 0.2))}px Inter, sans-serif`; ctx.fillText(f.t, cx, cy + r + 22 * s);
    });
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  }
  function notCiz(ctx, x, y, w, notlar, s) {
    notlar.forEach(([k, v], i) => {
      const yy = y + i * 54 * s; ctx.textBaseline = 'top';
      ctx.fillStyle = RENK.mut; ctx.font = `600 ${Math.round(24 * s)}px Inter, sans-serif`; ctx.fillText(k, x, yy);
      const kw = ctx.measureText(k + '  ').width;
      ctx.fillStyle = RENK.fg; ctx.font = `600 ${Math.round(26 * s)}px Inter, sans-serif`; ctx.fillText(kirp(ctx, v, w - kw), x + kw, yy - 1 * s);
    });
    ctx.textBaseline = 'alphabetic';
  }
  async function profilCiz(canvas, P, boyut) {
    const [W, H] = BOYUT[boyut]; canvas.width = W; canvas.height = H;
    try { await Promise.all([document.fonts.load('600 60px Inter')]); } catch (err) {}
    let foto = null;
    if (P.foto) { foto = new Image(); foto.src = P.foto; try { await foto.decode(); } catch (err) { foto = null; } }
    const ctx = canvas.getContext('2d'), A = zemin(ctx, W, H, P.ad, P.rol, foto), s = A.s;
    const genis = A.w > A.h * 1.4, bos = 28 * s;
    if (P.dipnot) { ctx.fillStyle = RENK.mut; ctx.font = `600 ${Math.round(22 * s)}px Inter, sans-serif`; ctx.textAlign = 'center'; ctx.fillText(P.dipnot, W / 2, H - Math.round(W * 0.05) - 40 * s + 38 * s); ctx.textAlign = 'left'; }
    const alt = P.form ? (cx, cy, cw, ch) => formCiz(ctx, cx, cy, cw, ch, 'Son koşuları (soldan sağa eskiden yeniye)', P.form, s)
      : (cx, cy, cw, ch) => aylikCiz(ctx, cx, cy, cw, ch, P.seri.baslik, P.seri.veri, s);
    if (genis) {
      const lw = A.w * 0.56, rw = A.w - lw - bos, ust = A.h * 0.56;
      istatKutular(ctx, A.x, A.y, lw, ust, P.istat, 2, s);
      notCiz(ctx, A.x, A.y + ust + bos + 6 * s, lw, P.notlar, s);
      const r = Math.min(rw / 4 - 16 * s, ust / 2 - 20 * s);
      halka(ctx, A.x + lw + bos + rw * 0.25, A.y + ust / 2, r, P.halka[0].yuzde, P.halka[0].k, RENK.yesil, s);
      halka(ctx, A.x + lw + bos + rw * 0.75, A.y + ust / 2, r, P.halka[1].yuzde, P.halka[1].k, RENK.kum, s);
      alt(A.x + lw + bos, A.y + ust + bos, rw, A.h - ust - bos);
    } else {
      const h1 = A.h * 0.3, h2 = A.h * 0.22, h3 = A.h * 0.24;
      istatKutular(ctx, A.x, A.y, A.w, h1, P.istat, 2, s);
      const r = Math.min(A.w / 4 - 30 * s, h2 / 2 - 6 * s);
      halka(ctx, A.x + A.w * 0.25, A.y + h1 + bos + h2 / 2, r, P.halka[0].yuzde, P.halka[0].k, RENK.yesil, s);
      halka(ctx, A.x + A.w * 0.75, A.y + h1 + bos + h2 / 2, r, P.halka[1].yuzde, P.halka[1].k, RENK.kum, s);
      alt(A.x, A.y + h1 + h2 + 2 * bos, A.w, h3);
      notCiz(ctx, A.x, A.y + h1 + h2 + h3 + 3 * bos, A.w, P.notlar, s);
    }
  }
  function profilAc(P) {
    const p = document.createElement('div'); p.className = 'pngp'; p.setAttribute('role', 'dialog'); p.setAttribute('aria-modal', 'true'); p.setAttribute('aria-label', 'Profil kartı');
    p.innerHTML = `<div class="pngp-kutu"><div class="pngp-ust"><h2>${e(P.ad)} · profil kartı</h2><button type="button" class="pngp-kapat" aria-label="Kapat">✕</button></div>
      <div class="pngp-govde"><div class="pngp-ayar">
        <label>Boyut<select id="pfBoyut">${Object.entries(BOYUT).map(([k, v]) => `<option value="${k}">${v[2]}</option>`).join('')}</select></label>
        <button type="button" class="btn" id="pfIndir">PNG indir</button>
        ${P.aciklama ? `<p class="d">${e(P.aciklama)}</p>` : ''}
      </div><div class="pngp-onizleme"><canvas id="pfTuval"></canvas></div></div></div>`;
    document.body.appendChild(p);
    const tuval = p.querySelector('#pfTuval'), boy = p.querySelector('#pfBoyut');
    const yenile = () => profilCiz(tuval, P, boy.value);
    const kapat = () => { p.remove(); document.removeEventListener('keydown', esc, true); };
    const esc = (ev) => { if (ev.key === 'Escape') { ev.stopPropagation(); kapat(); } };
    document.addEventListener('keydown', esc, true);
    p.addEventListener('click', (ev) => { if (ev.target === p) kapat(); });
    p.querySelector('.pngp-kapat').addEventListener('click', kapat);
    boy.addEventListener('change', yenile);
    p.querySelector('#pfIndir').addEventListener('click', () => indir(tuval, P.ad + '-profil'));
    yenile();
  }
  function indir(tuval, ad) {
    tuval.toBlob((b) => {
      const a = document.createElement('a'), temiz = String(ad || 'grafik').toLocaleLowerCase('tr').replace(/[^a-z0-9çğıöşü]+/g, '-').replace(/^-|-$/g, '');
      a.href = URL.createObjectURL(b); a.download = `tjk-${temiz || 'grafik'}.png`; document.body.appendChild(a); a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    }, 'image/png');
  }
  function tekCiz(ctx, A, d) {
    const s = A.s, x = A.x, y = A.y + A.h * 0.5;
    ctx.fillStyle = RENK.yesil; ctx.font = `600 ${Math.round(Math.min(260 * s, A.w / Math.max(3, d.metin.length) * 1.7))}px Inter, sans-serif`;
    ctx.textBaseline = 'alphabetic'; ctx.fillText(d.metin, x, y + 40 * s);
    ctx.fillStyle = RENK.fg; ctx.font = `600 ${Math.round(48 * s)}px Inter, sans-serif`; ctx.fillText(kirp(ctx, d.k, A.w), x, y + 120 * s);
    if (d.alt) { ctx.fillStyle = RENK.mut; ctx.font = `600 ${Math.round(32 * s)}px Inter, sans-serif`; ctx.fillText(kirp(ctx, d.alt, A.w), x, y + 172 * s); }
  }
  function kartCiz(ctx, A, veri) {
    const s = A.s, n = Math.min(veri.length, 6), dikeyEkran = A.w < A.h * 1.3;
    const sut = dikeyEkran ? (n <= 3 ? 1 : 2) : (n <= 3 ? n : n === 4 ? 2 : 3), sat = Math.ceil(n / sut), bosluk = 28 * s;
    const w = (A.w - bosluk * (sut - 1)) / sut, h = Math.min((A.h - bosluk * (sat - 1)) / sat, 420 * s);
    const y0 = A.y + (A.h - (h * sat + bosluk * (sat - 1))) / 2;
    const p = 36 * s, altVar = veri.slice(0, n).some((d) => d.alt);
    // bütün kartlarda aynı rakam boyutu: en uzun rakam kutuya sığacak kadar
    let fs = Math.min(h * (altVar ? 0.34 : 0.42), 150 * s);
    const sigdir = () => { ctx.font = `600 ${Math.round(fs)}px Inter, sans-serif`; return veri.slice(0, n).every((d) => ctx.measureText(d.metin).width <= w - 2 * p); };
    while (!sigdir() && fs > 30 * s) fs -= 4 * s;
    veri.slice(0, n).forEach((d, i) => {
      const x = A.x + (i % sut) * (w + bosluk), y = y0 + Math.floor(i / sut) * (h + bosluk);
      ctx.fillStyle = 'rgba(238,242,246,.04)'; yuvarlak(ctx, x, y, w, h, 22 * s); ctx.fill();
      ctx.strokeStyle = i === 0 ? 'rgba(0,241,52,.55)' : RENK.line; ctx.lineWidth = 2 * s; ctx.stroke();
      ctx.fillStyle = RENK.mut; ctx.font = `600 ${Math.round(30 * s)}px Inter, sans-serif`; ctx.textBaseline = 'top';
      ctx.fillText(kirp(ctx, d.k, w - 2 * p), x + p, y + p);
      ctx.textBaseline = 'alphabetic';
      const altY = y + h - p, sayiY = altVar ? altY - 26 * s - 28 * s : altY;
      ctx.font = `600 ${Math.round(fs)}px Inter, sans-serif`; ctx.fillStyle = i === 0 ? RENK.yesil : RENK.fg;
      ctx.fillText(d.metin, x + p, sayiY);
      if (d.alt) { ctx.fillStyle = RENK.mut; ctx.font = `600 ${Math.round(26 * s)}px Inter, sans-serif`; ctx.fillText(kirp(ctx, d.alt, w - 2 * p), x + p, altY); }
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
      ctx.font = `600 ${fs}px Inter, sans-serif`; ctx.fillStyle = i === 0 ? RENK.yesil : RENK.mut; ctx.textAlign = 'left';
      ctx.fillText(String(i + 1), A.x, orta);
      ctx.fillStyle = i === 0 ? RENK.fg : 'rgba(238,242,246,.88)'; ctx.font = `600 ${fs}px Inter, sans-serif`;
      ctx.fillText(kirp(ctx, d.k, A.w * 0.62), A.x + 80 * s, orta);
      ctx.textAlign = 'right'; ctx.fillStyle = i === 0 ? RENK.yesil : RENK.fg; ctx.font = `600 ${Math.round(fs * 1.12)}px Inter, sans-serif`;
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
    try { await Promise.all([document.fonts.load('600 60px Inter')]); } catch (err) {}
    const ctx = canvas.getContext('2d');
    const A = zemin(ctx, W, H, ayar.baslik, ayar.alt);
    if (!ayar.veri.length && !(ayar.gorunum === 'tablo' && ayar.T)) { ctx.fillStyle = RENK.mut; ctx.font = `600 ${32 * A.s}px Inter, sans-serif`; ctx.fillText('Bu seçimle çizilecek veri yok.', A.x, A.y + 60 * A.s); return; }
    const g = ayar.gorunum, yz = yorum(ayar, g);
    if (yz) { A.h -= 64 * A.s; ctx.fillStyle = RENK.fg; ctx.font = `600 ${Math.round(28 * A.s)}px Inter, sans-serif`; ctx.fillText(kirp(ctx, yz, A.w), A.x, A.y + A.h + 52 * A.s); }
    if (g === 'podyum') podyumCiz(ctx, A, ayar.veri, ayar.birim);
    else if (g === 'tek') tekCiz(ctx, A, ayar.veri[0]);
    else if (g === 'kart') kartCiz(ctx, A, ayar.veri);
    else if (g === 'liste') listeCiz(ctx, A, ayar.veri);
    else if (g === 'tablo' && ayar.T) tabloCiz(ctx, A, ayar.T);
    else if (g === 'yatay') yatayCiz(ctx, A, ayar.veri);
    else dikeyCiz(ctx, A, ayar.veri, g === 'cizgi');
  }

  // ---------- pencere ----------
  const GORUNUM = [['oto', 'Otomatik'], ['podyum', 'Podyum (ilk üç öne çıkar)'], ['yatay', 'Çubuk'], ['dikey', 'Sütun'], ['cizgi', 'Çizgi'], ['kart', 'Sayı kartları'], ['tek', 'Tek büyük sayı'], ['liste', 'Sıralı liste (sadece rakamlar)'], ['tablo', 'Tablo']];
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
      return {veri: v.slice(0, adet), bicim: 'yatay', T: Tt, birim: ({'1.': 'birincilik', '1.lik': 'birincilik', '2.': 'ikincilik', '3.': 'üçüncülük'})[T.bas[di]] || T.bas[di]};
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
    $('pgIndir').addEventListener('click', () => indir($('pgTuval'), $('pgBaslik').value));
    tabloAyar(); yenile(); $('pgBaslik').focus();
  }

  // ---------- düğmeler ----------
  function dugmeEkle() {
    document.querySelectorAll('#icerik section.card, #icerik .tiles').forEach((kart) => {
      if (kart.closest('#akisAlan, #bugunAlan') || kart.querySelector(':scope > .png-btn') || !kaynaklar(kart).length) return;
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
  window.tjkGrafik = {ac, sayi, uygun, profil: profilAc, _: {RENK, BOYUT, zemin, yuvarlak, kirp, indir}};
})();
