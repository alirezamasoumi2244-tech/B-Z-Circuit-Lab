import "./scene.css";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { ComponentInstance } from "../../core/circuit";
export default function Scene3D({components}:{components:ComponentInstance[]}){
 const host=useRef<HTMLDivElement>(null);
 useEffect(()=>{
  const root=host.current;if(!root)return;
  const scene=new THREE.Scene();scene.background=new THREE.Color("#0a1220");
  const camera=new THREE.PerspectiveCamera(45,root.clientWidth/root.clientHeight,.1,1000);camera.position.set(7,7,10);
  const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setSize(root.clientWidth,root.clientHeight);root.appendChild(renderer.domElement);
  scene.add(new THREE.AmbientLight(0xffffff,1.5));const light=new THREE.DirectionalLight(0xffffff,2);light.position.set(5,10,7);scene.add(light);
  const grid=new THREE.GridHelper(16,32,"#344764","#1d2b40");scene.add(grid);
  const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;
  const group=new THREE.Group();scene.add(group);
  const colors:Record<string,number>={resistor:0xd6a34e,led:0x3bd69b,battery:0x649dff,switch:0xb18aff,ground:0x9aa9bc};
  components.forEach((part,i)=>{const color=colors[part.partId]??0x8daaff;const x=(part.position.x-260)/70,z=(part.position.y-180)/70;
   const body=new THREE.Mesh(new THREE.BoxGeometry(part.partId==="resistor"?.9:1.1,.28,.48),new THREE.MeshStandardMaterial({color,metalness:.2,roughness:.45}));body.position.set(x,.35,z);body.userData={reference:part.reference,value:part.value};group.add(body);
   const label=new THREE.Mesh(new THREE.SphereGeometry(.09,12,8),new THREE.MeshStandardMaterial({color:0xffffff}));label.position.set(x,.6,z);group.add(label);
   const pinMat=new THREE.MeshStandardMaterial({color:0xc3ccd9,metalness:.8,roughness:.2});[-.48,.48].forEach(dx=>{const pin=new THREE.Mesh(new THREE.CylinderGeometry(.035,.035,.42,8),pinMat);pin.position.set(x+dx,.12,z);group.add(pin);});
  });
  let frame=0;const animate=()=>{frame=requestAnimationFrame(animate);controls.update();renderer.render(scene,camera)};animate();
  const resize=()=>{if(!root.clientWidth||!root.clientHeight)return;camera.aspect=root.clientWidth/root.clientHeight;camera.updateProjectionMatrix();renderer.setSize(root.clientWidth,root.clientHeight)};const observer=new ResizeObserver(resize);observer.observe(root);
  return()=>{cancelAnimationFrame(frame);observer.disconnect();controls.dispose();renderer.dispose();root.removeChild(renderer.domElement);scene.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.dispose();const m=o.material;if(Array.isArray(m))m.forEach(x=>x.dispose());else m.dispose()}})};
 },[components]);
 return <div className="scene-wrap"><div className="scene-label">3D CIRCUIT VIEW · DRAG TO ORBIT · SCROLL TO ZOOM</div><div ref={host} className="scene-host"/><div className="scene-count">{components.length} 3D COMPONENTS</div></div>;
}