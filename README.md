# B-Z Circuit Lab
**B-Z TEAM** · Windows desktop electronics design and simulation environment.

## Current alpha (v0.2.0)
- Tauri 2 desktop shell with Persian/English interface.
- Interactive starter schematic: add resistor, LED, DC battery, switch and ground; move parts; edit reference/value; connect pins; save locally.
- Three.js 3D component preview with orbit and zoom controls.
- Starter current estimate panel (not a full SPICE solver).
- GitHub Actions Windows installer build.

## Roadmap / not yet implemented
The million-part licensed catalog, full schematic net engine, synchronized breadboard, validated SPICE/digital simulation, Arduino execution, full 3D interaction, AI image recognition and PCB editor are not complete in this alpha. See [roadmap](docs/ROADMAP.md).

## Development
Node.js 20+, Rust stable, Windows 10/11.
```bash
npm install
npm run dev
```
Build: `npm run tauri -- build`.
