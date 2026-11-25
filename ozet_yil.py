#!/usr/bin/env python3
"""
Bir yılın TJK sonuç CSV'lerinden kariyer özeti çıkarır: ozet/YYYY.json

Kullanım:
    python3 ozet_yil.py <csv_klasoru> <yil> [--cikti ozet]

Her kişi/at için [koşu, 1., 2., 3., 4., 5.] sayıları tutulur.
Ham CSV'ler depoda saklanmaz (her yıl ~13 MB); geçmiş yıllar için sadece bu özet saklanır.
"""
import argparse
import glob
import json
import os

from parse_tjk import parse_file

KATEGORILER = {"j": "jokey", "tr": "antrenor", "sh": "sahip", "ba": "baba"}


def ozetle(klasor, yil):
    oz = {k: {} for k in list(KATEGORILER) + ["at"]}
    kosular, start, dosya, hatali = set(), 0, 0, []
    for f in sorted(glob.glob(os.path.join(klasor, f"{yil}-*.csv"))):
        dosya += 1
        try:
            satirlar = parse_file(f)
        except Exception as e:  # eski yıllarda biçim farklı olabilir: dosyayı atla, raporla
            hatali.append(f"{os.path.basename(f)}: {e}")
            continue
        for r in satirlar:
            kosular.add((r["tarih"], r["hipodrom"], r["kosu_no"]))
            start += 1
            sira = r["sira"] if r["durum"] == "Derece aldı" else 0
            anahtarlar = {k: r[a] for k, a in KATEGORILER.items()}
            dogum = int(r["tarih"][:4]) - r["yas"] if r.get("yas") else ""
            anahtarlar["at"] = f"{r['at']}|{dogum}|{r.get('irk', '')}"
            for k, ad in anahtarlar.items():
                if not ad or ad.startswith("|"):
                    continue
                v = oz[k].setdefault(ad, [0, 0, 0, 0, 0, 0])
                v[0] += 1
                if 1 <= sira <= 5:
                    v[sira] += 1
    return {"yil": yil, "dosya": dosya, "kosu": len(kosular), "start": start, "hatali": hatali[:20], **oz}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("klasor")
    ap.add_argument("yil", type=int)
    ap.add_argument("--cikti", default="ozet")
    a = ap.parse_args()
    oz = ozetle(a.klasor, a.yil)
    print(f"{a.yil}: {oz['dosya']} dosya, {oz['kosu']} koşu, {oz['start']} start, "
          f"{len(oz['j'])} jokey, {len(oz['at'])} at, {len(oz['hatali'])} hatalı dosya")
    for h in oz["hatali"]:
        print("  hata:", h)
    if not oz["start"]:
        return
    os.makedirs(a.cikti, exist_ok=True)
    with open(os.path.join(a.cikti, f"{a.yil}.json"), "w", encoding="utf-8") as f:
        json.dump(oz, f, ensure_ascii=False, separators=(",", ":"))


if __name__ == "__main__":
    main()
