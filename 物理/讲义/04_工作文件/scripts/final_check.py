
import sys, os
sys.stdout.reconfigure(encoding="utf-8")
import fitz
p = r"D:\临时\phy_handouts\out\workbook_final.pdf"
d = fitz.open(p)
print("pages", d.page_count)
out = r"D:\临时\phy_handouts\preview2"
os.makedirs(out, exist_ok=True)
right = []
for i in range(d.page_count):
    page = d[i]
    w = page.rect.width
    maxx = 0
    for b in page.get_text("blocks"):
        maxx = max(maxx, b[2])
    for im in page.get_images(full=True):
        for r in page.get_image_rects(im[0]):
            maxx = max(maxx, r.x1)
    if maxx > w - 20:
        right.append((i + 1, round(maxx, 1), round(w, 1)))
print("overflow-ish pages:", right[:20], "count", len(right))
for n in [1, 2, 3, 4, d.page_count - 3, d.page_count - 2, d.page_count - 1, d.page_count]:
    if 1 <= n <= d.page_count:
        pix = d[n - 1].get_pixmap(dpi=110)
        pix.save(os.path.join(out, "p%03d.png" % n))
print("rendered")
