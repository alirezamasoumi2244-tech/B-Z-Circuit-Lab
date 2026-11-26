#!/usr/bin/env python3
"""Import licensed component records from JSONL into a searchable SQLite catalog.

Each line must contain: manufacturer, mpn, description, support_level,
source_name, source_url, license_id. Optional fields: package, symbol,
footprint, spice_model, datasheet_url, metadata.
"""
import argparse
import json
import sqlite3
from pathlib import Path

SCHEMA = """
PRAGMA journal_mode=WAL;
CREATE TABLE IF NOT EXISTS components (
 id INTEGER PRIMARY KEY,
 manufacturer TEXT NOT NULL,
 mpn TEXT NOT NULL,
 description TEXT NOT NULL,
 support_level TEXT NOT NULL CHECK(support_level IN ('A','B','C')),
 package TEXT, symbol TEXT, footprint TEXT, spice_model TEXT,
 datasheet_url TEXT,
 source_name TEXT NOT NULL, source_url TEXT NOT NULL, license_id TEXT NOT NULL,
 metadata_json TEXT NOT NULL DEFAULT '{}',
 UNIQUE(manufacturer, mpn)
);
CREATE INDEX IF NOT EXISTS idx_components_mpn ON components(mpn);
CREATE INDEX IF NOT EXISTS idx_components_manufacturer ON components(manufacturer);
CREATE INDEX IF NOT EXISTS idx_components_description ON components(description);
"""
REQUIRED = ("manufacturer", "mpn", "description", "support_level",
            "source_name", "source_url", "license_id")

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("input", type=Path, help="JSON Lines source file")
    parser.add_argument("--db", type=Path, default=Path("data/components.sqlite"))
    args = parser.parse_args()
    args.db.parent.mkdir(parents=True, exist_ok=True)
    db = sqlite3.connect(args.db)
    db.executescript(SCHEMA)
    inserted = skipped = 0
    with args.input.open(encoding="utf-8") as stream, db:
        for line_no, line in enumerate(stream, 1):
            if not line.strip():
                continue
            try:
                item = json.loads(line)
                missing = [key for key in REQUIRED if not str(item.get(key, "")).strip()]
                if missing:
                    raise ValueError("missing required fields: " + ", ".join(missing))
                if item["support_level"] not in ("A", "B", "C"):
                    raise ValueError("support_level must be A, B, or C")
                cur = db.execute("""
                    INSERT OR IGNORE INTO components
                    (manufacturer,mpn,description,support_level,package,symbol,footprint,
                     spice_model,datasheet_url,source_name,source_url,license_id,metadata_json)
                    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
                """, tuple(item.get(k) for k in (
                    "manufacturer","mpn","description","support_level","package","symbol",
                    "footprint","spice_model","datasheet_url","source_name","source_url","license_id"
                )) + (json.dumps(item.get("metadata", {}), ensure_ascii=False),))
                inserted += cur.rowcount
                skipped += 1 - cur.rowcount
            except Exception as exc:
                raise SystemExit(f"{args.input}:{line_no}: {exc}")
    total = db.execute("SELECT COUNT(*) FROM components").fetchone()[0]
    db.close()
    print(f"Imported: {inserted}; duplicates: {skipped}; catalog total: {total}; database: {args.db}")

if __name__ == "__main__":
    main()
