import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const size=256;
const rgba=Buffer.alloc(size*size*4);
const set=(x,y,c)=>{if(x<0||y<0||x>=size||y>=size)return;const i=(y*size+x)*4;rgba[i]=c[0];rgba[i+1]=c[1];rgba[i+2]=c[2];rgba[i+3]=255;};
const bg=[8,18,34], edge=[38,68,102], cyan=[69,211,190], white=[232,243,255];
for(let y=0;y<size;y++)for(let x=0;x<size;x++){
 const d=Math.min(x,y,size-1-x,size-1-y);
 let c=d<8?edge:bg;
 if((x-128)**2+(y-128)**2<104**2)c=[Math.min(255,bg[0]+4),Math.min(255,bg[1]+12),Math.min(255,bg[2]+23)];
 set(x,y,c);
}
function rect(x,y,w,h,c){for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++)set(xx,yy,c);}
function line(x1,y1,x2,y2,t,c){const dx=x2-x1,dy=y2-y1,n=Math.max(Math.abs(dx),Math.abs(dy));for(let i=0;i<=n;i++){const x=Math.round(x1+dx*i/Math.max(1,n)),y=Math.round(y1+dy*i/Math.max(1,n));rect(x-Math.floor(t/2),y-Math.floor(t/2),t,t,c);}}
const B=["11110","10001","10001","11110","10001","10001","11110"];
const Z=["11111","00001","00010","00100","01000","10000","11111"];
function glyph(bits,x,y,scale,c){bits.forEach((row,ry)=>[...row].forEach((v,rx)=>{if(v==="1")rect(x+rx*scale,y+ry*scale,scale,scale,c)}));}
glyph(B,53,92,15,white);glyph(Z,143,92,15,cyan);
// Circuit traces around the monogram
line(38,66,38,48,5,cyan);line(38,48,76,48,5,cyan);
line(218,190,218,208,5,cyan);line(218,208,180,208,5,cyan);
line(53,204,80,204,4,edge);line(80,204,80,222,4,edge);
line(203,54,176,54,4,edge);line(176,54,176,36,4,edge);
function crc32(buf){let c=0xffffffff;for(const b of buf){c^=b;for(let k=0;k<8;k++)c=(c>>>1)^((c&1)?0xedb88320:0);}return (c^0xffffffff)>>>0;}
function chunk(type,data){const t=Buffer.from(type);const out=Buffer.alloc(12+data.length);out.writeUInt32BE(data.length,0);t.copy(out,4);data.copy(out,8);out.writeUInt32BE(crc32(Buffer.concat([t,data])),8+data.length);return out;}
const raw=Buffer.alloc(size*(1+size*4));for(let y=0;y<size;y++){const off=y*(1+size*4);raw[off]=0;rgba.copy(raw,off+1,y*size*4,(y+1)*size*4);}
const png=Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk("IHDR",(()=>{const b=Buffer.alloc(13);b.writeUInt32BE(size,0);b.writeUInt32BE(size,4);b[8]=8;b[9]=6;return b;})()),chunk("IDAT",zlib.deflateSync(raw)),chunk("IEND",Buffer.alloc(0))]);
const header=Buffer.alloc(6);header.writeUInt16LE(0,0);header.writeUInt16LE(1,2);header.writeUInt16LE(1,4);
const entry=Buffer.alloc(16);entry[0]=0;entry[1]=0;entry[2]=0;entry[3]=0;entry.writeUInt16LE(1,4);entry.writeUInt16LE(32,6);entry.writeUInt32LE(png.length,8);entry.writeUInt32LE(22,12);
const dir=path.join("src-tauri","icons");fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,"icon.ico"),Buffer.concat([header,entry,png]));
console.log("Generated src-tauri/icons/icon.ico (256x256 PNG-in-ICO).");
