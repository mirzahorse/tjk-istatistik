// Giriş: sitedeki bütün veri şifreli yayınlanır (data.enc, kariyer/*.enc).
// Her yayının veri anahtarı sitenin özel anahtarıyla açılır (anahtar.bin, RSA-OAEP).
// Özel anahtar, her kullanıcı için o kullanıcının şifresiyle ayrı kilitlenmiştir (kullanicilar.json).
// Şifre hiçbir yere gönderilmez; çözme tamamen tarayıcıda yapılır.
(() => {
  const SAKLA = 'tjk_ozel_v2', SAKLA_AD = 'tjk_ad_v1';
  // Giriş kaydı: Google E-Tablo'ya bağlı Apps Script adresi (boşsa kayıt tutulmaz)
  const IZLEME_URL = '';
  let kullanici = '';
  function izle(olay, sekme) {
    if (!IZLEME_URL || !kullanici) return;
    const ua = navigator.userAgent, cihaz = /iPad|Tablet/i.test(ua) ? 'Tablet' : /Mobi|Android|iPhone/i.test(ua) ? 'Telefon' : 'Bilgisayar';
    const tarayici = /Edg\//.test(ua) ? 'Edge' : /OPR\//.test(ua) ? 'Opera' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : 'Diğer';
    const veri = JSON.stringify({k: kullanici, o: olay, s: sekme || '', c: cihaz, t: tarayici});
    try { if (!navigator.sendBeacon(IZLEME_URL, veri)) fetch(IZLEME_URL, {method: 'POST', mode: 'no-cors', body: veri}); } catch (e) {}
  }
  let sonSekme = '';
  window.tjkIzle = (sekme) => { if (sekme && sekme !== sonSekme) { sonSekme = sekme; izle('sekme', sekme); } };
  const SURUM = '__SURUM__';   // yayında commit kimliğiyle değişir: tarayıcı eski dosyayı kullanmasın
  const b64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
  const enc = new TextEncoder(), dec = new TextDecoder();
  const kucuk = (s) => String(s || '').trim().toLocaleLowerCase('tr');
  let anahtar = null;

  async function coz(buf) { // buf: 12 bayt iv + şifreli veri
    const b = new Uint8Array(buf);
    return crypto.subtle.decrypt({name: 'AES-GCM', iv: b.slice(0, 12)}, anahtar, b.slice(12));
  }
  // diğer dosyalar (tum.js) şifreli dosyaları bununla açar
  // jokey fotoğrafları: site/foto/liste.json (kısa ad -> kod), her dosya kendi kilitli anahtarıyla şifreli
  let fotoAnahtar = null, fotoListe = null;
  const fotoBellek = new Map();
  window.tjkFotoVar = async (ad) => {
    if (!fotoListe) fotoListe = fetch('foto/liste.json', {cache: 'no-cache'}).then((r) => (r.ok ? r.json() : {})).catch(() => ({}));
    return !!(await fotoListe)[ad];
  };
  window.tjkFoto = (ad) => {
    if (fotoBellek.has(ad)) return fotoBellek.get(ad);
    const is = (async () => {
      if (!fotoAnahtar || !(await window.tjkFotoVar(ad))) return null;
      const kod = (await fotoListe)[ad];
      const b = new Uint8Array(await fetch('foto/' + kod + '.enc').then((r) => r.arrayBuffer()));
      const n = (b[0] << 8) | b[1];
      const ham = await crypto.subtle.decrypt({name: 'RSA-OAEP'}, fotoAnahtar, b.slice(2, 2 + n));
      const k = await crypto.subtle.importKey('raw', ham, 'AES-GCM', false, ['decrypt']);
      const jpg = await crypto.subtle.decrypt({name: 'AES-GCM', iv: b.slice(2 + n, 14 + n)}, k, b.slice(14 + n));
      return URL.createObjectURL(new Blob([jpg], {type: 'image/jpeg'}));
    })().catch(() => null);
    fotoBellek.set(ad, is); return is;
  };
  window.tjkCoz = async (url) => {
    const r = await fetch(url, {cache: 'no-cache'});
    if (!r.ok) throw new Error(url + ': ' + r.status);
    return dec.decode(await coz(await r.arrayBuffer()));
  };

  async function kilidiAc(ad, sifre) {
    const K = await fetch('kullanicilar.json', {cache: 'no-cache'}).then((r) => r.json());
    const u = K.k[kucuk(ad)];
    if (!u) return false;
    const temel = await crypto.subtle.importKey('raw', enc.encode(sifre), 'PBKDF2', false, ['deriveKey']);
    const kek = await crypto.subtle.deriveKey({name: 'PBKDF2', salt: b64(u.s), iterations: K.iter, hash: 'SHA-256'}, temel, {name: 'AES-GCM', length: 256}, false, ['decrypt']);
    try {
      const ham = await crypto.subtle.decrypt({name: 'AES-GCM', iv: b64(u.iv)}, kek, b64(u.w));
      return new Uint8Array(ham);
    } catch (e) { return false; }
  }
  async function anahtarYap(ozelDer) {
    const ozel = await crypto.subtle.importKey('pkcs8', ozelDer, {name: 'RSA-OAEP', hash: 'SHA-256'}, false, ['decrypt']);
    fotoAnahtar = ozel;
    const kilitli = await fetch('anahtar.bin', {cache: 'no-cache'}).then((r) => { if (!r.ok) throw new Error('anahtar.bin ' + r.status); return r.arrayBuffer(); });
    const ham = await crypto.subtle.decrypt({name: 'RSA-OAEP'}, ozel, kilitli);
    return crypto.subtle.importKey('raw', ham, 'AES-GCM', false, ['decrypt']);
  }

  function yukle(src, modul) {
    return new Promise((ok, hata) => {
      const s = document.createElement('script');
      if (modul) s.type = 'module'; else s.async = false;
      s.src = src + (src.includes('?') ? '&' : '?') + 'v=' + SURUM; s.onload = ok; s.onerror = () => hata(new Error(src));
      document.body.appendChild(s);
    });
  }

  async function baslat() {
    $g('ozetSatir').textContent = 'Veri açılıyor…';
    const metin = dec.decode(await coz(await fetch('data.enc', {cache: 'no-cache'}).then((r) => { if (!r.ok) throw new Error('data.enc ' + r.status); return r.arrayBuffer(); })));
    window.TJK_DATA = JSON.parse(metin);
    document.documentElement.classList.remove('kilitli');
    $g('kapi')?.remove();
    await yukle('app.js');
    for (const f of ['isim.js', 'bot.js', 'tum.js', 'grafik.js', 'komiser.js', 'akis.js', 'oneri.js', 'bugun.js', 'karsilastir.js', 'video.js', 'firebase-config.js']) yukle(f);
    yukle('uye.js', true);
    cikisDugmesi();
  }
  const $g = (id) => document.getElementById(id);

  function cikisDugmesi() {
    const f = $g('dipnot'); if (!f) return;
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'cikis'; b.textContent = 'Çıkış yap';
    b.addEventListener('click', () => { izle('çıkış'); try { for (const d of [localStorage, sessionStorage]) { d.removeItem(SAKLA); d.removeItem(SAKLA_AD); } } catch (e) {} setTimeout(() => location.reload(), 150); });
    f.after(b);
  }

  function kapi(hataMetni) {
    document.documentElement.classList.add('kilitli');
    const d = document.createElement('div');
    d.id = 'kapi';
    d.innerHTML = `<form class="kapi-kutu" autocomplete="on">
      <h2>Editör Paneli</h2>
      <p>Bu sayfa üyelere açık. Size verilen kullanıcı adı ve şifreyle girin.</p>
      <label>Kullanıcı adı<input name="username" id="kAd" autocomplete="username" autocapitalize="none" spellcheck="false" required></label>
      <label>Şifre<input name="password" id="kSifre" type="password" autocomplete="current-password" required></label>
      <label class="kapi-hatirla"><input type="checkbox" id="kHatirla" checked> Bu cihazda açık kalsın</label>
      <p class="kapi-hata" id="kHata" role="alert">${hataMetni || ''}</p>
      ${IZLEME_URL ? '<p class="kapi-not">Girişler kayıt altına alınır.</p>' : ''}
      <button class="btn" type="submit" id="kGir">Giriş yap</button>
    </form>`;
    document.body.appendChild(d);
    $g('kAd').focus();
    d.querySelector('form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = $g('kGir'); btn.disabled = true; btn.textContent = 'Kontrol ediliyor…'; $g('kHata').textContent = '';
      try {
        const ham = await kilidiAc($g('kAd').value, $g('kSifre').value);
        if (!ham) { $g('kHata').textContent = 'Kullanıcı adı ya da şifre yanlış.'; $g('kSifre').select(); return; }
        anahtar = await anahtarYap(ham);
        let sak = ''; for (const c of ham) sak += String.fromCharCode(c); sak = btoa(sak);
        kullanici = kucuk($g('kAd').value);
        try { const dp = $g('kHatirla').checked ? localStorage : sessionStorage; dp.setItem(SAKLA, sak); dp.setItem(SAKLA_AD, kullanici); } catch (err) {}
        izle('giriş');
        btn.textContent = 'Veri açılıyor…';
        await baslat();
      } catch (err) {
        $g('kHata').textContent = 'Veri açılamadı. Sayfayı yenileyip tekrar deneyin.';
        console.error(err);
      } finally { if ($g('kGir')) { btn.disabled = false; btn.textContent = 'Giriş yap'; } }
    });
  }

  (async () => {
    if (!window.crypto?.subtle) { kapi('Bu tarayıcı şifreli sayfayı açamıyor. Güncel bir tarayıcıyla deneyin.'); return; }
    let sak = null;
    try { sak = localStorage.getItem(SAKLA) || sessionStorage.getItem(SAKLA); kullanici = localStorage.getItem(SAKLA_AD) || sessionStorage.getItem(SAKLA_AD) || ''; } catch (e) {}
    if (sak) {
      try { anahtar = await anahtarYap(b64(sak)); izle('açılış'); await baslat(); return; } catch (e) {
        // anahtar değişmiş olabilir: yeniden giriş iste
        try { localStorage.removeItem(SAKLA); sessionStorage.removeItem(SAKLA); } catch (err) {}
      }
    }
    kapi();
  })();
})();
