import type { CircuitDocument, ComponentInstance } from "./circuit";

export type LogicBit = 0 | 1;
export type DigitalResult = {
  nets: Record<string, LogicBit>;
  gates: Array<{ reference: string; value: LogicBit }>;
  outputs: Array<{ reference: string; value: LogicBit | null }>;
};

const gateKinds = new Set(["logic_and","logic_or","logic_xor","logic_not","logic_nand","logic_nor"]);
function nodeFor(pinId:string,pinToNet:Map<string,string>){return pinToNet.get(pinId)??("pin:"+pinId);}
function bit(value:string|undefined):LogicBit{return ["1","high","true","on"].includes((value??"0").trim().toLowerCase())?1:0;}
function gateValue(kind:string,a:LogicBit,b?:LogicBit):LogicBit{
  switch(kind){
    case "logic_and":return (a===1&&b===1)?1:0;
    case "logic_or":return (a===1||b===1)?1:0;
    case "logic_xor":return a!==(b??0)?1:0;
    case "logic_not":return a===1?0:1;
    case "logic_nand":return (a===1&&b===1)?0:1;
    case "logic_nor":return (a===1||b===1)?0:1;
    default:throw new Error("Unsupported logic gate: "+kind);
  }
}
export function evaluateDigitalCircuit(doc:CircuitDocument):DigitalResult{
  const pinToNet=new Map<string,string>();
  for(const net of doc.nets)for(const pin of net.pinIds)pinToNet.set(pin,net.id);
  const values=new Map<string,LogicBit>();
  const assign=(node:string,value:LogicBit,source:string)=>{
    const previous=values.get(node);
    if(previous!==undefined&&previous!==value)throw new Error("چند خروجی دیجیتال ناسازگار به یک Net وصل شده‌اند: "+source);
    if(previous===undefined){values.set(node,value);return true;}
    return false;
  };
  const inputs=doc.components.filter(c=>c.partId==="logic_input");
  for(const input of inputs){
    if(!input.pins[0])throw new Error("پایه خروجی ورودی دیجیتال ناقص است: "+input.reference);
    assign(nodeFor(input.pins[0].id,pinToNet),bit(input.value),input.reference);
  }
  const gates=doc.components.filter(c=>gateKinds.has(c.partId));
  for(const gate of gates){
    const required=gate.partId==="logic_not"?2:3;
    if(gate.pins.length<required)throw new Error("پایه‌های گیت ناقص است: "+gate.reference);
  }
  let changed=true,pass=0;
  while(changed&&pass<=gates.length){
    changed=false;pass++;
    for(const gate of gates){
      const a=values.get(nodeFor(gate.pins[0].id,pinToNet));
      const b=gate.partId==="logic_not"?undefined:values.get(nodeFor(gate.pins[1].id,pinToNet));
      if(a===undefined||(gate.partId!=="logic_not"&&b===undefined))continue;
      const output=gateValue(gate.partId,a,b);
      changed=assign(nodeFor(gate.pins[gate.pins.length-1].id,pinToNet),output,gate.reference)||changed;
    }
  }
  if(changed)throw new Error("مدار دیجیتال حلقه یا بازخورد حل‌نشده دارد.");
  const gateResults=gates.map(gate=>({reference:gate.reference,value:values.get(nodeFor(gate.pins[gate.pins.length-1].id,pinToNet))??null}));
  const outputs=doc.components.filter(c=>c.partId==="logic_output").map((output:ComponentInstance)=>{
    const node=output.pins[0]?nodeFor(output.pins[0].id,pinToNet):"";
    return {reference:output.reference,value:values.get(node)??null};
  });
  return {nets:Object.fromEntries(values),gates:gateResults as Array<{reference:string;value:LogicBit}>,outputs};
}
