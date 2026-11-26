# B-Z Circuit Lab
**B-Z TEAM** · Windows desktop electronics design and simulation environment.

## Current engineering preview (v0.3.0)
- Tauri 2 desktop shell with Persian/English interface.
- Starter schematic editor with basic components, wiring, editing and JSON project import/export.
- Three.js component preview with orbit and zoom controls.
- Existing simple resistive DC nodal solver (not full SPICE).
- SPICE netlist generation and optional native ngspice batch execution (ngspice must be installed separately).
- Digital logic truth-table workbench for AND, OR, XOR, NAND, NOR and NOT.
- Arduino Uno R3 / Nano sketch compile adapter using Arduino CLI and optional simavr execution (tools and AVR core must be installed separately).
- Optional OpenAI-compatible vision endpoint for image analysis; results require human verification.
- KiCad-oriented XML netlist export; this is not a PCB layout editor.
- SQLite component-catalog ingestion pipeline requiring per-record source and license metadata.
- GitHub Actions Windows installer build.

## Important limitations
This is an engineering preview, **not a finished 1.0 release**. The million-record catalog is not bundled; the catalog screen contains demo records only. SPICE currently generates basic resistor/DC-source netlists only. Digital logic is a truth-table tool, not a connected gate-network simulator. Arduino support is limited to Uno/Nano ATmega328P compilation and optional simavr execution; hardware upload and serial monitor are not implemented. Image analysis requires the user to supply a compatible endpoint and API key. PCB export does not create routed boards, Gerbers or perform DRC. The 3D scene is not yet electrically interactive.

See [engineering module status](docs/ENGINEERING_MODULES.md), [catalog ingestion](docs/CATALOG.md), and [roadmap](docs/ROADMAP.md).

## Development
Requirements: Node.js 20+, Rust stable, Windows 10/11.
```bash
npm install
npm run dev
```
Build: `npm run tauri -- build`.
