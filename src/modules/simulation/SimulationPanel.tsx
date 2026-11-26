import { useState } from "react";
import type { CircuitDocument } from "../../core/circuit";
import { solveDcCircuit } from "../../core/dc-solver";
export default function SimulationPanel({circuit}:{circuit:CircuitDocument}){
 const [result,setResult]=useState<ReturnType<typeof solveDcCircuit>|null>(null);const [error,setError]=useState("");
 const run=()=>{try{setResult(solveDcCircuit(circuit));setError("");}catch(e){setResult(null);setError(e instanceof Error?e.message:"خطای شبیه‌سازی");}};
 return <div className="sim-panel"><div className="sim-card"><h2>DC Nodal Analysis</h2><p>حل شبکه مقاومتی DC با روش گره‌ای (مدل ساده‌شده، بدون مدل کامل دیود و ترانزیستور).</p><button className="primary" onClick={run}>اجرای تحلیل DC</button>{error&&<p className="sim-error">{error}</p>}{result&&<><div className="sim-summary">منبع: {result.sourceVoltage.toFixed(2)} V · توان محاسبه‌شده: {result.totalPowerWatts.toFixed(4)} W</div><table className="readings"><thead><tr><th>قطعه</th><th>ولتاژ</th><th>جریان</th><th>توان</th></tr></thead><tbody>{result.resistors.map(r=><tr key={r.reference}><td>{r.reference}</td><td>{r.voltage.toFixed(3)} V</td><td>{(r.currentAmps*1000).toFixed(3)} mA</td><td>{(r.powerWatts*1000).toFixed(3)} mW</td></tr>)}</tbody></table></>}</div></div>;
}