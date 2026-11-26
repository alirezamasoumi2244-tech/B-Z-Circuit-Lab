# Component catalog data pipeline

The app does not ship a fabricated one-million-record database. The SQLite ingestion pipeline is in `scripts/import_catalog.py`.

## Record requirements
Each JSONL record must provide manufacturer, MPN, description, support level (A/B/C), source name, source URL and license identifier. Optional fields include symbol, footprint, SPICE model and datasheet URL. Duplicate manufacturer/MPN pairs are ignored.

- **A**: a real simulation model is supplied and validated for a specific engine.
- **B**: symbol/footprint/metadata available; not necessarily simulatable.
- **C**: reference metadata/datasheet only.

## Import
```bash
python scripts/import_catalog.py vendor-parts.jsonl --db data/components.sqlite
```

Only import datasets whose license permits the intended use and redistribution. Keep the source and license for every row. Reaching one million verified records depends on acquiring and validating appropriately licensed source datasets; the importer itself does not create those records.
