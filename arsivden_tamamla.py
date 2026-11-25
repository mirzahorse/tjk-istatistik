#!/usr/bin/env python3
"""
TJK'nın resmi sonuç dosyasını yayımlamadığı bir yarış gününü, bağımsız arşivden
(github.com/cenkozgur/tjk-data) resmi dosya biçiminde veri/ klasörüne yazar.

Kullanım: python3 arsivden_tamamla.py <arşiv klasörü> <YYYY-MM-DD> <Hipodrom>
örn:      python3 arsivden_tamamla.py /tmp/tjk-data 2026-04-18 Ankara

Arşivde olmayan alanlar şöyle tamamlanır:
- jokey ve antrenör adları: iki kaynağın ortak koşularından TJK kısaltmasına çevrilir (VEDAT ABİŞ → V.ABİŞ)
- baba, anne, sahip, renk, cinsiyet: atın resmi dosyalardaki diğer koşularından alınır
- AGF, handikap puanı, start, ikramiye, fark: boş bırakılır
Dosyanın ilk satırı "(Arşivden tamamlandı)" notunu taşır.
"""
import collections
import glob
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from parse_tjk import parse_file

arsiv, tarih, hip = sys.argv[1], sys.argv[2], sys.argv[3]
kok = os.path.dirname(os.path.abspath(__file__))
hedef = os.path.join(kok, "veri", f"{tarih}_{hip}.csv")
if os.path.exists(hedef) and "Arşivden" not in open(hedef, encoding="utf-8-sig").readline():
    sys.exit(f"{hedef} zaten TJK'nın resmi dosyası; dokunulmadı.")

resmi = []
for p in sorted(glob.glob(os.path.join(kok, "veri", "*.csv"))):
    if os.path.abspath(p) != os.path.abspath(hedef):
        resmi += parse_file(p)

# ortak koşulardan ad eşlemesi: (tarih, hipodrom, koşu, at) -> resmi satır
idx = {(r["tarih"], r["hipodrom"], r["kosu_no"], r["at"]): r for r in resmi}
jok, ant = collections.defaultdict(collections.Counter), collections.defaultdict(collections.Counter)
for p in glob.glob(os.path.join(arsiv, "data/results/2026-*.json")):
    for k in json.load(open(p, encoding="utf-8")):
        for h in k["horses"]:
            r = idx.get((k["date"], k["venue"], k["raceNo"], h["name"]))
            if r:
                if h.get("jockey"):
                    jok[h["jockey"]][(r["jokey"], r["apranti"])] += 1
                if h.get("trainer"):
                    ant[h["trainer"]][r["antrenor"]] += 1
son = {}
for r in resmi:
    son[r["at"]] = r  # resmi dosyalarda atın en son koşusu

kosular = [k for k in json.load(open(os.path.join(arsiv, f"data/results/{tarih}.json"), encoding="utf-8")) if k["venue"] == hip]
if not kosular:
    sys.exit("Arşivde bu güne ait koşu yok.")
R = {"Doru": "d", "Al": "a", "Kır": "k", "Yağız": "y"}
satir = [f"{hip};(Arşivden tamamlandı);{tarih[8:]}/{tarih[5:7]}/{tarih[:4]}"]
eksik = set()
for k in sorted(kosular, key=lambda x: x["raceNo"]):
    irk = collections.Counter(son[h["name"]]["irk"] for h in k["horses"] if h["name"] in son).most_common(1)
    irk = irk[0][0] if irk else ""
    grup = {"İngiliz": "İngilizler", "Arap": "Araplar"}.get(irk, "")
    satir.append(f"{k['raceNo']}. Kosu :   00.00;{k.get('raceClass') or ''}; {grup}; kg; {k['distance']}m; {k['surface']};;;;")
    satir.append("At No;At İsmi;Yaş;Orijin(Baba);Orijin(Anne);Kilo;Jokey Adı;Sahip Adı;Antrenör Adı;St;AGF;H;Derece;Ganyan;Fark")
    for h in sorted([h for h in k["horses"] if not h.get("nonRunner")], key=lambda h: (h.get("position") or 99)):
        o = son.get(h["name"], {})
        if not o:
            eksik.add(h["name"])
        j = jok[h.get("jockey")].most_common(1)
        jad = (j[0][0][0] + (" AP" if j[0][0][1] else "")) if j else (h.get("jockey") or "")
        a = ant[h.get("trainer")].most_common(1)
        aad = a[0][0] if a else (h.get("trainer") or "")
        ft = h.get("finishTime") or ""
        derece = ft.replace(".", ":", 1) if ft.count(".") == 2 else ("Derecesiz" if not ft else ft)
        renk = R.get(o.get("renk", ""), "d")
        cins = o.get("cinsiyet_kodu", "") or ("d" if o.get("cinsiyet") == "Dişi" else "e")
        gny = (f"{h['odds']:.2f}".replace(".", ",") if h.get("odds") else "")
        satir.append(";".join([str(h.get("position") or ""), h["name"], f"{h.get('age', o.get('yas', ''))}y {renk}  {cins}",
                               o.get("baba", ""), o.get("anne", ""), str(h.get("weight") or "").replace(".", ","), jad,
                               o.get("sahip", ""), aad, "", "", "", derece, gny, ""]))
with open(hedef, "w", encoding="utf-8") as f:
    f.write("\n".join(satir) + "\n")
print(f"{hedef}: {len(kosular)} koşu yazıldı.", f"Resmi dosyalarda bulunamayan atlar: {sorted(eksik)}" if eksik else "")
