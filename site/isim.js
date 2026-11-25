// Sitedeki her ismi (at, jokey, antrenör, aygır, kısrak, sahip, apranti) tıklanabilir yapar.
// Tıklanınca sağdan bir "karne" paneli açılır. Tablolar değişmeden kalır; isimler çizimden sonra işaretlenir.
(() => {
  const TUR = {
    at: {ad: 'At', f: (r) => r.at},
    jokey: {ad: 'Jokey', f: (r) => r.jokey},
    antr: {ad: 'Antrenör', f: (r) => r.antr},
    baba: {ad: 'Aygır', f: (r) => r.baba},
    anne: {ad: 'Kısrak', f: (r) => r.anne},
    sahip: {ad: 'Sahip', f: (r) => r.sahip}
  };
  const SIRA = ['jokey', 'antr', 'at', 'baba', 'anne', 'sahip'];
  // her tür için isim -> koşular
  const DIZIN = {};
  for (const t of SIRA) DIZIN[t] = new Map();
  for (const r of rows) for (const t of SIRA) {
    const ad = TUR[t].f(r); if (!ad) continue;
    let a = DIZIN[t].get(ad); if (!a) DIZIN[t].set(ad, (a = [])); a.push(r);
  }
  const kucuk = (s) => String(s || '').toLocaleLowerCase('tr').trim();
  // sütun başlığından tür tahmini
  function basliktanTur(b) {
    b = kucuk(b);
    if (/^jokey|kısa ad/.test(b)) return 'jokey';
    if (/antren|^ant\.?$/.test(b)) return 'antr';
    if (/aygır|^baba/.test(b)) return 'baba';
    if (/^anne|kısrak/.test(b)) return 'anne';
    if (/sahip/.test(b)) return 'sahip';
    if (/^at$|^kazanan$|^[123]\.$|^at ismi/.test(b)) return 'at';
    return null;
  }
  function bul(ad, tercih) {
    if (tercih && DIZIN[tercih].has(ad)) return tercih;
    if (tercih) return null;  // başlık türü belli ama isim o türde yok: işaretleme
    return SIRA.find((t) => DIZIN[t].has(ad)) || null;
  }
  function isaretle(el, ad, tur) {
    el.classList.add('isim'); el.dataset.isim = ad; el.dataset.tur = tur;
    el.tabIndex = 0; el.setAttribute('role', 'button'); el.title = TUR[tur].ad + ' karnesini aç';
  }
  function tara(kok) {
    kok.querySelectorAll('table').forEach((tbl) => {
      if (tbl.dataset.isimTarandi === String(tbl.rows.length)) return;
      tbl.dataset.isimTarandi = String(tbl.rows.length);
      const bas = [...tbl.querySelectorAll('thead th')].map((th) => th.textContent);
      tbl.querySelectorAll('tbody tr').forEach((tr) => [...tr.children].forEach((td, i) => {
        if (td.classList.contains('isim') || td.querySelector('a,button,input')) return;
        const metin = td.textContent.trim(); if (!metin || /^[\d.,%₺+\-—\s:]+$/.test(metin)) return;
        if (kucuk(bas[i]) === 'apranti') {   // apranti tam adı: aynı satırdaki kısa ada (jokey adı) bağla
          const ki = bas.findIndex((b) => kucuk(b) === 'kısa ad'), kisa = ki >= 0 ? tr.children[ki]?.textContent.trim() : '';
          if (kisa && DIZIN.jokey.has(kisa)) isaretle(td, kisa, 'jokey');
          return;
        }
        const bt = basliktanTur(bas[i] || '');
        // başlığı isim olmayan sütunlarda (Hipodrom, Sınıf, Ekipman…) tahmin yapma
        if (!bt && !/^(isim|ikili|)$/.test(kucuk(bas[i] || '').replace(/[^a-zçğıöşü]/g, ''))) return;
        if (metin.includes(' + ')) {   // jokey–antrenör ikilileri: iki isim ayrı ayrı
          const [a, b] = metin.split(' + '), ta = bul(a, null), tb = bul(b, null);
          if (!ta && !tb) return;
          td.textContent = '';
          const s1 = document.createElement('span'); s1.textContent = a; if (ta) isaretle(s1, a, ta);
          const s2 = document.createElement('span'); s2.textContent = b; if (tb) isaretle(s2, b, tb);
          td.append(s1, ' + ', s2); return;
        }
        const tur = bul(metin, bt); if (tur) isaretle(td, metin, tur);
      }));
    });
    // açılıştaki "Sezonun önündekiler"
    kok.querySelectorAll('.pist-ad:not(.isim)').forEach((s) => {
      const t = typeof pistSec !== 'undefined' ? {jokey: 'jokey', antr: 'antr', at: 'at', baba: 'baba'}[pistSec] : null;
      const tur = bul(s.textContent.trim(), t); if (tur) isaretle(s, s.textContent.trim(), tur);
    });
  }

  // ---------- karne paneli ----------
  let panel = null;
  function kapat() { panel?.remove(); panel = null; }
  function ac(ad, tur, at) {
    let L = DIZIN[tur].get(ad) || [];
    // aynı adlı birden çok at olabilir
    const atlar = tur === 'at' ? [...new Set(L.map((r) => r.k))] : [];
    if (tur === 'at') { at = at && atlar.includes(at) ? at : atlar[0]; L = L.filter((r) => r.k === at); }
    L = [...L].sort((a, b) => (a.rc.tarih < b.rc.tarih ? 1 : a.rc.tarih > b.rc.tarih ? -1 : 0));
    const kaz = L.filter((r) => r.w), i3 = L.filter((r) => r.i3);
    let h = `<div class="karne-ust"><div><span class="karne-tur">${TUR[tur].ad}</span><h2>${esc(ad)}</h2></div><button type="button" class="karne-kapat" aria-label="Kapat">✕</button></div>`;
    if (atlar.length > 1) h += `<div class="chips">${atlar.map((k) => `<button class="chip${k === at ? ' on' : ''}" data-karne-at="${esc(k)}">${esc(k.split('|')[1])} – ${esc(k.split('|')[2])}</button>`).join('')}</div>`;
    if (tur === 'at' && L[0]) {
      const s = L[0];
      h += `<p class="d">${esc(s.yas)} yaşlı ${esc(String(s.renk).toLowerCase())} ${esc(String(s.cins).toLowerCase())} · <span class="isim" data-isim="${esc(s.baba)}" data-tur="baba" role="button" tabindex="0">${esc(s.baba)}</span> – <span class="isim" data-isim="${esc(s.anne)}" data-tur="anne" role="button" tabindex="0">${esc(s.anne)}</span><br>Antrenör <span class="isim" data-isim="${esc(s.antr)}" data-tur="antr" role="button" tabindex="0">${esc(s.antr)}</span> · Sahip <span class="isim" data-isim="${esc(s.sahip)}" data-tur="sahip" role="button" tabindex="0">${esc(s.sahip)}</span></p>`;
    }
    h += '<div class="tiles">' + kutu('Start', N(L.length)) + kutu('1.lik', N(kaz.length), L.length ? P(pct(kaz.length, L.length)) : '') + kutu('İlk 3', N(i3.length)) + kutu('İkramiye (1.lik)', M(sum(kaz, (r) => r.rc.ikr))) + '</div>';
    if (tur !== 'at') {
      if (tur === 'baba' || tur === 'anne') {
        const taylar = grupla(L, (r) => r.k).sort((a, b) => b.bir - a.bir || b.start - a.start).slice(0, 12);
        h += kart(tur === 'baba' ? 'Tayları' : 'Yavruları', '', tablo([['At', (o) => o.k.split('|')[0]], [tur === 'baba' ? 'Anne' : 'Baba', (o) => o.k.split('|')[tur === 'baba' ? 2 : 1]], ['1.lik', (o) => o.bir, 1], ['Start', (o) => o.start, 1]], taylar));
      } else {
        const es = {jokey: ['antr', 'Birlikte en çok kazandığı antrenörler', 'Antrenör'], antr: ['jokey', 'En çok kazandığı jokeyler', 'Jokey'], sahip: ['antr', 'Antrenörleri', 'Antrenör']}[tur];
        const g = grupla(L, TUR[es[0]].f).sort((a, b) => b.bir - a.bir || b.start - a.start).slice(0, 8);
        h += kart(es[1], '', tablo([[es[2], (o) => o.k], ['1.lik', (o) => o.bir, 1], ['Start', (o) => o.start, 1], ['Kazanma', (o) => P(o.yuzde), 1]], g));
      }
      const hp = grupla(L, (r) => r.rc.hip).sort((a, b) => b.start - a.start);
      h += kart('Hipodromlara göre', '', tablo([['Hipodrom', (o) => o.k], ['Start', (o) => o.start, 1], ['1.lik', (o) => o.bir, 1], ['Kazanma', (o) => P(o.yuzde), 1]], hp));
    }
    const son = tur === 'at' ? L : kaz;
    h += kart(tur === 'at' ? 'Koşuları' : 'Son birincilikleri', '', tablo([['Tarih', (r) => tarih(r.rc.tarih)], ['Hip.', (r) => r.rc.hip], ['Mesafe', (r) => N(r.rc.mes) + ' ' + r.rc.pist], ['Sıra', (r) => (r.derecesiz ? 'Drcsz' : r.sira + '/' + r.rc.n), 1],
      ...(tur === 'at' ? [] : [['At', (r) => r.at]]), ...(tur === 'jokey' ? [] : [['Jokey', (r) => r.jokey]]), ['Derece', (r) => derece(r.sn)], ['Gny', (r) => (r.g ? nf2.format(r.g) : '—'), 1]], son.slice(0, 15), {bos: 'Bu yıl birinciliği yok.'}));
    const tumKat = {jokey: 'j', antr: 'tr', baba: 'ba', sahip: 'sh', at: 'at'}[tur];
    h += `<div class="karne-alt">${tur === 'at' ? '<button type="button" class="btn" data-karne-git="atlar">Ayrıntılı at karnesi</button>' : ''}${tumKat ? '<button type="button" class="btn ikincil" data-karne-git="tum">Tüm zamanlarda gör</button>' : ''}</div>`;

    if (!panel) {
      panel = document.createElement('aside'); panel.className = 'karne'; panel.setAttribute('aria-label', 'Karne');
      document.body.appendChild(panel);
    }
    panel.innerHTML = h; panel.scrollTop = 0;
    panel.querySelector('.karne-kapat').addEventListener('click', kapat);
    panel.querySelectorAll('[data-karne-at]').forEach((b) => b.addEventListener('click', () => ac(ad, 'at', b.dataset.karneAt)));
    panel.querySelectorAll('[data-karne-git]').forEach((b) => b.addEventListener('click', () => {
      const hedef = b.dataset.karneGit; kapat();
      if (hedef === 'atlar') { durum.atAra = ad; durum.atSec = at; }
      document.querySelector(`#sekmeler button[data-tab="${hedef}"]`)?.click();
      if (hedef === 'atlar') setTimeout(() => { const i = document.getElementById('atAra'); if (i) { i.value = ad; atKarnesi(); i.scrollIntoView({behavior: 'smooth'}); } }, 30);
      if (hedef === 'tum') setTimeout(() => window.tjkTum?.goster?.(tumKat, ad), 30);
    }));
    tara(panel);
    panel.querySelector('.karne-kapat').focus();
  }

  // tıklama ve klavye
  document.addEventListener('click', (e) => {
    const el = e.target.closest('.isim[data-isim]'); if (!el) return;
    e.preventDefault(); ac(el.dataset.isim, el.dataset.tur);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && panel) { kapat(); return; }
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches?.('.isim[data-isim]')) { e.preventDefault(); ac(e.target.dataset.isim, e.target.dataset.tur); }
  });
  let bekle;
  new MutationObserver(() => { clearTimeout(bekle); bekle = setTimeout(() => tara(document.body), 80); }).observe(document.body, {childList: true, subtree: true});
  tara(document.body);
  window.tjkIsim = {ac};
})();
