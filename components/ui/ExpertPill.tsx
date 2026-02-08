'use client'

import { User } from 'lucide-react'
import { getExpertStyle } from '@/lib/experts-ui'

interface ExpertPillProps {
  /** Agent or expert id (full or short). */
  expertId: string
  displayName: string
  /** Card body (summary insight). When set, renders as card. */
  insight?: string
}

/** Renders a single expert as a pill (hero) or card (summary). */
export default function ExpertPill({ expertId, displayName, insight }: ExpertPillProps) {
  const style = getExpertStyle(expertId)
  const IconComponent = style.Icon

  if (insight) {
    return (
      <div
        className={`p-5 rounded-lg border border-slate-200 border-r-4 ${style.borderColor} ${style.bgColor}`}
      >
        <div className="flex items-center gap-3 mb-3">
          <div className={`p-2 rounded-full ${style.iconBg}`}>
            <IconComponent className={`w-5 h-5 ${style.iconColor}`} />
          </div>
          <h5 className="font-semibold text-slate-800">{displayName}</h5>
        </div>
        <div
          className="text-slate-600 leading-relaxed"
          dangerouslySetInnerHTML={{
            __html: insight
              .replace(/\*\*(.*?)\*\*/g, '<strong class="text-slate-800">$1</strong>')
              .replace(/\n/g, '<br/>'),
          }}
        />
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2.5 px-4 py-2.5 bg-white rounded-full border border-slate-200 shadow-sm">
      <div className={`w-8 h-8 rounded-full ${style.iconBg} flex items-center justify-center`}>
        <User className={`w-4.5 h-4.5 ${style.iconColor}`} />
      </div>
      <span className="text-sm font-medium text-slate-700">{displayName}</span>
    </div>
  )
}
