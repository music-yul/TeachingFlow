import { useState } from 'react'
import type { ImportedClass } from '../naesAttendanceParser'
import { formatSlots, parseSlotText } from '../naesAttendanceParser'

type Props = {
  initial: ImportedClass[]
  failed: string[]
  onCancel: () => void
  onConfirm: (classes: ImportedClass[]) => void
}

export default function ImportModal({ initial, failed, onCancel, onConfirm }: Props) {
  const [rows, setRows] = useState(initial.map(item => ({ ...item, slotText: formatSlots(item.slots) })))

  const edit = (index: number, change: Partial<(typeof rows)[number]>) => {
    setRows(rows.map((item, position) => (position === index ? { ...item, ...change } : item)))
  }

  const ready = rows.filter(row => row.subject.trim() && row.className.trim())

  const confirm = () => {
    onConfirm(ready.map(row => ({ ...row, slots: parseSlotText(row.slotText) })))
  }

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <section className="modal wide" onClick={event => event.stopPropagation()}>
        <header className="modal-head">
          <div>
            <h2>가져올 내용 확인</h2>
            <p className="hint">비어 있거나 잘못 읽힌 칸은 직접 고칠 수 있습니다.</p>
          </div>
          <button className="ghost-button" onClick={onCancel}>닫기</button>
        </header>

        <div className="modal-body">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>과목</th>
                  <th>학급</th>
                  <th>수업 시간</th>
                  <th>학생</th>
                  <th>파일</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={`${row.fileName}-${index}`}>
                    <td>
                      <input
                        className={row.subject.trim() ? '' : 'needs-input'}
                        value={row.subject}
                        placeholder="예: 음악"
                        onChange={event => edit(index, { subject: event.target.value })}
                      />
                    </td>
                    <td>
                      <input
                        className={row.className.trim() ? '' : 'needs-input'}
                        value={row.className}
                        placeholder="예: 2-3"
                        onChange={event => edit(index, { className: event.target.value })}
                      />
                    </td>
                    <td>
                      <input
                        className={row.slotText.trim() ? '' : 'needs-input'}
                        value={row.slotText}
                        placeholder="예: 월4, 화6"
                        onChange={event => edit(index, { slotText: event.target.value })}
                      />
                    </td>
                    <td>
                      {row.students.length ? `${row.students.length}명` : <span className="warn">읽지 못함</span>}
                    </td>
                    <td><small>{row.fileName}</small></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {failed.length > 0 && (
            <p className="warn">
              내용을 전혀 읽지 못한 파일: {failed.join(', ')}<br />
              이런 경우 학급 관리에서 <b>명단 붙여넣기</b>로 직접 넣으실 수 있습니다.
            </p>
          )}

          <p className="hint">
            수업 시간은 <b>월4, 화6</b> 처럼 요일과 교시를 이어 쓰면 됩니다. 나중에 학급 관리에서 표로도 고칠 수 있습니다.<br />
            같은 과목·학급이 이미 있으면 명단과 수업 시간만 갱신하고 진도·출석·메모는 그대로 둡니다.
          </p>
        </div>

        <footer className="modal-foot">
          <span className="hint">{ready.length}개 학급을 가져옵니다.</span>
          <button className="ghost-button" onClick={onCancel}>취소</button>
          <button className="primary-button" onClick={confirm} disabled={!ready.length}>가져오기</button>
        </footer>
      </section>
    </div>
  )
}
