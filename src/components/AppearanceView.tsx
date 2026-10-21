import { useState } from 'react'
import { themedCalendarColors } from '../calendarAppearance'
import CalendarDesign from './CalendarDesign'
import type { AppData, Appearance } from '../types'
import { ensureFontLoaded, fonts, fontSizeOptions, normalizeFontSize, themes, readableOn } from '../theme'

type Props = {
  data: AppData
  update: (change: Partial<AppData>) => void
}


export default function AppearanceView({ data, update }: Props) {
  const [section,setSection] = useState('calendar')
  const current = data.settings.appearance
  const theme = themes.find(item => item.id === current.themeId) || themes[0]

  const edit = (change: Partial<Appearance>) => {
    update({ settings: { ...data.settings, appearance: { ...current, ...change } } })
  }

  const pickTheme = (id: string) => {
    const theme = themes.find(item => item.id === id)
    if (!theme) return
    update({settings:{...data.settings,calendarColors:themedCalendarColors(data,id),appearance:{...current,themeId:id,accent:theme.swatch}}})
  }

  return (
    <section className="panel">
      <div className="subtabs appearance-sections" aria-label="디자인 설정 종류">{[{id:'screen',label:'화면 테마·배경'},{id:'calendar',label:'달력'},{id:'timetable',label:'시간표'},{id:'font',label:'글꼴·크기'}].map(item=><button type="button" key={item.id} aria-pressed={section===item.id} className={section===item.id?'subtab active':'subtab'} onClick={()=>setSection(item.id)}>{item.label}</button>)}</div>
      <div hidden={section!=='screen'}>
      <div className="block">
        <h2>화면 테마</h2>
        <p className="hint">
          테마를 고른 뒤 화면 배경·상자 배경·강조색을 각각 바꿀 수 있습니다. 직접 지정한 배경색과 달력색은 테마를 바꿔도 유지됩니다.
        </p>
        <div className="theme-with-accent"><div className="theme-row">
          {themes.map(theme => (
            <button
              className={current.themeId === theme.id ? 'theme-card on' : 'theme-card'}
              key={theme.id}
              onClick={() => pickTheme(theme.id)}
            >
              <span className="theme-preview" style={{ background: theme.vars['--bg'], borderColor: theme.vars['--line'] }}>
                <i style={{ background: theme.vars['--card'], borderColor: theme.vars['--line'] }} />
                <i className="dotmark" style={{ background: theme.swatch }} />
              </span>
              {theme.name}
            </button>
          ))}
        </div>      <div className="theme-accent">
        <div className="accent-caption"><h2>강조색</h2><span className="hint">메뉴·버튼 색 · 테마 변경 시 기본값 적용</span></div>
        <div className="inline-form">
          <input type="color" value={current.accent} onChange={event => edit({ accent: event.target.value })} />
          <input
            value={current.accent}
            onChange={event => edit({ accent: event.target.value })}
            style={{ width: '7rem', fontFamily: 'ui-monospace, monospace' }}
          />
          <button className="ghost-button" onClick={() => edit({accent:theme.swatch})}>테마색으로</button>
        </div>
      </div>

</div>
        <div className="appearance-backgrounds">
          {([{key:'background',label:'화면 배경',variable:'--bg'},{key:'cardBackground',label:'위젯·상자 배경',variable:'--card'}] as const).map(({key,label,variable})=><div className="appearance-color-control" key={key}><span>{label}</span><input type="color" aria-label={label} value={current[key]||theme.vars[variable]} onChange={e=>edit({[key]:e.target.value})}/><code>{current[key]||theme.vars[variable]}</code><button className="link-button" disabled={!current[key]} onClick={()=>edit({[key]:undefined})}>테마색으로</button></div>)}
        </div>
      </div>

      </div>
      <div hidden={section!=='font'}>
      <div className="block">
        <h2>글꼴</h2>
        <p className="hint">
          선택한 글꼴을 준비한 뒤 첫 화면을 표시합니다. 인터넷 연결이 안 되거나 글꼴을 불러오지 못하면 기기 글꼴로 표시합니다.
        </p>
        <div className="theme-row">
          {fonts.map(font => (
            <button
              className={current.fontId === font.id ? 'font-card on' : 'font-card'}
              key={font.id}
              style={{ fontFamily: font.stack }}
              onMouseEnter={() => ensureFontLoaded(font)}
              onFocus={() => ensureFontLoaded(font)}
              onClick={() => { ensureFontLoaded(font); edit({ fontId: font.id }) }}
            >
              <b>{font.name}</b>
              <span className="font-sample">티칭플로 수업 진도표</span>
              <small>{font.note}</small>
            </button>
          ))}
        </div>

      </div>

      <div className="block">
        <h2>폰트 크기</h2>
        <div className="inline-form">
          {fontSizeOptions.map(({ value: size, label }) => (
            <button
              className={(normalizeFontSize(current.fontSize)) === size ? 'subtab active' : 'subtab'}
              key={size}
              onClick={() => edit({ fontSize: size })}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      </div>
      <div hidden={section!=='calendar'}><CalendarDesign data={data} update={update} /></div>
      <div hidden={section!=='timetable'}>
      <div className="block">
        <h2>시간표 색상 · 과목별</h2>
        <p className="hint">
          시간표 칸의 글자색입니다. <b>자동</b>으로 두면 배경이 밝을 땐 검정, 어두울 땐 흰색이 됩니다.
          직접 정하고 싶을 때만 색을 고르세요.
        </p>
        {!data.subjects.length && <p className="hint">등록된 과목이 없습니다.</p>}
        <div className="subject-list">
          {data.subjects.map(subject => (
            <div className="subject-card" key={subject.id}>
              <input
                className="subject-color"
                type="color"
                title="배경색"
                value={subject.color}
                onChange={event => update({ subjects: data.subjects.map(item => (item.id === subject.id ? { ...item, color: event.target.value } : item)) })}
              />
              <span className="subject-name-static">{subject.name}</span>
              <div className="timetable-color-preview" aria-label={`${subject.name} 시간표 색상 미리보기`}>
                {(data.classes.filter(item=>item.subjectId===subject.id&&!item.archived).slice(0,2).map(item=>item.name).length?data.classes.filter(item=>item.subjectId===subject.id&&!item.archived).slice(0,2).map(item=>item.name):['1-1','1-2']).map((name,index)=><div key={`${name}-${index}`} style={{background:subject.color,color:subject.textColor||readableOn(subject.color)}}><span>{subject.name}</span><b>{name}</b></div>)}
              </div>
              <label className={subject.textColor ? 'subject-toggle on' : 'subject-toggle'}>
                <input
                  type="checkbox"
                  checked={Boolean(subject.textColor)}
                  onChange={event => update({
                    subjects: data.subjects.map(item => (
                      item.id === subject.id ? { ...item, textColor: event.target.checked ? '#ffffff' : undefined } : item
                    )),
                  })}
                />
                <span>글자색 직접</span>
              </label>
              {subject.textColor && (
                <input
                  className="subject-color"
                  type="color"
                  title="글자색"
                  value={subject.textColor}
                  onChange={event => update({ subjects: data.subjects.map(item => (item.id === subject.id ? { ...item, textColor: event.target.value } : item)) })}
                />
              )}
            </div>
          ))}
        </div>
      </div>
      </div>
    </section>
  )
}
