import type {AppData} from './types'
export const DRIVE_SCOPE='https://www.googleapis.com/auth/drive.file'
export const DRIVE_BACKUP_NAME='티칭플로_백업.json'
export const GOOGLE_CLIENT_ID=String(import.meta.env.VITE_GOOGLE_CLIENT_ID||'').trim()
export type DriveFile={id:string;name:string;modifiedTime?:string;version?:string;size?:string}
export type DriveAccount={displayName?:string;emailAddress?:string}
export type GoogleToken={access_token?:string;expires_in?:number;error?:string;error_description?:string;scope?:string}
type GoogleOAuth={initTokenClient:(config:{client_id:string;scope:string;callback:(token:GoogleToken)=>void;error_callback:(error:{type?:string})=>void})=>{requestAccessToken:(options:{prompt:string})=>void};hasGrantedAllScopes:(token:GoogleToken,...scopes:string[])=>boolean;revoke:(token:string,callback:()=>void)=>void}
declare global{interface Window{google?:{accounts:{oauth2:GoogleOAuth}}}}
let sdkPromise:Promise<void>|undefined
export function loadGoogleSdk():Promise<void>{
 if(window.google?.accounts?.oauth2)return Promise.resolve()
 if(sdkPromise)return sdkPromise
 sdkPromise=new Promise((resolve,reject)=>{
  const old=document.getElementById('teachingflow-google-sdk');old?.remove()
  const script=document.createElement('script');script.id='teachingflow-google-sdk';script.src='https://accounts.google.com/gsi/client';script.async=true
  const timer=window.setTimeout(()=>fail(),15000)
  const fail=()=>{clearTimeout(timer);script.remove();sdkPromise=undefined;reject(new Error('Google 연결 준비에 실패했습니다. 인터넷 연결을 확인한 뒤 다시 시도해 주세요.'))}
  script.onload=()=>{clearTimeout(timer);if(window.google?.accounts?.oauth2)resolve();else fail()};script.onerror=fail
  document.head.appendChild(script)
 })
 return sdkPromise
}
export class DriveError extends Error{status:number;constructor(message:string,status:number){super(message);this.status=status}}
async function driveRequest(token:string,url:string,init:RequestInit={}){
 const response=await fetch(url,{...init,headers:{...init.headers,Authorization:`Bearer ${token}`}})
 if(!response.ok){if(response.status===401)throw new DriveError('Google 연결이 만료되었습니다. 다시 연결해 주세요.',401);if(response.status===403)throw new DriveError('Drive 접근이 거부되었습니다. Drive API 활성화와 계정 권한을 확인해 주세요.',403);if(response.status===404)throw new DriveError('백업 파일을 찾을 수 없습니다. 목록을 새로고침해 주세요.',404);if(response.status===412)throw new DriveError('다른 기기에서 백업이 변경되었습니다. 목록을 새로고침한 뒤 다시 확인해 주세요.',412);throw new DriveError(`Drive 요청을 처리하지 못했습니다 (${response.status}).`,response.status)}
 return response
}
export async function driveAccount(token:string):Promise<DriveAccount>{const response=await driveRequest(token,'https://www.googleapis.com/drive/v3/about?fields=user(displayName,emailAddress)');return (await response.json()).user}
export async function listDriveBackups(token:string):Promise<DriveFile[]>{
 const files:DriveFile[]=[];let pageToken=''
 do{const query=new URLSearchParams({q:`trashed = false and (name = '${DRIVE_BACKUP_NAME}' or appProperties has { key='teachingflowBackup' and value='1' })`,fields:'nextPageToken,files(id,name,modifiedTime,version,size)',orderBy:'modifiedTime desc',pageSize:'100',spaces:'drive',...(pageToken?{pageToken}:{})});const response=await driveRequest(token,`https://www.googleapis.com/drive/v3/files?${query}`);const result=await response.json();files.push(...result.files||[]);pageToken=result.nextPageToken||''}while(pageToken)
 return files
}
export async function saveDriveBackup(token:string,data:AppData,target?:DriveFile):Promise<DriveFile>{
 const json=JSON.stringify(data,null,2)
 // Refuse to overwrite a version that changed since the user last listed it.
 let etag:string|undefined
 if(target){const response=await driveRequest(token,`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(target.id)}?fields=id,version`);const latest=await response.json();if(target.version&&latest.version!==target.version)throw new DriveError('다른 기기에서 백업이 변경되었습니다. 목록을 새로고침한 뒤 다시 확인해 주세요.',412);etag=response.headers.get('ETag')||undefined}
 const boundary=`teachingflow_${crypto.randomUUID().replaceAll('-','')}`
 const metadata={name:DRIVE_BACKUP_NAME,mimeType:'application/json',appProperties:{teachingflowBackup:'1'}}
 const body=new Blob([`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n`,json,`\r\n--${boundary}--`],{type:`multipart/related; boundary=${boundary}`})
 const endpoint=`https://www.googleapis.com/upload/drive/v3/files${target?'/'+encodeURIComponent(target.id):''}?uploadType=multipart&fields=id,name,modifiedTime,version,size`
 const response=await driveRequest(token,endpoint,{method:target?'PATCH':'POST',headers:etag?{'If-Match':etag}:{},body})
 return response.json()
}
export async function downloadDriveBackup(token:string,file:DriveFile):Promise<File>{
 const response=await driveRequest(token,`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(file.id)}?alt=media`)
 const blob=await response.blob();if(blob.size>50*1024*1024)throw new Error('백업 파일이 너무 큽니다. 50MB 이하의 티칭플로 JSON 백업을 선택해 주세요.')
 return new File([blob],file.name,{type:'application/json'})
}
