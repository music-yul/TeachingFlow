import type { AppData, AttendanceStatus, Session, SessionMode } from '../types'
import { effectiveLessonIds, progressKey, sessionLabel } from '../schedule'
import { evalCounts, linkedEvaluation } from '../evaluation'
import LessonJournalEditor from './LessonJournalEditor'
import { studentLabel } from '../students'

type Props = {
  data: AppData
  session: Session
  update: (change: Partial<AppData>) => void
  onClose: () => void
  onOpenEvaluation: (evaluationId: string, classId: string) => void
}

const statuses: AttendanceStatus[] = ['출석', '지각', '조퇴', '결석', '기타']

const modeInfo: { id: SessionMode; label: string; help: string }[] = [
  { id: 'normal', label: '정상 수업', help: '계획대로 다음 차시를 나갑니다.' },
  { id: 'extend', label: '앞 차시 이어서', help: '한 시간 더 씁니다. 이 반만 뒤 차시가 한 칸 밀립니다.' },
  { id: 'merge', label: '두 차시 한 번에', help: '진도를 두 개 나갑니다. 이 반만 뒤 차시가 한 칸 당겨집니다.' },
  { id: 'none', label: '수업 없음', help: '행사·자습 등. 진도를 쓰지 않아 뒤 차시가 한 칸 밀립니다.' },
]

export default function SessionModal({ data, session, update, onClose, onOpenEvaluation }: Props) {
  const classroom = data.classes.find(item => item.id === session.classId)
  if (!classroom) return null

  const linked = linkedEvaluation(data, session)
  const lessons = effectiveLessonIds(session).map(id => data.lessons.find(item => item.id === id)).filter(Boolean)
  const isEmphasisSession = lessons.some(lesson => data.types.find(t => t.id === lesson!.typeId)?.emphasis)

  /** 명시적으로 연결되지 않았어도, 수행평가 유형 수업이면 이 반을 대상으로 하는 평가를 전부 후보로 보여준다. */
  const candidateEvaluations = (isEmphasisSession ? data.evaluations : [])
    .filter(item =>
      item.id !== linked?.id
      && item.subjectId === session.subjectId
      && (!item.classIds.length || item.classIds.includes(session.classId)),
    )

  /**
   * 이 반·이 과목에서 채점을 시작했는데 아직 안 끝난 평가.
   * 예전엔 평가일 기준으로 골랐지만, 평가일을 없앴으므로 "시작했는데 남은 학생이 있는가"로 본다.
   */
  const pendingEvaluations = data.evaluations
    .filter(item =>
      item.id !== linked?.id
      && item.subjectId === session.subjectId
      && (!item.classIds.length || item.classIds.includes(session.classId)),
    )
    .map(item => ({ evaluation: item, counts: evalCounts(data, item, classroom.students) }))
    .filter(item => item.counts.started && item.counts.remaining > 0)

  const override = data.overrides[session.id] || {}

  const setOverride = (change: { mode?: SessionMode; label?: string; memo?: string }) => {
    update({ overrides: { ...data.overrides, [session.id]: { ...override, ...change } } })
  }

  const setProgress = (lessonId: string, change: { done?: boolean; memo?: string }) => {
    const key = progressKey(classroom.id, lessonId)
    update({ progress: { ...data.progress, [key]: { ...data.progress[key], ...change } } })
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section className="modal" onClick={event => event.stopPropagation()}>
        <header className="modal-head">
          <div>
            <p className="eyebrow">
              {session.date} · {session.period}교시
              {session.swappedFrom && ` · ${session.swappedFrom}요일 시간표로 변경 운영`}
              {session.extra && ` · 추가 수업${session.extraNote ? ` (${session.extraNote})` : ''}`}
            </p>
            <h2>{classroom.name}</h2>
          </div>
          <div className="modal-head-actions">
            {session.extra && session.groupId && (
              <button
                className="ghost-button danger-button"
                onClick={() => {
                  if (!window.confirm('이동/교체를 취소하고 원래대로 되돌립니다. 계속할까요?')) return
                  const groupId = session.groupId
                  const removedIds = data.extraSessions.filter(item => item.groupId === groupId).map(item => item.id)
                  const overrides = { ...data.overrides }
                  Object.keys(overrides).forEach(key => { if (overrides[key].groupId === groupId) delete overrides[key] })
                  const attendance = { ...data.attendance }
                  const activities = { ...data.activities }
                  removedIds.forEach(id => {
                    Object.keys(attendance).forEach(key => { if (key.startsWith(`${id}:`)) delete attendance[key] })
                    Object.keys(activities).forEach(key => { if (key.startsWith(`${id}:`)) delete activities[key] })
                  })
                  update({
                    extraSessions: data.extraSessions.filter(item => item.groupId !== groupId),
                    overrides,
                    attendance,
                    activities,
                  })
                  onClose()
                }}
              >
                {session.extraOrigin === 'swapped' ? '교체 되돌리기' : '이동 되돌리기'}
              </button>
            )}
            {session.extra && !session.groupId && (
              <button
                className="ghost-button danger-button"
                onClick={() => {
                  if (!window.confirm('이 추가 수업을 삭제합니다. 여기서 입력한 채점·출결·메모도 함께 지워지며 되돌릴 수 없습니다. 계속할까요?')) return
                  const overrides = { ...data.overrides }
                  delete overrides[session.id]
                  const attendance = { ...data.attendance }
                  const activities = { ...data.activities }
                  Object.keys(attendance).forEach(key => { if (key.startsWith(`${session.id}:`)) delete attendance[key] })
                  Object.keys(activities).forEach(key => { if (key.startsWith(`${session.id}:`)) delete activities[key] })
                  update({
                    extraSessions: data.extraSessions.filter(item => item.id !== session.id),
                    overrides,
                    attendance,
                    activities,
                  })
                  onClose()
                }}
              >
                이 추가 수업 삭제
              </button>
            )}
            <button className="ghost-button" onClick={onClose}>닫기</button>
          </div>
        </header>

        <div className="modal-body">
          {override.memo&&<label className="calendar-memo-field">이 날짜 수업 메모<textarea value={override.memo||''} aria-label="이 날짜 수업 메모" placeholder="다음 시간에 할 일이나 준비물" onChange={event=>setOverride({memo:event.target.value})}/></label>}
          {linked && (
            <div className="block eval-first">
              <h3>수행평가</h3>
              <button className="eval-link-row featured" onClick={() => onOpenEvaluation(linked.id, session.classId)}>
                <b>🎯 {linked.name}</b>
                <span>{linked.weight}% 반영</span>
                <span className="eval-link-cta">수행평가 채점하기 ›</span>
              </button>
            </div>
          )}

          {!linked && candidateEvaluations.length > 0 && (
            <div className="block eval-first">
              <h3>수행평가</h3>
              <p className="hint">수행평가 유형 수업입니다. 이 반이 대상인 평가입니다.</p>
              {candidateEvaluations.map(evaluation => {
                const type = data.evaluationTypes.find(item => item.id === evaluation.typeId)
                return (
                  <button
                    className="eval-link-row featured"
                    key={evaluation.id}
                    onClick={() => onOpenEvaluation(evaluation.id, session.classId)}
                  >
                    <b>🎯 {evaluation.name}</b>
                    <span>{type?.name} · {evaluation.weight}%</span>
                    <span className="eval-link-cta">수행평가 채점하기 ›</span>
                  </button>
                )
              })}
            </div>
          )}

          {pendingEvaluations.length > 0 && (
            <div className="block">
              <h3>아직 안 끝난 수행평가</h3>
              {pendingEvaluations.map(({ evaluation, counts }) => (
                <button
                  className="eval-pending-row"
                  key={evaluation.id}
                  onClick={() => onOpenEvaluation(evaluation.id, session.classId)}
                >
                  <span>⚠️ {evaluation.name}</span>
                  <span className="eval-link-cta">
                    미채점 {counts.remaining}명
                    {counts.absent > 0 && ` · 미응시 ${counts.absent}명`} 확인 ›
                  </span>
                </button>
              ))}
            </div>
          )}

          <div className="block">
            <div className="session-lesson-heading"><h3>{sessionLabel(data, session)}</h3><div className="session-completion-controls">{lessons.length>0&&<label className="check">수업 완료<input type="checkbox" checked={lessons.every(lesson=>Boolean(data.progress[progressKey(classroom.id,lesson!.id)]?.done))} onChange={event=>update({progress:{...data.progress,...Object.fromEntries(lessons.map(lesson=>{const key=progressKey(classroom.id,lesson!.id);return [key,{...data.progress[key],done:event.target.checked}]}))}})}/></label>}</div></div>

            <label className="session-mode-select">수업 방식<select value={override.mode || (override.skip?'none':'normal')} onChange={event=>setOverride({mode:event.target.value as SessionMode})}>{modeInfo.map(item=><option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
            {(override.mode || (override.skip?'none':'normal'))!=='normal'&&<p className="hint session-mode-help">{modeInfo.find(item=>item.id===(override.mode || (override.skip?'none':'normal')))?.help} 이 반의 이 시간만 적용합니다.</p>}

            {(override.mode === 'none' || override.mode === 'extend') && (
              <input
                className="reason-input"
                placeholder="사유 (예: 학교 행사, 모둠 발표가 길어짐)"
                value={override.label || ''}
                onChange={event => setOverride({ label: event.target.value })}
              />
            )}
          </div>

          <LessonJournalEditor data={data} session={session} update={update}/>
          {lessons.some(lesson=>lesson!.note||data.progress[progressKey(classroom.id,lesson!.id)]?.memo)&&<details className="block legacy-lesson-memos"><summary>공통·기존 차시 메모</summary>{lessons.map(lesson=>{const key=progressKey(classroom.id,lesson!.id);return <div className="progress-edit" key={key}>{lessons.length>1&&<h4>{lesson!.title}</h4>}{lesson!.note&&<p className="hint">공통 메모: {lesson!.note}</p>}{data.progress[key]?.memo&&<label>기존 차시 메모<textarea value={data.progress[key]?.memo||''} onChange={event=>setProgress(lesson!.id,{memo:event.target.value})}/></label>}</div>})}</details>}

          {classroom.students.length > 0 && (
            <div className="block">
              <h3>출석</h3>
              {classroom.students.map(student => {
                const attKey = `${session.id}:${student.id}`
                const current = data.attendance[attKey]
                return (
                  <div className="attendance-row" key={student.id}>
                    <span className="attendance-name">{studentLabel(student)}</span>
                    {statuses.map(status => (
                      <button
                        className={current === status ? 'slot on' : 'slot'}
                        key={status}
                        onClick={() => {
                          const attendance = { ...data.attendance }
                          if (current === status) delete attendance[attKey]
                          else attendance[attKey] = status
                          update({ attendance })
                        }}
                      >
                        {status}
                      </button>
                    ))}
                    <input
                      className="activity-input"
                      placeholder="활동·태도 기록"
                      value={data.activities[attKey] || ''}
                      onChange={event => update({ activities: { ...data.activities, [attKey]: event.target.value } })}
                    />
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
