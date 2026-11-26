import { describe, expect, it } from "vitest";
import { solveTransientCircuit } from "../src/core/transient-solver";
import type { CircuitDocument, ComponentInstance } from "../src/core/circuit";
const part=(id:string,partId:string,reference:string,value:string)=>({id,partId,reference,value,position:{x:0,y:0},rotation:0,pins:[{id:id+"-1",name:"1",number:"1"},{id:id+"-2",name:"2",number:"2"}],supportLevel:"A" as const});
const makeCircuit=():CircuitDocument=>{
 const source=part("V","battery","V1","5V"),resistor=part("R","resistor","R1","1kΩ"),capacitor=part("C","capacitor","C1","100µF");
 return{id:"rc",schemaVersion:1,name:"RC step response",components:[source,resistor,capacitor],nets:[
  {id:"GND",name:"GND",pinIds:[source.pins[1].id,capacitor.pins[1].id]},
  {id:"VIN",name:"VIN",pinIds:[source.pins[0].id,resistor.pins[0].id]},
  {id:"VC",name:"VC",pinIds:[resistor.pins[1].id,capacitor.pins[0].id]}
 ],createdAt:"2026-11-26",updatedAt:"2026-11-26"};
};
describe("RC transient solver",()=>{
 it("simulates capacitor charging with a backward-Euler time step",()=>{
  const result=solveTransientCircuit(makeCircuit(),1,0.001);
  const final=result.samples[result.samples.length-1];
  const node=Object.entries(final.nodeVoltages).find(([id])=>id!=="GND");
  expect(node).toBeDefined();
  expect(node![1]).toBeGreaterThan(4.9);
  expect(node![1]).toBeLessThan(5.01);
 });
 it("rejects an excessive number of time steps",()=>{
  expect(()=>solveTransientCircuit(makeCircuit(),10,0.0001)).toThrow(/۱۰۰۰۰/);
 });
});
