# Architecture

## One circuit, multiple views
The versioned CircuitDocument is the source of truth. Schematic, breadboard, PCB, simulation and 3D must use stable component, pin and net identities. Views must not maintain disconnected copies of connectivity.

## Planned layers
- Desktop: Tauri 2; Rust for persistence, filesystem and native integration.
- UI: React + TypeScript; Persian/English.
- Domain: circuit schema, pins, nets, validation, undo/redo and migrations.
- Catalog: local SQLite, indexed search, provenance and license metadata; 1M+ records is a target, not current data.
- Analog: ngspice for supported validated models.
- Arduino: Arduino CLI compile; simavr only for compatible AVR boards.
- Digital: dedicated digital simulation engine.
- 3D: Three.js models linked to circuit objects and simulation state.
- AI image import: optional online analysis; uncertain connections require confirmation.
- PCB: KiCad-compatible interchange and explicit design-rule checks.

Every catalog record must track source, retrieval date, license and version. Never bundle assets without redistribution rights. Simulated faults must be model-based, not random.
