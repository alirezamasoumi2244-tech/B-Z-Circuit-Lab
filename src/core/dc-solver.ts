import type { CircuitDocument } from "./circuit";

export type ResistorReading = { reference: string; voltage: number; currentAmps: number; powerWatts: number };
export type DcResult = { nodeVoltages: Record<string, number>; resistors: ResistorReading[]; totalPowerWatts: number; sourceVoltage: number };

function gaussianSolve(a: number[][], b: number[]): number[] | null {
  const n = b.length;
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let row = col + 1; row < n; row++) if (Math.abs(a[row][col]) > Math.abs(a[pivot][col])) pivot = row;
    if (Math.abs(a[pivot][col]) < 1e-12) return null;
    [a[col], a[pivot]] = [a[pivot], a[col]];
    [b[col], b[pivot]] = [b[pivot], b[col]];
    const d = a[col][col];
    for (let j = col; j < n; j++) a[col][j] /= d;
    b[col] /= d;
    for (let row = 0; row < n; row++) {
      if (row === col) continue;
      const factor = a[row][col];
      if (!factor) continue;
      for (let j = col; j < n; j++) a[row][j] -= factor * a[col][j];
      b[row] -= factor * b[col];
    }
  }
  return b;
}

export function parseElectricalValue(value: string | undefined, fallback: number): number {
  if (!value?.trim()) return fallback;
  const raw = value.trim().replace(/,/g, ".").replace(/Ω|ohms?|v(?:olts?)?|farads?|henries?/gi, "").replace(/\s/g, "");
  const match = raw.match(/^([0-9]*\.?[0-9]+)(p|n|u|µ|m|k|K|meg|M|G)?$/i);
  if (!match) return fallback;
  const suffix = match[2] ?? "";
  const scale: Record<string, number> = { p: 1e-12, n: 1e-9, u: 1e-6, "µ": 1e-6, m: 1e-3, k: 1e3, K: 1e3, meg: 1e6, M: 1e6, G: 1e9, "": 1 };
  const result = Number(match[1]) * (scale[suffix] ?? 1);
  return Number.isFinite(result) && result > 0 ? result : fallback;
}

class DisjointSet {
  private parent = new Map<string, string>();
  find(x: string): string {
    const p = this.parent.get(x);
    if (!p) { this.parent.set(x, x); return x; }
    if (p === x) return x;
    const root = this.find(p);
    this.parent.set(x, root);
    return root;
  }
  union(a: string, b: string) {
    const ra = this.find(a), rb = this.find(b);
    if (ra !== rb) this.parent.set(rb, ra);
  }
}

export function solveDcCircuit(doc: CircuitDocument): DcResult {
  const dsu = new DisjointSet();
  const allPins = doc.components.flatMap(c => c.pins.map(p => p.id));
  for (const pin of allPins) dsu.find(pin);
  for (const net of doc.nets) for (let i = 1; i < net.pinIds.length; i++) dsu.union(net.pinIds[0], net.pinIds[i]);

  const closedSwitches = doc.components.filter(c => c.partId === "switch" && ["closed", "on", "1", "connected"].includes((c.value ?? "").trim().toLowerCase()));
  for (const sw of closedSwitches) {
    if (sw.pins.length < 2) throw new Error(`کلید ${sw.reference} پایه کافی ندارد.`);
    dsu.union(sw.pins[0].id, sw.pins[1].id);
  }

  if (doc.components.some(c => c.partId === "led")) throw new Error("مدل غیرخطی LED هنوز در حل‌گر DC فعال نیست؛ برای تحلیل دقیق، از موتور SPICE استفاده کن.");
  const sources = doc.components.filter(c => c.partId === "battery");
  if (!sources.length) throw new Error("مدار منبع تغذیه DC ندارد.");
  for (const source of sources) if (source.pins.length < 2) throw new Error(`پایه‌های منبع ${source.reference} ناقص است.`);

  const sourceData = sources.map(c => ({ component: c, p: dsu.find(c.pins[0].id), n: dsu.find(c.pins[1].id), v: parseElectricalValue(c.value, 5) }));
  for (const source of sourceData) if (source.p === source.n) throw new Error(`منبع ${source.component.reference} اتصال کوتاه شده است.`);
  const grounds = doc.components.filter(c => c.partId === "ground" && c.pins[0]);
  const reference = dsu.find(grounds[0]?.pins[0].id ?? sources[0].pins[1].id);
  const resistors = doc.components.filter(c => c.partId === "resistor");
  if (!resistors.length) throw new Error("هیچ مقاومتی در مدار وجود ندارد.");

  const resistorData = resistors.map(c => {
    if (c.pins.length < 2) throw new Error(`پایه‌های مقاومت ${c.reference} ناقص است.`);
    return { component: c, a: dsu.find(c.pins[0].id), b: dsu.find(c.pins[1].id), r: parseElectricalValue(c.value, 1000) };
  });
  const nodeSet = new Set<string>();
  for (const r of resistorData) { nodeSet.add(r.a); nodeSet.add(r.b); }
  for (const s of sourceData) { nodeSet.add(s.p); nodeSet.add(s.n); }
  const nodes = [...nodeSet].filter(n => n !== reference);
  const nodeIndex = new Map(nodes.map((n, i) => [n, i]));
  const sourceOffset = nodes.length;
  const size = nodes.length + sourceData.length;
  const matrix = Array.from({ length: size }, () => Array(size).fill(0) as number[]);
  const rhs = Array(size).fill(0) as number[];

  for (const r of resistorData) {
    const conductance = 1 / r.r;
    const ia = nodeIndex.get(r.a), ib = nodeIndex.get(r.b);
    if (ia !== undefined) { matrix[ia][ia] += conductance; if (ib !== undefined) matrix[ia][ib] -= conductance; }
    if (ib !== undefined) { matrix[ib][ib] += conductance; if (ia !== undefined) matrix[ib][ia] -= conductance; }
  }
  sourceData.forEach((s, i) => {
    const row = sourceOffset + i, ip = nodeIndex.get(s.p), inn = nodeIndex.get(s.n);
    if (ip !== undefined) { matrix[ip][row] += 1; matrix[row][ip] += 1; }
    if (inn !== undefined) { matrix[inn][row] -= 1; matrix[row][inn] -= 1; }
    rhs[row] = s.v;
  });

  const solved = gaussianSolve(matrix, rhs);
  if (!solved) throw new Error("مدار شناور، مسیر باز یا منبع‌های ناسازگار است؛ اتصال‌ها و زمین را بررسی کن.");
  const volts = new Map<string, number>([[reference, 0]]);
  nodes.forEach((node, i) => volts.set(node, solved[i]));
  const readings = resistorData.map(r => {
    const voltage = (volts.get(r.a) ?? 0) - (volts.get(r.b) ?? 0);
    const current = voltage / r.r;
    return { reference: r.component.reference, voltage: Math.abs(voltage), currentAmps: Math.abs(current), powerWatts: voltage * current };
  });
  return {
    nodeVoltages: Object.fromEntries(volts),
    resistors: readings,
    totalPowerWatts: readings.reduce((sum, r) => sum + r.powerWatts, 0),
    sourceVoltage: sourceData[0].v
  };
}
