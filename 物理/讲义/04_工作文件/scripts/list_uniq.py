
import sys, json, re
sys.stdout.reconfigure(encoding="utf-8")
units = json.load(open(r"D:\临时\phy_handouts\units_en.json", encoding="utf-8"))
front = [u for u in units if u["ch"][:3] in ("第 2", "第 3", "第 4", "第 6")]
order = []
seen = set()
for u in front:
    t = u["text"]
    if t not in seen:
        seen.add(t)
        order.append({"uid": "U%d" % (len(order) + 1), "text": t, "ids": []})
    for it in order:
        pass
# map text -> uid
tmap = {o["text"]: o["uid"] for o in order}
for u in front:
    next(o for o in order if o["uid"] == tmap[u["text"]])["ids"].append(u["id"])
json.dump(order, open(r"D:\临时\phy_handouts\uniq_units.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
start = int(sys.argv[1]); end = int(sys.argv[2])
for o in order[start-1:end]:
    print("%s\t%s" % (o["uid"], o["text"].replace("\n", " ")))
