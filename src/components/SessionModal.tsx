import type { AppData, AttendanceStatus, Session } from '../types'
import { progressKey } from '../schedule'

type Props = {
  data: AppData
  session: Session
  update: (change: Partial<AppData>) => void
  onClose: () => void
}

const statuses: AttendanceStatus[] = ['출석', '지각', '조퇴', '결석', '기타']

export default function SessionModal({ data, session, update, onClose }: Props) {
  const classroom = data.classes.find(item => item.id === session.classId)
  const lesson = data.lessons.find(item => item.id === session.lessonId)
  if (!classroom) return null

  const key = lesson ? progressKey(classroom.id, lesson.id) : ''
  const record = key ? data.progress[key] || {} : {}
  const override = data.overrides[session.id] || {}

  const setProgress = (change: Partial<typeof record>) => {
    if (!key) return
    update({ progress: { ...data.progress, [key]: { ...record, ...change } } })
  }

  const setOverride = (change: Partial<typeof override>) => {
    update({ overrides: { ...data.overrides, [session.id]: { ...override, ...change } } })
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section className="modal" onClick={event => event.stopPropagation()}>
        <header className="modal-head">
          <div>
            <p className="eyebrow">{session.date} · {session.period}교시</p>
            <h2>{classroom.name}</h2>
          </div>
          <button className="ghost-button" onClick={onClose}>닫기</button>
        </header>

        <div className="modal-body">
          <div className="block">
            <h3>{session.skipped ? (override.label || '수업 없음으로 표시됨') : lesson?.title || '배정된 진도 없음'}</h3>
            {lesson?.note && <p className="hint">공통 메모: {lesson.note}</p>}

            {lesson && !session.skipped && (
              <>
                <label className="check big">
                  <input type="checkbox" checked={Boolean(record.done)} onChange={event => setProgress({ done: event.target.checked })} />
                  이 수업 완료로 표시
                </label>
                <textarea
                  value={record.memo || ''}
                  placeholder="이 학급 이 차시에 대한 메모"
                  onChange={event => setProgress({ memo: event.target.value })}
                />
              </>
            )}

            <div className="inline-form">
              <button className="ghost-button" onClick={() => setOverride({ skip: !override.skip })}>
                {override.skip ? '← 수업일로 되돌리기' : '이 시간 수업 없음으로 처리 (뒤 차시가 밀림)'}
              </button>
              {override.skip && (
                <input
                  placeholder="사유 (예: 학교 행사)"
                  value={override.label || ''}
                  onChange={event => setOverride({ label: event.target.value })}
                />
              )}
            </div>
          </div>

          {classroom.students.length > 0 && (
            <div className="block">
              <h3>출석</h3>
              {classroom.students.map(student => {
                const attendanceKey = `${session.id}:${student.id}`
                const current = data.attendance[attendanceKey]
                return (
                  <div className="attendance-row" key={student.id}>
                    <span>{student.number}. {student.name}</span>
                    {statuses.map(status => (
                      <button
                        className={current === status ? 'slot on' : 'slot'}
                        key={status}
                        onClick={() => {
                          const attendance = { ...data.attendance }
                          if (current === status) delete attendance[attendanceKey]
                          else attendance[attendanceKey] = status
                          update({ attendance })
                        }}
                      >
                        {status}
                      </button>
                    ))}
                    <input
                      className="activity-input"
                      placeholder="활동·태도 기록"
                      value={data.activities[attendanceKey] || ''}
                      onChange={event => update({ activities: { ...data.activities, [attendanceKey]: event.target.value } })}
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
