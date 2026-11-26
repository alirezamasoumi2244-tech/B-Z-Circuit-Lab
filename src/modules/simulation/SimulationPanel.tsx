import { useState } from "react";
import type { CircuitDocument } from "../../core/circuit";
import { solveDcCircuit } from "../../core/dc-solver";
import { solveTransientCircuit, type TransientResult } from "../../core/transient-solver";
export default function SimulationPanel({circuit}:{circuit:CircuitDocument}){
 const [result,setResult]=useState<ReturnType<typeof solveDcCircuit>|null>(null);
 const [transient,setTransient]=useState<TransientResult|null>(null);
 const [error,setError]=useState("");
 const [duration,setDuration]=useState("1");
 const [step,setStep]=useState("0.01");
 const run=()=>{try{setResult(solveDcCircuit(circuit));setError("");}catch(e){setResult(null);setError(e instanceof Error?e.message:"خطای شبیه‌سازی");}};
 const runTransient=()=>{try{setTransient(solveTransientCircuit(circuit,Number(duration),Number(step)));setError("");}catch(e){setTransient(null);setError(e instanceof Error?e.message:"خطای تحلیل گذرا");}};
 return <div className="sim-panel"><div className="sim-card"><h2>DC Nodal Analysis</h2><p>حل شبکه مقاومتی DC در حالت پایدار؛ خازن در تحلیل DC به‌صورت مدار باز در نظر گرفته می‌شود.</p><button className="primary" onClick={run}>اجرای تحلیل DC</button>{error&&<p className="sim-error">{error}</p>}{result&&<><div className="sim-summary">منبع: {result.sourceVoltage.toFixed(2)} V · توان محاسبه‌شده: {result.totalPowerWatts.toFixed(4)} W</div><table className="readings"><thead><tr><th>قطعه</th><th>ولتاژ</th><th>جریان</th><th>توان</th></tr></thead><tbody>{result.resistors.map(r=><tr key={r.reference}><td>{r.reference}</td><td>{r.voltage.toFixed(3)} V</td><td>{(r.currentAmps*1000).toFixed(3)} mA</td><td>{(r.powerWatts*1000).toFixed(3)} mW</td></tr>)}</tbody></table></>}
 <div className="sim-divider"/><h2>Transient RC Analysis</h2><p>تحلیل گذرای مدارهای RC با روش Backward Euler؛ وضعیت اولیه خازن‌ها صفر ولت فرض می‌شود. مدت حداکثر ۶۰ ثانیه و تعداد گام‌ها حداکثر ۱۰٬۰۰۰ است.</p><div className="sim-time-controls"><label>مدت (ثانیه)<input type="number" min="0.001" max="60" step="any" value={duration} onChange={e=>setDuration(e.target.value)}/></label><label>گام زمانی (ثانیه)<input type="number" min="0.0001" step="any" value={step} onChange={e=>setStep(e.target.value)}/></label></div><button className="primary" onClick={runTransient}>اجرای تحلیل گذرا</button>{transient&&<><div className="sim-summary">مدت: {transient.durationSeconds.toFixed(3)} s · گام: {transient.stepSeconds.toPrecision(3)} s · نمونه‌ها: {transient.samples.length}</div><div className="sim-wave-list">{transient.samples.slice(-12).map((sample,i)=><div key={i}><span>{sample.timeSeconds.toFixed(3)} s</span><span>{Object.entries(sample.nodeVoltages).map(([node,v])=>node.slice(0,8)+": "+v.toFixed(3)+" V").join(" · ")}</span></div>)}</div></>}</div></div>;
}
