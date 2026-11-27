// Komiser raporları: editör TJK'nın "Komiser Raporları" sayfasını kendi tarayıcısında açar, yer imindeki
// "Panele aktar" düğmesine basar (sayfadaki tablolar panoya kopyalanır), sonra burada "Komiser raporunu al" der.
// Site TJK'ya kendisi bağlanmaz.
(() => {
  const ANAHTAR = 'tjk_komiser_v1';
  const e = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
  const BU = (s) => String(s ?? '').toLocaleUpperCase('tr');
  const CEZA = /ceza|men|mahrum|ihtar|uyar|diskalif|protesto|itiraz|distanse|soruştur|savunma|disiplin/i;

  // yer imi: sayfadaki tabloları JSON olarak panoya kopyalar
  const YERIMI = `javascript:(()=>{const t=[...document.querySelectorAll('table')].map(x=>({bas:[...x.querySelectorAll('thead th')].map(h=>h.innerText.trim()),satir:[...x.querySelectorAll('tbody tr')].map(r=>[...r.children].map(c=>c.innerText.trim().replace(/\\s+/g,' ')))})).filter(x=>x.satir.length);const b=[...document.querySelectorAll('h1,h2,h3')].map(h=>h.innerText.trim()).filter(Boolean).slice(0,3).join(' · ');const s=[...document.querySelectorAll('select')].map(x=>x.options[x.selectedIndex]?.text).filter(Boolean).join(' · ');const v=JSON.stringify({k:'tjk-komiser',url:location.href,zaman:new Date().toISOString(),baslik:b,secim:s,tablolar:t});const n=t.reduce((a,x)=>a+x.satir.length,0);const ok=()=>alert('Editör Paneli: '+n+' satır kopyalandı. Panelde Akış Hazırlama → Komiser raporunu al.');if(navigator.clipboard&&window.isSecureContext){navigator.clipboard.writeText(v).then(ok,()=>prompt('Kopyalayın (Ctrl/Cmd+C):',v))}else{prompt('Kopyalayın (Ctrl/Cmd+C):',v)}})();`;

  // ---------- cezalı jokeyler: aktarılan raporlardan biriken "men" cezaları + elle girilenler ----------
  const GECMIS = 'tjk_cezalar_v1';
  const MEN = /men|sanat icras|yasakl/i;
  const gOku = () => { try { return JSON.parse(localStorage.getItem(GECMIS) || '[]'); } catch (err) { return []; } };
  const gYaz = (v) => { try { localStorage.setItem(GECMIS, JSON.stringify(v)); } catch (err) {} };
  const iso = (t) => { const m = String(t || '').match(/(\d{1,2})[./](\d{1,2})[./](\d{4})/); return m ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : ''; };
  const gunEkle = (i, n) => { const t = new Date(i + 'T12:00:00'); t.setDate(t.getDate() + n); return t.toISOString().slice(0, 10); };
  const bugun = () => { const t = new Date(); return new Date(t.getTime() - t.getTimezoneOffset() * 6e4).toISOString().slice(0, 10); };
  const trTarih = (i) => (i ? i.split('-').reverse().join('.') : '—');
  function cezaCikar(R) {
    const T = tablo(R); if (!T) return [];
    const C = [];
    for (const r of T.satir) {
      const g = (k) => (T.s[k] >= 0 ? r[T.s[k]] : '');
      const metin = r.join(' '); if (!MEN.test(metin)) continue;
      const kisi = BU(g('kisi')).trim(); if (!kisi || kisi === '-') continue;
      const aralik = metin.match(/(\d{1,2}\.\d{1,2}\.\d{4})\s*[-–]\s*(\d{1,2}\.\d{1,2}\.\d{4})/);
      const gun = +((metin.match(/(\d+)\s*(?:\([^)]*\)\s*)?(?:yarış\s*)?gün/i) || [])[1] || 0);
      const olay = iso(g('tarih')) || iso(R.secim) || bugun();
      let bas, bit, tahmin = false;
      if (aralik) { bas = iso(aralik[1]); bit = iso(aralik[2]); } else if (gun) { bas = gunEkle(olay, 1); bit = gunEkle(bas, gun - 1); tahmin = true; } else continue;
      C.push({kisi, olay, bas, bit, tahmin, gun, hip: g('hip'), kosu: g('kosu'), karar: g('karar') || metin});
    }
    return C;
  }
  // TJK "Cezalı Jokey" sayfası: her satır bir ceza; başlangıç/bitiş sütunlardan okunur
  function listeMi(R) {
    if (/cezali/i.test(R?.url || '')) return true;
    const T = R && [...R.tablolar].sort((a, b) => b.satir.length - a.satir.length)[0];
    return !!T && T.bas.some((b) => /biti[şs]/i.test(b)) && T.bas.some((b) => /jokey|ad/i.test(b));
  }
  function listeCikar(R) {
    const T = [...R.tablolar].sort((a, b) => b.satir.length - a.satir.length)[0]; if (!T) return [];
    const bas = T.bas.length ? T.bas : (T.satir[0] || []).map(() => '');
    const bul = (re) => bas.findIndex((b) => re.test(String(b).toLocaleLowerCase('tr')));
    const sK = bul(/jokey|binici|ad/), sB = bul(/başla|basla|başl/), sS = bul(/biti[şs]|son/), sG = bul(/süre|sure|gün|gun/), sA = bul(/açıkla|acikla|neden|sebep|karar|ceza t|tür|tur/);
    const C = [];
    for (const r of T.satir) {
      const metin = r.join(' ');
      const kisi = BU(sK >= 0 ? r[sK] : '').trim(); if (!kisi) continue;
      const tarihler = [...metin.matchAll(/\d{1,2}[./]\d{1,2}[./]\d{4}/g)].map((m) => iso(m[0]));
      const b0 = (sB >= 0 && iso(r[sB])) || tarihler[0] || bugun(), b1 = (sS >= 0 && iso(r[sS])) || tarihler[tarihler.length - 1];
      const gun = +(((sG >= 0 ? r[sG] : metin).match(/(\d+)\s*gün/i) || [])[1] || 0);
      const bit = b1 && b1 !== b0 ? b1 : gun ? gunEkle(b0, gun - 1) : b1; if (!bit) continue;
      C.push({kisi, olay: b0, bas: b0, bit, tahmin: false, gun: gun || Math.round((new Date(bit) - new Date(b0)) / 864e5) + 1, hip: '', kosu: '', karar: sA >= 0 ? r[sA] : 'TJK cezalı jokey listesi', kaynak: 'tjk'});
    }
    return C;
  }
  function cezaEkle(C) {
    const G = gOku(), var_ = new Set(G.map((c) => c.kisi + '|' + c.bas + '|' + c.bit));
    for (const c of C) if (!var_.has(c.kisi + '|' + c.bas + '|' + c.bit)) G.push(c);
    gYaz(G.filter((c) => c.bit >= gunEkle(bugun(), -60)));
  }
  // TJK listesi gelince eski TJK kayıtlarının yerine geçer (elle ve komiserden gelenler kalır)
  function listeYukle(C) { gYaz(gOku().filter((c) => c.kaynak !== 'tjk')); cezaEkle(C); }
  const aktifCezalar = () => gOku().filter((c) => c.bit >= bugun()).sort((a, b) => (a.bit < b.bit ? -1 : 1));
  function cezaKart() {
    const A = aktifCezalar();
    return `<section class="card" id="cezaKart"><h2>Cezalı jokeyler</h2>
      <p class="d">TJK'nın <a href="https://www.tjk.org/TR/YarisSever/Query/Page/CezaliJokey" target="_blank" rel="noopener">Cezalı Jokey</a> sayfasını açın, yer imlerindeki <b>Panele aktar</b>'a basın, sonra burada <b>TJK listesini al</b>'a basın. Komiser raporlarındaki men cezaları ve elle eklenenler de buraya düşer; ceza bitince jokey listeden çıkar.</p>
      <div class="ctl"><button type="button" class="btn" id="czAl">TJK listesini al</button><a class="btn ikincil km-yerimi" href="${e(YERIMI)}" title="Bu düğmeyi tarayıcınızın yer imleri çubuğuna sürükleyin" onclick="event.preventDefault();alert('Bu düğmeyi fareyle tutup tarayıcının yer imleri çubuğuna sürükleyin. Sonra TJK Cezalı Jokey ya da Komiser Raporları sayfasındayken ona tıklayın.')">Panele aktar ⇢ yer imlerine sürükleyin</a></div>
      ${A.length ? `<div class="tw"><table><thead><tr><th>Jokey</th><th>Ceza</th><th>Bitiş</th><th>Neden</th><th></th></tr></thead><tbody>${A.map((c, i) => `<tr><td><span class="isim" data-isim="${e(c.kisi)}" data-tur="jokey" role="button" tabindex="0">${e(c.kisi)}</span></td><td>${c.gun ? c.gun + ' gün' : '—'}</td><td>${trTarih(c.bit)}${c.tahmin ? ' <small class="mut" title="Raporda tarih aralığı yoktu; olay gününün ertesinden sayıldı">(tahmini)</small>' : ''}</td><td class="ceza-neden">${e(String(c.karar).slice(0, 120))}</td><td><button type="button" class="ceza-sil" data-sil="${e(c.kisi + '|' + c.bas + '|' + c.bit)}" aria-label="${e(c.kisi)} cezasını sil">✕</button></td></tr>`).join('')}</tbody></table></div>`
        : '<p class="d km-bos">Şu an listede cezalı jokey yok. Akış hazırlama sayfasından komiser raporu aktarın ya da aşağıdan ekleyin.</p>'}
      <details class="km-elle"><summary>Elle ekle</summary><div class="ceza-form">
        <label>Jokey<input id="czKisi" placeholder="Örn. M.KAYA"></label>
        <label>Gün<input id="czGun" type="number" min="1" max="365" style="width:80px"></label>
        <label>Bitiş<input id="czBit" type="date"></label>
        <label style="flex:1">Not<input id="czNot" placeholder="Örn. 4 gün men, İstanbul 6. koşu"></label>
        <button type="button" class="btn" id="czEkle">Ekle</button></div></details>
    </section>`;
  }
  function cezaBagla(yenile) {
    const $ = (id) => document.getElementById(id), k = $('cezaKart'); if (!k) return;
    k.querySelectorAll('[data-sil]').forEach((b) => b.addEventListener('click', () => { gYaz(gOku().filter((c) => c.kisi + '|' + c.bas + '|' + c.bit !== b.dataset.sil)); yenile(); }));
    $('czAl')?.addEventListener('click', async () => {
      let metin = '';
      try { metin = await navigator.clipboard.readText(); } catch (err) { metin = prompt('Panoya izin verilmedi. "Panele aktar"ın kopyaladığı metni buraya yapıştırın:') || ''; }
      const R = coz(metin);
      if (R && listeMi(R)) { const C = listeCikar(R); if (C.length) { listeYukle(C); yenile(); return; } }
      else if (R && tablo(R)) { yaz(R); cezaEkle(cezaCikar(R)); yenile(); return; }
      alert('Liste okunamadı. Önce TJK Cezalı Jokey sayfasında "Panele aktar"a basın.');
    });
    $('czGun')?.addEventListener('input', () => { const n = +$('czGun').value; if (n > 0) $('czBit').value = gunEkle(bugun(), n); });
    $('czEkle')?.addEventListener('click', () => {
      const kisi = BU($('czKisi').value).trim(), bit = $('czBit').value;
      if (!kisi || !bit) { alert('Jokey adı ve bitiş tarihi gerekli.'); return; }
      cezaEkle([{kisi, olay: bugun(), bas: bugun(), bit, tahmin: false, gun: +$('czGun').value || 0, hip: '', kosu: '', karar: $('czNot').value || 'Elle eklendi'}]);
      yenile();
    });
    window.tjkIsim?.tara?.(k);
  }
  // Özet sayfasında "Sezonun önündekiler"in altına yerleştir
  function cezaYerlestir() {
    const pist = document.getElementById('pist'); if (!pist) return;
    document.getElementById('cezaKart')?.remove();
    pist.insertAdjacentHTML('afterend', cezaKart());
    cezaBagla(cezaYerlestir);
  }

  const oku = () => { try { return JSON.parse(localStorage.getItem(ANAHTAR) || 'null'); } catch (err) { return null; } };
  const yaz = (v) => { try { localStorage.setItem(ANAHTAR, JSON.stringify(v)); } catch (err) {} };

  // yapıştırılan metni çöz: yer iminden gelen JSON ya da elle kopyalanmış sekmeli tablo
  function coz(metin) {
    metin = String(metin || '').trim(); if (!metin) return null;
    try { const j = JSON.parse(metin); if (j && j.tablolar) return j; } catch (err) {}
    const satirlar = metin.split(/\r?\n/).map((l) => l.split('\t').map((x) => x.trim())).filter((r) => r.some(Boolean));
    if (satirlar.length < 2) return null;
    return {k: 'elle', zaman: new Date().toISOString(), baslik: '', secim: '', tablolar: [{bas: satirlar[0], satir: satirlar.slice(1)}]};
  }
  // en büyük tabloyu al, sütunları başlıktan tanı
  function tablo(R) {
    if (!R) return null;
    const T = [...R.tablolar].sort((a, b) => b.satir.length - a.satir.length)[0]; if (!T) return null;
    const bas = T.bas.length ? T.bas : (T.satir[0] || []).map((_, i) => 'Sütun ' + (i + 1));
    const bul = (re) => bas.findIndex((b) => re.test(String(b).toLocaleLowerCase('tr')));
    return {bas, satir: T.satir, s: {tarih: bul(/tarih/i), hip: bul(/hipodrom|şehir|sehir/i), kosu: bul(/koşu|kosu/i), kisi: bul(/jokey|binici|ilgili|kişi|kisi|isim|^ad/), at: bul(/^at\b|at ismi|at adı/i), karar: bul(/karar|ceza|açıklama|aciklama|rapor|konu|olay/i)}};
  }
  function satirMetni(T, r) {
    const g = (k) => (T.s[k] >= 0 ? r[T.s[k]] : '');
    let karar = g('karar') || r.filter((x) => x && x.length > 25).sort((a, b) => b.length - a.length)[0] || r.join(' ');
    if (karar.length > 110) karar = karar.slice(0, 108).replace(/\s+\S*$/, '') + '…';
    const yer = [g('hip') && BU(g('hip')), g('kosu') && (/\d/.test(g('kosu')) ? g('kosu').replace(/\D+/g, '') + '. KOŞU' : BU(g('kosu')))].filter(Boolean).join(' ');
    return [yer, g('kisi') && BU(g('kisi')), g('at') && BU(g('at')), BU(karar)].filter(Boolean).join(' - ');
  }
  function oneriler(sablon) {
    const A = aktifCezalar(), C = A.length ? [{kat: 'Cezalı jokey', konu: sablon === 'foto' ? 'DEĞERLENDİRME' : 'ATÇILIK HABERLERİ', goruntu: 'DSF',
      aciklama: 'CEZALI JOKEYLER: ' + A.map((c) => `${c.kisi} (${trTarih(c.bit).slice(0, 5)} DAHİL)`).join(', '), sehir: '-', tarih: '-', kosu: '-'}] : [];
    const R = oku(), T = tablo(R); if (!T) return C;
    const O = [...C, {kat: 'Komiser raporu', konu: sablon === 'foto' ? 'DEĞERLENDİRME' : 'ATÇILIK HABERLERİ', goruntu: 'DSF', aciklama: 'KOMİSER RAPORLARI - CEZALI JOKEY TABLOSU', sehir: '-', tarih: '-', kosu: '-'}];
    for (const r of T.satir) {
      if (!CEZA.test(r.join(' '))) continue;
      const g = (k) => (T.s[k] >= 0 ? r[T.s[k]] : '');
      O.push({kat: 'Komiser raporu', konu: sablon === 'foto' ? 'YORUM' : 'ATÇILIK HABERLERİ', goruntu: sablon === 'foto' ? 'YARIŞ' : 'DSF', aciklama: satirMetni(T, r),
        sehir: g('hip') ? BU(g('hip')) : '-', tarih: g('tarih') || '-', kosu: g('kosu') ? g('kosu').replace(/\D+/g, '') || '-' : '-'});
    }
    return O.slice(0, 30);
  }
  // sayfa kartı
  function kart() {
    const R = oku(), T = tablo(R);
    const ceza = T ? T.satir.filter((r) => CEZA.test(r.join(' '))) : [];
    const ne = (z) => { const t = new Date(z); return `${t.toLocaleDateString('tr-TR')} ${t.toLocaleTimeString('tr-TR', {hour: '2-digit', minute: '2-digit'})}`; };
    return `<section class="card" id="komiserKart">
      <h2>Komiser raporu</h2>
      <p class="d">TJK'nın <a href="https://www.tjk.org/TR/YarisSever/Query/Page/KomiserRaporlari" target="_blank" rel="noopener">Komiser Raporları</a> sayfasını açın, yer imlerindeki <b>Panele aktar</b> düğmesine basın, sonra burada <b>Komiser raporunu al</b>'a basın. Ceza ve protestolar sağdaki önerilere düşer.</p>
      <div class="ctl">
        <button type="button" class="btn" id="kmAl">Komiser raporunu al</button>
        <a class="btn ikincil km-yerimi" href="${e(YERIMI)}" title="Bu düğmeyi tarayıcınızın yer imleri çubuğuna sürükleyin" onclick="event.preventDefault();alert('Bu düğmeyi fareyle tutup tarayıcının yer imleri çubuğuna sürükleyin. Sonra TJK Komiser Raporları ya da Cezalı Jokey sayfasındayken ona tıklayın.')">Panele aktar ⇢ yer imlerine sürükleyin</a>
        ${R ? '<button type="button" class="btn ikincil" id="kmSil">Raporu kaldır</button>' : ''}
      </div>
      <details class="km-elle"><summary>Pano izni yoksa: elle yapıştır</summary><textarea id="kmMetin" rows="4" placeholder="Yer iminin gösterdiği metni ya da TJK sayfasından kopyaladığınız tabloyu buraya yapıştırın"></textarea><button type="button" class="btn ikincil" id="kmYapistir">Yapıştırılanı al</button></details>
      ${T ? `<p class="d">${e(R.baslik || 'Rapor')}${R.secim ? ' · ' + e(R.secim) : ''} · alındı: ${ne(R.zaman)} · ${T.satir.length} satır${ceza.length ? `, ${ceza.length} ceza/protesto` : ''}</p>
        <div class="tw tall"><table class="km-tablo"><thead><tr>${T.bas.map((b) => `<th>${e(b)}</th>`).join('')}</tr></thead><tbody>${(ceza.length ? ceza : T.satir).map((r) => `<tr>${r.map((c) => `<td>${e(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>` : '<p class="d km-bos">Henüz rapor alınmadı.</p>'}
    </section>`;
  }
  function bagla(yenile) {
    const $ = (id) => document.getElementById(id);
    const al = (metin) => {
      const R = coz(metin);
      if (R && listeMi(R)) {
        const C = listeCikar(R);
        if (!C.length) { alert('Cezalı jokey listesi okunamadı. Sayfanın ekran görüntüsünü gönderirseniz sütunları ayarlayalım.'); return; }
        listeYukle(C); yenile(); alert(C.length + ' cezalı jokey listeye alındı.'); return;
      }
      if (!R || !tablo(R)) { alert('Rapor okunamadı. TJK sayfasında "Panele aktar"a bastığınızdan emin olun.'); return; }
      yaz(R); cezaEkle(cezaCikar(R)); yenile();
    };
    $('kmAl')?.addEventListener('click', async () => {
      try { al(await navigator.clipboard.readText()); } catch (err) { document.querySelector('.km-elle').open = true; $('kmMetin').focus(); }
    });
    $('kmYapistir')?.addEventListener('click', () => al($('kmMetin').value));
    $('kmSil')?.addEventListener('click', () => { try { localStorage.removeItem(ANAHTAR); } catch (err) {} yenile(); });
  }
  window.tjkKomiser = {kart, bagla, oneriler, coz, cezaKart, cezaBagla, cezaYerlestir, aktifCezalar};
  if (document.getElementById('pist')) cezaYerlestir();
})();
