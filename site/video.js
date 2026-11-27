// Videolar: Yarıştayız YouTube kanalı. YouTube'un resmi gömme oynatıcısı kullanılır;
// site YouTube'dan veri çekmez, oynatıcıyı izleyenin tarayıcısı yükler.
(() => {
  const KANAL = 'UCPFtGDPa6BkaJJJpvmQazIA', ID = KANAL.slice(2), ADRES = 'https://www.youtube.com/@yaristayiz';
  const LISTE = [
    {k: 'UU', ad: 'Tümü'},
    {k: 'UULF', ad: 'Videolar'},
    {k: 'UUSH', ad: 'Shorts'},
    {k: 'UULV', ad: 'Canlı yayınlar'},
  ];
  let secili = 'UU';
  const kaynak = (k) => `https://www.youtube-nocookie.com/embed/videoseries?list=${k}${ID}&rel=0&modestbranding=1`;

  function ciz() {
    const alan = document.getElementById('videoAlan'); if (!alan) return;
    alan.innerHTML = `<section class="card video-kart">
      <div class="video-ust">
        <div><h2>Yarıştayız videoları</h2><p class="d">Kanala yüklenen en yeni videolar. Oynatıcının sağ üstündeki liste simgesinden diğer videolara geçebilirsiniz.</p></div>
        <a class="btn ikincil" href="${ADRES}" target="_blank" rel="noopener">Kanalı YouTube'da aç</a>
      </div>
      <div class="chips video-sec">${LISTE.map((l) => `<button type="button" class="chip${l.k === secili ? ' on' : ''}" data-l="${l.k}">${l.ad}</button>`).join('')}</div>
      <div class="video-cerceve${secili === 'UUSH' ? ' dik' : ''}">
        <iframe src="${kaynak(secili)}" title="Yarıştayız - ${LISTE.find((l) => l.k === secili).ad}" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
      </div>
      <p class="d video-not">Bu bölümde video yoksa oynatıcı "liste bulunamadı" der; başka bir sekme seçin.</p>
    </section>`;
    alan.querySelectorAll('.video-sec .chip').forEach((b) => b.addEventListener('click', () => { secili = b.dataset.l; ciz(); }));
  }
  window.tjkVideo = {baslat: ciz};
  if (document.getElementById('videoAlan')) ciz();
})();
