import { useState } from 'react'
import type { AppData, Settings } from '../types'
import { APP_VERSION, exportData } from '../storage'
import ClassesView from './ClassesView'
import LessonsView from './LessonsView'
import EventsView from './EventsView'
import HelpView from './HelpView'
import AppearanceView from './AppearanceView'

const subTabs = ['학급·시간표', '수업 목록', '학사일정', '화면', '학기·백업', '도움말'] as const
type SubTab = (typeof subTabs)[number]

type Props = {
  data: AppData
  update: (change: Partial<AppData>) => void
  onFiles: (files: File[]) => void
  onImport: (file: File) => void
  onReset: () => void
}

export default function SettingsHub({ data, update, onFiles, onImport, onReset }: Props) {
  const [sub, setSub] = useState<SubTab>('학급·시간표')
  const edit = (change: Partial<Settings>) => update({ settings: { ...data.settings, ...change } })

  return (
    <div>
      <div className="subtabs">
        {subTabs.map(item => (
          <button className={sub === item ? 'subtab active' : 'subtab'} key={item} onClick={() => setSub(item)}>
            {item}
          </button>
        ))}
      </div>

      {sub === '학급·시간표' && <ClassesView data={data} update={update} onFiles={onFiles} />}
      {sub === '수업 목록' && <LessonsView data={data} update={update} />}
      {sub === '학사일정' && <EventsView data={data} update={update} />}
      {sub === '화면' && <AppearanceView data={data} update={update} />}
      {sub === '도움말' && <HelpView />}

      {sub === '학기·백업' && (
        <section className="panel">
          <div className="block">
            <h2>학기 설정</h2>
            <p className="hint">
              여기 입력한 기간 안에서만 수업이 배정됩니다. 학기가 바뀌면 날짜를 바꿔 주세요.<br />
              <b>학교 줄임말</b>은 주간 시간표 제목처럼 좁은 자리에 쓰입니다. 비워두면 학교명을 그대로 씁니다.
            </p>
            <div className="field-grid">
              <label>학교명<input value={data.settings.schoolName} onChange={event => edit({ schoolName: event.target.value })} /></label>
              <label>
                학교 줄임말
                <input
                  value={data.settings.schoolShort}
                  placeholder="예: 대연고"
                  onChange={event => edit({ schoolShort: event.target.value })}
                />
              </label>
              <label>교사명<input value={data.settings.teacherName} onChange={event => edit({ teacherName: event.target.value })} /></label>
              <label>학년도<input value={data.settings.year} onChange={event => edit({ year: event.target.value })} /></label>
              <label>학기 이름<input value={data.settings.termName} onChange={event => edit({ termName: event.target.value })} /></label>
              <label>학기 시작<input type="date" value={data.settings.termStart} onChange={event => edit({ termStart: event.target.value })} /></label>
              <label>학기 종료<input type="date" value={data.settings.termEnd} onChange={event => edit({ termEnd: event.target.value })} /></label>
            </div>
            <label className="switch-row">
              <input
                type="checkbox"
                checked={data.settings.useHolidays !== false}
                onChange={event => edit({ useHolidays: event.target.checked })}
              />
              대한민국 공휴일을 달력에 표시하고 그날 수업을 자동으로 뺍니다
            </label>
          </div>

          <div className="block">
            <h2>백업</h2>
            <p className="hint">
              모든 기록은 이 브라우저 안에만 저장됩니다. 브라우저 저장소를 지우거나 다른 기기에서 열면 내용이 보이지 않습니다.
              <b> 학기 중에는 주기적으로 내보내기를 해 두세요.</b> 내보낸 파일을 다른 선생님께 전달하면 같은 진도표를 여실 수 있습니다.
            </p>
            <div className="inline-form">
              <button className="primary-button" onClick={() => exportData(data)}>내보내기 (.json)</button>
              <label className="file-button">
                불러오기
                <input
                  type="file"
                  accept=".json"
                  onChange={event => {
                    const file = event.target.files?.[0]
                    if (file) onImport(file)
                    event.currentTarget.value = ''
                  }}
                />
              </label>
              <button className="danger-button" onClick={onReset}>전체 초기화</button>
            </div>
          </div>

          <div className="block">
            <h2>프로그램 정보</h2>
            <p className="hint">
              수업시수 플래너 {APP_VERSION}<br />
              © 2026 율쌤. 무단 배포 및 수정 금지<br />
              쓰는 방법은 위 <b>도움말</b> 탭에 정리돼 있습니다.
            </p>
          </div>
        </section>
      )}
    </div>
  )
}
