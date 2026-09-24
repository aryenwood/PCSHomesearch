#!/usr/bin/env python3
"""Build data/directory.json (served) from the master directory dataset (docs/, never served).

The master is docs/research-2026-09/pcshomes_fort_drum_family_directory_v1.json.
Rules:
- needs_recheck records never ship.
- Only user-facing fields ship; admin/verification plumbing stays in the master.
- A record's displayed note is curated here: confidentiality_reporting_notes ship
  when written for users; admin_notes ship only via the explicit allowlist below.
- Never invent coordinates: lat/lng pass through only when the master has them.
Run: python3 tools/build-directory-data.py
"""
import json, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MASTER = os.path.join(ROOT, "docs/research-2026-09/pcshomes_fort_drum_family_directory_v1.json")
OUT = os.path.join(ROOT, "data/directory.json")

# admin_notes written in user-appropriate language, safe to display
ADMIN_NOTE_ALLOWLIST = {
    "medical-018",  # Guthrie has no ER/urgent care
    "medical-025",  # confirm Watertown VA address on the appointment
    "unit-080",     # 2nd MBCT: two published numbers
    "unit-088", "unit-089", "unit-090", "unit-091",  # after-hours routing
    "drum-092",     # pay office line guide
    "legal-047",    # NY divorce is Supreme Court, not Family Court
}
# builder-instruction notes that must NOT be shown to users
NOTE_BLOCKLIST_SUBSTRINGS = ("lead capture", "lead form", "PCSHomes")

def user_note(rec):
    parts = []
    conf = rec.get("confidentiality_reporting_notes") or ""
    if conf and not any(s.lower() in conf.lower() for s in NOTE_BLOCKLIST_SUBSTRINGS):
        parts.append(conf)
    if rec["id"] in ADMIN_NOTE_ALLOWLIST and rec.get("admin_notes"):
        parts.append(rec["admin_notes"])
    # curated replacements for records whose master note mixes user + builder text
    if rec["id"] == "safety-006":
        parts = ["Restricted (confidential) and unrestricted reporting options both exist. The SARC can explain each before you decide."]
    if rec["id"] == "safety-017":
        parts = ["Fort Drum publishes both a 24-hour chaplain line and an emergency chaplain support line. Either reaches a chaplain."]
    return " ".join(parts) or None

def slim(rec):
    return {k: v for k, v in {
        "id": rec["id"],
        "name": rec["name"],
        "cat": rec["category"],
        "sub": rec["subcategory"],
        "use": rec["use_this_when"],
        "tags": rec.get("intent_tags") or [],
        "phone": rec.get("phone_primary"),
        "phone2": rec.get("phone_secondary"),
        "sms": rec.get("sms"),
        "address": rec.get("address"),
        "city": rec.get("city"),
        "area": rec.get("area"),
        "hours": rec.get("hours_display"),
        "elig": rec.get("eligibility"),
        "cost": rec.get("cost"),
        "note": user_note(rec),
        "emergency": bool(rec.get("emergency")),
        "priority": rec.get("priority"),
        "verified": rec.get("bishop_verified_at") or rec.get("verified_at"),
        "source": rec.get("source_url"),
        "source_name": rec.get("source_name"),
        "lat": rec.get("lat"),
        "lng": rec.get("lng"),
    }.items() if v not in (None, "", [])}

def main():
    master = json.load(open(MASTER))
    ship = [slim(r) for r in master["records"] if r.get("status") == "active"]
    ship.sort(key=lambda r: ({"P0": 0, "P1": 1, "P2": 2}[r["priority"]], not r["emergency"], r["name"]))
    out = {
        "dataset": master["metadata"]["dataset"],
        "version": master["metadata"]["version"],
        "generated_at": master["metadata"]["generated_at"],
        "count": len(ship),
        "records": ship,
    }
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    json.dump(out, open(OUT, "w"), ensure_ascii=False, separators=(",", ":"))
    print(f"wrote {OUT}: {len(ship)} records "
          f"(emergency {sum(1 for r in ship if r['emergency'])}, "
          f"excluded {len(master['records']) - len(ship)} non-active)")

if __name__ == "__main__":
    main()
