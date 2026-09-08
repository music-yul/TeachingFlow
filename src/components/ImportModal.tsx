import type { ImportedClass } from '../naesAttendanceParser'

type Props = {
  classes: ImportedClass[]
  failed: string[]
  onCancel: () => void
  onConfirm: () => void
}

export default function ImportModal({ classes, failed, onCancel, onConfirm }: Props) {
  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <section className="modal" onClick={event => event.stopPropagation()}>
        <header className="modal-head">
          <h2>가져올 내용을 확인해 주세요</h2>
          <button className="ghost-button" onClick={onCancel}>닫기</button>
        </header>

        <div className="modal-body">
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>과목</th><th>학급</th><th>수업 시간</th><th>학생</th></tr>
              </thead>
              <tbody>
                {classes.map(item => (
                  <tr key={`${item.subject}-${item.className}`}>
                    <td>{item.subject}</td>
                    <td>{item.className}</td>
                    <td>{item.slots.map(slot => `${slot.day} ${slot.period}교시`).join(', ') || <span className="warn">읽지 못함</span>}</td>
                    <td>{item.students.length}명</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {failed.length > 0 && (
            <p className="warn">읽지 못한 파일: {failed.join(', ')}</p>
          )}

          <p className="hint">
            같은 과목·학급이 이미 있으면 학생 명단과 수업 시간만 갱신하고, 진도·출석·메모 기록은 그대로 둡니다.
          </p>
        </div>

        <footer className="modal-foot">
          <button className="ghost-button" onClick={onCancel}>취소</button>
          <button className="primary-button" onClick={onConfirm} disabled={!classes.length}>가져오기</button>
        </footer>
      </section>
    </div>
  )
}
