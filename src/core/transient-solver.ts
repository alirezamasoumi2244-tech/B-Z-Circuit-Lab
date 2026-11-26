import type { CircuitDocument } from "./circuit";
import { parseElectricalValue } from "./dc-solver";

export type TransientSample = { timeSeconds: number; nodeVoltages: Record<string, number> };
export type TransientResult = { samples: TransientSample[]; stepSeconds: number; durationSeconds: number };

function solveLinear(matrix:number[][],rhs:number[]):number[]|null{
 const n=rhs.length;
 for(let col=0;col<n;col++){
  let pivot=col;
  for(let row=col+1;row<n;row++)if(Math.abs(matrix[row][col])>Math.abs(matrix[pivot][col]))pivot=row;
  if(Math.abs(matrix[pivot][col])<1e-14)return null;
  [matrix[col],matrix[pivot]]=[matrix[pivot],matrix[col]];
  [rhs[col],rhs[pivot]]=[rhs[pivot],rhs[col]];
  const divisor=matrix[col][col];
  for(let j=col;j<n;j++)matrix[col][j]/=divisor;
  rhs[col]/=divisor;
  for(let row=0;row<n;row++){
   if(row===col)continue;
   const factor=matrix[row][col];
   if(factor===0)continue;
   for(let j=col;j<n;j++)matrix[row][j]-=factor*matrix[col][j];
   rhs[row]-=factor*rhs[col];
  }
 }
 return rhs;
}
class DisjointSet{
 private parent=new Map<string,string>();
 find(x:string):string{const p=this.parent.get(x);if(!p){this.parent.set(x,x);return x;}if(p===x)return x;const root=this.find(p);this.parent.set(x,root);return root;}
 union(a:string,b:string){const x=this.find(a),y=this.find(b);if(x!==y)this.parent.set(y,x);}
}
export function solveTransientCircuit(doc:CircuitDocument,durationSeconds:number,stepSeconds:number):TransientResult{
 if(!Number.isFinite(durationSeconds)||durationSeconds<=0||durationSeconds>60)throw new Error("مدت تحلیل باید بین صفر تا ۶۰ ثانیه باشد.");
 if(!Number.isFinite(stepSeconds)||stepSeconds<=0||stepSeconds>durationSeconds)throw new Error("گام زمانی نامعتبر است.");
 const count=Math.ceil(durationSeconds/stepSeconds);
 if(count>10000)throw new Error("تعداد گام‌ها بیش از ۱۰۰۰۰ است؛ گام زمانی را بزرگ‌تر کن.");
 const dsu=new DisjointSet();
 for(const c of doc.components)for(const p of c.pins)dsu.find(p.id);
 for(const net of doc.nets)for(let i=1;i<net.pinIds.length;i++)dsu.union(net.pinIds[0],net.pinIds[i]);
 for(const sw of doc.components.filter(c=>c.partId==="switch"&&["closed","on","1","connected"].includes((c.value??"").trim().toLowerCase()))){
  if(sw.pins.length<2)throw new Error("پایه‌های کلید ناقص است: "+sw.reference);
  dsu.union(sw.pins[0].id,sw.pins[1].id);
 }
 const sources=doc.components.filter(c=>c.partId==="battery").map(c=>{
  if(c.pins.length<2)throw new Error("پایه‌های منبع ناقص است: "+c.reference);
  return{reference:c.reference,p:dsu.find(c.pins[0].id),n:dsu.find(c.pins[1].id),voltage:parseElectricalValue(c.value,5)};
 });
 if(!sources.length)throw new Error("مدار منبع DC ندارد.");
 const resistors=doc.components.filter(c=>c.partId==="resistor").map(c=>{
  if(c.pins.length<2)throw new Error("پایه‌های مقاومت ناقص است: "+c.reference);
  return{reference:c.reference,a:dsu.find(c.pins[0].id),b:dsu.find(c.pins[1].id),ohms:parseElectricalValue(c.value,1000)};
 });
 const capacitors=doc.components.filter(c=>c.partId==="capacitor").map(c=>{
  if(c.pins.length<2)throw new Error("پایه‌های خازن ناقص است: "+c.reference);
  return{reference:c.reference,a:dsu.find(c.pins[0].id),b:dsu.find(c.pins[1].id),farads:parseElectricalValue(c.value,100e-6)};
 });
 if(!resistors.length||!capacitors.length)throw new Error("برای تحلیل گذرای RC حداقل یک مقاومت و یک خازن لازم است.");
 const ground=doc.components.find(c=>c.partId==="ground"&&c.pins[0]);
 const reference=dsu.find(ground?.pins[0].id??sources[0].n);
 const nodeSet=new Set<string>();
 for(const x of [...resistors,...capacitors]){nodeSet.add(x.a);nodeSet.add(x.b);}
 for(const x of sources){nodeSet.add(x.p);nodeSet.add(x.n);}
 const nodes=[...nodeSet].filter(x=>x!==reference);
 const index=new Map(nodes.map((x,i)=>[x,i]));
 const sourceOffset=nodes.length,size=nodes.length+sources.length;
 const voltageAt=new Map<string,number>([[reference,0]]);
 const previousCapVoltage=capacitors.map(()=>0);
 const samples:TransientSample[]=[];
 const actualStep=durationSeconds/count;
 for(let step=1;step<=count;step++){
  const matrix=Array.from({length:size},()=>Array(size).fill(0) as number[]);
  const rhs=Array(size).fill(0) as number[];
  const stampConductance=(a:string,b:string,g:number)=>{
   const ia=index.get(a),ib=index.get(b);
   if(ia!==undefined){matrix[ia][ia]+=g;if(ib!==undefined)matrix[ia][ib]-=g;}
   if(ib!==undefined){matrix[ib][ib]+=g;if(ia!==undefined)matrix[ib][ia]-=g;}
  };
  for(const resistor of resistors)stampConductance(resistor.a,resistor.b,1/resistor.ohms);
  capacitors.forEach((capacitor,i)=>{
   const g=capacitor.farads/actualStep;
   stampConductance(capacitor.a,capacitor.b,g);
   const equivalent=g*previousCapVoltage[i];
   const ia=index.get(capacitor.a),ib=index.get(capacitor.b);
   if(ia!==undefined)rhs[ia]+=equivalent;
   if(ib!==undefined)rhs[ib]-=equivalent;
  });
  sources.forEach((source,i)=>{
   const row=sourceOffset+i,ip=index.get(source.p),inn=index.get(source.n);
   if(ip!==undefined){matrix[ip][row]+=1;matrix[row][ip]+=1;}
   if(inn!==undefined){matrix[inn][row]-=1;matrix[row][inn]-=1;}
   rhs[row]=source.voltage;
  });
  const solved=solveLinear(matrix,rhs);
  if(!solved)throw new Error("مدار RC شناور یا فاقد مسیر مرجع است؛ زمین و اتصال‌ها را بررسی کن.");
  voltageAt.clear();voltageAt.set(reference,0);
  nodes.forEach((node,i)=>voltageAt.set(node,solved[i]));
  capacitors.forEach((capacitor,i)=>{previousCapVoltage[i]=(voltageAt.get(capacitor.a)??0)-(voltageAt.get(capacitor.b)??0);});
  if(step===1||step===count||step%Math.max(1,Math.floor(count/200))===0){
   samples.push({timeSeconds:step*actualStep,nodeVoltages:Object.fromEntries(voltageAt)});
  }
 }
 return{samples,stepSeconds:actualStep,durationSeconds};
}
