import "./scene.css";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { CircuitDocument } from "../../core/circuit";

type Props={circuit:CircuitDocument;onPartValueChange?:(id:string,value:string)=>void};
export default function Scene3D({circuit,onPartValueChange}:Props){
 const host=useRef<HTMLDivElement>(null);
 const updateRef=useRef(onPartValueChange);
 updateRef.current=onPartValueChange;
 useEffect(()=>{
  const root=host.current;if(!root)return;
  const scene=new THREE.Scene();scene.background=new THREE.Color("#0a1220");
  const camera=new THREE.PerspectiveCamera(45,root.clientWidth/Math.max(root.clientHeight,1),.1,1000);camera.position.set(7,8,11);
  const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));renderer.setSize(root.clientWidth,root.clientHeight);root.appendChild(renderer.domElement);
  scene.add(new THREE.AmbientLight(0xffffff,1.35));const light=new THREE.DirectionalLight(0xffffff,2.2);light.position.set(5,10,7);scene.add(light);
  const board=new THREE.Mesh(new THREE.BoxGeometry(16,.28,11),new THREE.MeshStandardMaterial({color:0x1a704f,roughness:.82}));board.position.y=-.18;scene.add(board);
  const grid=new THREE.GridHelper(16,32,0x76b9a1,0x2e8065);grid.position.y=-.025;scene.add(grid);
  const holeGeometry=new THREE.CylinderGeometry(.035,.035,.025,8);const holeMaterial=new THREE.MeshStandardMaterial({color:0x142c27,metalness:.3});
  for(let row=0;row<10;row++)for(let col=0;col<24;col++){const hole=new THREE.Mesh(holeGeometry,holeMaterial);hole.position.set(-7.5+col*.65,.0,-4.1+row*.85+(row>=5?.55:0));scene.add(hole);}
  const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.target.set(0,.1,0);controls.minDistance=4;controls.maxDistance=28;
  const group=new THREE.Group();scene.add(group);
  const positions=new Map<string,THREE.Vector3>();
  const clickable:THREE.Object3D[]=[];
  const partMeshes=new Map<string,THREE.Object3D>();
  const colors:Record<string,number>={resistor:0xd6a34e,led:0x3bd69b,battery:0x649dff,switch:0xb18aff,ground:0x9aa9bc};
  circuit.components.forEach((part,index)=>{
   const x=(part.position.x-260)/70,z=(part.position.y-180)/70,color=colors[part.partId]??0x8daaff;
   const material=new THREE.MeshStandardMaterial({color,metalness:.22,roughness:.42});
   const componentGroup=new THREE.Group();componentGroup.position.set(x,.35,z);componentGroup.userData={componentId:part.id,partId:part.partId,reference:part.reference};
   const add=(mesh:THREE.Mesh)=>{mesh.userData={componentId:part.id,partId:part.partId,reference:part.reference};componentGroup.add(mesh);clickable.push(mesh);};
   if(part.partId==="resistor"){
    const body=new THREE.Mesh(new THREE.CylinderGeometry(.16,.16,.82,16),material);body.rotation.z=Math.PI/2;add(body);
    const leadMat=new THREE.MeshStandardMaterial({color:0xc7d0db,metalness:.8,roughness:.22});
    [-.62,.62].forEach(dx=>{const lead=new THREE.Mesh(new THREE.CylinderGeometry(.035,.035,.48,8),leadMat);lead.rotation.z=Math.PI/2;lead.position.x=dx;add(lead);});
   }else if(part.partId==="led"){
    const stem=new THREE.Mesh(new THREE.CylinderGeometry(.23,.2,.38,16),material);add(stem);
    const dome=new THREE.Mesh(new THREE.SphereGeometry(.2,16,12,0,Math.PI*2,0,Math.PI/2),new THREE.MeshStandardMaterial({color:part.value?.toLowerCase()==="on"?0x7affb9:color,emissive:part.value?.toLowerCase()==="on"?0x18a85b:0x000000,emissiveIntensity:1.3}));dome.position.y=.22;add(dome);
   }else if(part.partId==="battery"){
    const body=new THREE.Mesh(new THREE.CylinderGeometry(.25,.25,.9,20),material);body.rotation.z=Math.PI/2;add(body);
    const terminalMat=new THREE.MeshStandardMaterial({color:0xdce4ed,metalness:.9});
    [-.58,.58].forEach(dx=>{const terminal=new THREE.Mesh(new THREE.CylinderGeometry(.07,.07,.18,12),terminalMat);terminal.rotation.z=Math.PI/2;terminal.position.x=dx;add(terminal);});
   }else if(part.partId==="switch"){
    const base=new THREE.Mesh(new THREE.BoxGeometry(.85,.18,.42),new THREE.MeshStandardMaterial({color:0x3e4a61}));add(base);
    const lever=new THREE.Mesh(new THREE.CylinderGeometry(.045,.055,.58,10),new THREE.MeshStandardMaterial({color:0xe4e9f2,metalness:.7}));lever.position.set(0,.3,0);lever.rotation.z=(part.value?.toLowerCase()==="closed"?-.25:.25);add(lever);
   }else if(part.partId.startsWith("logic_")){
    const body=new THREE.Mesh(new THREE.BoxGeometry(.82,.3,.72),new THREE.MeshStandardMaterial({color:0x7353a8,metalness:.08,roughness:.55}));add(body);
   }else{
    const bar=new THREE.Mesh(new THREE.BoxGeometry(.8,.07,.08),material);bar.position.y=.1;add(bar);
    const foot=new THREE.Mesh(new THREE.BoxGeometry(.55,.07,.08),material);foot.position.y=-.02;add(foot);
   }
   group.add(componentGroup);partMeshes.set(part.id,componentGroup);
   part.pins.forEach((pin,pinIndex)=>{let px=x,pz=z;if(part.pins.length>=3){px=x+(pinIndex===part.pins.length-1?.55:-.55);pz=z+(pinIndex===0?-.22:pinIndex===1?.22:0);}else if(part.pins.length===2){px=x+(pinIndex===0?-.55:.55);}positions.set(pin.id,new THREE.Vector3(px,.12,pz));});
  });
  const wireMaterials=[0xef727b,0x62a6ff,0x5bd6a5,0xe6b65c,0xb78bff,0x55c8d8,0xf09a55];
  circuit.nets.forEach((net,index)=>{const points=net.pinIds.map(id=>positions.get(id)).filter((p):p is THREE.Vector3=>Boolean(p));if(points.length<2)return;for(let i=1;i<points.length;i++){const geometry=new THREE.BufferGeometry().setFromPoints([points[0],new THREE.Vector3(points[0].x,.2,points[0].z),new THREE.Vector3(points[i].x,.2,points[i].z),points[i]]);const line=new THREE.Line(geometry,new THREE.LineBasicMaterial({color:wireMaterials[index%wireMaterials.length],linewidth:3}));group.add(line);}});
  const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();
  const onPointerDown=(event:PointerEvent)=>{const rect=renderer.domElement.getBoundingClientRect();pointer.x=((event.clientX-rect.left)/rect.width)*2-1;pointer.y=-((event.clientY-rect.top)/rect.height)*2+1;raycaster.setFromCamera(pointer,camera);const hit=raycaster.intersectObjects(clickable,false)[0];if(!hit)return;const data=hit.object.userData as {componentId?:string;partId?:string;reference?:string};if(!data.componentId)return;const current=circuit.components.find(c=>c.id===data.componentId);if(!current)return;if(data.partId==="switch")updateRef.current?.(current.id,(current.value??"Open").toLowerCase()==="closed"?"Open":"Closed");else if(data.partId==="led")updateRef.current?.(current.id,(current.value??"Off").toLowerCase()==="on"?"Off":"On");else if(data.partId==="logic_input")updateRef.current?.(current.id,(current.value??"0")==="1"?"0":"1");};
  renderer.domElement.addEventListener("pointerdown",onPointerDown);
  let frame=0;const animate=()=>{frame=requestAnimationFrame(animate);controls.update();renderer.render(scene,camera)};animate();
  const resize=()=>{if(!root.clientWidth||!root.clientHeight)return;camera.aspect=root.clientWidth/root.clientHeight;camera.updateProjectionMatrix();renderer.setSize(root.clientWidth,root.clientHeight)};const observer=new ResizeObserver(resize);observer.observe(root);
  return()=>{cancelAnimationFrame(frame);observer.disconnect();renderer.domElement.removeEventListener("pointerdown",onPointerDown);controls.dispose();renderer.dispose();root.removeChild(renderer.domElement);scene.traverse(o=>{if(o instanceof THREE.Mesh||o instanceof THREE.Line){o.geometry.dispose();const m=o.material;if(Array.isArray(m))m.forEach(x=>x.dispose());else m.dispose();}});};
 },[circuit]);
 return <div className="scene-wrap"><div className="scene-label">3D INTERACTIVE CIRCUIT · DRAG TO ORBIT · SCROLL TO ZOOM · TAP SWITCH / LED / LOGIC INPUT TO TOGGLE</div><div ref={host} className="scene-host"/><div className="scene-count">{circuit.components.length} COMPONENTS · {circuit.nets.length} NETS</div></div>;
}
