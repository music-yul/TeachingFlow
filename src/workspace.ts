import {calendarSources,allCalendarSources} from './calendarSources'
import { clubMeetingsOn } from './clubSchedule'
import type { AppData, CalendarPreferences, CalendarRange, HomeWidget, HomeWidgetPlacement, WorkspacePreferences } from './types'
import { taskCoversDate, taskDeadline } from './taskDates'
import { collectionMembers } from './members'
import { dateKey } from './schedule'

export const homeWidgetLabels: Record<HomeWidget, string> = {
  timetable: '시간표', summary: '확인할 일 요약', calendar: '달력', lessons: '오늘의 수업', notices: '담임 안내',
  collections: '제출 현황', tasks: '오늘의 할 일', followups: '후속 확인',
}
export function defaultWorkspacePreferences(): WorkspacePreferences {
  return {
    dashboard: undefined,
    todayLessonFields: {period:true,className:true,subject:true,content:true,memo:true},
    timetableShowToday: false,
    homeTimetableMode: 'timetable',
    homeTimetableSubject: undefined,
    homeTimetableRoom: false,
    homeGridSize: 12,
    homeGridRows: 12,
    homeLayout: defaultHomeLayout(),
    homeWidgets: defaultHomeLayout().map(item=>item.id),
    workCalendar: { showWeekends:true, weekCount: 1, homeMode: 'weeks', range: 'month', filter: 'work', showCompleted: true },
    homeCalendar: { showWeekends:true, weekCount: 1, homeMode: 'weeks', range: 'week', filter: 'all', showCompleted: false },
    scheduleCalendar: { showWeekends:true, weekCount: 1, homeMode: 'weeks', range: 'month', filter: 'teaching', showCompleted: false },
  }
}
function normalizeCalendar(saved: Partial<CalendarPreferences> | undefined, base: CalendarPreferences): CalendarPreferences {
  return {
    ...(Array.isArray(saved?.sources)?{sources:[...new Set(saved.sources.filter(source=>allCalendarSources.includes(source)))]}:{}),
    showWeekends: saved?.showWeekends !== false,
    weekCount: Math.max(1,Math.min(5,Math.round(saved?.weekCount || (saved?.range==='fortnight'?2:1)))),
    homeMode: saved?.homeMode && ['month','week','fortnight','threeWeeks','weeks'].includes(saved.homeMode) ? saved.homeMode : base.homeMode || 'weeks',
    range: ['month', 'week', 'fortnight'].includes(saved?.range || '') ? saved!.range! : base.range,
    filter: ['all', 'teaching', 'homeroom', 'work', 'club'].includes(saved?.filter || '') ? saved!.filter! : base.filter,
    showCompleted: typeof saved?.showCompleted === 'boolean' ? saved.showCompleted : base.showCompleted,
  }
}
export function normalizeWorkspacePreferences(saved?: Partial<WorkspacePreferences>): WorkspacePreferences {
  const base = defaultWorkspacePreferences()
  const widgets = Array.isArray(saved?.homeWidgets)
    ? [...new Set(saved.homeWidgets.filter(id => Object.hasOwn(homeWidgetLabels, id)))] : base.homeWidgets
  const layout = Array.isArray(saved?.homeLayout)
    ? normalizeHomeLayout(saved.homeGridSize===12?saved.homeLayout:resizeHomeColumns(saved.homeGridSize===10?saved.homeLayout:saved.homeGridSize===8?saved.homeLayout:migrateHomeLayout(saved.homeLayout),saved.homeGridSize===10?10:8)) : saved ? layoutFromWidgets(widgets) : base.homeLayout
  return {
    dashboard: saved?.dashboard && typeof saved.dashboard === 'object' && saved.dashboard.layouts ? {...(saved.dashboard.version===2?{version:2 as const}:{}),layouts:Object.fromEntries(Object.entries(saved.dashboard.layouts).filter(([key,value])=>['phone','laptop','desktop','wide','ultrawide'].includes(key)&&Array.isArray(value)).map(([key,value])=>[key,value.filter(item=>item&&typeof item.key==='string'&&typeof item.kind==='string'&&[item.x,item.y,item.w,item.h].every(Number.isFinite))]))} : undefined,
    todayLessonFields: Object.fromEntries(['period','className','subject','content','memo'].map(key=>[key,saved?.todayLessonFields?.[key as keyof NonNullable<WorkspacePreferences['todayLessonFields']>]!==false])) as NonNullable<WorkspacePreferences['todayLessonFields']>,
    timetableShowToday: saved?.timetableShowToday === true,
    homeTimetableSubject: typeof saved?.homeTimetableSubject==='boolean'?saved.homeTimetableSubject:undefined,
    homeTimetableRoom: saved?.homeTimetableRoom===true,
    homeTimetableMode: ['timetable','both'].includes(saved?.homeTimetableMode||'') ? saved!.homeTimetableMode! : 'timetable',
    homeGridSize: 12,
    homeGridRows: 12,
    homeLayout: saved?.homeGridSize===12&&saved.homeGridRows!==12 ? normalizeHomeLayout(resizeHomeRows(layout)) : layout,
    homeWidgets: orderedHomeLayout(layout).map(item => item.id),
    homeCalendar: normalizeCalendar(saved?.homeCalendar, base.homeCalendar),
    workCalendar: { ...normalizeCalendar(saved?.workCalendar, base.workCalendar), filter: 'work', showCompleted: true },
    scheduleCalendar: { ...normalizeCalendar(saved?.scheduleCalendar, base.scheduleCalendar), filter: 'teaching' },
  }
}
export const HOME_GRID_SIZE = 12
export const HOME_GRID_ROWS = 12
export function defaultHomeLayout(): HomeWidgetPlacement[] {
  return [
    { id: 'summary', row: 0, column: 0, width: 12, height: 1 },
    { id: 'lessons', row: 1, column: 0, width: 2, height: 1 },
    { id: 'calendar', row: 1, column: 2, width: 10, height: 5 },
    { id: 'tasks', row: 2, column: 0, width: 2, height: 1 },
    { id: 'notices', row: 3, column: 0, width: 2, height: 1 },
    { id: 'collections', row: 4, column: 0, width: 2, height: 1 },
    { id: 'followups', row: 5, column: 0, width: 2, height: 1 },
  ]
}
export function orderedHomeLayout(layout: HomeWidgetPlacement[]) {
  return [...layout].sort((a,b) => a.row-b.row || a.column-b.column)
}
export function widgetsOverlap(a: HomeWidgetPlacement, b: HomeWidgetPlacement) {
  return a.column < b.column+b.width && a.column+a.width > b.column && a.row < b.row+b.height && a.row+a.height > b.row
}
const integer = (value: unknown, fallback: number, min: number, max: number) => typeof value === 'number' && Number.isFinite(value) ? Math.max(min, Math.min(max, Math.round(value))) : fallback
function safePlacement(item: HomeWidgetPlacement): HomeWidgetPlacement {
  const width = integer(item.width, 4, 1, HOME_GRID_SIZE)
  const height = integer(item.height, 2, 1, HOME_GRID_ROWS)
  return { id: item.id, width, height, column: integer(item.column, 0, 0, HOME_GRID_SIZE-width), row: integer(item.row, 0, 0, HOME_GRID_ROWS-height) }
}
function maskFor(item: HomeWidgetPlacement) {
  let mask=0n
  for(let row=item.row;row<item.row+item.height;row++) for(let column=item.column;column<item.column+item.width;column++) mask |= 1n << BigInt(row*HOME_GRID_SIZE+column)
  return mask
}
/** 12×12 안에서만 배치한다. 선택한 위젯 위치는 고정하고 나머지 위젯의 빈자리를 찾는다. */
function packHomeLayout(layout: HomeWidgetPlacement[], pinned?: HomeWidgetPlacement): HomeWidgetPlacement[] | null {
  if(layout.reduce((sum,item)=>sum+item.width*item.height,0)>HOME_GRID_SIZE*HOME_GRID_ROWS) return null
  const others=layout.filter(item=>item.id!==pinned?.id).sort((a,b)=>b.width*b.height-a.width*a.height)
  let attempts=0
  const search=(index:number,occupied:bigint,placed:HomeWidgetPlacement[]):HomeWidgetPlacement[]|null=>{
    if(index===others.length) return orderedHomeLayout(placed)
    if(++attempts>20000) return null
    const item=others[index]
    const positions:HomeWidgetPlacement[]=[]
    for(let row=0;row<=HOME_GRID_ROWS-item.height;row++) for(let column=0;column<=HOME_GRID_SIZE-item.width;column++) positions.push({...item,row,column})
    positions.sort((a,b)=>(Math.abs(a.row-item.row)+Math.abs(a.column-item.column))-(Math.abs(b.row-item.row)+Math.abs(b.column-item.column))||a.row-b.row||a.column-b.column)
    for(const next of positions){const mask=maskFor(next);if(occupied&mask)continue;const found=search(index+1,occupied|mask,[...placed,next]);if(found)return found}
    return null
  }
  return search(0,pinned?maskFor(pinned):0n,pinned?[pinned]:[])
}
export function homeWidgetPlacementError(layout:HomeWidgetPlacement[],p:HomeWidgetPlacement){
 if(![p.row,p.column,p.width,p.height].every(Number.isInteger)||p.row<0||p.column<0||p.width<1||p.height<1||p.row+p.height>HOME_GRID_ROWS||p.column+p.width>HOME_GRID_SIZE)return '위젯 전체가 12×12 배치판 안에 들어와야 합니다.'
 const collisions=layout.filter(item=>item.id!==p.id&&widgetsOverlap(item,p))
 return collisions.length?`${collisions.map(item=>homeWidgetLabels[item.id]).join(', ')} 영역과 겹칩니다. 다른 위젯은 이동하지 않았습니다.`:''
}
export function homeWidgetDropPosition(row:number,column:number,offset:{row:number;column:number}){return {row:row-offset.row,column:column-offset.column}}
export function placeHomeWidget(layout: HomeWidgetPlacement[], placement: HomeWidgetPlacement, allowReflow=true): HomeWidgetPlacement[] {
  if(!allowReflow&&homeWidgetPlacementError(layout,placement))return layout
  const chosen=safePlacement(placement)
  const items=[...layout.filter(item=>item.id!==chosen.id),chosen]
  if(items.every((item,i)=>items.every((other,j)=>i===j||!widgetsOverlap(item,other))))return orderedHomeLayout(items)
  return packHomeLayout(items,chosen)||layout
}
/** Add only into a free rectangle; never move existing widgets on add. */
export function addHomeWidget(layout:HomeWidgetPlacement[],id:HomeWidget):HomeWidgetPlacement[] {
  if(layout.some(item=>item.id===id))return layout
  const base=defaultHomeLayout().find(item=>item.id===id)||{id,row:0,column:0,width:4,height:3}
  const bottom=Math.max(0,...layout.map(item=>item.row+item.height))
  const candidates:HomeWidgetPlacement[]=[]
  for(let row=0;row<=HOME_GRID_ROWS-base.height;row++)for(let column=0;column<=HOME_GRID_SIZE-base.width;column++)candidates.push({...base,row,column})
  candidates.sort((a,b)=>Number(a.row<bottom)-Number(b.row<bottom)||a.row-b.row||a.column-b.column)
  const free=candidates.find(item=>layout.every(other=>!widgetsOverlap(item,other)))
  return free?orderedHomeLayout([...layout,free]):layout
}
/** 이전 위젯 선택을 유지하며, 배치가 넘칠 때만 큰 위젯부터 줄인다. */
export function normalizeHomeLayout(layout: HomeWidgetPlacement[]) {
  const items:HomeWidgetPlacement[]=[]
  layout.forEach(item=>{if(item&&Object.hasOwn(homeWidgetLabels,item.id)&&!items.some(old=>old.id===item.id))items.push(safePlacement(item))})
  if(items.every((item,index)=>items.every((other,j)=>index===j||!widgetsOverlap(item,other)))) return orderedHomeLayout(items)
  let packed=packHomeLayout(items)
  while(!packed){
    const largest=[...items].filter(item=>item.height>1||item.width>1).sort((a,b)=>b.width*b.height-a.width*a.height)[0]
    if(!largest) break
    if(largest.height>1)largest.height-=1;else largest.width-=1
    packed=packHomeLayout(items)
  }
  return packed||[]
}
function resizeHomeColumns(layout:HomeWidgetPlacement[],oldColumns:number){return layout.filter(item=>item&&Object.hasOwn(homeWidgetLabels,item.id)).map(item=>{const column=Math.round(item.column*12/oldColumns),end=Math.round((item.column+item.width)*12/oldColumns);return {...item,column,width:Math.max(1,end-column)}})}
function migrateHomeLayout(layout:HomeWidgetPlacement[]) {
  const valid=layout.filter(item=>item&&Object.hasOwn(homeWidgetLabels,item.id))
  const oldHeight=Math.max(8,...valid.map(item=>item.row+item.height))
  return valid.map(item=>({...item,column:item.column*2,width:item.width*2,row:Math.round(item.row*8/oldHeight),height:Math.max(1,Math.round(item.height*8/oldHeight))}))
}
export function layoutFromWidgets(ids:HomeWidget[]):HomeWidgetPlacement[]{
  return normalizeHomeLayout(ids.map(id=>({...(defaultHomeLayout().find(item=>item.id===id)||{id,row:0,column:0,width:4,height:3})})))
}
/** 일요일부터 토요일까지. 월·연도 경계도 날짜 연산으로 처리한다. */
export function calendarDates(anchor: Date, range: CalendarRange, weeks?: number) {
  const start = new Date(anchor.getFullYear(), anchor.getMonth(), range === 'month' && !weeks ? 1 : anchor.getDate())
  start.setDate(start.getDate() - start.getDay())
  const length = weeks ? integer(weeks,1,1,5)*7 : range === 'month' ? 42 : range === 'week' ? 7 : 14
  return Array.from({ length }, (_, index) => {
    const date = new Date(start); date.setDate(start.getDate() + index); return date
  })
}
export function shiftCalendar(anchor: Date, range: CalendarRange, step: number, weeks?: number) {
  if (range === 'month' && !weeks) return new Date(anchor.getFullYear(), anchor.getMonth() + step, 1)
  const next = new Date(anchor); next.setDate(next.getDate() + step * (weeks ? integer(weeks,1,1,5)*7 : range === 'week' ? 7 : 14)); return next
}
export type DeskCalendarItem = { id: string; area: 'homeroom' | 'work' | 'club'; title: string; done: boolean; important?: boolean; clubId?:string; recordId?:string;workKind?:'task'|'record';category?:string;deadline?:boolean }
/** 개인 상담 본문·학생 이름은 달력에 포함하지 않는다. */
export function deskCalendarItems(data: AppData, date: string, preferences: CalendarPreferences,includeWorkRecords=false): DeskCalendarItem[] {
  const items: DeskCalendarItem[] = []
  const desk = data.teacherDesk
  const sources=calendarSources(preferences)
  if (data.settings.features.homeroom && sources.includes('homeroom')) {
    desk.notices.filter(item => taskCoversDate(item, date, true)).forEach(item => items.push({ id: item.id, area: 'homeroom', title: `${item.endDate === date ? '마감' : item.date === date ? '안내' : '진행'} · ${item.title}`, done: item.done, important:item.important }))
    desk.collections.filter(item => !item.archived && item.date === date).forEach(item => {
      const targets = collectionMembers(desk,item,date)
      const received = targets.filter(student => item.received.includes(student.id)).length
      items.push({ id: item.id, area: 'homeroom', title: `취합 · ${item.title} (${received}/${targets.length}명)`, done: targets.length > 0 && received === targets.length, important:item.important })
    })
    const followups = desk.records.filter(item => item.followDate === date && (preferences.showCompleted || !item.followed))
    if (followups.length) items.push({ id: `followups-${date}`, area: 'homeroom', title: `학생 후속 확인 ${followups.length}건`, done: followups.every(item => item.followed) })
  }
  if (data.settings.features.work && sources.includes('work')) {
    if(includeWorkRecords)(desk.workRecords||[]).filter(record=>record.date===date).forEach(record=>items.push({id:`work-record:${record.id}`,recordId:record.id,workKind:'record',category:(record.category||'').trim(),area:'work',title:`기록 · ${record.title}`,done:false}))
    desk.tasks.filter(item => taskCoversDate(item, date)).forEach(item => {const deadline=taskDeadline(item)===date;items.push({id:item.id,area:'work',workKind:'task',category:(item.category||'').trim(),deadline,title:deadline?item.title:`${item.category?`${item.category} · `:''}${item.title}`,done:item.done,important:item.important})})
  }
  if(data.settings.features.clubs&&sources.includes('club'))data.clubs.forEach(club=>{const periods=clubMeetingsOn(data,club,date);if(periods.length)items.push({id:`club-meeting:${club.id}:${date}`,clubId:club.id,area:'club',title:`${club.name} · ${periods.join('·')}교시`,done:false})})
  if(data.settings.features.clubs&&sources.includes('club'))data.clubs.forEach(club=>club.activities.filter(activity=>activity.date===date).forEach(activity=>items.push({id:`club:${club.id}:${activity.id}`,clubId:club.id,area:'club',title:`${club.name} · ${activity.title}`,done:false,important:activity.important})))
  return items.filter(item => preferences.showCompleted || !item.done)
}
export function calendarPeriodLabel(anchor: Date, range: CalendarRange, weeks?: number) {
  if (range === 'month' && !weeks) return `${anchor.getFullYear()}년 ${anchor.getMonth() + 1}월`
  const cells = calendarDates(anchor, range, weeks)
  return `${dateKey(cells[0])} ~ ${dateKey(cells.at(-1)!)}`
}

export function availableHomeWidgets(data: AppData): HomeWidget[] {
  return (Object.keys(homeWidgetLabels) as HomeWidget[]).filter(id=>data.settings.features.homeroom||!['notices','collections','followups'].includes(id)).filter(id=>data.settings.features.teaching||!['lessons','timetable'].includes(id)).filter(id=>data.settings.features.work||id!=='tasks')
}

export function resizeHomeRows(layout:HomeWidgetPlacement[]){
 return layout.map(item=>{const row=Math.round(item.row*12/10),end=Math.round((item.row+item.height)*12/10);return {...item,row,height:Math.max(1,end-row)}})
}
