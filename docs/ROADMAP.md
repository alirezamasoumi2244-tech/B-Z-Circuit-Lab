# Roadmap

A screen is not proof an engine is complete. Each milestone requires automated tests, documented limits and a successful Windows build.

1. **Foundation — preview implemented:** Tauri shell, bilingual UI, CI, shared circuit model and JSON import/export.
2. **Starter simulation — partial:** resistive DC nodal solver and basic SPICE netlist generation. Full ngspice model coverage, AC/transient analysis and waveforms remain.
3. **Digital logic — partial:** truth tables for six basic gates. Connected gate graph, propagation delay, sequential logic and clocked simulation remain.
4. **Arduino — partial:** Uno/Nano compile adapter and optional simavr launch. Validate native dependencies on Windows; add GPIO visualization, serial monitor, peripherals and hardware upload.
5. **Catalog — pipeline implemented:** SQLite JSONL importer with source/license metadata. Populate and validate at least one million real, redistributable component records.
6. **Image analysis — adapter implemented:** user-configured vision endpoint; add robust structured parsing, perspective correction, confidence scoring and confirmed conversion to editable circuits.
7. **PCB — netlist export only:** implement footprints, board editor, placement, routing, DRC and Gerber outputs.
8. **3D interactive lab — partial:** current geometry preview only. Add real component assets and connect switches, potentiometers, LEDs and instruments to simulation state.
9. **Release 1.0 — not ready:** automated tests, dependency packaging, Windows installer validation, documentation and signed release process.
