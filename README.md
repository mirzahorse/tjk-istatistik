# TJK 2026 İstatistikleri

TJK'nın resmi günlük sonuç dosyalarından hazırlanan, sade bir istatistik sitesi.
Bu site bağımsızdır, TJK ile bağlantısı yoktur.

## Nasıl çalışır

Her saat (xx:17) GitHub Actions şunları yapar (bilgisayarınızın açık olması gerekmez):

1. `tjk_indir.py` bugünün ve dünün resmi sonuç CSV'lerini `veri/` klasörüne indirir (günde bir kez, 06:17'de, son 7 güne bakar).
2. `build_site.py` bu CSV'lerden `site/data.js` dosyasını yeniden üretir; yayından hemen önce `sifrele.py` bunu şifreler (`data.enc`). Şifresiz veri depoya da yayına da konmaz.
3. Değişiklik varsa depoya kaydeder ve siteyi GitHub Pages'te yeniden yayınlar.

Site adresi: https://mirzahorse.github.io/tjk-istatistik/

Elle çalıştırmak için: GitHub'da **Actions → TJK verisini güncelle → Run workflow**.

## Veri notları

- Ölü yarışta (fark sütununda "At Başı") iki at aynı sırayı paylaşır; TJK istatistikleri de böyle sayar.
- 18 Nisan 2026 Ankara günü TJK'nın sunucusunda yok; `arsivden_tamamla.py` ile bağımsız arşivden eklendi (AGF, HP, start ve ikramiye bilgisi yok). TJK dosyayı yayımlarsa indirici resmi dosyayı otomatik olarak koyar.

## Klasörler

| Yol | İçerik |
|---|---|
| `site/` | Yayınlanan site: `index.html` ve `data.js` |
| `veri/` | TJK'dan indirilen günlük sonuç CSV'leri |
| `tjk_indir.py` | CSV indirici |
| `parse_tjk.py` | CSV okuyucu |
| `build_site.py` | `site/data.js` üreticisi |
| `arsivden_tamamla.py` | TJK'nın resmi dosyasını yayımlamadığı bir günü bağımsız arşivden tamamlar (şu an yalnızca 18 Nisan 2026 Ankara) |
| `.github/workflows/guncelle.yml` | Günlük otomatik güncelleme |

## GitHub Pages ayarı (bir kez)

Settings → Pages → Build and deployment → **Source: GitHub Actions**.

## Bilgisayarda çalıştırmak

```
python3 tjk_indir.py
python3 build_site.py veri site
```

Sonra `site/index.html` dosyasını açın.

## Giriş ve şifreler

Site kullanıcı adı + şifreyle açılır. Veri tarayıcıda çözülür; şifreler hiçbir yerde düz metin olarak tutulmaz.

- Kullanıcılar: `site/kullanicilar.json` (her kullanıcı için ayrı kilit).
- GitHub'da **Settings → Secrets and variables → Actions → `YONETICI_SIFRE`** = admin kullanıcısının şifresi. Yayın bu olmadan yapılmaz.
- Kullanıcı eklemek / silmek:
  ```
  YONETICI_SIFRE=... python3 kullanici.py ekle yeniad     # rastgele şifre üretir, bir kez gösterir
  python3 kullanici.py sil eskiad
  ```
