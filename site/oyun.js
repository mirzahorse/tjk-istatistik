/* "O mu, bu mu?" oyunu — iki seçenekten doğru olanı tahmin et. Bütün cevaplar 2026 verisinden hesaplanır.
   index.html'deki rows, races, grupla, esc, N, M, nf1, nf2, derece, tarih, RAW tanımlarını kullanır. */
"use strict";
(function () {
  const TUR_SAYISI = 10;
  const rnd = (n) => Math.floor(Math.random() * n);
  const sec = (a) => a[rnd(a.length)];
  const ad = (k) => k.split('|')[0];

  // ---------- havuzlar (bir kez hesaplanır) ----------
  let H = null;
  function havuz() {
    if (H) return H;
    const atG = grupla(rows, (r) => r.k);
    const atBilgi = new Map(); for (const r of rows) atBilgi.set(r.k, r);
    const kisi = (f, min) => grupla(rows, (r) => r[f]).filter((o) => o.start >= min);
    const kazananlar = rows.filter((r) => r.w);
    const derece = new Map();
    for (const r of kazananlar) if (r.sn != null) { const k = r.rc.hip + '|' + r.rc.pist + '|' + r.rc.mes + '|' + r.rc.irk; if (!derece.has(k)) derece.set(k, []); derece.get(k).push(r); }
    const fav = grupla(rows.filter((r) => r.fav), (r) => r.rc.hip);
    H = {
      atBir: atG.filter((o) => o.bir >= 2).sort((a, b) => b.bir - a.bir).slice(0, 300),
      atIkr: atG.filter((o) => o.ikr > 0).sort((a, b) => b.ikr - a.ikr).slice(0, 200),
      atBilgi,
      jokey: kisi('jokey', 150).sort((a, b) => b.bir - a.bir).slice(0, 45),
      antr: kisi('antr', 100).sort((a, b) => b.bir - a.bir).slice(0, 45),
      sahip: kisi('sahip', 40).sort((a, b) => b.bir - a.bir).slice(0, 45),
      aygir: kisi('baba', 60).sort((a, b) => b.bir - a.bir).slice(0, 45),
      derece: [...derece.values()].filter((a) => a.length >= 6),
      surpriz: kazananlar.filter((r) => r.g > 0),
      fav: fav.filter((o) => o.start >= 100)
    };
    return H;
  }

  // ---------- soru türleri ----------
  // her biri {kat, soru, a, b, va, vb, yon ('cok' büyük kazanır | 'az' küçük kazanır), fmt, not}
  function ikili(list, fark) {
    for (let i = 0; i < 60; i++) {
      const a = sec(list), b = sec(list);
      if (a !== b && fark(a, b)) return [a, b];
    }
    return null;
  }
  const atAlt = (k) => { const r = H.atBilgi.get(k); return `${r.baba} · ${r.yas} yaşlı · ${r.antr}`; };
  const TURLER = {
    at: [
      () => { const p = ikili(H.atBir, (a, b) => a.bir !== b.bir); return p && {soru: 'Hangi at 2026\'da daha çok birincilik aldı?', a: {ad: ad(p[0].k), alt: atAlt(p[0].k)}, b: {ad: ad(p[1].k), alt: atAlt(p[1].k)}, va: p[0].bir, vb: p[1].bir, yon: 'cok', fmt: (v) => v + ' birincilik', ek: (i) => `${p[i].start} koşu`}; },
      () => { const p = ikili(H.atIkr, (a, b) => Math.abs(a.ikr - b.ikr) > 1e5); return p && {soru: 'Hangi at 2026\'da daha çok ikramiye kazandı?', a: {ad: ad(p[0].k), alt: atAlt(p[0].k)}, b: {ad: ad(p[1].k), alt: atAlt(p[1].k)}, va: p[0].ikr, vb: p[1].ikr, yon: 'cok', fmt: (v) => M(v), ek: (i) => `${p[i].bir} birincilik`}; }
    ],
    jokey: [
      () => { const p = ikili(H.jokey, (a, b) => a.bir !== b.bir); return p && {soru: 'Hangi jokey 2026\'da daha çok kazandı?', a: {ad: p[0].k, alt: 'Jokey'}, b: {ad: p[1].k, alt: 'Jokey'}, va: p[0].bir, vb: p[1].bir, yon: 'cok', fmt: (v) => v + ' birincilik', ek: (i) => `${N(p[i].start)} biniş`}; },
      () => { const p = ikili(H.jokey, (a, b) => Math.abs(a.yuzde - b.yuzde) >= 0.5); return p && {soru: 'Hangi jokeyin kazanma oranı daha yüksek?', a: {ad: p[0].k, alt: 'Jokey'}, b: {ad: p[1].k, alt: 'Jokey'}, va: p[0].yuzde, vb: p[1].yuzde, yon: 'cok', fmt: (v) => '%' + nf1.format(v), ek: (i) => `${N(p[i].start)} binişte ${p[i].bir}`}; },
      () => { const p = ikili(H.antr, (a, b) => a.bir !== b.bir); return p && {soru: 'Hangi antrenör 2026\'da daha çok kazandı?', a: {ad: p[0].k, alt: 'Antrenör'}, b: {ad: p[1].k, alt: 'Antrenör'}, va: p[0].bir, vb: p[1].bir, yon: 'cok', fmt: (v) => v + ' birincilik', ek: (i) => `${N(p[i].start)} start`}; },
      () => { const p = ikili(H.sahip, (a, b) => a.bir !== b.bir); return p && {soru: 'Hangi sahibin atları daha çok kazandı?', a: {ad: p[0].k, alt: 'Sahip'}, b: {ad: p[1].k, alt: 'Sahip'}, va: p[0].bir, vb: p[1].bir, yon: 'cok', fmt: (v) => v + ' birincilik', ek: (i) => `${N(p[i].start)} start`}; }
    ],
    aygir: [
      () => { const p = ikili(H.aygir, (a, b) => a.bir !== b.bir); return p && {soru: 'Hangi aygırın tayları daha çok kazandı?', a: {ad: p[0].k, alt: 'Aygır'}, b: {ad: p[1].k, alt: 'Aygır'}, va: p[0].bir, vb: p[1].bir, yon: 'cok', fmt: (v) => v + ' birincilik', ek: (i) => `${p[i].atlar.size} tay`}; },
      () => { const p = ikili(H.aygir, (a, b) => a.kazAt.size !== b.kazAt.size); return p && {soru: 'Hangi aygırın daha çok farklı tayı kazandı?', a: {ad: p[0].k, alt: 'Aygır'}, b: {ad: p[1].k, alt: 'Aygır'}, va: p[0].kazAt.size, vb: p[1].kazAt.size, yon: 'cok', fmt: (v) => v + ' kazanan tay', ek: (i) => `${p[i].atlar.size} tay koştu`}; }
    ],
    derece: [
      () => {
        const grup = sec(H.derece); const p = ikili(grup, (a, b) => a.sn !== b.sn && a.k !== b.k); if (!p) return null;
        const r = p[0].rc;
        return {soru: `${r.hip} ${N(r.mes)} m ${r.pist.toLowerCase()} pistte hangi ${r.irk === 'Arap' ? 'Arap' : 'İngiliz'} at daha hızlı koşarak kazandı?`, a: {ad: p[0].at, alt: tarih(p[0].rc.tarih) + ' · ' + p[0].jokey}, b: {ad: p[1].at, alt: tarih(p[1].rc.tarih) + ' · ' + p[1].jokey}, va: p[0].sn, vb: p[1].sn, yon: 'az', fmt: (v) => derece(v), ek: (i) => p[i].rc.sinif};
      },
      () => { const p = ikili(H.surpriz, (a, b) => Math.abs(a.g - b.g) >= 0.5); return p && {soru: 'Hangi at daha yüksek ganyanla kazandı?', a: {ad: p[0].at, alt: tarih(p[0].rc.tarih) + ' · ' + p[0].rc.hip}, b: {ad: p[1].at, alt: tarih(p[1].rc.tarih) + ' · ' + p[1].rc.hip}, va: p[0].g, vb: p[1].g, yon: 'cok', fmt: (v) => nf2.format(v) + ' ganyan', ek: (i) => p[i].jokey}; },
      () => { const p = ikili(H.fav, (a, b) => Math.abs(a.yuzde - b.yuzde) >= 1); return p && {soru: 'Hangi hipodromda favoriler daha sık kazanıyor?', a: {ad: p[0].k, alt: 'Hipodrom'}, b: {ad: p[1].k, alt: 'Hipodrom'}, va: p[0].yuzde, vb: p[1].yuzde, yon: 'cok', fmt: (v) => '%' + nf1.format(v), ek: (i) => `${N(p[i].start)} koşuda`}; }
    ]
  };
  TURLER.karisik = [].concat(TURLER.at, TURLER.jokey, TURLER.aygir, TURLER.derece);
  const KATEGORI = [['karisik', 'Karışık'], ['at', 'Atlar'], ['jokey', 'Jokey · Antrenör · Sahip'], ['aygir', 'Aygırlar'], ['derece', 'Derece · Ganyan · Hipodrom']];

  // ---------- durum ----------
  const D = {kat: 'karisik', no: 0, skor: 0, seri: 0, enSeri: 0, soru: null, cevaplandi: false, gecmis: [], kullanilan: new Set(), sonSoru: ''};
  const rekorAl = (k) => { try { return +localStorage.getItem('tjk_oyun_rekor_' + k) || 0; } catch { return 0; } };
  const rekorYaz = (k, v) => { try { localStorage.setItem('tjk_oyun_rekor_' + k, String(v)); } catch { /* yok say */ } };

  // aynı turda aynı ikili ve aynı soru türü üst üste gelmesin
  function yeniSoru() {
    const liste = TURLER[D.kat];
    for (let i = 0; i < 40; i++) {
      const s = sec(liste)(); if (!s) continue;
      const anahtar = s.soru + '|' + [s.a.ad, s.b.ad].sort().join('|');
      if (D.kullanilan.has(anahtar) || (i < 20 && s.soru === D.sonSoru)) continue;
      D.kullanilan.add(anahtar); D.sonSoru = s.soru; return s;
    }
    return null;
  }

  // ---------- görünüm ----------
  const st = document.createElement('style');
  st.textContent = `
  .oy{max-width:760px;margin:0 auto}
  .oy-kat{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:14px}
  .oy-kat button{font:600 13px Inter,sans-serif;color:var(--fg);background:var(--panel);border:1px solid var(--line);border-radius:20px;padding:7px 12px;cursor:pointer}
  .oy-kat button.on{background:var(--yesil);color:var(--lacivert);border-color:var(--yesil)}
  .oy-ust{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:10px;color:var(--mut);font-size:13px}
  .oy-ust b{color:var(--fg);font-size:15px}
  .oy-bar{height:6px;background:var(--panel);border-radius:3px;overflow:hidden;margin-bottom:16px}.oy-bar i{display:block;height:100%;background:var(--yesil);transition:width .3s}
  .oy-soru{font:700 22px/1.25 "Space Grotesk",Inter,sans-serif;text-align:center;margin:6px 0 18px}
  .oy-ikili{display:grid;grid-template-columns:1fr auto 1fr;gap:12px;align-items:stretch}
  .oy-vs{align-self:center;font:700 16px "Space Grotesk",sans-serif;color:var(--lacivert);background:var(--yesil);width:42px;height:42px;border-radius:50%;display:grid;place-items:center}
  .oy-sec{font:inherit;color:var(--fg);background:var(--panel);border:2px solid var(--line);border-radius:10px;padding:18px 14px;cursor:pointer;text-align:center;min-height:150px;display:flex;flex-direction:column;justify-content:center;gap:6px;transition:border-color .15s,transform .1s}
  .oy-sec:hover:not([disabled]){border-color:var(--yesil);transform:translateY(-2px)}
  .oy-sec .ad{font:700 20px/1.2 "Space Grotesk",Inter,sans-serif;word-break:break-word}
  .oy-sec .alt{font-size:12px;color:var(--mut)}
  .oy-sec .deger{font:700 22px "Space Grotesk",sans-serif;margin-top:6px}
  .oy-sec .ek{font-size:12px;color:var(--mut)}
  .oy-sec[disabled]{cursor:default}
  .oy-sec.dogru{border-color:var(--yesil);background:rgba(0,241,52,.08)}.oy-sec.dogru .deger{color:var(--yesil)}
  .oy-sec.yanlis{border-color:var(--bad);background:rgba(255,107,90,.08)}.oy-sec.yanlis .deger{color:var(--bad)}
  .oy-sonuc{text-align:center;margin-top:16px;min-height:76px}
  .oy-sonuc p{margin:0 0 10px;font-weight:600}
  .oy-btn{font:700 15px "Space Grotesk",Inter,sans-serif;background:var(--yesil);color:var(--lacivert);border:0;border-radius:6px;padding:11px 22px;cursor:pointer}
  .oy-btn.ikincil{background:transparent;color:var(--yesil);border:1px solid var(--yesil)}
  .oy-son{text-align:center;background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:28px 18px}
  .oy-son .buyuk{font:700 56px "Space Grotesk",sans-serif;color:var(--yesil);line-height:1}
  .oy-son table{margin:16px auto 0;max-width:560px}
  .oy-ipucu{text-align:center;color:var(--mut);font-size:12px;margin-top:14px}
  @media (max-width:560px){.oy-ikili{grid-template-columns:1fr;}.oy-vs{justify-self:center}.oy-sec{min-height:110px}.oy-soru{font-size:19px}}`;
  document.head.appendChild(st);

  const alan = () => document.getElementById('oyunAlan');
  function katHtml() {
    return `<div class="oy-kat" role="group" aria-label="Kategori">${KATEGORI.map(([k, t]) => `<button type="button" data-kat="${k}" class="${k === D.kat ? 'on' : ''}">${esc(t)}</button>`).join('')}</div>`;
  }
  function ciz() {
    const el = alan(); if (!el) return;
    if (D.no >= TUR_SAYISI) return bitis();
    const s = D.soru;
    if (!s) { el.innerHTML = '<div class="empty">Soru üretilemedi.</div>'; return; }
    const kart = (x, v, i) => `<button type="button" class="oy-sec" data-i="${i}"><span class="ad">${esc(x.ad)}</span><span class="alt">${esc(x.alt)}</span><span class="deger" hidden>${esc(s.fmt(v))}</span><span class="ek" hidden>${esc(s.ek(i))}</span></button>`;
    el.innerHTML = `<div class="oy">${katHtml()}
      <div class="oy-ust"><span>Soru <b>${D.no + 1}</b> / ${TUR_SAYISI}</span><span>Skor <b>${D.skor}</b></span><span>Seri <b>${D.seri}</b></span><span>Rekor <b>${rekorAl(D.kat)}</b></span></div>
      <div class="oy-bar"><i style="width:${100 * D.no / TUR_SAYISI}%"></i></div>
      <div class="oy-soru">${esc(s.soru)}</div>
      <div class="oy-ikili">${kart(s.a, s.va, 0)}<div class="oy-vs">VS</div>${kart(s.b, s.vb, 1)}</div>
      <div class="oy-sonuc" aria-live="polite"></div>
      <div class="oy-ipucu">Klavyeden ← / → veya 1 / 2 ile de seçebilirsiniz.</div></div>`;
    bagla();
  }
  function bagla() {
    const el = alan();
    el.querySelectorAll('[data-kat]').forEach((b) => b.addEventListener('click', () => { D.kat = b.dataset.kat; yeniOyun(); }));
    el.querySelectorAll('.oy-sec').forEach((b) => b.addEventListener('click', () => cevap(+b.dataset.i)));
  }
  function cevap(i) {
    if (D.cevaplandi) return;
    D.cevaplandi = true;
    const s = D.soru, dogruI = (s.yon === 'cok' ? s.va > s.vb : s.va < s.vb) ? 0 : 1, dogru = i === dogruI;
    if (dogru) { D.skor++; D.seri++; D.enSeri = Math.max(D.enSeri, D.seri); } else D.seri = 0;
    D.gecmis.push({soru: s.soru, sen: i === 0 ? s.a.ad : s.b.ad, dogru, cevap: dogruI === 0 ? s.a.ad : s.b.ad, deger: s.fmt(dogruI === 0 ? s.va : s.vb)});
    const el = alan();
    el.querySelectorAll('.oy-sec').forEach((b) => {
      const bi = +b.dataset.i; b.disabled = true;
      b.querySelectorAll('.deger,.ek').forEach((x) => { x.hidden = false; });
      if (bi === dogruI) b.classList.add('dogru'); else if (bi === i) b.classList.add('yanlis');
    });
    el.querySelector('.oy-ust').innerHTML = `<span>Soru <b>${D.no + 1}</b> / ${TUR_SAYISI}</span><span>Skor <b>${D.skor}</b></span><span>Seri <b>${D.seri}</b></span><span>Rekor <b>${rekorAl(D.kat)}</b></span>`;
    const son = D.no + 1 >= TUR_SAYISI;
    el.querySelector('.oy-sonuc').innerHTML = `<p>${dogru ? (D.seri >= 3 ? `Doğru! ${D.seri} soru üst üste 🔥` : 'Doğru!') : 'Yanlış.'}</p><button type="button" class="oy-btn" id="oySonraki">${son ? 'Sonucu gör' : 'Sonraki soru'}</button>`;
    const b = document.getElementById('oySonraki'); b.addEventListener('click', sonraki); b.focus();
  }
  function sonraki() { D.no++; D.cevaplandi = false; D.soru = D.no < TUR_SAYISI ? yeniSoru() : null; ciz(); }
  function bitis() {
    const eski = rekorAl(D.kat), yeni = D.skor > eski; if (yeni) rekorYaz(D.kat, D.skor);
    const mesaj = D.skor === 10 ? 'Kusursuz! Gerçek bir yarış uzmanı.' : D.skor >= 8 ? 'Çok iyi! Pisti iyi tanıyorsunuz.' : D.skor >= 5 ? 'Fena değil, biraz daha istatistik çalışalım.' : 'Bu sefer olmadı, bir tur daha?';
    const kat = KATEGORI.find((k) => k[0] === D.kat)[1];
    alan().innerHTML = `<div class="oy">${katHtml()}<div class="oy-son">
      <div class="buyuk">${D.skor}/${TUR_SAYISI}</div><p style="font-weight:600;margin:10px 0 4px">${esc(mesaj)}</p>
      <p style="color:var(--mut);margin:0">${esc(kat)} · En uzun seri ${D.enSeri}${yeni ? ' · Yeni rekor!' : ' · Rekor ' + Math.max(eski, D.skor)}</p>
      <div style="margin-top:16px;display:flex;gap:10px;justify-content:center;flex-wrap:wrap"><button type="button" class="oy-btn" id="oyTekrar">Tekrar oyna</button><button type="button" class="oy-btn ikincil" id="oyKopya">Skoru kopyala</button></div>
      <div id="oyLider"></div><div class="tw"><table><thead><tr><th></th><th>Soru</th><th>Doğru cevap</th></tr></thead><tbody>${D.gecmis.map((g) => `<tr><td class="${g.dogru ? 'pos' : 'neg'}">${g.dogru ? '✓' : '✗'}</td><td style="white-space:normal">${esc(g.soru)}</td><td>${esc(g.cevap)} <span style="color:var(--mut)">(${esc(g.deger)})</span></td></tr>`).join('')}</tbody></table></div></div></div>`;
    bagla();
    if (window.tjkUye && !D.kaydedildi) { D.kaydedildi = true; const k = D.kat, sk = D.skor; window.tjkUye.skorKaydet(k, sk).catch(console.error).finally(() => window.tjkUye.liderlik(k, document.getElementById('oyLider'))); }
    else if (window.tjkUye) window.tjkUye.liderlik(D.kat, document.getElementById('oyLider'));
    document.getElementById('oyTekrar').addEventListener('click', yeniOyun);
    document.getElementById('oyKopya').addEventListener('click', (e) => {
      const metin = `O mu, bu mu? (${kat}) skorum: ${D.skor}/${TUR_SAYISI} ${D.gecmis.map((g) => (g.dogru ? '🟩' : '🟥')).join('')} ${location.href.split('#')[0]}#oyun`;
      navigator.clipboard.writeText(metin).then(() => { e.target.textContent = 'Kopyalandı'; }, () => { e.target.textContent = 'Kopyalanamadı'; });
    });
  }
  function yeniOyun() { havuz(); Object.assign(D, {no: 0, skor: 0, seri: 0, enSeri: 0, cevaplandi: false, gecmis: [], kullanilan: new Set(), sonSoru: '', kaydedildi: false}); D.soru = yeniSoru(); ciz(); }

  document.addEventListener('keydown', (e) => {
    if (!alan() || /INPUT|SELECT|TEXTAREA/.test(document.activeElement?.tagName || '')) return;
    if (!D.cevaplandi && D.soru && D.no < TUR_SAYISI) { if (e.key === 'ArrowLeft' || e.key === '1') cevap(0); else if (e.key === 'ArrowRight' || e.key === '2') cevap(1); }
  });

  window.tjkOyun = {baslat: () => { if (!D.soru || D.no >= TUR_SAYISI) yeniOyun(); else ciz(); }};
  if (typeof sekme !== 'undefined' && sekme === 'oyun') window.tjkOyun.baslat();
})();
