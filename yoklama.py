"""Eski yıllar için TJK sonuç dosyalarının yerini yoklar (yalnızca HEAD istekleri, az sayıda)."""
import subprocess, urllib.parse, time
B = "https://medya-cdn.tjk.org"
GUNLER = ["2021-09-26", "2021-06-27", "2021-01-03", "2020-10-04", "2020-06-28"]
SEHIR = ["İstanbul", "Istanbul", "ISTANBUL", "İSTANBUL"]
for g in GUNLER:
    y, a, d = g.split("-"); tr = f"{d}.{a}.{y}"
    for s in SEHIR:
        for yol in [f"/raporftp/TJKPDF/{y}/{g}/CSV/GunlukYarisSonuclari/{tr}-{s}-GunlukYarisSonuclari-TR.csv",
                    f"/raporftp/TJKPDF/{y}/{g}/CSV/{tr}-{s}-GunlukYarisSonuclari-TR.csv"]:
            u = B + urllib.parse.quote(yol, safe="/")
            r = subprocess.run(["curl", "-sS", "-I", "-L", "--max-time", "20", "-A", "Mozilla/5.0", "-o", "/dev/null", "-w", "%{http_code}", u], capture_output=True, text=True)
            print(r.stdout.strip() or r.stderr.strip(), yol); time.sleep(0.2)
