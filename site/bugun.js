// "Bugün" sekmesi: TJK programındaki koşu kartları. Her at için form, bu yılki başarı, pist/mesafe geçmişi
// ve jokey–antrenör ikilisi. Koşu bitip sonuç gelince sıra ve derece kendiliğinden eklenir.
(() => {
  const AYLAR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
  const GUN = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
  const e = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
  const gunAdi = (iso) => { const t = new Date(iso + 'T12:00:00'); return `${t.getDate()} ${AYLAR[t.getMonth()]} ${GUN[t.getDay()]}`; };
  const bugunIso = () => { const t = new Date(); t.setMinutes(t.getMinutes() - t.getTimezoneOffset()); return t.toISOString().slice(0, 10); };
  const isim = (ad, tur) => `<span class="isim" data-isim="${e(ad)}" data-tur="${tur}" role="button" tabindex="0">${e(ad)}</span>`;
  const oran = (b, s) => (s ? `<b>${b}</b>/${s}` : '—');
  const S = {gun: '', hip: '', sec: new Set()};

  // dizinler: at -> koşular, jokey|antrenör -> koşular
  let atK = null, ikili = null;
  function dizin() {
    if (atK) return;
    atK = new Map(); ikili = new Map();
    for (const r of rows) {
      if (!atK.has(r.at)) atK.set(r.at, []); atK.get(r.at).push(r);
      const k = r.jokey + '|' + r.antr; if (!ikili.has(k)) ikili.set(k, [0, 0]); const v = ikili.get(k); v[1]++; if (r.w) v[0]++;
    }
  }
  const formHtml = (son6) => (son6 || '').match(/[KÇS]?[0-9]/g)?.map((x) => { const s = +x.slice(-1); return `<i class="f${s === 1 ? 1 : s && s <= 3 ? 2 : s && s <= 5 ? 3 : 4}" title="${{K: 'Kum', Ç: 'Çim', S: 'Sentetik'}[x[0]] || ''}">${s === 0 ? '0' : s}</i>`; }).join('') || '—';

  function kosuKarti(k) {
    const sonuc = rows.filter((r) => r.rc.tarih === k.tarih && r.rc.hip === k.hip && r.rc.no === k.no);
    const sonucAt = new Map(sonuc.map((r) => [r.at, r]));
    const mes = +k.mes || 0;
    const satir = k.atlar.map((a) => {
      const L = (atK.get(a.at) || []).filter((r) => !(r.rc.tarih === k.tarih && r.rc.hip === k.hip && r.rc.no === k.no));
      const pm = L.filter((r) => r.rc.pist === k.pist && Math.abs(r.rc.mes - mes) <= 100);
      const ik = ikili.get(a.jokey + '|' + a.antr) || [0, 0];
      return {a, L, pm, ik, son: sonucAt.get(a.at)};
    });
    if (sonuc.length) satir.sort((x, y) => (x.son ? (x.son.derecesiz ? 99 : x.son.sira) : 100) - (y.son ? (y.son.derecesiz ? 99 : y.son.sira) : 100));
    // öne çıkanlar
    const not = [];
    for (const o of satir) {
      const seri = (() => { let n = 0; for (let i = o.L.length - 1; i >= 0 && o.L[i].w; i--) n++; return n; })();
      if (seri >= 2) not.push(`${isim(o.a.at, 'at')} üst üste ${seri} galibiyetle geliyor`);
      if (o.a.kgs >= 90) not.push(`${isim(o.a.at, 'at')} ${o.a.kgs} gün sonra pistte`);
      const pmB = o.pm.filter((r) => r.w).length; if (pmB >= 2) not.push(`${isim(o.a.at, 'at')} bu pist ve mesafede ${pmB} kez kazandı`);
      if (o.ik[1] >= 8 && o.ik[0] / o.ik[1] >= 0.3) not.push(`${isim(o.a.jokey, 'jokey')} + ${isim(o.a.antr, 'antr')}: bu yıl ${o.ik[0]}/${o.ik[1]} birincilik`);
    }
    const kazanan = sonuc.find((r) => r.w);
    return `<section class="card kosu-kart" id="kk-${k.no}">
      <div class="kk-ust"><div><span class="kk-no">${k.no}. koşu</span> <span class="kk-saat">${e(k.saat)}</span>
        <h2>${e(k.sinif.split('/')[0])}${k.ad ? ' · ' + e(k.ad) : ''}</h2>
        <p class="d">${e(k.grup)} · ${e(k.mes)} m ${e(k.pist)} · ${k.atlar.length} at</p></div>
        ${kazanan ? `<div class="kk-sonuc"><span>Kazanan</span><b>${isim(kazanan.at, 'at')}</b><small>${isim(kazanan.jokey, 'jokey')} · ${derece(kazanan.sn)}${kazanan.g ? ' · gny ' + nf2.format(kazanan.g) : ''}</small></div>` : ''}
      </div>
      ${not.length ? `<ul class="kk-not">${not.slice(0, 5).map((n) => `<li>${n}</li>`).join('')}</ul>` : ''}
      <div class="tw"><table class="kk-tablo"><thead><tr>${sonuc.length ? '<th class="r">Sıra</th>' : ''}<th class="r">No</th><th>At</th><th>Jokey</th><th>Antrenör</th><th class="r">Kilo</th><th class="r">St</th><th class="r">AGF</th><th class="r">HP</th><th>Son 6</th><th class="r" title="Bu yıl birincilik / koşu">Bu yıl</th><th class="r" title="Aynı pistte ±100 m mesafede birincilik / koşu">Pist-mesafe</th><th class="r" title="Jokey ve antrenörün bu yıl birlikte birincilik / koşu">Jokey+Ant.</th>${sonuc.length ? '<th class="r">Derece</th><th class="r">Gny</th>' : ''}<th class="r"><span class="gizli">Karşılaştır</span></th></tr></thead>
      <tbody>${satir.map((o) => {
        const a = o.a, kb = o.L.filter((r) => r.w).length, pmb = o.pm.filter((r) => r.w).length;
        return `<tr${o.son?.w ? ' class="kk-kazanan"' : ''}>${sonuc.length ? `<td class="r"><b>${o.son ? (o.son.derecesiz ? '–' : o.son.sira) : ''}</b></td>` : ''}<td class="r">${a.no}</td>
          <td>${isim(a.at, 'at')}${a.ekip ? ` <small class="ek">${e(a.ekip)}</small>` : ''}<br><small>${e(a.baba)}</small></td>
          <td>${isim(a.jokey, 'jokey')}${a.ap ? ' <small class="ek">AP</small>' : ''}</td><td>${isim(a.antr, 'antr')}</td>
          <td class="r">${e(a.kilo)}</td><td class="r">${e(a.st)}</td><td class="r">${a.agf != null ? `%${nf1.format(a.agf)} <small>(${a.agfs})</small>` : '—'}</td><td class="r">${a.hp ?? '—'}</td>
          <td class="form">${formHtml(a.son6)}</td><td class="r">${oran(kb, o.L.length)}</td><td class="r">${oran(pmb, o.pm.length)}</td><td class="r">${oran(o.ik[0], o.ik[1])}</td>
          ${sonuc.length ? `<td class="r">${o.son ? derece(o.son.sn) : ''}</td><td class="r">${o.son?.g ? nf2.format(o.son.g) : ''}</td>` : ''}
          <td class="r"><input type="checkbox" class="kk-sec" data-at="${e(a.at)}" aria-label="${e(a.at)} karşılaştırmaya ekle"${S.sec.has(a.at) ? ' checked' : ''}></td></tr>`;
      }).join('')}</tbody></table></div></section>`;
  }

  function ciz() {
    const alan = document.getElementById('bugunAlan'); if (!alan) return;
    dizin();
    const P = RAW.program || [];
    const gunler = [...new Set(P.map((k) => k.tarih))].sort();
    if (!gunler.length) { alan.innerHTML = '<section class="card"><div class="empty">TJK programı henüz yayımlanmadı.</div></section>'; return; }
    if (!gunler.includes(S.gun)) S.gun = gunler.find((g) => g >= bugunIso()) || gunler[gunler.length - 1];
    const hipler = [...new Set(P.filter((k) => k.tarih === S.gun).map((k) => k.hip))];
    if (!hipler.includes(S.hip)) S.hip = hipler[0];
    const K = P.filter((k) => k.tarih === S.gun && k.hip === S.hip).sort((a, b) => a.no - b.no);
    alan.innerHTML = `<section class="card">
        <h2>Koşu kartları</h2>
        <p class="d">TJK'nın açıkladığı programdan. Koşu bitip sonuç gelince sıra, derece ve ganyan kendiliğinden eklenir. Atları işaretleyip karşılaştırabilirsiniz.</p>
        <div class="chips">${gunler.map((g) => `<button class="chip${g === S.gun ? ' on' : ''}" data-gun="${g}">${g === bugunIso() ? 'Bugün · ' : ''}${gunAdi(g)}</button>`).join('')}</div>
        <div class="chips">${hipler.map((h) => `<button class="chip${h === S.hip ? ' on' : ''}" data-hip="${e(h)}">${e(h)} <small>${P.filter((k) => k.tarih === S.gun && k.hip === h).length} koşu</small></button>`).join('')}</div>
        <div class="kk-atla">${K.map((k) => `<a href="#kk-${k.no}">${k.no}. ${e(k.saat)}</a>`).join('')}</div>
      </section>
      ${K.map(kosuKarti).join('')}
      <div class="kk-karsilastir" id="kkKars" hidden><span id="kkSay"></span><button type="button" class="btn" id="kkAc">Karşılaştır</button><button type="button" class="btn ikincil" id="kkTemizle">Temizle</button></div>`;
    alan.querySelectorAll('[data-gun]').forEach((b) => b.addEventListener('click', () => { S.gun = b.dataset.gun; S.hip = ''; ciz(); }));
    alan.querySelectorAll('[data-hip]').forEach((b) => b.addEventListener('click', () => { S.hip = b.dataset.hip; ciz(); }));
    alan.querySelectorAll('.kk-atla a').forEach((a) => a.addEventListener('click', (ev) => { ev.preventDefault(); document.querySelector(a.getAttribute('href'))?.scrollIntoView({behavior: 'smooth'}); }));
    const guncelle = () => {
      const n = S.sec.size, kutu = document.getElementById('kkKars');
      kutu.hidden = n === 0; document.getElementById('kkSay').textContent = n === 1 ? '1 at seçildi · en az 2 seçin' : `${n} at seçildi${n > 4 ? ' · en fazla 4' : ''}`;
      document.getElementById('kkAc').disabled = n < 2 || n > 4;
    };
    alan.querySelectorAll('.kk-sec').forEach((c) => c.addEventListener('change', () => { if (c.checked) S.sec.add(c.dataset.at); else S.sec.delete(c.dataset.at); guncelle(); }));
    document.getElementById('kkAc').addEventListener('click', () => window.tjkKarsilastir?.ac([...S.sec]));
    document.getElementById('kkTemizle').addEventListener('click', () => { S.sec.clear(); alan.querySelectorAll('.kk-sec').forEach((c) => { c.checked = false; }); guncelle(); });
    guncelle();
  }
  window.tjkBugun = {baslat: ciz};
  if (document.getElementById('bugunAlan')) ciz();
})();
