import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, PointerEvent, ReactNode } from 'react'
import type { AppData, HomeWidget } from '../types'
import { availableHomeWidgets, homeWidgetLabels } from '../workspace'
import './FlexibleDashboard.css'
import WidgetOptionsDialog from './WidgetOptionsDialog'
import {widgetOptions} from '../widgetPreferences'
import type {WidgetOptions} from '../widgetPreferences'
export type WidgetKind = HomeWidget | 'progress' | 'deadlines' | 'memo' | 'links' | 'journal'
export type DashboardItem = { key:string; kind:WidgetKind; x:number; y:number; w:number; h:number; title?:string; classId?:string; text?:string; options?:Partial<WidgetOptions> }
export type DashboardState = { layouts:Record<string,DashboardItem[]> }
export const dashboardLabels:Record<WidgetKind,string> = {...homeWidgetLabels,progress:'학급별 진도',deadlines:'다가오는 마감',memo:'빠른 메모',links:'바로가기',journal:'최근 수업 기록'}
const overlaps=(a:DashboardItem,b:DashboardItem)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y
export function fitDashboard(items:DashboardItem[],cols:number,pinned?:string){
 const sorted=[...items].sort((a,b)=>Number(b.key===pinned)-Number(a.key===pinned))
 const out:DashboardItem[]=[]
 for(const raw of sorted){const w=Math.max(1,Math.min(cols,Math.round(raw.w)||2)),h=Math.max(2,Math.min(24,Math.round(raw.h)||4));const item={...raw,w,h,x:Math.max(0,Math.min(cols-w,Math.round(raw.x)||0)),y:Math.max(0,Math.min(10000,Math.round(raw.y)||0))};while(out.some(other=>overlaps(item,other)))item.y++;out.push(item)}
 return items.map(item=>out.find(v=>v.key===item.key)!)
}
export default function FlexibleDashboard({data,update,render}:{data:AppData;update:(change:Partial<AppData>)=>void;render:(item:DashboardItem,change:(patch:Partial<DashboardItem>)=>void)=>ReactNode}){
 const host=useRef<HTMLDivElement>(null)
 const [settingsKey,setSettingsKey]=useState<string|null>(null)
 const [width,setWidth]=useState(1000),[editing,setEditing]=useState(false),[picker,setPicker]=useState(false),[preview,setPreview]=useState<DashboardItem[]|null>(null),[message,setMessage]=useState('')
 useEffect(()=>{const node=host.current!;const observer=new ResizeObserver(entries=>setWidth(entries[0].contentRect.width));observer.observe(node);return()=>observer.disconnect()},[])
 const profile=width<600?'phone':width<1100?'laptop':width<1600?'desktop':width<2100?'wide':'ultrawide'
 const cols={phone:2,laptop:8,desktop:12,wide:16,ultrawide:20}[profile]
 const saved=data.workspacePreferences.dashboard?.layouts[profile]
 const initial:DashboardItem[]=data.workspacePreferences.homeLayout.map(item=>({key:item.id,kind:item.id,options:widgetOptions(data.workspacePreferences),x:Math.round(item.column*cols/12),y:item.row*2,w:Math.max(Math.min(cols,2),Math.round(item.width*cols/12)),h:Math.max(item.id==='summary'?2:3,item.height*2)}))
 const items=preview||fitDashboard(saved||initial,cols)
 const available=[...availableHomeWidgets(data),...(data.settings.features.teaching?['progress','journal']:[]),...(data.settings.features.work?['deadlines']:[]),'memo','links'] as WidgetKind[]
 const visible=items.filter(item=>available.includes(item.kind))
 const commit=(next:DashboardItem[])=>{update({workspacePreferences:{...data.workspacePreferences,dashboard:{layouts:{...data.workspacePreferences.dashboard?.layouts,[profile]:fitDashboard(next,cols)}}}});setPreview(null)}
 const change=(key:string,patch:Partial<DashboardItem>)=>commit(fitDashboard(items.map(item=>item.key===key?{...item,...patch}:item),cols,key))
 const gesture=useRef<{key:string;mode:'move'|'resize';sx:number;sy:number;original:DashboardItem[];next:DashboardItem[];profile:string}|null>(null)
 const begin=(event:PointerEvent<HTMLButtonElement>,item:DashboardItem,mode:'move'|'resize')=>{event.preventDefault();event.currentTarget.setPointerCapture(event.pointerId);gesture.current={key:item.key,mode,sx:event.clientX,sy:event.clientY,original:items,next:items,profile}}
 const move=(event:PointerEvent<HTMLButtonElement>)=>{const g=gesture.current;if(!g||g.profile!==profile)return;const dx=Math.round((event.clientX-g.sx)/((width+12)/cols)),dy=Math.round((event.clientY-g.sy)/64);g.next=fitDashboard(g.original.map(item=>item.key!==g.key?item:g.mode==='move'?{...item,x:item.x+dx,y:item.y+dy}:{...item,w:item.w+dx,h:item.h+dy}),cols,g.key);setPreview(g.next)}
 const finish=()=>{const g=gesture.current;gesture.current=null;if(g&&g.profile===profile)commit(g.next);else setPreview(null)}
 useEffect(()=>{gesture.current=null;setPreview(null);setSettingsKey(null)},[profile])
 return <div ref={host} className="flex-dashboard">
 <div className="fd-toolbar"><div><h2>내 대시보드</h2><small>{cols}칸 · {({phone:'작은 화면',laptop:'노트북',desktop:'데스크톱',wide:'큰 모니터',ultrawide:'초대형 화면'})[profile]} 배치 자동 저장</small></div><div className="fd-actions"><button onClick={()=>setPicker(!picker)} aria-expanded={picker}>＋ 위젯 추가</button><button className={editing?'primary-button':''} onClick={()=>setEditing(!editing)}>{editing?'편집 완료':'화면 편집'}</button>{editing&&<button onClick={()=>{if(window.confirm('현재 화면 크기의 위젯 배치를 기본값으로 되돌릴까요? 메모 위젯의 내용도 제거됩니다.')){commit(initial);setSettingsKey(null)}}}>기본 배치로</button>}</div></div>
 {picker&&<div className="fd-picker">{available.map(kind=><button key={kind} onClick={()=>{const key=crypto.randomUUID();const w=kind==='calendar'?Math.min(cols,8):Math.min(cols,4);const h=kind==='calendar'?8:4;let next:DashboardItem={key,kind,x:0,y:0,w,h,options:widgetOptions(data.workspacePreferences)};while(items.some(item=>overlaps(item,next)))next={...next,y:next.y+1};commit([...items,next]);setEditing(true);setMessage(`${dashboardLabels[kind]} 위젯을 추가했습니다.`)}}>＋ {dashboardLabels[kind]}</button>)}</div>}
 {editing&&<p className="hint">제목 왼쪽 손잡이로 이동 · 오른쪽 아래 손잡이로 가로·세로 조절 · 숫자로도 위치와 크기를 바꿀 수 있습니다. 같은 위젯을 여러 개 추가할 수 있습니다.</p>}
 <span role="status" className="fd-status">{message}</span>
 {!visible.length&&<p className="banner">위젯 추가를 눌러 대시보드를 구성하세요.</p>}
 <div className="fd-grid" style={{gridTemplateColumns:`repeat(${cols}, minmax(0,1fr))`,gridTemplateRows:`repeat(${Math.max(1,...visible.map(item=>item.y+item.h))},52px)`}}>
 {visible.map(item=><section key={item.key} className={`fd-widget ${editing?'fd-editing':''}`} style={{gridColumn:`${item.x+1}/span ${item.w}`,gridRow:`${item.y+1}/span ${item.h}`} as CSSProperties}>
 <div className="fd-heading">{editing&&<button aria-label={`${dashboardLabels[item.kind]} 이동`} className="fd-move" onPointerDown={e=>begin(e,item,'move')} onPointerMove={move} onPointerUp={finish} onPointerCancel={()=>{gesture.current=null;setPreview(null)}}>⠿</button>}<strong>{item.title||dashboardLabels[item.kind]}</strong><button aria-label={`${item.title||dashboardLabels[item.kind]} 설정`} onClick={()=>setSettingsKey(item.key)}>⚙</button>{editing&&<button aria-label="위젯 제거" onClick={()=>commit(items.filter(v=>v.key!==item.key))}>×</button>}</div>

 <div className={`fd-body home-widget home-widget-${item.kind}`} style={{'--widget-rows':item.h/2} as CSSProperties}>{item.kind==='memo'||item.kind==='links'?<textarea aria-label={dashboardLabels[item.kind]} placeholder={item.kind==='memo'?'메모를 입력하세요.':'자료 이름과 https:// 주소를 입력하세요.'} value={item.text||''} onChange={e=>change(item.key,{text:e.target.value})}/>:render(item,patch=>change(item.key,patch))}{item.kind==='links'&&(item.text||'').split('\n').map((line,i)=>{const match=line.match(/https?:\/\/[^\s]+/);return match?<a key={i} href={match[0]} target="_blank" rel="noreferrer">{line.replace(match[0],'').trim()||match[0]}</a>:null})}</div>
 {editing&&<button aria-label={`${dashboardLabels[item.kind]} 크기 조절`} className="fd-resize" onPointerDown={e=>begin(e,item,'resize')} onPointerMove={move} onPointerUp={finish} onPointerCancel={()=>{gesture.current=null;setPreview(null)}}>↘</button>}
 </section>)}
 </div>{settingsKey&&items.find(item=>item.key===settingsKey)&&<WidgetOptionsDialog key={settingsKey} data={data} item={items.find(item=>item.key===settingsKey)!} cols={cols} change={patch=>change(settingsKey,patch)} onClose={()=>setSettingsKey(null)}/>}</div>
}
