import { useState } from 'react'
import type { AppData } from '../types'
import { APP_NAME, APP_TAGLINE, APP_VERSION, exportData } from '../storage'
import ClassesView from './ClassesView'
import LessonsView from './LessonsView'
import EventsView from './EventsView'
import HelpView from './HelpView'
import AppearanceView from './AppearanceView'

const subTabs = ['학사일정', '학급·시간표', '진도표 관리', '화면', '데이터 관리', '도움말'] as const
type SubTab = (typeof subTabs)[number]

type Props = {
  data: AppData
  update: (change: Partial<AppData>) => void
  onFiles: (files: File[]) => void
  onImport: (file: File) => void
  onReset: () => void
}

const links = [
  { label: 'Blog', url: 'https://blog.naver.com/music_yul' },
  { label: 'Instagram', url: 'https://instagram.com/music_yul' },
  { label: 'Youtube', url: 'https://youtube.com/@music_yul' },
]

export default function SettingsHub({ data, update, onFiles, onImport, onReset }: Props) {
  const [sub, setSub] = useState<SubTab>('학사일정')

  return (
    <div>
      <div className="subtabs">
        {subTabs.map(item => (
          <button className={sub === item ? 'subtab active' : 'subtab'} key={item} onClick={() => setSub(item)}>
            {item}
          </button>
        ))}
      </div>

      {sub === '학사일정' && <EventsView data={data} update={update} />}
      {sub === '학급·시간표' && <ClassesView data={data} update={update} onFiles={onFiles} />}
      {sub === '진도표 관리' && <LessonsView data={data} update={update} />}
      {sub === '화면' && <AppearanceView data={data} update={update} />}
      {sub === '도움말' && <HelpView />}

      {sub === '데이터 관리' && (
        <section className="panel">
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
              {APP_NAME} {APP_VERSION}<br />
              {APP_TAGLINE}<br />
              © 2026 율쌤 ｜ 무단 배포 및 수정 금지<br />
              쓰는 방법은 <b>학사일정</b> 탭 옆 <b>도움말</b>에 정리돼 있습니다.
            </p>
            <div className="sns-links">
              {links.map(item => (
                <a className="sns-link" key={item.label} href={item.url} target="_blank" rel="noreferrer">
                  {item.label}
                </a>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
