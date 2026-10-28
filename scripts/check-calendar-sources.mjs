import assert from 'node:assert/strict'
import React from 'react'
import {renderToStaticMarkup} from 'react-dom/server'
import {createServer} from 'vite'
import {createRequire} from 'node:module'
const require=createRequire(import.meta.url),XLSX=require('xlsx')
const originalWrite=XLSX.writeFile;let exported
XLSX.writeFile=(wb)=>{exported=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{header:1})}
const server=await createServer({server:{middlewareMode:true},appType:'custom'})
try{
 const {emptyData,writeData,readData,importData}=await server.ssrLoadModule('/src/storage.ts')
 const {calendarSources,allCalendarSources}=await server.ssrLoadModule('/src/calendarSources.ts')
 const {fitDashboard,upgradeDashboardLayouts}=await server.ssrLoadModule('/src/components/FlexibleDashboard.tsx')
 const {default:Calendar}=await server.ssrLoadModule('/src/components/CalendarView.tsx')
 const {exportVisibleCalendarXlsx}=await server.ssrLoadModule('/src/exportPrint.ts')
 const data=emptyData(),date='2026-10-28',anchor=new Date(2026,9,28)
 data.settings.features={...data.settings.features,teaching:true,homeroom:true,work:true,clubs:true};data.settings.useHolidays=false
 data.subjects=[{id:'s',name:'TEACHING_TOKEN',color:'#739450',usesProgress:false}]
 data.classes=[{id:'c',subjectId:'s',name:'CLASS_TOKEN',slots:[],students:[]}]
 data.events=[{id:'event',date,title:'SCHOOL_TOKEN',type:'note',periods:[],classIds:[]}]
 data.dayNotes[date]=[{id:'memo',text:'MEMO_TOKEN'}]
 data.teacherDesk.notices=[{id:'n',title:'HOMEROOM_TOKEN',date,done:false,category:'',note:'',link:''}]
 data.teacherDesk.tasks=[{id:'t',title:'WORK_TOKEN',date,done:false,category:'',note:'',link:''}]
 data.clubs=[{id:'club',name:'CLUB_TOKEN',students:[],attendance:{},activities:[{id:'activity',date,title:'CLUB_ACTIVITY_TOKEN',record:'',nextPlan:''}]}]
 const sessions=[{id:'session',date,classId:'c',subjectId:'s',period:1,lessonIds:[],mode:'normal'}]
 const tokens={teaching:'CLASS_TOKEN',homeroom:'HOMEROOM_TOKEN',work:'WORK_TOKEN',club:'CLUB_ACTIVITY_TOKEN',school:'SCHOOL_TOKEN',memo:'MEMO_TOKEN'}
 for(let mask=0;mask<64;mask++){
  const sources=allCalendarSources.filter((_,i)=>mask&(1<<i));data.workspacePreferences.homeCalendar={...data.workspacePreferences.homeCalendar,sources}
  const html=renderToStaticMarkup(React.createElement(Calendar,{context:'home',data,sessions,month:anchor,setMonth:()=>{},onSelect:()=>{},update:()=>{}}))
  for(const source of allCalendarSources)assert.equal(html.includes(tokens[source]),sources.includes(source),`render ${source}, mask ${mask}`)
  exportVisibleCalendarXlsx(data,sessions,[anchor],data.workspacePreferences.homeCalendar)
  const categories=exported.slice(1).map(row=>row[1])
  for(const [source,category] of Object.entries({teaching:'교과',homeroom:'담임',work:'업무',club:'동아리',school:'학사일정',memo:'메모'}))assert.equal(categories.includes(category),sources.includes(source),`export ${source}, mask ${mask}`)
 }
 assert.deepEqual(calendarSources({filter:'teaching'}),['teaching','school','memo']);assert.deepEqual(calendarSources({filter:'work'}),['work','memo']);assert.deepEqual(calendarSources({filter:'all',sources:[]}),[])
 const old={layouts:{wide:[{key:'summary',kind:'summary',x:0,y:0,w:20,h:3}]}}
 assert.equal(upgradeDashboardLayouts(old).wide[0].h,1);assert.equal(old.layouts.wide[0].h,3);assert.equal(upgradeDashboardLayouts({...old,version:2}).wide[0].h,3)
 assert.equal(fitDashboard([{...old.layouts.wide[0],h:1}],20)[0].h,1)
 data.workspacePreferences.dashboard={version:2,layouts:{wide:[{...old.layouts.wide[0],h:1}]}};data.workspacePreferences.homeCalendar.sources=[]
 let raw;globalThis.localStorage={getItem:()=>raw,setItem:(_,v)=>raw=v};writeData(data)
 assert.deepEqual(readData().workspacePreferences.homeCalendar.sources,[]);assert.equal(readData().workspacePreferences.dashboard.version,2);assert.deepEqual((await importData({text:async()=>raw})).workspacePreferences.homeCalendar.sources,[])
 console.log('PASS: 64 source combinations in calendar/XLSX, show-none, legacy filters, one-row summary migration/resizing, sources/schema backup roundtrip')
}finally{XLSX.writeFile=originalWrite;await server.close()}
