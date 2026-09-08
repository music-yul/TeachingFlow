import { useState } from 'react'
import type { AppData, Day, EventType, SchoolEvent } from '../types'
import { DAYS, PERIODS } from '../types'
import { makeId } from '../storage'

type Props = {
  data: AppData
  update: (change: Partial<AppData>) => void
}

const typeLabel: Record<EventType, string> = {
  closed: '휴업 (그날 전체 수업 없음)',
  blocked: '수업 불가 (특정 교시)',
  swap: '요일 변경 (다른 요일 시간표로 운영)',
  note: '표시만 (수업은 그대로)',
}

export default function EventsView({ data, update }: Props) {
  const [draft, setDraft] = useState<Omit<SchoolEvent, 'id'>>({
    date: '',
    title: '',
    type: 'closed',
    periods: [],
    classIds: [],
    sourceDay: '금',
  })

  const addEvent = () => {
    if (!draft.date || !draft.title.trim()) return
    update({ events: [...data.events, { ...draft, id: makeId('event'), title: draft.title.trim() }] })
    setDraft({ date: '', title: '', type: 'closed', periods: [], classIds: [], sourceDay: '금' })
  }

  const editEvent = (id: string, change: Partial<SchoolEvent>) => {
    update({ events: data.events.map(item => (item.id === id ? { ...item, ...change } : item)) })
  }

  const sorted = [...data.events].sort((left, right) => left.date.localeCompare(right.date))
  const active = data.classes.filter(item => !item.archived)

  return (
    <section className="panel">
      <h2>학사일정</h2>
      <p className="hint">
        휴업일과 행사를 등록하면 그 시간은 진도 배정에서 빠지고, 뒤 차시가 자동으로 밀립니다.<br />
        <b>요일 변경</b>은 학교 전체 일정용입니다. 예를 들어 화요일에 금요일 시간표로 운영하면 그날 금요일 수업이 대신 들어갑니다.
        특정 반만 조정할 때는 달력에서 그 시간을 눌러 처리하세요.
      </p>

      <div className="event-form">
        <input type="date" value={draft.date} onChange={event => setDraft({ ...draft, date: event.target.value })} />
        <input placeholder="일정 이름" value={draft.title} onChange={event => setDraft({ ...draft, title: event.target.value })} />
        <select value={draft.type} onChange={event => setDraft({ ...draft, type: event.target.value as EventType, periods: [] })}>
          {(Object.keys(typeLabel) as EventType[]).map(key => <option key={key} value={key}>{typeLabel[key]}</option>)}
        </select>
        {draft.type === 'swap' && (
          <label className="swap-pick">
            이 날은
            <select value={draft.sourceDay || '금'} onChange={event => setDraft({ ...draft, sourceDay: event.target.value as Day })}>
              {DAYS.map(day => <option key={day} value={day}>{day}</option>)}
            </select>
            요일 시간표로
          </label>
        )}
        <button className="primary-button" onClick={addEvent}>+ 등록</button>
      </div>

      {draft.type === 'blocked' && (
        <div className="period-picker">
          <span>교시 (선택 없으면 그날 전 교시)</span>
          {PERIODS.map(period => (
            <button
              className={draft.periods.includes(period) ? 'slot on' : 'slot'}
              key={period}
              onClick={() => setDraft({
                ...draft,
                periods: draft.periods.includes(period)
                  ? draft.periods.filter(item => item !== period)
                  : [...draft.periods, period],
              })}
            >
              {period}
            </button>
          ))}
        </div>
      )}

      {sorted.map(event => (
        <div className="event-row" key={event.id}>
          <input type="date" value={event.date} onChange={input => editEvent(event.id, { date: input.target.value })} />
          <input value={event.title} onChange={input => editEvent(event.id, { title: input.target.value })} />
          <select value={event.type} onChange={input => editEvent(event.id, { type: input.target.value as EventType })}>
            {(Object.keys(typeLabel) as EventType[]).map(key => <option key={key} value={key}>{typeLabel[key]}</option>)}
          </select>
          {event.type === 'swap' && (
            <label className="swap-pick">
              <select value={event.sourceDay || '금'} onChange={input => editEvent(event.id, { sourceDay: input.target.value as Day })}>
                {DAYS.map(day => <option key={day} value={day}>{day}</option>)}
              </select>
              요일 시간표
            </label>
          )}
          {event.type === 'blocked' && (
            <div className="period-picker compact">
              {PERIODS.map(period => (
                <button
                  className={event.periods.includes(period) ? 'slot on' : 'slot'}
                  key={period}
                  onClick={() => editEvent(event.id, {
                    periods: event.periods.includes(period)
                      ? event.periods.filter(item => item !== period)
                      : [...event.periods, period],
                  })}
                >
                  {period}
                </button>
              ))}
            </div>
          )}
          {event.type !== 'note' && (
            <select
              value={event.classIds[0] || ''}
              onChange={input => editEvent(event.id, { classIds: input.target.value ? [input.target.value] : [] })}
            >
              <option value="">전체 학급</option>
              {active.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          )}
          <button className="danger-button" onClick={() => update({ events: data.events.filter(item => item.id !== event.id) })}>삭제</button>
        </div>
      ))}
      {!sorted.length && <p className="hint">등록된 일정이 없습니다.</p>}
    </section>
  )
}
