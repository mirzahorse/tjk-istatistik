#!/usr/bin/env python3
"""
TJK resmi günlük sonuç CSV'lerini indirir (medya-cdn.tjk.org).

Kullanım:
    python3 tjk_indir.py                  # 1 Ocak'tan bugüne kadar eksik olanları indirir (bugün ve dün her seferinde yenilenir)
    python3 tjk_indir.py --gun 7          # yalnızca son 7 günü dener (otomatik güncelleme bunu kullanır)
    python3 tjk_indir.py --klasor veri    # dosyaların ineceği klasör (varsayılan: veri)

İnmiş dosyalar atlanır. Sadece Python standart kütüphanesi ve curl kullanılır.
"""
import argparse
import datetime as dt
import os
import subprocess
import sys
import time
import urllib.parse
from zoneinfo import ZoneInfo
from concurrent.futures import ThreadPoolExecutor

HIPODROMLAR = ["İstanbul", "Ankara", "İzmir", "Bursa", "Adana", "Antalya",
               "Kocaeli", "Elazığ", "Diyarbakır", "Şanlıurfa"]
YIL_BASI = dt.date(2026, 1, 1)
ESZAMANLI = 3      # aynı anda en fazla 3 istek: TJK sunucusunu yormamak için
BEKLEME = 0.2      # her istekten sonra saniye


def url(gun, sehir, tur="GunlukYarisSonuclari"):
    yol = (f"/raporftp/TJKPDF/{gun:%Y}/{gun:%Y-%m-%d}/CSV/{tur}/"
           f"{gun:%d.%m.%Y}-{sehir}-{tur}-TR.csv")
    return "https://medya-cdn.tjk.org" + urllib.parse.quote(yol)


def indir(klasor, gun, sehir, zorla=False):
    """zorla=True: dosya varsa bile yeniden indirir (gün içinde tamamlanan sonuçlar için)."""
    hedef = os.path.join(klasor, f"{gun:%Y-%m-%d}_{sehir}.csv")
    if os.path.exists(hedef) and "Arşivden" in open(hedef, encoding="utf-8-sig").readline():
        zorla = True   # arşivden tamamlanmış gün: TJK resmi dosyayı yayımladıysa onunla değiştir
    if not zorla and os.path.exists(hedef) and os.path.getsize(hedef) > 200:
        return "var"
    gecici = hedef + ".part"
    for deneme in range(3):
        r = subprocess.run(["curl", "-sS", "-L", "--max-time", "30", "-A", "Mozilla/5.0",
                            "-o", gecici, "-w", "%{http_code}", url(gun, sehir)],
                           capture_output=True, text=True)
        time.sleep(BEKLEME)
        kod = r.stdout.strip()
        if kod == "200" and os.path.exists(gecici) and os.path.getsize(gecici) > 200:
            with open(gecici, "rb") as f:
                if b"<html" in f.read(300).lower():
                    os.remove(gecici)
                    return "yok"
            if os.path.exists(hedef) and open(hedef, "rb").read() == open(gecici, "rb").read():
                os.remove(gecici)
                return "var"
            os.replace(gecici, hedef)
            return "indi"
        if os.path.exists(gecici):
            os.remove(gecici)
        if kod in ("404", "403", "400"):
            return "var" if os.path.exists(hedef) else "yok"
        time.sleep(2 * (deneme + 1))
    return "hata"


def program_indir(klasor, bugun, tur="GunlukYarisProgrami", gun_sayisi=4):
    """Önümüzdeki günlerin koşu programı (GunlukYarisProgrami = deklare edilmiş koşular, yarıştan 2 gün önce)
    ya da kayıtları (Kayitlar = yarıştan 6 gün önce). Eski günler silinir."""
    os.makedirs(klasor, exist_ok=True)
    for f in os.listdir(klasor):
        if f[:10] < (bugun - dt.timedelta(days=1)).isoformat():
            os.remove(os.path.join(klasor, f))
    n = 0
    for d in range(0, gun_sayisi):
        gun = bugun + dt.timedelta(days=d)
        for sehir in HIPODROMLAR:
            hedef = os.path.join(klasor, f"{gun:%Y-%m-%d}_{sehir}.csv")
            r = subprocess.run(["curl", "-sS", "-L", "--max-time", "30", "-A", "Mozilla/5.0", "-o", hedef + ".part", "-w", "%{http_code}",
                                url(gun, sehir, tur)], capture_output=True, text=True)
            time.sleep(BEKLEME)
            ok = r.stdout.strip() == "200" and os.path.exists(hedef + ".part") and os.path.getsize(hedef + ".part") > 200 \
                and b"<html" not in open(hedef + ".part", "rb").read(300).lower()
            if ok:
                os.replace(hedef + ".part", hedef); n += 1
            elif os.path.exists(hedef + ".part"):
                os.remove(hedef + ".part")
    print(f"{tur}: {n} dosya", flush=True)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--klasor", default="veri")
    ap.add_argument("--gun", type=int, default=0, help="yalnızca son N günü dene (0 = yılın tamamı)")
    ap.add_argument("--yil", type=int, default=0, help="geçmiş bir yılın tamamını indir (ör. 2015)")
    ap.add_argument("--program", default="", help="önümüzdeki günlerin programını (deklare) bu klasöre indir")
    ap.add_argument("--kayit", default="", help="önümüzdeki günlerin kayıtlarını bu klasöre indir")
    ap.add_argument("--ornek", action="store_true", help="--yil ile: yalnızca birkaç günü dene (yıl var mı keşfi)")
    a = ap.parse_args()
    os.makedirs(a.klasor, exist_ok=True)

    # bağlantı testi: bilinen bir dosyayı her seferinde gerçekten indirmeyi dener
    test = subprocess.run(["curl", "-sS", "-L", "--max-time", "30", "-A", "Mozilla/5.0", "-o", os.devnull,
                           "-w", "%{http_code}", url(dt.date(2026, 11, 22), "İzmir")], capture_output=True, text=True)
    if test.stdout.strip() != "200":
        print(f"TJK'ya erişilemedi (HTTP {test.stdout.strip() or 'yok'}). {test.stderr.strip()}")
        sys.exit(1)
    print("TJK bağlantı testi: tamam", flush=True)

    bugun = dt.datetime.now(ZoneInfo("Europe/Istanbul")).date()
    if a.yil:
        baslangic, bitis = dt.date(a.yil, 1, 1), min(dt.date(a.yil, 12, 31), bugun)
    else:
        bitis = bugun
        baslangic = max(YIL_BASI, bitis - dt.timedelta(days=a.gun - 1)) if a.gun else YIL_BASI
    isler = []
    gun = baslangic
    while gun <= bitis:
        # keşif: ocak, nisan, temmuz, ekim aylarının ilk 3 günü
        if not a.ornek or (gun.month in (1, 4, 7, 10) and gun.day <= 3):
            isler += [(gun, s) for s in HIPODROMLAR]
        gun += dt.timedelta(days=1)
    print(f"{baslangic} – {bitis}: {len(isler)} dosya denenecek", flush=True)

    sayac = {"indi": 0, "var": 0, "yok": 0, "hata": 0}
    with ThreadPoolExecutor(ESZAMANLI) as ex:
        for (g, s), sonuc in zip(isler, ex.map(lambda x: indir(a.klasor, *x, zorla=(bugun - x[0]).days <= 1 and not a.yil), isler)):
            sayac[sonuc] += 1
            if sonuc == "hata":
                print(f"  ağ hatası: {g} {s}", flush=True)
    if a.program and not a.yil:
        program_indir(a.program, bugun)
    if a.kayit and not a.yil:
        program_indir(a.kayit, bugun, "Kayitlar", 9)
    print(f"indi: {sayac['indi']}  zaten vardı: {sayac['var']}  yarış yok: {sayac['yok']}  hata: {sayac['hata']}")
    # hiç dosya inemediyse ve hepsi hata verdiyse iş akışı başarısız görünsün
    if sayac["hata"] and not (sayac["indi"] or sayac["var"]):
        sys.exit(1)
    if a.ornek:
        sys.exit(0 if sayac["indi"] or sayac["var"] else 3)   # 3 = bu yıl için dosya yok


if __name__ == "__main__":
    main()
