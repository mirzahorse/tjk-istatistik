// "İçerik Önerileri" sekmesi: güncel yarışlara göre program ve sosyal medya için içerik fikirleri.
// Kaynak: önümüzdeki günlerin TJK programı (deklare edilmiş koşular ve atlar) ve son sonuçlar.
(() => {
  const AYLAR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
  const GUN = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
  const e = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
  const BU = (s) => String(s ?? '').toLocaleUpperCase('tr');
  const gunAdi = (iso) => { const t = new Date(iso + 'T12:00:00'); return `${t.getDate()} ${AYLAR[t.getMonth()]} ${GUN[t.getDay()]}`; };
  const bugunIso = () => { const t = new Date(); t.setMinutes(t.getMinutes() - t.getTimezoneOffset()); return t.toISOString().slice(0, 10); };
  const gunEkle = (iso, d) => { const t = new Date(iso + 'T12:00:00'); t.setDate(t.getDate() + d); return t.toISOString().slice(0, 10); };
  const ONEMLI = /^(KV|G ?[123]|A ?[123]|Grup)/i;
  const isim = (ad, tur) => `<span class="isim" data-isim="${e(ad)}" data-tur="${tur}" role="button" tabindex="0">${e(ad)}</span>`;
  const yz = (v) => '%' + new Intl.NumberFormat('tr-TR', {maximumFractionDigits: 1}).format(v);

  function uret() {
    const bugun = bugunIso(), PRG = (RAW.program || []).filter((k) => k.tarih >= bugun);
    const K = [];   // {grup, baslik, metin(html), akis: {konu, goruntu, aciklama}}
    // her atın koşuları (seri hesabı için)
    const atKos = new Map();
    for (const r of rows) { if (!atKos.has(r.at)) atKos.set(r.at, []); atKos.get(r.at).push(r); }
    for (const a of atKos.values()) a.sort((x, y) => (x.rc.tarih < y.rc.tarih ? -1 : 1));
    const yer = (k) => `${gunAdi(k.tarih)} · ${k.hip} · ${k.no}. koşu ${k.saat}`;

    // 1) önemli koşular
    for (const k of PRG.filter((k) => ONEMLI.test(k.sinif))) {
      const fav = [...k.atlar].filter((a) => a.agfs).sort((a, b) => a.agfs - b.agfs).slice(0, 3);
      const formda = [...k.atlar].map((a) => ({a, b: (a.son6.match(/[KÇS]1/g) || []).length})).filter((o) => o.b >= 2).sort((x, y) => y.b - x.b).slice(0, 3);
      const sinif = k.sinif.split('/')[0];
      K.push({grup: 'Önemli koşular', baslik: `${k.hip} ${sinif}${k.ad ? ' · ' + k.ad : ''}`, alt: `${yer(k)} · ${k.mes} m ${k.pist} · ${k.atlar.length} at`,
        metin: (fav.length ? `<p>AGF favorileri: ${fav.map((a) => `${isim(a.at, 'at')} <small>(${a.agfs}. · ${isim(a.jokey, 'jokey')})</small>`).join(', ')}</p>` : '') +
          (formda.length ? `<p>Formdakiler (son 6 koşuda): ${formda.map((o) => `${isim(o.a.at, 'at')} <small>${o.b} birincilik</small>`).join(', ')}</p>` : '') +
          `<p class="fikir">Fikir: koşu öncesi favoriler ve form grafiği; koşu sonrası kazanan profili.</p>`,
        akis: {konu: k.tarih === bugun ? 'BUGÜNÜN YARIŞLARI' : 'DEKLARE', goruntu: 'BROWSER', aciklama: `${k.tarih.split('-').reverse().join('.')} ${BU(k.hip)} ${BU(sinif)}${k.ad ? ' - ' + BU(k.ad) : ''}`}});
    }
    // 1b) kayıt aşamasındaki önemli koşular (henüz deklare edilmemiş günler)
    const dekGun = new Set(PRG.map((k) => k.tarih + '|' + k.hip));
    for (const k of (RAW.kayit || []).filter((k) => k.tarih >= bugun && ONEMLI.test(k.sinif) && !dekGun.has(k.tarih + '|' + k.hip))) {
      const sinif = k.sinif.split('/')[0];
      const guclu = k.atlar.map((a) => ({a, b: (atKos.get(a.at) || []).filter((r) => r.w).length})).filter((o) => o.b).sort((x, y) => y.b - x.b).slice(0, 4);
      K.push({grup: 'Önemli koşular', baslik: `${k.hip} ${sinif} · kayıt`, alt: `${gunAdi(k.tarih)} · ${k.mes} m ${k.pist} · ${k.atlar.length} kayıtlı at`,
        metin: guclu.length ? `<p>Bu yıl en çok kazananlar: ${guclu.map((o) => `${isim(o.a.at, 'at')} <small>${o.b} birincilik</small>`).join(', ')}</p>` : '<p>Kayıtlı atlar arasında bu yıl kazanan yok.</p>',
        akis: {konu: 'KAYIT', goruntu: 'BROWSER', aciklama: `${k.tarih.split('-').reverse().join('.')} ${BU(k.hip)} ${BU(sinif)}`}});
    }
    // 2) seri peşindeki atlar
    for (const k of PRG) for (const a of k.atlar) {
      const g = atKos.get(a.at); if (!g || !g.length) continue;
      let n = 0; for (let i = g.length - 1; i >= 0 && g[i].w; i--) n++;
      if (n >= 2) K.push({grup: 'Seri peşinde', baslik: `${a.at} üst üste ${n + 1}. galibiyet peşinde`, alt: yer(k) + ` · ${k.sinif.split('/')[0]}`,
        metin: `<p>${isim(a.at, 'at')} son ${n} koşusunu kazandı. Jokeyi ${isim(a.jokey, 'jokey')}, antrenörü ${isim(a.antr, 'antr')}.</p>`,
        akis: {konu: 'ATÇILIK HABERLERİ', goruntu: 'GRAFİK', aciklama: `${BU(a.at)} ÜST ÜSTE ${n + 1}. GALİBİYET PEŞİNDE (${BU(k.hip)} ${k.no}. KOŞU)`}});
    }
    // 3) uzun aradan dönenler (kazanmış atlar)
    for (const k of PRG) for (const a of k.atlar) {
      if (!a.kgs || a.kgs < 120) continue;
      const g = atKos.get(a.at) || []; const bir = g.filter((r) => r.w).length;
      if (!bir && (a.hp || 0) < 60) continue;
      K.push({grup: 'Uzun aradan dönüş', baslik: `${a.at} ${a.kgs} gün sonra pistte`, alt: yer(k), metin: `<p>${isim(a.at, 'at')}${bir ? ` bu yıl ${bir} kez kazandı.` : ''} Handikap puanı ${a.hp ?? '—'}.</p>`,
        akis: {konu: 'ATÇILIK HABERLERİ', goruntu: 'VTR', aciklama: `${BU(a.at)} ${a.kgs} GÜN ARADAN SONRA PİSTTE`}});
    }
    // 4) jokeyliğe yaklaşan aprantiler bugün/yarın biniyor
    const A = RAW.apranti;
    if (A) {
      const sonra = new Map(); for (const r of rows) if (r.w && r.ap && r.rc.tarih > A.tarih) sonra.set(r.jokey, (sonra.get(r.jokey) || 0) + 1);
      for (const [ad, kisa, , kalan] of A.liste) {
        const k2 = kalan - (sonra.get(kisa) || 0); if (k2 <= 0 || k2 > 5) continue;
        const biner = PRG.flatMap((k) => k.atlar.filter((a) => a.jokey === kisa).map((a) => ({k, a})));
        if (!biner.length) continue;
        K.push({grup: 'Jokeyliğe yaklaşanlar', baslik: `${BU(ad)} jokeyliğe ${k2} yarış uzakta`, alt: `${biner.length} biniş: ${[...new Set(biner.map((o) => gunAdi(o.k.tarih) + ' ' + o.k.hip))].join(', ')}`,
          metin: `<p>Bineceği atlar: ${biner.slice(0, 6).map((o) => `${isim(o.a.at, 'at')} <small>(${o.k.hip} ${o.k.no}.${o.a.agfs ? ', AGF ' + o.a.agfs + '.' : ''})</small>`).join(', ')}</p>`,
          akis: {konu: 'ATÇILIK HABERLERİ', goruntu: 'GRAFİK', aciklama: `${BU(ad)} - JOKEY OLMAYA ${k2} YARIŞ KALDI`}});
      }
    }
    // 5) formdaki jokeyler (son 7 gün) ve önümüzdeki binişleri
    const son = RAW.son, yedi = gunEkle(son, -6);
    const jf = grupla(rows.filter((r) => r.rc.tarih >= yedi), (r) => r.jokey).filter((o) => o.bir >= 4).sort((a, b) => b.bir - a.bir).slice(0, 5);
    for (const o of jf) {
      const binis = PRG.reduce((t, k) => t + k.atlar.filter((a) => a.jokey === o.k).length, 0);
      K.push({grup: 'Formdakiler', baslik: `${o.k} son 7 günde ${o.bir} birincilik`, alt: `${o.start} binişte ${yz(o.yuzde)} kazanma${binis ? ` · önümüzdeki günlerde ${binis} biniş` : ''}`,
        metin: `<p>${isim(o.k, 'jokey')} karnesinden profil kartı (PNG) hazırlanabilir.</p>`,
        akis: {konu: 'ATÇILIK HABERLERİ', goruntu: 'GRAFİK', aciklama: `${o.k} SON 7 GÜNDE ${o.bir} BİRİNCİLİK`}});
    }
    // 6) haftanın hikâyeleri (son sonuçlardan)
    if (window.tjkAkis) for (const o of window.tjkAkis.oneriler('foto', son).filter((o) => o.konu !== 'DEĞERLENDİRME').slice(0, 12)) {
      K.push({grup: 'Son yarışlardan', baslik: o.aciklama.charAt(0) + o.aciklama.slice(1).toLocaleLowerCase('tr'), alt: `${o.sehir} · ${o.tarih}${o.kosu && o.kosu !== '-' ? ' · ' + o.kosu + '. koşu' : ''} · ${o.kat}`, metin: '',
        akis: {konu: 'ATÇILIK HABERLERİ', goruntu: 'VTR', aciklama: o.aciklama}});
    }
    // 7) sosyal medya için haftanın isimleri
    const hf = rows.filter((r) => r.rc.tarih >= yedi);
    const enJ = grupla(hf, (r) => r.jokey).sort((a, b) => b.bir - a.bir)[0], enA = grupla(hf, (r) => r.antr).sort((a, b) => b.bir - a.bir)[0];
    const enB = grupla(hf, (r) => r.baba).sort((a, b) => b.bir - a.bir)[0], sur = hf.filter((r) => r.w && r.g).sort((a, b) => b.g - a.g)[0];
    const sos = (b, a, m, akis) => K.push({grup: 'Sosyal medya', baslik: b, alt: a, metin: m, akis});
    if (enJ) sos('Haftanın jokeyi', `${enJ.k} · ${enJ.bir} birincilik`, `<p>${isim(enJ.k, 'jokey')} → karnedeki PNG düğmesiyle profil kartı.</p>`, {konu: 'ATÇILIK HABERLERİ', goruntu: 'GRAFİK', aciklama: `HAFTANIN JOKEYİ: ${enJ.k} (${enJ.bir} BİRİNCİLİK)`});
    if (enA) sos('Haftanın antrenörü', `${enA.k} · ${enA.bir} birincilik`, `<p>${isim(enA.k, 'antr')}</p>`, {konu: 'ATÇILIK HABERLERİ', goruntu: 'GRAFİK', aciklama: `HAFTANIN ANTRENÖRÜ: ${enA.k} (${enA.bir} BİRİNCİLİK)`});
    if (enB) sos('Haftanın aygırı', `${enB.k} · tayları ${enB.bir} kez kazandı`, `<p>${isim(enB.k, 'baba')}</p>`, {konu: 'ATÇILIK HABERLERİ', goruntu: 'GRAFİK', aciklama: `HAFTANIN AYGIRI: ${BU(enB.k)}`});
    if (sur) sos('Haftanın sürprizi', `${sur.at} · ${new Intl.NumberFormat('tr-TR', {minimumFractionDigits: 2}).format(sur.g)} ganyan`, `<p>${isim(sur.at, 'at')} · ${sur.rc.hip} ${sur.rc.no}. koşu · jokey ${isim(sur.jokey, 'jokey')}</p>`, {konu: 'ATÇILIK HABERLERİ', goruntu: 'VTR', aciklama: `HAFTANIN SÜRPRİZİ: ${sur.at} ${new Intl.NumberFormat('tr-TR', {minimumFractionDigits: 2}).format(sur.g)} GANYAN`});
    return K;
  }

  const SIRA = ['Önemli koşular', 'Seri peşinde', 'Jokeyliğe yaklaşanlar', 'Formdakiler', 'Uzun aradan dönüş', 'Son yarışlardan', 'Sosyal medya'];
  let filtre = '';
  function ciz() {
    const alan = document.getElementById('oneriAlan'); if (!alan) return;
    const K = uret(), gruplar = SIRA.filter((g) => K.some((k) => k.grup === g));
    const PRG = RAW.program || [], gunler = [...new Set(PRG.filter((k) => k.tarih >= bugunIso()).map((k) => k.tarih))];
    const gos = filtre ? K.filter((k) => k.grup === filtre) : K;
    alan.innerHTML = `<section class="card">
      <h2>İçerik önerileri</h2>
      <p class="d">Önümüzdeki yarışlara ve son sonuçlara göre program ve sosyal medya için fikirler. ${gunler.length ? 'Program: ' + gunler.map((g) => gunAdi(g)).join(', ') + '.' : 'Önümüzdeki günlerin programı henüz yayımlanmadı.'} İsimlere tıklayınca karne ve PNG açılır.</p>
      <div class="chips"><button class="chip${filtre ? '' : ' on'}" data-f="">Hepsi <small>${K.length}</small></button>${gruplar.map((g) => `<button class="chip${filtre === g ? ' on' : ''}" data-f="${e(g)}">${e(g)} <small>${K.filter((k) => k.grup === g).length}</small></button>`).join('')}</div>
      <div class="oneri-izgara">${gos.map((k, i) => `<article class="oneri-kart"><span class="kat">${e(k.grup)}</span><h3>${e(k.baslik)}</h3>${k.alt ? `<p class="alt">${e(k.alt)}</p>` : ''}${k.metin}
        ${k.akis ? `<button type="button" class="btn oneri-ekle" data-i="${K.indexOf(k)}">Bugünün akışına ekle</button>` : ''}</article>`).join('') || '<div class="empty">Şu an öneri yok.</div>'}</div>
    </section>`;
    alan.querySelectorAll('[data-f]').forEach((b) => b.addEventListener('click', () => { filtre = b.dataset.f; ciz(); }));
    alan.querySelectorAll('.oneri-ekle').forEach((b) => b.addEventListener('click', () => {
      window.tjkAkis?.ekle(K[+b.dataset.i].akis); b.textContent = 'Akışa eklendi ✓'; b.disabled = true;
    }));
  }
  window.tjkOneri = {baslat: ciz, uret};
  if (document.getElementById('oneriAlan')) ciz();
})();
