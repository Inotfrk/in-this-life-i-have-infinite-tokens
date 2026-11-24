
import sys, os
sys.stdout.reconfigure(encoding="utf-8")
import fitz
d = fitz.open(r"D:\临时\phy_handouts\out\lianxi.pdf")
d[0].get_pixmap(dpi=100).save(r"D:\临时\phy_handouts\preview3\lianxi_p1.png")
print("ok")
