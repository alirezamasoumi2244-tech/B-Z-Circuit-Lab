import { describe, expect, it } from "vitest";
import { evaluateDigitalCircuit } from "../src/core/digital-solver";
import type { CircuitDocument, ComponentInstance, Net } from "../src/core/circuit";
const part=(id:string,partId:string,reference:string,value:string,pins:string[]):ComponentInstance=>({id,partId,reference,value,position:{x:0,y:0},rotation:0,pins:pins.map((name,i)=>({id:id+"-"+i,name,number:String(i+1)})),supportLevel:"B"});
const doc=(components:ComponentInstance[],groups:string[][]):CircuitDocument=>{const now="2026-11-26";return{id:"d",schemaVersion:1,name:"logic",components,nets:groups.map((pinIds,i)=>({id:"N"+i,name:"N"+i,pinIds} as Net)),createdAt:now,updatedAt:now};};
describe("connected digital logic",()=>{
 it("evaluates an AND gate and output from two inputs",()=>{
  const a=part("A","logic_input","A","1",["OUT"]),b=part("B","logic_input","B","1",["OUT"]),g=part("G","logic_and","G1","",["A","B","Y"]),o=part("O","logic_output","Y1","",["IN"]);
  const c=doc([a,b,g,o],[[a.pins[0].id,g.pins[0].id],[b.pins[0].id,g.pins[1].id],[g.pins[2].id,o.pins[0].id]]);
  const result=evaluateDigitalCircuit(c);
  expect(result.gates[0].value).toBe(1);expect(result.outputs[0].value).toBe(1);
 });
 it("updates the result when an input is LOW",()=>{
  const a=part("A","logic_input","A","0",["OUT"]),b=part("B","logic_input","B","1",["OUT"]),g=part("G","logic_or","G1","",["A","B","Y"]);
  const c=doc([a,b,g],[[a.pins[0].id,g.pins[0].id],[b.pins[0].id,g.pins[1].id]]);
  expect(evaluateDigitalCircuit(c).gates[0].value).toBe(1);
 });
 it("reports unknown for an unconnected gate input",()=>{
  const g=part("G","logic_not","NOT1","",["A","Y"]);
  expect(evaluateDigitalCircuit(doc([g],[])).gates[0].value).toBeNull();
 });
 it("rejects conflicting digital drivers on the same net",()=>{
  const a=part("A","logic_input","A","0",["OUT"]),b=part("B","logic_input","B","1",["OUT"]);
  expect(()=>evaluateDigitalCircuit(doc([a,b],[[a.pins[0].id,b.pins[0].id]]))).toThrow(/ناسازگار/);
 });
});
