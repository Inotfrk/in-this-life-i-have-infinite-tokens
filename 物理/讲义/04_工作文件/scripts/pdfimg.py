
import sys, os
sys.stdout.reconfigure(encoding="utf-8")
import fitz
p = r"D:\临时\phy_handouts\out\workbook_pass1.pdf"
d = fitz.open(p)
img_pages = []
for i in range(d.page_count):
    imgs = d[i].get_images(full=True)
    if imgs:
        img_pages.append((i + 1, len(imgs)))
print("pages with images:", len(img_pages), img_pages[:40])
out = r"D:\临时\phy_handouts\preview"
for n in [30, 60, 90, 120, 144]:
    if n <= d.page_count:
        pix = d[n - 1].get_pixmap(dpi=110)
        pix.save(os.path.join(out, "p%03d.png" % n))
print("rendered")
