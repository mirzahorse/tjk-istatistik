// At karşılaştırma: 2–4 atı yan yana koyar; satır satır en iyi değer yeşil. PNG olarak indirilebilir.
(() => {
  const e = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
  const PISTLER = ['Kum', 'Çim', 'Sentetik'];
  const tabela = (r) => !r.derecesiz && r.sira >= 1 && r.sira <= 5;

  function atVerisi(ad) {
    const hep = rows.filter((r) => r.at === ad);
    if (!hep.length) return {ad, yok: true};
    // aynı adlı birden çok at varsa en çok koşanı al
    const say = new Map(); for (const r of hep) say.set(r.k, (say.get(r.k) || 0) + 1);
    const k = [...say].sort((a, b) => b[1] - a[1])[0][0];
    const L = hep.filter((r) => r.k === k).sort((a, b) => (a.rc.tarih < b.rc.tarih ? -1 : 1));
    const s = L[L.length - 1], kaz = L.filter((r) => r.w);
    const jm = new Map(); for (const r of L) jm.set(r.jokey, (jm.get(r.jokey) || 0) + 1);
    const der = new Map(); for (const r of L) if (r.sn != null) { const m = r.rc.mes; if (!der.has(m) || r.sn < der.get(m).sn) der.set(m, r); }
    return {ad, L, s, kaz, n: L.length, tab: L.filter(tabela).length, kz: L.reduce((t, r) => t + r.kz, 0),
      pist: Object.fromEntries(PISTLER.map((p) => { const x = L.filter((r) => r.rc.pist === p); return [p, [x.filter((r) => r.w).length, x.length]]; })),
      der, jokey: [...jm].sort((a, b) => b[1] - a[1])[0], form: L.slice(-6).map((r) => (r.derecesiz ? '–' : String(r.sira)))};
  }

  // satırlar: [etiket, değer metni, sayısal (karşılaştırma için), yön (+1 büyük iyi, -1 küçük iyi)]
  function satirlar(V) {
    const ok = V.filter((v) => !v.yok);
    const ortak = [...new Set(ok.flatMap((v) => [...v.der.keys()]))].map((m) => [m, ok.filter((v) => v.der.has(m)).length]).filter(([, c]) => c >= 2).sort((a, b) => b[1] - a[1] || a[0] - b[0]).slice(0, 3).map(([m]) => m).sort((a, b) => a - b);
    const R = [
      ['Yaş · cinsiyet', V.map((v) => (v.yok ? '—' : `${v.s.yas} yaşlı ${String(v.s.cins).toLowerCase()}`)), null, 0],
      ['Baba – anne', V.map((v) => (v.yok ? '—' : `${v.s.baba} – ${v.s.anne}`)), null, 0],
      ['Koşu', V.map((v) => (v.yok ? '0' : N(v.n))), V.map((v) => v.n || 0), 0],
      ['Birincilik', V.map((v) => (v.yok ? '0' : N(v.kaz.length))), V.map((v) => (v.yok ? 0 : v.kaz.length)), 1],
      ['Kazanma yüzdesi', V.map((v) => (v.yok || !v.n ? '—' : P(100 * v.kaz.length / v.n))), V.map((v) => (v.yok || !v.n ? null : v.kaz.length / v.n)), 1],
      ['Tabela yüzdesi (ilk 5)', V.map((v) => (v.yok || !v.n ? '—' : P(100 * v.tab / v.n))), V.map((v) => (v.yok || !v.n ? null : v.tab / v.n)), 1],
      ['Kazanç', V.map((v) => (v.yok ? '—' : M(v.kz))), V.map((v) => (v.yok ? null : v.kz)), 1],
      ['Son handikap puanı', V.map((v) => (v.yok ? '—' : String(v.s.hp ?? '—'))), V.map((v) => (v.yok ? null : v.s.hp ?? null)), 1],
      ...PISTLER.filter((p) => ok.some((v) => v.pist[p][1])).map((p) => [`${p} pistte`, V.map((v) => (v.yok || !v.pist[p][1] ? '—' : `${v.pist[p][0]} / ${v.pist[p][1]}`)), V.map((v) => (v.yok || !v.pist[p][1] ? null : v.pist[p][0] / v.pist[p][1])), 1]),
      ...ortak.map((m) => [`En iyi derece · ${N(m)} m`, V.map((v) => (v.yok || !v.der.has(m) ? '—' : `${derece(v.der.get(m).sn)} (${v.der.get(m).rc.pist})`)), V.map((v) => (v.yok || !v.der.has(m) ? null : v.der.get(m).sn)), -1]),
      ['Son koşusu', V.map((v) => (v.yok ? '—' : `${tarih(v.s.rc.tarih)} · ${v.s.derecesiz ? 'derecesiz' : v.s.sira + '.'}`)), null, 0],
      ['En çok binen jokey', V.map((v) => (v.yok ? '—' : `${v.jokey[0]} (${v.jokey[1]})`)), null, 0]
    ];
    return R.map(([k, m, sayi, yon]) => {
      let en = -1;
      if (sayi && yon) { const g = sayi.filter((x) => x != null); if (g.length >= 2) { const hedef = yon > 0 ? Math.max(...g) : Math.min(...g); if (sayi.filter((x) => x === hedef).length === 1) en = sayi.indexOf(hedef); } }
      return {k, m, en};
    });
  }

  async function pngCiz(canvas, V, R, boyut) {
    const G = window.tjkGrafik._, [W, H] = G.BOYUT[boyut]; canvas.width = W; canvas.height = H;
    try { await Promise.all([document.fonts.load('700 60px "Space Grotesk"'), document.fonts.load('600 30px Inter')]); } catch (err) {}
    const ctx = canvas.getContext('2d'), A = G.zemin(ctx, W, H, V.map((v) => v.ad).join(' · '), 'At karşılaştırma · ' + String(RAW.son).slice(0, 4) + ' sezonu'), s = A.s;
    const sat = R.filter((r) => r.k !== 'Baba – anne' || W > H), n = V.length;
    const lw = A.w * (W > H ? 0.24 : 0.3), cw = (A.w - lw) / n, ust = 92 * s, sh = Math.min((A.h - ust) / (sat.length + 1), 64 * s);
    const fs = Math.round(Math.min(26 * s, sh * 0.42));
    // at başlıkları
    V.forEach((v, i) => {
      const x = A.x + lw + cw * i;
      ctx.fillStyle = 'rgba(238,242,246,.05)'; G.yuvarlak(ctx, x + 8 * s, A.y, cw - 16 * s, ust - 16 * s, 16 * s); ctx.fill();
      ctx.fillStyle = ['#00F134', '#D8B67A', '#7FB2FF', '#FF9DD2'][i]; ctx.fillRect(x + 8 * s, A.y, cw - 16 * s, 5 * s);
      let f = 40 * s; do { ctx.font = `700 ${Math.round(f)}px "Space Grotesk", Inter, sans-serif`; f -= 2 * s; } while (ctx.measureText(v.ad).width > cw - 48 * s && f > 18 * s);
      ctx.fillStyle = '#EEF2F6'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(v.ad, x + cw / 2, A.y + (ust - 16 * s) / 2 + 2 * s);
    });
    sat.forEach((r, j) => {
      const y = A.y + ust + j * sh;
      if (j % 2 === 0) { ctx.fillStyle = 'rgba(238,242,246,.03)'; ctx.fillRect(A.x, y, A.w, sh); }
      ctx.textBaseline = 'middle'; ctx.textAlign = 'left'; ctx.fillStyle = '#8A97AD'; ctx.font = `600 ${fs}px Inter, sans-serif`;
      ctx.fillText(G.kirp(ctx, r.k, lw - 16 * s), A.x + 12 * s, y + sh / 2);
      r.m.forEach((m, i) => {
        const x = A.x + lw + cw * i + cw / 2; ctx.textAlign = 'center';
        ctx.fillStyle = r.en === i ? '#00F134' : '#EEF2F6'; ctx.font = `${r.en === i ? 700 : 500} ${fs}px Inter, sans-serif`;
        ctx.fillText(G.kirp(ctx, m, cw - 24 * s), x, y + sh / 2);
      });
    });
    // form satırı
    const fy = A.y + ust + sat.length * sh + sh / 2;
    ctx.textAlign = 'left'; ctx.fillStyle = '#8A97AD'; ctx.font = `600 ${fs}px Inter, sans-serif`; ctx.fillText('Son 6 koşu', A.x + 12 * s, fy);
    V.forEach((v, i) => {
      const f = v.form || [], r = Math.min(sh * 0.36, (cw - 30 * s) / 13), x0 = A.x + lw + cw * i + cw / 2 - (f.length * r * 2.3) / 2 + r;
      f.forEach((x, k) => {
        const sira = +x, cx = x0 + k * r * 2.3;
        ctx.beginPath(); ctx.arc(cx, fy, r, 0, Math.PI * 2);
        ctx.fillStyle = sira === 1 ? '#00F134' : sira <= 3 && sira ? '#D8B67A' : sira <= 5 && sira ? 'rgba(238,242,246,.25)' : 'rgba(238,242,246,.08)'; ctx.fill();
        ctx.fillStyle = sira && sira <= 3 ? '#070E1D' : '#EEF2F6'; ctx.textAlign = 'center'; ctx.font = `700 ${Math.round(r * 1.05)}px "Space Grotesk", Inter, sans-serif`; ctx.fillText(x, cx, fy + 1);
      });
    });
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  }

  function ac(adlar) {
    adlar = [...new Set(adlar)].slice(0, 4);
    const V = adlar.map(atVerisi), R = satirlar(V);
    const p = document.createElement('div'); p.className = 'pngp'; p.setAttribute('role', 'dialog'); p.setAttribute('aria-modal', 'true'); p.setAttribute('aria-label', 'At karşılaştırma');
    p.innerHTML = `<div class="pngp-kutu"><div class="pngp-ust"><h2>At karşılaştırma</h2><button type="button" class="pngp-kapat" aria-label="Kapat">✕</button></div>
      <div class="tw"><table class="kars-tablo"><thead><tr><th></th>${V.map((v) => `<th>${v.yok ? e(v.ad) : `<span class="isim" data-isim="${e(v.ad)}" data-tur="at" role="button" tabindex="0">${e(v.ad)}</span>`}</th>`).join('')}</tr></thead>
      <tbody>${R.map((r) => `<tr><td class="kars-k">${e(r.k)}</td>${r.m.map((m, i) => `<td class="${r.en === i ? 'pos' : ''}">${e(m)}</td>`).join('')}</tr>`).join('')}
      <tr><td class="kars-k">Son 6 koşu</td>${V.map((v) => `<td class="form">${(v.form || []).map((x) => `<i class="f${x === '1' ? 1 : +x && +x <= 3 ? 2 : +x && +x <= 5 ? 3 : 4}">${x}</i>`).join('') || '—'}</td>`).join('')}</tr></tbody></table></div>
      <p class="d">Yeşil: o satırdaki en iyi değer. Bu yılın koşularından.</p>
      <div class="ctl" style="margin-top:10px"><label>PNG boyutu<select id="ksBoyut"><option value="yayin">Yayın · 1920×1080</option><option value="kare">Kare · 1080×1080</option><option value="dikey">Instagram · 1080×1350</option></select></label><button type="button" class="btn" id="ksIndir">PNG indir</button></div>
      <canvas id="ksTuval" class="kars-onizleme"></canvas></div>`;
    document.body.appendChild(p);
    const tuval = p.querySelector('#ksTuval'), boy = p.querySelector('#ksBoyut');
    const yenile = () => pngCiz(tuval, V, R, boy.value);
    const kapat = () => { p.remove(); document.removeEventListener('keydown', esc, true); };
    const esc = (ev) => { if (ev.key === 'Escape' && !document.querySelector('.karne')) { ev.stopPropagation(); kapat(); } };
    document.addEventListener('keydown', esc, true);
    p.addEventListener('click', (ev) => { if (ev.target === p) kapat(); });
    p.querySelector('.pngp-kapat').addEventListener('click', kapat);
    boy.addEventListener('change', yenile);
    p.querySelector('#ksIndir').addEventListener('click', () => window.tjkGrafik._.indir(tuval, adlar.join('-') + '-karsilastirma'));
    yenile();
  }
  window.tjkKarsilastir = {ac, atVerisi};
})();
