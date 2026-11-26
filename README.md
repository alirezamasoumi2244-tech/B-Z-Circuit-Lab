# B-Z Circuit Lab

**B-Z TEAM** · Windows desktop electronics design and simulation environment.

This repository contains the early application foundation. The complete simulator, million-part catalog, PCB tools, AI image import and interactive 3D lab are roadmap goals—not features claimed to be finished in this initial scaffold.

## Goals
- Windows desktop EXE using Tauri 2, React, TypeScript and Rust.
- Persian and English interface; offline-first circuit design.
- One shared circuit model for schematic, breadboard, PCB, simulation and 3D.
- Component catalog targeting 1,000,000+ records with support levels A (validated simulation), B (design assets), C (metadata/datasheet).
- ngspice for supported analog models; Arduino CLI and simavr only for supported AVR boards; separate digital simulation.
- Interactive Three.js 3D lab linked to circuit and simulation state.
- Optional online AI-assisted circuit image import and KiCad-compatible PCB interchange.

## Development
Requirements: Node.js 20+, Rust stable, Windows 10/11 for installer packaging.

```bash
npm install
npm run dev
```

Build the Windows desktop application with `npm run tauri -- build`.

See [architecture](docs/ARCHITECTURE.md) and [roadmap](docs/ROADMAP.md).
