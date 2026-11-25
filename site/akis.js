// "Akış" sekmesi: editörlerin program akış listesi.
// Şablon ve tarih seçilir, verilerden otomatik öneriler çıkar, editör ekler/düzenler/sıralar, PDF olarak yazdırır.
// Akışlar editörün kendi tarayıcısında saklanır.
(() => {
  const AYLAR = ['OCAK', 'ŞUBAT', 'MART', 'NİSAN', 'MAYIS', 'HAZİRAN', 'TEMMUZ', 'AĞUSTOS', 'EYLÜL', 'EKİM', 'KASIM', 'ARALIK'];
  const GUNLER = ['PAZAR', 'PAZARTESİ', 'SALI', 'ÇARŞAMBA', 'PERŞEMBE', 'CUMA', 'CUMARTESİ'];
  const BU = (s) => String(s ?? '').toLocaleUpperCase('tr');
  const e = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
  const gun = (iso, d) => { const t = new Date(iso + 'T12:00:00'); t.setDate(t.getDate() + d); return t.toISOString().slice(0, 10); };
  const uzunTarih = (iso) => { const t = new Date(iso + 'T12:00:00'); return `${t.getDate()} ${AYLAR[t.getMonth()]}`; };
  const SABLON = {
    gunluk: {ad: 'Günlük akış', sut: [['konu', 'KONU', 22], ['goruntu', 'GÖRÜNTÜ', 16], ['aciklama', 'AÇIKLAMA', 62]],
      baslik: (iso) => { const t = new Date(iso + 'T12:00:00'); return `${uzunTarih(iso)} - ${GUNLER[t.getDay()]}`; }},
    foto: {ad: 'Foto Finiş (haftalık)', sut: [['sehir', 'ŞEHİR', 11], ['tarih', 'TARİH', 10], ['konu', 'KONU', 13], ['kosu', 'KOŞU', 6], ['goruntu', 'GÖRÜNTÜ', 15], ['aciklama', 'AÇIKLAMA', 45]],
      baslik: (iso) => { const t = new Date(iso + 'T12:00:00'); return `FOTO FİNİŞ - ${t.getDate()} ${AYLAR[t.getMonth()]} ${t.getFullYear()}`; }}
  };
  const ANAHTAR = 'tjk_akis_v1';
  const depo = () => { try { return JSON.parse(localStorage.getItem(ANAHTAR) || '{}'); } catch (err) { return {}; } };
  const depoYaz = (d) => { try { localStorage.setItem(ANAHTAR, JSON.stringify(d)); } catch (err) {} };

  const D = {sablon: 'gunluk', tarih: '', baslik: '', satirlar: []};
  let kariyer = null;   // 2021'den beri jokey toplam birincilikleri (ilk birincilik tespiti için)

  // ---------- otomatik öneriler ----------
  function oneriler(sablon, iso) {
    const O = [];
    const ekle = (o) => O.push({goruntu: 'YARIŞ', ...o});
    // günlük akış: dünün yarışları; foto finiş: o tarihe kadar son 7 gün
    const bas = sablon === 'gunluk' ? gun(iso, -1) : gun(iso, -6), bit = sablon === 'gunluk' ? gun(iso, -1) : iso;
    const L = rows.filter((r) => r.rc.tarih >= bas && r.rc.tarih <= bit);
    const kos = new Map(); for (const r of L) { if (!kos.has(r.rc.i)) kos.set(r.rc.i, []); kos.get(r.rc.i).push(r); }
    const yer = (rc) => ({sehir: BU(rc.hip), tarih: uzunTarih(rc.tarih), kosu: String(rc.no), _s: rc.tarih + rc.hip + String(rc.no).padStart(2, '0')});
    if (sablon === 'gunluk') {
      const sehirler = [...new Set(L.map((r) => BU(r.rc.hip)))];
      if (sehirler.length) O.push({kat: 'Dünün yarışları', konu: 'DÜNÜN YARIŞLARI', goruntu: 'DSF', aciklama: `(${sehirler.join(', ')}) YARIŞ ÖZETLERİ - SON 200 METRE`});
    }
    const PRG = (RAW.program && RAW.program.length ? RAW.program : null);   // ileri tarihli program (varsa)
    if (sablon === 'gunluk' && PRG) {
      const bugun = PRG.filter((p) => p.tarih === iso), sehirB = [...new Set(bugun.map((p) => BU(p.hip)))];
      if (sehirB.length) O.push({kat: 'Hava durumu', konu: 'HAVA DURUMU', goruntu: 'BROWSER', aciklama: `${sehirB.join(' - ')} HAVA DURUMU`});
      for (const p of PRG.filter((p) => p.tarih > iso && /KV|G ?[123]|Kısa Vade/i.test(p.sinif))) {
        O.push({kat: 'Deklare / kayıt', konu: 'DEKLARE', goruntu: 'BROWSER', aciklama: `${p.tarih.split('-').reverse().join('.')} ${BU(p.hip)} ${BU(p.sinif.split('/')[0])}`});
      }
    }
    for (const [, a] of kos) {
      a.sort((x, y) => x.sira - y.sira);
      const rc = a[0].rc, k1 = a.find((r) => r.w), k2 = a.find((r) => r.sira === 2 && !r.derecesiz);
      if (!k1) continue;
      const temel = sablon === 'foto' ? {...yer(rc), konu: 'YORUM'} : {konu: 'ATÇILIK HABERLERİ', goruntu: 'VTR'};
      if (/KV|Grup|Kısa Vade/.test(rc.tur)) ekle({...temel, kat: 'Büyük koşu', aciklama: `${BU(rc.sinif.split('/')[0])} MÜCADELE - ${k1.at} KAZANDI${rc.ad ? ' (' + BU(rc.ad) + ')' : ''}`});
      if (/^(Burun|Kısa Baş|At Başı)$/.test(k1.fark)) ekle({...temel, kat: 'Foto finiş', aciklama: `FOTO FİNİŞ - ${k1.at} ${BU(k1.fark)} FARKLA${k2 ? ' (' + k2.at + ' İKİNCİ)' : ''}`});
      if (k1.g >= 30) ekle({...temel, kat: 'Sürpriz', aciklama: `SÜRPRİZ - ${k1.at} ${new Intl.NumberFormat('tr-TR', {minimumFractionDigits: 2}).format(k1.g)} GANYAN VERDİ`});
      const fav = a.find((r) => r.fav); if (fav && fav.sira >= 6 && fav.g && fav.g <= 1.5) ekle({...temel, kat: 'Favori', aciklama: `FAVORİ ${fav.at} (${new Intl.NumberFormat('tr-TR', {minimumFractionDigits: 2}).format(fav.g)}) ${fav.derecesiz ? 'DERECESİZ KALDI' : fav.sira + '. OLDU'}`});
      if (k1.sn && rc.rekor) { const p = rc.rekor.split('.'); const rek = p.length === 3 ? +p[0] * 60 + +p[1] + +p[2] / 100 : null; if (rek && k1.sn <= rek) ekle({...temel, kat: 'Rekor', aciklama: `PİST REKORU - ${k1.at} ${derece(k1.sn)}`}); }
    }
    // ilk birincilikler (jokey ve apranti)
    const A = RAW.apranti, aprB1 = new Map();
    if (A) for (const [ad, kisa, , , b1] of A.liste) aprB1.set(kisa, {ad, b1});
    const sonra = new Map();
    for (const r of rows) if (r.w && r.ap && A && r.rc.tarih > A.tarih) sonra.set(r.jokey, (sonra.get(r.jokey) || 0) + 1);
    const yil2026 = new Map(); const ilkKazanc = new Map();
    for (const r of [...rows].sort((x, y) => (x.rc.tarih < y.rc.tarih ? -1 : 1))) if (r.w) { yil2026.set(r.jokey, (yil2026.get(r.jokey) || 0) + 1); if (!ilkKazanc.has(r.jokey)) ilkKazanc.set(r.jokey, r); }
    for (const r of L.filter((x) => x.w)) {
      const ilk = ilkKazanc.get(r.jokey) === r;
      let kariyerIlk = false;
      if (ilk && kariyer) kariyerIlk = (kariyer.get(r.jokey) || 0) - (yil2026.get(r.jokey) || 0) <= 0;
      const apr = aprB1.get(r.jokey);
      if (apr && apr.b1 + (sonra.get(r.jokey) || 0) === 1) kariyerIlk = true;
      if (kariyerIlk) {
        const t = sablon === 'foto' ? {...yer(r.rc), konu: 'YORUM', goruntu: 'YARIŞ/CAM 5'} : {konu: 'ATÇILIK HABERLERİ', goruntu: 'VTR'};
        ekle({...t, kat: 'İlk birincilik', aciklama: `${apr ? BU(apr.ad) : r.jokey} İLK BİRİNCİLİĞİ (${r.at})`});
      }
    }
    // apranti: jokeyliğe yaklaşanlar
    if (A) for (const [ad, kisa, , kalan] of A.liste) {
      const k = kalan - (sonra.get(kisa) || 0); const yeni = L.some((r) => r.w && r.jokey === kisa);
      if (yeni && k <= 0) O.push({kat: 'Apranti', konu: sablon === 'foto' ? 'DEĞERLENDİRME' : 'ATÇILIK HABERLERİ', goruntu: 'DSF', aciklama: `${BU(ad)} JOKEYLİĞE YÜKSELDİ`, sehir: '-', tarih: '-', kosu: '-'});
      else if (yeni && k <= 5) O.push({kat: 'Apranti', konu: sablon === 'foto' ? 'DEĞERLENDİRME' : 'ATÇILIK HABERLERİ', goruntu: 'GRAFİK', aciklama: `${BU(ad)} - JOKEY OLMAYA ${k} YARIŞ KALDI`, sehir: '-', tarih: '-', kosu: '-'});
    }
    // günün yıldızları: bir günde 3+ birincilik
    const gj = new Map(); for (const r of L.filter((x) => x.w)) { const k = r.rc.tarih + '|' + r.rc.hip + '|' + r.jokey; gj.set(k, (gj.get(k) || 0) + 1); }
    for (const [k, n] of gj) if (n >= 3) { const [t, h, j] = k.split('|'); O.push({kat: 'Günün jokeyi', konu: sablon === 'foto' ? 'YORUM' : 'ATÇILIK HABERLERİ', goruntu: sablon === 'foto' ? 'YARIŞ' : 'VTR', aciklama: `${j} GÜNÜ ${n} BİRİNCİLİKLE KAPATTI${sablon === 'foto' ? '' : ' (' + BU(h) + ')'}`, sehir: BU(h), tarih: uzunTarih(t), kosu: '-', _s: t + h + '99'}); }
    if (sablon === 'foto') {
      for (const a of ['JOKEY TABLOSU - PERFORMANSLARI', 'APRANTİ TABLOSU - PERFORMANSLARI', 'ANTRENÖR TABLOSU - PERFORMANSLARI'])
        O.push({kat: 'Değerlendirme', konu: 'DEĞERLENDİRME', goruntu: 'GRAFİK', aciklama: a, sehir: '-', tarih: '-', kosu: '-'});
    }
    // foto finiş: tarih, şehir ve koşu sırasına göre; değerlendirmeler en sonda
    if (sablon === 'foto') O.sort((a, b) => (a.konu === 'DEĞERLENDİRME') - (b.konu === 'DEĞERLENDİRME') || String(a._s || 'z').localeCompare(String(b._s || 'z'), 'tr'));
    return O;
  }

  // ---------- kayıt ----------
  const anahtar = () => D.sablon + '|' + D.tarih;
  function kaydet() { const d = depo(); d[anahtar()] = {sablon: D.sablon, tarih: D.tarih, baslik: D.baslik, satirlar: D.satirlar, z: Date.now()}; depoYaz(d); }
  function yukle(sablon, tarih) {
    D.sablon = sablon; D.tarih = tarih;
    const k = depo()[anahtar()];
    D.baslik = k?.baslik || SABLON[sablon].baslik(tarih);
    D.satirlar = k?.satirlar || [];
  }

  // ---------- çizim ----------
  function ciz() {
    const alan = document.getElementById('akisAlan'); if (!alan) return;
    const S = SABLON[D.sablon], O = oneriler(D.sablon, D.tarih);
    const varMi = new Set(D.satirlar.map((s) => s.aciklama));
    const kayitlar = Object.entries(depo()).sort((a, b) => b[1].z - a[1].z).slice(0, 20);
    alan.innerHTML = `<section class="card">
      <h2>Akış listesi</h2>
      <p class="d">Şablonu ve tarihi seçin. Sağdaki önerilerden istediklerinizi ekleyin, hücrelere tıklayıp düzenleyin, sonra yazdırın ya da PDF kaydedin. Akış bu tarayıcıda kendiliğinden saklanır.</p>
      <div class="ctl akis-ctl">
        <label>Şablon<select id="akSablon">${Object.entries(SABLON).map(([k, v]) => `<option value="${k}"${k === D.sablon ? ' selected' : ''}>${v.ad}</option>`).join('')}</select></label>
        <label>${D.sablon === 'foto' ? 'Hafta sonu (bu tarihe kadar 7 gün)' : 'Program günü'}<input type="date" id="akTarih" value="${D.tarih}"></label>
        ${kayitlar.length ? `<label>Kayıtlı akışlar<select id="akKayit"><option value="">Seçin…</option>${kayitlar.map(([k, v]) => `<option value="${e(k)}">${e(v.baslik)} · ${SABLON[v.sablon]?.ad || ''}</option>`).join('')}</select></label>` : ''}
        <button type="button" class="btn" id="akYazdir">Yazdır / PDF</button>
      </div>
      <div class="akis-govde">
        <div class="akis-kagit">
          <div class="akis-baslik ${D.sablon}" contenteditable="true" spellcheck="false" id="akBaslik">${e(D.baslik)}</div>
          <table class="akis-tablo"><colgroup><col style="width:34px">${S.sut.map(([, , w]) => `<col style="width:${w}%">`).join('')}<col style="width:96px"></colgroup><thead><tr><th class="no"></th>${S.sut.map(([, ad]) => `<th>${ad}</th>`).join('')}<th class="islem"></th></tr></thead>
          <tbody>${D.satirlar.map((r, i) => `<tr data-i="${i}"><td class="no">${i + 1}</td>${S.sut.map(([k]) => `<td contenteditable="true" spellcheck="false" data-k="${k}" class="${k}">${e(r[k] || '')}</td>`).join('')}<td class="islem"><button type="button" data-yukari="${i}" title="Yukarı" aria-label="Yukarı taşı">↑</button><button type="button" data-asagi="${i}" title="Aşağı" aria-label="Aşağı taşı">↓</button><button type="button" data-sil="${i}" title="Sil" aria-label="Satırı sil">✕</button></td></tr>`).join('') || `<tr><td colspan="${S.sut.length + 2}" class="akis-bos">Henüz satır yok. Sağdaki önerilerden ekleyin ya da boş satır ekleyin.</td></tr>`}</tbody></table>
          <div class="akis-alt"><button type="button" class="btn ikincil" id="akSatir">Boş satır ekle</button>${D.satirlar.length ? '<button type="button" class="btn ikincil" id="akTemizle">Akışı temizle</button>' : ''}</div>
        </div>
        <aside class="akis-oneri">
          <h3>Öneriler <small>${D.sablon === 'gunluk' ? 'dünün yarışlarından' : 'son 7 günden'}</small></h3>
          ${O.length ? `<button type="button" class="btn ikincil" id="akHepsi">Hepsini ekle</button>` : ''}
          <ul>${O.map((o, i) => `<li class="${varMi.has(o.aciklama) ? 'eklendi' : ''}"><span class="kat">${e(o.kat)}</span><span>${e(o.aciklama)}</span>${o.sehir && o.sehir !== '-' ? `<small>${e(o.sehir)} · ${e(o.tarih)}${o.kosu && o.kosu !== '-' ? ' · ' + e(o.kosu) + '. koşu' : ''}</small>` : ''}<button type="button" data-oneri="${i}" ${varMi.has(o.aciklama) ? 'disabled' : ''}>${varMi.has(o.aciklama) ? 'Eklendi' : '+ Ekle'}</button></li>`).join('') || '<li class="akis-bos">Bu tarih için veriden öneri çıkmadı.</li>'}</ul>
          ${!(RAW.program && RAW.program.length ? RAW.program : null) && D.sablon === 'gunluk' ? '<p class="d">Deklare, kayıt ve hava durumu satırlarını elle ekleyin.</p>' : ''}
        </aside>
      </div></section>`;
    const $ = (id) => document.getElementById(id);
    $('akSablon').addEventListener('change', (ev) => { yukle(ev.target.value, D.tarih); ciz(); });
    $('akTarih').addEventListener('change', (ev) => { if (!ev.target.value) return; yukle(D.sablon, ev.target.value); ciz(); });
    $('akKayit')?.addEventListener('change', (ev) => { if (!ev.target.value) return; const [s, t] = ev.target.value.split('|'); yukle(s, t); ciz(); });
    $('akBaslik').addEventListener('input', (ev) => { D.baslik = ev.target.textContent.trim(); kaydet(); });
    alan.querySelectorAll('td[contenteditable]').forEach((td) => td.addEventListener('input', () => {
      const i = +td.parentElement.dataset.i; D.satirlar[i][td.dataset.k] = td.textContent.trim(); kaydet();
    }));
    const tasi = (i, j) => { if (j < 0 || j >= D.satirlar.length) return; [D.satirlar[i], D.satirlar[j]] = [D.satirlar[j], D.satirlar[i]]; kaydet(); ciz(); };
    alan.querySelectorAll('[data-yukari]').forEach((b) => b.addEventListener('click', () => tasi(+b.dataset.yukari, +b.dataset.yukari - 1)));
    alan.querySelectorAll('[data-asagi]').forEach((b) => b.addEventListener('click', () => tasi(+b.dataset.asagi, +b.dataset.asagi + 1)));
    alan.querySelectorAll('[data-sil]').forEach((b) => b.addEventListener('click', () => { D.satirlar.splice(+b.dataset.sil, 1); kaydet(); ciz(); }));
    const satirYap = (o) => Object.fromEntries(S.sut.map(([k]) => [k, o[k] ?? (k === 'sehir' || k === 'tarih' || k === 'kosu' ? '-' : '')]));
    alan.querySelectorAll('[data-oneri]').forEach((b) => b.addEventListener('click', () => { D.satirlar.push(satirYap(O[+b.dataset.oneri])); kaydet(); ciz(); }));
    $('akHepsi')?.addEventListener('click', () => { for (const o of O) if (!varMi.has(o.aciklama)) D.satirlar.push(satirYap(o)); kaydet(); ciz(); });
    $('akSatir').addEventListener('click', () => { D.satirlar.push(satirYap({})); kaydet(); ciz(); const td = alan.querySelector('tbody tr:last-child td[contenteditable]'); td?.focus(); });
    $('akTemizle')?.addEventListener('click', () => { if (!confirm('Bu akıştaki bütün satırlar silinsin mi?')) return; D.satirlar = []; kaydet(); ciz(); });
    $('akYazdir').addEventListener('click', yazdir);
  }

  // ---------- yazdırma (PDF) ----------
  function akisHtml() {
    const S = SABLON[D.sablon];
    const stil = `@page{size:A4 landscape;margin:12mm}*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}body{margin:0;font:12px/1.35 Arial,Helvetica,sans-serif;color:#000}
      .bas{font-weight:700;font-size:22px;padding:10px 12px}.bas.gunluk{color:#E00000;text-align:center}.bas.foto{background:#4A86E8;color:#000;padding:22px 14px 8px}
      table{width:100%;border-collapse:collapse}th,td{border:1px solid #9aa4b2;padding:5px 7px;vertical-align:middle;text-align:left}
      th{background:${D.sablon === 'gunluk' ? '#BDD7EE' : '#fff'};font-weight:700}td.no,th.no{width:28px;text-align:right;background:${D.sablon === 'gunluk' ? '#E2EFDA' : '#f3f3f3'};color:#333}
      td.kosu{text-align:center}td.sehir,td.tarih,td.konu{font-weight:${D.sablon === 'foto' ? 700 : 600}}tr{page-break-inside:avoid}`;
    const html = `<!DOCTYPE html><html lang="tr"><head><meta charset="utf-8"><title>${e(D.baslik)}</title><style>${stil}</style></head><body>
      <div class="bas ${D.sablon}">${e(D.baslik)}</div>
      <table><colgroup><col style="width:28px">${S.sut.map(([, , w]) => `<col style="width:${w}%">`).join('')}</colgroup>
      <thead><tr><th class="no"></th>${S.sut.map(([, ad]) => `<th>${ad}</th>`).join('')}</tr></thead>
      <tbody>${D.satirlar.map((r, i) => `<tr><td class="no">${i + 1}</td>${S.sut.map(([k]) => `<td class="${k}">${e(BU(r[k] || ''))}</td>`).join('')}</tr>`).join('')}</tbody></table></body></html>`;
    return html;
  }
  function yazdir() {
    const html = akisHtml();
    const f = document.createElement('iframe'); f.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
    document.body.appendChild(f);
    f.contentDocument.open(); f.contentDocument.write(html); f.contentDocument.close();
    setTimeout(() => { f.contentWindow.focus(); f.contentWindow.print(); setTimeout(() => f.remove(), 2000); }, 250);
  }

  async function baslat() {
    if (!D.tarih) {
      const bugun = new Date(); bugun.setMinutes(bugun.getMinutes() - bugun.getTimezoneOffset());
      yukle('gunluk', bugun.toISOString().slice(0, 10));
    }
    ciz();
    if (!kariyer && window.tjkCoz) {
      try {
        const J = JSON.parse(await window.tjkCoz('kariyer/j.enc'));
        kariyer = new Map(J.k.map(([ad, top]) => [ad, top[1]]));
        if (document.getElementById('akisAlan')) ciz();
      } catch (err) { kariyer = new Map(); }
    }
  }
  window.tjkAkis = {baslat, oneriler, akisHtml};
  if (document.getElementById('akisAlan')) baslat();
})();
