import json, statistics, collections
rows = [json.loads(l) for l in open("results.jsonl")]
LABEL = {"color-contrast":"Low-contrast text","keyboard-focus-order":"Focus order doesn’t follow the page","control-faint-boundary":"Controls with faint edges","link-name":"Links with no name","keyboard-mouse-only":"Controls that need a mouse","keyboard-no-visible-focus":"No visible focus","text-spacing-clipped":"Text clips at wider spacing","color-contrast-mobile":"Low contrast on mobile","text-zoom-clipped":"Text clips at 200% zoom","mobile-horizontal-scroll":"Horizontal scroll on mobile","text-zoom-horizontal-scroll":"Horizontal scroll at 200% zoom","image-alt":"Images without alt text","motion-infinite-no-reduced-motion":"Endless motion ignores reduced-motion","link-text-vague":"Vague link text","dialog-missing-name":"Dialogs without a name","reading-order-mismatch":"Reading order ≠ visual order","dialog-keyboard-trap":"Dialog traps the keyboard","keyboard-focus-obscured":"Focus hidden behind sticky bars","component-skip-link":"No skip link","component-form-autocomplete":"Fields without autocomplete","button-name":"Buttons with no name","form-field-placeholder-label":"Placeholder used as label","forced-colors-focus-lost":"Focus lost in high-contrast mode","meta-viewport":"Zoom disabled","frame-title":"Frames without a title"}
def rules_of(rs):
    withr = [r for r in rs if "rules" in r]
    c = collections.Counter()
    for r in withr:
        for k in r["rules"]: c[k] += 1
    return len(withr), [{"id": k, "label": LABEL.get(k, k), "pct": round(100 * v / len(withr), 1)} for k, v in c.most_common(8)] if withr else []
by = {}
for r in rows: by.setdefault(r["country"], []).append(r)
out = {"countries": {}}
for c, rs in by.items():
    ok = [r for r in rs if r["ok"]]
    if not ok: continue
    nr, top = rules_of(ok)
    out["countries"][c] = {
        "n": len(ok), "tried": len(rs),
        "pass": round(100 * sum(r["pass"] for r in ok) / len(ok), 1),
        "score": round(statistics.mean(r["score"] for r in ok), 1),
        "faults": statistics.median(r["provable"] for r in ok),
        "sites": sorted(({"d": r["domain"], "s": r["score"], "f": r["provable"]} for r in ok), key=lambda x: -x["s"]),
        "unreachable": [r["domain"] for r in rs if not r["ok"]],
        "nRules": nr, "rules": top,
    }
ok = [r for r in rows if r["ok"]]
nr, top = rules_of(ok)
out["total"] = {"n": len(ok), "tried": len(rows), "pass": sum(r["pass"] for r in ok), "score": round(statistics.mean(r["score"] for r in ok), 1), "faults": statistics.median(r["provable"] for r in ok), "nRules": nr, "rules": top}
json.dump(out, open("scan.json", "w"), separators=(",", ":"), ensure_ascii=False)
for c, v in sorted(out["countries"].items(), key=lambda kv: -kv[1]["score"]):
    print(f'{c:12} n={v["n"]:2}/{v["tried"]} score={v["score"]:5} faults={v["faults"]:5} pass={v["pass"]}%')
print(out["total"])
