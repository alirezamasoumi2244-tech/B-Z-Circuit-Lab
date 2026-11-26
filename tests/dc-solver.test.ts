import { describe, expect, it } from "vitest";
import { parseElectricalValue, solveDcCircuit } from "../src/core/dc-solver";
import type { CircuitDocument, ComponentInstance, Net } from "../src/core/circuit";

function part(id:string,partId:string,reference:string,value:string,pinNames:string[]):ComponentInstance{
  return {id,partId,reference,value,position:{x:0,y:0},rotation:0,pins:pinNames.map((name,i)=>({id:`${id}-p${i+1}`,name,number:String(i+1)})),supportLevel:"A"};
}
function doc(components:ComponentInstance[],groups:string[][]):CircuitDocument{
  const now="2026-11-26T00:00:00.000Z";
  const nets:Net[]=groups.map((pinIds,i)=>({id:`N${i+1}`,name:`N${i+1}`,pinIds}));
  return {id:"test",schemaVersion:1,name:"test",components,nets,createdAt:now,updatedAt:now};
}
describe("electrical value parser",()=>{
  it.each([["1kΩ",1000],["4.7k",4700],["2.2MΩ",2_200_000],["5V",5],["100",100],["10m",0.01]])("%s parses", (input,expected)=>{
    expect(parseElectricalValue(input,99)).toBeCloseTo(expected as number,8);
  });
});
describe("DC modified nodal analysis",()=>{
  it("solves a 5 V source and 1 kΩ load",()=>{
    const v=part("V1","battery","V1","5V",["+","-"]);
    const r=part("R1","resistor","R1","1kΩ",["1","2"]);
    const c=doc([v,r],[[v.pins[0].id,r.pins[0].id],[v.pins[1].id,r.pins[1].id]]);
    const result=solveDcCircuit(c);
    expect(result.resistors[0].currentAmps).toBeCloseTo(0.005,8);
    expect(result.resistors[0].voltage).toBeCloseTo(5,8);
    expect(result.resistors[0].powerWatts).toBeCloseTo(0.025,8);
  });
  it("solves two series resistors",()=>{
    const v=part("V1","battery","V1","5",["+","-"]);
    const r1=part("R1","resistor","R1","1k",["1","2"]);
    const r2=part("R2","resistor","R2","1k",["1","2"]);
    const c=doc([v,r1,r2],[[v.pins[0].id,r1.pins[0].id],[r1.pins[1].id,r2.pins[0].id],[r2.pins[1].id,v.pins[1].id]]);
    const result=solveDcCircuit(c);
    expect(result.resistors[0].currentAmps).toBeCloseTo(0.0025,8);
    expect(result.resistors[1].currentAmps).toBeCloseTo(0.0025,8);
    expect(result.resistors[0].voltage).toBeCloseTo(2.5,8);
  });
  it("solves parallel loads",()=>{
    const v=part("V1","battery","V1","5",["+","-"]);
    const r1=part("R1","resistor","R1","1k",["1","2"]);
    const r2=part("R2","resistor","R2","1k",["1","2"]);
    const c=doc([v,r1,r2],[[v.pins[0].id,r1.pins[0].id,r2.pins[0].id],[v.pins[1].id,r1.pins[1].id,r2.pins[1].id]]);
    const result=solveDcCircuit(c);
    expect(result.resistors[0].currentAmps).toBeCloseTo(0.005,8);
    expect(result.resistors[1].currentAmps).toBeCloseTo(0.005,8);
  });
  it("models a closed switch as a short connection",()=>{
    const v=part("V1","battery","V1","5",["+","-"]);
    const sw=part("S1","switch","S1","Closed",["1","2"]);
    const r=part("R1","resistor","R1","1k",["1","2"]);
    const c=doc([v,sw,r],[[v.pins[0].id,sw.pins[0].id],[sw.pins[1].id,r.pins[0].id],[r.pins[1].id,v.pins[1].id]]);
    expect(solveDcCircuit(c).resistors[0].currentAmps).toBeCloseTo(0.005,8);
  });
  it("rejects a shorted ideal voltage source",()=>{
    const v=part("V1","battery","V1","5",["+","-"]);
    const c=doc([v],[[v.pins[0].id,v.pins[1].id]]);
    expect(()=>solveDcCircuit(c)).toThrow(/اتصال کوتاه/);
  });
});
