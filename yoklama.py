"""Eski yıllar için TJK sonuç dosyalarının yerini yoklar (yalnızca HEAD istekleri)."""
import subprocess, urllib.parse
B = "https://medya-cdn.tjk.org"
GUNLER = [("2026-11-22", "İzmir"), ("2021-10-03", "İstanbul"), ("2020-10-04", "İstanbul"), ("2019-10-06", "İstanbul"), ("2018-10-07", "İstanbul")]
for g, s in GUNLER:
    y, a, d = g.split("-"); tr = f"{d}.{a}.{y}"
    for yol in [f"/raporftp/TJKPDF/{y}/{g}/CSV/GunlukYarisSonuclari/{tr}-{s}-GunlukYarisSonuclari-TR.csv",
                f"/raporftp/TJKPDF/{y}/{g}/PDF/GunlukYarisSonuclari/{tr}-{s}-GunlukYarisSonuclari-TR.pdf",
                f"/raporftp/TJKPDF/{y}/{g}/PDF/GunlukYarisSonuclari/{tr}-{s}-GunlukYarisSonuclari-EN.pdf",
                f"/raporftp/TJKPDF/{y}/{g}/PDF/GunlukYarisProgrami/{tr}-{s}-GunlukYarisProgrami-TR.pdf",
                f"/raporftp/TJKPDF/{y}/{g}/GunlukYarisSonuclari/{tr}-{s}-GunlukYarisSonuclari-TR.pdf",
                f"/raporftp/TJKPDF/{y}/{g}/PDF/{tr}-{s}-GunlukYarisSonuclari-TR.pdf",
                f"/raporftp/TJKPDF/{y}/{g}/",
                f"/resmiprogram/{y}\\{y}{a}{d}-resmi-program-{s}.pdf"]:
        u = B + urllib.parse.quote(yol, safe="/\\")
        r = subprocess.run(["curl", "-sS", "-I", "-L", "--max-time", "20", "-A", "Mozilla/5.0", "-o", "/dev/null", "-w", "%{http_code} %{size_download}", u], capture_output=True, text=True)
        print(r.stdout.strip() or r.stderr.strip(), yol)
