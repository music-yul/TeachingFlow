import {createPortal} from 'react-dom'
import {DashboardToolbarContext} from '../dashboardToolbar'
import { useContext, useEffect, useRef, useState } from 'react'
import type { CSSProperties, PointerEvent, ReactNode } from 'react'
import type { AppData, HomeWidget } from '../types'
import { availableHomeWidgets, homeWidgetLabels } from '../workspace'
import './FlexibleDashboard.css'
import WidgetOptionsDialog from './WidgetOptionsDialog'
import AdaptiveWidget from './AdaptiveWidget'
import WidgetExpandedDialog from './WidgetExpandedDialog'
import type {WidgetPreview} from '../widgetPreview'
import {widgetOptions} from '../widgetPreferences'
import type {WidgetOptions} from '../widgetPreferences'
export type WidgetKind = HomeWidget | 'progress' | 'deadlines' | 'memo' | 'links' | 'journal'
export type DashboardItem = { key:string; kind:WidgetKind; x:number; y:number; w:number; h:number; title?:string; showTitle?:boolean; appearance?:'framed'|'title'|'border'|'none'; fontSize?:number; journalPeriod?:'all'|'last'|'today'|'yesterday'|'week'|'7days'|'30days'|'custom'; journalDays?:number; journalRecordedOnly?:boolean; classId?:string; text?:string; options?:Partial<WidgetOptions> }
export type DashboardState = { version?:2; layouts:Record<string,DashboardItem[]> }
export const dashboardLabels:Record<WidgetKind,string> = {...homeWidgetLabels,followups:'후속 확인',progress:'학급별 진도',deadlines:'다가오는 마감',memo:'빠른 메모',links:'바로가기',journal:'최근 수업 기록'}
const overlaps=(a:DashboardItem,b:DashboardItem)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y
export function fitDashboard(items:DashboardItem[],cols:number,pinned?:string){
 const sorted=[...items].sort((a,b)=>Number(b.key===pinned)-Number(a.key===pinned))
 const out:DashboardItem[]=[]
 for(const raw of sorted){const w=Math.max(1,Math.min(cols,Math.round(raw.w)||2)),h=Math.max(1,Math.min(24,Math.round(raw.h)||4));const item={...raw,w,h,x:Math.max(0,Math.min(cols-w,Math.round(raw.x)||0)),y:Math.max(0,Math.min(10000,Math.round(raw.y)||0))};while(out.some(other=>overlaps(item,other)))item.y++;out.push(item)}
 return items.map(item=>out.find(v=>v.key===item.key)!)
}
/** Shrink old default summary cards once; later user resizing remains untouched. */
export function upgradeDashboardLayouts(state:DashboardState|undefined):Record<string,DashboardItem[]>{
 if(!state)return {}
 if(state.version===2)return state.layouts
 return Object.fromEntries(Object.entries(state.layouts).map(([profile,items])=>[profile,items.map(item=>item.kind==='summary'&&item.h<=4?{...item,h:1}:item)]))
}
export default function FlexibleDashboard({data,update,render,preview}:{data:AppData;update:(change:Partial<AppData>)=>void;render:(item:DashboardItem,change:(patch:Partial<DashboardItem>)=>void,closeExpanded:()=>void)=>ReactNode;preview:(item:DashboardItem)=>WidgetPreview}){
 const toolbarTarget=useContext(DashboardToolbarContext)
 const host=useRef<HTMLDivElement>(null)
 const [contentTarget,setContentTarget]=useState<HTMLElement|null>(null)
 const [settingsKey,setSettingsKey]=useState<string|null>(null),[expandedKey,setExpandedKey]=useState<string|null>(null)
 const [width,setWidth]=useState(1000),[editing,setEditing]=useState(false),[picker,setPicker]=useState(false),[dragPreview,setPreview]=useState<DashboardItem[]|null>(null),[message,setMessage]=useState('')
 useEffect(()=>{const node=host.current!;const observer=new ResizeObserver(entries=>setWidth(entries[0].contentRect.width));observer.observe(node);return()=>observer.disconnect()},[])
 const profile=width<600?'phone':width<1100?'laptop':width<1600?'desktop':width<2100?'wide':'ultrawide'
 const cols={phone:2,laptop:8,desktop:12,wide:16,ultrawide:20}[profile]
 const layouts=upgradeDashboardLayouts(data.workspacePreferences.dashboard)
 const saved=layouts[profile]
 const initial:DashboardItem[]=data.workspacePreferences.homeLayout.map(item=>({key:item.id,kind:item.id,options:widgetOptions(data.workspacePreferences),x:Math.round(item.column*cols/12),y:item.id==='summary'?item.row*2:Math.max(0,item.row*2-(data.workspacePreferences.homeLayout.some(v=>v.id==='summary'&&v.row===0)?1:0)),w:Math.max(Math.min(cols,2),Math.round(item.width*cols/12)),h:item.id==='summary'?1:Math.max(3,item.height*2)}))
 const items=dragPreview||fitDashboard(saved||initial,cols)
 const available=[...availableHomeWidgets(data),...(data.settings.features.teaching?['progress','journal']:[]),...(data.settings.features.work?['deadlines']:[]),'memo','links'] as WidgetKind[]
 const visible=items.filter(item=>available.includes(item.kind))
 const commit=(next:DashboardItem[])=>{update({workspacePreferences:{...data.workspacePreferences,dashboard:{version:2,layouts:{...layouts,[profile]:fitDashboard(next,cols)}}}});setPreview(null)}
 const change=(key:string,patch:Partial<DashboardItem>)=>commit(fitDashboard(items.map(item=>item.key===key?{...item,...patch}:item),cols,key))
 const gesture=useRef<{key:string;mode:'move'|'resize';sx:number;sy:number;original:DashboardItem[];next:DashboardItem[];profile:string}|null>(null)
 const begin=(event:PointerEvent<HTMLButtonElement>,item:DashboardItem,mode:'move'|'resize')=>{event.preventDefault();event.currentTarget.setPointerCapture(event.pointerId);gesture.current={key:item.key,mode,sx:event.clientX,sy:event.clientY,original:items,next:items,profile}}
 const move=(event:PointerEvent<HTMLButtonElement>)=>{const g=gesture.current;if(!g||g.profile!==profile)return;const dx=Math.round((event.clientX-g.sx)/((width+12)/cols)),dy=Math.round((event.clientY-g.sy)/64);g.next=fitDashboard(g.original.map(item=>item.key!==g.key?item:g.mode==='move'?{...item,x:item.x+dx,y:item.y+dy}:{...item,w:item.w+dx,h:item.h+dy}),cols,g.key);setPreview(g.next)}
 const finish=()=>{const g=gesture.current;gesture.current=null;if(g&&g.profile===profile)commit(g.next);else setPreview(null)}
 useEffect(()=>{gesture.current=null;setPreview(null);setSettingsKey(null);setExpandedKey(null)},[profile])
 const body=(item:DashboardItem,inExpanded=false)=><div className={`fd-body home-widget home-widget-${item.kind} ${['calendar','memo','links','timetable','progress','deadlines','journal'].includes(item.kind)?'fd-has-content-title':''}`} data-font-custom={Number.isFinite(item.fontSize)} style={{'--widget-rows':item.h/2,'--fd-widget-font-size':Number.isFinite(item.fontSize)?`${Math.max(11,Math.min(24,item.fontSize!))}px`:undefined} as CSSProperties}>{item.kind==='memo'||item.kind==='links'?<textarea aria-label={dashboardLabels[item.kind]} placeholder={item.kind==='memo'?'메모를 입력하세요.':'자료 이름과 https:// 주소를 입력하세요.'} value={item.text||''} onChange={e=>change(item.key,{text:e.target.value})}/>:render(item,patch=>change(item.key,patch),()=>{if(inExpanded)setExpandedKey(null)})}{item.kind==='links'&&(item.text||'').split('\n').map((line,i)=>{const match=line.match(/https?:\/\/[^\s]+/);return match?<a key={i} href={match[0]} target="_blank" rel="noreferrer">{line.replace(match[0],'').trim()||match[0]}</a>:null})}</div>
 const expanded=items.find(item=>item.key===expandedKey)
 const toolbar=<div className="fd-toolbar"><div className="fd-actions"><button onClick={()=>setPicker(!picker)} aria-expanded={picker}>＋ 위젯 추가</button><button className={editing?'primary-button':''} onClick={()=>setEditing(!editing)}>{editing?'편집 완료':'화면 편집'}</button></div></div>
 return <div ref={host} className="flex-dashboard">
 {toolbarTarget?createPortal(toolbar,toolbarTarget):toolbar}
 {picker&&<div className="fd-picker">{available.map(kind=><button key={kind} onClick={()=>{const key=crypto.randomUUID();const w=kind==='summary'?cols:kind==='calendar'?Math.min(cols,8):Math.min(cols,4);const h=kind==='summary'?1:kind==='calendar'?8:4;let next:DashboardItem={key,kind,x:0,y:0,w,h,options:widgetOptions(data.workspacePreferences)};while(items.some(item=>overlaps(item,next)))next={...next,y:next.y+1};commit([...items,next]);setEditing(true);setMessage(`${dashboardLabels[kind]} 위젯을 추가했습니다.`)}}>＋ {dashboardLabels[kind]}</button>)}</div>}
 {editing&&<div className="fd-edit-hint"><p className="hint">제목 왼쪽 손잡이로 이동 · 오른쪽 아래 손잡이로 가로·세로 조절 · 숫자로도 위치와 크기를 바꿀 수 있습니다. 같은 위젯을 여러 개 추가할 수 있습니다.</p><button onClick={()=>{if(window.confirm('현재 화면 크기의 위젯 배치를 기본값으로 되돌릴까요? 메모 위젯의 내용도 제거됩니다.')){commit(initial);setSettingsKey(null)}}}>기본 배치로</button></div>}
 <span role="status" className="fd-status">{message}</span>
 {!visible.length&&<p className="banner">위젯 추가를 눌러 대시보드를 구성하세요.</p>}
 <div className="fd-grid" style={{gridTemplateColumns:`repeat(${cols}, minmax(0,1fr))`,gridTemplateRows:`repeat(${Math.max(1,...visible.map(item=>item.y+item.h))},52px)`}}>
 {visible.map(item=><AdaptiveWidget contentTarget={settingsKey===item.key?contentTarget:null} key={item.key} item={item} label={item.title||dashboardLabels[item.kind]} editing={editing} preview={preview(item)} onOpen={()=>setExpandedKey(item.key)} onSettings={()=>setSettingsKey(item.key)} onRemove={()=>commit(items.filter(v=>v.key!==item.key))} onBegin={(event,mode)=>begin(event,item,mode)} onMove={move} onFinish={finish} onCancel={()=>{gesture.current=null;setPreview(null)}}>{body(item)}</AdaptiveWidget>)}
 </div>{expanded&&<WidgetExpandedDialog key={expanded.key} label={expanded.title||dashboardLabels[expanded.kind]} onClose={()=>setExpandedKey(null)} onSettings={()=>{setExpandedKey(null);setSettingsKey(expanded.key)}}>{body(expanded,true)}</WidgetExpandedDialog>}{settingsKey&&items.find(item=>item.key===settingsKey)&&<WidgetOptionsDialog onContentTarget={setContentTarget} key={settingsKey} data={data} item={items.find(item=>item.key===settingsKey)!} cols={cols} change={patch=>change(settingsKey,patch)} onRemove={()=>{commit(items.filter(item=>item.key!==settingsKey));setSettingsKey(null)}} onClose={()=>setSettingsKey(null)}/>}</div>
}
