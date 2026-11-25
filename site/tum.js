// "Tüm zamanlar" sekmesi: TJK'nın sonuç dosyası yayımladığı tüm yılların kariyer özetleri.
// Veriler site/kariyer/*.json dosyalarından, sekme açılınca yüklenir.
(() => {
  const KAT = [['j', 'Jokey'], ['tr', 'Antrenör'], ['at', 'At'], ['ba', 'Aygır (baba)'], ['sh', 'Sahip']];
  const MIN_VARS = {j: 100, tr: 100, at: 10, ba: 50, sh: 50};
  const S = {kat: 'j', ara: '', sira: 'bir', min: null, bas: null, bit: null, sec: null};
  const yuk = {};
  const nf = new Intl.NumberFormat('tr-TR'), nf1 = new Intl.NumberFormat('tr-TR', {minimumFractionDigits: 1, maximumFractionDigits: 1});
  const e = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
  const fold = (s) => String(s || '').toLocaleUpperCase('tr').replace(/\s+/g, ' ').trim();

  async function veri(k) {
    if (!yuk[k]) yuk[k] = window.tjkCoz('kariyer/' + k + '.enc').then(JSON.parse);
    return yuk[k];
  }
  const adGoster = (k, ad) => {
    if (k !== 'at') return ad;
    const [a, d, irk] = ad.split('|');
    return a + (d || irk ? ` (${[d && d + ' doğ.', irk].filter(Boolean).join(', ')})` : '');
  };

  function hesapla(D) {
    const bas = S.bas, bit = S.bit, q = fold(S.ara);
    const min = S.min ?? MIN_VARS[S.kat];
    let L = [];
    for (const [ad, , yl] of D.k) {
      if (q && !fold(ad.split('|')[0]).includes(q)) continue;
      const t = [0, 0, 0, 0, 0, 0]; let ilk = 0, son = 0;
      for (const x of yl) {
        if (x[0] < bas || x[0] > bit) continue;
        for (let i = 0; i < 6; i++) t[i] += x[i + 1];
        if (!ilk) ilk = x[0]; son = x[0];
      }
      if (!t[0]) continue;
      L.push({ad, t, ilk, son, yuzde: 100 * t[1] / t[0], tabela: 100 * (t[1] + t[2] + t[3]) / t[0]});
    }
    if (S.sira === 'yuzde' || S.sira === 'tabela') L = L.filter((o) => o.t[0] >= min);
    const f = {bir: (o) => o.t[1], kosu: (o) => o.t[0], yuzde: (o) => o.yuzde, tabela: (o) => o.tabela, iki: (o) => o.t[2]}[S.sira];
    L.sort((a, b) => f(b) - f(a) || b.t[1] - a.t[1]);
    return L;
  }

  function detay(D, o) {
    const [, , yl] = D.k.find((x) => x[0] === o.ad);
    const satir = yl.filter((x) => x[0] >= S.bas && x[0] <= S.bit);
    const grafik = typeof cizgi === 'function' && satir.length > 1 ? cizgi(satir.map((x) => ({x: String(x[0]), y: x[2]})), {aria: 'Yıllara göre birincilik'}) : '';
    return `<section class="card" id="tumDetay"><h2>${e(adGoster(S.kat, o.ad))}</h2>
      <p class="d">${o.ilk === o.son ? o.ilk : o.ilk + '–' + o.son} · ${nf.format(o.t[0])} koşu · ${nf.format(o.t[1])} birincilik (%${nf1.format(o.yuzde)}) · ilk üç %${nf1.format(o.tabela)}</p>
      ${grafik ? '<p class="d">Yıllara göre birincilik sayısı</p>' + grafik : ''}
      <div class="tw"><table><thead><tr><th>Yıl</th><th class="r">Koşu</th><th class="r">1.</th><th class="r">2.</th><th class="r">3.</th><th class="r">4.</th><th class="r">5.</th><th class="r">Kazanma %</th></tr></thead><tbody>
      ${satir.slice().reverse().map((x) => `<tr><td>${x[0]}</td>${x.slice(1).map((v) => `<td class="r">${nf.format(v)}</td>`).join('')}<td class="r">%${nf1.format(x[1] ? 100 * x[2] / x[1] : 0)}</td></tr>`).join('')}
      </tbody></table></div></section>`;
  }

  async function ciz() {
    const alan = document.getElementById('tumAlan'); if (!alan) return;
    let D;
    try { D = await veri(S.kat); } catch (err) {
      alan.innerHTML = '<section class="card"><div class="empty">Tüm zamanlar verisi henüz hazır değil. Biraz sonra tekrar deneyin.</div></section>'; return;
    }
    if (!document.getElementById('tumAlan')) return;
    const yillar = Object.keys(D.yillar).map(Number);
    const yMin = Math.min(...yillar), yMax = Math.max(...yillar);
    if (S.bas == null || S.bas < yMin) S.bas = yMin;
    if (S.bit == null || S.bit > yMax) S.bit = yMax;
    const L = hesapla(D);
    const ySec = (id, v) => `<select id="${id}">${yillar.map((y) => `<option${y === v ? ' selected' : ''}>${y}</option>`).join('')}</select>`;
    const sec = S.sec && L.find((o) => o.ad === S.sec);
    const enIyi = L[0];
    alan.innerHTML = `
      <section class="card"><h2>Tüm zamanlar</h2>
        <p class="d">${yMin}–${yMax} yılları. Bir isme tıklayınca yıl yıl dökümü açılır.</p>
        <div class="tum-kat">${KAT.map(([k, a]) => `<button type="button" class="btn${k === S.kat ? ' on' : ''}" data-kat="${k}">${a}</button>`).join('')}</div>
        <div class="filters tum-f">
          <label>Ara<input id="tumAra" type="search" placeholder="İsim yazın" value="${e(S.ara)}"></label>
          <label>İlk yıl${ySec('tumBas', S.bas)}</label>
          <label>Son yıl${ySec('tumBit', S.bit)}</label>
          <label>Sırala<select id="tumSira">${[['bir', 'Birincilik'], ['iki', 'İkincilik'], ['kosu', 'Koşu sayısı'], ['yuzde', 'Kazanma %'], ['tabela', 'İlk üç %']].map(([v, t]) => `<option value="${v}"${v === S.sira ? ' selected' : ''}>${t}</option>`).join('')}</select></label>
          ${S.sira === 'yuzde' || S.sira === 'tabela' ? `<label>En az koşu<input id="tumMin" type="number" min="1" value="${S.min ?? MIN_VARS[S.kat]}" style="width:6em"></label>` : ''}
        </div>
        ${enIyi && !S.ara ? `<div class="tiles">${[
          ['Zirvede', adGoster(S.kat, enIyi.ad).replace(/ \(.*/, '')],
          [S.sira === 'kosu' ? 'Koşu' : S.sira === 'yuzde' ? 'Kazanma %' : S.sira === 'tabela' ? 'İlk üç %' : S.sira === 'iki' ? 'İkincilik' : 'Birincilik',
            S.sira === 'yuzde' ? '%' + nf1.format(enIyi.yuzde) : S.sira === 'tabela' ? '%' + nf1.format(enIyi.tabela) : nf.format(S.sira === 'kosu' ? enIyi.t[0] : S.sira === 'iki' ? enIyi.t[2] : enIyi.t[1])]
        ].map(([k, v]) => `<div class="tile"><div class="k">${e(k)}</div><div class="v">${e(v)}</div></div>`).join('')}</div>` : ''}
        ${L.length ? `<div class="tw tall"><table class="tik"><thead><tr><th class="r">#</th><th>${e(KAT.find((x) => x[0] === S.kat)[1])}</th><th>Yıllar</th><th class="r">Koşu</th><th class="r">1.</th><th class="r">2.</th><th class="r">3.</th><th class="r">Kazanma %</th><th class="r">İlk üç %</th></tr></thead><tbody>
          ${L.slice(0, 200).map((o, i) => `<tr data-ad="${e(o.ad)}"${o.ad === S.sec ? ' class="sec"' : ''}><td class="r">${i + 1}</td><td><a href="#" data-ad="${e(o.ad)}">${e(adGoster(S.kat, o.ad))}</a></td><td>${o.ilk === o.son ? o.ilk : o.ilk + '–' + o.son}</td><td class="r">${nf.format(o.t[0])}</td><td class="r">${nf.format(o.t[1])}</td><td class="r">${nf.format(o.t[2])}</td><td class="r">${nf.format(o.t[3])}</td><td class="r">%${nf1.format(o.yuzde)}</td><td class="r">%${nf1.format(o.tabela)}</td></tr>`).join('')}
          </tbody></table></div>${L.length > 200 ? `<p class="d">İlk 200 gösteriliyor (toplam ${nf.format(L.length)}). Aramayla daraltabilirsiniz.</p>` : ''}` : '<div class="empty">Sonuç yok.</div>'}
        <p class="d">Not: Jokey, antrenör ve sahip adları TJK dosyalarındaki kısaltmalarla tutulur; uzun yıllarda aynı kısaltmayı kullanan farklı kişiler birleşmiş görünebilir. Atlar ad + doğum yılı + ırk ile ayırt edilir.</p>
      </section>
      ${sec ? detay(D, sec) : ''}`;

    alan.querySelectorAll('[data-kat]').forEach((b) => b.addEventListener('click', () => { S.kat = b.dataset.kat; S.sec = null; S.min = null; S.ara = ''; ciz(); }));
    let t; const ara = document.getElementById('tumAra');
    ara.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => { S.ara = ara.value; S.sec = null; ciz().then(() => { const a = document.getElementById('tumAra'); a.focus(); a.setSelectionRange(a.value.length, a.value.length); }); }, 300); });
    document.getElementById('tumBas').addEventListener('change', (ev) => { S.bas = +ev.target.value; if (S.bit < S.bas) S.bit = S.bas; ciz(); });
    document.getElementById('tumBit').addEventListener('change', (ev) => { S.bit = +ev.target.value; if (S.bas > S.bit) S.bas = S.bit; ciz(); });
    document.getElementById('tumSira').addEventListener('change', (ev) => { S.sira = ev.target.value; ciz(); });
    document.getElementById('tumMin')?.addEventListener('change', (ev) => { S.min = Math.max(1, +ev.target.value || 1); ciz(); });
    alan.querySelectorAll('a[data-ad]').forEach((a) => a.addEventListener('click', (ev) => {
      ev.preventDefault(); S.sec = a.dataset.ad; ciz().then(() => document.getElementById('tumDetay')?.scrollIntoView({behavior: 'smooth'}));
    }));
  }
  // başka yerden (karne panelinden) bir ismi açmak için
  const goster = (kat, ad) => { S.kat = kat; S.ara = ad; S.sec = null; S.min = null; if (document.getElementById('tumAlan')) ciz(); };
  window.tjkTum = {goster, baslat: () => { document.getElementById('tumAlan').innerHTML = '<section class="card"><div class="empty">Yükleniyor…</div></section>'; ciz(); }};
  if (document.getElementById('tumAlan')) window.tjkTum.baslat(); // sayfa doğrudan #tum ile açıldıysa
})();
