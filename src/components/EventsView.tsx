import { useState } from 'react'
import type { AppData, Day, EventType, SchoolEvent } from '../types'
import { DAYS, PERIODS } from '../types'
import { makeId } from '../storage'
import { parseDate } from '../schedule'

type Props = {
  data: AppData
  update: (change: Partial<AppData>) => void
}

const typeLabel: Record<EventType, string> = {
  closed: '휴업 (수업 없음)',
  blocked: '수업 불가 (특정 교시)',
  swap: '요일 변경 (다른 요일 시간표로)',
  note: '표시만 (수업은 그대로)',
}

/** 기간이 며칠인지, 그중 평일이 며칠인지 센다. */
function spanInfo(from: string, to?: string) {
  if (!to || to === from) return null
  const start = parseDate(from <= to ? from : to)
  const end = parseDate(from <= to ? to : from)
  let days = 0
  let weekdays = 0
  const cursor = new Date(start)
  while (cursor <= end && days < 500) {
    days += 1
    const weekday = cursor.getDay()
    if (weekday >= 1 && weekday <= 5) weekdays += 1
    cursor.setDate(cursor.getDate() + 1)
  }
  return { days, weekdays }
}

type Draft = Omit<SchoolEvent, 'id'> & { ranged: boolean }

const emptyDraft: Draft = {
  date: '',
  endDate: '',
  title: '',
  type: 'closed',
  periods: [],
  classIds: [],
  sourceDay: '금',
  ranged: false,
}

export default function EventsView({ data, update }: Props) {
  const [draft, setDraft] = useState<Draft>(emptyDraft)

  const addEvent = () => {
    if (!draft.date || !draft.title.trim()) return
    const { ranged, ...rest } = draft
    update({
      events: [
        ...data.events,
        { ...rest, id: makeId('event'), title: draft.title.trim(), endDate: ranged ? draft.endDate || draft.date : undefined },
      ],
    })
    setDraft(emptyDraft)
  }

  const editEvent = (id: string, change: Partial<SchoolEvent>) => {
    update({ events: data.events.map(item => (item.id === id ? { ...item, ...change } : item)) })
  }

  const sorted = [...data.events].sort((left, right) => left.date.localeCompare(right.date))
  const active = data.classes.filter(item => !item.archived)
  const draftSpan = draft.ranged ? spanInfo(draft.date, draft.endDate) : null

  return (
    <section className="panel">
      <h2>학사일정</h2>
      <p className="hint">
        휴업일과 행사를 등록하면 그 시간은 진도 배정에서 빠지고, 뒤 차시가 자동으로 밀립니다.<br />
        방학·명절처럼 여러 날이 이어지면 <b>기간으로 등록</b>을 켜고 시작일과 종료일만 넣으면 됩니다.
      </p>

      <div className="event-form">
        <label className="range-toggle">
          <input
            type="checkbox"
            checked={draft.ranged}
            onChange={event => setDraft({ ...draft, ranged: event.target.checked, endDate: '' })}
          />
          기간으로 등록
        </label>
        <input type="date" value={draft.date} onChange={event => setDraft({ ...draft, date: event.target.value })} />
        {draft.ranged && (
          <>
            <span className="tilde">~</span>
            <input
              type="date"
              value={draft.endDate || ''}
              min={draft.date || undefined}
              onChange={event => setDraft({ ...draft, endDate: event.target.value })}
            />
          </>
        )}
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

      {draftSpan && (
        <p className="hint">총 {draftSpan.days}일 · 수업일 기준 평일 {draftSpan.weekdays}일이 빠집니다.</p>
      )}

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

      {sorted.map(event => {
        const span = spanInfo(event.date, event.endDate)
        return (
          <div className="event-row" key={event.id}>
            <input type="date" value={event.date} onChange={input => editEvent(event.id, { date: input.target.value })} />
            {event.endDate ? (
              <>
                <span className="tilde">~</span>
                <input type="date" value={event.endDate} min={event.date} onChange={input => editEvent(event.id, { endDate: input.target.value })} />
                <button className="ghost-button" title="하루짜리로 되돌리기" onClick={() => editEvent(event.id, { endDate: undefined })}>기간 해제</button>
              </>
            ) : (
              <button className="ghost-button" title="여러 날로 늘리기" onClick={() => editEvent(event.id, { endDate: event.date })}>+ 기간</button>
            )}
            <input value={event.title} onChange={input => editEvent(event.id, { title: input.target.value })} />
            {span && <span className="span-tag">{span.days}일 · 평일 {span.weekdays}일</span>}
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
        )
      })}
      {!sorted.length && <p className="hint">등록된 일정이 없습니다.</p>}
    </section>
  )
}
