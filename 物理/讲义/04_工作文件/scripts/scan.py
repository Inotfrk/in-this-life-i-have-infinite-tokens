
import sys, re
sys.stdout.reconfigure(encoding="utf-8")
from docx import Document
from docx.oxml.ns import qn
d = Document(r"G:\subject\Phy\讲义\IGCSE物理讲义合集_Ch2-11_合订本.docx")
text = "".join(t.text or "" for t in d.element.body.iter(qn("w:t")))
for pat in ["Name 姓名", "Name:", "COLOUR CODE", "TEACHER ANSWER VERSION", "Cambridge IGCSE Physics 0625"]:
    print(pat, text.count(pat))
print("parts:", len(re.findall(r"第 \d+[–\-]?\d* 章 · ", text)))
print("total chars", len(text))
# check heading list order
heads = [(p.style.name, p.text.strip()[:60]) for p in d.paragraphs if p.style.name.startswith("Heading 1")]
print("H1 count", len(heads))
for h in heads[:10]:
    print("  ", h[1])
