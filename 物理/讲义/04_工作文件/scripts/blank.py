
import sys
sys.stdout.reconfigure(encoding="utf-8")
import fitz
p = r"D:\临时\phy_handouts\out\workbook_pass1.pdf"
d = fitz.open(p)
low = []
for i in range(d.page_count):
    t = d[i].get_text().strip()
    body = t
    n = len(body)
    if n < 200:
        low.append((i + 1, n))
print("low-text pages:", low)
for n in range(86, 94):
    t = d[n - 1].get_text().strip().replace("\n", " | ")
    print(n, len(t), "::", t[:200])
