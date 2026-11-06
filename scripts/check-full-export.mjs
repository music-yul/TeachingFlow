import { createRequire } from 'node:module'
import assert from 'node:assert/strict'
const require = createRequire(process.cwd() + '/package.json')
const { createServer } = require('vite')
const XLSX = require('xlsx')
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' })
try {
 globalThis.localStorage = { getItem: () => null, setItem: () => {} }
 const storage = await server.ssrLoadModule('/src/storage.ts')
 const schedule = await server.ssrLoadModule('/src/schedule.ts')
 const { fullWorkbook } = await server.ssrLoadModule('/src/fullExport.ts')
 const data = storage.emptyData()
 Object.assign(data.settings, { schoolName: '테스트고', teacherName: '율쌤', year: '2026', termName: '2학기', termStart: '2026-09-01', termEnd: '2026-09-30', useHolidays: false })
 data.subjects = [{ id: 'mu', name: '음악', color: '#863bff', usesProgress: true }]
 data.types = [{ id: 't1', name: '이론' }, { id: 't2', name: '수행평가', emphasis: true }]
 const students = [{ id: 'a', number: 10101, name: '김가온' }, { id: 'b', number: 10102, name: '이나래', group: '2' }]
 data.classes = [{ id: 'c1', subjectId: 'mu', name: '1-1', room: '음악실', slots: [{ day: '화', period: 2 }, { day: '목', period: 3 }], students }, { id: 'old', subjectId: 'mu', name: '1-9', slots: [], students: [], archived: true }]
 data.lessons = [{ id: 'l1', subjectId: 'mu', title: 'OT', typeId: 't1', note: '' }, { id: 'l2', subjectId: 'mu', title: '가창 평가', typeId: 't2', note: '', evaluationId: 'e1' }]
 const sessions = schedule.buildSessions(data)
 const first = sessions.find(s => s.classId === 'c1')
 assert.ok(first, '세션이 만들어져야 한다')
 data.progress['c1:l1'] = { done: true, memo: '오리엔테이션 완료' }
 data.attendance[`${first.id}:a`] = '지각'
 data.activities[`${first.id}:b`] = '발표에 적극적으로 참여함'
 data.lessonJournal = { [first.id]: { sessionId: first.id, date: first.date, period: first.period, classId: 'c1', subjectId: 'mu', lessonTitle: 'OT', record: '수업 규칙 안내', nextMemo: '악보 준비' } }
 data.evaluationTypes = [{ id: 'et', name: '수행평가' }]
 data.evaluations = [{ id: 'e1', subjectId: 'mu', name: '가창 평가', typeId: 'et', weight: 30, date: '2026-09-15', classIds: ['c1'], tasks: [{ id: 'tk', name: '가창', items: [{ id: 'i1', name: '음정', maxScore: 10, levels: [{ id: 'v1', score: 10, description: '정확함' }, { id: 'v2', score: 6, description: '일부 부정확' }] }, { id: 'i2', name: '표현', maxScore: 10 }] }] }]
 data.scores['e1:i1:a'] = 10; data.scores['e1:i2:a'] = 8
 data.evaluationNotes['e1:a'] = '호흡 안정적'
 data.events = [{ id: 'ev', date: '2026-09-24', endDate: '2026-09-26', title: '추석', type: 'closed', periods: [], classIds: [] }]
 data.dayNotes = { '2026-09-10': [{ id: 'n', text: '교과협의회' }] }
 data.personalBlocks = [{ id: 'p', date: '2026-09-11', period: 5, title: '보강', note: '2-3' }]
 const desk = data.teacherDesk
 desk.tasks = [{ id: 'w1', title: '방과후 출석부 정리', date: '2026-09-01', endDate: '2026-09-05', scheduleType: 'period', done: false, doneDates: ['2026-09-01'], category: '방과후', note: '', link: '' }]
 desk.workRecords = [{ id: 'r', date: '2026-09-02', title: '출석부 제출', category: '방과후', content: '행정실 제출', link: '', taskId: 'w1' }]
 desk.className = '1-1 담임'
 desk.students = students
 desk.homeroomAttendance = { '2026-09-03:a': '결석' }
 desk.attendanceReasons = { '2026-09-03:a': '질병' }
 desk.records = [{ id: 'rec', studentId: 'b', date: '2026-09-04', kind: '상담', text: '진로 상담', followDate: '', followed: false }]
 desk.collections = [{ id: 'col', title: '가정통신문', date: '2026-09-05', studentIds: ['a', 'b'], received: ['a'], archived: false }]
 data.clubs = [{ id: 'cl', name: '밴드부', students, attendance: { '2026-09-09:b': '결석' }, activities: [{ id: 'act', date: '2026-09-09', title: '합주', record: '곡 선정', nextPlan: '파트 연습' }] }]
 data.groupPlans = { c1: { count: 2, assignments: { a: 1, b: 2 } } }
 data.seatingPlans = { 'class:c1': { rows: 2, columns: 2, disabled: [3], aisles: [], assignments: { 0: 'a', 1: 'b' }, locked: [] } }

 const { workbook, sheets } = fullWorkbook(data, new Date(2026, 10, 6, 9, 30))
 const back = XLSX.read(XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }), { type: 'buffer' })
 const names = back.SheetNames
 const expected = ['안내', '학급 명단', '진도표', '수업 일정', '수업 기록', '교과 출결·특기사항', '평가 기준', '평가_가창 평가', '학사일정', '날짜 메모', '시간표 변경·개인 일정', '업무', '업무 기록', '담임 명단', '담임 출결', '상담·생활 기록', '제출물 취합', '동아리 명단', '동아리 활동', '동아리 출결', '모둠 편성', '자리 배치']
 assert.deepEqual(names, expected)
 const rows = name => XLSX.utils.sheet_to_json(back.Sheets[name], { header: 1, defval: '' })
 assert.ok(rows('진도표').some(r => r[2] === 'OT' && r[8] === 'O' && r[9] === '오리엔테이션 완료'))
 assert.ok(rows('교과 출결·특기사항').some(r => r[2] === '김가온' && r[6] === '지각'))
 assert.ok(rows('교과 출결·특기사항').some(r => r[2] === '이나래' && r[7] === '발표에 적극적으로 참여함'))
 const evalRows = rows('평가_가창 평가')
 assert.ok(evalRows.some(r => r[0] === '■ 1-1'))
 assert.ok(evalRows.some(r => r[1] === '김가온' && r.includes(18) && r.includes('호흡 안정적')))
 assert.ok(rows('평가 기준').some(r => r[7] === '음정' && String(r[10]).startsWith('10점: 정확함')))
 assert.ok(rows('업무').some(r => r[0] === '방과후 출석부 정리' && r[2] === '기간' && r[8] === '2026-09-01'))
 assert.ok(rows('담임 출결').some(r => r[2] === '김가온' && r[3] === '결석' && r[4] === '질병'))
 assert.ok(rows('제출물 취합').some(r => r[5] === '10102 이나래'))
 assert.ok(rows('동아리 출결').some(r => r[3] === '이나래'))
 assert.ok(rows('자리 배치').some(r => r[0] === '10101 김가온' && r[1] === '10102 이나래'))
 assert.ok(rows('학급 명단').some(r => r[1] === '1-9' && r[4] === '보관'))
 assert.equal(sheets.find(s => s.name === '평가_가창 평가').count, 2)
 // 빈 데이터면 안내 시트만 만든다.
 const empty = fullWorkbook(storage.emptyData())
 assert.deepEqual(empty.workbook.SheetNames, ['안내'])
 // 시트 이름 제한(31자·금지 문자·중복)
 const tricky = { ...data, evaluations: [{ ...data.evaluations[0], id: 'x1', name: '1학기/2학기 [통합] 가창·기악 실기 수행평가 최종' }, { ...data.evaluations[0], id: 'x2', name: '1학기/2학기 [통합] 가창·기악 실기 수행평가 최종' }] }
 const trickyNames = fullWorkbook(tricky).workbook.SheetNames.filter(n => n.startsWith('평가_'))
 assert.equal(trickyNames.length, 2); assert.ok(trickyNames.every(n => n.length <= 31 && !/[[\]:*?/\\]/.test(n))); assert.notEqual(trickyNames[0], trickyNames[1])
 XLSX.writeFile(workbook, '/tmp/full-export-sample.xlsx')
 console.log('PASS full export', names.length, 'sheets')
} finally { await server.close() }
