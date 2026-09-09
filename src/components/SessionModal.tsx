import type { AppData, AttendanceStatus, Session, SessionMode } from '../types'
import { effectiveLessonIds, progressKey, sessionLabel } from '../schedule'

type Props = {
  data: AppData
  session: Session
  update: (change: Partial<AppData>) => void
  onClose: () => void
}

const statuses: AttendanceStatus[] = ['출석', '지각', '조퇴', '결석', '기타']

const modeInfo: { id: SessionMode; label: string; help: string }[] = [
  { id: 'normal', label: '정상 수업', help: '계획대로 다음 차시를 나갑니다.' },
  { id: 'extend', label: '앞 차시 이어서', help: '한 시간 더 씁니다. 이 반만 뒤 차시가 한 칸 밀립니다.' },
  { id: 'merge', label: '두 차시 한 번에', help: '진도를 두 개 나갑니다. 이 반만 뒤 차시가 한 칸 당겨집니다.' },
  { id: 'none', label: '수업 없음', help: '행사·자습 등. 진도를 쓰지 않아 뒤 차시가 한 칸 밀립니다.' },
]

export default function SessionModal({ data, session, update, onClose }: Props) {
  const classroom = data.classes.find(item => item.id === session.classId)
  if (!classroom) return null

  const override = data.overrides[session.id] || {}
  const lessons = effectiveLessonIds(session).map(id => data.lessons.find(item => item.id === id)).filter(Boolean)

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
