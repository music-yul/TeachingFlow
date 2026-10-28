import assert from 'node:assert/strict'
import {createServer} from 'vite'
const server=await createServer({server:{middlewareMode:true},appType:'custom'})
try{
const {fitDashboard}=await server.ssrLoadModule('/src/components/FlexibleDashboard.tsx')
const {emptyData,writeData,readData,importData}=await server.ssrLoadModule('/src/storage.ts')
let raw=null;globalThis.localStorage={getItem:()=>raw,setItem:(_,v)=>{raw=v}}
const memo={key:'memo1',kind:'memo',x:0,y:0,w:4,h:4,text:'보존할 메모'}
const calendar={key:'cal',kind:'calendar',x:0,y:0,w:8,h:8}
const placed=fitDashboard([memo,calendar],16,'memo1')
assert.deepEqual(placed[0],memo);assert.ok(placed[1].y>=4)
for(const cols of [2,8,12,16,20]){
 const list=fitDashboard(Array.from({length:40},(_,i)=>({...memo,key:String(i),x:i%cols,w:4})),cols)
 for(const item of list){assert.ok(item.x>=0&&item.x+item.w<=cols);assert.ok(item.h>=2)}
 for(let i=0;i<list.length;i++)for(let j=i+1;j<list.length;j++){const a=list[i],b=list[j];assert.ok(!(a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y))}
 assert.equal(list.length,40)
}
const data=emptyData();data.workspacePreferences.dashboard={layouts:{wide:placed,laptop:[],phone:[{...memo,w:2}]}}
writeData(data);assert.deepEqual(readData().workspacePreferences.dashboard,data.workspacePreferences.dashboard)
assert.deepEqual((await importData({text:async()=>raw})).workspacePreferences.dashboard,data.workspacePreferences.dashboard)
assert.deepEqual(fitDashboard([{...memo,x:-5,y:-2,w:100,h:0}],8).map(x=>[x.x,x.y,x.w,x.h]),[[0,0,8,4]])
console.log('PASS: 5 screen widths, 40 widgets, collision packing, pinned movement, bounds, note persistence, separate layouts, backup import')
}finally{await server.close()}
