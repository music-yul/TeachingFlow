import { useState } from 'react'
import type { AppData, Session } from '../types'
import ProgressView from './ProgressView'
import LessonsView from './LessonsView'

const subTabs = ['진도 현황', '진도표 관리', '수업 변경 관리'] as const
type SubTab = (typeof subTabs)[number]

type Props = {
  data: AppData
  sessions: Session[]
  update: (change: Partial<AppData>) => void
  onSelect: (id: string) => void
  onOpenEvaluation: (evaluationId: string, classId: string) => void
}

/**
 * '진도 관리' 탭. 매 수업 체크하는 '진도 현황'과, 차시를 만들고 순서를 정하는 '진도표 관리'를
 * 같은 탭 안에 묶어서, 차시를 손보다가 바로 진도표로 넘어갈 수 있게 한다.
 */
export default function ProgressHub({ data, sessions, update, onSelect, onOpenEvaluation }: Props) {
  const [sub, setSub] = useState<SubTab>('진도 현황')

  return (
    <div className="progress-hub">
      <div className="subtabs">
        {subTabs.map(item => (
          <button className={sub === item ? 'subtab active' : 'subtab'} key={item} onClick={() => setSub(item)}>
            {item}
          </button>
        ))}
      </div>

      {sub === '진도 현황' && (
        <ProgressView data={data} sessions={sessions} update={update} onSelect={onSelect} onOpenEvaluation={onOpenEvaluation} />
      )}
      {sub === '진도표 관리' && <LessonsView data={data} update={update} />}
      {sub === '수업 변경 관리' && <SessionChangesView data={data} sessions={sessions} update={update} onSelect={onSelect} />}
    </div>
  )
}

function SessionChangesView({ data, sessions, update, onSelect }: Pick<Props, 'data' | 'sessions' | 'update' | 'onSelect'>) {
  const [subjectId, setSubjectId] = useState('')
  const [classId, setClassId] = useState('')
  const subjects = data.subjects.filter(item => item.usesProgress !== false)
  const classes = data.classes.filter(item => !item.archived
    && subjects.some(subject => subject.id === item.subjectId)
    && (!subjectId || item.subjectId === subjectId))
  const changed = sessions.filter(item => classes.some(classroom => classroom.id === item.classId)
    && (!classId || item.classId === classId)
    && !item.cancelled && !item.hidden && !item.extra
    && !data.overrides[item.id]?.groupId && item.mode !== 'normal')
    .sort((left, right) => left.date.localeCompare(right.date) || left.period - right.period
      || left.classId.localeCompare(right.classId))

  const restore = (session: Session) => {
    const overrides = { ...data.overrides }
    delete overrides[session.id]
    update({ overrides })
  }

  return (
    <section className="panel">
      <div className="toolbar">
        <label>과목{' '}<select value={subjectId} onChange={event => { setSubjectId(event.target.value); setClassId('') }}>
          <option value="">전체 과목</option>
          {subjects.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select></label>
        <label className="class-filter">학급{' '}<select value={classId} onChange={event => setClassId(event.target.value)}>
          <option value="">전체 학급</option>
          {classes.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select></label>
        <span className="hint">변경한 수업 {changed.length}개</span>
      </div>
      <p className="hint">원래대로 되돌리면 이후 진도 일정도 자동으로 다시 배정됩니다. 완료·채점·출결 기록은 유지됩니다.</p>
      {changed.length === 0 ? <p className="hint">선택한 과목·학급에 변경한 수업이 없습니다.</p> : (
        <div className="table-wrap">
          <table className="progress-table">
            <thead><tr><th>날짜 · 교시</th><th>과목</th><th>학급</th><th>변경 내용</th><th>사유</th><th>변경 취소</th></tr></thead>
            <tbody>{changed.map(session => (
              <tr key={session.id}>
                <td><button className="link-button" onClick={() => onSelect(session.id)}>{session.date} · {session.period}교시</button></td>
                <td>{subjects.find(item => item.id === session.subjectId)?.name}</td>
                <td>{classes.find(item => item.id === session.classId)?.name}</td>
                <td>{session.mode === 'none' ? '수업 없음 · 뒤 진도 미룸' : session.mode === 'extend' ? '앞 차시 이어서 · 뒤 진도 미룸' : '두 차시 한 번에 · 뒤 진도 당김'}</td>
                <td>{session.label || '—'}</td>
                <td><button className="ghost-button" onClick={() => restore(session)}>원래대로</button></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </section>
  )
}
