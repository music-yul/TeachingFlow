import type { AppData, AttendanceStatus, Session, SessionMode } from '../types'
import { effectiveLessonIds, parseDate, progressKey, sessionLabel } from '../schedule'
import { evalCounts, linkedEvaluation } from '../evaluation'

function dateDistance(a: string, b: string) {
  if (!a || !b) return Infinity
  return Math.abs(parseDate(a).getTime() - parseDate(b).getTime())
}

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
  const candidateEvaluations = (isEmphasisSession ? data.evaluations : data.evaluations.filter(item => item.date === session.date))
    .filter(item =>
      item.id !== linked?.id
      && item.subjectId === session.subjectId
      && (!item.classIds.length || item.classIds.includes(session.classId)),
    )
    .sort((a, b) => dateDistance(a.date, session.date) - dateDistance(b.date, session.date))

  /** 이 반·이 과목의 지난 평가 중, 응시 확정이 안 된 학생이 남아있는 평가. */
  const pendingEvaluations = data.evaluations
    .filter(item =>
      item.subjectId === session.subjectId
      && item.date
      && item.date < session.date
      && (!item.classIds.length || item.classIds.includes(session.classId)),
    )
    .map(item => ({ evaluation: item, counts: evalCounts(data, item, classroom.students) }))
    .filter(item => item.counts.absent + item.counts.unmarked > 0)

  const override = data.overrides[session.id] || {}

  const setOverride = (change: { mode?: SessionMode; label?: string }) => {
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
            </p>
            <h2>{classroom.name}</h2>
          </div>
          <button className="ghost-button" onClick={onClose}>닫기</button>
        </header>

        <div className="modal-body">
          <div className="block">
            <h3>{sessionLabel(data, session)}</h3>

            <p className="hint">이 반의 이 시간만 조정합니다. 다른 반은 영향을 받지 않습니다.</p>
            <div className="mode-picker">
              {modeInfo.map(item => (
                <button
                  className={(override.mode || (override.skip ? 'none' : 'normal')) === item.id ? 'mode on' : 'mode'}
                  key={item.id}
                  onClick={() => setOverride({ mode: item.id })}
                >
                  <b>{item.label}</b>
                  <small>{item.help}</small>
                </button>
              ))}
            </div>

            {(override.mode === 'none' || override.mode === 'extend') && (
              <input
                className="reason-input"
                placeholder="사유 (예: 학교 행사, 모둠 발표가 길어짐)"
                value={override.label || ''}
                onChange={event => setOverride({ label: event.target.value })}
              />
            )}
          </div>

          {lessons.length > 0 && (
            <div className="block">
              <h3>진도 기록</h3>
              {session.mode === 'extend' && (
                <p className="hint">앞 시간과 같은 차시를 이어갑니다. 아래 체크·메모는 그 차시 기록과 함께 갑니다.</p>
              )}
              {lessons.map(lesson => {
                const key = progressKey(classroom.id, lesson!.id)
                const record = data.progress[key] || {}
                return (
                  <div className="progress-edit" key={lesson!.id}>
                    <label className="check big">
                      <input
                        type="checkbox"
                        checked={Boolean(record.done)}
                        onChange={event => setProgress(lesson!.id, { done: event.target.checked })}
                      />
                      {lesson!.title} 완료
                    </label>
                    {lesson!.note && <p className="hint">공통 메모: {lesson!.note}</p>}
                    <textarea
                      value={record.memo || ''}
                      placeholder="이 학급 이 차시에 대한 메모"
                      onChange={event => setProgress(lesson!.id, { memo: event.target.value })}
                    />
                  </div>
                )
              })}
            </div>
          )}

          {linked && (
            <div className="block">
              <h3>수행평가</h3>
              <button className="eval-link-row featured" onClick={() => onOpenEvaluation(linked.id, session.classId)}>
                <b>🎯 {linked.name}</b>
                <span>{linked.weight}% 반영</span>
                <span className="eval-link-cta">수행평가 채점하기 ›</span>
              </button>
            </div>
          )}

          {!linked && candidateEvaluations.length > 0 && (
            <div className="block">
              <h3>평가</h3>
              <p className="hint">
                {isEmphasisSession
                  ? '수행평가 유형 수업입니다. 이 반이 대상인 평가입니다.'
                  : '이 날짜·이 반과 연결된 평가입니다.'}
              </p>
              {candidateEvaluations.map(evaluation => {
                const type = data.evaluationTypes.find(item => item.id === evaluation.typeId)
                return (
                  <button
                    className="eval-link-row"
                    key={evaluation.id}
                    onClick={() => onOpenEvaluation(evaluation.id, session.classId)}
                  >
                    <b>{evaluation.name}</b>
                    <span>{type?.name} · {evaluation.weight}%{evaluation.date && ` · ${evaluation.date}`}</span>
                    <span className="eval-link-cta">평가 입력 ›</span>
                  </button>
                )
              })}
            </div>
          )}

          {pendingEvaluations.length > 0 && (
            <div className="block">
              <h3>이전 수행평가 미응시 학생</h3>
              {pendingEvaluations.map(({ evaluation, counts }) => (
                <button
                  className="eval-pending-row"
                  key={evaluation.id}
                  onClick={() => onOpenEvaluation(evaluation.id, session.classId)}
                >
                  <span>⚠️ {evaluation.date} {evaluation.name}</span>
                  <span className="eval-link-cta">미응시 {counts.absent + counts.unmarked}명 확인 ›</span>
                </button>
              ))}
            </div>
          )}

          {classroom.students.length > 0 && (
            <div className="block">
              <h3>출석</h3>
              {classroom.students.map(student => {
                const attKey = `${session.id}:${student.id}`
                const current = data.attendance[attKey]
                return (
                  <div className="attendance-row" key={student.id}>
                    <span>{student.number}. {student.name}</span>
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
