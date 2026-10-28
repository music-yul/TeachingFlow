import assert from 'node:assert/strict'
import {createServer} from 'vite'
import React from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
const server=await createServer({server:{middlewareMode:true},appType:'custom'})
try{
 const {emptyData,importData,writeData,readData}=await server.ssrLoadModule('/src/storage.ts')
 const {widgetOptions,widgetData}=await server.ssrLoadModule('/src/widgetPreferences.ts')
 const api=await server.ssrLoadModule('/src/googleDrive.ts')
 const data=emptyData(),base=widgetOptions(data.workspacePreferences)
 const calendarA={...base,homeCalendar:{...base.homeCalendar,homeMode:'week',filter:'teaching'}},calendarB={...base,homeCalendar:{...base.homeCalendar,homeMode:'month',filter:'work'}}
 assert.equal(widgetData(data,calendarA).workspacePreferences.homeCalendar.homeMode,'week')
 assert.equal(widgetData(data,calendarB).workspacePreferences.homeCalendar.filter,'work')
 assert.equal(data.workspacePreferences.homeCalendar.filter,base.homeCalendar.filter)
 data.workspacePreferences.homeTimetableSubject=true
 const auto=JSON.parse(JSON.stringify({...base,homeTimetableSubject:null}))
 assert.equal(widgetData(data,auto).workspacePreferences.homeTimetableSubject,undefined)
 data.workspacePreferences.dashboard={layouts:{wide:[{key:'a',kind:'calendar',x:0,y:0,w:6,h:8,options:calendarA},{key:'b',kind:'calendar',x:6,y:0,w:6,h:8,options:calendarB}]}}
 let raw;globalThis.localStorage={getItem:()=>raw,setItem:(_,v)=>raw=v};writeData(data)
 assert.deepEqual(readData().workspacePreferences.dashboard,data.workspacePreferences.dashboard)
 assert.deepEqual((await importData({text:async()=>raw})).workspacePreferences.dashboard,data.workspacePreferences.dashboard)
 const {default:Settings}=await server.ssrLoadModule('/src/components/SettingsHub.tsx')
 const settings=renderToStaticMarkup(React.createElement(Settings,{data,update:()=>{},onFiles:()=>{},onImport:()=>{},onReset:()=>{}}))
 assert.ok(!settings.includes('>메인화면</button>'))
 const {default:Panel}=await server.ssrLoadModule('/src/components/DriveBackupPanel.tsx')
 const panel=renderToStaticMarkup(React.createElement(Panel,{data,onImport:()=>{}}))
 assert.ok(panel.includes('Google Drive 백업'));assert.ok(panel.includes('disabled=""'));assert.ok(panel.includes('자동 동기화하지 않습니다'))
 const originalFetch=globalThis.fetch;let requests=[]
 globalThis.fetch=async(url,init={})=>{requests.push({url:String(url),init});return new Response(JSON.stringify({id:'created',name:api.DRIVE_BACKUP_NAME,version:'1'}),{status:200,headers:{'Content-Type':'application/json'}})}
 await api.saveDriveBackup('token-only-in-memory',data)
 assert.equal(requests[0].init.method,'POST');assert.equal(requests[0].init.headers.Authorization,'Bearer token-only-in-memory')
 const multipart=await requests[0].init.body.text();assert.ok(multipart.includes('티칭플로_백업.json'));assert.ok(multipart.includes('teachingflowBackup'));assert.ok(multipart.includes('"dashboard"'));assert.ok(!multipart.includes('token-only-in-memory'))
 requests=[];globalThis.fetch=async(url,init={})=>{requests.push({url:String(url),init});return new Response(JSON.stringify(requests.length===1?{version:'2'}:{id:'existing',version:'3'}),{status:200,headers:{ETag:'etag2'}})}
 await api.saveDriveBackup('token',data,{id:'existing',name:api.DRIVE_BACKUP_NAME,version:'2'})
 assert.equal(requests[1].init.method,'PATCH');assert.equal(requests[1].init.headers['If-Match'],'etag2')
 requests=[];globalThis.fetch=async(url,init={})=>{requests.push({url,init});return new Response(JSON.stringify({version:'9'}),{status:200})}
 await assert.rejects(()=>api.saveDriveBackup('token',data,{id:'existing',name:api.DRIVE_BACKUP_NAME,version:'2'}),error=>error.status===412);assert.equal(requests.length,1)
 globalThis.fetch=async()=>new Response('',{status:401});await assert.rejects(()=>api.listDriveBackups('expired'),e=>e.status===401)
 let page=0;globalThis.fetch=async()=>new Response(JSON.stringify(++page===1?{files:[{id:'first'}],nextPageToken:'page2'}:{files:[{id:'second'}]}),{status:200})
 assert.deepEqual((await api.listDriveBackups('token')).map(f=>f.id),['first','second'])
 globalThis.fetch=async()=>new Response(JSON.stringify(data),{status:200});const file=await api.downloadDriveBackup('token',{id:'first',name:api.DRIVE_BACKUP_NAME});assert.deepEqual((await importData(file)).workspacePreferences.dashboard,data.workspacePreferences.dashboard)
 globalThis.fetch=async()=>new Response('not a backup',{status:200});const invalid=await api.downloadDriveBackup('token',{id:'wrong',name:'wrong.json'});await assert.rejects(()=>importData(invalid));assert.equal(raw,JSON.stringify(data))
 assert.equal(api.DRIVE_SCOPE,'https://www.googleapis.com/auth/drive.file')
 globalThis.fetch=originalFetch
 console.log('PASS: isolated widget options, auto-option JSON roundtrip, removed settings menu, Drive disabled without configuration, create/update/ETag, stale-backup rejection, expired auth, pagination, restore validation, no token in backup')
}finally{await server.close()}
