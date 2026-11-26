import type { CircuitDocument } from "./circuit";

export type ResistorReading = { reference: string; voltage: number; currentAmps: number; powerWatts: number };
export type DcResult = { nodeVoltages: Record<string, number>; resistors: ResistorReading[]; totalPowerWatts: number; sourceVoltage: number };

function gaussianSolve(a: number[][], b: number[]): number[] | null {
  const n=b.length;
  for(let col=0;col<n;col++){
    let pivot=col;
    for(let row=col+1;row<n;row++) if(Math.abs(a[row][col])>Math.abs(a[pivot][col])) pivot=row;
    if(Math.abs(a[pivot][col])<1e-12) return null;
    [a[col],a[pivot]]=[a[pivot],a[col]]; [b[col],b[pivot]]=[b[pivot],b[col]];
    const d=a[col][col]; for(let j=col;j<n;j++)a[col][j]/=d; b[col]/=d;
    for(let row=0;row<n;row++){if(row===col)continue;const f=a[row][col];if(!f)continue;for(let j=col;j<n;j++)a[row][j]-=f*a[col][j];b[row]-=f*b[col];}
  }
  return b;
}
function parseValue(v:string|undefined,fallback:number){const n=Number((v??"").replace(/[^0-9.eE+-]/g,""));return Number.isFinite(n)&&n>0?n:fallback;}

export function solveDcCircuit(doc:CircuitDocument):DcResult {
  const pinToNode=new Map<string,string>();
  for(const net of doc.nets) for(const pin of net.pinIds) pinToNode.set(pin,net.id);
  const nodeOf=(pinId:string)=>pinToNode.get(pinId)??("pin:"+pinId);
  const batteries=doc.components.filter(c=>c.partId==="battery");
  if(!batteries.length) throw new Error("مدار منبع تغذیه DC ندارد.");
  const source=batteries[0];if(source.pins.length<2)throw new Error("پایه‌های باتری ناقص است.");
  const positive=nodeOf(source.pins[0].id),negative=nodeOf(source.pins[1].id);
  if(positive===negative)throw new Error("دو سر باتری اتصال کوتاه شده‌اند.");
  const sourceVoltage=parseValue(source.value,5);
  const fixed=new Map<string,number>([[negative,0],[positive,sourceVoltage]]);
  for(const g of doc.components.filter(c=>c.partId==="ground")) if(g.pins[0])fixed.set(nodeOf(g.pins[0].id),0);
  const resistors=doc.components.filter(c=>c.partId==="resistor");
  if(!resistors.length)throw new Error("هیچ مقاومتی در مدار وجود ندارد.");
  const resistorData=resistors.map(c=>({component:c,a:nodeOf(c.pins[0]?.id??""),b:nodeOf(c.pins[1]?.id??""),r:parseValue(c.value,1000)}));
  const nodes=[...new Set(resistorData.flatMap(r=>[r.a,r.b]))];
  const unknown=nodes.filter(n=>!fixed.has(n)); const index=new Map(unknown.map((n,i)=>[n,i]));
  const matrix=unknown.map(()=>unknown.map(()=>0));const rhs=unknown.map(()=>0);
  for(const r of resistorData){
    const g=1/r.r,ia=index.get(r.a),ib=index.get(r.b);
    if(ia!==undefined){matrix[ia][ia]+=g;if(ib!==undefined)matrix[ia][ib]-=g;else rhs[ia]+=g*(fixed.get(r.b)??0);}
    if(ib!==undefined){matrix[ib][ib]+=g;if(ia!==undefined)matrix[ib][ia]-=g;else rhs[ib]+=g*(fixed.get(r.a)??0);}
  }
  const solved=gaussianSolve(matrix,rhs);
  if(unknown.length&&solved===null)throw new Error("مدار شناور یا مسیر بسته‌نشده است؛ اتصال‌ها و زمین را بررسی کن.");
  const volts=new Map(fixed);unknown.forEach((n,i)=>volts.set(n,solved![i]));
  const readings=resistorData.map(r=>{const v=(volts.get(r.a)??0)-(volts.get(r.b)??0),current=v/r.r;return{reference:r.component.reference,voltage:Math.abs(v),currentAmps:Math.abs(current),powerWatts:v*current};});
  return {nodeVoltages:Object.fromEntries(volts),resistors:readings,totalPowerWatts:readings.reduce((s,r)=>s+r.powerWatts,0),sourceVoltage};
}
