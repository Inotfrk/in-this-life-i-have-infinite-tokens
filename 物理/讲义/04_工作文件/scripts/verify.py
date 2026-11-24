
import sys, json, re
sys.stdout.reconfigure(encoding="utf-8")
from docx import Document
from docx.oxml.ns import qn

MERGED = r"D:\临时\phy_handouts\out\IGCSE_Physics_Y10_Handout_Workbook_Ch2-11.docx"
d = Document(MERGED)

def iter_text(doc):
    body = doc.element.body
    for node in body.iter():
        if node.tag == qn("w:t") and node.text:
            yield node.text

merged = "".join(iter_text(d))
norm = lambda s: re.sub(r"\s+", "", s)
merged_n = norm(merged)
print("merged chars", len(merged), "images", len([r for r in d.part.rels.values() if "image" in r.reltype]))

entries = json.load(open(r"D:\临时\phy_handouts\toc_entries.json", encoding="utf-8"))
xml = d.element.xml
bm = set(re.findall(r'<w:bookmarkStart[^>]*w:name="([^"]+)"', xml))
missing = [e["anchor"] for e in entries if e["anchor"] not in bm]
print("bookmarks", len(bm), "anchors", len(entries), "missing anchors", len(missing))

SRC = [
    (r"G:\subject\Phy\讲义\cp2 week1.docx", 5),
    (r"G:\subject\Phy\讲义\cp3week2.docx", 9),
    (r"G:\subject\Phy\讲义\cp4&5 week3.docx", 8),
    (r"G:\subject\Phy\讲义\cp6.docx", 7),
    (r"D:\Appofmy\WeXin\xwechat_files\wxid_cypu5zb07seu12_da59\msg\file\2026-11\Y10_Ch7_Ch8_PPT_Only_Handout_Answers (2).docx", 11),
    (r"G:\subject\Phy\讲义\Chapter9_Kinetic_Model_Bilingual_Handout (2).docx", 4),
    (r"G:\subject\Phy\讲义\Y10_Ch10_Ch11_Bilingual_Handout (1).docx", 4),
]
for path, start in SRC:
    s = Document(path)
    blocks = [c for c in s.element.body.iterchildren() if c.tag != qn("w:sectPr")][start:]
    texts = []
    for b in blocks:
        t = "".join(x.text or "" for x in b.iter(qn("w:t")))
        if len(t.strip()) > 40:
            texts.append(t.strip())
    texts.sort(key=len, reverse=True)
    sample = texts[:12] + texts[len(texts)//2: len(texts)//2 + 6]
    miss = [t[:50] for t in sample if norm(t)[:120] not in merged_n]
    print("%-45s blocks=%3d probes=%2d missing=%d" % (path.split(chr(92))[-1][:45], len(blocks), len(sample), len(miss)))
    for m in miss[:3]:
        print("     MISS:", m)
