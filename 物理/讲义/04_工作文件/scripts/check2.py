
import sys
sys.stdout.reconfigure(encoding="utf-8")
import fitz
d = fitz.open(r"D:\临时\phy_handouts\out\workbook_pass1.pdf")
print("pages", d.page_count)
low = []
for i in range(d.page_count):
    t = d[i].get_text().strip()
    body = t.split("Ch2–11")[-1]
    if len(body) < 120:
        low.append((i + 1, len(body)))
print("sparse pages:", low)
