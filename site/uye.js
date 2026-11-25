// İsteğe bağlı üyelik: Google veya e-postayla giriş, oyun liderlik tablosu, favori atlar.
// Firebase ayarı yoksa (firebase-config.js içinde null) hiçbir şey yapmaz.
const CFG = window.TJK_FIREBASE;
const SDK = 'https://www.gstatic.com/firebasejs/10.12.2/';

const st = document.createElement('style');
st.textContent = `
.uye-btn{margin-left:auto;font:600 14px "Space Grotesk",Inter,sans-serif;background:var(--lacivert);color:var(--yesil);border:0;border-radius:20px;padding:9px 16px;cursor:pointer;white-space:nowrap}
.uye-btn .harf{display:inline-grid;place-items:center;width:22px;height:22px;border-radius:50%;background:var(--yesil);color:var(--lacivert);font-size:12px;margin-right:6px}
.uye-perde{position:fixed;inset:0;background:rgba(3,7,15,.7);z-index:60;display:grid;place-items:center;padding:16px}
.uye-perde[hidden]{display:none}
.uye-kutu{background:var(--panel);border:1px solid var(--line);border-radius:12px;width:380px;max-width:100%;max-height:90vh;overflow:auto;padding:22px;position:relative}
.uye-kutu h3{font:700 20px "Space Grotesk",Inter,sans-serif;margin:0 0 4px}
.uye-kutu p{color:var(--mut);font-size:13px;margin:0 0 14px}
.uye-kutu label{display:flex;flex-direction:column;gap:4px;font-size:12px;color:var(--mut);margin-bottom:10px}
.uye-kutu input{width:100%}
.uye-kapat{position:absolute;top:10px;right:12px;background:none;border:0;color:var(--mut);font-size:24px;cursor:pointer}
.uye-ana{width:100%;font:700 15px "Space Grotesk",Inter,sans-serif;background:var(--yesil);color:var(--lacivert);border:0;border-radius:6px;padding:11px;cursor:pointer;margin-top:4px}
.uye-google{width:100%;font:600 14px Inter,sans-serif;background:#fff;color:#1f1f1f;border:0;border-radius:6px;padding:11px;cursor:pointer;display:flex;gap:8px;align-items:center;justify-content:center}
.uye-ayrac{display:flex;align-items:center;gap:8px;color:var(--mut);font-size:12px;margin:14px 0}.uye-ayrac::before,.uye-ayrac::after{content:"";flex:1;height:1px;background:var(--line)}
.uye-link{background:none;border:0;color:var(--yesil);font:inherit;font-size:13px;cursor:pointer;padding:0}
.uye-alt{display:flex;justify-content:space-between;margin-top:12px}
.uye-hata{color:var(--bad);font-size:13px;min-height:18px;margin-top:8px}
.uye-ok{color:var(--yesil)}
.uye-liste{list-style:none;padding:0;margin:0 0 12px}.uye-liste li{display:flex;justify-content:space-between;gap:8px;padding:7px 0;border-bottom:1px solid var(--line);font-size:14px}
.uye-liste button{background:none;border:0;color:var(--mut);cursor:pointer}
.fav-btn{font:600 13px Inter,sans-serif;background:transparent;color:var(--yesil);border:1px solid var(--yesil);border-radius:16px;padding:5px 12px;cursor:pointer;margin-left:8px}
.fav-btn.on{background:var(--yesil);color:var(--lacivert)}
.lider{margin-top:18px;text-align:left}.lider h4{font:700 15px "Space Grotesk",Inter,sans-serif;margin:0 0 6px}
.lider .ben td{color:var(--yesil);font-weight:600}`;
document.head.appendChild(st);

if (CFG) baslat().catch((e) => console.error('Üyelik yüklenemedi', e));

async function baslat() {
  const [{initializeApp}, A, F] = await Promise.all([import(SDK + 'firebase-app.js'), import(SDK + 'firebase-auth.js'), import(SDK + 'firebase-firestore.js')]);
  const app = initializeApp(CFG), auth = A.getAuth(app), db = F.getFirestore(app);
  auth.languageCode = 'tr';
  let kullanici = null, profil = {favoriler: []};

  // ---------- başlıktaki düğme ----------
  const btn = document.createElement('button');
  btn.type = 'button'; btn.className = 'uye-btn';
  document.querySelector('header').append(btn);
  const perde = document.createElement('div');
  perde.className = 'uye-perde'; perde.hidden = true;
  perde.innerHTML = '<div class="uye-kutu" role="dialog" aria-modal="true"><button class="uye-kapat" aria-label="Kapat">×</button><div class="uye-icerik"></div></div>';
  document.body.append(perde);
  const icerik = perde.querySelector('.uye-icerik');
  const kapat = () => { perde.hidden = true; };
  perde.querySelector('.uye-kapat').onclick = kapat;
  perde.addEventListener('click', (e) => { if (e.target === perde) kapat(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') kapat(); });
  const ad = () => kullanici?.displayName || kullanici?.email?.split('@')[0] || 'Üye';
  const HATA = {'auth/invalid-credential': 'E-posta ya da şifre hatalı.', 'auth/wrong-password': 'Şifre hatalı.', 'auth/user-not-found': 'Bu e-postayla kayıtlı üye yok.', 'auth/email-already-in-use': 'Bu e-postayla zaten bir hesap var. Giriş yapmayı deneyin.', 'auth/weak-password': 'Şifre en az 6 karakter olmalı.', 'auth/invalid-email': 'E-posta adresi geçersiz.', 'auth/popup-closed-by-user': 'Giriş penceresi kapatıldı.', 'auth/too-many-requests': 'Çok fazla deneme yapıldı, biraz sonra tekrar deneyin.', 'auth/unauthorized-domain': 'Bu alan adı Firebase\'de yetkilendirilmemiş.'};
  const hataYaz = (e) => { icerik.querySelector('.uye-hata').textContent = HATA[e.code] || 'Bir sorun oldu: ' + (e.code || e.message); };

  function girisFormu(kayit = false) {
    icerik.innerHTML = `<h3>${kayit ? 'Üye ol' : 'Giriş yap'}</h3><p>Oyun skorlarınızı liderlik tablosuna kaydedin, favori atlarınızı takip edin.</p>
      <button type="button" class="uye-google"><svg width="18" height="18" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.9z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.9z"/></svg>Google ile devam et</button>
      <div class="uye-ayrac">ya da e-postayla</div>
      <form>${kayit ? '<label>Adınız (liderlik tablosunda görünür)<input name="ad" maxlength="30" required></label>' : ''}
      <label>E-posta<input name="eposta" type="email" autocomplete="email" required></label>
      <label>Şifre<input name="sifre" type="password" minlength="6" autocomplete="${kayit ? 'new-password' : 'current-password'}" required></label>
      <button class="uye-ana">${kayit ? 'Üye ol' : 'Giriş yap'}</button></form>
      <div class="uye-hata" aria-live="polite"></div>
      <div class="uye-alt"><button type="button" class="uye-link" data-gec>${kayit ? 'Zaten üye misiniz? Giriş yapın' : 'Hesabınız yok mu? Üye olun'}</button>${kayit ? '' : '<button type="button" class="uye-link" data-unut>Şifremi unuttum</button>'}</div>`;
    icerik.querySelector('.uye-google').onclick = () => A.signInWithPopup(auth, new A.GoogleAuthProvider()).then(kapat, hataYaz);
    icerik.querySelector('[data-gec]').onclick = () => girisFormu(!kayit);
    const unut = icerik.querySelector('[data-unut]');
    if (unut) unut.onclick = () => {
      const e = icerik.querySelector('[name=eposta]').value.trim();
      if (!e) { icerik.querySelector('.uye-hata').textContent = 'Önce e-posta adresinizi yazın.'; return; }
      A.sendPasswordResetEmail(auth, e).then(() => { const h = icerik.querySelector('.uye-hata'); h.textContent = 'Şifre yenileme bağlantısı e-postanıza gönderildi.'; h.classList.add('uye-ok'); }, hataYaz);
    };
    icerik.querySelector('form').onsubmit = async (ev) => {
      ev.preventDefault();
      const f = new FormData(ev.target), e = f.get('eposta').trim(), s = f.get('sifre');
      try {
        if (kayit) { const k = await A.createUserWithEmailAndPassword(auth, e, s); await A.updateProfile(k.user, {displayName: f.get('ad').trim()}); kullanici = k.user; guncelleBtn(); }
        else await A.signInWithEmailAndPassword(auth, e, s);
        kapat();
      } catch (err) { hataYaz(err); }
    };
    perde.hidden = false;
    icerik.querySelector('.uye-google').focus();
  }

  async function profilPaneli() {
    const fav = profil.favoriler || [];
    const son = (k) => { const L = rows.filter((r) => r.k === k); const r = L.sort((a, b) => (a.rc.tarih < b.rc.tarih ? 1 : -1))[0]; return r ? `${tarih(r.rc.tarih)} · ${r.derecesiz ? 'Derecesiz' : r.sira + '/' + r.rc.n}` : '—'; };
    icerik.innerHTML = `<h3>Merhaba, ${esc(ad())}</h3><p>${esc(kullanici.email || '')}</p>
      <h4 style="margin:0 0 6px">Favori atlarınız</h4>
      ${fav.length ? `<ul class="uye-liste">${fav.map((k) => `<li><span><b>${esc(k.split('|')[0])}</b><br><small style="color:var(--mut)">Son koşu: ${esc(son(k))}</small></span><span><button data-ac="${esc(k)}" title="Karnesini aç">↗</button><button data-sil="${esc(k)}" title="Favorilerden çıkar">✕</button></span></li>`).join('')}</ul>` : '<p>Henüz favori at yok. Atlar sekmesinde bir atın karnesini açıp ★ düğmesine basın.</p>'}
      <button type="button" class="uye-ana" data-cik style="background:transparent;color:var(--bad);border:1px solid var(--bad)">Çıkış yap</button>`;
    icerik.querySelector('[data-cik]').onclick = () => A.signOut(auth).then(kapat);
    icerik.querySelectorAll('[data-sil]').forEach((b) => (b.onclick = async () => { await favDegis(b.dataset.sil); profilPaneli(); }));
    icerik.querySelectorAll('[data-ac]').forEach((b) => (b.onclick = () => { kapat(); atAc(b.dataset.ac); }));
    perde.hidden = false;
  }
  function atAc(k) {
    document.querySelector('#sekmeler button[data-tab="atlar"]').click();
    setTimeout(() => { const i = document.getElementById('atAra'); if (!i) return; durum.atSec = k; i.value = k.split('|')[0]; i.dispatchEvent(new Event('input')); i.scrollIntoView({behavior: 'smooth'}); }, 50);
  }
  function guncelleBtn() {
    btn.innerHTML = kullanici ? `<span class="harf">${esc(ad()[0].toLocaleUpperCase('tr'))}</span>${esc(ad())}` : 'Giriş yap';
    btn.onclick = () => (kullanici ? profilPaneli() : girisFormu());
  }

  // ---------- veri ----------
  async function profilYukle() {
    profil = {favoriler: []};
    if (!kullanici) return;
    try { const s = await F.getDoc(F.doc(db, 'kullanicilar', kullanici.uid)); if (s.exists()) profil = {favoriler: [], ...s.data()}; } catch (e) { console.error(e); }
  }
  async function favDegis(k) {
    const fav = new Set(profil.favoriler || []);
    if (fav.has(k)) fav.delete(k); else fav.add(k);
    profil.favoriler = [...fav];
    await F.setDoc(F.doc(db, 'kullanicilar', kullanici.uid), {favoriler: profil.favoriler, ad: ad()}, {merge: true});
  }

  // ---------- sitenin diğer bölümlerine açılan kapılar ----------
  window.tjkUye = {
    girisli: () => !!kullanici,
    girisAc: () => girisFormu(),
    favButon(k, el) {   // at karnesinde ★ düğmesi
      if (!el) return;
      const b = document.createElement('button'); b.type = 'button'; b.className = 'fav-btn';
      const ciz = () => { const on = (profil.favoriler || []).includes(k); b.classList.toggle('on', on); b.textContent = on ? '★ Favorilerde' : '☆ Favorilere ekle'; };
      b.onclick = async () => { if (!kullanici) return girisFormu(); b.disabled = true; try { await favDegis(k); } finally { b.disabled = false; ciz(); } };
      ciz(); el.replaceChildren(b);
    },
    async skorKaydet(kat, skor) {
      if (!kullanici) return false;
      const ref = F.doc(db, 'liderlik_' + kat, kullanici.uid);
      const s = await F.getDoc(ref);
      if (!s.exists() || s.data().skor < skor) await F.setDoc(ref, {ad: ad(), skor, tarih: new Date().toISOString().slice(0, 10)});
      return true;
    },
    async liderlik(kat, el) {
      if (!el) return;
      try {
        const q = F.query(F.collection(db, 'liderlik_' + kat), F.orderBy('skor', 'desc'), F.limit(10));
        const s = await F.getDocs(q);
        const satir = s.docs.map((d, i) => `<tr class="${kullanici && d.id === kullanici.uid ? 'ben' : ''}"><td>${i + 1}</td><td>${esc(d.data().ad)}</td><td class="r">${d.data().skor}/10</td><td>${esc(tarih(d.data().tarih))}</td></tr>`).join('');
        el.innerHTML = `<div class="lider"><h4>Liderlik tablosu</h4>${satir ? `<div class="tw"><table><thead><tr><th>#</th><th>Oyuncu</th><th class="r">En iyi</th><th>Tarih</th></tr></thead><tbody>${satir}</tbody></table></div>` : '<p class="empty">Bu kategoride henüz skor yok.</p>'}
          ${kullanici ? '' : '<p class="empty">Skorunuzun tabloya girmesi için <button type="button" class="uye-link" data-giris>giriş yapın</button>.</p>'}</div>`;
        const g = el.querySelector('[data-giris]'); if (g) g.onclick = () => girisFormu();
      } catch (e) { console.error(e); el.innerHTML = ''; }
    }
  };

  A.onAuthStateChanged(auth, async (u) => {
    kullanici = u; await profilYukle(); guncelleBtn();
    document.querySelectorAll('[data-fav-alan]').forEach((el) => window.tjkUye.favButon(el.dataset.favAlan, el));
  });
  guncelleBtn();
}
