import { createRequire } from 'node:module'
import assert from 'node:assert/strict'
const require = createRequire(process.cwd() + '/package.json')
const { createServer } = require('vite')
const React = require('react')
const { renderToStaticMarkup } = require('react-dom/server')
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' })
try {
 const storage = await server.ssrLoadModule('/src/storage.ts')
 const { default: View } = await server.ssrLoadModule('/src/components/TeacherDeskView.tsx')
 let raw = null
 globalThis.localStorage = { getItem: () => raw, setItem: (_key, value) => { raw = value } }
 const legacy = storage.emptyData(); delete legacy.teacherDesk; legacy.subjects = [{id:'s',name:'음악',color:'#000',usesProgress:true}]
 raw = JSON.stringify(legacy)
 const migrated = storage.readData()
 assert.equal(migrated.subjects[0].name, '음악')
 assert.deepEqual(migrated.teacherDesk.records, [])
 migrated.settings.features.homeroom=true
 const day = new Date(); const today = `${day.getFullYear()}-${String(day.getMonth()+1).padStart(2,'0')}-${String(day.getDate()).padStart(2,'0')}`
 migrated.teacherDesk.students = [{id:'student',number:2301,name:'테스트학생'}]
 migrated.teacherDesk.notices = [{id:'notice',title:'오늘안내',date:today,done:false,category:'',note:'준비물',link:''}]
 migrated.teacherDesk.tasks = [{id:'task',title:'업무확인',date:today,done:false,category:'방송부',note:'',link:'https://example.com'}]
 migrated.teacherDesk.collections = [{id:'collection',title:'동의서',date:today,studentIds:['student'],received:[],archived:false}]
 migrated.teacherDesk.records = [{id:'record',studentId:'student',date:today,kind:'상담',text:'PRIVATE_SENTINEL',followDate:today,followed:false}]
 assert.equal(storage.writeData(migrated),true)
 assert.deepEqual(storage.readData().teacherDesk,migrated.teacherDesk)
 const imported = await storage.importData({text:async()=>JSON.stringify(migrated)})
 assert.deepEqual(imported.teacherDesk,migrated.teacherDesk)
 const props = {data:migrated,sessions:[],update:()=>{},onSelect:()=>{},onNavigate:()=>{}}
 for (const mode of ['오늘','담임','업무']) {
  const html = renderToStaticMarkup(React.createElement(View,{...props,mode}))
  assert.ok(!html.includes('PRIVATE_SENTINEL'),`${mode} leaks private record`)
  if(mode==='오늘') { assert.ok(html.includes('오늘안내')); assert.ok(html.includes('업무확인')); assert.ok(html.includes('0/1')); }
  if(mode==='담임') { assert.ok(html.includes('2301')); assert.ok(html.includes('동의서')); }
  if(mode==='업무') assert.ok(html.includes('https://example.com/'))
 }
 const workspace = await server.ssrLoadModule('/src/workspace.ts')
 const { dateKey } = await server.ssrLoadModule('/src/schedule.ts')
 const { default: Calendar } = await server.ssrLoadModule('/src/components/CalendarView.tsx')
 const { default: Today } = await server.ssrLoadModule('/src/components/TodayView.tsx')
 for (const [anchor, expected] of [
  [new Date(2026,9,16), ['2026-10-11','2026-10-17']],
  [new Date(2026,9,18), ['2026-10-18','2026-10-24']],
  [new Date(2027,0,1), ['2026-12-27','2027-01-02']],
 ]) {
  const week = workspace.calendarDates(anchor,'week')
  assert.equal(week.length,7); assert.equal(dateKey(week[0]),expected[0]); assert.equal(dateKey(week.at(-1)),expected[1])
  assert.equal(workspace.calendarDates(anchor,'fortnight').length,14)
 }
 for (let month=0; month<12; month++) {
  const dates=workspace.calendarDates(new Date(2028,month,15),'month')
  assert.equal(dates.length,42); assert.equal(dates[0].getDay(),0)
  assert.ok(dates.some(d=>dateKey(d)===dateKey(new Date(2028,month,1))))
  assert.ok(dates.some(d=>dateKey(d)===dateKey(new Date(2028,month+1,0))))
 }
 assert.equal(dateKey(workspace.shiftCalendar(new Date(2026,11,31),'week',1)),'2027-01-07')
 assert.equal(dateKey(workspace.shiftCalendar(new Date(2026,11,31),'month',1)),'2027-01-01')
 const calendarData = structuredClone(migrated)
 calendarData.settings.useHolidays=false
 calendarData.dayNotes[today]=[{id:'note',text:'TEACHING_NOTE'}]
 calendarData.teacherDesk.tasks.push({...calendarData.teacherDesk.tasks[0],id:'completed',title:'COMPLETED_TASK',done:true})
 const fakeSession={id:'session',date:today,classId:'c',subjectId:'s',period:1,lessonIds:[],mode:'normal',label:'TEACHING_SESSION'}
 for(const range of ['month','week','fortnight']) for(const filter of ['all','teaching','homeroom','work']) {
  calendarData.workspacePreferences.homeCalendar={range,homeMode:range,filter,showCompleted:false}
  calendarData.workspacePreferences.homeLayout=[{id:'calendar',row:0,column:0,width:8,height:range==='month'?6:range==='week'?1:2}]
  const html=renderToStaticMarkup(React.createElement(Calendar,{context:'home',data:calendarData,sessions:[fakeSession],month:new Date(),setMonth:()=>{},onSelect:()=>{},update:()=>{},onOpenArea:()=>{}}))
  assert.equal((html.match(/class="calendar-day(?: [^"]*)?"/g)||[]).length,range==='month'?42:range==='week'?7:14)
  assert.ok(html.includes('TEACHING_NOTE'))
  assert.equal(html.includes('오늘안내'),filter==='all'||filter==='homeroom')
  assert.equal(html.includes('업무확인'),filter==='all'||filter==='work')
  assert.ok(!html.includes('COMPLETED_TASK'));assert.ok(!html.includes('calendar-item-complete'));assert.ok(html.includes('calendar-task-dialog')); assert.ok(!html.includes('PRIVATE_SENTINEL'))
  assert.ok(!html.includes('테스트학생'),'calendar leaks student identity')
 }
 const workPrefs={range:'week',filter:'work',showCompleted:true}
 assert.ok(workspace.deskCalendarItems(calendarData,today,workPrefs).some(item=>item.title.includes('COMPLETED_TASK')))
 assert.ok(!workspace.deskCalendarItems(calendarData,today,{...workPrefs,showCompleted:false}).some(item=>item.title.includes('COMPLETED_TASK')))
 calendarData.workspacePreferences.homeCalendar={range:'week',homeMode:'week',filter:'work',showCompleted:true}
 const completedHome=renderToStaticMarkup(React.createElement(Calendar,{context:'home',data:calendarData,sessions:[],month:new Date(),setMonth:()=>{},onSelect:()=>{},update:()=>{}}))
 assert.ok(completedHome.includes('COMPLETED_TASK'));assert.ok(completedHome.includes('background-color:#f0f1f2'))
 assert.ok(completedHome.indexOf('calendar-completed-toggle')<completedHome.indexOf('calendar-options-dialog'))

 const prefs=workspace.normalizeWorkspacePreferences({homeWidgets:['tasks','calendar','tasks','INVALID'],homeCalendar:{range:'fortnight',filter:'work',showCompleted:true}})
 assert.deepEqual([...prefs.homeWidgets].sort(),['calendar','tasks'])
 prefs.homeLayout=[{id:'tasks',row:0,column:0,width:4,height:2},{id:'calendar',row:2,column:0,width:8,height:2}]
 prefs.homeWidgets=['tasks','calendar']
 assert.equal(prefs.homeCalendar.range,'fortnight'); assert.equal(prefs.scheduleCalendar.range,'month')
 calendarData.workspacePreferences=prefs
 storage.writeData(calendarData)
 assert.deepEqual(storage.readData().workspacePreferences,prefs)
 assert.deepEqual((await storage.importData({text:async()=>raw})).workspacePreferences,prefs)
 const homeHtml=renderToStaticMarkup(React.createElement(Today,{...props,data:calendarData}))
 assert.ok(homeHtml.indexOf('오늘의 할 일')<homeHtml.indexOf('calendar-panel'),'home order not applied')
 assert.ok(!homeHtml.includes('오늘의 수업'),'hidden widget rendered')
 assert.ok(!homeHtml.includes('desk-stats'),'hidden summary rendered')
 assert.ok(!homeHtml.includes('PRIVATE_SENTINEL'))
 calendarData.workspacePreferences.homeWidgets=[]
 calendarData.workspacePreferences.homeLayout=[]
 const emptyHome=renderToStaticMarkup(React.createElement(Today,{...props,data:calendarData}))
 assert.ok(emptyHome.includes('환경 설정 → 메인화면'))
 assert.ok(!emptyHome.includes('calendar-panel'))
 // Saved v4.3 settings migrate to non-overlapping widget coordinates.
 const oldPrefs=workspace.normalizeWorkspacePreferences({homeWidgets:['tasks','calendar','notices'],homeCalendar:{range:'fortnight',filter:'work',showCompleted:true}})
 assert.deepEqual([...oldPrefs.homeWidgets].sort(),['calendar','notices','tasks'])
 assert.ok(oldPrefs.homeLayout.every(item=>item.width>=1&&item.column+item.width<=12))
 const verifyLayout = items => { for(let i=0;i<items.length;i++) for(let j=i+1;j<items.length;j++) assert.ok(!workspace.widgetsOverlap(items[i],items[j]),'widgets overlap') }
 verifyLayout(oldPrefs.homeLayout)
 let layout=workspace.defaultHomeLayout()
 verifyLayout(layout)
 assert.deepEqual(layout.find(i=>i.id==='calendar'),{id:'calendar',row:1,column:2,width:10,height:5})
 assert.deepEqual(layout.filter(i=>['lessons','tasks','notices','collections','followups'].includes(i.id)).map(i=>[i.id,i.row,i.column,i.width,i.height]),[['lessons',1,0,2,1],['tasks',2,0,2,1],['notices',3,0,2,1],['collections',4,0,2,1],['followups',5,0,2,1]])
 assert.equal(workspace.defaultWorkspacePreferences().homeCalendar.homeMode,'weeks')
 const rejected=workspace.placeHomeWidget(layout,{id:'calendar',row:0,column:0,width:12,height:12})
 assert.equal(rejected,layout,'full grid should reject an oversized widget without changing the layout')
 layout=workspace.placeHomeWidget([{id:'tasks',row:0,column:0,width:4,height:2},{id:'calendar',row:2,column:0,width:8,height:2}],{id:'tasks',row:2,column:0,width:4,height:2})
 verifyLayout(layout)
 assert.equal(layout.find(item=>item.id==='tasks').row,2)
 assert.ok(layout.every(item=>item.row>=0&&item.column>=0&&item.row+item.height<=10&&item.column+item.width<=12))
 const malformed=workspace.normalizeHomeLayout([{id:'tasks',row:-2,column:99,width:9,height:0},{id:'tasks',row:1,column:1,width:1,height:1},{id:'INVALID',row:0,column:0,width:4,height:8}])
 assert.equal(malformed.length,1); assert.equal(malformed[0].width,9); assert.equal(malformed[0].column,3); assert.equal(malformed[0].height,1)
 calendarData.workspacePreferences.homeLayout=[{id:'tasks',row:2,column:2,width:2,height:3}]
 calendarData.workspacePreferences.homeWidgets=['tasks']
 const positioned=renderToStaticMarkup(React.createElement(Today,{...props,data:calendarData}))
 assert.ok(positioned.includes('grid-column:3 / span 2')); assert.ok(positioned.includes('grid-row:3 / span 3'))
 assert.ok(!positioned.includes('메인화면 구성 설정'))
 calendarData.workspacePreferences.scheduleCalendar={range:'week',filter:'work',showCompleted:false}
 const scheduleHtml=renderToStaticMarkup(React.createElement(Calendar,{data:calendarData,sessions:[fakeSession],month:new Date(),setMonth:()=>{},onSelect:()=>{},update:()=>{}}))
 assert.ok(scheduleHtml.includes('TEACHING_NOTE'))
 assert.ok(!scheduleHtml.includes('달력 일정 구분'))
 assert.ok(!scheduleHtml.includes('업무확인'))
 const {default:LayoutSettings}=await server.ssrLoadModule('/src/components/HomeLayoutSettings.tsx')
 const settingsHtml=renderToStaticMarkup(React.createElement(LayoutSettings,{data:calendarData,update:()=>{}}))
 assert.ok(settingsHtml.includes('메인화면 위젯 배치')); assert.ok(settingsHtml.includes('메인화면 12×12 배치판'))
 storage.writeData(calendarData)
 assert.deepEqual(storage.readData().workspacePreferences.homeLayout,calendarData.workspacePreferences.homeLayout)
 const taskDates=await server.ssrLoadModule('/src/taskDates.ts')
 const baseTask={id:'period',title:'기간 업무',date:'2026-10-10',endDate:'2026-10-20',scheduleType:'period',done:false,category:'',note:'',link:''}
 assert.equal(taskDates.taskCoversDate(baseTask,'2026-10-10'),true)
 assert.equal(taskDates.taskCoversDate(baseTask,'2026-10-15'),true)
 assert.equal(taskDates.taskCoversDate(baseTask,'2026-10-20'),true)
 assert.equal(taskDates.taskCoversDate(baseTask,'2026-10-21'),false)
 assert.equal(taskDates.isTaskOverdue(baseTask,'2026-10-15'),false)
 assert.equal(taskDates.isTaskOverdue(baseTask,'2026-10-21'),true)
 assert.equal(taskDates.taskCoversDate({...baseTask,scheduleType:'deadline'},'2026-10-11'),false)
 assert.equal(taskDates.taskCoversDate({...baseTask,scheduleType:'todo'},'2026-10-10'),false)
 const notice={...baseTask,id:'notice',title:'기간 안내',scheduleType:undefined}
 assert.equal(taskDates.taskCoversDate(notice,'2026-10-18',true),true)
 assert.ok(taskDates.taskDateLabel(notice,true).includes('안내 2026-10-10 · 마감 2026-10-20'))
 const periodData=structuredClone(migrated)
 periodData.teacherDesk.tasks=[baseTask,{...baseTask,id:'todo',title:'할일ONLY',date:'',scheduleType:'todo'}]
 periodData.teacherDesk.notices=[notice]
 const homePrefs={range:'month',filter:'all',showCompleted:false}
 assert.ok(workspace.deskCalendarItems(periodData,'2026-10-15',homePrefs).some(item=>item.id==='period'))
 assert.ok(workspace.deskCalendarItems(periodData,'2026-10-15',homePrefs).some(item=>item.id==='notice'))
 assert.ok(!workspace.deskCalendarItems(periodData,'2026-10-15',homePrefs).some(item=>item.id==='todo'))
 assert.ok(!workspace.deskCalendarItems(periodData,'2026-10-21',homePrefs).some(item=>['period','notice','todo'].includes(item.id)))
 const {default:Roster}=await server.ssrLoadModule('/src/components/HomeroomRoster.tsx')
 periodData.teacherDesk.homeroomAttendance[`${today}:student`]='결석'
 const rosterHtml=renderToStaticMarkup(React.createElement(Roster,{data:periodData,update:()=>{},selected:'',onSelect:()=>{}}))
 assert.ok(rosterHtml.includes('결석</option>')); assert.ok(rosterHtml.includes('확인 1/1명'))
 storage.writeData(periodData)
 assert.equal(storage.readData().teacherDesk.homeroomAttendance[`${today}:student`],'결석')
 assert.ok(!Object.keys(storage.readData().attendance).length,'homeroom marked teaching attendance')
 const {default:Work}=await server.ssrLoadModule('/src/components/WorkView.tsx')
 const workHtml=renderToStaticMarkup(React.createElement(Work,{data:periodData,sessions:[],update:()=>{}}))
 assert.ok(workHtml.includes('work-calendar'));assert.ok(workHtml.includes('work-editor'));assert.ok(workHtml.includes('기간으로 등록'));assert.ok(workHtml.includes('마감일 표시'))
 const fullHome=renderToStaticMarkup(React.createElement(View,{...props,data:periodData,mode:'오늘'}))
 assert.ok(!fullHome.includes('오늘의 티칭플로'));assert.ok(!fullHome.includes('오늘 확인할 일을 한곳에서'))
 assert.ok(fullHome.includes('grid-template-rows:repeat('))
 const calHtml=renderToStaticMarkup(React.createElement(Calendar,{context:'home',data:periodData,sessions:[],month:new Date(2026,9,16),setMonth:()=>{},onSelect:()=>{},update:()=>{}}))
 assert.ok(calHtml.includes('<b>일</b><b>월</b><b>화</b><b>수</b><b>목</b><b>금</b><b>토</b>'))
 assert.ok(!calHtml.includes('월요일 ~ 일요일'))
 assert.ok(!calHtml.includes('달력 보기 기간'))
 assert.ok(calHtml.indexOf('달력 일정 구분')<calHtml.indexOf('엑셀로 내보내기'))
 const {default:App}=await server.ssrLoadModule('/src/App.tsx')
 raw=JSON.stringify(periodData)
 const appHtml=renderToStaticMarkup(React.createElement(App))
 const nav=appHtml.match(/<nav class="tabbar">(.*?)<\/nav>/s)[1]
 assert.equal((nav.match(/class="tab-index"/g)||[]).length,5)
 for (const title of ['오늘','담임','교과','업무','환경설정']) assert.ok(nav.includes(title))
 assert.ok(!nav.includes('수업 일정'));assert.ok(!nav.includes('평가·성적'))
 const {default:Teaching}=await server.ssrLoadModule('/src/components/TeachingHub.tsx')
 const teachingHtml=renderToStaticMarkup(React.createElement(Teaching,{data:periodData,sessions:[],update:()=>{},tab:'출결 관리',setTab:()=>{},onSelect:()=>{},onOpenEvaluation:()=>{},evalJump:null,onJumpHandled:()=>{}}))
 assert.ok(teachingHtml.includes('진도 관리'));assert.ok(teachingHtml.includes('출결 관리'));assert.ok(teachingHtml.includes('평가·성적'));assert.ok(teachingHtml.indexOf('>진도 관리</button>')<teachingHtml.indexOf('>학급 설정</button>'));assert.ok(teachingHtml.indexOf('>모둠 뽑기</button>')<teachingHtml.indexOf('>학급 설정</button>'))
 const homeBase=structuredClone(migrated)
 for(let height=1;height<=10;height++){
  homeBase.workspacePreferences.homeLayout=[{id:'calendar',row:0,column:0,width:8,height}]
  // Old saved range must have no effect on the height-based home calendar.
  homeBase.workspacePreferences.homeCalendar.range='month'
  const html=renderToStaticMarkup(React.createElement(Calendar,{context:'home',data:homeBase,sessions:[],month:new Date(2026,11,31),setMonth:()=>{},onSelect:()=>{},update:()=>{}}))
  assert.equal((html.match(/class="calendar-day(?: [^"]*)?"/g)||[]).length,28)
  assert.ok(html.includes(`data-weeks="4"`));assert.ok(!html.includes('달력 보기 기간'))
  const dates=workspace.calendarDates(new Date(2026,11,31),'month',height)
  assert.equal(dates[0].getDay(),0);assert.equal(dates.length,Math.min(5,height)*7)
  assert.equal(dateKey(workspace.shiftCalendar(new Date(2026,11,31),'month',1,height)),dateKey(new Date(2026,11,31+Math.min(5,height)*7)))
 }
 for(const mode of ['week','fortnight','month']) for(const height of [1,4,8]){
  homeBase.workspacePreferences.homeCalendar.homeMode=mode
  homeBase.workspacePreferences.homeLayout=[{id:'calendar',row:0,column:0,width:8,height}]
  const fixed=renderToStaticMarkup(React.createElement(Calendar,{context:'home',data:homeBase,sessions:[],month:new Date(2026,9,19),setMonth:()=>{},onSelect:()=>{},update:()=>{}}))
  assert.equal((fixed.match(/class="calendar-day(?: [^"]*)?"/g)||[]).length,mode==='month'?42:mode==='week'?7:14)
  const restored=await storage.importData({text:async()=>JSON.stringify(homeBase)})
  assert.equal(restored.workspacePreferences.homeCalendar.homeMode,mode)
 }
 homeBase.workspacePreferences.homeCalendar.homeMode='weeks'
 const tenthRow=workspace.placeHomeWidget([],{id:'tasks',row:9,column:9,width:1,height:1})
 assert.deepEqual(tenthRow,[{id:'tasks',row:9,column:9,width:1,height:1}]);assert.deepEqual(workspace.normalizeHomeLayout([{id:'calendar',row:0,column:0,width:12,height:12}]),[{id:'calendar',row:0,column:0,width:12,height:12}])
 const oldGrid=workspace.normalizeWorkspacePreferences({homeLayout:[{id:'calendar',row:1,column:0,width:4,height:4},{id:'tasks',row:8,column:0,width:2,height:3}],homeWidgets:['calendar','tasks']})
 assert.equal(oldGrid.homeGridSize,12);assert.equal(oldGrid.homeLayout.length,2);verifyLayout(oldGrid.homeLayout)
 assert.ok(oldGrid.homeLayout.every(item=>item.row+item.height<=10&&item.column+item.width<=12))
 const savedGrid=workspace.normalizeWorkspacePreferences({homeGridSize:8,homeLayout:[{id:'tasks',row:6,column:6,width:2,height:2}]})
 assert.deepEqual(savedGrid.homeLayout,[{id:'tasks',row:6,column:9,width:3,height:2}]);assert.deepEqual(workspace.normalizeWorkspacePreferences(savedGrid).homeLayout,savedGrid.homeLayout)
 homeBase.events=[{id:'school-event',date:today,title:'SCHOOL_EVENT_VISIBLE',type:'note',periods:[],classIds:[]}]
 homeBase.dayNotes[today]=[{id:'secret-note',text:'CALENDAR_MEMO'}]
 const workCalendar=renderToStaticMarkup(React.createElement(Calendar,{context:'work',data:homeBase,sessions:[fakeSession],month:new Date(),setMonth:()=>{},onSelect:()=>{},update:()=>{}}))
 assert.ok(workCalendar.includes('SCHOOL_EVENT_VISIBLE'));assert.ok(workCalendar.includes('CALENDAR_MEMO'))
 const layoutHtml=renderToStaticMarkup(React.createElement(LayoutSettings,{data:homeBase,update:()=>{}}))
 assert.equal((layoutHtml.match(/class="layout-slot"/g)||[]).length,144)
 assert.ok(!layoutHtml.includes('보기 기간'));assert.ok(layoutHtml.includes('12×12'))
 const {default:Settings}=await server.ssrLoadModule('/src/components/SettingsHub.tsx')
 const settingsNav=renderToStaticMarkup(React.createElement(Settings,{data:homeBase,update:()=>{},onFiles:()=>{},onImport:()=>{},onReset:()=>{}}))
 assert.ok(settingsNav.includes('>디자인</button>'));assert.ok(!settingsNav.includes('>화면</button>'))
 assert.ok(!settingsNav.includes('>학급 설정</button>'));assert.ok(settingsNav.includes('>메인화면</button>'))
 assert.ok(settingsNav.includes('처음 사용 안내'),'settings opens with optional feature setup guide')
 const {default:HelpGuide}=await server.ssrLoadModule('/src/components/HelpView.tsx')
 const initialHelp=renderToStaticMarkup(React.createElement(HelpGuide))
 for(const html of [settingsNav,initialHelp]){
  assert.ok(html.includes('담임·동아리·업무만 사용할 수도'))
  for(const step of ['사용할 기능 선택','학기와 학사일정 설정','켠 기능만 준비','메인화면 구성과 백업'])assert.ok(html.includes(step))
  for(const path of ['담임 명단 설정','동아리·명단 설정','동아리 유형·시간표 설정','데이터 관리'])assert.ok(html.includes(path))
  assert.ok(!html.includes('PRIVATE_SENTINEL'))
 }
 assert.ok(settingsNav.includes('학급 설정 열기'));assert.ok(settingsNav.includes('학사일정 열기'))
 assert.ok(initialHelp.includes('교과를 사용할 때 · 출석부와 진도표 상세 설정'))
 const {default:AcademicEvents}=await server.ssrLoadModule('/src/components/EventsView.tsx')
 const academicHtml=renderToStaticMarkup(React.createElement(AcademicEvents,{data:homeBase,update:()=>{}}))
 assert.ok(academicHtml.includes('academic-layout'));assert.ok(academicHtml.includes('<details class="academic-registered">'));assert.ok(!academicHtml.includes('<details class="academic-registered" open'))
 assert.ok(academicHtml.includes('SCHOOL_EVENT_VISIBLE'));assert.ok(!academicHtml.includes('CALENDAR_MEMO'))
 const migratedEight=workspace.normalizeWorkspacePreferences({homeGridSize:8,homeLayout:[{id:'calendar',row:0,column:0,width:8,height:2},{id:'tasks',row:2,column:0,width:4,height:2},{id:'notices',row:2,column:4,width:4,height:2}]})
 assert.equal(migratedEight.homeLayout.find(i=>i.id==='calendar').width,12);assert.equal(migratedEight.homeLayout.find(i=>i.id==='notices').column,6);verifyLayout(migratedEight.homeLayout)
 assert.deepEqual(workspace.normalizeWorkspacePreferences(migratedEight).homeLayout,migratedEight.homeLayout)

 const {blankTask,taskForEditing}=taskDates
 const dated=blankTask()
 assert.equal(dated.date,today);assert.equal(dated.scheduleType,'dated');assert.equal(dated.showDeadline,false)
 assert.equal(taskDates.taskCoversDate(dated,today),true);assert.equal(taskDates.taskDeadline(dated),'')
 const dateTask={...dated,id:'dated',date:'2026-10-19',showDeadline:true,deadlineDate:'2026-10-23'}
 assert.equal(taskDates.taskCoversDate(dateTask,'2026-10-19'),true)
 assert.equal(taskDates.taskCoversDate(dateTask,'2026-10-20'),false)
 assert.equal(taskDates.taskCoversDate(dateTask,'2026-10-23'),true)
 assert.equal(taskDates.isTaskOverdue(dateTask,'2026-10-22'),false)
 assert.equal(taskDates.isTaskOverdue(dateTask,'2026-10-24'),true)
 const periodNoDeadline={...dateTask,scheduleType:'period',endDate:'2026-10-21',showDeadline:false,deadlineDate:''}
 assert.equal(taskDates.taskCoversDate(periodNoDeadline,'2026-10-20'),true)
 assert.equal(taskDates.isTaskOverdue(periodNoDeadline,'2026-10-25'),false)
 const editedLegacy=taskForEditing({...baseTask,scheduleType:'deadline'})
 assert.equal(editedLegacy.showDeadline,true);assert.equal(editedLegacy.deadlineDate,baseTask.date);assert.equal(editedLegacy.date,baseTask.date)
 for(let height=1;height<=8;height++){
  homeBase.workspacePreferences.homeLayout=[{id:'calendar',row:0,column:0,width:1,height}]
  homeBase.workspacePreferences.homeCalendar.homeMode='month'
  const monthly=renderToStaticMarkup(React.createElement(Calendar,{context:'home',data:homeBase,sessions:[],month:new Date(2026,9,19),setMonth:()=>{},onSelect:()=>{},update:()=>{}}))
  assert.equal((monthly.match(/class="calendar-day(?: [^"]*)?"/g)||[]).length,42)
   assert.ok(monthly.includes('data-home-mode="month"'));assert.ok(monthly.includes('월별 달력'));assert.ok(monthly.includes('주간 달력'))
 }
 const disabled=structuredClone(migrated)
 disabled.settings.features={homeroom:false,clubs:false,teaching:true,work:true}
 raw=JSON.stringify(disabled)
 const disabledHtml=renderToStaticMarkup(React.createElement(App))
 const disabledNav=disabledHtml.match(/<nav class="tabbar">(.*?)<\/nav>/s)[1]
 assert.equal((disabledNav.match(/class="tab-index"/g)||[]).length,4)
 assert.ok(!disabledNav.includes('담임'));assert.ok(!disabledNav.includes('동아리'))
 assert.ok(!disabledHtml.includes('학생 후속 확인</h2>'));assert.ok(!disabledHtml.includes('담임 안내</h2>'))
 assert.equal(storage.readData().teacherDesk.students.length,1,'disabled feature discarded records')
 const oldTeacher=structuredClone(migrated);delete oldTeacher.settings.features;raw=JSON.stringify(oldTeacher)
 assert.equal(storage.readData().settings.features.homeroom,true,'existing homeroom should stay enabled')
 const neverTeacher=storage.emptyData();delete neverTeacher.settings.features;delete neverTeacher.teacherDesk;raw=JSON.stringify(neverTeacher)
 assert.equal(storage.readData().settings.features.homeroom,false)
 const clubData=structuredClone(migrated)
 clubData.settings.features.clubs=true
 clubData.clubs=[{id:'band',name:'밴드부',students:[{id:'band-student',number:1101,name:'동아리학생'}],attendance:{[`${today}:band-student`]:'출석'},activities:[{id:'rehearsal',date:today,title:'합주 연습',record:'리듬 합 맞추기',nextPlan:'곡 마무리'}]}]
 storage.writeData(clubData)
 assert.deepEqual(storage.readData().clubs,clubData.clubs)
 assert.deepEqual((await storage.importData({text:async()=>raw})).clubs,clubData.clubs)
 const clubApp=renderToStaticMarkup(React.createElement(App))
 assert.ok(clubApp.match(/<nav class="tabbar">(.*?)<\/nav>/s)[1].includes('동아리'))
 const {default:ClubView}=await server.ssrLoadModule('/src/components/ClubView.tsx')
 const clubHtml=renderToStaticMarkup(React.createElement(ClubView,{data:clubData,update:()=>{}}))
 assert.ok(clubHtml.includes('밴드부'));assert.ok(clubHtml.includes('합주 연습'));assert.ok(clubHtml.includes('동아리학생'));assert.ok(clubHtml.includes('다음 활동'))
 const {default:TaskList}=await server.ssrLoadModule('/src/components/TaskList.tsx')
 const dateForm=renderToStaticMarkup(React.createElement(TaskList,{title:'업무',items:[],onChange:()=>{},today,initialDraft:dated}))
 assert.ok(!dateForm.includes('등록 유형'));assert.ok(dateForm.includes('기간으로 등록'));assert.ok(dateForm.includes('마감일 표시'))
 const categoryForm=renderToStaticMarkup(React.createElement(TaskList,{title:'업무',items:[{...dated,id:'completed-category',done:true,category:'방송부'}],categoryOptions:['방송부',' 학년부 '],onChange:()=>{},today,initialDraft:dated}))
 assert.equal((categoryForm.match(/value="value:방송부"/g)||[]).length,1)
 assert.ok(categoryForm.includes('value:학년부'));assert.ok(categoryForm.includes('+ 새 분류 입력'))
 const headerForm=renderToStaticMarkup(React.createElement(TaskList,{title:'안내·학급 할 일',items:[],onChange:()=>{},notice:true,today}))
 assert.ok(headerForm.indexOf('완료 표시')<headerForm.indexOf('</h2>')+500)
 const releases=await server.ssrLoadModule('/src/releaseNotes.ts')
 const seen=new Map([['teachingflow-release-seen:v4.6','1']]);const seenStore={getItem:key=>seen.get(key)||null,setItem:(key,value)=>seen.set(key,value)}
 assert.equal(releases.shouldShowRelease(seenStore),true)
 assert.equal(releases.markReleaseSeen(seenStore),true)
 assert.equal(releases.shouldShowRelease(seenStore),false)
 assert.equal(seen.get(releases.releaseNoticeKey),'1')
 assert.ok(!seen.has('teachingflow-release-seen:future-version'))
 const members=await server.ssrLoadModule('/src/members.ts')
 const oldStudent={id:'old-student',number:1201,name:'전출학생',joinedOn:'2026-09-01'}
 const left=members.leaveStudent([oldStudent],oldStudent.id,'2026-10-19','전출')
 const newStudents=members.addStudent(left,{id:'new-student',number:1201,name:'전입학생',joinedOn:'2026-10-19'})
 assert.equal(members.activeStudents(newStudents,'2026-10-18')[0].id,'old-student')
 assert.equal(members.activeStudents(newStudents,'2026-10-19')[0].id,'new-student')
 assert.equal(newStudents.length,2,'transfer erased the previous student')
 assert.throws(()=>members.leaveStudent([oldStudent],oldStudent.id,'2026-08-01','전출'))
 assert.throws(()=>members.addStudent(newStudents,{id:'dup',number:1201,name:'중복학생',joinedOn:'2026-10-20'}))
 let sequence=0
 const merged=members.mergeRoster([oldStudent],'1202 새학생','2026-10-19',()=>`m-${++sequence}`)
 assert.equal(merged.find(s=>s.id==='old-student').leftOn,'2026-10-19')
 assert.equal(members.activeStudents(merged,'2026-10-18')[0].id,'old-student')
 const historyData=structuredClone(migrated)
 historyData.teacherDesk.students=newStudents
 historyData.teacherDesk.homeroomAttendance['2026-10-18:old-student']='결석'
 historyData.teacherDesk.attendanceReasons['2026-10-18:old-student']='질병'
 historyData.teacherDesk.attendanceMemos['2026-10-18:old-student']='병원 진료'
 storage.writeData(historyData)
 const restoredHistory=await storage.importData({text:async()=>raw})
 assert.equal(restoredHistory.teacherDesk.attendanceReasons['2026-10-18:old-student'],'질병')
 assert.equal(restoredHistory.teacherDesk.attendanceMemos['2026-10-18:old-student'],'병원 진료')
 const historicCollection={id:'past',title:'기존 제출',date:'2026-10-18',studentIds:['old-student'],received:['old-student'],archived:false}
 assert.equal(members.collectionMembers(historyData.teacherDesk,historicCollection,'2026-10-19')[0].id,'old-student')
 const {getTodayActions}=await server.ssrLoadModule('/src/todayActions.ts')
 const actionsData=structuredClone(migrated)
 actionsData.teacherDesk.tasks=[{...blankTask(),id:'today',title:'TODAY_ONLY_TASK',date:'2026-10-19',important:true},{...blankTask(),id:'tomorrow',title:'FUTURE_TASK',date:'2026-10-20'},{...blankTask(),id:'previous',title:'PAST_TASK',date:'2026-10-18'},{...blankTask(),id:'done',title:'DONE_TASK',date:'2026-10-19',done:true},{...blankTask(),id:'range',title:'RANGE_TASK',date:'2026-10-18',endDate:'2026-10-21',scheduleType:'period'}]
 actionsData.teacherDesk.notices=[{...blankTask(true),id:'notice-today',title:'오늘안내',date:'2026-10-19'}]
 actionsData.teacherDesk.collections=[{id:'due',title:'오늘수합',date:'2026-10-19',studentIds:['student'],received:[],archived:false}]
 const dayActions=getTodayActions(actionsData,'2026-10-19')
 assert.deepEqual(dayActions.tasks.map(item=>item.id),['today','range'])
 assert.equal(dayActions.collections.length,1)
 const {default:Summary}=await server.ssrLoadModule('/src/components/SummaryDialog.tsx')
 const summaryHtml=renderToStaticMarkup(React.createElement(Summary,{data:actionsData,update:()=>{},date:'2026-10-19',kind:'tasks',onClose:()=>{}}))
 assert.ok(summaryHtml.includes('TODAY_ONLY_TASK'));assert.ok(!summaryHtml.includes('FUTURE_TASK'));assert.ok(!summaryHtml.includes('PAST_TASK'));assert.ok(summaryHtml.includes('★'))
 assert.ok(!summaryHtml.includes('PRIVATE_SENTINEL'))
 const palette=await server.ssrLoadModule('/src/calendarAppearance.ts')
 const defaultPaletteData=storage.emptyData()
 assert.equal(palette.calendarItemStyle(defaultPaletteData,'work').color,'#315a86')
 assert.equal(palette.schoolEventStyle(defaultPaletteData,{type:'closed'}).color,'#b42318')
 assert.equal(palette.schoolEventStyle(defaultPaletteData,{type:'blocked'}).color,'#9a6317')
 assert.equal(palette.schoolEventStyle(defaultPaletteData,{type:'swap'}).color,'#6b4a8c')
 assert.equal(palette.lessonLabelStyle(defaultPaletteData).fontWeight,600)
 defaultPaletteData.settings.calendarLessonLabelBold=false
 assert.equal(palette.lessonLabelStyle(defaultPaletteData).fontWeight,400)
 defaultPaletteData.settings.schoolEventTextColors={closed:'#112233'}
 assert.equal(palette.schoolEventStyle(defaultPaletteData,{type:'closed'}).color,'#112233')
 const importedPalette=await storage.importData({text:async()=>JSON.stringify(defaultPaletteData)})
 assert.equal(importedPalette.settings.calendarLessonLabelBold,false)
 assert.equal(importedPalette.settings.schoolEventTextColors.closed,'#112233')

 actionsData.settings.calendarColors.work='#123456'
 actionsData.settings.calendarMarkers.work={color:'#aa2244',style:'dotted'}
 assert.equal(palette.calendarItemStyle(actionsData,'work').borderLeftColor,'#aa2244')
 assert.equal(palette.calendarItemStyle(actionsData,'work').borderLeftStyle,'dotted')
 assert.equal(palette.normalizeCalendarMarkers({bad:{color:'bad',style:'solid'}}).bad,undefined)
 assert.deepEqual((await storage.importData({text:async()=>JSON.stringify(actionsData)})).settings.calendarMarkers,actionsData.settings.calendarMarkers)
 const importantCalendar=workspace.deskCalendarItems(actionsData,'2026-10-19',{range:'week',filter:'work',showCompleted:false})
 assert.equal(importantCalendar.find(item=>item.id==='today').important,true)
 assert.ok(!importantCalendar.find(item=>item.id==='range').title.includes('2026-10'))
 const painted=renderToStaticMarkup(React.createElement(Calendar,{context:'work',data:actionsData,sessions:[],month:new Date(2026,9,19),setMonth:()=>{},onSelect:()=>{},update:()=>{}}))
 assert.ok(painted.includes('background-color:#123456'));assert.ok(painted.includes('background-color:#0f2c49'));assert.ok(painted.includes('font-weight:700'));assert.ok(!painted.includes('inset 0 0 0 2px'))
 assert.equal(palette.calendarItemStyle(actionsData,'work').color,'#ffffff')
 assert.equal(palette.normalizeCalendarColors({work:'bad'}).work,palette.defaultCalendarColors().work)
 actionsData.settings.features.clubs=true
 actionsData.clubs=clubData.clubs.map(club=>({...club,activities:club.activities.map(a=>({...a,important:true}))}))
 const clubItems=workspace.deskCalendarItems(actionsData,today,{range:'week',filter:'club',showCompleted:false})
 assert.equal(clubItems.length,1);assert.equal(clubItems[0].area,'club');assert.equal(clubItems[0].important,true)
 assert.equal(clubItems[0].clubId,'band')
 raw=JSON.stringify(actionsData)
 const reordered=renderToStaticMarkup(React.createElement(App)).match(/<nav class="tabbar">(.*?)<\/nav>/s)[1]
 assert.ok(reordered.indexOf('교과')<reordered.indexOf('동아리'));assert.ok(reordered.indexOf('동아리')<reordered.indexOf('업무'))
 const {default:FeatureSettings}=await server.ssrLoadModule('/src/components/FeatureSettings.tsx')
 const featureHtml=renderToStaticMarkup(React.createElement(FeatureSettings,{data:actionsData,update:()=>{}}))
 assert.ok(featureHtml.includes('동아리·명단 설정'));assert.ok(!featureHtml.includes('명단 입력·일괄 편집'))
 assert.ok(!clubHtml.includes('>동아리 추가</button>'));assert.ok(!clubHtml.includes('>명단 설정</button>'))
 const withMemo=renderToStaticMarkup(React.createElement(Roster,{data:historyData,update:()=>{},selected:'',onSelect:()=>{}}))
 for(const reason of ['인정','질병','미인정','기타'])assert.ok(withMemo.includes(reason))
 assert.ok(withMemo.includes('출결 메모'));assert.ok(withMemo.includes('명단 관리'))
 const noPrefs=structuredClone(migrated); delete noPrefs.workspacePreferences
 raw=JSON.stringify(noPrefs)
 assert.deepEqual(storage.readData().workspacePreferences,workspace.defaultWorkspacePreferences())

 const newData=structuredClone(actionsData)
 newData.teacherDesk.timetable={'월:1':'국어','금:7':'음악'}
 newData.teacherDesk.timetablePeriods=7
 newData.workspacePreferences.timetableShowToday=true
 newData.workspacePreferences.homeLayout=[{id:'timetable',row:0,column:0,width:4,height:3}]
 newData.workspacePreferences.homeWidgets=['timetable']
 newData.workspacePreferences.workCalendar={range:'week',filter:'work',showCompleted:true,weekCount:4}
 newData.settings.schoolEventColors={closed:'#ffeedd',note:'#ccddee'}
 newData.events=[{id:'event-color',date:'2026-10-19',title:'개별학사색',type:'note',periods:[],classIds:[],color:'#abcdef'}]
 const restoredNew=await storage.importData({text:async()=>JSON.stringify(newData)})
 assert.deepEqual(restoredNew.teacherDesk.timetable,newData.teacherDesk.timetable)
 assert.deepEqual(restoredNew.settings.schoolEventColors,newData.settings.schoolEventColors)
 assert.equal(restoredNew.events[0].color,'#abcdef')
 assert.equal(restoredNew.workspacePreferences.workCalendar.weekCount,4)
 assert.equal(restoredNew.workspacePreferences.timetableShowToday,true)
 assert.equal(restoredNew.workspacePreferences.homeLayout[0].id,'timetable')
 const {default:HomeroomTimetable}=await server.ssrLoadModule('/src/components/HomeroomTimetable.tsx')
 const tableHtml=renderToStaticMarkup(React.createElement(HomeroomTimetable,{data:newData,update:()=>{}}))
 assert.ok(tableHtml.includes('국어'));assert.ok(tableHtml.includes('음악'));assert.ok(tableHtml.includes('시간표 입력·수정'))
 const timetableHome=renderToStaticMarkup(React.createElement(Today,{data:newData,sessions:[],update:()=>{},onSelect:()=>{},onNavigate:()=>{}}))
 assert.ok(timetableHome.includes('home-widget-timetable'));assert.ok(timetableHome.includes('timetable-fit-frame'));assert.ok(timetableHome.includes('timetable-fit-content'));assert.ok(!timetableHome.includes('mini-today-title'));assert.ok(!timetableHome.includes('widget-manage-link'))
 newData.workspacePreferences.timetableShowToday=false
 const noTodayTable=renderToStaticMarkup(React.createElement(Today,{data:newData,sessions:[],update:()=>{},onSelect:()=>{},onNavigate:()=>{}}))
 assert.ok(!noTodayTable.includes('mini-today-title'))
 const homeOptions=workspace.layoutFromWidgets(['timetable'])
 assert.equal(homeOptions[0].id,'timetable');assert.ok(homeOptions[0].width>0)
 for(let weekCount=1;weekCount<=8;weekCount++){
  newData.workspacePreferences.workCalendar.weekCount=weekCount
  const workWeeks=renderToStaticMarkup(React.createElement(Calendar,{context:'work',data:newData,sessions:[],month:new Date(2026,9,19),setMonth:()=>{},onSelect:()=>{},update:()=>{}}))
  assert.equal((workWeeks.match(/class="calendar-day(?: [^"]*)?"/g)||[]).length,Math.min(5,weekCount)*7)
  assert.ok(workWeeks.includes('주간 달력 · 이어보기'));assert.ok(workWeeks.includes('background-color:#abcdef'))
 }
 assert.equal(palette.schoolEventColor(newData,{type:'closed'}),'#ffeedd')
 assert.equal(palette.schoolEventColor(newData,newData.events[0]),'#abcdef')
 const homeroomHtml=renderToStaticMarkup(React.createElement(View,{data:newData,mode:'담임',sessions:[],update:()=>{},onSelect:()=>{},onNavigate:()=>{}}))
 assert.ok(homeroomHtml.includes('출석 현황'));assert.ok(homeroomHtml.includes('자료 취합'))
 assert.ok(!homeroomHtml.includes('상담·생활 기록 학생 선택'));assert.ok(homeroomHtml.includes('담임반 시간표'))
 const recordsTab=renderToStaticMarkup(React.createElement(View,{data:newData,mode:'담임',initialHomeroomTab:'상담·생활 기록',sessions:[],update:()=>{},onSelect:()=>{},onNavigate:()=>{}}))
 assert.ok(recordsTab.includes('상담 학생 명단'));assert.ok(!recordsTab.includes('상담·생활 기록 학생 선택'));assert.ok(recordsTab.includes('반 전체 엑셀 다운로드'));assert.ok(!homeroomHtml.includes('학급 안내 보기'))
 assert.ok(!clubHtml.includes('<h1>동아리 관리</h1>'))
 assert.ok(featureHtml.includes('교과 관리 사용'));assert.ok(featureHtml.includes('업무 관리 사용'))
 assert.ok(featureHtml.includes('feature-settings-editor'));assert.ok(featureHtml.includes('담임 명단 설정'));assert.ok(!featureHtml.includes('feature-details'))
 newData.settings.features={homeroom:false,clubs:false,teaching:false,work:false}
 raw=JSON.stringify(newData)
 const allOff=renderToStaticMarkup(React.createElement(App)).match(/<nav class="tabbar">(.*?)<\/nav>/s)[1]
 assert.equal((allOff.match(/class="tab-index"/g)||[]).length,2)
 assert.ok(!workspace.availableHomeWidgets(newData).includes('timetable'))
 assert.ok(!workspace.availableHomeWidgets(newData).includes('tasks'))
 assert.deepEqual(getTodayActions(newData,'2026-10-19').tasks,[])
 assert.deepEqual(workspace.deskCalendarItems(newData,'2026-10-19',{range:'week',filter:'all',showCompleted:true}),[])
 assert.equal((await storage.importData({text:async()=>JSON.stringify(newData)})).teacherDesk.students.length,newData.teacherDesk.students.length)

 const borderData=structuredClone(actionsData)
 borderData.settings.calendarBorders={}
 const defaults=palette.defaultCalendarColors()
 assert.deepEqual([...new Set(Object.values(defaults))].sort(),['#e2ead7','#ead7ea','#eadfd7','#d7dfea','#e7e8ea','#ffe5e5','#ddf3f3','#fff9db'].sort())
 let borderStyle=palette.calendarItemStyle(borderData,'work')
 assert.equal(borderStyle.borderTop,`1px solid ${palette.darkerCalendarColor(borderData.settings.calendarColors.work)}`)
 borderData.settings.calendarBorders.work={visible:false,color:'#123abc'}
 borderStyle=palette.calendarItemStyle(borderData,'work')
 assert.equal(borderStyle.borderTop,'none');assert.equal(borderStyle.borderBottom,'none');assert.equal(borderStyle.borderLeftWidth,3)
 borderData.settings.calendarMarkers.work={color:'#223344',style:'none'}
 assert.equal(palette.calendarItemStyle(borderData,'work').borderLeftWidth,0)
 borderData.settings.calendarBorders.work={visible:true,color:'#123abc'}
 borderStyle=palette.calendarItemStyle(borderData,'work')
 assert.equal(borderStyle.borderTop,'1px solid #123abc');assert.equal(borderStyle.borderLeftWidth,1)
 const textColorData=structuredClone(borderData)
 textColorData.settings.calendarTextColors={}
 for(const area of Object.keys(palette.defaultCalendarColors())){
  textColorData.settings.calendarTextColors[area]='#6b2055'
  assert.equal(palette.calendarItemStyle(textColorData,area,true).color,'#6b2055')
 }
 const restoredText=await storage.importData({text:async()=>JSON.stringify(textColorData)})
 assert.deepEqual(restoredText.settings.calendarTextColors,textColorData.settings.calendarTextColors)
 textColorData.settings.appearance.themeId='night'
 assert.equal(palette.calendarItemStyle(textColorData,'teaching').color,'#6b2055')
 delete textColorData.settings.calendarTextColors.teaching
 assert.equal(palette.calendarItemStyle(textColorData,'teaching').color,'#ffffff')
 assert.deepEqual(palette.normalizeCalendarTextColors({teaching:'bad',work:'#123456',invalid:'#abcdef'}),{work:'#123456'})
 const restoredBorder=await storage.importData({text:async()=>JSON.stringify(borderData)})
 assert.deepEqual(restoredBorder.settings.calendarBorders,borderData.settings.calendarBorders)
 assert.equal(palette.normalizeCalendarMarkers({'type:removed':{color:'#112233',style:'solid'}})['type:removed'],undefined)
 const customSchool={id:'custom',date:today,type:'note',title:'test',color:'#abcdef',periods:[],classIds:[]}
 assert.equal(palette.schoolEventStyle(borderData,customSchool).borderTop,`1px solid ${palette.darkerCalendarColor('#abcdef')}`)
 const {default:CalendarDesign}=await server.ssrLoadModule('/src/components/CalendarDesign.tsx')
 const designHtml=renderToStaticMarkup(React.createElement(CalendarDesign,{data:borderData,update:()=>{}}))
 const typeRow=designHtml.match(/class="school-color-list school-type-colors">(.*?)<\/div>/s)?.[1]
 assert.ok(typeRow)
 assert.equal((typeRow.match(/type="color"/g)||[]).length,8)
 for(const label of ['휴업','수업 불가','요일 변경','일반 안내'])assert.ok(typeRow.includes(label))
 assert.equal((designHtml.match(/class="calendar-design-row"/g)||[]).length,8)
 assert.ok(designHtml.includes('<thead>'));assert.ok(designHtml.includes('scope="colgroup">글씨'))
 for(const name of Object.values(palette.calendarAreaNames))assert.ok(designHtml.includes(`${name} 글자색`))
 assert.ok(!designHtml.includes('수업 종류 ·'))
 assert.ok(designHtml.includes('업무 외곽 테두리 표시'));assert.ok(designHtml.includes('업무 테두리 자동 색'))
 const typeRemoved=structuredClone(borderData)
 typeRemoved.settings.calendarMarkers['type:old']={color:'#ff00ff',style:'double'}
 assert.deepEqual(palette.calendarItemStyle(typeRemoved,'teaching'),palette.calendarItemStyle(borderData,'teaching'))

 const seatModel=await server.ssrLoadModule('/src/seating.ts')
 const seatStudents=Array.from({length:8},(_,i)=>({id:`seat-student-${i}`,number:i+1,name:`학생${i+1}`}))
 const seatPlan={rows:3,columns:4,disabled:[3,7],aisles:[1],assignments:{0:'seat-student-0'},locked:[0]}
 const originalPlan=structuredClone(seatPlan)
 const drawn=seatModel.randomSeats(seatPlan,seatStudents,()=>.42)
 assert.deepEqual(seatPlan,originalPlan,'drawing mutated original plan')
 assert.equal(drawn.assignments[0],'seat-student-0')
 assert.equal(new Set(Object.values(drawn.assignments)).size,8)
 assert.equal(Object.values(drawn.assignments).length,8)
 assert.ok(!drawn.assignments[3]&&!drawn.assignments[7])
 assert.throws(()=>seatModel.randomSeats({...seatPlan,rows:1,columns:1,disabled:[]},seatStudents),/부족/)
 const pairPlan=seatModel.seatingShape(seatModel.emptySeatingPlan(),'pairs');assert.deepEqual(pairPlan.aisles,[1,3])
 const uPlan=seatModel.seatingShape({...seatModel.emptySeatingPlan(),rows:3,columns:4},'u')
 assert.deepEqual(uPlan.disabled,[1,2,5,6])
 const swapPlan={rows:1,columns:2,disabled:[],aisles:[],locked:[],assignments:{0:'a',1:'b'}}
 assert.deepEqual(seatModel.assignSeat(swapPlan,0,'b').assignments,{0:'b',1:'a'})
 assert.throws(()=>seatModel.assignSeat({...swapPlan,locked:[1]},0,'b'),/고정/)
 const stalePlan=seatModel.randomSeats({...seatPlan,assignments:{0:'former'},locked:[0]},seatStudents,()=>.4)
 assert.ok(!Object.values(stalePlan.assignments).includes('former'));assert.equal(stalePlan.locked.length,0)
 const {homeroomEntries,summarizeHomeroom}=await server.ssrLoadModule('/src/homeroomAttendance.ts')
 const attData=structuredClone(actionsData)
 attData.teacherDesk.homeroomAttendance={'2026-10-01:student':'결석','2026-10-02:student':'지각','2026-10-03:student':'조퇴','2026-10-04:student':'조퇴','2026-10-05:student':'지각','2026-10-06:student':'결과','2026-10-07:student':'결석'}
 attData.teacherDesk.attendanceReasons={'2026-10-01:student':'미인정','2026-10-02:student':'미인정','2026-10-03:student':'미인정','2026-10-04:student':'미인정','2026-10-05:student':'질병','2026-10-06:student':'미인정','2026-10-07:student':'인정'}
 attData.teacherDesk.attendanceExtra=[{id:'same-day',studentId:'student',date:'2026-10-02',status:'조퇴',reason:'미인정',memo:'same day extra'}]
 const attSum=summarizeHomeroom(homeroomEntries(attData.teacherDesk),'student','2026-10-01','2026-10-31')
 assert.equal(attSum.absences,1);assert.equal(attSum.late,1);assert.equal(attSum.early,2);assert.equal(attSum.missed,1);assert.equal(attSum.partial,4);assert.equal(attSum.converted,1);assert.equal(attSum.remainder,1);assert.equal(attSum.total,2)
 const ruleExample=summarizeHomeroom(homeroomEntries(attData.teacherDesk).filter(e=>!e.extra),'student','2026-10-02','2026-10-04')
 assert.equal(ruleExample.total,1);assert.equal(ruleExample.partial,3)
 assert.equal(summarizeHomeroom(homeroomEntries(attData.teacherDesk),'student','2026-11-01','2026-11-30').total,0)
 const duplicated=[...homeroomEntries(attData.teacherDesk),{...homeroomEntries(attData.teacherDesk)[1],id:'duplicate'}]
 assert.equal(summarizeHomeroom(duplicated,'student','2026-10-01','2026-10-31').total,2)
 const {default:AttendanceSummary}=await server.ssrLoadModule('/src/components/HomeroomAttendanceSummary.tsx')
 const summaryAttendanceHtml=renderToStaticMarkup(React.createElement(AttendanceSummary,{data:attData,update:()=>{},selected:'student',onSelect:()=>{}}))
 assert.ok(summaryAttendanceHtml.includes('관리용 합계'));assert.ok(summaryAttendanceHtml.includes('same day extra'))
 const noMemoData=structuredClone(actionsData);noMemoData.teacherDesk.homeroomAttendance[`${today}:student`]='출석';noMemoData.teacherDesk.attendanceMemos[`${today}:student`]='HIDDEN_MEMO_SENTINEL'
 const defaultRoster=renderToStaticMarkup(React.createElement(Roster,{data:noMemoData,update:()=>{},selected:'',onSelect:()=>{}}))
 assert.ok(!defaultRoster.includes('<textarea'));assert.ok(!defaultRoster.includes('HIDDEN_MEMO_SENTINEL'))
 assert.ok(defaultRoster.includes('compact-roster-row'));assert.ok(defaultRoster.includes('결과'))
 const recordExport=await server.ssrLoadModule('/src/homeroomExport.ts')
 attData.teacherDesk.records=[{id:'r1',studentId:'student',date:'2026-10-01',kind:'상담',text:'원기록 내용',followDate:'2026-10-08',followed:false},{id:'r2',studentId:'old',studentName:'이전학생',studentNumber:999,date:'2026-09-01',kind:'생활 관찰',text:'=literal text',followDate:'',followed:true}]
 const wb=recordExport.homeroomRecordsWorkbook(attData)
 const xlsx=require('xlsx');const roundBook=xlsx.read(xlsx.write(wb,{type:'buffer',bookType:'xlsx'}),{type:'buffer'})
 const exportedRows=xlsx.utils.sheet_to_json(roundBook.Sheets[roundBook.SheetNames[0]],{header:1})
 assert.equal(exportedRows.length,3);assert.ok(exportedRows.flat().includes('이전학생'));assert.ok(exportedRows.flat().includes('원기록 내용'))
 const formulaCell=Object.values(roundBook.Sheets[roundBook.SheetNames[0]]).find(cell=>cell?.v==='=literal text')
 assert.equal(formulaCell.t,'s');assert.equal(formulaCell.f,undefined)
 attData.seatingPlans={homeroom:drawn,'class:c':swapPlan}
 const attRound=await storage.importData({text:async()=>JSON.stringify(attData)})
 assert.deepEqual(attRound.seatingPlans,attData.seatingPlans);assert.deepEqual(attRound.teacherDesk.attendanceExtra,attData.teacherDesk.attendanceExtra)
 const {themes}=await server.ssrLoadModule('/src/theme.ts')
 const {uiThemeVars}=await server.ssrLoadModule('/src/theme.ts')
 for(const theme of themes){const vars=uiThemeVars(theme);assert.deepEqual(vars,theme.vars,'theme color roles must match original v4.1 mapping');assert.ok(vars['--card']);assert.ok(vars['--line']);assert.equal(new Set(Object.values(palette.defaultCalendarColors())).size,8)}
 const exactDefaults={teaching:'#e7e8ea',school:'#fff9db',homeroom:'#e2ead7',work:'#d7dfea',club:'#eadfd7',swap:'#ead7ea',cover:'#ddf3f3',holiday:'#ffe5e5'}
 assert.deepEqual(palette.defaultCalendarColors(),exactDefaults)
 for(const [theme,color] of Object.entries({beige:'#eadfd7',blue:'#d7dfea',green:'#e2ead7',purple:'#ead7ea'})){
  const styled=structuredClone(actionsData);styled.settings.appearance.themeId=theme;styled.settings.calendarColors=palette.defaultCalendarColors(theme);styled.settings.calendarBorders={};styled.settings.calendarMarkers={}
  assert.equal(styled.settings.calendarColors.teaching,color);assert.equal(palette.calendarItemStyle(styled,'teaching').backgroundColor,'#ffffff');assert.equal(palette.calendarItemStyle(styled,'teaching').borderTop,`1px solid ${color}`)
 }
 for(const area of ['teaching','swap','cover']){
  const custom=structuredClone(actionsData);custom.settings.calendarBorders={};custom.settings.calendarMarkers={};custom.settings.calendarColorCustom=[]
  assert.equal(palette.calendarItemStyle(custom,area).backgroundColor,'#ffffff')
  custom.settings.calendarColors[area]='#abcdef';custom.settings.calendarColorCustom=[area]
  assert.equal(palette.calendarItemStyle(custom,area).backgroundColor,'#abcdef')
  assert.equal(palette.calendarItemStyle(custom,area).borderTop,`1px solid ${palette.darkerCalendarColor('#abcdef')}`)
  assert.equal(palette.calendarItemStyle(custom,area,true).backgroundColor,palette.darkerCalendarColor('#abcdef'))
  const restoredCustom=await storage.importData({text:async()=>JSON.stringify(custom)})
  assert.equal(palette.calendarItemStyle(restoredCustom,area).backgroundColor,'#abcdef')
  assert.equal(palette.themedCalendarColors(custom,'green')[area],'#abcdef')
  custom.settings.calendarMarkers[area]={color:'#123456',style:'dotted'}
  assert.equal(palette.calendarItemStyle(custom,area).borderLeftColor,'#123456')
  custom.settings.appearance.themeId='night'
  assert.equal(palette.calendarItemStyle(custom,area).backgroundColor,'#abcdef')
 }
 const swapDefault=structuredClone(actionsData);swapDefault.settings.calendarColorCustom=[]
 assert.equal(palette.schoolEventStyle(swapDefault,{type:'swap'}).backgroundColor,'#ffffff')
 assert.equal(palette.schoolEventStyle(swapDefault,{type:'swap',color:'#abcdef'}).backgroundColor,'#abcdef')
 const designMarkup=renderToStaticMarkup(React.createElement(CalendarDesign,{data:swapDefault,update:()=>{}}))
 for(const name of ['교과','요일 대체','수업 대체·대강'])assert.ok(designMarkup.includes(`${name} 왼쪽 선 색`))
 const nightDefaults=structuredClone(actionsData);nightDefaults.settings.appearance.themeId='night';nightDefaults.settings.calendarBorders={};nightDefaults.settings.calendarMarkers={};nightDefaults.settings.calendarFonts={work:'italic'}
 for(const area of Object.keys(exactDefaults)){const style=palette.calendarItemStyle(nightDefaults,area);assert.equal(style.color,'#ffffff');assert.equal(style.backgroundColor,'transparent')}
 assert.equal(palette.calendarItemStyle(nightDefaults,'work').fontStyle,'italic')
 assert.deepEqual((await storage.importData({text:async()=>JSON.stringify(nightDefaults)})).settings.calendarFonts,{work:'italic'})
 const oldTint=Object.fromEntries(Object.entries(palette.defaultCalendarColors()).map(([key,color])=>[key,palette.blendCalendarColor(color,'#729047',.2)]))
 assert.deepEqual(palette.normalizeCalendarColors(oldTint,'green'),palette.defaultCalendarColors('green'))
 assert.equal(palette.normalizeCalendarColors({work:'#123456'},'green').work,'#123456')
 const activityData=structuredClone(actionsData)
 activityData.workspacePreferences.homeCalendar={homeMode:'weeks',range:'week',filter:'teaching',showCompleted:true}
 activityData.workspacePreferences.homeLayout=[{id:'calendar',row:0,column:0,width:8,height:1}]
 activityData.types=[{id:'activity',name:'활동',color:'#12ab34'}]
 activityData.lessons=[{id:'lesson-color',subjectId:'s',typeId:'activity',title:'활동수업'}]
 const activityHtml=renderToStaticMarkup(React.createElement(Calendar,{context:'home',data:activityData,sessions:[{...fakeSession,lessonIds:['lesson-color']}],month:new Date(),setMonth:()=>{},onSelect:()=>{},update:()=>{}}))
 assert.ok(activityHtml.includes('background-color:#ffffff'));assert.ok(!activityHtml.includes('border-left-color:#12ab34'))

 const conditions=await server.ssrLoadModule('/src/seatConditions.ts')
 const condStudents=Array.from({length:8},(_,i)=>({id:`p${i}`,name:`P${i}`,number:i+1}))
 const constrainedPlan={rows:2,columns:4,disabled:[],aisles:[1],assignments:{},locked:[],constraints:{...conditions.defaultSeatConstraints(),frontStudents:['p0','p1'],separated:[['p0','p1']],frontRows:2,separation:'group',groupRows:1}}
 const satisfying=seatModel.randomSeats(constrainedPlan,condStudents)
 assert.equal(conditions.seatConditionViolations(satisfying,condStudents).length,0)
 const frontPlan=seatModel.randomSeats({...constrainedPlan,constraints:{...conditions.defaultSeatConstraints(),frontStudents:['p0','p1'],frontRows:1}},condStudents)
 for(const id of ['p0','p1'])assert.ok(Number(Object.keys(frontPlan.assignments).find(key=>frontPlan.assignments[key]===id))<4)
 const mixedConstraints={...conditions.defaultSeatConstraints(),pairMode:'mixed',genders:Object.fromEntries(condStudents.map((s,i)=>[s.id,i%2?'여':'남']))}
 const mixed=seatModel.randomSeats({...constrainedPlan,constraints:mixedConstraints},condStudents)
 assert.equal(conditions.seatConditionViolations(mixed,condStudents).length,0)
 for(let seat=0;seat<8;seat+=2)assert.notEqual(mixedConstraints.genders[mixed.assignments[seat]],mixedConstraints.genders[mixed.assignments[seat+1]])
 const same=seatModel.randomSeats({...constrainedPlan,constraints:{...mixedConstraints,pairMode:'same'}},condStudents)
 for(let seat=0;seat<8;seat+=2)assert.equal(mixedConstraints.genders[same.assignments[seat]],mixedConstraints.genders[same.assignments[seat+1]])
 assert.ok(conditions.seatConditionViolations({...mixed,previous:undefined,constraints:{...mixedConstraints,avoidPreviousSeat:true}},condStudents).length>0)
 const previous=conditions.snapshotSeats(mixed,'2026-09')
 const avoiding=seatModel.randomSeats({...constrainedPlan,previous,constraints:{...conditions.defaultSeatConstraints(),avoidPreviousSeat:true,avoidPreviousPartner:true}},condStudents)
 assert.equal(conditions.seatConditionViolations(avoiding,condStudents).length,0)
 for(const [seat,id] of Object.entries(avoiding.assignments))assert.notEqual(previous.assignments[seat],id)
 assert.throws(()=>seatModel.randomSeats({...constrainedPlan,locked:[4],assignments:{4:'p0'},constraints:{...conditions.defaultSeatConstraints(),frontStudents:['p0'],frontRows:1}},condStudents),/충돌/)
 assert.throws(()=>seatModel.randomSeats({...constrainedPlan,constraints:{...mixedConstraints,genders:{}}},condStudents),/성별/)
 const groupModel=await server.ssrLoadModule('/src/groups.ts')
 const grouped=groupModel.drawGroups(condStudents,3,()=>.4)
 assert.equal(Object.keys(grouped.assignments).length,8)
 const groupSizes=[1,2,3].map(n=>Object.values(grouped.assignments).filter(g=>g===n).length)
 assert.ok(Math.max(...groupSizes)-Math.min(...groupSizes)<=1)
 const duplicateDay=structuredClone(attData)
 duplicateDay.teacherDesk.attendanceChoices={'2026-10-02:student':'same-day'}
 const dailyChosen=homeroomEntries(duplicateDay.teacherDesk).filter(e=>e.date==='2026-10-02'&&e.counted)
 assert.equal(dailyChosen.length,1);assert.equal(dailyChosen[0].status,'조퇴')
 duplicateDay.seatingPlans.homeroom=avoiding;duplicateDay.groupPlans={c:grouped}
 const newRound=await storage.importData({text:async()=>JSON.stringify(duplicateDay)})
 assert.deepEqual(newRound.seatingPlans.homeroom.constraints,avoiding.constraints)
 assert.deepEqual(newRound.seatingPlans.homeroom.previous,previous)
 assert.deepEqual(newRound.groupPlans,{c:grouped});assert.deepEqual(newRound.teacherDesk.attendanceChoices,duplicateDay.teacherDesk.attendanceChoices)
 const svgModel=await server.ssrLoadModule('/src/seatingExport.ts')
 const svgLayout=svgModel.seatingSvg(satisfying,condStudents,'A&B <test>')
 assert.ok(svgLayout.svg.includes('A&amp;B &lt;test&gt;'));assert.equal((svgLayout.svg.match(/<g>/g)||[]).length,8)

 const allAbsenceData=structuredClone(attData)
 for(let i=8;i<=12;i++){const key=`2026-10-${String(i).padStart(2,'0')}:student`;allAbsenceData.teacherDesk.homeroomAttendance[key]='결석';allAbsenceData.teacherDesk.attendanceReasons[key]='질병';allAbsenceData.teacherDesk.attendanceMemos[key]=`병결 사유 ${i}`}
 allAbsenceData.teacherDesk.homeroomAttendance['2026-10-13:student']='결석'
 allAbsenceData.teacherDesk.homeroomAttendance['2026-10-14:student']='결석';allAbsenceData.teacherDesk.attendanceReasons['2026-10-14:student']='기타'
 const allAbsenceEntries=homeroomEntries(allAbsenceData.teacherDesk)
 const allAbsenceSum=summarizeHomeroom(allAbsenceEntries,'student','2026-10-01','2026-10-31')
 assert.deepEqual(allAbsenceSum.absenceByReason,{'인정':1,'질병':5,'미인정':1,'기타':1,'미분류':1})
 assert.equal(allAbsenceSum.allAbsences,9);assert.equal(allAbsenceSum.absences,1)
 const absenceView=renderToStaticMarkup(React.createElement(AttendanceSummary,{data:allAbsenceData,update:()=>{},selected:'student',onSelect:()=>{}}))
 assert.ok(absenceView.includes('질병 결석 5일'));assert.ok(!absenceView.includes('질병결석 사유 확인 표시 기준'));assert.equal((absenceView.match(/<table/g)||[]).length,1);assert.ok(absenceView.includes('병결 사유 8'));assert.ok(absenceView.includes('사유·메모 입력'))
 assert.ok(!homeroomHtml.includes('<h1>'))
 assert.equal((defaultRoster.match(/>전체 출석<\/button>/g)||[]).length,1)
 assert.ok(defaultRoster.includes('roster-date-actions'));assert.ok(defaultRoster.includes('명단 관리'));assert.ok(!defaultRoster.includes('roster-remove'))
 const attendanceModel=await server.ssrLoadModule('/src/homeroomAttendance.ts')
 const illnessEntry=allAbsenceEntries.find(e=>e.id==='2026-10-08:student')
 const changedMemos=attendanceModel.attendanceMemoChange(allAbsenceData.teacherDesk,illnessEntry,'수정된 병결 사유')
 assert.equal(changedMemos.attendanceMemos[illnessEntry.id],'수정된 병결 사유');assert.equal(allAbsenceData.teacherDesk.attendanceMemos[illnessEntry.id],'병결 사유 8')
 const extraEntry=allAbsenceEntries.find(e=>e.extra)
 assert.equal(attendanceModel.attendanceMemoChange(allAbsenceData.teacherDesk,extraEntry,'추가 메모').attendanceExtra.find(e=>e.id===extraEntry.id).memo,'추가 메모')
 allAbsenceData.teacherDesk.illnessReviewThreshold=7
 assert.equal((await storage.importData({text:async()=>JSON.stringify(allAbsenceData)})).teacherDesk.illnessReviewThreshold,7)

 const weekendsData=structuredClone(actionsData)
 weekendsData.workspacePreferences.homeCalendar={homeMode:'month',range:'month',filter:'all',showCompleted:false,showWeekends:false}
 const weekdaysHtml=renderToStaticMarkup(React.createElement(Calendar,{context:'home',data:weekendsData,sessions:[],month:new Date(2026,9,19),setMonth:()=>{},onSelect:()=>{},update:()=>{}}))
 assert.equal((weekdaysHtml.match(/class="calendar-day(?: [^"]*)?"/g)||[]).length,30)
 assert.ok(weekdaysHtml.includes('repeat(5,minmax(0,1fr))'));assert.ok(weekdaysHtml.includes('주말 제외'))
 weekendsData.workspacePreferences.homeCalendar.homeMode='weeks';weekendsData.workspacePreferences.homeLayout=[{id:'calendar',row:0,column:0,width:8,height:2}]
 const weekdayWeeks=renderToStaticMarkup(React.createElement(Calendar,{context:'home',data:weekendsData,sessions:[],month:new Date(2026,9,19),setMonth:()=>{},onSelect:()=>{},update:()=>{}}))
 assert.equal((weekdayWeeks.match(/class="calendar-day(?: [^"]*)?"/g)||[]).length,20)
 assert.equal((await storage.importData({text:async()=>JSON.stringify(weekendsData)})).workspacePreferences.homeCalendar.showWeekends,false)
 for(const theme of themes){const colors=palette.defaultCalendarColors(theme.id);assert.deepEqual(Object.values(colors).sort(),Object.values(palette.defaultCalendarColors()).sort())}
 assert.notDeepEqual(palette.defaultCalendarColors('green'),palette.defaultCalendarColors())
 const customPalette=structuredClone(actionsData);customPalette.settings.calendarColors.work='#123456';customPalette.settings.calendarColorCustom=['work']
 assert.equal(palette.themedCalendarColors(customPalette,'purple').work,'#123456')
 assert.equal(palette.themedCalendarColors(customPalette,'purple').teaching,palette.defaultCalendarColors('purple').teaching)
 const calendarAction=await server.ssrLoadModule('/src/calendarActions.ts')
 const fromCalendar={...calendarAction.calendarTaskDraft('2026-10-23'),id:'calendar-work',title:'달력 업무'}
 assert.equal(fromCalendar.date,'2026-10-23')
 const actionAdded=calendarAction.appendCalendarTask(actionsData,'work',fromCalendar)
 assert.equal(actionAdded.teacherDesk.tasks.at(-1).id,'calendar-work');assert.deepEqual(actionAdded.teacherDesk.notices,actionsData.teacherDesk.notices)
 assert.equal(calendarAction.appendCalendarTask(actionsData,'homeroom',{...fromCalendar,id:'calendar-notice'}).teacherDesk.notices.at(-1).id,'calendar-notice')
 const {default:QuickAdd}=await server.ssrLoadModule('/src/components/CalendarAddDialog.tsx')
 const quickHtml=renderToStaticMarkup(React.createElement(QuickAdd,{data:actionsData,date:'2026-10-23',mode:'menu',onMode:()=>{},onMemo:()=>{},onClose:()=>{},update:()=>{}}))
 for(const label of ['메모 추가','업무 추가','담임 안내·할 일 추가'])assert.ok(quickHtml.includes(label))
 const categoryData=structuredClone(actionsData)
 categoryData.teacherDesk.tasks=[{...fromCalendar,category:'방송부'}]
 const quickCategory=renderToStaticMarkup(React.createElement(QuickAdd,{data:categoryData,date:'2026-10-23',mode:'work',onMode:()=>{},onMemo:()=>{},onClose:()=>{},update:()=>{}}))
 assert.ok(quickCategory.includes('value:방송부'))
 categoryData.settings.calendarTodayColor='#aabbcc'
 const restoredToday=await storage.importData({text:async()=>JSON.stringify(categoryData)})
 assert.equal(restoredToday.settings.calendarTodayColor,'#aabbcc')
 const todayColorHtml=renderToStaticMarkup(React.createElement(Calendar,{data:categoryData,sessions:[],month:new Date(today+'T12:00:00'),setMonth:()=>{},onSelect:()=>{},update:()=>{}}))
 assert.ok(todayColorHtml.includes('background-color:#aabbcc'))
 const emptyPlan={rows:2,columns:3,disabled:[],empty:[1],aisles:[],locked:[],assignments:{}}
 const oddStudents=condStudents.slice(0,5)
 const emptyDraw=seatModel.randomSeats(emptyPlan,oddStudents)
 assert.equal(Object.values(emptyDraw.assignments).length,5);assert.ok(!emptyDraw.assignments[1]);assert.deepEqual(emptyDraw.empty,[1])
 assert.throws(()=>seatModel.assignSeat(emptyDraw,1,oddStudents[0].id),/사용하지/)
 assert.ok(svgModel.seatingSvg(emptyDraw,oddStudents,'빈자리 테스트').svg.includes('빈자리'))
 const groupRules={...groupModel.defaultGroupConstraints(),together:[['p0','p1']],separated:[['p0','p2']],balanceScores:true,balanceTags:true,profiles:Object.fromEntries(condStudents.map((s,i)=>[s.id,{score:i*10,tags:i%2?'리더':'',note:'참고'}]))}
 const ruleGroups=groupModel.drawGroups(condStudents,2,Math.random,groupRules)
 assert.equal(ruleGroups.assignments.p0,ruleGroups.assignments.p1);assert.notEqual(ruleGroups.assignments.p0,ruleGroups.assignments.p2)
 assert.equal(groupModel.groupConditionViolations(ruleGroups).length,0)
 const ruleSizes=[1,2].map(n=>Object.values(ruleGroups.assignments).filter(g=>g===n).length);assert.deepEqual(ruleSizes,[4,4])
 assert.throws(()=>groupModel.drawGroups(condStudents,2,Math.random,{...groupRules,separated:[['p0','p1']]}),/충돌/)
 const scoreStudents=condStudents.slice(0,4);const scoreRules={...groupModel.defaultGroupConstraints(),balanceScores:true,profiles:{p0:{score:100,tags:'',note:''},p1:{score:100,tags:'',note:''},p2:{score:0,tags:'',note:''},p3:{score:0,tags:'',note:''}}}
 const scoreDraw=groupModel.drawGroups(scoreStudents,2,Math.random,scoreRules)
 assert.equal(groupModel.groupBalanceCost(scoreDraw,scoreStudents),0)
 const groupBackup=structuredClone(actionsData);groupBackup.groupPlans={c:ruleGroups};groupBackup.seatingPlans={homeroom:emptyDraw};groupBackup.settings.calendarColorCustom=['work']
 const restoredRules=await storage.importData({text:async()=>JSON.stringify(groupBackup)})
 assert.deepEqual(restoredRules.groupPlans.c.constraints,groupRules);assert.deepEqual(restoredRules.seatingPlans.homeroom.empty,[1]);assert.deepEqual(restoredRules.settings.calendarColorCustom,['work'])
 const clubSchedule=await server.ssrLoadModule('/src/clubSchedule.ts')
 const scheduledData=storage.emptyData();scheduledData.settings.features.clubs=true;scheduledData.settings.termStart='2026-10-01';scheduledData.settings.termEnd='2026-10-31'
 const scheduledClub={id:'scheduled-club',name:'밴드 정규 모임',students:[],attendance:{},activities:[],schedule:{kind:'regular',slots:[{day:'금',period:6},{day:'금',period:7}],dates:[{date:'2026-10-18',period:2}],startDate:'',endDate:''}}
 scheduledData.clubs=[scheduledClub]
 assert.deepEqual(clubSchedule.clubMeetingsOn(scheduledData,scheduledClub,'2026-10-16'),[6,7]);assert.deepEqual(clubSchedule.clubMeetingsOn(scheduledData,scheduledClub,'2026-10-18'),[2]);assert.deepEqual(clubSchedule.clubMeetingsOn(scheduledData,scheduledClub,'2026-11-06'),[])
 scheduledData.events=[{id:'closed-club',date:'2026-10-23',type:'closed',title:'휴업',classIds:[],periods:[]}]
 const meetingDates=clubSchedule.clubMeetingDates(scheduledData,scheduledClub,'2026-10-19');assert.ok(meetingDates.includes('2026-10-16'));assert.ok(!meetingDates.includes('2026-10-23'));assert.equal(clubSchedule.preferredClubDate(meetingDates,'2026-10-19'),'2026-10-18')
 assert.equal(clubSchedule.preferredClubDate(['2026-10-23'],'2026-10-19'),'2026-10-23');assert.equal(clubSchedule.preferredClubDate(meetingDates,'2026-10-16'),'2026-10-16')
 assert.equal(clubSchedule.normalizeClubSchedule({slots:[{day:'금',period:6},{day:'금',period:6},{day:'금',period:99}],dates:[{date:'2026-02-31',period:1}]}).slots.length,1)
 assert.deepEqual(clubSchedule.normalizeClubSchedule({dates:[{date:'2026-02-31',period:1}]}).dates,[])
 const {default:ClubMini}=await server.ssrLoadModule('/src/components/MiniTimetable.tsx');const clubMini=renderToStaticMarkup(React.createElement(ClubMini,{data:scheduledData,sessions:[],showToday:false}));assert.ok(clubMini.includes('밴드 정규 모임'));assert.ok(clubMini.includes('<table>'))
 const clubCalendar=workspace.deskCalendarItems(scheduledData,'2026-10-16',{range:'week',filter:'club',showCompleted:false});assert.ok(clubCalendar.some(i=>i.title.includes('6·7교시')))
 const clubRestored=await storage.importData({text:async()=>JSON.stringify(scheduledData)});assert.deepEqual(clubRestored.clubs[0].schedule,clubSchedule.normalizeClubSchedule(scheduledClub.schedule))
 const {default:ScheduledClubView}=await server.ssrLoadModule('/src/components/ClubView.tsx');const scheduledClubHtml=renderToStaticMarkup(React.createElement(ScheduledClubView,{data:scheduledData,update:()=>{}}));assert.ok(scheduledClubHtml.includes('동아리 수업일 선택'));assert.ok(scheduledClubHtml.includes('동아리 유형·시간표 설정'));assert.ok(scheduledClubHtml.includes('value="2026-10-18"'))
 const addBase=workspace.defaultHomeLayout(),withTimetable=workspace.addHomeWidget(addBase,'timetable')
 assert.equal(withTimetable.length,addBase.length+1);verifyLayout(withTimetable)
 for(const old of addBase)assert.deepEqual(withTimetable.find(i=>i.id===old.id),old)
 const timeWidget=withTimetable.find(i=>i.id==='timetable');assert.deepEqual(timeWidget,{id:'timetable',row:6,column:0,width:4,height:3})
 const smaller=workspace.placeHomeWidget(withTimetable,{...timeWidget,width:2,height:2});verifyLayout(smaller);for(const old of addBase)assert.deepEqual(smaller.find(i=>i.id===old.id),old)
 const moved=workspace.placeHomeWidget(smaller,{...smaller.find(i=>i.id==='timetable'),row:7,column:7});verifyLayout(moved);assert.equal(moved.find(i=>i.id==='timetable').column,7)
 const full=[{id:'calendar',row:0,column:0,width:12,height:12}];assert.equal(workspace.addHomeWidget(full,'timetable'),full)
 // Strict editing must not displace neighbours or count the pointer as the tile origin.
 const strictBase=workspace.addHomeWidget(workspace.defaultHomeLayout(),'timetable'),strictTime=strictBase.find(i=>i.id==='timetable')
 const cursorTarget=workspace.homeWidgetDropPosition(7,7,{row:0,column:2});assert.deepEqual(cursorTarget,{row:7,column:5})
 const strictFree=workspace.placeHomeWidget(strictBase,{...strictTime,...cursorTarget},false);verifyLayout(strictFree)
 assert.deepEqual(strictFree.find(i=>i.id==='timetable'),{...strictTime,row:7,column:5});for(const old of strictBase.filter(i=>i.id!=='timetable'))assert.deepEqual(strictFree.find(i=>i.id===old.id),old)
 const blockedTime={...strictTime,row:1,column:2};assert.equal(workspace.placeHomeWidget(strictBase,blockedTime,false),strictBase);assert.ok(workspace.homeWidgetPlacementError(strictBase,blockedTime).includes('달력'))
 assert.equal(workspace.placeHomeWidget(strictBase,{...strictTime,row:9,column:9},false),strictBase)
 const hiddenData=storage.emptyData();hiddenData.settings.features.homeroom=false;hiddenData.workspacePreferences.homeLayout=workspace.defaultHomeLayout()
 const hiddenSettings=renderToStaticMarkup(React.createElement(LayoutSettings,{data:hiddenData,update:()=>{}}));assert.ok(hiddenSettings.includes('담임 안내 · 기능 꺼짐'));assert.ok(hiddenSettings.includes('제출 현황 · 기능 꺼짐'))
 for(const mode of ['timetable','both']) {
  const modeData=structuredClone(migrated)
  modeData.workspacePreferences.homeTimetableMode=mode
  const restoredMode=await storage.importData({text:async()=>JSON.stringify(modeData)})
  assert.equal(restoredMode.workspacePreferences.homeTimetableMode,mode)
 }
 assert.equal(workspace.normalizeWorkspacePreferences({homeTimetableMode:'invalid'}).homeTimetableMode,'timetable')
 assert.equal(workspace.normalizeWorkspacePreferences({homeTimetableMode:'today'}).homeTimetableMode,'timetable')
 const {sessionChangeLabel}=await server.ssrLoadModule('/src/components/MiniTimetable.tsx')
 assert.equal(sessionChangeLabel({swappedFrom:'월'}),'대체')
 assert.equal(sessionChangeLabel({extra:true,extraOrigin:'moved'}),'이동')
 assert.equal(sessionChangeLabel({extra:true,extraNote:'개인 사유'}),'보강')
 assert.equal(sessionChangeLabel({extra:true,extraOrigin:'swapped'}),'교체')
 {
 const {workHistoryEntries}=await server.ssrLoadModule('/src/workHistory.ts')
 const historyData=structuredClone(migrated)
 historyData.teacherDesk.tasks=[{...dated,id:'done-history',title:'완료 업무',date:'2026-10-20',done:true},{...dated,id:'pending-history',title:'진행 업무',done:false}]
 historyData.teacherDesk.workRecords=[{id:'past-record',date:'2026-05-15',title:'지난 행사 정리',category:'방송부',content:'방송 장비 점검 완료',link:''}]
 const historyEntries=workHistoryEntries(historyData)
 assert.deepEqual(historyEntries.map(entry=>entry.id),['done-history','past-record'])
 assert.equal(historyEntries[1].content,'방송 장비 점검 완료')
 const restoredHistory=await storage.importData({text:async()=>JSON.stringify(historyData)})
 assert.deepEqual(restoredHistory.teacherDesk.workRecords,historyData.teacherDesk.workRecords)
 assert.equal(restoredHistory.teacherDesk.tasks.length,2)
 const {default:WorkHistoryView}=await server.ssrLoadModule('/src/components/WorkHistoryView.tsx')
 const historyHtml=renderToStaticMarkup(React.createElement(WorkHistoryView,{data:restoredHistory,update:()=>{},onEditTask:()=>{}}))
 for(const text of ['지난 행사 정리','방송 장비 점검 완료','완료 업무','지난 업무 기록'])assert.ok(historyHtml.includes(text))
 assert.ok(!historyHtml.includes('진행 업무'))
 }
 const {timetableDisplay}=await server.ssrLoadModule('/src/timetableDisplay.ts')
 assert.deepEqual(timetableDisplay(1),{fontPt:7,classOnly:true})
 assert.deepEqual(timetableDisplay(2),{fontPt:9,classOnly:false})
 assert.deepEqual(timetableDisplay(3),{fontPt:9,classOnly:false})
 const {largestTimetableFont}=await server.ssrLoadModule('/src/timetableFit.ts')
 const wrappedHeight=(size,width)=>8*(Math.ceil(5*size/(width*.186))*size*1.2+size*.5)
 const fitted=(width,height)=>largestTimetableFont(width*.186,size=>wrappedHeight(size,width)<=height)
 for(const [width,height] of [[120,96],[350,464],[800,600]]){
  const size=fitted(width,height);assert.ok(wrappedHeight(size,width)<=height)
 }
 assert.ok(fitted(350,600)>fitted(350,300),'type grows with height at the same width')
 assert.ok(fitted(700,600)>fitted(350,600),'type grows with width at the same height')
 const limited=largestTimetableFont(40,size=>size<=17)
 assert.ok(limited<=17&&limited>16.99)
 {
 const before=storage.emptyData()
 const session={id:'memo-session',classId:'c',lessonIds:['l'],date:today,period:1}
 before.progress['c:l']={done:true,memo:'old'}
 before.overrides[session.id]={mode:'extend',label:'keep'}
 const memoModel=await server.ssrLoadModule('/src/lessonMemo.ts')
 Object.assign(before,memoModel.saveCalendarLessonMemos(before,session,{l:' next lesson '},''))
 assert.equal(before.progress['c:l'].done,true);assert.equal(before.progress['c:l'].memo,'next lesson')
 assert.equal(before.overrides[session.id].mode,'extend');assert.equal(memoModel.calendarLessonMemoText(before,session),'next lesson')
 const unassigned={...session,id:'no-lesson',lessonIds:[]}
 Object.assign(before,memoModel.saveCalendarLessonMemos(before,unassigned,{},'bring instruments'))
 assert.equal(memoModel.calendarLessonMemoText(before,unassigned),'bring instruments')
 const imported=await storage.importData({text:async()=>JSON.stringify(before)})
 assert.equal(imported.overrides['no-lesson'].memo,'bring instruments')
 const old=workspace.normalizeWorkspacePreferences({homeGridSize:10,homeLayout:[{id:'calendar',row:0,column:0,width:5,height:3},{id:'tasks',row:0,column:5,width:5,height:3}]})
 assert.deepEqual(old.homeLayout.map(i=>[i.column,i.width]),[[0,6],[6,6]])
 assert.deepEqual(workspace.normalizeWorkspacePreferences(old),old)
 assert.equal(workspace.homeWidgetPlacementError([],{id:'tasks',row:9,column:11,width:1,height:1}),'')
 assert.ok(workspace.homeWidgetPlacementError([],{id:'tasks',row:9,column:12,width:1,height:1}))
 }
 {
 const last=workspace.placeHomeWidget([],{id:'tasks',row:11,column:11,width:1,height:1})
 assert.deepEqual(last,[{id:'tasks',row:11,column:11,width:1,height:1}])
 const prefs=workspace.normalizeWorkspacePreferences({homeGridSize:12,homeGridRows:12,homeLayout:last})
 assert.deepEqual(prefs.homeLayout,last)
 assert.ok(workspace.homeWidgetPlacementError([],{id:'tasks',row:12,column:0,width:1,height:1}))
 const calendarSource=await import('node:fs/promises').then(fs=>fs.readFile(new URL('../src/components/CalendarView.tsx',import.meta.url),'utf8'))
 assert.ok(!calendarSource.includes('calendar-quick-memo'))
 }
 {
 assert.equal(12*((112*10+12*9-12*11)/12)+11*12,10*112+9*12)
 const oldPrefs=workspace.normalizeWorkspacePreferences({homeGridSize:12,homeLayout:[{id:'calendar',row:0,column:0,width:6,height:5},{id:'tasks',row:5,column:0,width:6,height:5}]})
 assert.deepEqual(oldPrefs.homeLayout.map(i=>[i.row,i.height]),[[0,6],[6,6]])
 assert.deepEqual(workspace.normalizeWorkspacePreferences(oldPrefs),oldPrefs)
 }
 {
 const roomData=storage.emptyData();roomData.classes=[{id:'room-class',subjectId:'room-subject',name:'ROOM_CLASS',room:'ROOM_LOCATION',slots:[{day:'월',period:1}],students:[]}];roomData.subjects=[{id:'room-subject',name:'ROOM_SUBJECT',color:'#123456'}]
 roomData.workspacePreferences.homeTimetableSubject=false;roomData.workspacePreferences.homeTimetableRoom=true
 const restored=await storage.importData({text:async()=>JSON.stringify(roomData)})
 assert.equal(restored.classes[0].room,'ROOM_LOCATION');assert.equal(restored.workspacePreferences.homeTimetableRoom,true);assert.equal(restored.workspacePreferences.homeTimetableSubject,false)
 const Mini=(await server.ssrLoadModule('/src/components/MiniTimetable.tsx')).default
 const hidden=renderToStaticMarkup(React.createElement(Mini,{data:roomData,sessions:[],showToday:false,showSubject:false,showRoom:true}))
 assert.ok(hidden.includes('class="mini-room">ROOM_LOCATION'));assert.ok(!hidden.includes('class="mini-subject">ROOM_SUBJECT'))
 const shown=renderToStaticMarkup(React.createElement(Mini,{data:roomData,sessions:[],showToday:false,classOnly:true,showSubject:true,showRoom:false}))
 assert.ok(shown.includes('class="mini-subject">ROOM_SUBJECT'));assert.ok(!shown.includes('class="mini-room"'))
 assert.deepEqual(timetableDisplay(4),{fontPt:11,classOnly:false})
 }
 {
 const memoModel=await server.ssrLoadModule('/src/lessonMemo.ts')
 const common=storage.emptyData();common.lessons=[{id:'shared1',note:'COMMON_NOTE'},{id:'shared2',note:'SECOND_NOTE'}];common.progress['c:shared1']={memo:'CLASS_NOTE'}
 const session={id:'shared-session',classId:'c',lessonIds:['shared1','shared2']}
 assert.equal(memoModel.calendarLessonMemoText(common,session),'COMMON_NOTE · CLASS_NOTE · SECOND_NOTE')
 const other={...session,classId:'other'}
 assert.equal(memoModel.calendarLessonMemoText(common,other),'COMMON_NOTE · SECOND_NOTE')
 assert.equal(memoModel.calendarLessonMemoText(common,{...session,lessonIds:[]}),'')
 }
 {
 const d=storage.emptyData();d.classes=[{id:'memo-c',name:'MEMO_CLASS',subjectId:'memo-s',students:[],slots:[]}];d.subjects=[{id:'memo-s',name:'MEMO_SUBJECT',usesProgress:true,color:'#123456'}];d.lessons=[{id:'memo-l',subjectId:'memo-s',title:'LESSON_CONTENT_ONLY',note:'SHARED_MEMO_VISIBLE',order:0}];d.progress['memo-c:memo-l']={memo:'CLASS_MEMO_VISIBLE'};d.settings.features.teaching=true;d.workspacePreferences.homeLayout=[{id:'lessons',row:0,column:0,width:6,height:2}]
 const lessonSession={id:'memo-session',classId:'memo-c',subjectId:'memo-s',lessonIds:['memo-l'],date:today,period:2,mode:'normal'}
 const homeHtml=renderToStaticMarkup(React.createElement(Today,{data:d,sessions:[lessonSession],update:()=>{},onSelect:()=>{},onNavigate:()=>{}}))
 assert.ok(homeHtml.includes('desk-session-first-line'));assert.ok(homeHtml.includes('desk-session-memo'));assert.ok(homeHtml.includes('SHARED_MEMO_VISIBLE'));assert.ok(homeHtml.includes('CLASS_MEMO_VISIBLE'));assert.ok(homeHtml.includes('lesson-memo-dash'))
 const calendarHtml=renderToStaticMarkup(React.createElement(Calendar,{data:d,sessions:[lessonSession],month:new Date(),setMonth:()=>{},onSelect:()=>{},update:()=>{}}))
 assert.ok(calendarHtml.includes('LESSON_CONTENT_ONLY'));assert.ok(!calendarHtml.includes('SHARED_MEMO_VISIBLE'));assert.ok(!calendarHtml.includes('CLASS_MEMO_VISIBLE'))
 }
 {
 const journal=await server.ssrLoadModule('/src/lessonJournal.ts')
 const d=storage.emptyData();d.classes=[{id:'jc',name:'JOURNAL_CLASS',subjectId:'js',students:[],slots:[]}];d.subjects=[{id:'js',name:'JOURNAL_SUBJECT',usesProgress:true,color:'#123456'}];d.lessons=[{id:'jl',subjectId:'js',title:'JOURNAL_LESSON',note:''}];d.settings.features.teaching=true
 const source={id:'journal-source',date:'2026-10-19',period:2,classId:'jc',subjectId:'js',mode:'normal',lessonIds:['jl']}
 const cancelled={...source,id:'cancelled',date:'2026-10-20',cancelled:true}
 const hidden={...source,id:'hidden',date:'2026-10-20',hidden:true}
 const none={...source,id:'none',date:'2026-10-20',mode:'none'}
 const other={...source,id:'other',date:'2026-10-20',classId:'other'}
 const wrongSubject={...source,id:'wrong-subject',date:'2026-10-20',subjectId:'other'}
 const target={...source,id:'journal-target',date:today,period:3,extra:true}
 const later={...target,id:'later',date:'2027-01-01'}
 Object.assign(d,journal.saveLessonJournal(d,source,{record:'HISTORICAL_INCIDENT_ONLY',nextMemo:'PREPARE_NEXT_CLASS'}))
 const all=[source,cancelled,hidden,none,other,wrongSubject,target,later]
 assert.equal(journal.nextLessonFor(d.lessonJournal[source.id],all).id,target.id)
 assert.equal(journal.incomingLessonMemos(d,source,all).length,0)
 assert.equal(journal.incomingLessonMemos(d,target,all)[0].nextMemo,'PREPARE_NEXT_CLASS')
 assert.equal(journal.incomingLessonMemos(d,later,all).length,0)
 const sameDay={...source,id:'same-day',period:4};assert.equal(journal.nextLessonFor(d.lessonJournal[source.id],[source,sameDay,target]).id,'same-day')
 assert.equal(journal.nextLessonFor(d.lessonJournal[source.id],[source]),undefined)
 assert.equal(journal.nextLessonFor(d.lessonJournal[source.id],[source,{...target,hidden:true},later]).id,later.id)
 Object.assign(d,journal.saveLessonJournal(d,source,{record:'UPDATED_INCIDENT_ONLY'}))
 assert.equal(d.lessonJournal[source.id].nextMemo,'PREPARE_NEXT_CLASS')
 assert.equal(d.lessonJournal[source.id].date,source.date)
 const restored=await storage.importData({text:async()=>JSON.stringify(d)})
 assert.deepEqual(restored.lessonJournal,d.lessonJournal)
 d.workspacePreferences.homeLayout=[{id:'lessons',row:0,column:0,width:6,height:3}]
 const html=renderToStaticMarkup(React.createElement(Today,{data:d,sessions:all,update:()=>{},onSelect:()=>{},onNavigate:()=>{}}))
 assert.ok(html.includes('PREPARE_NEXT_CLASS'));assert.ok(!html.includes('UPDATED_INCIDENT_ONLY'))
 const noJournal=await storage.importData({text:async()=>JSON.stringify({...d,lessonJournal:undefined})});assert.deepEqual(noJournal.lessonJournal,{})
 }
 {
 const Widget=(await server.ssrLoadModule('/src/components/TodayLessonsWidget.tsx')).default
 const d=storage.emptyData();d.classes=[{id:'visibility-c',name:'VISIBLE_CLASS',subjectId:'visibility-s',students:[],slots:[]}];d.subjects=[{id:'visibility-s',name:'HIDDEN_SUBJECT',usesProgress:true,color:'#123456'}];d.lessons=[{id:'visibility-l',subjectId:'visibility-s',title:'HIDDEN_CONTENT',note:'HIDDEN_MEMO'}]
 const item={id:'visibility-session',classId:'visibility-c',subjectId:'visibility-s',date:today,period:3,lessonIds:['visibility-l'],mode:'normal'}
 d.workspacePreferences.todayLessonFields={period:false,className:true,subject:false,content:false,memo:false}
 const html=renderToStaticMarkup(React.createElement(Widget,{data:d,sessions:[item],update:()=>{},onSelect:()=>{}}))
 assert.ok(html.includes('VISIBLE_CLASS'));for(const hidden of ['3교시','HIDDEN_SUBJECT','HIDDEN_CONTENT','HIDDEN_MEMO','desk-session-memo'])assert.ok(!html.includes(hidden))
 const restored=await storage.importData({text:async()=>JSON.stringify(d)})
 assert.deepEqual(restored.workspacePreferences.todayLessonFields,d.workspacePreferences.todayLessonFields)
 d.workspacePreferences.todayLessonFields={period:false,className:false,subject:false,content:false,memo:true}
 const memoOnly=renderToStaticMarkup(React.createElement(Widget,{data:d,sessions:[item],update:()=>{},onSelect:()=>{}}))
 assert.ok(memoOnly.includes('HIDDEN_MEMO'));assert.ok(!memoOnly.includes('desk-session-first-line'));assert.ok(!memoOnly.includes('VISIBLE_CLASS'))
 }
 {
 const notes=await server.ssrLoadModule('/src/releaseNotes.ts')
 assert.equal(storage.APP_VERSION,'v4.5');assert.equal(notes.releaseHighlights.length,3)
 assert.ok(notes.releaseHighlights[0].includes('지난 업무 기록'))
 assert.ok(notes.releaseHighlights[1].includes('표시 정보'))
 assert.ok(notes.releaseHighlights[2].includes('같은 학급·과목의 다음 수업일'))
 assert.equal(notes.releaseNoticeKey,'teachingflow-release-seen:v4.5')
 }
 console.log('PASS: legacy migration, storage/backup, privacy, 12 calendar combinations, week/month/year boundaries, leap year, completion filters, widget layout, five main tabs, homeroom attendance, task date ranges, fixed 4-week home calendars and fixed 1/2-week modes, school events in work, 12×12 grid migration/limits, month/week modes, optional teacher/club features, club backups, optional deadlines, attendance reasons/memos, transfers/history, area colors/highlights, club settings/order, today-only summaries, optional four features, timetable widget, homeroom timetable, 1–5 work weeks, school event colors, unified design rows, automatic/custom/hidden borders, activity colors, UI-only themes, daily representative attendance, XLSX roundtrip, seat conditions, groups, all-reason absence totals, editable absence memos, theme palette rotation, weekday calendars, shared quick add, reserved empty seats, constrained balanced groups and backup compatibility')
} finally { await server.close() }
