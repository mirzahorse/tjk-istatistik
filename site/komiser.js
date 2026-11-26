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
    const R = oku(), T = tablo(R); if (!T) return [];
    const O = [{kat: 'Komiser raporu', konu: sablon === 'foto' ? 'DEĞERLENDİRME' : 'ATÇILIK HABERLERİ', goruntu: 'DSF', aciklama: 'KOMİSER RAPORLARI - CEZALI JOKEY TABLOSU', sehir: '-', tarih: '-', kosu: '-'}];
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
        <a class="btn ikincil km-yerimi" href="${e(YERIMI)}" title="Bu düğmeyi tarayıcınızın yer imleri çubuğuna sürükleyin" onclick="event.preventDefault();alert('Bu düğmeyi fareyle tutup tarayıcının yer imleri çubuğuna sürükleyin. Sonra TJK Komiser Raporları sayfasındayken ona tıklayın.')">Panele aktar ⇢ yer imlerine sürükleyin</a>
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
      if (!R || !tablo(R)) { alert('Rapor okunamadı. TJK sayfasında "Panele aktar"a bastığınızdan emin olun.'); return; }
      yaz(R); yenile();
    };
    $('kmAl')?.addEventListener('click', async () => {
      try { al(await navigator.clipboard.readText()); } catch (err) { document.querySelector('.km-elle').open = true; $('kmMetin').focus(); }
    });
    $('kmYapistir')?.addEventListener('click', () => al($('kmMetin').value));
    $('kmSil')?.addEventListener('click', () => { try { localStorage.removeItem(ANAHTAR); } catch (err) {} yenile(); });
  }
  window.tjkKomiser = {kart, bagla, oneriler, coz};
})();
