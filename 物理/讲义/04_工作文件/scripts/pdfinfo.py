
import sys, io
sys.stdout.reconfigure(encoding="utf-8")
import fitz
files = [
    r"G:\subject\Phy\讲义\Y10_Ch7_Ch8_Clean_No_Handwritten_Notes.pdf",
    r"G:\subject\Phy\复习\IGCSE_Physics_Ch2-11_No_Blank_Page.pdf",
    r"G:\subject\Phy\复习\Y10_Physics_Ch2-11_Bilingual_Exam_Revision_Density_In_Formula_Bank.pdf",
]
for f in files:
    d = fitz.open(f)
    print("="*90)
    print(f, "pages:", d.page_count, "meta:", {k: v for k, v in d.metadata.items() if v})
    for i in range(min(d.page_count, 8)):
        p = d[i]
        t = p.get_text().strip().replace("\n", " | ")
        imgs = len(p.get_images(full=True))
        print(f"  p{i+1}: chars={len(p.get_text())} imgs={imgs} :: {t[:220]}")
