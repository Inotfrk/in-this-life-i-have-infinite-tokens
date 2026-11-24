
import sys
sys.stdout.reconfigure(encoding="utf-8")
import fitz
for p in [r"G:\微信文件\IGCSE_Physics_Teacher_Q14b_Corrected_25-35s 2.pdf",
          r"G:\微信文件\Y10_Physics_Ch2-11_Bilingual_Exam_Revision_Density_In_Formula_Bank.pdf",
          r"G:\subject\Phy\复习\Y10_Physics_Ch2-11_Bilingual_Exam_Revision_Density_In_Formula_Bank.pdf",
          r"D:\临时\phy_handouts\out\lianxi.pdf"]:
    try:
        d = fitz.open(p)
        t = d[0].get_text().strip().replace("\n", " | ")
        print("=" * 80)
        print(p.split(chr(92))[-1], "pages", d.page_count, "size", round(__import__("os").path.getsize(p)/1048576,2), "MB")
        print(" p1:", t[:400])
    except Exception as e:
        print("ERR", p, e)
