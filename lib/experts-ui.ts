import type { LucideIcon } from 'lucide-react'
import {
  Brain,
  Columns,
  Lightbulb,
  Users,
  BarChart3,
  HeartHandshake,
  Briefcase,
  Heart,
  Wallet,
  Compass,
} from 'lucide-react'

/** Expert id as used in chair summary (selected_experts). */
export type ExpertStyleId =
  | 'psychodynamic'
  | 'stoic'
  | 'cbt'
  | 'sociological'
  | 'organizational'
  | 'dbt'

export interface ExpertStyle {
  borderColor: string
  bgColor: string
  iconBg: string
  iconColor: string
  Icon: LucideIcon
}

export const EXPERT_STYLES: Record<string, ExpertStyle> = {
  psychodynamic: {
    borderColor: 'border-r-purple-500',
    bgColor: 'bg-purple-50',
    iconBg: 'bg-purple-100',
    iconColor: 'text-purple-600',
    Icon: Brain,
  },
  stoic: {
    borderColor: 'border-r-amber-500',
    bgColor: 'bg-amber-50',
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
    Icon: Columns,
  },
  cbt: {
    borderColor: 'border-r-blue-500',
    bgColor: 'bg-blue-50',
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    Icon: Lightbulb,
  },
  sociological: {
    borderColor: 'border-r-teal-500',
    bgColor: 'bg-teal-50',
    iconBg: 'bg-teal-100',
    iconColor: 'text-teal-600',
    Icon: Users,
  },
  organizational: {
    borderColor: 'border-r-slate-500',
    bgColor: 'bg-slate-50',
    iconBg: 'bg-slate-100',
    iconColor: 'text-slate-600',
    Icon: BarChart3,
  },
  dbt: {
    borderColor: 'border-r-green-500',
    bgColor: 'bg-green-50',
    iconBg: 'bg-green-100',
    iconColor: 'text-green-600',
    Icon: HeartHandshake,
  },
}

/** Map full agent id (e.g. psychodynamic-freudian) to style key for consistent UI. */
const AGENT_ID_TO_STYLE_KEY: Record<string, string> = {
  'psychodynamic-freudian': 'psychodynamic',
  'modern-stoic': 'stoic',
  'managerial-organizational': 'organizational',
  'social-sociological': 'sociological',
  'cbt': 'cbt',
  'dbt': 'dbt',
}

export function getExpertStyle(agentId: string): ExpertStyle {
  const key = AGENT_ID_TO_STYLE_KEY[agentId] ?? agentId
  return (
    EXPERT_STYLES[key] ?? {
      borderColor: 'border-r-slate-400',
      bgColor: 'bg-slate-50',
      iconBg: 'bg-slate-100',
      iconColor: 'text-slate-600',
      Icon: Brain,
    }
  )
}

/** Category tiles for leading questions (hero). */
export const CATEGORY_TILES = [
  { id: 'career', name: 'קריירה', icon: Briefcase },
  { id: 'relationships', name: 'יחסים', icon: Heart },
  { id: 'health', name: 'בריאות', icon: Brain },
  { id: 'finance', name: 'כלכלה', icon: Wallet },
  { id: 'decisions', name: 'החלטות', icon: Compass },
] as const
