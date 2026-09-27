import json, statistics
rows = [json.loads(l) for l in open("results.jsonl")]
by = {}
for r in rows:
    by.setdefault(r["country"], []).append(r)
out = {}
for c, rs in by.items():
    ok = [r for r in rs if r["ok"]]
    if not ok:
        continue
    out[c] = {
        "n": len(ok), "tried": len(rs),
        "pass": round(100 * sum(r["pass"] for r in ok) / len(ok), 1),
        "score": round(statistics.mean(r["score"] for r in ok), 1),
        "faults": statistics.median(r["provable"] for r in ok),
        "sites": sorted(({"d": r["domain"], "s": r["score"], "f": r["provable"]} for r in ok), key=lambda x: -x["s"]),
        "unreachable": [r["domain"] for r in rs if not r["ok"]],
    }
json.dump(out, open("scan.json", "w"), separators=(",", ":"))
for c, v in sorted(out.items(), key=lambda kv: -kv[1]["score"]):
    print(f'{c:12} n={v["n"]:2} pass={v["pass"]:5}% score={v["score"]:5} faults={v["faults"]}')
tot = [r for r in rows if r["ok"]]
print("total", len(tot), "pass", sum(r["pass"] for r in tot), "mean score", round(statistics.mean(r["score"] for r in tot), 1))
