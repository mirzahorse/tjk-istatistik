/* TJK sohbet botu — yapay zekâ kullanmaz; soruyu anahtar kelimelerle anlar, cevabı veriden hesaplar.
   index.html'deki rows, races, grupla, tablo, esc, N, P, M, tarih, derece, nf1, nf2 tanımlarını kullanır. */
"use strict";
(function () {
  // ---------- metin yardımcıları ----------
  const fold = (s) => String(s || '').toLocaleUpperCase('tr').replace(/İ/g, 'I').replace(/Ş/g, 'S').replace(/Ğ/g, 'G').replace(/Ü/g, 'U').replace(/Ö/g, 'O').replace(/Ç/g, 'C').replace(/Â/g, 'A').replace(/Î/g, 'I').replace(/Û/g, 'U');
  const temiz = (s) => ' ' + fold(s).replace(/[^A-Z0-9.' ]+/g, ' ').replace(/\s+/g, ' ').trim() + ' ';
  // kelime başında eşleşir: 'JOKEY' → 'jokeyler', 'jokeyin' de yakalanır; sonda boşluk varsa tam kelime ister
  const var_ = (q, ...kelimeler) => kelimeler.some((k) => q.includes(' ' + k.trim() + (k.endsWith(' ') ? ' ' : '')));
  const AYLAR = ['OCAK', 'SUBAT', 'MART', 'NISAN', 'MAYIS', 'HAZIRAN', 'TEMMUZ', 'AGUSTOS', 'EYLUL', 'EKIM', 'KASIM', 'ARALIK'];
  const iso = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  const SON = RAW.son;

  // ---------- sözlükler ----------
  const HIP = [...new Set(races.map((r) => r.hip))];
  const ANAHTAR = new Set(['AT', 'ATI', 'ATLAR', 'JOKEY', 'KIM', 'EN', 'COK', 'KAC', 'KUM', 'CIM', 'SENTETIK', 'ARAP', 'INGILIZ', 'KOSU', 'YARIS', 'BUGUN', 'DUN', 'SON', 'KAZANAN', 'BIRINCI', 'FAVORI', 'DERECE', 'REKOR', 'SAHIP', 'ANTRENOR', 'BABA', 'ANNE', 'AYGIR', 'KISRAK', 'GRUP', 'MAIDEN', 'HANDIKAP', 'SARTLI', 'YAS', 'ERKEK', 'DISI', ...HIP.map(fold)]);
  const atlar = new Map();       // katlanmış ad -> [anahtar]
  const kisiler = {jokey: new Map(), antr: new Map(), sahip: new Map(), baba: new Map(), anne: new Map()};
  for (const r of rows) {
    const f = fold(r.at); if (!atlar.has(f)) atlar.set(f, new Set()); atlar.get(f).add(r.k);
    for (const t of Object.keys(kisiler)) { const v = r[t]; if (v && !kisiler[t].has(v)) kisiler[t].set(v, fold(v)); }
  }
  const SIRADAN = new Set(['EN', 'COK', 'BUYUK', 'IYI', 'KIM', 'NE', 'BU', 'BIR', 'VE', 'ILE', 'SON', 'ILK', 'HIC', 'KAC', 'GUN', 'YIL', 'KOSU', 'KAZANAN', 'KAZANDI', 'ORAN', 'ORANI', 'SONUC', 'SONUCLAR', 'DERECE', 'BUGUN', 'DUN', 'HAFTA', 'AY', 'TOP', 'LIDER', 'YUZDE', 'KAR', 'KARLI', 'ZARAR', 'GANYAN', 'START', 'FAVORI', 'SURPRIZ', 'REKOR', ...ANAHTAR]);
  const atAdlari = [...atlar.keys()].filter((a) => a.length >= 3 && !ANAHTAR.has(a) && a.split(' ').some((w) => !SIRADAN.has(w))).sort((a, b) => b.length - a.length);
  // koşu adları (ör. GAZİ KOŞUSU → GAZI)
  const kosuAdlari = new Map();
  for (const r of races) if (r.ad) { const k = fold(r.ad).replace(/\s*KOSUSU$/, '').trim(); if (k.length >= 4 && !ANAHTAR.has(k)) { if (!kosuAdlari.has(k)) kosuAdlari.set(k, []); kosuAdlari.get(k).push(r); } }
  const kosuAdListe = [...kosuAdlari.keys()].sort((a, b) => b.length - a.length);

  function atBul(q) {
    for (const a of atAdlari) if (q.includes(' ' + a + ' ')) return a;
    return null;
  }
  // kişi: tam ad ya da soyadı (M.ÇİÇEK → ÇİÇEK); aygır/kısrak: parantezsiz ad
  function kisiBul(q, tur) {
    const tam = [], soy = [];
    for (const [ad, f] of kisiler[tur]) {
      const yalin = f.replace(/\s*\(.*\)$/, '');
      if (yalin.length >= 3 && !ANAHTAR.has(yalin) && !SIRADAN.has(yalin) && q.includes(' ' + yalin + ' ')) { tam.push(ad); continue; }
      if (tur === 'jokey' || tur === 'antr') {
        const s = yalin.split('.').pop();
        if (s.length >= 3 && !ANAHTAR.has(s) && !SIRADAN.has(s) && q.includes(' ' + s + ' ')) soy.push(ad);
      } else if (tur === 'sahip') {
        const parca = yalin.split(' ');
        if (parca.length >= 2 && q.includes(' ' + parca.slice(-1)[0] + ' ') && q.includes(' ' + parca[0] + ' ')) soy.push(ad);
      }
    }
    const say = (ad) => rows.filter((r) => r[tur] === ad).length;
    const list = (tam.length ? tam : soy).sort((a, b) => say(b) - say(a));
    return list;
  }

  // ---------- filtreleri sorudan çıkar ----------
  function filtreler(q) {
    const f = {hip: HIP.filter((h) => q.includes(' ' + fold(h))), pist: [], irk: '', mes: [], tur: '', yas: 0, bas: '', bit: '', aciklama: []};
    if (var_(q, 'KUM')) f.pist.push('Kum'); if (var_(q, 'CIM')) f.pist.push('Çim'); if (var_(q, 'SENTETIK')) f.pist.push('Sentetik');
    if (var_(q, 'INGILIZ')) f.irk = 'İngiliz'; if (var_(q, 'ARAP')) f.irk = 'Arap';
    for (const m of q.matchAll(/ (\d{3,4}) ?(M|METRE|MT)? /g)) { const v = +m[1]; if (v >= 800 && v <= 4000 && v % 100 === 0) f.mes.push(v); }
    const yas = q.match(/ (\d) YAS/); if (yas) f.yas = +yas[1];
    for (const [k, v] of [['MAIDEN', 'Maiden'], ['SARTLI', 'Şartlı'], ['HANDIKAP', 'Handikap'], ['SATIS', 'Satış'], [' KV', 'KV'], ['GRUP 1', 'Grup 1'], ['GRUP 2', 'Grup 2'], ['GRUP 3', 'Grup 3']]) if (q.includes(k)) f.tur = v;
    // tarih
    const bugun = new Date(SON + 'T12:00:00');
    const gun = (n) => { const d = new Date(bugun); d.setDate(d.getDate() - n); return iso(d); };
    if (var_(q, 'BUGUN')) { f.bas = f.bit = SON; f.aciklama.push('son yarış günü'); }
    else if (var_(q, 'DUN ', 'DUNKU', 'DUNKI')) { f.bas = f.bit = gun(1); }
    else if (var_(q, 'GECEN HAFTA', 'SON 7 GUN', 'BU HAFTA')) { f.bas = gun(6); f.bit = SON; }
    else if (var_(q, 'SON 30 GUN', 'SON BIR AY', 'SON 1 AY')) { f.bas = gun(29); f.bit = SON; }
    const tg = q.match(/ (\d{1,2}) (OCAK|SUBAT|MART|NISAN|MAYIS|HAZIRAN|TEMMUZ|AGUSTOS|EYLUL|EKIM|KASIM|ARALIK)/);
    const tn = q.match(/ (\d{1,2})[./](\d{1,2})(?:[./](\d{4}))? /);
    if (tg) { f.bas = f.bit = `2026-${String(AYLAR.indexOf(tg[2]) + 1).padStart(2, '0')}-${tg[1].padStart(2, '0')}`; }
    else if (tn) { f.bas = f.bit = `${tn[3] || 2026}-${tn[2].padStart(2, '0')}-${tn[1].padStart(2, '0')}`; }
    else { const ay = AYLAR.findIndex((a) => q.includes(' ' + a)); if (ay >= 0) { const m = String(ay + 1).padStart(2, '0'); f.bas = `2026-${m}-01`; f.bit = `2026-${m}-31`; } }
    return f;
  }
  function uygula(f, liste = rows) {
    return liste.filter((r) => {
      const c = r.rc;
      return (!f.hip.length || f.hip.includes(c.hip)) && (!f.pist.length || f.pist.includes(c.pist)) && (!f.irk || c.irk === f.irk) &&
        (!f.mes.length || f.mes.includes(c.mes)) && (!f.tur || c.tur === f.tur) && (!f.yas || (f.yas >= 5 ? r.yas >= 5 : r.yas === f.yas)) &&
        (!f.bas || c.tarih >= f.bas) && (!f.bit || c.tarih <= f.bit);
    });
  }
  function filtreYazi(f) {
    const p = [];
    if (f.bas && f.bas === f.bit) p.push(tarih(f.bas)); else if (f.bas) p.push(tarih(f.bas) + ' – ' + tarih(f.bit > SON ? SON : f.bit));
    if (f.hip.length) p.push(f.hip.join(', ')); if (f.pist.length) p.push(f.pist.join('/'));
    if (f.mes.length) p.push(f.mes.map((m) => N(m) + ' m').join(', ')); if (f.irk) p.push(f.irk);
    if (f.yas) p.push(f.yas >= 5 ? '5+ yaş' : f.yas + ' yaşlı'); if (f.tur) p.push(f.tur);
    return p.length ? p.join(' · ') : '2026 sezonunun tamamı';
  }
  const bos = (f) => ({t: `Bu koşullara uyan koşu bulamadım (${filtreYazi(f)}).`});

  // ---------- cevaplar ----------
  function atKarne(ad) {
    const keys = [...atlar.get(ad)];
    if (keys.length > 1) return {t: `"${keys[0].split('|')[0]}" adında ${keys.length} farklı at var. Hangisi?`, sec: keys.map((k) => ({e: k.split('|')[0] + ' (' + k.split('|')[1] + ')', s: 'at ' + k}))};
    return atKarneKey(keys[0]);
  }
  function atKarneKey(k) {
    const L = rows.filter((r) => r.k === k).sort((a, b) => (a.rc.tarih < b.rc.tarih ? -1 : 1));
    const [ad, baba, anne] = k.split('|'), s = L[L.length - 1], w = L.filter((r) => r.w);
    const ikr = w.reduce((t, r) => t + r.rc.ikr, 0);
    const MB = (m) => (m <= 1200 ? '1200 m ve altı' : m <= 1600 ? '1300–1600 m' : m <= 2000 ? '1700–2000 m' : '2100 m+');
    const en = grupla(L, (r) => r.rc.pist + ' ' + MB(r.rc.mes)).filter((o) => o.start >= 2).sort((a, b) => b.yuzde - a.yuzde || b.i3 - a.i3)[0];
    let t = `${ad} (${baba} – ${anne}), ${s.yas} yaşlı ${s.renk.toLowerCase()} ${s.cins.toLowerCase()}. 2026'da ${L.length} kez koştu: ${w.length} birincilik, ${L.filter((r) => r.i3).length} kez ilk üç. Kazandığı 1.lik ikramiyesi ${M(ikr)}.`;
    if (s.hp != null) t += ` Son handikap puanı ${s.hp}.`;
    if (en && en.bir) t += ` En başarılı olduğu yer: ${en.k} (${en.start} koşuda ${en.bir} birincilik).`;
    t += ` Antrenörü ${s.antr}, sahibi ${s.sahip}.`;
    const h = tablo([['Tarih', (r) => tarih(r.rc.tarih)], ['Hipodrom', (r) => r.rc.hip], ['Mesafe', (r) => N(r.rc.mes) + ' ' + r.rc.pist], ['Sıra', (r) => (r.derecesiz ? 'Drcsz' : r.sira + '/' + r.rc.n), 1], ['Derece', (r) => derece(r.sn)], ['Jokey', (r) => r.jokey], ['Gny', (r) => (r.g ? nf2.format(r.g) : '—'), 1]], [...L].reverse().slice(0, 6));
    return {t, h, alt: 'Son 6 koşusu', sec: [{e: 'Tüm koşuları panelde göster', git: ['atlar', ad]}]};
  }
  const TURAD = {jokey: 'jokey', antr: 'antrenör', sahip: 'sahip', baba: 'aygır', anne: 'kısrak'};
  function kisiKarne(tur, ad, f) {
    const L = uygula(f, rows.filter((r) => r[tur] === ad));
    if (!L.length) return {t: `${ad} için bu koşullarda koşu bulamadım (${filtreYazi(f)}).`};
    const o = grupla(L, () => 'x')[0];
    if (tur === 'baba' || tur === 'anne') {
      const taylar = grupla(L, (r) => r.k).sort((a, b) => b.bir - a.bir || b.i3 - a.i3);
      const t = `${ad} ${TURAD[tur] === 'aygır' ? 'aygırının' : 'kısrağının'} tayları (${filtreYazi(f)}): ${taylar.length} tay, ${o.start} start, ${o.bir} birincilik (%${nf1.format(o.yuzde)}), ${o.kazAt.size} farklı tay kazandı. Toplam 1.lik ikramiyesi ${M(o.ikr)}.`;
      return {t, alt: 'En başarılı tayları', h: tablo([['At', (x) => x.k.split('|')[0]], [tur === 'baba' ? 'Anne' : 'Baba', (x) => x.k.split('|')[tur === 'baba' ? 2 : 1]], ['1.lik', (x) => x.bir, 1], ['Start', (x) => x.start, 1], ['İkr.', (x) => M(x.ikr), 1]], taylar.slice(0, 8))};
    }
    const hip = grupla(L, (r) => r.rc.hip).sort((a, b) => b.bir - a.bir || b.start - a.start);
    let t = `${ad} (${TURAD[tur]}, ${filtreYazi(f)}): ${o.start} start, ${o.bir} birincilik, ${o.i3} kez ilk üç. Kazanma oranı %${nf1.format(o.yuzde)}, kazandırdığı 1.lik ikramiyesi ${M(o.ikr)}.`;
    if (o.oyn) t += ` Her starta 1 TL ganyan oynansaydı ${o.kar >= 0 ? nf2.format(o.kar) + ' TL kâr' : nf2.format(-o.kar) + ' TL zarar'} edilirdi.`;
    if (hip.length > 1 && hip[0].bir) t += ` En çok kazandığı hipodrom ${hip[0].k} (${hip[0].bir}).`;
    return {t, alt: 'Hipodromlara göre', h: tablo([['Hipodrom', (x) => x.k], ['Start', (x) => x.start, 1], ['1.lik', (x) => x.bir, 1], ['Kazanma', (x) => P(x.yuzde), 1]], hip)};
  }
  function siralama(tur, q, f) {
    const L = uygula(f); if (!L.length) return bos(f);
    let g = grupla(L, tur === 'at' ? (r) => r.k : (r) => r[tur]), olcut = 'birincilik';
    if (tur === 'at' && var_(q, 'KAZANAMAYAN', 'KAZANAMAMIS', 'HIC KAZAN')) {
      g = g.filter((o) => !o.bir).sort((a, b) => b.start - a.start).slice(0, 10);
      return {t: `Hiç kazanamadan en çok koşan atlar (${filtreYazi(f)}):`, h: tablo([['At', (o) => o.k.split('|')[0]], ['Start', (o) => o.start, 1], ['İlk 3', (o) => o.i3, 1]], g)};
    }
    if (var_(q, 'YUZDE', 'ORAN', 'ISABET', 'VERIM')) { olcut = 'kazanma oranı (en az 20 start)'; g = g.filter((o) => o.start >= 20).sort((a, b) => b.yuzde - a.yuzde); }
    else if (var_(q, 'IKRAMIYE', 'PARA', 'KAZANC')) { olcut = '1.lik ikramiyesi'; g.sort((a, b) => b.ikr - a.ikr); }
    else if (var_(q, 'ZARAR', 'KAYBETTIR')) { olcut = '1 TL ganyanla en çok zarar ettiren (en az 30 start)'; g = g.filter((o) => o.oyn >= 30).sort((a, b) => a.kar - b.kar); }
    else if (var_(q, 'KARLI', 'KAR ', 'KAZANDIR', 'GANYAN')) { olcut = '1 TL ganyanla en kârlı (en az 30 start)'; g = g.filter((o) => o.oyn >= 30).sort((a, b) => b.kar - a.kar); }
    else g.sort((a, b) => b.bir - a.bir || a.start - b.start);
    g = g.slice(0, 10);
    if (!g.length) return bos(f);
    const ad = (o) => (tur === 'at' ? o.k.split('|')[0] : o.k);
    const ilk = g[0];
    const t = `${filtreYazi(f)} için ${olcut} sıralamasında ${TURAD[tur] || 'at'} listesinin başında ${ad(ilk)} var: ${ilk.start} startta ${ilk.bir} birincilik (%${nf1.format(ilk.yuzde)}).`;
    return {t, h: tablo([['#', (o, i) => i + 1, 1], ['İsim', ad], ['1.lik', (o) => o.bir, 1], ['Start', (o) => o.start, 1], ['%', (o) => nf1.format(o.yuzde), 1], ['1 TL', (o) => (o.kar >= 0 ? '+' : '') + nf2.format(o.kar), 1, (o) => (o.kar > 0 ? 'pos' : o.kar < 0 ? 'neg' : '')]], g)};
  }
  function sonuclar(q, f) {
    if (!f.bas) { f.bas = f.bit = SON; }
    const L = uygula(f); if (!L.length) return {t: `${filtreYazi(f)} için sonuç bulamadım. O gün yarış olmamış ya da sonuçlar henüz gelmemiş olabilir.`};
    const no = q.match(/ (\d{1,2})\.? KOSU/);
    const kosular = new Map(); for (const r of L) { if (!kosular.has(r.rc.i)) kosular.set(r.rc.i, []); kosular.get(r.rc.i).push(r); }
    let liste = [...kosular.entries()].map(([i, a]) => ({rc: races[i], a: a.sort((x, y) => x.sira - y.sira)})).sort((x, y) => x.rc.hip.localeCompare(y.rc.hip, 'tr') || x.rc.no - y.rc.no);
    if (no) {
      liste = liste.filter((o) => o.rc.no === +no[1]);
      if (liste.length === 1) {
        const o = liste[0];
        return {t: `${tarih(o.rc.tarih)} ${o.rc.hip} ${o.rc.no}. koşu (${o.rc.ad ? o.rc.ad + ', ' : ''}${o.rc.sinif}, ${N(o.rc.mes)} m ${o.rc.pist}): kazanan ${o.a[0].at}, jokey ${o.a[0].jokey}, derece ${derece(o.a[0].sn)}, ganyan ${o.a[0].g ? nf2.format(o.a[0].g) : '—'}.`,
          h: tablo([['Sıra', (r) => (r.derecesiz ? 'Drcsz' : r.sira), 1], ['At', (r) => r.at], ['Jokey', (r) => r.jokey], ['Derece', (r) => derece(r.sn)], ['Gny', (r) => (r.g ? nf2.format(r.g) : '—'), 1], ['Fark', (r) => r.fark || '']], o.a)};
      }
      if (!liste.length) return {t: `${filtreYazi(f)} için ${no[1]}. koşuyu bulamadım.`};
    }
    return {t: `${filtreYazi(f)}: ${liste.length} koşu. Bir koşunun tam sıralaması için örneğin "${liste[0].rc.hip} ${liste[0].rc.no}. koşu ${tarih(liste[0].rc.tarih)}" yazın.`,
      h: tablo([['Hip.', (o) => o.rc.hip], ['Koşu', (o) => o.rc.no, 1], ['Mesafe', (o) => N(o.rc.mes) + ' ' + o.rc.pist], ['Kazanan', (o) => o.a[0].at], ['Jokey', (o) => o.a[0].jokey], ['Gny', (o) => (o.a[0].g ? nf2.format(o.a[0].g) : '—'), 1]], liste.slice(0, 30))};
  }
  function dereceler(f) {
    const L = uygula(f).filter((r) => r.sn != null); if (!L.length) return bos(f);
    if (f.mes.length && (f.hip.length || f.pist.length)) {
      const en = [...L].sort((a, b) => a.sn - b.sn).slice(0, 8);
      return {t: `${filtreYazi(f)} için en iyi derece ${derece(en[0].sn)}: ${en[0].at}, ${tarih(en[0].rc.tarih)}${en[0].rc.rekor ? ` (pist rekoru ${en[0].rc.rekor})` : ''}.`,
        h: tablo([['Derece', (r) => derece(r.sn)], ['At', (r) => r.at], ['Hip.', (r) => r.rc.hip], ['Pist', (r) => r.rc.pist], ['Tarih', (r) => tarih(r.rc.tarih)]], en)};
    }
    const m = new Map();
    for (const r of L) { const k = r.rc.hip + '|' + r.rc.pist + '|' + r.rc.mes; if (!m.has(k) || r.sn < m.get(k).sn) m.set(k, r); }
    const list = [...m.values()].sort((a, b) => a.rc.hip.localeCompare(b.rc.hip, 'tr') || a.rc.pist.localeCompare(b.rc.pist, 'tr') || a.rc.mes - b.rc.mes);
    return {t: `${filtreYazi(f)} için hipodrom, pist ve mesafeye göre 2026'nın en iyi dereceleri. Daraltmak için örneğin "İstanbul çim 1400 en iyi derece" yazın.`,
      h: tablo([['Hip.', (r) => r.rc.hip], ['Pist', (r) => r.rc.pist], ['Mesafe', (r) => N(r.rc.mes), 1], ['Derece', (r) => derece(r.sn)], ['At', (r) => r.at], ['Rekor', (r) => r.rc.rekor || '—']], list.slice(0, 40))};
  }
  function favori(f) {
    const L = uygula(f); if (!L.length) return bos(f);
    const fav = L.filter((r) => r.fav), w = fav.filter((r) => r.w).length;
    const g = grupla(fav, (r) => r.rc.hip).sort((a, b) => b.yuzde - a.yuzde);
    return {t: `${filtreYazi(f)}: favoriler (en düşük ganyanlı at) ${fav.length} koşunun ${w} tanesini kazandı, yani %${nf1.format(100 * w / (fav.length || 1))}.`,
      alt: 'Hipodromlara göre favori başarısı', h: f.hip.length === 1 ? '' : tablo([['Hipodrom', (o) => o.k], ['Koşu', (o) => o.start, 1], ['Kazandı', (o) => o.bir, 1], ['%', (o) => nf1.format(o.yuzde), 1]], g)};
  }
  function surpriz(f) {
    const L = uygula(f).filter((r) => r.w && r.g > 0).sort((a, b) => b.g - a.g).slice(0, 10);
    if (!L.length) return bos(f);
    return {t: `${filtreYazi(f)} içinde en büyük sürpriz ${L[0].at}: ${tarih(L[0].rc.tarih)} ${L[0].rc.hip}'da ${nf2.format(L[0].g)} ganyanla kazandı.`,
      h: tablo([['Tarih', (r) => tarih(r.rc.tarih)], ['Hip.', (r) => r.rc.hip], ['At', (r) => r.at], ['Gny', (r) => nf2.format(r.g), 1], ['Jokey', (r) => r.jokey]], L)};
  }
  function sayilar(f) {
    const L = uygula(f); if (!L.length) return bos(f);
    const k = new Set(L.map((r) => r.rc.i)), a = new Map(); for (const r of L) a.set(r.k, (a.get(r.k) || false) || r.w);
    const kz = [...a.values()].filter((v) => !v).length;
    return {t: `${filtreYazi(f)}: ${N(k.size)} koşu, ${N(L.length)} start, ${N(a.size)} farklı at. Bu atların ${N(kz)} tanesi (%${nf1.format(100 * kz / a.size)}) bu koşullarda hiç birinci olamadı.`};
  }
  function oranTablo(baslik, list, f) {
    return {t: `${baslik} (${filtreYazi(f)}):`, h: tablo([['', (o) => o.k], ['Start', (o) => N(o.start), 1], ['1.lik', (o) => o.bir, 1], ['Kazanma', (o) => P(o.yuzde), 1]], list)};
  }
  function startAgf(q, f) {
    const L = uygula(f); if (!L.length) return bos(f);
    if (var_(q, 'AGF')) return oranTablo('AGF sırasına göre kazanma oranı', oranlar(L, (r) => (r.agf ? (r.agf >= 8 ? '8+' : String(r.agf)) : null), ['1', '2', '3', '4', '5', '6', '7', '8+']), f);
    return oranTablo('Start numarasına göre kazanma oranı', oranlar(L, (r) => (r.st ? (r.st >= 15 ? '15+' : String(r.st)) : null), [...Array(14)].map((_, i) => String(i + 1)).concat('15+')), f);
  }
  function ekipman(f) {
    const L = uygula(f); if (!L.length) return bos(f);
    const E = {KG: 'Kapalı gözlük', K: 'Kulaklık', DB: 'Dil bağı', SK: 'Ring–start kulaklık', SKG: 'Ring–start kapalı gözlük'};
    const list = Object.entries(E).map(([c, ad]) => { const v = L.filter((r) => r.ekip.split(' ').includes(c)), i = L.filter((r) => r.yeni.split(' ').includes(c)); return {ad: c + ' · ' + ad, n: v.length, y: 100 * v.filter((r) => r.w).length / (v.length || 1), iy: i.length ? 100 * i.filter((r) => r.w).length / i.length : null, in: i.length}; });
    const genel = 100 * L.filter((r) => r.w).length / L.length;
    return {t: `Ekipmana göre kazanma oranları (${filtreYazi(f)}). Karşılaştırma için tüm atların ortalaması %${nf1.format(genel)}.`, h: tablo([['Ekipman', (o) => o.ad], ['Start', (o) => N(o.n), 1], ['Kazanma', (o) => P(o.y), 1], ['İlk takıldığında', (o) => (o.iy == null ? '—' : P(o.iy) + ' (' + o.in + ')'), 1]], list)};
  }

  function kosuAdi(ad) {
    const list = kosuAdlari.get(ad).sort((a, b) => (a.tarih < b.tarih ? 1 : -1));
    const rc = list[0], a = rows.filter((r) => r.rc === rc).sort((x, y) => x.sira - y.sira);
    let t = `${rc.ad}: ${tarih(rc.tarih)} ${rc.hip}, ${rc.no}. koşu (${rc.sinif}, ${N(rc.mes)} m ${rc.pist}). Kazanan ${a[0].at}, jokey ${a[0].jokey}, antrenör ${a[0].antr}, derece ${derece(a[0].sn)}, ganyan ${a[0].g ? nf2.format(a[0].g) : '—'}. Birincilik ikramiyesi ${M(rc.ikr)}.`;
    if (list.length > 1) t += ` Bu adla 2026'da ${list.length} koşu yapıldı; en sonuncusu gösteriliyor.`;
    return {t, h: tablo([['Sıra', (r) => (r.derecesiz ? 'Drcsz' : r.sira), 1], ['At', (r) => r.at], ['Jokey', (r) => r.jokey], ['Derece', (r) => derece(r.sn)], ['Gny', (r) => (r.g ? nf2.format(r.g) : '—'), 1], ['Fark', (r) => r.fark || '']], a)};
  }
  const ORNEKLER = ['Dün kim kazandı?', 'İstanbul çimde en çok kazanan jokey', 'En kârlı antrenör', 'Mr Çırak', 'Approve aygırı', 'Copy Cat kısrağı', 'İzmir 1400 kum en iyi derece', 'Favori kazanma oranı Bursa', 'En büyük sürprizler kasım', '2 yaşlı en çok kazanan at'];
  function yardim(on) {
    return {t: (on ? on + ' ' : '') + 'Şunları sorabilirsiniz: bir atın, jokeyin, antrenörün, sahibin, aygırın ya da kısrağın adı; "en çok kazanan jokey/antrenör/sahip/at/aygır"; "en kârlı" veya "kazanma oranı"; bir günün sonuçları; en iyi dereceler; favori, sürpriz, start, AGF ve ekipman istatistikleri. Hipodrom, pist, mesafe, ırk, yaş, koşu türü ve tarih ekleyerek daraltabilirsiniz.', sec: ORNEKLER.slice(0, 6).map((s) => ({e: s, s}))};
  }

  // ---------- soruyu anla ----------
  function cevapla(soru) {
    const q = temiz(soru), f = filtreler(q);
    if (q.trim().length < 2 || var_(q, 'YARDIM', 'NE SORABILIRIM', 'MERHABA', 'SELAM')) return yardim(var_(q, 'MERHABA', 'SELAM') ? 'Merhaba!' : '');
    // seçim düğmesinden gelen tam anahtar
    const ak = soru.match(/^at (.+\|.*\|.*)$/); if (ak) return atKarneKey(ak[1]);
    const kk = soru.match(/^kişi (jokey|antr|sahip|baba|anne) (.+)$/); if (kk) return kisiKarne(kk[1], kk[2], f);
    // açıkça istenen tür
    const istenen = var_(q, 'JOKEY') ? 'jokey' : var_(q, 'ANTRENOR', 'HOCA') ? 'antr' : var_(q, 'SAHIP') ? 'sahip' : var_(q, 'AYGIR', 'BABA', 'TAYLAR') ? 'baba' : var_(q, 'KISRAK', 'ANNE', 'KARDES') ? 'anne' : null;
    const siralamaSoru = var_(q, 'EN COK', 'EN FAZLA', 'EN BASARILI', 'EN IYI', 'LIDER', 'SIRALAMA', 'KIM ONDE', 'EN KARLI', 'EN ZARARLI', 'TOP ', 'ILK 10', 'KAZANAMAYAN', 'KAZANAMAMIS', 'HIC KAZANMA');
    const ozelNiyet = var_(q, 'SURPRIZ', 'DERECE', 'REKOR', 'FAVORI', 'EKIPMAN', 'AGF', 'START NO', 'START NUMARA');
    // belirli kişi/at adı
    if (!siralamaSoru || istenen) {
      if (!istenen && !ozelNiyet) { const at = atBul(q); if (at) return atKarne(at); }
      if (var_(q, 'KOSU')) { const ka = kosuAdListe.find((k) => q.includes(' ' + k + ' ')); if (ka) return kosuAdi(ka); }
      for (const t of istenen ? [istenen] : ['jokey', 'antr', 'sahip', 'baba', 'anne']) {
        const k = kisiBul(q, t);
        if (k.length === 1) return kisiKarne(t, k[0], f);
        if (k.length > 1 && !siralamaSoru) return {t: `Bu isimle birden fazla ${TURAD[t]} var. Hangisi?`, sec: k.slice(0, 8).map((ad) => ({e: ad, s: `kişi ${t} ${ad}`}))};
      }
    }
    if (var_(q, 'DERECE', 'REKOR', 'HIZLI', 'EN IYI ZAMAN')) return dereceler(f);
    if (var_(q, 'SURPRIZ', 'EN YUKSEK GANYAN', 'EN BUYUK GANYAN', 'BUYUK GANYAN')) return surpriz(f);
    if (var_(q, 'FAVORI')) return favori(f);
    if (var_(q, 'EKIPMAN', 'GOZLUK', 'KULAKLIK', 'DIL BAGI')) return ekipman(f);
    if (var_(q, 'AGF', 'START NO', 'START NUMARA', 'KULVAR')) return startAgf(q, f);
    const olcutVar = var_(q, 'YUZDE', 'ORAN', 'ISABET', 'KARLI', 'KAR ', 'ZARAR', 'IKRAMIYE', 'KAZANDIR');
    if (siralamaSoru || istenen || (olcutVar && var_(q, 'AT ', 'ATLAR'))) {
      return siralama(istenen || (var_(q, 'AT ', 'ATI', 'ATLAR', 'TAY') ? 'at' : 'jokey'), q, f);
    }
    if (var_(q, 'KAC', 'SAYISI', 'TOPLAM')) return sayilar(f);
    if (var_(q, 'SONUC', 'KIM KAZANDI', 'KAZANAN', 'BIRINCI') || f.bas || / \d{1,2}\.? KOSU/.test(q)) return sonuclar(q, f);
    if (f.hip.length || f.pist.length || f.mes.length || f.irk || f.tur) return sayilar(f);
    const kelimeler = q.trim().split(' ').filter((w) => !SIRADAN.has(w));
    if (kelimeler.length && kelimeler.length <= 4) return {t: `"${soru.trim()}" adında 2026'da koşmuş bir at, jokey, antrenör, sahip, aygır ya da kısrak bulamadım. Henüz koşmamış olabilir ya da adı farklı yazılmış olabilir.`, sec: ORNEKLER.slice(0, 4).map((x) => ({e: x, s: x}))};
    return yardim('Bu soruyu anlayamadım.');
  }

  // ---------- arayüz ----------
  const st = document.createElement('style');
  st.textContent = `
  .bot-ac{position:fixed;right:18px;bottom:18px;z-index:50;background:var(--yesil);color:var(--lacivert);border:0;border-radius:28px;padding:13px 18px;font:600 15px "Space Grotesk",Inter,sans-serif;cursor:pointer;box-shadow:0 6px 20px rgba(0,0,0,.4);display:flex;align-items:center;gap:8px}
  .bot-ac svg{width:20px;height:20px}
  .bot{position:fixed;right:18px;bottom:18px;z-index:51;width:400px;max-width:calc(100vw - 24px);height:600px;max-height:calc(100vh - 36px);background:var(--panel);border:1px solid var(--line);border-radius:12px;box-shadow:0 16px 48px rgba(0,0,0,.55);display:flex;flex-direction:column;overflow:hidden}
  .bot[hidden]{display:none}
  .bot-bas{background:var(--yesil);color:var(--lacivert);padding:10px 14px;display:flex;align-items:center;gap:10px}
  .bot-bas img{width:30px;height:30px}.bot-bas b{font:700 16px "Space Grotesk",Inter,sans-serif;flex:1}.bot-bas small{display:block;font:500 11px Inter,sans-serif;opacity:.75}
  .bot-bas button{background:none;border:0;color:var(--lacivert);font-size:22px;line-height:1;cursor:pointer;padding:2px 6px}
  .bot-msj{flex:1;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:10px}
  .m{max-width:92%;font-size:14px;line-height:1.45;border-radius:10px;padding:9px 11px}
  .m.sen{align-self:flex-end;background:var(--yesil);color:var(--lacivert);font-weight:500}
  .m.bot-c{align-self:flex-start;background:var(--lacivert);border:1px solid var(--line)}
  .m .alt{font-size:11px;color:var(--mut);text-transform:uppercase;letter-spacing:.03em;margin:8px 0 2px}
  .m table{font-size:12px}.m th{background:var(--lacivert);font-size:10px;padding:4px 5px}.m td{padding:3px 5px}
  .m .tw{max-height:240px;overflow:auto;margin-top:4px}
  .bot-sec{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}
  .bot-sec button{font:inherit;font-size:12px;color:var(--yesil);background:transparent;border:1px solid var(--yesil);border-radius:14px;padding:4px 9px;cursor:pointer;text-align:left}
  .bot-sec button:hover{background:var(--yesil);color:var(--lacivert)}
  .bot-gir{display:flex;gap:8px;padding:10px;border-top:1px solid var(--line)}
  .bot-gir input{flex:1;font-size:15px}
  .bot-gir button{background:var(--yesil);color:var(--lacivert);border:0;border-radius:4px;font:600 14px Inter,sans-serif;padding:0 14px;cursor:pointer}
  @media (max-width:520px){.bot{right:0;bottom:0;width:100vw;max-width:100vw;height:100dvh;max-height:100dvh;border-radius:0}}`;
  document.head.appendChild(st);
  const ac = document.createElement('button');
  ac.className = 'bot-ac'; ac.type = 'button'; ac.setAttribute('aria-label', "Mirza'ya Sor");
  ac.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/></svg>Mirza\'ya Sor';
  const kutu = document.createElement('div');
  kutu.className = 'bot'; kutu.hidden = true; kutu.setAttribute('role', 'dialog'); kutu.setAttribute('aria-label', "Mirza'ya Sor");
  kutu.innerHTML = `<div class="bot-bas"><img src="logo.png" alt=""><b>Mirza'ya Sor<small>2026 verisinden cevaplar</small></b><button type="button" aria-label="Kapat">×</button></div>
    <div class="bot-msj" aria-live="polite"></div>
    <form class="bot-gir"><input placeholder="Sorunuzu yazın…" aria-label="Soru" autocomplete="off"><button>Sor</button></form>`;
  document.body.append(ac, kutu);
  const msj = kutu.querySelector('.bot-msj'), inp = kutu.querySelector('input');
  function ekle(sinif, icerik) { const d = document.createElement('div'); d.className = 'm ' + sinif; d.append(icerik); msj.append(d); msj.scrollTop = msj.scrollHeight; return d; }
  function botCevap(c) {
    const d = document.createElement('div');
    const p = document.createElement('div'); p.textContent = c.t; d.append(p);
    if (c.h) { if (c.alt) { const a = document.createElement('div'); a.className = 'alt'; a.textContent = c.alt; d.append(a); } const h = document.createElement('div'); h.innerHTML = c.h; d.append(h); }
    if (c.sec && c.sec.length) {
      const s = document.createElement('div'); s.className = 'bot-sec';
      for (const o of c.sec) {
        const b = document.createElement('button'); b.type = 'button'; b.textContent = o.e;
        b.addEventListener('click', () => {
          if (o.git) { kutu.hidden = true; ac.hidden = false; document.querySelector(`#sekmeler button[data-tab="${o.git[0]}"]`).click(); setTimeout(() => { const i = document.getElementById('atAra'); if (i) { i.value = o.git[1]; i.dispatchEvent(new Event('input')); i.scrollIntoView({behavior: 'smooth'}); } }, 50); return; }
          sor(o.s, o.e);
        });
        s.append(b);
      }
      d.append(s);
    }
    ekle('bot-c', d);
  }
  function sor(soru, gorunen) {
    ekle('sen', document.createTextNode(gorunen || soru));
    let c; try { c = cevapla(soru); } catch (e) { console.error(e); c = {t: 'Bu soruyu hesaplarken bir sorun oldu. Farklı bir şekilde sormayı dener misiniz?'}; }
    botCevap(c);
  }
  kutu.querySelector('form').addEventListener('submit', (e) => { e.preventDefault(); const v = inp.value.trim(); if (!v) return; inp.value = ''; sor(v); });
  ac.addEventListener('click', () => {
    kutu.hidden = false; ac.hidden = true;
    if (!msj.childElementCount) botCevap({t: `Merhaba! TJK'nın 2026 sonuçlarından (${tarih(RAW.ilk)} – ${tarih(SON)}) cevap veriyorum. Bir at, jokey, antrenör, sahip ya da aygır adı yazabilir veya aşağıdakilerden birini deneyebilirsiniz.`, sec: ORNEKLER.map((s) => ({e: s, s}))});
    inp.focus();
  });
  kutu.querySelector('.bot-bas button').addEventListener('click', () => { kutu.hidden = true; ac.hidden = false; });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !kutu.hidden) { kutu.hidden = true; ac.hidden = false; } });
  window.tjkBot = {cevapla};   // test için
})();
