import {sanitiseApprovedFilename,type DesignerAgent,type DesignerAsset} from "./designer-records.ts";

export type DownloadableAsset={agent:DesignerAgent;asset:DesignerAsset;imageId:string;filename:string};

export function currentDownloadableAsset(agent:DesignerAgent,assets:DesignerAsset[]):DownloadableAsset|null{
 const asset=assets.filter(item=>item.agentId===agent.agentId).sort((a,b)=>b.approvedAt.localeCompare(a.approvedAt))[0];
 if(!asset)return null;
 const transparent=asset.sourceType==="background_removed"&&asset.transparentImageId,imageId=transparent?asset.transparentImageId!:asset.imageId,extension=transparent?"png":"png";
 return{agent,asset,imageId,filename:sanitiseApprovedFilename(agent.name,agent.agentId,extension,asset.sourceType)};
}

const table=(()=>{const result=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;result[n]=c>>>0}return result})();
function crc32(data:Uint8Array){let crc=0xffffffff;for(const value of data)crc=table[(crc^value)&255]^(crc>>>8);return(crc^0xffffffff)>>>0}
function u16(value:number){return new Uint8Array([value&255,value>>>8&255])}
function u32(value:number){return new Uint8Array([value&255,value>>>8&255,value>>>16&255,value>>>24&255])}
function join(parts:Uint8Array[]){const size=parts.reduce((total,item)=>total+item.length,0),output=new Uint8Array(size);let offset=0;for(const part of parts){output.set(part,offset);offset+=part.length}return output}
function dosDate(value=new Date()){const year=Math.max(1980,value.getFullYear());return{time:value.getHours()<<11|value.getMinutes()<<5|value.getSeconds()>>1,date:year-1980<<9|(value.getMonth()+1)<<5|value.getDate()}}

// Stored entries keep the demo dependency-free; images are already compressed, so deflate adds little value.
export function createPhotoZip(files:{name:string;data:Uint8Array}[],createdAt=new Date()){const encoder=new TextEncoder(),local:Uint8Array[]=[],central:Uint8Array[]=[];let offset=0;const stamp=dosDate(createdAt);for(const file of files){const name=encoder.encode(file.name),crc=crc32(file.data),header=join([u32(0x04034b50),u16(20),u16(0x0800),u16(0),u16(stamp.time),u16(stamp.date),u32(crc),u32(file.data.length),u32(file.data.length),u16(name.length),u16(0),name]),record=join([header,file.data]);local.push(record);central.push(join([u32(0x02014b50),u16(20),u16(20),u16(0x0800),u16(0),u16(stamp.time),u16(stamp.date),u32(crc),u32(file.data.length),u32(file.data.length),u16(name.length),u16(0),u16(0),u16(0),u16(0),u32(0),u32(offset),name]));offset+=record.length}const directory=join(central),end=join([u32(0x06054b50),u16(0),u16(0),u16(files.length),u16(files.length),u32(directory.length),u32(offset),u16(0)]);return new Blob([...local,directory,end],{type:"application/zip"})}
