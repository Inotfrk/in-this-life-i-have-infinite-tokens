
import sys
sys.stdout.reconfigure(encoding="utf-8")
import fitz
p = r"D:\Appofmy\WeXin\xwechat_files\wxid_cypu5zb07seu12_da59\msg\attach\5f656d3bbdad500b2374672487092d41\2026-11\Rec\5cff07f483559d6a\F\0\Y10_Physics_Ch2-11_Bilingual_Exam_Revision_Density_In_Formul.pdf"
d = fitz.open(p)
print("pages", d.page_count)
for i in range(d.page_count):
    t = d[i].get_text()
    print("=" * 30, "page", i + 1, "chars", len(t))
    print(t[:1500])
