import { useMemo } from "react";
import type { CircuitDocument } from "../../core/circuit";
import { evaluateDigitalCircuit } from "../../core/digital-solver";
import "./digital.css";

export default function DigitalPanel({circuit,onSetPartValue}:{circuit:CircuitDocument;onSetPartValue:(id:string,value:string)=>void}){
 const inputs=circuit.components.filter(c=>c.partId==="logic_input");
 const gates=circuit.components.filter(c=>c.partId.startsWith("logic_")&&!["logic_input","logic_output"].includes(c.partId));
 const outputs=circuit.components.filter(c=>c.partId==="logic_output");
 const evaluation=useMemo(()=>{try{return{result:evaluateDigitalCircuit(circuit),error:""}}catch(e){return{result:null,error:e instanceof Error?e.message:String(e)}}},[circuit]);
 return <section className="digital-panel">
  <div className="digital-header"><div><small>B-Z DIGITAL SIMULATOR</small><h2>شبیه‌سازی مدار منطقی متصل</h2></div><span>{inputs.length} INPUTS · {gates.length} GATES · {outputs.length} OUTPUTS</span></div>
  <div className="digital-card"><h3>ورودی‌های دیجیتال</h3><p>برای تغییر سطح منطقی هر ورودی کلیک کن؛ نتیجه گیت‌های متصل بلافاصله محاسبه می‌شود.</p>
   {inputs.length===0?<small>از بخش شماتیک، قطعه «ورودی دیجیتال» اضافه کن.</small>:<div className="digital-items">{inputs.map(input=>{const high=["1","high","true","on"].includes((input.value||"0").toLowerCase());return <button key={input.id} className={"digital-bit "+(high?"high":"low")} onClick={()=>onSetPartValue(input.id,high?"0":"1")}><b>{input.reference}</b><strong>{high?"1 · HIGH":"0 · LOW"}</strong><small>برای تغییر وضعیت کلیک کن</small></button>})}</div>}
  </div>
  <div className="digital-grid">
   <div className="digital-card"><h3>خروجی گیت‌ها</h3>{gates.length===0?<small>هنوز گیتی به شماتیک اضافه نشده است.</small>:<div className="digital-list">{gates.map(gate=>{const value=evaluation.result?.gates.find(x=>x.reference===gate.reference)?.value;return <div key={gate.id}><b>{gate.reference}</b><span>{gate.partId.replace("logic_","").toUpperCase()}</span><strong className={value===1?"text-high":value===0?"text-low":""}>{value===undefined||value===null?"UNKNOWN":value===1?"1 · HIGH":"0 · LOW"}</strong></div>})}</div>}</div>
   <div className="digital-card"><h3>خروجی‌های مدار</h3>{outputs.length===0?<small>برای مشاهده نتیجه، قطعه «خروجی دیجیتال» اضافه کن.</small>:<div className="digital-list">{outputs.map(output=>{const value=evaluation.result?.outputs.find(x=>x.reference===output.reference)?.value;return <div key={output.id}><b>{output.reference}</b><strong className={value===1?"text-high":value===0?"text-low":""}>{value===null||value===undefined?"UNKNOWN":value===1?"1 · HIGH":"0 · LOW"}</strong></div>})}</div>}</div>
  </div>
  {evaluation.error&&<div className="digital-error">{evaluation.error}</div>}
  <div className="digital-note">پشتیبانی فعلی: ورودی، خروجی و گیت‌های AND / OR / XOR / NOT / NAND / NOR در شبکه‌های ترکیبی بدون حلقه. فلیپ‌فلاپ، کلاک و تأخیر انتشار هنوز اضافه نشده‌اند.</div>
 </section>;
}
