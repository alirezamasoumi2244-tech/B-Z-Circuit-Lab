# Engineering modules: current integration status

## SPICE
The app creates a basic netlist with resistors, capacitors and independent DC voltage sources from the current circuit and can call the native `ngspice -b` executable. Capacitors are represented in the generated netlist (for example, `100µF` becomes `100u`); install ngspice separately and put it on PATH. This is still a limited device set: inductors, semiconductor models, AC/transient analyses, probes and waveform plotting are not implemented. The separate DC nodal solver treats capacitors as open circuits at steady state.

## Digital logic
A local truth-table workbench currently evaluates AND, OR, XOR, NAND, NOR and NOT. Gate graph wiring, propagation delays, flip-flops and clocked simulation remain future work.

## Arduino
The native adapter compiles Uno R3 and Nano ATmega328P sketches using Arduino CLI and attempts to run the generated HEX with simavr. Install Arduino CLI, the Arduino AVR core and simavr separately. Hardware upload, serial monitor, peripherals and other MCU families are not implemented. Simulation output is bounded to a short run window.

## Image analysis
An optional OpenAI-compatible vision endpoint can be configured in the UI. API credentials remain in page memory and are not written into the repository or local storage. The result is text for human review; it is not automatically trusted as a correct circuit.

## PCB
The current export creates a KiCad-oriented XML netlist. It is not a PCB layout editor and does not generate routed Gerber files. Footprint assignment, placement, routing and DRC remain future work.

## Component library
A SQLite JSONL ingestion pipeline enforces per-record source and license metadata. The small UI list is only a demo. No million-part catalog is bundled.
