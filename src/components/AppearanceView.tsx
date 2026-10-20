import { themedCalendarColors } from '../calendarAppearance'
import CalendarDesign from './CalendarDesign'
import type { AppData, Appearance } from '../types'
import { ensureFontLoaded, fonts, fontSizeOptions, normalizeFontSize, themes } from '../theme'

type Props = {
  data: AppData
  update: (change: Partial<AppData>) => void
}


export default function AppearanceView({ data, update }: Props) {
  const current = data.settings.appearance

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
      <div className="block">
        <h2>화면 테마</h2>
        <p className="hint">
          위젯·탭·표의 배경, 구분선과 강조색을 선택한 테마에 맞춥니다. 달력 기본색은 기존 팔레트의 순서를 테마별로 바꿉니다. 직접 지정한 달력색과 시간표 개별색은 유지합니다.
          바꾼 뒤 아래 <b>시간표 디자인</b>에서 하나씩 다시 고를 수 있습니다.
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
          <button className="ghost-button" onClick={() => pickTheme(current.themeId)}>기본값으로</button>
        </div>
      </div>

</div>
      </div>

      <div className="block">
        <h2>글꼴</h2>
        <p className="hint">
          고른 글꼴만 인터넷에서 내려받습니다. 처음 한 번은 잠깐 기본 글꼴로 보였다가 바뀝니다.
          인터넷이 없을 때는 기기 글꼴로 대체됩니다.
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

      <CalendarDesign data={data} update={update} />
      <div className="block">
        <h2>시간표 디자인</h2>
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
    </section>
  )
}
