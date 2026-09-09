import { useState } from 'react'
import type { AppData, Lesson } from '../types'
import { makeId } from '../storage'

type Props = {
  data: AppData
  update: (change: Partial<AppData>) => void
}

export default function LessonsView({ data, update }: Props) {
  const usable = data.subjects.filter(item => item.usesProgress !== false)
  const [subjectId, setSubjectId] = useState(usable[0]?.id || '')
  const [title, setTitle] = useState('')
  const [typeId, setTypeId] = useState(data.types[0]?.id || '')
  const [typeName, setTypeName] = useState('')
  const [typeColor, setTypeColor] = useState('#4f7db8')

  const subject = usable.find(item => item.id === subjectId) || usable[0]
  if (!subject) {
    return <section className="panel empty-panel">진도표를 쓰는 과목이 없습니다. 과목의 <b>진도표</b> 체크를 켜 주세요.</section>
  }

  const lessons = data.lessons.filter(item => item.subjectId === subject.id)

  const setLessons = (next: Lesson[]) => {
    update({ lessons: [...data.lessons.filter(item => item.subjectId !== subject.id), ...next] })
  }

  const addLesson = () => {
    if (!title.trim()) return
    setLessons([...lessons, { id: makeId('lesson'), subjectId: subject.id, title: title.trim(), typeId, note: '' }])
    setTitle('')
  }

  const editLesson = (id: string, change: Partial<Lesson>) => {
    update({ lessons: data.lessons.map(item => (item.id === id ? { ...item, ...change } : item)) })
  }

  const move = (index: number, step: number) => {
    const next = [...lessons]
    const target = index + step
    if (target < 0 || target >= next.length) return
    const [item] = next.splice(index, 1)
    next.splice(target, 0, item)
    setLessons(next)
  }

  const removeLesson = (id: string) => {
    const progress = { ...data.progress }
    Object.keys(progress).filter(key => key.endsWith(`:${id}`)).forEach(key => delete progress[key])
    update({ lessons: data.lessons.filter(item => item.id !== id), progress })
  }

  const addType = () => {
    if (!typeName.trim()) return
    update({ types: [...data.types, { id: makeId('type'), name: typeName.trim(), color: typeColor }] })
    setTypeName('')
  }

  const removeType = (id: string) => {
    const fallback = data.types.find(item => item.id !== id)
    if (!fallback) return
    update({
      types: data.types.filter(item => item.id !== id),
      lessons: data.lessons.map(item => (item.typeId === id ? { ...item, typeId: fallback.id } : item)),
    })
  }

  return (
    <section className="panel">
      <div className="toolbar">
        <label>
          과목{' '}
          <select value={subject.id} onChange={event => setSubjectId(event.target.value)}>
            {usable.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </label>
        <span className="hint">위에서부터 차례대로 배정됩니다. 순서를 바꾸면 진도표에 바로 반영됩니다.</span>
      </div>

      <div className="block">
        <h2>수업 유형</h2>
        <p className="hint"><b>강조</b>를 켜면 그 유형의 수업이 달력과 진도표에서 굵게, 눈에 띄는 배경으로 표시됩니다. 수행평가에 쓰세요.</p>
        <div className="inline-form">
          <input value={typeName} placeholder="예: 음악사" onChange={event => setTypeName(event.target.value)} />
          <input type="color" value={typeColor} onChange={event => setTypeColor(event.target.value)} />
          <button className="ghost-button" onClick={addType}>+ 유형 추가</button>
        </div>
        <div className="type-editor-row">
          {data.types.map(type => (
            <div className="type-editor-chip" key={type.id}>
              <input
                className="type-chip-color"
                type="color"
                title="유형 색"
                value={type.color}
                onChange={event => update({ types: data.types.map(item => (item.id === type.id ? { ...item, color: event.target.value } : item)) })}
              />
              <input
                className="type-chip-name"
                value={type.name}
                placeholder="유형 이름"
                onChange={event => update({ types: data.types.map(item => (item.id === type.id ? { ...item, name: event.target.value } : item)) })}
              />
              <label className={type.emphasis ? 'subject-toggle on' : 'subject-toggle'} title="켜면 달력·진도표에서 굵게 강조됩니다">
                <input
                  type="checkbox"
                  checked={Boolean(type.emphasis)}
                  onChange={event => update({ types: data.types.map(item => (item.id === type.id ? { ...item, emphasis: event.target.checked } : item)) })}
                />
                <span>강조</span>
              </label>
              <button className="subject-remove" title="유형 삭제" onClick={() => removeType(type.id)}>×</button>
            </div>
          ))}
        </div>
      </div>

      <div className="inline-form">
        <input value={title} placeholder="새 수업 내용" onChange={event => setTitle(event.target.value)} />
        <select value={typeId} onChange={event => setTypeId(event.target.value)}>
          {data.types.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
        <button className="primary-button" onClick={addLesson}>+ 차시 추가</button>
      </div>

      {lessons.map((lesson, index) => {
        const type = data.types.find(item => item.id === lesson.typeId)
        const evaluations = data.evaluations.filter(item => item.subjectId === subject.id)
        return (
          <div className="lesson-row" key={lesson.id}>
            <span className="order">{index + 1}</span>
            <div className="lesson-fields">
              <div className="lesson-line">
                <input value={lesson.title} onChange={event => editLesson(lesson.id, { title: event.target.value })} />
                <select value={lesson.typeId} onChange={event => editLesson(lesson.id, { typeId: event.target.value })}>
                  {data.types.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
              </div>
              <input
                className="note-input"
                value={lesson.note}
                placeholder="이 차시 공통 메모 (모든 학급에 함께 표시)"
                onChange={event => editLesson(lesson.id, { note: event.target.value })}
              />
              {type?.emphasis && (
                <label className="lesson-eval-pick">
                  평가 선택
                  <select
                    value={lesson.evaluationId || ''}
                    onChange={event => editLesson(lesson.id, { evaluationId: event.target.value || undefined })}
                  >
                    <option value="">연결 안 함</option>
                    {evaluations.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
                  </select>
                  {!evaluations.length && <small className="hint">평가 관리에서 평가를 먼저 만들면 여기서 고를 수 있습니다.</small>}
                </label>
              )}
            </div>
            <div className="row-actions">
              <button className="ghost-button" onClick={() => move(index, -1)}>▲</button>
              <button className="ghost-button" onClick={() => move(index, 1)}>▼</button>
              <button className="danger-button" onClick={() => removeLesson(lesson.id)}>삭제</button>
            </div>
          </div>
        )
      })}
      {!lessons.length && <p className="hint">등록된 차시가 없습니다.</p>}
    </section>
  )
}
