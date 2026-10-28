import assert from 'node:assert/strict'
import {createServer} from 'vite'
const server=await createServer({server:{middlewareMode:true},appType:'custom'})
try{
 const {fitDashboard}=await server.ssrLoadModule('/src/components/FlexibleDashboard.tsx')
 const {widgetIsCompact}=await server.ssrLoadModule('/src/components/AdaptiveWidget.tsx')
 const {getWidgetPreview}=await server.ssrLoadModule('/src/widgetPreview.ts')
 const {emptyData,writeData,readData,importData}=await server.ssrLoadModule('/src/storage.ts')
 const kinds=['summary','calendar','lessons','notices','collections','tasks','followups','timetable','progress','deadlines','memo','links','journal']
 const data=emptyData(),items=kinds.map((kind,i)=>({key:kind,kind,x:i,y:0,w:1,h:1,title:`自訂-${kind}`,text:kind==='memo'?'first line\nsecond':kind==='links'?'https://example.test':''}))
 data.settings.features={...data.settings.features,teaching:true,homeroom:true,work:true,clubs:true}
 for(const cols of [2,8,12,16,20]){
  const layout=fitDashboard(items,cols)
  assert.equal(layout.length,13)
  for(const item of layout){assert.equal(item.w,1);assert.equal(item.h,1);assert.ok(widgetIsCompact(item,95,50));assert.ok(!widgetIsCompact(item,850,600));const preview=getWidgetPreview(data,[],item);assert.equal(typeof preview.value,'string');assert.equal(typeof preview.label,'string');assert.equal(typeof preview.detail,'string')}
  for(let i=0;i<layout.length;i++)for(let j=i+1;j<layout.length;j++){const a=layout[i],b=layout[j];assert.ok(!(a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y))}
 }
 assert.equal(getWidgetPreview(data,[],items.find(i=>i.kind==='memo')).value,'first line')
 assert.equal(getWidgetPreview(data,[],items.find(i=>i.kind==='links')).value,'1')
 data.workspacePreferences.dashboard={version:2,layouts:{wide:items}}
 let raw;globalThis.localStorage={getItem:()=>raw,setItem:(_,value)=>raw=value};writeData(data)
 assert.deepEqual(readData().workspacePreferences.dashboard,data.workspacePreferences.dashboard)
 assert.deepEqual((await importData({text:async()=>raw})).workspacePreferences.dashboard,data.workspacePreferences.dashboard)
 console.log('PASS: all 13 widget kinds at 1x1 across 5 grids; compact/expanded rules, previews, non-overlap, custom names and content backup roundtrip')
}finally{await server.close()}
