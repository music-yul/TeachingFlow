import { useState } from 'react'
import type { AppData, Classroom, Day } from '../types'
import { DAYS, PERIODS } from '../types'
import { makeId, nextSubjectColor } from '../storage'
import { formatSlots, parsePastedRoster, parseSlotText } from '../naesAttendanceParser'

type Props = {
  data: AppData
  update: (change: Partial<AppData>) => void
  onFiles: (files: File[]) => void
}

export default function ClassesView({ data, update, onFiles }: Props) {
  const [subjectName, setSubjectName] = useState('')
  const [className, setClassName] = useState('')
  const [targetSubject, setTargetSubject] = useState('')

  const addSubject = () => {
    if (!subjectName.trim()) return
    update({
      subjects: [
        ...data.subjects,
        { id: makeId('subject'), name: subjectName.trim(), color: nextSubjectColor(data.subjects, data.settings.appearance.themeId), usesProgress: true },
      ],
    })
    setSubjectName('')
  }

  const removeSubject = (id: string) => {
    if (!window.confirm('과목과 함께 그 과목의 학급·수업 목록이 모두 삭제됩니다. 계속할까요?')) return
    update({
      subjects: data.subjects.filter(item => item.id !== id),
      classes: data.classes.filter(item => item.subjectId !== id),
      lessons: data.lessons.filter(item => item.subjectId !== id),
    })
  }

  const addClass = () => {
    const subjectId = targetSubject || data.subjects[0]?.id
    if (!className.trim() || !subjectId) return
    update({
      classes: [...data.classes, { id: makeId('class'), subjectId, name: className.trim(), slots: [], students: [] }],
    })
    setClassName('')
  }

  const editClass = (id: string, change: Partial<Classroom>) => {
    update({ classes: data.classes.map(item => (item.id === id ? { ...item, ...change } : item)) })
  }

  const removeClass = (id: string) => {
    if (!window.confirm('이 학급을 삭제합니다. 출석·메모 기록도 함께 지워집니다.')) return
    update({ classes: data.classes.filter(item => item.id !== id) })
  }

  return (
    <section className="panel">
      <div className="block">
        <h2>과목</h2>
        <div className="inline-form">
          <input value={subjectName} placeholder="예: 음악연주" onChange={event => setSubjectName(event.target.value)} />
          <button className="primary-button" onClick={addSubject}>+ 과목 추가</button>
        </div>
        <div className="subject-list">
          {data.subjects.map(subject => (
            <div className="subject-card" key={subject.id}>
              <input
                className="subject-color"
                type="color"
                title="과목 색"
                value={subject.color}
                onChange={event => update({ subjects: data.subjects.map(item => (item.id === subject.id ? { ...item, color: event.target.value } : item)) })}
              />
              <input
                className="subject-name"
                value={subject.name}
                placeholder="과목명"
                onChange={event => update({ subjects: data.subjects.map(item => (item.id === subject.id ? { ...item, name: event.target.value } : item)) })}
              />
              <label className={subject.usesProgress !== false ? 'subject-toggle on' : 'subject-toggle'}>
                <input
                  type="checkbox"
                  checked={subject.usesProgress !== false}
                  onChange={event => update({ subjects: data.subjects.map(item => (item.id === subject.id ? { ...item, usesProgress: event.target.checked } : item)) })}
                />
                <span>진도표 사용</span>
              </label>
              <button className="subject-remove" title="과목 삭제" onClick={() => removeSubject(subject.id)}>×</button>
            </div>
          ))}
          {!data.subjects.length && <p className="hint">출석부를 올리거나 위에서 직접 추가하면 됩니다.</p>}
        </div>
        <p className="hint">
          <b>진도표</b> 체크를 끄면 그 과목은 진도표와 수업 목록에서 빠집니다. CA·HR처럼 진도를 따로 관리하지 않는 시간에 쓰세요.
          달력과 반별 출석부에는 그대로 나옵니다.
        </p>
      </div>

      <div className="block">
        <h2>출석부 파일로 가져오기</h2>
        <p className="hint">
          나이스 <b>교과시간별출석부</b>가 가장 잘 읽힙니다. 다른 학교 양식이나 직접 만든 표도 시도해 보세요.
          자동으로 못 읽은 항목은 다음 화면에서 직접 채울 수 있습니다.
        </p>
        <label className="file-button">
          파일 선택 (여러 개 가능)
          <input
            type="file"
            multiple
            accept=".xlsx,.xls,.csv"
            onChange={event => {
              const files = Array.from(event.target.files || [])
              if (files.length) onFiles(files)
              event.currentTarget.value = ''
            }}
          />
        </label>
      </div>

      <div className="block">
        <h2>학급</h2>
        <p className="hint">파일 없이 직접 만들 수도 있습니다. 학급을 만든 뒤 시간표와 명단을 넣으면 됩니다.</p>
        <div className="inline-form">
          <select value={targetSubject || data.subjects[0]?.id || ''} onChange={event => setTargetSubject(event.target.value)}>
            {data.subjects.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
          <input value={className} placeholder="예: 1-3" onChange={event => setClassName(event.target.value)} />
          <button className="primary-button" onClick={addClass} disabled={!data.subjects.length}>+ 학급 추가</button>
        </div>

        <div className="class-grid">
          {data.classes.filter(item => !item.archived).map(classroom => (
            <ClassBlock key={classroom.id} data={data} classroom={classroom} editClass={editClass} removeClass={removeClass} />
          ))}
        </div>
        {!data.classes.length && <p className="hint">등록된 학급이 없습니다.</p>}
      </div>
    </section>
  )
}

type BlockProps = {
  data: AppData
  classroom: Classroom
  editClass: (id: string, change: Partial<Classroom>) => void
  removeClass: (id: string) => void
}

function ClassBlock({ data, classroom, editClass, removeClass }: BlockProps) {
  const [open, setOpen] = useState(false)
  const [number, setNumber] = useState('')
  const [name, setName] = useState('')
  const [paste, setPaste] = useState('')
  const [showPaste, setShowPaste] = useState(false)
  const [slotText, setSlotText] = useState(formatSlots(classroom.slots))

  const toggleSlot = (day: Day, period: number) => {
    const has = classroom.slots.some(slot => slot.day === day && slot.period === period)
    const slots = has
      ? classroom.slots.filter(slot => !(slot.day === day && slot.period === period))
      : [...classroom.slots, { day, period }]
    editClass(classroom.id, { slots })
    setSlotText(formatSlots(slots))
  }

  const applySlotText = () => {
    const slots = parseSlotText(slotText)
    editClass(classroom.id, { slots })
    setSlotText(formatSlots(slots))
  }

  const addStudent = () => {
    const value = Number(number)
    if (!value || !name.trim() || classroom.students.some(item => item.number === value)) return
    editClass(classroom.id, {
      students: [...classroom.students, { id: makeId('student'), number: value, name: name.trim() }]
        .sort((left, right) => left.number - right.number),
    })
    setNumber('')
    setName('')
  }

  const applyPaste = () => {
    const parsed = parsePastedRoster(paste)
    if (!parsed.length) {
      window.alert('명단을 읽지 못했습니다. 한 줄에 한 명씩, 번호와 이름 순으로 넣어 주세요.')
      return
    }
    if (!window.confirm(`${parsed.length}명을 읽었습니다. 기존 명단을 이 내용으로 바꿀까요?`)) return
    editClass(classroom.id, { students: parsed.map(item => ({ id: makeId('student'), ...item })) })
    setPaste('')
    setShowPaste(false)
  }

  return (
    <div className="class-block">
      <div className="class-head">
        <select value={classroom.subjectId} onChange={event => editClass(classroom.id, { subjectId: event.target.value })}>
          {data.subjects.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
        <input value={classroom.name} onChange={event => editClass(classroom.id, { name: event.target.value })} />
        <small>{classroom.slots.length}시간 · 학생 {classroom.students.length}명</small>
        <button className="ghost-button" onClick={() => setOpen(!open)}>{open ? '접기' : '명단 열기'}</button>
        <button className="danger-button" onClick={() => removeClass(classroom.id)}>삭제</button>
      </div>

      <div className="slot-row">
        <div className="slot-grid">
          {DAYS.map(day => (
            <div className="day-column" key={day}>
              <b>{day}</b>
              {PERIODS.map(period => (
                <button
                  className={classroom.slots.some(slot => slot.day === day && slot.period === period) ? 'slot on' : 'slot'}
                  key={period}
                  onClick={() => toggleSlot(day, period)}
                >
                  {period}
                </button>
              ))}
            </div>
          ))}
        </div>
        <div className="slot-text">
          <label>글자로 입력</label>
          <input
            value={slotText}
            placeholder="예: 월4, 화6"
            onChange={event => setSlotText(event.target.value)}
            onBlur={applySlotText}
          />
        </div>
      </div>

      {open && (
        <div className="students">
          <div className="inline-form">
            <input type="number" placeholder="번호" value={number} onChange={event => setNumber(event.target.value)} />
            <input placeholder="이름" value={name} onChange={event => setName(event.target.value)} />
            <button className="ghost-button" onClick={addStudent}>+ 학생 추가</button>
            <button className="ghost-button" onClick={() => setShowPaste(!showPaste)}>
              {showPaste ? '붙여넣기 닫기' : '명단 붙여넣기'}
            </button>
          </div>

          {showPaste && (
            <div className="paste-box">
              <p className="hint">
                엑셀에서 번호와 이름 두 열을 복사해 그대로 붙여넣으세요. 번호 없이 이름만 붙여넣어도 위에서부터 번호가 매겨집니다.
              </p>
              <textarea
                value={paste}
                placeholder={'1\t홍길동\n2\t김철수'}
                onChange={event => setPaste(event.target.value)}
              />
              <button className="primary-button" onClick={applyPaste}>명단으로 넣기</button>
            </div>
          )}

          {classroom.students.map(student => (
            <div className="student-row" key={student.id}>
              <input
                type="number"
                value={student.number}
                onChange={event => editClass(classroom.id, {
                  students: classroom.students
                    .map(item => (item.id === student.id ? { ...item, number: Number(event.target.value) } : item))
                    .sort((left, right) => left.number - right.number),
                })}
              />
              <input
                value={student.name}
                onChange={event => editClass(classroom.id, {
                  students: classroom.students.map(item => (item.id === student.id ? { ...item, name: event.target.value } : item)),
                })}
              />
              <button className="ghost-button" onClick={() => editClass(classroom.id, { students: classroom.students.filter(item => item.id !== student.id) })}>삭제</button>
            </div>
          ))}
          {!classroom.students.length && <p className="hint">학생 명단이 비어 있습니다.</p>}
        </div>
      )}
    </div>
  )
}
