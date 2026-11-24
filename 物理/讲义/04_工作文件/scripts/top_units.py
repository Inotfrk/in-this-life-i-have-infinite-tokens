
import sys, json, re
sys.stdout.reconfigure(encoding="utf-8")
units = json.load(open(r"D:\临时\phy_handouts\units_en.json", encoding="utf-8"))
front = [u for u in units if u["ch"][:3] in ("第 2", "第 3", "第 4", "第 6")]
uniq = {}
for u in front:
    uniq.setdefault(u["text"], []).append(u["id"])
items = sorted(uniq.items(), key=lambda kv: -len(kv[1]))
print("unique", len(items))
for t, ids in items[:45]:
    print("%3d | %s" % (len(ids), t[:100]))
# also list short units count by word length
import collections
buckets = collections.Counter()
for t in uniq:
    w = len(re.findall(r"[A-Za-z][A-Za-z'\-]+", t))
    buckets[min(w, 20)] += 1
print("word-count buckets:", dict(sorted(buckets.items())))
