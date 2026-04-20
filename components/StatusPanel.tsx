'use client'

import { ProjectStatus } from '@/lib/types'

interface Props {
  status: ProjectStatus | null
  onTabChange: (tab: string) => void
}

function getStep(status: ProjectStatus | null): {
  step: number
  total: number
  label: string
  desc: string
  action: string
  tab: string
  done: boolean
} {
  if (!status) return { step: 0, total: 4, label: '로딩 중', desc: '', action: '', tab: 'brief', done: false }

  if (status.hasFinalPng) return {
    step: 4, total: 4,
    label: '생성 완료',
    desc: '상세페이지가 완성됐습니다. 다운로드하거나 이미지·텍스트를 수정하세요.',
    action: '결과 확인',
    tab: 'result',
    done: true,
  }

  if (status.hasPageDesign && status.imageTotal > 0) return {
    step: 3, total: 4,
    label: `이미지 생성 중 (${status.imageGenerated}/${status.imageTotal})`,
    desc: '파이프라인이 실행 중이거나 일부 이미지가 생성됐습니다. 제품 정보 탭에서 진행 상황을 확인하세요.',
    action: '진행 확인',
    tab: 'brief',
    done: false,
  }

  if (status.hasBrief) return {
    step: 2, total: 4,
    label: '파이프라인 실행 필요',
    desc: '제품 정보가 준비됐습니다. 파이프라인을 실행해 상세페이지를 생성하세요.',
    action: '▶ 파이프라인 실행',
    tab: 'brief',
    done: false,
  }

  return {
    step: 1, total: 4,
    label: '제품 정보 입력 필요',
    desc: '제품 설명을 입력하고 AI 자동채우기를 실행하세요. (크레딧 1개 차감)',
    action: '→ 정보 입력',
    tab: 'brief',
    done: false,
  }
}

const STEP_LABELS = ['제품 정보 입력', '파이프라인 실행', '이미지 생성', '완성']

export default function StatusPanel({ status, onTabChange }: Props) {
  const { step, total, label, desc, action, tab, done } = getStep(status)

  if (!status) return null

  return (
    <div className={`px-6 py-3 border-b shrink-0 flex items-center gap-4 ${done ? 'bg-green-50 border-green-200' : 'bg-blue-50 border-blue-200'}`}>
      {/* 스텝 인디케이터 */}
      <div className="flex items-center gap-1 shrink-0">
        {STEP_LABELS.map((_, i) => {
          const idx = i + 1
          const isActive = idx === step
          const isDone = idx < step || done
          return (
            <div key={i} className="flex items-center">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                isDone ? 'bg-green-500 text-white' :
                isActive ? (done ? 'bg-green-500 text-white' : 'bg-blue-600 text-white') :
                'bg-slate-200 text-slate-400'
              }`}>
                {isDone ? '✓' : idx}
              </div>
              {i < total - 1 && (
                <div className={`w-5 h-0.5 mx-0.5 ${isDone ? 'bg-green-400' : 'bg-slate-200'}`} />
              )}
            </div>
          )
        })}
      </div>

      {/* 설명 */}
      <div className="flex-1 min-w-0">
        <p className={`text-xs font-semibold ${done ? 'text-green-700' : 'text-blue-700'}`}>{label}</p>
        <p className="text-xs text-slate-500 truncate">{desc}</p>
      </div>

      {/* 액션 버튼 */}
      {action && (
        <button
          onClick={() => onTabChange(tab)}
          className={`shrink-0 text-xs font-semibold px-4 py-2 rounded-lg transition-colors ${
            done
              ? 'bg-green-600 text-white hover:bg-green-700'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {action}
        </button>
      )}
    </div>
  )
}
