import { useState } from 'react'
import type { AppData } from '../types'
import { APP_NAME, APP_TAGLINE, APP_VERSION, exportData } from '../storage'
import EventsView from './EventsView'
import HelpView from './HelpView'
import AppearanceView from './AppearanceView'
import HomeLayoutSettings from './HomeLayoutSettings'
import FeatureSettings from './FeatureSettings'
import type { SetupTarget } from './StartGuide'

const subTabs = ['기능 설정', '학사일정', '메인화면', '디자인', '데이터 관리', '도움말'] as const
type SubTab = (typeof subTabs)[number]

type Props = {
  data: AppData
  update: (change: Partial<AppData>) => void
  initialSub?: SubTab
  onFiles: (files: File[]) => void
  onImport: (file: File) => void
  onReset: () => void
  onSetupNavigate?: (target: '학급 설정' | '동아리' | '업무') => void
}

const links = [
  { label: 'Blog', url: 'https://blog.naver.com/music_yul' },
  { label: 'Instagram', url: 'https://instagram.com/music_yul' },
  { label: 'Youtube', url: 'https://youtube.com/@music_yul' },
]

export default function SettingsHub({ data, update, onImport, onReset, onSetupNavigate, initialSub='기능 설정' }: Props) {
  const [sub, setSub] = useState<SubTab>(initialSub)

  const openSetup=(target:SetupTarget)=>{
    if(target==='학급 설정'||target==='동아리'||target==='업무'){onSetupNavigate?.(target);return}
    setSub(target)
  }

  return (
    <div>
      <div className="subtabs">
        {subTabs.map(item => (
          <button className={sub === item ? 'subtab active' : 'subtab'} key={item} onClick={() => setSub(item)}>
            {item}
          </button>
        ))}
      </div>

      {sub === '기능 설정' && <FeatureSettings data={data} update={update} onSetupNavigate={openSetup} />}
      {sub === '학사일정' && <EventsView data={data} update={update} />}

      {sub === '메인화면' && <HomeLayoutSettings data={data} update={update} />}
      {sub === '디자인' && <AppearanceView data={data} update={update} />}
      {sub === '도움말' && <HelpView />}

      {sub === '데이터 관리' && (
        <section className="panel">
          <div className="block">
            <h2>백업</h2>
            <p className="hint">
              모든 기록은 이 브라우저 안에만 저장됩니다. 브라우저 저장소를 지우거나 다른 기기에서 열면 내용이 보이지 않습니다.
              <b> 학기 중에는 주기적으로 내보내기를 해 두세요.</b> 내보낸 파일에는 담임·동아리 기록도 포함됩니다. 다른 기기에서 복원할 때 사용하세요.
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
              처음 설정은 <b>기능 설정</b>의 시작 안내에서, 자세한 사용법은 <b>도움말</b>에서 확인하세요.
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
