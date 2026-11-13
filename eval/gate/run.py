#!/usr/bin/env python3
"""Run the labelled message set through the Kaveri gate and report counts.

    python3 eval/gate/run.py                    # Gemma through Ollama, as the bot uses it
    python3 eval/gate/run.py --patterns-only    # the fallback: wake patterns alone (gate down)
    python3 eval/gate/run.py --model gemma3:4b  # another model

Needs Ollama on KAVERI_GATE_URL (default http://127.0.0.1:11434): bash hermes/gate.sh start
Writes eval/results/gate-<model>.json. Standard library only, any Python 3.9+.

A missed trigger is a trigger message the gate would drop. A false wake is a small-talk message
it would pass on to the cloud model (which can still answer [SILENT]).
"""

from __future__ import annotations

import argparse
import json
import statistics
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "hermes" / "plugins" / "kaveri-gate"))
import gate  # noqa: E402


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--model", default=None)
    ap.add_argument("--url", default=None)
    ap.add_argument("--timeout", type=float, default=30.0, help="per message; generous so slow CPUs still measure the model")
    ap.add_argument("--patterns-only", action="store_true")
    ap.add_argument("--set", default=str(ROOT / "eval" / "gate" / "messages.jsonl"))
    args = ap.parse_args()

    patterns = gate.patterns_from_snippet(ROOT / "hermes" / "config.snippet.yaml")
    rows = [json.loads(line) for line in Path(args.set).read_text(encoding="utf-8").splitlines() if line.strip()]
    url = "http://127.0.0.1:9" if args.patterns_only else args.url  # port 9: nothing listens, forces the fallback
    model = args.model or gate.DEFAULT_MODEL
    name = "patterns-only" if args.patterns_only else model

    if not args.patterns_only:  # load the model once so the first message is not timed with the load
        try:
            gate.ask_gemma("hello", args.url or gate.DEFAULT_URL, model, 300)
        except Exception as exc:
            print(f"ERROR: cannot reach {model} on Ollama: {exc}", file=sys.stderr)
            return 1

    out = []
    for row in rows:
        d = gate.decide(row["text"], patterns, url=url, model=model, timeout=args.timeout)
        out.append({**row, "wake": d.wake, "source": d.source, "got": d.label, "ms": d.ms, "error": d.error})
        mark = "ok  " if d.wake == (row["label"] == "trigger") else "MISS" if row["label"] == "trigger" else "WAKE"
        print(f"{mark} {d.source:8} {d.label:10} {d.ms:6} ms  [{row['lang']}] {row['text']}")

    triggers = [r for r in out if r["label"] == "trigger"]
    small = [r for r in out if r["label"] == "small_talk"]
    missed = [r for r in triggers if not r["wake"]]
    false_wakes = [r for r in small if r["wake"]]
    times = sorted(r["ms"] for r in out)
    summary = {
        "gate": name,
        "ranAt": time.strftime("%Y-%m-%dT%H:%M:%S%z"),
        "messages": len(out),
        "triggers": len(triggers),
        "smallTalk": len(small),
        "missedTriggers": len(missed),
        "falseWakes": len(false_wakes),
        "byLanguage": {
            lang: {
                "missedTriggers": sum(1 for r in missed if r["lang"] == lang),
                "falseWakes": sum(1 for r in false_wakes if r["lang"] == lang),
            }
            for lang in sorted({r["lang"] for r in out})
        },
        "fellBackToPatterns": sum(1 for r in out if r["source"] == "patterns"),
        "msMedian": int(statistics.median(times)),
        "msMax": times[-1],
        "missed": [r["text"] for r in missed],
        "falseWakeTexts": [r["text"] for r in false_wakes],
    }
    print()
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    results = ROOT / "eval" / "results"
    results.mkdir(exist_ok=True)
    target = results / f"gate-{name.replace(':', '-').replace('/', '-')}.json"
    target.write_text(json.dumps({"summary": summary, "rows": out}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"\nwrote {target.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
