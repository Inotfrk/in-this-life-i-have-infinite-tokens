
import sys, os
sys.stdout.reconfigure(encoding="utf-8")
import fitz
d = fitz.open(r"D:\临时\phy_handouts\out\workbook_final.pdf")
out = r"D:\临时\phy_handouts\preview3"
for n in [41, 98]:
    d[n - 1].get_pixmap(dpi=110).save(os.path.join(out, "p%03d.png" % n))
print("ok")
