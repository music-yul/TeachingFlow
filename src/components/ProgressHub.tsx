import { useState } from 'react'
import type { AppData, Session } from '../types'
import ProgressView from './ProgressView'
import LessonsView from './LessonsView'

const subTabs = ['진도 현황', '진도표 관리'] as const
type SubTab = (typeof subTabs)[number]

type Props = {
  data: AppData
  sessions: Session[]
  update: (change: Partial<AppData>) => void
  onSelect: (id: string) => void
  onOpenEvaluation: (evaluationId: string, classId: string) => void
}

/**
 * '진도 관리' 탭. 매 수업 체크하는 '진도 현황'과, 차시를 만들고 순서를 정하는 '진도표 관리'를
 * 같은 탭 안에 묶어서, 차시를 손보다가 바로 진도표로 넘어갈 수 있게 한다.
 */
export default function ProgressHub({ data, sessions, update, onSelect, onOpenEvaluation }: Props) {
  const [sub, setSub] = useState<SubTab>('진도 현황')

  return (
    <div className="progress-hub">
      <div className="subtabs">
        {subTabs.map(item => (
          <button className={sub === item ? 'subtab active' : 'subtab'} key={item} onClick={() => setSub(item)}>
            {item}
          </button>
        ))}
      </div>

      {sub === '진도 현황' && (
        <ProgressView data={data} sessions={sessions} update={update} onSelect={onSelect} onOpenEvaluation={onOpenEvaluation} />
      )}
      {sub === '진도표 관리' && <LessonsView data={data} update={update} />}
    </div>
  )
}
