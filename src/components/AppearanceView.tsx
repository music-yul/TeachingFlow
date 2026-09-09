import type { AppData, Appearance } from '../types'
import { classroomPalettes, ensureFontLoaded, fonts, fontSizes, themes } from '../theme'

type Props = {
  data: AppData
  update: (change: Partial<AppData>) => void
}

const sizeNames: Record<string, string> = { small: '작게', normal: '기본', large: '크게', xlarge: '아주 크게' }

export default function AppearanceView({ data, update }: Props) {
  const current = data.settings.appearance

  const edit = (change: Partial<Appearance>) => {
    update({ settings: { ...data.settings, appearance: { ...current, ...change } } })
  }

  const pickTheme = (id: string) => {
    const theme = themes.find(item => item.id === id)
    if (!theme) return
    edit({ themeId: id, accent: theme.swatch })
  }

  const applyPalette = (id: string) => {
    const palette = classroomPalettes.find(item => item.id === id)
    if (!palette) return
    update({
      settings: { ...data.settings, appearance: { ...current, timetablePaletteId: id } },
      subjects: data.subjects.map((item, index) => ({ ...item, color: palette.colors[index % palette.colors.length] })),
    })
  }

  return (
    <section className="panel">
      <div className="block">
        <h2>화면 테마</h2>
        <p className="hint">화면 전체의 배경과 글자색이 바뀝니다. 시간표 색과는 별개입니다.</p>
        <div className="theme-row">
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
        </div>
      </div>

      <div className="block">
        <h2>강조색</h2>
        <p className="hint">선택된 메뉴, 버튼에 쓰입니다. 테마를 바꾸면 그 테마의 기본 강조색으로 돌아갑니다.</p>
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

      <div className="block">
        <h2>시간표 색</h2>
        <p className="hint">
          과목마다 어떤 색으로 표시할지 정하는 조합입니다. <b>화면 테마와는 무관하게</b> 고를 수 있습니다.
          누르면 현재 등록된 과목에 이 조합의 색이 순서대로 칠해집니다. 이후 아래에서 과목별로 다시 고를 수 있습니다.
        </p>
        <div className="theme-row">
          {classroomPalettes.map(palette => (
            <button
              className={current.timetablePaletteId === palette.id ? 'palette-card on' : 'palette-card'}
              key={palette.id}
              onClick={() => applyPalette(palette.id)}
              title={`${palette.name} 조합 적용`}
            >
              <span className="palette-swatches">
                {palette.colors.map(color => <i key={color} style={{ background: color }} />)}
              </span>
              {palette.name}
            </button>
          ))}
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
          {Object.keys(fontSizes).map(size => (
            <button
              className={current.fontSize === size ? 'subtab active' : 'subtab'}
              key={size}
              onClick={() => edit({ fontSize: size })}
            >
              {sizeNames[size]}
            </button>
          ))}
        </div>
      </div>

      <div className="block">
        <h2>과목별 색·글자색 미세 조정</h2>
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
