
import sys, re, json
sys.stdout.reconfigure(encoding="utf-8")
from docx import Document
from docx.oxml.ns import qn

units = json.load(open(r"D:\临时\phy_handouts\units_en.json", encoding="utf-8"))
front = [u for u in units if u["ch"].startswith("第 2") or u["ch"].startswith("第 3") or u["ch"].startswith("第 4") or u["ch"].startswith("第 6")]
texts = [u["text"] for u in front]
uniq = {}
for t in texts:
    uniq[t] = uniq.get(t, 0) + 1
words_all = sum(len(re.findall(r"[A-Za-z][A-Za-z'\-]+", t)) for t in texts)
words_uniq = sum(len(re.findall(r"[A-Za-z][A-Za-z'\-]+", t)) for t in uniq)
print("front units", len(texts), "unique", len(uniq), "words all", words_all, "words uniq", words_uniq)
print("repeat top:")
for t, c in sorted(uniq.items(), key=lambda kv: -kv[1])[:12]:
    print("  x%d %s" % (c, t[:70]))
# inspect Ch9 bilingual styling
d = Document(r"D:\临时\phy_handouts\out\IGCSE_Physics_Y10_Handout_Workbook_Ch2-11.docx")
cjk = re.compile(r"[\u4e00-\u9fff]")
shown = 0
for p in d.paragraphs:
    t = p.text.strip()
    if t and cjk.search(t) and len(t) < 120:
        runs = [(r.font.size.pt if r.font.size else None, str(r.font.color.rgb) if r.font.color and r.font.color.rgb else None, r.font.name) for r in p.runs]
        print("STYLE", p.style.name, runs[:3], "|", t[:60])
        shown += 1
        if shown > 8:
            break
