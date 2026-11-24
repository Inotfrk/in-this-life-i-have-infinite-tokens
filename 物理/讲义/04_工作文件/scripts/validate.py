
import sys, zipfile
sys.stdout.reconfigure(encoding="utf-8")
from lxml import etree
p = r"G:\subject\Phy\讲义\IGCSE物理讲义合集_Ch2-11_合订本.docx"
z = zipfile.ZipFile(p)
bad = []
for name in ["word/document.xml", "word/styles.xml", "word/footer1.xml", "word/settings.xml", "[Content_Types].xml"]:
    try:
        etree.fromstring(z.read(name))
        print("OK xml", name, len(z.read(name)))
    except Exception as e:
        bad.append((name, str(e)))
        print("BAD", name, e)
xml = z.read("word/document.xml").decode("utf-8")
print("fldChar begin:", xml.count('w:fldCharType="begin"'), "separate:", xml.count('w:fldCharType="separate"'), "end:", xml.count('w:fldCharType="end"'))
print("TOC instr:", 'TOC \\o "1-2"' in xml)
print("parts:", xml.count("第 2 章 · 运动描述"), xml.count("第 10–11 章 · 热学性质"))
print("files:", len(z.namelist()))
