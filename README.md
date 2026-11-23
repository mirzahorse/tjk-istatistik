# TJK 2026 İstatistikleri

TJK'nın resmi günlük sonuç dosyalarından hazırlanan, sade bir istatistik sitesi.
Bu site bağımsızdır, TJK ile bağlantısı yoktur.

## Nasıl çalışır

6 saatte bir (İstanbul saatiyle 00:17, 06:17, 12:17, 18:17) GitHub Actions şunları yapar:

1. `tjk_indir.py` son 7 günün resmi sonuç CSV'lerini `veri/` klasörüne indirir; bugünün ve dünün dosyaları her seferinde yeniden kontrol edilir.
2. `build_site.py` bu CSV'lerden `site/data.js` dosyasını yeniden üretir.
3. Değişiklik varsa depoya kaydeder. Netlify bu kaydı görüp siteyi kendiliğinden yayınlar.

Elle çalıştırmak için: GitHub'da **Actions → TJK verisini güncelle → Run workflow**.

## Klasörler

| Yol | İçerik |
|---|---|
| `site/` | Yayınlanan site: `index.html` ve `data.js` |
| `veri/` | TJK'dan indirilen günlük sonuç CSV'leri |
| `tjk_indir.py` | CSV indirici |
| `parse_tjk.py` | CSV okuyucu |
| `build_site.py` | `site/data.js` üreticisi |
| `.github/workflows/guncelle.yml` | Günlük otomatik güncelleme |

## Netlify ayarı

Netlify'da **Add new site → Import an existing project → GitHub** ile bu depoyu seçin:

- Build command: *(boş bırakın)*
- Publish directory: `site`

## Bilgisayarda çalıştırmak

```
python3 tjk_indir.py
python3 build_site.py veri site
```

Sonra `site/index.html` dosyasını açın.
