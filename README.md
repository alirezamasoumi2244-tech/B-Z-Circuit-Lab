# B-Z Circuit Lab
**B-Z TEAM** · Windows desktop electronics design workspace.

## Version 0.4.0 — Light UI
This build updates the interface to a light engineering workspace and improves small-window/mobile-width layout. It packages the currently implemented tools in one desktop application.

## What is currently usable
- Persian/English interface; switch language from the top toolbar.
- Schematic editor: add supported components, edit reference/value, move parts, connect pins, save locally, import/export JSON project files.
- Digital logic panel: evaluate supported combinational gates (AND, OR, XOR, NOT, NAND, NOR) using the digital panel.
- Basic DC resistive analysis for the supported simple circuit cases.
- 3D component scene with orbit/zoom and supported interactive controls.
- Breadboard visualization (its mapping is not yet a full automatic synchronized layout).
- SPICE netlist generation / optional ngspice batch run. ngspice must be installed separately; current netlist support is limited.
- Arduino compile/simulate adapter for supported AVR boards (Arduino CLI, AVR core and simavr are external prerequisites).
- Image-assisted circuit interpretation via a user-configured compatible vision API; verify suggested connections before using them.
- Component catalog ingestion via JSONL with source/license metadata. The database is not shipped with one million licensed parts.
- KiCad-oriented netlist export.

## Getting started (Windows)
1. Install the Windows x64 setup package and launch **B-Z Circuit Lab**.
2. Select **شماتیک / Schematic**. Use the component list on the right to add a resistor, battery, LED, switch or logic element.
3. Click a pin on one component, then a pin on another component to create a net. Click a part to select it; edit its reference/value in the inspector.
4. Press **ذخیره پروژه / Save project** to save in the app's local browser storage. Use **Export** to create a portable project JSON; use **Import** to reopen it on another installation.
5. Open **Digital Logic** to work with supported logic gates; **Simulation** for the basic DC analyzer; **3D Interactive Lab** to inspect the scene.
6. SPICE and Arduino panels require their external command-line tools to be installed and available on PATH. The Image Analysis panel requires your own compatible API endpoint and key.

## Engineering boundaries — read before relying on results
This is not yet a complete professional 1.0 electronics CAD suite. The current DC solver is limited and is not a replacement for ngspice. The SPICE adapter does not yet provide a full device-model library or all analyses. Arduino support is limited to the currently implemented AVR workflow; it is not a general-purpose MCU simulator and does not upload to physical boards. The image model can make mistakes. PCB support is currently export-oriented, not a complete interactive PCB editor with routing, DRC and Gerber generation. The component catalog requires real licensed source datasets to reach one million records; no records are fabricated to claim that target. The 3D and breadboard modules are not yet a complete physically accurate synchronized simulation.

## Developer build
Requirements: Node.js 20+, Rust stable, Windows 10/11.
```bash
npm install
npm test
npm run tauri -- build
```
