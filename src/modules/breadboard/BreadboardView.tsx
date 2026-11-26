import type { CircuitDocument, ComponentInstance } from "../../core/circuit";
import "./breadboard.css";

type HolePoint={x:number;y:number};
const pointFor=(component:ComponentInstance,pinIndex:number,index:number):HolePoint=>{
  const slot=index%11;
  const bank=Math.floor(index/11);
  const column=1+slot*2;
  const topRow=Math.max(0,4-bank);
  const bottomRow=Math.min(9,5+bank);
  const row=pinIndex===0?topRow:pinIndex===1?bottomRow:(pinIndex%2===0?topRow:bottomRow);
  return {x:76+column*35,y:118+row*32};
};
const netColors=["#ef727b","#62a6ff","#5bd6a5","#e6b65c","#b78bff","#55c8d8","#f09a55","#d78db5"];
export default function BreadboardView({circuit}:{circuit:CircuitDocument}){
  const placements=new Map<string,{component:ComponentInstance;points:HolePoint[]}>();
  const pinPoints=new Map<string,HolePoint>();
  circuit.components.forEach((component,index)=>{
    const points=component.pins.map((pin,pinIndex)=>pointFor(component,pinIndex,index));
    placements.set(component.id,{component,points});
    component.pins.forEach((pin,pinIndex)=>pinPoints.set(pin.id,points[pinIndex]));
  });
  const overflow=circuit.components.length>55?circuit.components.slice(55):[];
  const rows=Array.from({length:10},(_,i)=>i);
  const cols=Array.from({length:24},(_,i)=>i);
  return <section className="breadboard-panel">
    <div className="breadboard-title"><b>VIRTUAL BREADBOARD · AUTO PLACEMENT</b><span>{circuit.components.length-overflow.length} PLACED · {circuit.nets.length} NETS</span></div>
    <div className="breadboard">
      <div className="rail positive">+ POWER RAIL</div>
      <div className="rail negative">− GROUND RAIL</div>
      <div className="breadboard-stage">
        <svg className="breadboard-overlay" viewBox="0 0 1000 470" role="img" aria-label="Automatic component placement and circuit wiring">
          {circuit.nets.map((net,index)=>{
            const points=net.pinIds.map(id=>pinPoints.get(id)).filter((p):p is HolePoint=>Boolean(p));
            if(points.length<2)return null;
            return <g key={net.id} stroke={netColors[index%netColors.length]} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity=".9">
              {points.slice(1).map((p,i)=>{const first=points[0];const midY=(first.y+p.y)/2+(i%2===0?-12:12);return <polyline key={i} points={`${first.x},${first.y} ${first.x},${midY} ${p.x},${midY} ${p.x},${p.y}`}/>;})}
            </g>;
          })}
          {rows.map(row=>cols.map(col=><circle key={row+"-"+col} cx={76+col*35} cy={118+row*32} r="5" fill="#424b5b" stroke="#8b929d" strokeWidth="1"/>))}
          {circuit.components.slice(0,55).map((component,index)=>{
            const placement=placements.get(component.id)!;
            const first=placement.points[0]??{x:0,y:0};
            const second=placement.points[1]??{x:first.x,y:first.y};
            const mid=(first.y+second.y)/2;
            const color=component.partId==="resistor"?"#d6a34e":component.partId==="led"?"#35c98e":component.partId==="battery"?"#6097ef":component.partId==="switch"?"#aa80e8":"#8593a8";
            return <g key={component.id}>
              <rect x={first.x-23} y={mid-11} width="46" height="22" rx="6" fill={color} stroke="#f1f5f9" strokeWidth="1.5"/>
              <text x={first.x} y={mid+4} textAnchor="middle" fontSize="10" fontWeight="700" fill="#101827">{component.reference}</text>
              {placement.points.map((p,i)=><circle key={component.pins[i].id} cx={p.x} cy={p.y} r="6" fill={color} stroke="#f5f7fb" strokeWidth="2"/>)}
            </g>;
          })}
          {rows.map(row=><text key={row} x="42" y={122+row*32} fontSize="12" fill="#596273" textAnchor="middle">{String.fromCharCode(65+row)}</text>)}
          {cols.map(col=><text key={col} x={76+col*35} y="446" fontSize="10" fill="#596273" textAnchor="middle">{col+1}</text>)}
        </svg>
      </div>
    </div>
    {overflow.length>0&&<p className="breadboard-note">تعداد {overflow.length} قطعه از ظرفیت نمایشی فعلی بیشتر است؛ آن‌ها در این نما جانمایی نشده‌اند.</p>}
    <p className="breadboard-note">پایه‌های قطعات به‌صورت خودکار روی ردیف‌های بردبورد جانمایی شده‌اند و سیم‌های هر Net با رنگ جدا نمایش داده می‌شوند. تغییر این چیدمان هنوز از این نما پشتیبانی نمی‌شود.</p>
  </section>;
}
