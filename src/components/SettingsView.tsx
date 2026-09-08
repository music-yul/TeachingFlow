import type { AppData, Settings } from '../types'
import { APP_VERSION, exportData } from '../storage'

type Props = {
  data: AppData
  update: (change: Partial<AppData>) => void
  onImport: (file: File) => void
  onReset: () => void
}

export default function SettingsView({ data, update, onImport, onReset }: Props) {
  const edit = (change: Partial<Settings>) => update({ settings: { ...data.settings, ...change } })

  return (
    <section className="panel">
      <div className="block">
        <h2>학기 설정</h2>
        <p className="hint">여기 입력한 기간 안에서만 수업이 배정됩니다. 학기가 바뀌면 날짜를 바꿔 주세요.</p>
        <div className="field-grid">
          <label>학교명<input value={data.settings.schoolName} onChange={event => edit({ schoolName: event.target.value })} /></label>
          <label>교사명<input value={data.settings.teacherName} onChange={event => edit({ teacherName: event.target.value })} /></label>
          <label>학년도<input value={data.settings.year} onChange={event => edit({ year: event.target.value })} /></label>
          <label>학기 이름<input value={data.settings.termName} onChange={event => edit({ termName: event.target.value })} /></label>
          <label>학기 시작<input type="date" value={data.settings.termStart} onChange={event => edit({ termStart: event.target.value })} /></label>
          <label>학기 종료<input type="date" value={data.settings.termEnd} onChange={event => edit({ termEnd: event.target.value })} /></label>
        </div>
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
          수업시수 플래너 {APP_VERSION} · © {data.settings.year} {data.settings.teacherName || '제작자'}<br />
          이 페이지를 저장(Ctrl+S)하면 인터넷 없이도 같은 파일로 쓸 수 있습니다.
        </p>
      </div>
    </section>
  )
}
