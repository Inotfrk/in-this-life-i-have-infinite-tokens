
import sys, json, re
sys.stdout.reconfigure(encoding="utf-8")
units = json.load(open(r"D:\临时\phy_handouts\units_en.json", encoding="utf-8"))
uniq = json.load(open(r"D:\临时\phy_handouts\uniq_units.json", encoding="utf-8"))
zh = json.load(open(r"D:\临时\phy_handouts\zh_all.json", encoding="utf-8"))
tmap = {o["text"]: zh.get(o["uid"], "") for o in uniq}
from collections import Counter
c = Counter()
for u in units:
    if not tmap.get(u["text"], ""):
        c[u["ch"][:12]] += 1
print(c)
for u in units:
    if not tmap.get(u["text"], "") and u["ch"][:3] in ("第 2", "第 3", "第 4", "第 6"):
        print("FRONT MISS:", u["id"], u["text"][:70])
