import { useMemo } from 'react'
import type {AppData,Session} from '../types'
import {buildSessions} from '../schedule'
import {incomingLessonMemos,nextLessonFor,saveLessonJournal} from '../lessonJournal'
export default function LessonJournalEditor({data,session,update}:{data:AppData;session:Session;update:(change:Partial<AppData>)=>void}){
 const sessions=useMemo(()=>buildSessions(data),[data])
 const entry=data.lessonJournal?.[session.id]
 const incoming=incomingLessonMemos(data,session,sessions)
 const next=nextLessonFor({sessionId:session.id,...session},sessions)
 const history=Object.values(data.lessonJournal||{}).filter(e=>e.classId===session.classId&&e.subjectId===session.subjectId&&e.sessionId!==session.id&&(e.record.trim()||e.nextMemo.trim())).sort((a,b)=>b.date.localeCompare(a.date)||b.period-a.period)
 return <section className="block lesson-journal">
  {incoming.length>0&&<div className="lesson-reminders"><strong>이번 수업에 챙길 메모</strong>{incoming.map(e=><p key={e.sessionId}><small>{e.date} · {e.period}교시에서 남김</small><span>{e.nextMemo}</span></p>)}</div>}
  <div className="lesson-journal-fields"><label>이번 수업 기록<textarea rows={2} aria-label="이번 수업 기록" value={entry?.record||''} placeholder="수업 중 있었던 일, 학생 갈등, 지도 내용 등을 기록하세요." onChange={e=>update(saveLessonJournal(data,session,{record:e.target.value}))}/><small className="hint">이 날짜·학급의 기록으로 보관합니다. 위젯에는 표시하지 않습니다.</small></label>
  <label>다음 수업 메모<textarea rows={2} aria-label="다음 수업 메모" value={entry?.nextMemo||''} placeholder="다음 시간에 할 일이나 준비물을 적어두세요." onChange={e=>update(saveLessonJournal(data,session,{nextMemo:e.target.value}))}/><small className="hint">{next?`${next.date} · ${next.period}교시`:'이후 수업이 등록되면'} 같은 학급·과목의 다음 수업 위젯에 표시합니다.</small></label></div>
  {history.length>0&&<details className="lesson-journal-history"><summary>이 학급·과목의 수업 기록 ({history.length})</summary>{history.map(e=><article key={e.sessionId}><strong>{e.date} · {e.period}교시 · {e.lessonTitle}</strong>{e.record&&<p><b>수업 기록</b> {e.record}</p>}{e.nextMemo&&<p><b>다음 수업 메모</b> {e.nextMemo}</p>}</article>)}</details>}
 </section>
}
