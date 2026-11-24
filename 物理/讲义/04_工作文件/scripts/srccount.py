
import sys
sys.stdout.reconfigure(encoding="utf-8")
import fitz
names = ["cp2", "cp3", "cp45", "cp6", "ch78", "ch9", "ch1011"]
total = 0
for n in names:
    d = fitz.open(r"D:\临时\phy_handouts\srcpdf\%s.pdf" % n)
    total += d.page_count
    low = [i + 1 for i in range(d.page_count) if len(d[i].get_text().strip()) < 120]
    print("%-7s pages=%3d  sparse=%s" % (n, d.page_count, low))
print("sum", total)
