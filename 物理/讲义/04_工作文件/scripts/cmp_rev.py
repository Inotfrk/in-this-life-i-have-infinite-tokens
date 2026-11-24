
import sys, os
sys.stdout.reconfigure(encoding="utf-8")
import fitz
pairs = [
    (r"G:\微信文件\Y10_Physics_Ch2-11_Bilingual_Exam_Revision_Density_In_Formula_Bank.pdf", r"D:\临时\phy_handouts\preview3\rev_wechat.png"),
    (r"G:\subject\Phy\复习\Y10_Physics_Ch2-11_Bilingual_Exam_Revision_Density_In_Formula_Bank.pdf", r"D:\临时\phy_handouts\preview3\rev_fuxi.png"),
]
for p, out in pairs:
    d = fitz.open(p)
    d[0].get_pixmap(dpi=100).save(out)
    print(out, os.path.getsize(out))
# 1-7练习 text
d = fitz.open(r"D:\临时\phy_handouts\out\lianxi.pdf")
for i in range(min(2, d.page_count)):
    print("--- lianxi page", i + 1)
    print(d[i].get_text()[:700])
